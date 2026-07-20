import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  TICKET_CATEGORY_LABELS,
  TICKET_STATUS_LABELS,
  type Ticket,
  type TicketStatus,
} from '@residenceconnect/shared';
import { supabase } from '../../../lib/supabase';
import { useTickets } from '../../../hooks/useTickets';
import { useTicketHistory } from '../../../hooks/useTicketHistory';
import {
  StatusBadge,
  UrgencyBadge,
} from '../../../components/tickets/TicketStatusBadge';
import { TicketHistoryList } from '../../../components/tickets/TicketHistoryList';
import { Input } from '../../../components/ui/Input';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../../theme';

const STATUS_ORDER: TicketStatus[] = ['pending', 'in_progress', 'resolved'];

interface TicketDetail extends Ticket {
  apartment: {
    unit_number: string;
    floor: string | null;
    residence: { name: string; address: string } | null;
  } | null;
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

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function TechnicianTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { updateStatus, refetch } = useTickets();
  const {
    history,
    loading: loadingHistory,
    error: historyError,
    refetch: refetchHistory,
  } = useTicketHistory(id);

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadTicket = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select(
        'id, apartment_id, reported_by, assigned_to, title, description, category, urgency_level, status, created_at, updated_at, resolved_at, apartment:apartments(unit_number, floor, residence:residences(name, address))',
      )
      .eq('id', id)
      .single();

    if (error) {
      setTicket(null);
    } else {
      setTicket(data as unknown as TicketDetail);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStatus = async (status: TicketStatus) => {
    if (!ticket || status === ticket.status) return;
    setSaving(true);
    setActionError(null);
    const trimmed = comment.trim();
    const { error } = await updateStatus(
      ticket.id,
      status,
      trimmed.length > 0 ? trimmed : undefined,
    );
    setSaving(false);
    if (error) {
      setActionError(errorMessage(error, 'Échec de la mise à jour du statut.'));
      return;
    }
    setComment('');
    await Promise.all([loadTicket(), refetch(), refetchHistory()]);
  };

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
        <Text style={styles.notFound}>Mission introuvable.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Mission' }} />
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
              value={`${ticket.apartment.residence?.name ?? '—'} · ${ticket.apartment.unit_number}`}
            />
          ) : null}
          {ticket.apartment?.residence?.address ? (
            <Row
              icon="navigate-outline"
              label="Adresse"
              value={ticket.apartment.residence.address}
            />
          ) : null}
          <Row
            icon="calendar-outline"
            label="Créé le"
            value={formatDateTime(ticket.created_at)}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{ticket.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mettre à jour le statut</Text>
          <Input
            label="Commentaire (facultatif)"
            placeholder="Ex. : Intervention démarrée, pièce commandée…"
            value={comment}
            onChangeText={setComment}
            maxLength={500}
          />
          <View style={styles.statusRow}>
            {STATUS_ORDER.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusBtn,
                  s === ticket.status && styles.statusBtnActive,
                ]}
                disabled={saving || s === ticket.status}
                onPress={() => void handleStatus(s)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.statusBtnText,
                    s === ticket.status && styles.statusBtnTextActive,
                  ]}
                >
                  {TICKET_STATUS_LABELS[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {saving ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
          ) : null}
          {actionError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{actionError}</Text>
            </View>
          ) : null}
        </View>

        <TicketHistoryList
          history={history}
          loading={loadingHistory}
          error={historyError}
        />
      </ScrollView>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 },
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
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statusBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  statusBtnTextActive: { color: colors.textOnPrimary },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: fontSize.sm, flex: 1 },
});
