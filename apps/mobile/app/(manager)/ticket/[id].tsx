import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  FlatList,
  Pressable,
  AccessibilityInfo,
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
import { useTechnicians } from '../../../hooks/useTechnicians';
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
import { Button } from '../../../components/ui/Button';
import { colors, spacing, radius, fontSize, fontWeight } from '../../../theme';

const STATUS_ORDER: TicketStatus[] = ['pending', 'in_progress', 'resolved'];

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

interface TicketDetail extends Ticket {
  apartment: {
    unit_number: string;
    floor: string | null;
    residence: { name: string } | null;
  } | null;
  reporter: { id: string; full_name: string } | null;
  assignee: { id: string; full_name: string } | null;
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

export default function ManagerTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { updateStatus, assignTechnician, refetch } = useTickets();
  const { technicians, loading: loadingTechs } = useTechnicians();
  const {
    history,
    loading: loadingHistory,
    error: historyError,
    refetch: refetchHistory,
  } = useTicketHistory(id);
  const { photos } = useTicketPhotos(id);

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadTicket = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select(
        'id, apartment_id, reported_by, assigned_to, title, description, category, urgency_level, status, created_at, updated_at, resolved_at, apartment:apartments(unit_number, floor, residence:residences(name)), reporter:profiles!tickets_reported_by_fkey(id, full_name), assignee:profiles!tickets_assigned_to_fkey(id, full_name)',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recharge sur changement d'id
  }, [id]);

  const assignedLabel = useMemo(() => {
    if (!ticket?.assigned_to) return 'Non assigné';
    return ticket.assignee?.full_name ?? 'Technicien';
  }, [ticket]);

  const handleStatus = async (status: TicketStatus) => {
    if (!ticket || status === ticket.status) return;
    setStatusSaving(true);
    setActionError(null);
    const { error } = await updateStatus(ticket.id, status);
    setStatusSaving(false);
    if (error) {
      setActionError(errorMessage(error, 'Échec du changement de statut.'));
      return;
    }
    // Changement de statut sans transition visuelle explicite : on l'annonce
    // aux lecteurs d'écran (VoiceOver / TalkBack).
    AccessibilityInfo.announceForAccessibility(
      `Statut mis à jour : ${TICKET_STATUS_LABELS[status]}`,
    );
    await Promise.all([loadTicket(), refetch(), refetchHistory()]);
  };

  const handleAssign = async (technicianId: string | null) => {
    if (!ticket) return;
    setPickerOpen(false);
    setAssignSaving(true);
    setActionError(null);
    const { error } = await assignTechnician(ticket.id, technicianId);
    setAssignSaving(false);
    if (error) {
      setActionError(errorMessage(error, 'Échec de l’assignation du technicien.'));
      return;
    }
    await Promise.all([loadTicket(), refetch()]);
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
        <Text style={styles.notFound}>Signalement introuvable.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Détail du signalement' }} />
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

          <View style={styles.statusActions}>
            <Text style={styles.actionLabel}>Changer le statut</Text>
            <View style={styles.statusRow}>
              {STATUS_ORDER.map((s) => {
                const active = s === ticket.status;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusBtn, active && styles.statusBtnActive]}
                    disabled={statusSaving || active}
                    onPress={() => void handleStatus(s)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: statusSaving || active }}
                    accessibilityLabel={`Passer le statut à ${TICKET_STATUS_LABELS[s]}`}
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
            {statusSaving ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
            ) : null}
          </View>
        </DetailCard>

        <DetailCard title="Assignation">
          <View style={styles.assignRow}>
            <View style={styles.assignAvatar}>
              <Ionicons
                name={ticket.assigned_to ? 'person' : 'person-add-outline'}
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.assignName}>{assignedLabel}</Text>
              <Text style={styles.assignHint}>
                {ticket.assigned_to
                  ? 'Technicien responsable de l’intervention'
                  : 'Aucun technicien pour l’instant'}
              </Text>
            </View>
          </View>
          <Button
            title={ticket.assigned_to ? 'Changer de technicien' : 'Assigner un technicien'}
            variant="secondary"
            loading={assignSaving || loadingTechs}
            onPress={() => setPickerOpen(true)}
          />
          {ticket.assigned_to ? (
            <TouchableOpacity
              onPress={() => void handleAssign(null)}
              disabled={assignSaving}
              style={styles.unassign}
              accessibilityRole="button"
              accessibilityLabel="Retirer l’assignation du technicien"
              accessibilityState={{ disabled: assignSaving }}
            >
              <Text style={styles.unassignText}>Retirer l’assignation</Text>
            </TouchableOpacity>
          ) : null}
        </DetailCard>

        {actionError ? (
          <View style={styles.errorBox} accessibilityLiveRegion="assertive">
            <Ionicons
              name="alert-circle"
              size={18}
              color={colors.danger}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}

        <DetailCard title="Description">
          <Text style={styles.description}>{ticket.description}</Text>
        </DetailCard>

        <TicketPhotos photos={photos} />

        <DetailCard title="Informations">
          {ticket.apartment ? (
            <InfoRow
              icon="business-outline"
              label="Résidence"
              value={ticket.apartment.residence?.name ?? '—'}
            />
          ) : null}
          {ticket.apartment ? (
            <InfoRow
              icon="home-outline"
              label="Logement"
              value={`${ticket.apartment.unit_number}${
                ticket.apartment.floor ? ` · étage ${ticket.apartment.floor}` : ''
              }`}
            />
          ) : null}
          <InfoRow
            icon="person-outline"
            label="Déclarant"
            value={ticket.reporter?.full_name ?? '—'}
          />
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

      <Modal visible={pickerOpen} animationType="slide" transparent>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPickerOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Fermer la fenêtre"
        >
          <Pressable
            style={styles.modalSheet}
            onPress={(e) => e.stopPropagation()}
            accessibilityViewIsModal
          >
            <Text style={styles.modalTitle} accessibilityRole="header">
              Assigner un technicien
            </Text>
            <FlatList
              data={technicians}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={styles.emptyTechs}>Aucun technicien disponible.</Text>
              }
              renderItem={({ item }) => {
                const selected = ticket.assigned_to === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.techRow, selected && styles.techRowSelected]}
                    onPress={() => void handleAssign(item.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Assigner à ${item.full_name}`}
                  >
                    <Text style={styles.techName}>{item.full_name}</Text>
                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.primary}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
            <Button
              title="Fermer"
              variant="secondary"
              onPress={() => setPickerOpen(false)}
              style={{ marginTop: spacing.md }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notFound: { fontSize: fontSize.base, color: colors.textMuted },

  statusActions: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
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
  statusBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  statusBtnTextActive: { color: colors.textOnPrimary },

  assignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  assignAvatar: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  assignHint: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 1 },
  unassign: { alignSelf: 'flex-start', paddingVertical: spacing.sm },
  unassignText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    fontWeight: fontWeight.semibold,
  },

  description: { fontSize: fontSize.base, color: colors.text, lineHeight: 23 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: fontSize.sm, flex: 1 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyTechs: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  techRowSelected: { backgroundColor: colors.primarySoft },
  techName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
});
