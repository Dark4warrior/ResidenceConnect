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
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
import { uploadTicketPhoto } from '../../lib/photos';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme';

const MAX_PHOTOS = 3;

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
  const [photoUris, setPhotoUris] = useState<string[]>([]);

  const selectedApartment =
    apartmentId ?? (apartments.length === 1 ? apartments[0].id : null);

  const addPhotoUri = (uri: string) => {
    setPhotoUris((prev) => {
      if (prev.length >= MAX_PHOTOS) return prev;
      if (prev.includes(uri)) return prev;
      return [...prev, uri];
    });
  };

  const removePhoto = (uri: string) => {
    setPhotoUris((prev) => prev.filter((u) => u !== uri));
  };

  const pickFromCamera = async () => {
    if (photoUris.length >= MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos par signalement.`);
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission refusée',
        'L’accès à la caméra est nécessaire pour prendre une photo. Vous pouvez l’activer dans les réglages de l’appareil.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      addPhotoUri(result.assets[0].uri);
      setError(null);
    }
  };

  const pickFromGallery = async () => {
    if (photoUris.length >= MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos par signalement.`);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission refusée',
        'L’accès à la galerie est nécessaire pour choisir une photo. Vous pouvez l’activer dans les réglages de l’appareil.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      addPhotoUri(result.assets[0].uri);
      setError(null);
    }
  };

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

    const { id: ticketId, error: createError } = await createTicket({
      apartment_id: selectedApartment,
      reported_by: profile.id,
      title: title.trim(),
      description: description.trim(),
      category,
      urgency_level: urgency,
    });

    if (createError) {
      setSubmitting(false);
      setError(createError.message);
      return;
    }

    if (ticketId && photoUris.length > 0) {
      try {
        for (const uri of photoUris) {
          await uploadTicketPhoto(ticketId, uri);
        }
      } catch (uploadErr) {
        setSubmitting(false);
        const detail =
          uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
        setError(
          `Signalement créé, mais l’envoi des photos a échoué : ${detail}`,
        );
        return;
      }
    }

    setSubmitting(false);
    setTitle('');
    setDescription('');
    setCategory('plumbing');
    setUrgency('medium');
    setPhotoUris([]);
    router.replace('/(tenant)');
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
          <View style={styles.errorBox} accessibilityLiveRegion="assertive">
            <Ionicons
              name="alert-circle"
              size={18}
              color="#ef4444"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
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
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${apt.residence?.name} · Logement ${apt.unit_number}`}
                >
                  <Text style={styles.aptText}>
                    {apt.residence?.name} · Logement {apt.unit_number}
                  </Text>
                  {active && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#1e3a5f"
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
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
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Catégorie ${TICKET_CATEGORY_LABELS[cat]}`}
                >
                  <Ionicons
                    name={CATEGORY_ICONS[cat]}
                    size={22}
                    color={active ? '#fff' : '#64748b'}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
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
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Urgence ${URGENCY_LEVEL_LABELS[u]}`}
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
            placeholderTextColor={colors.textLight}
            value={description}
            onChangeText={setDescription}
            accessibilityLabel="Description du problème"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={1000}
          />
        </View>

        {/* Photos (facultatif, max 3) */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Photos ({photoUris.length}/{MAX_PHOTOS})
          </Text>
          <View style={styles.photoActions}>
            <TouchableOpacity
              style={styles.photoBtn}
              onPress={() => void pickFromCamera()}
              disabled={photoUris.length >= MAX_PHOTOS || submitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Prendre une photo"
              accessibilityState={{ disabled: photoUris.length >= MAX_PHOTOS || submitting }}
            >
              <Ionicons
                name="camera-outline"
                size={20}
                color="#1e3a5f"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.photoBtnText}>Prendre une photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoBtn}
              onPress={() => void pickFromGallery()}
              disabled={photoUris.length >= MAX_PHOTOS || submitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Choisir une photo dans la galerie"
              accessibilityState={{ disabled: photoUris.length >= MAX_PHOTOS || submitting }}
            >
              <Ionicons
                name="images-outline"
                size={20}
                color="#1e3a5f"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.photoBtnText}>Choisir dans la galerie</Text>
            </TouchableOpacity>
          </View>
          {photoUris.length > 0 ? (
            <View style={styles.thumbRow}>
              {photoUris.map((uri, index) => (
                <View key={uri} style={styles.thumbWrap}>
                  <Image
                    source={{ uri }}
                    style={styles.thumb}
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel={`Photo ${index + 1} jointe au signalement`}
                  />
                  <TouchableOpacity
                    style={styles.thumbRemove}
                    onPress={() => removePhoto(uri)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Supprimer la photo ${index + 1}`}
                  >
                    <Ionicons name="close-circle" size={22} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
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
  photoActions: { gap: 10 },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  photoBtnText: { fontSize: 14, fontWeight: '600', color: '#1e3a5f' },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  submit: { marginTop: 8 },
});
