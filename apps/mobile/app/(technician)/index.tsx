import { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useTickets, type TicketListItem } from '../../hooks/useTickets';
import { TicketCard } from '../../components/tickets/TicketCard';
import { Avatar } from '../../components/ui/Avatar';
import { groupTicketsByStatus, sortTicketsByPriority } from '../../lib/ticketList';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';

/** Ordre d'affichage des sections terrain. */
const SECTION_ORDER: ('in_progress' | 'pending' | 'resolved')[] = [
  'in_progress',
  'pending',
  'resolved',
];

const SECTION_TITLES = {
  in_progress: 'En cours',
  pending: 'En attente',
  resolved: 'Résolus',
} as const;

export default function TechnicianHomeScreen() {
  const { profile } = useAuth();
  const { tickets, loading, error, refetch } = useTickets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

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

  const sections = useMemo(() => {
    const sorted = sortTicketsByPriority(tickets);
    const groups = groupTicketsByStatus(sorted);
    return SECTION_ORDER.filter((status) => groups[status].length > 0).map(
      (status) => ({
        title: SECTION_TITLES[status],
        status,
        data: groups[status] as TicketListItem[],
      }),
    );
  }, [tickets]);

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.headerRow}>
              <Avatar name={profile?.full_name ?? '?'} size={48} />
              <View style={styles.headerText}>
                <Text style={styles.hello}>Mes missions</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {profile?.full_name ?? '…'}
                </Text>
              </View>
            </View>
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {tickets.length} mission{tickets.length === 1 ? '' : 's'} assignée
                {tickets.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <TicketCard
              ticket={item}
              onPress={() => router.push(`/(technician)/ticket/${item.id}`)}
            />
          </View>
        )}
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
              <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
              <Text style={styles.emptyTitle}>Impossible de charger</Text>
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="construct-outline" size={36} color={colors.textLight} />
              </View>
              <Text style={styles.emptyTitle}>Aucune mission</Text>
              <Text style={styles.emptyText}>
                Aucune mission assignée pour le moment. Les signalements
                qui vous seront confiés apparaîtront ici.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, flexGrow: 1, paddingBottom: 40 },
  headerBlock: { marginBottom: spacing.lg, gap: spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: { flex: 1 },
  hello: { fontSize: fontSize.md, color: colors.textMuted },
  name: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadow.card,
  },
  summaryText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  cardWrap: { marginBottom: spacing.md },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
