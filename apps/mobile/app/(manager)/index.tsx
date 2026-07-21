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
import { SegmentedToggle } from '../../components/ui/SegmentedToggle';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';

/** Les deux intentions du gestionnaire : agir, puis surveiller. */
type Plan = 'to_assign' | 'assigned';

const URGENCY_WEIGHT: Record<string, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0,
};

export default function ManagerDashboardScreen() {
  const { tickets, loading, error, refetch } = useTickets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [plan, setPlan] = useState<Plan>('to_assign');
  const [status, setStatus] = useState<StatusFilter>('all');

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

  // Plan 1 : à assigner — un ticket résolu n'attend plus personne, il sort
  // de la file d'action même s'il n'a jamais été attribué.
  const toAssign = useMemo(
    () => tickets.filter((t) => !t.assigned_to && t.status !== 'resolved'),
    [tickets]
  );
  const assigned = useMemo(
    () => tickets.filter((t) => t.assigned_to || t.status === 'resolved'),
    [tickets]
  );

  const source = plan === 'to_assign' ? toAssign : assigned;

  // Compteurs de statut calculés sur le plan courant : les puces reflètent
  // ce qui est réellement affiché.
  const counts = useMemo(
    () =>
      source.reduce(
        (acc, t) => {
          acc[t.status] += 1;
          return acc;
        },
        { pending: 0, in_progress: 0, resolved: 0 } as Record<TicketStatus, number>
      ),
    [source]
  );

  const visible = useMemo(() => {
    const base =
      status === 'all' ? source : source.filter((t) => t.status === status);
    return [...base].sort((a, b) => {
      const byUrgency =
        (URGENCY_WEIGHT[b.urgency_level] ?? 0) -
        (URGENCY_WEIGHT[a.urgency_level] ?? 0);
      if (byUrgency !== 0) return byUrgency;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [source, status]);

  const critical = useMemo(
    () => toAssign.filter((t) => t.urgency_level === 'critical').length,
    [toAssign]
  );

  // Changer de plan remet le filtre de statut à zéro : sinon on peut atterrir
  // sur une liste vide sans comprendre pourquoi.
  const changePlan = (next: Plan) => {
    setPlan(next);
    setStatus('all');
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Ce qui demande une décision du gestionnaire */}
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons
                  name={toAssign.length === 0 ? 'checkmark-done' : 'person-add-outline'}
                  size={24}
                  color={toAssign.length === 0 ? colors.success : colors.textOnPrimary}
                />
              </View>
              <View style={styles.flex}>
                <Text style={styles.heroValue}>
                  {toAssign.length === 0
                    ? 'Tout est attribué'
                    : `${toAssign.length} signalement${toAssign.length > 1 ? 's' : ''} à attribuer`}
                </Text>
                <Text style={styles.heroSub}>
                  {tickets.length} au total · {counts.resolved} résolu
                  {counts.resolved > 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {/* Interrupteur en premier : sa position reste stable quel que
                soit le plan (l'alerte est placée EN DESSOUS pour ne pas le
                faire sauter au changement). */}
            <SegmentedToggle<Plan>
              value={plan}
              onChange={changePlan}
              options={[
                {
                  key: 'to_assign',
                  label: 'À attribuer',
                  count: toAssign.length,
                  icon: 'person-add-outline',
                },
                {
                  key: 'assigned',
                  label: 'Suivi',
                  count: assigned.length,
                  icon: 'pulse-outline',
                },
              ]}
            />

            {critical > 0 && plan === 'to_assign' && (
              <View style={styles.alert}>
                <Ionicons name="warning" size={18} color={colors.danger} />
                <Text style={styles.alertText}>
                  {critical} signalement{critical > 1 ? 's' : ''} critique
                  {critical > 1 ? 's' : ''} sans technicien
                </Text>
              </View>
            )}

            {/* Filtre de statut : pertinent surtout dans le plan « Suivi »,
                où l'on observe l'évolution des interventions. */}
            {plan === 'assigned' && (
              <StatusFilterBar
                value={status}
                onChange={setStatus}
                counts={counts}
                total={source.length}
              />
            )}
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
              <Text style={styles.emptyTitle}>Impossible de charger</Text>
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name={
                    plan === 'to_assign' ? 'checkmark-circle-outline' : 'filter-outline'
                  }
                  size={36}
                  color={colors.textLight}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {plan === 'to_assign'
                  ? 'Aucun signalement à attribuer'
                  : status === 'all'
                    ? 'Aucun signalement suivi'
                    : 'Aucun signalement dans ce filtre'}
              </Text>
              <Text style={styles.emptyText}>
                {plan === 'to_assign'
                  ? 'Tous les signalements en cours ont un technicien assigné.'
                  : 'Les signalements attribués apparaîtront ici avec leur avancement.'}
              </Text>
              {plan === 'assigned' && status !== 'all' && (
                <Pressable onPress={() => setStatus('all')} style={styles.emptyAction}>
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
