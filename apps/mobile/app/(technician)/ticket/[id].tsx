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
  TICKET_STATUS_LABELS,
  type Ticket,
  type TicketStatus,
} from '@residenceconnect/shared';
import { supabase } from '../../../lib/supabase';
import { useTickets } from '../../../hooks/useTickets';
import { useTicketHistory } from '../../../hooks/useTicketHistory';
import { useTicketPhotos } from '../../../hooks/useTicketPhotos';
import { TicketPhotos } from '../../../components/tickets/TicketPhotos';
import {
  TicketHero,
  StatusTimeline,
  DetailCard,
  InfoRow,
  detailStyles,
} from '../../../components/tickets/TicketDetailParts';
import { TicketHistoryList } from '../../../components/tickets/TicketHistoryList';
import { Input } from '../../../components/ui/Input';
import { colors, spacing, radius, fontSize, fontWeight } from '../../../theme';

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
  const { photos } = useTicketPhotos(id);

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
      <View style={detailStyles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={detailStyles.center}>
        <Text style={styles.notFound}>Mission introuvable.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Mission' }} />
      <ScrollView
        style={detailStyles.container}
        contentContainerStyle={detailStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <TicketHero
          id={ticket.id}
          title={ticket.title}
          category={ticket.category}
          urgency={ticket.urgency_level}
        />

        <DetailCard title="Avancement">
          <StatusTimeline status={ticket.status} />
        </DetailCard>

        <DetailCard title="Mettre à jour le statut">
          <Input
            label="Commentaire (facultatif)"
            placeholder="Ex. : Intervention démarrée, pièce commandée…"
            value={comment}
            onChangeText={setComment}
            maxLength={500}
          />
          <View style={styles.statusRow}>
            {STATUS_ORDER.map((s) => {
              const active = s === ticket.status;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusBtn, active && styles.statusBtnActive]}
                  disabled={saving || active}
                  onPress={() => void handleStatus(s)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.statusBtnText, active && styles.statusBtnTextActive]}
                  >
                    {TICKET_STATUS_LABELS[s]}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
        </DetailCard>

        <DetailCard title="Description">
          <Text style={styles.description}>{ticket.description}</Text>
        </DetailCard>

        <TicketPhotos photos={photos} />

        <DetailCard title="Intervention">
          {ticket.apartment ? (
            <InfoRow
              icon="home-outline"
              label="Logement"
              value={`${ticket.apartment.residence?.name ?? '—'} · ${ticket.apartment.unit_number}`}
            />
          ) : null}
          {ticket.apartment?.residence?.address ? (
            <InfoRow
              icon="navigate-outline"
              label="Adresse"
              value={ticket.apartment.residence.address}
            />
          ) : null}
          <InfoRow
            icon="calendar-outline"
            label="Créé le"
            value={formatDateTime(ticket.created_at)}
          />
          {ticket.resolved_at ? (
            <InfoRow
              icon="checkmark-circle-outline"
              label="Résolu le"
              value={formatDateTime(ticket.resolved_at)}
            />
          ) : null}
        </DetailCard>

        <TicketHistoryList history={history} loading={loadingHistory} error={historyError} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  notFound: { fontSize: fontSize.base, color: colors.textMuted },
  description: { fontSize: fontSize.base, color: colors.text, lineHeight: 23 },

  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statusBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
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
    marginTop: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: fontSize.sm, flex: 1 },
});
