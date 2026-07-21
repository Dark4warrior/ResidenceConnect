import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  TICKET_CATEGORY_LABELS,
  type Ticket,
  type TicketPhoto,
} from '@residenceconnect/shared';
import { supabase } from '../../../lib/supabase';
import { getTicketPhotoSignedUrl } from '../../../lib/photos';
import {
  StatusBadge,
  UrgencyBadge,
} from '../../../components/tickets/TicketStatusBadge';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../../theme';

interface TicketDetail extends Ticket {
  apartment: {
    unit_number: string;
    floor: string | null;
    residence: { name: string; address: string; city: string } | null;
  } | null;
}

interface DisplayPhoto {
  id: string;
  uri: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Étapes du cycle de vie d'un signalement, dans l'ordre. */
const STEPS = [
  { key: 'pending', label: 'Reçu', icon: 'document-text-outline' },
  { key: 'in_progress', label: 'En cours', icon: 'construct-outline' },
  { key: 'resolved', label: 'Résolu', icon: 'checkmark-done-outline' },
] as const;

/** Icône associée à chaque catégorie d'incident. */
const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  plumbing: 'water-outline',
  electricity: 'flash-outline',
  elevator: 'swap-vertical-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

export default function TenantTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [photos, setPhotos] = useState<DisplayPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);

  const loadPhotos = useCallback(async (ticketId: string) => {
    const { data, error } = await supabase
      .from('ticket_photos')
      .select('id, ticket_id, storage_path, url, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      setPhotos([]);
      return;
    }

    const rows = data as TicketPhoto[];
    const resolved: DisplayPhoto[] = [];
    for (const row of rows) {
      try {
        const uri = await getTicketPhotoSignedUrl(row.storage_path);
        resolved.push({ id: row.id, uri });
      } catch {
        // Repli sur l'URL stockée (peut être expirée)
        resolved.push({ id: row.id, uri: row.url });
      }
    }
    setPhotos(resolved);
  }, []);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tickets')
        .select(
          'id, apartment_id, reported_by, assigned_to, title, description, category, urgency_level, status, created_at, updated_at, resolved_at, apartment:apartments(unit_number, floor, residence:residences(name, address, city))',
        )
        .eq('id', id)
        .single();

      setTicket((data as unknown as TicketDetail) ?? null);
      if (id) {
        await loadPhotos(id);
      }
      setLoading(false);
    }
    void load();
  }, [id, loadPhotos]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Signalement introuvable.</Text>
      </View>
    );
  }


  const currentStep = STEPS.findIndex((s) => s.key === ticket.status);

  return (
    <>
      <Stack.Screen options={{ title: 'Détail du signalement' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête : catégorie, titre, gravité */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.categoryIcon}>
              <Ionicons
                name={CATEGORY_ICON[ticket.category] ?? 'alert-circle-outline'}
                size={22}
                color={colors.primary}
              />
            </View>
            <Text style={styles.categoryLabel}>
              {TICKET_CATEGORY_LABELS[ticket.category]}
            </Text>
            <View style={styles.flex} />
            <UrgencyBadge level={ticket.urgency_level} />
          </View>
          <Text style={styles.title}>{ticket.title}</Text>
          <Text style={styles.reference}>
            Référence {ticket.id.slice(0, 8).toUpperCase()}
          </Text>
        </View>

        {/* Frise de progression : répond à « où en est ma demande ? » */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Avancement</Text>
          <View style={styles.timeline}>
            {STEPS.map((step, i) => {
              const done = i <= currentStep;
              const active = i === currentStep;
              return (
                <View key={step.key} style={styles.stepWrapper}>
                  <View style={styles.stepRow}>
                    <View
                      style={[
                        styles.stepDot,
                        done && styles.stepDotDone,
                        active && styles.stepDotActive,
                      ]}
                    >
                      <Ionicons
                        name={step.icon}
                        size={16}
                        color={done ? colors.textOnPrimary : colors.textLight}
                      />
                    </View>
                    {i < STEPS.length - 1 && (
                      <View
                        style={[styles.stepLine, i < currentStep && styles.stepLineDone]}
                      />
                    )}
                  </View>
                  <Text
                    style={[styles.stepLabel, done && styles.stepLabelDone]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.statusLine}>
            <StatusBadge status={ticket.status} />
            <Text style={styles.statusHint}>
              {ticket.status === 'pending'
                ? 'Votre signalement a bien été transmis au gestionnaire.'
                : ticket.status === 'in_progress'
                  ? 'Un technicien a été assigné et intervient.'
                  : 'L’incident a été résolu.'}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Description</Text>
          <Text style={styles.description}>{ticket.description}</Text>
        </View>

        {/* Photos */}
        {photos.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Photos ({photos.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photoRow}>
                {photos.map((p) => (
                  <Pressable key={p.id} onPress={() => setFullscreenUri(p.uri)}>
                    <Image source={{ uri: p.uri }} style={styles.photo} />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Informations */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations</Text>
          {ticket.apartment ? (
            <Row
              icon="business-outline"
              label="Résidence"
              value={ticket.apartment.residence?.name ?? '—'}
            />
          ) : null}
          {ticket.apartment ? (
            <Row
              icon="home-outline"
              label="Logement"
              value={`${ticket.apartment.unit_number}${
                ticket.apartment.floor ? ` · étage ${ticket.apartment.floor}` : ''
              }`}
            />
          ) : null}
          <Row
            icon="calendar-outline"
            label="Déclaré le"
            value={formatDateTime(ticket.created_at)}
          />
          {ticket.resolved_at ? (
            <Row
              icon="checkmark-circle-outline"
              label="Résolu le"
              value={formatDateTime(ticket.resolved_at)}
            />
          ) : null}
        </View>
      </ScrollView>

      {/* Photo en plein écran */}
      <Modal visible={!!fullscreenUri} transparent animationType="fade">
        <Pressable
          style={styles.fullscreen}
          onPress={() => setFullscreenUri(null)}
        >
          <Pressable
            style={styles.fullscreenClose}
            onPress={() => setFullscreenUri(null)}
            accessibilityRole="button"
            accessibilityLabel="Fermer la photo"
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {fullscreenUri && (
            <Image
              source={{ uri: fullscreenUri }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={17} color={colors.textLight} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  notFound: { fontSize: fontSize.base, color: colors.textMuted },
  flex: { flex: 1 },

  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 28,
  },
  reference: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  cardTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: spacing.md,
  },

  timeline: { flexDirection: 'row' },
  stepWrapper: { flex: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepDotActive: { ...shadow.brand },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: 4,
    borderRadius: 2,
  },
  stepLineDone: { backgroundColor: colors.primary },
  stepLabel: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.sm,
    fontWeight: fontWeight.medium,
  },
  stepLabelDone: { color: colors.text, fontWeight: fontWeight.semibold },

  statusLine: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  statusHint: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 20,
  },

  description: {
    fontSize: fontSize.base,
    color: colors.text,
    lineHeight: 23,
  },

  photoRow: { flexDirection: 'row', gap: spacing.sm },
  photo: {
    width: 108,
    height: 108,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowLabel: { fontSize: fontSize.md, color: colors.textMuted, flex: 1 },
  rowValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },

  fullscreen: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: { width: '100%', height: '80%' },
  fullscreenClose: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 2,
    padding: spacing.sm,
  },
});
