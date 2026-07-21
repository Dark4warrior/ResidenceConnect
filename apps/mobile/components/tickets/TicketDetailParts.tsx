import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  TICKET_CATEGORY_LABELS,
  type TicketCategory,
  type TicketStatus,
  type UrgencyLevel,
} from '@residenceconnect/shared';
import { UrgencyBadge } from './TicketStatusBadge';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';

/** Icône par catégorie d'incident. */
export const CATEGORY_ICON: Record<TicketCategory, keyof typeof Ionicons.glyphMap> = {
  plumbing: 'water-outline',
  electricity: 'flash-outline',
  elevator: 'swap-vertical-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

/** Étapes du cycle de vie d'un signalement, dans l'ordre. */
const STEPS: { key: TicketStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'pending', label: 'Reçu', icon: 'document-text-outline' },
  { key: 'in_progress', label: 'En cours', icon: 'construct-outline' },
  { key: 'resolved', label: 'Résolu', icon: 'checkmark-done-outline' },
];

/**
 * En-tête d'un écran de détail : icône de catégorie, titre, urgence et
 * numéro de référence (les 8 premiers caractères de l'id, utiles pour
 * échanger sur un signalement précis).
 */
export function TicketHero({
  id,
  title,
  category,
  urgency,
}: {
  id: string;
  title: string;
  category: TicketCategory;
  urgency: UrgencyLevel;
}) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={styles.categoryIcon}>
          <Ionicons
            name={CATEGORY_ICON[category] ?? 'alert-circle-outline'}
            size={22}
            color={colors.primary}
          />
        </View>
        <Text style={styles.categoryLabel}>{TICKET_CATEGORY_LABELS[category]}</Text>
        <View style={styles.flex} />
        <UrgencyBadge level={urgency} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.reference}>Référence {id.slice(0, 8).toUpperCase()}</Text>
    </View>
  );
}

/**
 * Frise de progression Reçu → En cours → Résolu, avec l'étape courante mise
 * en avant. Purement visuelle (lecture de l'avancement).
 */
export function StatusTimeline({ status }: { status: TicketStatus }) {
  const current = STEPS.findIndex((s) => s.key === status);
  return (
    <View style={styles.timeline}>
      {STEPS.map((step, i) => {
        const done = i <= current;
        const active = i === current;
        return (
          <View key={step.key} style={styles.stepWrapper}>
            <View style={styles.stepRow}>
              <View
                style={[
                  styles.stepDot,
                  done && styles.stepDotDone,
                  active && styles.stepDotActive,
                ]}
              >
                <Ionicons
                  name={step.icon}
                  size={16}
                  color={done ? colors.textOnPrimary : colors.textLight}
                />
              </View>
              {i < STEPS.length - 1 && (
                <View style={[styles.stepLine, i < current && styles.stepLineDone]} />
              )}
            </View>
            <Text style={[styles.stepLabel, done && styles.stepLabelDone]} numberOfLines={1}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Carte de section avec titre en petites capitales. */
export function DetailCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

/** Ligne d'information (icône · libellé · valeur). */
export function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={17} color={colors.textLight} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export const detailStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 28,
  },
  reference: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
    letterSpacing: 0.5,
  },

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
    marginBottom: spacing.md,
  },

  timeline: { flexDirection: 'row' },
  stepWrapper: { flex: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepDotActive: { ...shadow.brand },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: 4,
    borderRadius: 2,
  },
  stepLineDone: { backgroundColor: colors.primary },
  stepLabel: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.sm,
    fontWeight: fontWeight.medium,
  },
  stepLabelDone: { color: colors.text, fontWeight: fontWeight.semibold },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoLabel: { fontSize: fontSize.md, color: colors.textMuted, flex: 1 },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
});
