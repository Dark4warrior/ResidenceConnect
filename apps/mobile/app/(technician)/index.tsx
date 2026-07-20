import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { TicketStatus } from '@residenceconnect/shared';
import { useTickets } from '../../hooks/useTickets';
import { useRealtime } from '../../hooks/useRealtime';
import { TicketCard } from '../../components/tickets/TicketCard';
import {
  StatusFilterBar,
  type StatusFilter,
} from '../../components/tickets/StatusFilterBar';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';

const URGENCY_WEIGHT: Record<string, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0,
};

export default function TechnicianMissionsScreen() {
  const { tickets, loading, error, refetch } = useTickets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('all');

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  useRealtime({ table: 'tickets', onChange: refetch });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const counts = useMemo(
    () =>
      tickets.reduce(
        (acc, t) => {
          acc[t.status] += 1;
          return acc;
        },
        { pending: 0, in_progress: 0, resolved: 0 } as Record<TicketStatus, number>
      ),
    [tickets]
  );

  /**
   * Charge de travail réelle : une mission résolue ne pèse plus rien.
   * On ne compte donc que les missions non résolues.
   */
  const workload = counts.pending + counts.in_progress;

  const urgent = useMemo(
    () =>
      tickets.filter(
        (t) => t.status !== 'resolved' && t.urgency_level === 'critical'
      ).length,
    [tickets]
  );

  const visible = useMemo(() => {
    const base =
      filter === 'all' ? tickets : tickets.filter((t) => t.status === filter);
    return [...base].sort((a, b) => {
      // Les missions terminées descendent en bas de liste.
      const aDone = a.status === 'resolved' ? 1 : 0;
      const bDone = b.status === 'resolved' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;

      const byUrgency =
        (URGENCY_WEIGHT[b.urgency_level] ?? 0) -
        (URGENCY_WEIGHT[a.urgency_level] ?? 0);
      if (byUrgency !== 0) return byUrgency;
      // À gravité égale, le plus ancien d'abord : il attend depuis plus longtemps.
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [tickets, filter]);

  return (
    <View style={styles.container}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons
                  name={workload === 0 ? 'checkmark-done' : 'hammer-outline'}
                  size={24}
                  color={workload === 0 ? colors.success : colors.textOnPrimary}
                />
              </View>
              <View style={styles.flex}>
                <Text style={styles.heroValue}>
                  {workload === 0
                    ? 'Aucune mission en attente'
                    : `${workload} mission${workload > 1 ? 's' : ''} à traiter`}
                </Text>
                <Text style={styles.heroSub}>
                  {counts.resolved > 0
                    ? `${counts.resolved} déjà résolue${counts.resolved > 1 ? 's' : ''}`
                    : 'Bon courage sur le terrain'}
                </Text>
              </View>
            </View>

            {urgent > 0 && (
              <View style={styles.alert}>
                <Ionicons name="warning" size={18} color={colors.danger} />
                <Text style={styles.alertText}>
                  {urgent} intervention{urgent > 1 ? 's' : ''} critique
                  {urgent > 1 ? 's' : ''} en attente
                </Text>
              </View>
            )}

            <View style={styles.statsRow}>
              <Stat label="À faire" value={counts.pending} tone={colors.warning} />
              <View style={styles.statDivider} />
              <Stat label="En cours" value={counts.in_progress} tone={colors.accent} />
              <View style={styles.statDivider} />
              <Stat label="Résolues" value={counts.resolved} tone={colors.success} />
            </View>

            <StatusFilterBar
              value={filter}
              onChange={setFilter}
              counts={counts}
              total={tickets.length}
            />
          </View>
        }
        renderItem={({ item }) => (
          <TicketCard
            ticket={item}
            onPress={() => router.push(`/(technician)/ticket/${item.id}`)}
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
              <Text style={styles.emptyTitle}>Impossible de charger</Text>
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name={filter === 'all' ? 'clipboard-outline' : 'filter-outline'}
                  size={36}
                  color={colors.textLight}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'all'
                  ? 'Aucune mission assignée'
                  : 'Aucune mission dans ce filtre'}
              </Text>
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? 'Les signalements qui vous seront attribués apparaîtront ici.'
                  : 'Choisissez « Tous » pour revoir l’ensemble de vos missions.'}
              </Text>
              {filter !== 'all' && (
                <Pressable onPress={() => setFilter('all')} style={styles.emptyAction}>
                  <Text style={styles.emptyActionText}>Voir toutes</Text>
                </Pressable>
              )}
            </View>
          )
        }
      />
    </View>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, flexGrow: 1 },
  header: { marginBottom: spacing.lg, gap: spacing.md },
  flex: { flex: 1 },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.brand,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  heroSub: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  alertText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.danger,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    ...shadow.card,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 72,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  emptyActionText: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.md,
  },
});
