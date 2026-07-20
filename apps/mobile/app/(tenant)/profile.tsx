import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useApartments } from '../../hooks/useApartments';
import { useTickets } from '../../hooks/useTickets';
import { Avatar } from '../../components/ui/Avatar';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';

/** Formate une date ISO en « mois année » (ex. « juillet 2026 »). */
function formatMonthYear(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function TenantProfileScreen() {
  const { profile, user, signOut } = useAuth();
  const { apartments } = useApartments();
  const { tickets } = useTickets();

  const stats = useMemo(() => {
    const resolved = tickets.filter((t) => t.status === 'resolved').length;
    return { total: tickets.length, ongoing: tickets.length - resolved, resolved };
  }, [tickets]);

  const confirmSignOut = () => {
    Alert.alert(
      'Se déconnecter',
      'Vous devrez saisir à nouveau vos identifiants pour accéder à vos signalements.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: () => void signOut(),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.identityCard}>
        <Avatar name={profile?.full_name ?? '?'} size={64} />
        <Text style={styles.name}>{profile?.full_name ?? '—'}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="home-outline" size={13} color={colors.primary} />
          <Text style={styles.roleText}>Locataire</Text>
        </View>
        <Text style={styles.memberSince}>
          Membre depuis {formatMonthYear(profile?.created_at)}
        </Text>
      </View>

      <Section title="Mon activité">
        <View style={styles.statsRow}>
          <Stat value={stats.total} label="Signalements" tone={colors.primary} />
          <View style={styles.statDivider} />
          <Stat value={stats.ongoing} label="En cours" tone={colors.warning} />
          <View style={styles.statDivider} />
          <Stat value={stats.resolved} label="Résolus" tone={colors.success} />
        </View>
      </Section>

      <Section title={apartments.length > 1 ? 'Mes logements' : 'Mon logement'}>
        {apartments.length === 0 ? (
          <Text style={styles.emptyText}>
            Aucun logement rattaché à votre compte. Contactez votre gestionnaire.
          </Text>
        ) : (
          apartments.map((apt, i) => (
            <View key={apt.id} style={[styles.housingRow, i > 0 && styles.rowDivider]}>
              <View style={styles.housingIcon}>
                <Ionicons name="business-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.housingTitle}>
                  {apt.residence?.name ?? 'Résidence inconnue'}
                </Text>
                <Text style={styles.housingSub}>
                  Logement {apt.unit_number}
                  {apt.floor ? ` · étage ${apt.floor}` : ''}
                </Text>
              </View>
            </View>
          ))
        )}
      </Section>

      <Section title="Mes coordonnées">
        <InfoRow icon="mail-outline" label="E-mail" value={user?.email ?? '—'} />
        <InfoRow
          icon="call-outline"
          label="Téléphone"
          value={profile?.phone ?? 'Non renseigné'}
          muted={!profile?.phone}
          divider
        />
      </Section>

      <Section title="Besoin d'aide ?">
        <Text style={styles.helpText}>
          Pour toute question sur un signalement en cours, contactez le
          gestionnaire de votre résidence. Les incidents urgents (fuite
          importante, panne d&apos;ascenseur, coupure électrique) sont traités
          en priorité.
        </Text>
      </Section>

      <Pressable
        onPress={confirmSignOut}
        accessibilityRole="button"
        style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}
      >
        <Ionicons name="log-out-outline" size={19} color={colors.danger} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>

      <Text style={styles.version}>ResidenceConnect · version 1.0.0</Text>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
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
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },

  housingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  housingIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  housingTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  housingSub: { fontSize: fontSize.md, color: colors.textMuted, marginTop: 1 },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  infoLabel: { fontSize: fontSize.md, color: colors.textMuted, flex: 1 },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flexShrink: 1,
  },

  emptyText: { fontSize: fontSize.md, color: colors.textMuted, lineHeight: 20 },
  helpText: { fontSize: fontSize.md, color: colors.textMuted, lineHeight: 21 },

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
