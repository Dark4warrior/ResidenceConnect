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
import { useTechnicians } from '../../../hooks/useTechnicians';
import { useTicketHistory } from '../../../hooks/useTicketHistory';
import { useTicketPhotos } from '../../../hooks/useTicketPhotos';
import { TicketPhotos } from '../../../components/tickets/TicketPhotos';
import {
  StatusBadge,
  UrgencyBadge,
} from '../../../components/tickets/TicketStatusBadge';
import { TicketHistoryList } from '../../../components/tickets/TicketHistoryList';
import { Button } from '../../../components/ui/Button';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../../theme';

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
              value={`${ticket.apartment.residence?.name ?? '—'} · ${ticket.apartment.unit_number}`}
            />
          ) : null}
          <Row
            icon="person-outline"
            label="Déclarant"
            value={ticket.reporter?.full_name ?? '—'}
          />
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

        <TicketPhotos photos={photos} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Changer le statut</Text>
          <View style={styles.statusRow}>
            {STATUS_ORDER.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusBtn,
                  s === ticket.status && styles.statusBtnActive,
                ]}
                disabled={statusSaving || s === ticket.status}
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
          {statusSaving ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Assignation</Text>
          <Text style={styles.assigned}>{assignedLabel}</Text>
          <Button
            title="Choisir un technicien"
            variant="secondary"
            loading={assignSaving || loadingTechs}
            onPress={() => setPickerOpen(true)}
          />
          {ticket.assigned_to ? (
            <TouchableOpacity
              onPress={() => void handleAssign(null)}
              disabled={assignSaving}
              style={styles.unassign}
            >
              <Text style={styles.unassignText}>Retirer l’assignation</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {actionError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}

        <TicketHistoryList
          history={history}
          loading={loadingHistory}
          error={historyError}
        />
      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" transparent>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Assigner un technicien</Text>
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
                  >
                    <Text style={styles.techName}>{item.full_name}</Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
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
  assigned: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  unassign: { alignSelf: 'flex-start', paddingVertical: spacing.sm },
  unassignText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    fontWeight: fontWeight.semibold,
  },
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
