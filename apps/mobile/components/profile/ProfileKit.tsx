import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Avatar } from '../ui/Avatar';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';

/**
 * Briques communes aux écrans « Profil » des trois rôles.
 * Centralisées ici pour garantir une présentation identique sans dupliquer
 * la mise en forme dans chaque espace.
 */

/** Formate une date ISO en « mois année » (ex. « juillet 2026 »). */
export function formatMonthYear(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export function ProfileHeader({
  name,
  roleLabel,
  roleIcon,
  since,
}: {
  name: string;
  roleLabel: string;
  roleIcon: keyof typeof Ionicons.glyphMap;
  since?: string | null;
}) {
  return (
    <View style={styles.identityCard}>
      <Avatar name={name} size={64} />
      <Text style={styles.name}>{name}</Text>
      <View style={styles.roleBadge}>
        <Ionicons name={roleIcon} size={13} color={colors.primary} />
        <Text style={styles.roleText}>{roleLabel}</Text>
      </View>
      {since ? (
        <Text style={styles.memberSince}>Membre depuis {formatMonthYear(since)}</Text>
      ) : null}
    </View>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export function StatsRow({
  items,
}: {
  items: { value: number | string; label: string; tone: string }[];
}) {
  return (
    <View style={styles.statsRow}>
      {items.map((it, i) => (
        <View key={it.label} style={styles.statsItem}>
          {i > 0 && <View style={styles.statDivider} />}
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: it.tone }]}>{it.value}</Text>
            <Text style={styles.statLabel}>{it.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function InfoRow({
  icon,
  label,
  value,
  muted,
  divider,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  muted?: boolean;
  divider?: boolean;
}) {
  return (
    <View style={[styles.infoRow, divider && styles.rowDivider]}>
      <Ionicons name={icon} size={18} color={colors.textLight} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={[styles.infoValue, muted && { color: colors.textLight }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

/** Ligne illustrée (résidence, logement, spécialité…). */
export function TileRow({
  icon,
  title,
  subtitle,
  divider,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  divider?: boolean;
}) {
  return (
    <View style={[styles.tileRow, divider && styles.rowDivider]}>
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.tileTitle}>{title}</Text>
        {subtitle ? <Text style={styles.tileSub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function LogoutButton({ onConfirm }: { onConfirm: () => void }) {
  const press = () => {
    Alert.alert(
      'Se déconnecter',
      'Vous devrez saisir à nouveau vos identifiants pour accéder à l’application.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: onConfirm },
      ]
    );
  };

  return (
    <Pressable
      onPress={press}
      accessibilityRole="button"
      style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}
    >
      <Ionicons name="log-out-outline" size={19} color={colors.danger} />
      <Text style={styles.logoutText}>Se déconnecter</Text>
    </Pressable>
  );
}

export function AppVersion() {
  return <Text style={styles.version}>ResidenceConnect · version 1.0.0</Text>;
}

export const profileStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, lineHeight: 20 },
  helpText: { fontSize: fontSize.md, color: colors.textMuted, lineHeight: 21 },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identityCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    ...shadow.card,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  roleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  memberSince: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginTop: spacing.sm,
  },

  section: { marginTop: spacing.xl },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },

  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statsItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  infoLabel: { fontSize: fontSize.md, color: colors.textMuted, flex: 1 },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flexShrink: 1,
  },

  tileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  tileSub: { fontSize: fontSize.md, color: colors.textMuted, marginTop: 1 },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },

  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
  },
  logoutPressed: { opacity: 0.7 },
  logoutText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.danger,
  },
  version: {
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
});
