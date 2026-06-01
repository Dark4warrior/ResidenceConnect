import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';

export default function TenantProfileScreen() {
  const { profile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      {/* En-tête profil */}
      <View style={styles.header}>
        <Avatar name={profile?.full_name ?? '?'} size={88} />
        <Text style={styles.name}>{profile?.full_name}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="home" size={13} color={colors.primary} />
          <Text style={styles.roleText}>Locataire</Text>
        </View>
      </View>

      {/* Coordonnées */}
      <Card style={styles.card} padded={false}>
        <InfoRow
          icon="call-outline"
          label="Téléphone"
          value={profile?.phone || 'Non renseigné'}
        />
        <View style={styles.divider} />
        <InfoRow
          icon="shield-checkmark-outline"
          label="Rôle"
          value="Locataire"
        />
      </Card>

      {/* Déconnexion */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={signOut}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  roleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  card: {
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  logoutText: {
    color: colors.danger,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.base,
  },
});
