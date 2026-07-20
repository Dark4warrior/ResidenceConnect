import { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  TICKET_STATUS_LABELS,
  URGENCY_LEVEL_LABELS,
  type UrgencyLevel,
} from '@residenceconnect/shared';
import { useAuth } from '../../hooks/useAuth';
import { useTickets } from '../../hooks/useTickets';
import { TicketCard } from '../../components/tickets/TicketCard';
import { Avatar } from '../../components/ui/Avatar';
import {
  filterTickets,
  sortTicketsByPriority,
  type StatusFilter,
  type UrgencyFilter,
} from '../../lib/ticketList';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'pending', label: TICKET_STATUS_LABELS.pending },
  { key: 'in_progress', label: TICKET_STATUS_LABELS.in_progress },
  { key: 'resolved', label: TICKET_STATUS_LABELS.resolved },
];

const URGENCY_FILTERS: { key: UrgencyFilter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  ...(Object.keys(URGENCY_LEVEL_LABELS) as UrgencyLevel[]).map((key) => ({
    key,
    label: URGENCY_LEVEL_LABELS[key],
  })),
];

export default function ManagerDashboardScreen() {
  const { profile } = useAuth();
  const { tickets, loading, error, refetch } = useTickets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const pendingCount = useMemo(
    () => tickets.filter((t) => t.status === 'pending').length,
    [tickets],
  );

  const visibleTickets = useMemo(
    () =>
      sortTicketsByPriority(filterTickets(tickets, statusFilter, urgencyFilter)),
    [tickets, statusFilter, urgencyFilter],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleTickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.headerRow}>
              <Avatar name={profile?.full_name ?? '?'} size={48} />
              <View style={styles.headerText}>
                <Text style={styles.hello}>Espace gestionnaire</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {profile?.full_name ?? '…'}
                </Text>
              </View>
            </View>

            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {tickets.length} signalement{tickets.length === 1 ? '' : 's'}
                {' · '}
                {pendingCount} en attente
              </Text>
            </View>

            <Text style={styles.filterLabel}>Statut</Text>
            <View style={styles.chipRow}>
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setStatusFilter(f.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.filterLabel}>Urgence</Text>
            <View style={styles.chipRow}>
              {URGENCY_FILTERS.map((f) => {
                const active = urgencyFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setUrgencyFilter(f.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Signalements</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TicketCard
            ticket={item}
            onPress={() => router.push(`/(manager)/ticket/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              color={colors.primary}
              size="large"
              style={{ marginTop: 80 }}
            />
          ) : error ? (
            <View style={styles.empty}>
              <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
              <Text style={styles.emptyTitle}>Impossible de charger</Text>
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="documents-outline" size={36} color={colors.textLight} />
              </View>
              <Text style={styles.emptyTitle}>Aucun signalement</Text>
              <Text style={styles.emptyText}>
                Aucun ticket ne correspond aux filtres sélectionnés.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  headerBlock: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  hello: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadow.card,
  },
  summaryText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.textOnPrimary,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
