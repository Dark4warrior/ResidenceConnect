import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import type { TicketStatus } from '@residenceconnect/shared';
import { TICKET_STATUS_LABELS } from '@residenceconnect/shared';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';

/** `all` signifie « aucun filtre ». */
export type StatusFilter = TicketStatus | 'all';

interface StatusFilterBarProps {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  /** Nombre de tickets par statut, pour afficher les compteurs. */
  counts: Record<TicketStatus, number>;
  total: number;
}

const ORDER: StatusFilter[] = ['all', 'pending', 'in_progress', 'resolved'];

/** Couleur d'accent de la puce active, par statut. */
const ACTIVE_COLOR: Record<StatusFilter, string> = {
  all: colors.primary,
  pending: colors.textMuted,
  in_progress: colors.accent,
  resolved: colors.success,
};

/**
 * Barre de filtres par statut, sous forme de puces défilables.
 *
 * Chaque puce affiche son compteur : l'utilisateur sait combien de
 * signalements l'attendent dans chaque état avant même de filtrer.
 */
export function StatusFilterBar({
  value,
  onChange,
  counts,
  total,
}: StatusFilterBarProps) {
  const labelFor = (f: StatusFilter) =>
    f === 'all' ? 'Tous' : TICKET_STATUS_LABELS[f];
  const countFor = (f: StatusFilter) => (f === 'all' ? total : counts[f]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {ORDER.map((f) => {
        const active = value === f;
        const count = countFor(f);
        return (
          <Pressable
            key={f}
            onPress={() => onChange(f)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${labelFor(f)}, ${count} signalement${count > 1 ? 's' : ''}`}
            style={({ pressed }) => [
              styles.chip,
              active && { backgroundColor: ACTIVE_COLOR[f], borderColor: ACTIVE_COLOR[f] },
              pressed && !active && styles.chipPressed,
            ]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {labelFor(f)}
            </Text>
            <Text style={[styles.count, active && styles.countActive]}>
              {count}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipPressed: { backgroundColor: colors.surfaceAlt },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  labelActive: { color: colors.textOnPrimary },
  count: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    backgroundColor: colors.surfaceAlt,
    minWidth: 20,
    textAlign: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  countActive: {
    color: colors.textOnPrimary,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
