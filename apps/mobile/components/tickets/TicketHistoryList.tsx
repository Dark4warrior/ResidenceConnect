import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TICKET_STATUS_LABELS } from '@residenceconnect/shared';
import type { TicketHistoryItem } from '../../hooks/useTicketHistory';
import { formatHistoryTransition } from '../../hooks/useTicketHistory';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface TicketHistoryListProps {
  history: TicketHistoryItem[];
  loading?: boolean;
  error?: string | null;
}

/** Journal d'audit chronologique d'un ticket. */
export function TicketHistoryList({
  history,
  loading = false,
  error = null,
}: TicketHistoryListProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Historique</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !error && history.length === 0 ? (
        <Text style={styles.empty}>Aucun changement enregistré pour l’instant.</Text>
      ) : null}

      {history.map((entry) => (
        <View key={entry.id} style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
          </View>
          <View style={styles.body}>
            <Text style={styles.transition}>
              {formatHistoryTransition(
                entry.old_status,
                entry.new_status,
                TICKET_STATUS_LABELS,
              )}
            </Text>
            <Text style={styles.meta}>
              {entry.author?.full_name ?? 'Utilisateur inconnu'} ·{' '}
              {formatDateTime(entry.changed_at)}
            </Text>
            {entry.comment ? (
              <Text style={styles.comment}>« {entry.comment} »</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  empty: {
    fontSize: fontSize.md,
    color: colors.textLight,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  transition: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  comment: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
