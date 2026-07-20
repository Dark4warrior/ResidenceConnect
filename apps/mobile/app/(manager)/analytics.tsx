import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  TICKET_STATUS_LABELS,
  TICKET_CATEGORY_LABELS,
  type TicketStatus,
  type TicketCategory,
} from '@residenceconnect/shared';
import { useTickets } from '../../hooks/useTickets';
import { computeKpis, formatDuration } from '../../lib/analytics';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';

export default function ManagerAnalyticsScreen() {
  const { tickets, loading, error, refetch } = useTickets();
  const [refreshing, setRefreshing] = useState(false);
  const kpis = useMemo(() => computeKpis(tickets), [tickets]);

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

  if (loading && tickets.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.heading}>Indicateurs</Text>

      <View style={styles.kpiGrid}>
        <KpiCard label="Total" value={String(kpis.total)} />
        <KpiCard label="Résolution" value={`${kpis.resolutionRate} %`} />
        <KpiCard
          label="Délai moyen"
          value={formatDuration(kpis.avgResolutionHours)}
        />
        <KpiCard
          label="En attente"
          value={String(kpis.byStatus.pending)}
        />
      </View>

      <Distribution
        title="Par statut"
        entries={(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((k) => ({
          label: TICKET_STATUS_LABELS[k],
          count: kpis.byStatus[k],
        }))}
        total={kpis.total}
      />

      <Distribution
        title="Par catégorie"
        entries={(Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[]).map(
          (k) => ({
            label: TICKET_CATEGORY_LABELS[k],
            count: kpis.byCategory[k],
          }),
        )}
        total={kpis.total}
      />
    </ScrollView>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function Distribution({
  title,
  entries,
  total,
}: {
  title: string;
  entries: { label: string; count: number }[];
  total: number;
}) {
  return (
    <View style={styles.distCard}>
      <Text style={styles.distTitle}>{title}</Text>
      {entries.map((e) => {
        const pct = total > 0 ? Math.round((e.count / total) * 100) : 0;
        return (
          <View key={e.label} style={styles.distRow}>
            <View style={styles.distHeader}>
              <Text style={styles.distLabel}>{e.label}</Text>
              <Text style={styles.distCount}>
                {e.count} · {pct} %
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%` }]} />
            </View>
          </View>
        );
      })}
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
    padding: spacing.xl,
  },
  error: { color: colors.danger, textAlign: 'center' },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  kpiCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  kpiValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
  },
  kpiLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  distCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  distTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  distRow: { gap: spacing.xs },
  distHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  distLabel: { fontSize: fontSize.md, color: colors.textMuted },
  distCount: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  barTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
});
