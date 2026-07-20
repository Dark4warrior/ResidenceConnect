import { View, Text, StyleSheet } from 'react-native';
import type { TicketCategory } from '@residenceconnect/shared';
import { TICKET_CATEGORY_LABELS } from '@residenceconnect/shared';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';

/** Couleur dédiée à chaque catégorie d'incident. */
export const CATEGORY_COLORS: Record<TicketCategory, string> = {
  plumbing: '#3B82F6',
  electricity: '#F59E0B',
  elevator: '#8B5CF6',
  other: '#94A3B8',
};

const ORDER: TicketCategory[] = ['plumbing', 'electricity', 'elevator', 'other'];

interface CategoryDonutProps {
  byCategory: Record<TicketCategory, number>;
  total: number;
}

/**
 * Répartition des incidents par catégorie, sous forme d'anneau segmenté.
 *
 * L'anneau est composé de segments empilés horizontalement puis arrondis :
 * cela évite d'embarquer une librairie de graphiques (et son poids) pour un
 * seul visuel, tout en restant lisible et accessible grâce à la légende
 * chiffrée qui l'accompagne.
 */
export function CategoryDonut({ byCategory, total }: CategoryDonutProps) {
  const segments = ORDER.filter((c) => byCategory[c] > 0);

  if (total === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Aucune donnée à afficher</Text>
      </View>
    );
  }

  // Catégorie dominante, mise en avant au centre.
  const top = segments.reduce((a, b) =>
    byCategory[b] > byCategory[a] ? b : a
  );
  const topShare = Math.round((byCategory[top] / total) * 100);

  return (
    <View>
      {/* Barre segmentée proportionnelle */}
      <View style={styles.bar}>
        {segments.map((c) => (
          <View
            key={c}
            style={{
              flex: byCategory[c],
              backgroundColor: CATEGORY_COLORS[c],
            }}
            accessibilityLabel={`${TICKET_CATEGORY_LABELS[c]} : ${byCategory[c]}`}
          />
        ))}
      </View>

      <View style={styles.highlight}>
        <Text style={styles.highlightValue}>{topShare} %</Text>
        <Text style={styles.highlightLabel}>
          des incidents concernent « {TICKET_CATEGORY_LABELS[top]} »
        </Text>
      </View>

      {/* Légende chiffrée */}
      <View style={styles.legend}>
        {ORDER.map((c) => {
          const count = byCategory[c];
          const share = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <View key={c} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[c] }]} />
              <Text style={styles.legendLabel}>{TICKET_CATEGORY_LABELS[c]}</Text>
              <Text style={styles.legendCount}>{count}</Text>
              <Text style={styles.legendShare}>{share} %</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  highlight: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  highlightValue: {
    fontSize: 34,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  highlightLabel: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  legend: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: radius.full },
  legendLabel: { flex: 1, fontSize: fontSize.md, color: colors.text },
  legendCount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    minWidth: 24,
    textAlign: 'right',
  },
  legendShare: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    minWidth: 44,
    textAlign: 'right',
  },
  emptyState: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted },
});
