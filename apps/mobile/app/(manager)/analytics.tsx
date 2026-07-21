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
import { Ionicons } from '@expo/vector-icons';
import {
  TICKET_STATUS_LABELS,
  URGENCY_LEVEL_LABELS,
  type TicketStatus,
  type UrgencyLevel,
} from '@residenceconnect/shared';
import { useTickets } from '../../hooks/useTickets';
import { computeKpis, formatDuration } from '../../lib/analytics';
import { CategoryDonut } from '../../components/analytics/CategoryDonut';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';

// Palette volontairement sobre (app professionnelle) : les barres sont
// monochromes (couleur de marque), l'intensité varie légèrement selon la
// gravité plutôt que d'empiler des couleurs vives.
const STATUS_TONE: Record<TicketStatus, string> = {
  pending: colors.primaryLight,
  in_progress: colors.primary,
  resolved: colors.primaryDark,
};

const URGENCY_TONE: Record<UrgencyLevel, string> = {
  low: colors.primaryLight,
  medium: colors.primary,
  high: colors.primary,
  critical: colors.primaryDark,
};

export default function ManagerAnalyticsScreen() {
  const { tickets, loading, error, refetch } = useTickets();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const kpis = useMemo(() => computeKpis(tickets), [tickets]);

  const open = kpis.byStatus.pending + kpis.byStatus.in_progress;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
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
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Indicateur principal : la performance de traitement */}
      <View style={styles.headline}>
        <Text style={styles.headlineLabel}>Taux de résolution</Text>
        <Text style={styles.headlineValue}>{kpis.resolutionRate} %</Text>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${kpis.resolutionRate}%` }]}
          />
        </View>
        <Text style={styles.headlineSub}>
          {kpis.byStatus.resolved} résolu{kpis.byStatus.resolved > 1 ? 's' : ''} sur{' '}
          {kpis.total} signalement{kpis.total > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Indicateurs secondaires */}
      <View style={styles.kpiGrid}>
        <Kpi
          icon="timer-outline"
          value={formatDuration(kpis.avgResolutionHours)}
          label="Délai moyen"
          tone={colors.primary}
        />
        <Kpi
          icon="folder-open-outline"
          value={String(open)}
          label="En cours"
          tone={colors.textMuted}
        />
        <Kpi
          icon="alert-circle-outline"
          value={String(kpis.byUrgency.critical)}
          label="Critiques"
          tone={colors.danger}
        />
        <Kpi
          icon="documents-outline"
          value={String(kpis.total)}
          label="Total"
          tone={colors.primary}
        />
      </View>

      {/* Répartition par catégorie : graphique + récapitulatif */}
      <Card title="Répartition par catégorie">
        <CategoryDonut byCategory={kpis.byCategory} total={kpis.total} />
      </Card>

      {/* Avancement */}
      <Card title="Avancement des signalements">
        {(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((s) => (
          <BarRow
            key={s}
            label={TICKET_STATUS_LABELS[s]}
            count={kpis.byStatus[s]}
            total={kpis.total}
            tone={STATUS_TONE[s]}
          />
        ))}
      </Card>

      {/* Gravité */}
      <Card title="Niveaux d'urgence">
        {(Object.keys(URGENCY_LEVEL_LABELS) as UrgencyLevel[]).map((u) => (
          <BarRow
            key={u}
            label={URGENCY_LEVEL_LABELS[u]}
            count={kpis.byUrgency[u]}
            total={kpis.total}
            tone={URGENCY_TONE[u]}
          />
        ))}
      </Card>

      <Text style={styles.footnote}>
        Indicateurs calculés sur les signalements de vos résidences. Le délai
        moyen ne tient compte que des incidents effectivement résolus.
      </Text>
    </ScrollView>
  );
}

function Kpi({
  icon,
  value,
  label,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  tone: string;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: `${tone}1A` }]}>
        <Ionicons name={icon} size={18} color={tone} />
      </View>
      <Text style={styles.kpiValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BarRow({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={styles.barRow}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>
          {count} <Text style={styles.barPct}>· {pct} %</Text>
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[styles.barFill, { width: `${pct}%`, backgroundColor: tone }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  error: { fontSize: fontSize.md, color: colors.danger, textAlign: 'center' },

  headline: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadow.brand,
  },
  headlineLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  headlineValue: {
    fontSize: 44,
    fontWeight: fontWeight.extrabold,
    color: colors.textOnPrimary,
    marginTop: spacing.xs,
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.textOnPrimary,
  },
  headlineSub: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.sm,
  },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kpiCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  kpiIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  kpiValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  kpiLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  cardTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: spacing.lg,
  },

  barRow: { marginBottom: spacing.lg },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  barLabel: { fontSize: fontSize.md, color: colors.text },
  barValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  barPct: { fontWeight: fontWeight.regular, color: colors.textLight },
  barTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: radius.full },

  footnote: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    lineHeight: 17,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
});
