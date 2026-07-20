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
  Dimensions,
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

  return (
    <>
      <Stack.Screen options={{ title: 'Détail du signalement' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{ticket.title}</Text>

        <View style={styles.badges}>
          <StatusBadge status={ticket.status} />
          <UrgencyBadge level={ticket.urgency_level} />
        </View>

        <View style={styles.card}>
          <Row
            icon="pricetag-outline"
            label="Catégorie"
            value={TICKET_CATEGORY_LABELS[ticket.category]}
          />
          {ticket.apartment ? (
            <Row
              icon="home-outline"
              label="Logement"
              value={`${ticket.apartment.residence?.name ?? ''} · ${ticket.apartment.unit_number}${
                ticket.apartment.floor ? ` (étage ${ticket.apartment.floor})` : ''
              }`}
            />
          ) : null}
          <Row
            icon="calendar-outline"
            label="Créé le"
            value={formatDateTime(ticket.created_at)}
          />
          {ticket.resolved_at ? (
            <Row
              icon="checkmark-done-outline"
              label="Résolu le"
              value={formatDateTime(ticket.resolved_at)}
            />
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{ticket.description}</Text>
        </View>

        {photos.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.photoGrid}>
              {photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  onPress={() => setFullscreenUri(photo.uri)}
                >
                  <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={fullscreenUri !== null} transparent animationType="fade">
        <Pressable
          style={styles.fullscreenBackdrop}
          onPress={() => setFullscreenUri(null)}
        >
          {fullscreenUri ? (
            <Image
              source={{ uri: fullscreenUri }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          ) : null}
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
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  notFound: { fontSize: fontSize.base, color: colors.textMuted },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  badges: { flexDirection: 'row', gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowLabel: { fontSize: fontSize.md, color: colors.textMuted, width: 90 },
  rowValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: 22,
  },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
});
