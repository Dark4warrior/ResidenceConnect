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

/** Ordre de gravité, pour remonter les incidents les plus urgents. */
const URGENCY_WEIGHT: Record<string, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0,
};

export default function TenantHomeScreen() {
  const { tickets, loading, refetch } = useTickets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('all');

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Temps réel : l'avancement des signalements arrive sans rafraîchir.
  // Le RLS garantit que seuls les événements du locataire lui parviennent.
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

  // Les plus urgents d'abord, puis les plus récents.
  const visible = useMemo(() => {
    const base =
      filter === 'all' ? tickets : tickets.filter((t) => t.status === filter);
    return [...base].sort((a, b) => {
      const byUrgency =
        (URGENCY_WEIGHT[b.urgency_level] ?? 0) -
        (URGENCY_WEIGHT[a.urgency_level] ?? 0);
      if (byUrgency !== 0) return byUrgency;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [tickets, filter]);

  const ongoing = counts.pending + counts.in_progress;

  return (
    <View style={styles.container}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {/* Bandeau d'état : information utile plutôt que salutation. */}
            <View style={styles.hero}>
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroLabel}>
                  {ongoing === 0 ? 'Tout est réglé' : 'Suivi en cours'}
                </Text>
                <Text style={styles.heroValue}>
                  {ongoing === 0
                    ? 'Aucun incident en attente'
                    : `${ongoing} signalement${ongoing > 1 ? 's' : ''} en cours`}
                </Text>
              </View>
              <View
                style={[
                  styles.heroBadge,
                  ongoing === 0 && { backgroundColor: colors.successSoft },
                ]}
              >
                <Ionicons
                  name={ongoing === 0 ? 'checkmark-circle' : 'time-outline'}
                  size={26}
                  color={ongoing === 0 ? colors.success : colors.primary}
                />
              </View>
            </View>

            {/* Répartition détaillée */}
            <View style={styles.statsRow}>
              <Stat label="En attente" value={counts.pending} tone={colors.warning} />
              <View style={styles.statDivider} />
              <Stat label="En cours" value={counts.in_progress} tone={colors.accent} />
              <View style={styles.statDivider} />
              <Stat label="Résolus" value={counts.resolved} tone={colors.success} />
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
            onPress={() => router.push(`/(tenant)/ticket/${item.id}`)}
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
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name={filter === 'all' ? 'documents-outline' : 'filter-outline'}
                  size={36}
                  color={colors.textLight}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'all'
                  ? 'Aucun signalement'
                  : 'Aucun signalement dans ce filtre'}
              </Text>
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? 'Appuyez sur l’onglet « Nouveau » pour signaler un incident.'
                  : 'Choisissez « Tous » pour revoir l’ensemble de vos signalements.'}
              </Text>
              {filter !== 'all' && (
                <Pressable
                  onPress={() => setFilter('all')}
                  style={styles.emptyAction}
                >
                  <Text style={styles.emptyActionText}>Voir tous</Text>
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
  headerBlock: { marginBottom: spacing.lg, gap: spacing.md },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  heroTextBlock: { flex: 1 },
  heroLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  heroValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  heroBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
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
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

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
