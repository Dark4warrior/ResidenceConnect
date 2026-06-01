import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  TICKET_CATEGORY_LABELS,
  URGENCY_LEVEL_LABELS,
  URGENCY_COLORS,
  type TicketCategory,
  type UrgencyLevel,
} from '@residenceconnect/shared';
import { useAuth } from '../../hooks/useAuth';
import { useApartments } from '../../hooks/useApartments';
import { useTickets } from '../../hooks/useTickets';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const CATEGORIES = Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[];
const URGENCIES = Object.keys(URGENCY_LEVEL_LABELS) as UrgencyLevel[];

const CATEGORY_ICONS: Record<TicketCategory, keyof typeof Ionicons.glyphMap> = {
  plumbing: 'water-outline',
  electricity: 'flash-outline',
  elevator: 'swap-vertical-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

// Exemple de titre proposé selon la catégorie sélectionnée
const TITLE_EXAMPLES: Record<TicketCategory, string> = {
  plumbing: "Ex : Fuite d'eau sous l'évier",
  electricity: 'Ex : Panne de courant dans le salon',
  elevator: 'Ex : Ascenseur bloqué au 3e étage',
  other: 'Ex : Serrure de la porte d’entrée cassée',
};

export default function NewTicketScreen() {
  const { profile } = useAuth();
  const { apartments, loading: loadingApts } = useApartments();
  const { createTicket } = useTickets();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('plumbing');
  const [urgency, setUrgency] = useState<UrgencyLevel>('medium');
  const [apartmentId, setApartmentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedApartment =
    apartmentId ?? (apartments.length === 1 ? apartments[0].id : null);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Le titre et la description sont obligatoires.');
      return;
    }
    if (!selectedApartment) {
      setError('Veuillez sélectionner un logement.');
      return;
    }
    if (!profile) return;

    setSubmitting(true);
    setError(null);

    const { error: createError } = await createTicket({
      apartment_id: selectedApartment,
      reported_by: profile.id,
      title: title.trim(),
      description: description.trim(),
      category,
      urgency_level: urgency,
    });

    setSubmitting(false);

    if (createError) {
      setError(createError.message);
    } else {
      setTitle('');
      setDescription('');
      setCategory('plumbing');
      setUrgency('medium');
      router.replace('/(tenant)');
    }
  };

  if (loadingApts) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1e3a5f" size="large" />
      </View>
    );
  }

  if (apartments.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="home-outline" size={48} color="#94a3b8" />
        <Text style={styles.noAptTitle}>Aucun logement rattaché</Text>
        <Text style={styles.noAptText}>
          Vous n&apos;êtes rattaché à aucun logement. Contactez votre
          gestionnaire pour pouvoir signaler un incident.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Logement (si plusieurs) */}
        {apartments.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.label}>Logement concerné</Text>
            {apartments.map((apt) => {
              const active = selectedApartment === apt.id;
              return (
                <TouchableOpacity
                  key={apt.id}
                  style={[styles.aptRow, active && styles.aptRowActive]}
                  onPress={() => setApartmentId(apt.id)}
                >
                  <Text style={styles.aptText}>
                    {apt.residence?.name} · Logement {apt.unit_number}
                  </Text>
                  {active && (
                    <Ionicons name="checkmark-circle" size={20} color="#1e3a5f" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Catégorie */}
        <View style={styles.section}>
          <Text style={styles.label}>Catégorie</Text>
          <View style={styles.grid}>
            {CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catCard, active && styles.catCardActive]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={CATEGORY_ICONS[cat]}
                    size={22}
                    color={active ? '#fff' : '#64748b'}
                  />
                  <Text style={[styles.catText, active && styles.catTextActive]}>
                    {TICKET_CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Urgence */}
        <View style={styles.section}>
          <Text style={styles.label}>Niveau d&apos;urgence</Text>
          <View style={styles.urgencyRow}>
            {URGENCIES.map((u) => {
              const active = urgency === u;
              const color = URGENCY_COLORS[u];
              return (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.urgencyChip,
                    active && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => setUrgency(u)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.urgencyText,
                      active ? { color: '#fff' } : { color },
                    ]}
                  >
                    {URGENCY_LEVEL_LABELS[u]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Titre */}
        <View style={styles.section}>
          <Input
            label="Titre"
            placeholder={TITLE_EXAMPLES[category]}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.textarea}
            placeholder="Décrivez le problème en détail…"
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={1000}
          />
        </View>

        <Button
          title="Envoyer le signalement"
          onPress={handleSubmit}
          loading={submitting}
          style={styles.submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scroll: { padding: 16, gap: 8, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    padding: 32,
    gap: 10,
  },
  noAptTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginTop: 8 },
  noAptText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: { gap: 8, marginBottom: 8 },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginLeft: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  errorText: { color: '#ef4444', fontSize: 13, flex: 1 },
  aptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
  },
  aptRowActive: { borderColor: '#1e3a5f' },
  aptText: { fontSize: 14, color: '#0f172a', fontWeight: '500' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catCard: {
    width: '47%',
    flexGrow: 1,
    height: 70,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  catCardActive: { borderColor: '#1e3a5f', backgroundColor: '#1e3a5f' },
  catText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  catTextActive: { color: '#fff' },
  urgencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  urgencyChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  urgencyText: { fontSize: 13, fontWeight: '700' },
  textarea: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: '#0f172a',
    minHeight: 120,
  },
  submit: { marginTop: 8 },
});
