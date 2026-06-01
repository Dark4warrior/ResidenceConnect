import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useTickets } from '../../hooks/useTickets';
import { TicketCard } from '../../components/tickets/TicketCard';
import { Avatar } from '../../components/ui/Avatar';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';

export default function TenantHomeScreen() {
  const { profile } = useAuth();
  const { tickets, loading, refetch } = useTickets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Recharge la liste chaque fois que l'écran reçoit le focus
  // (ex : retour depuis l'écran de création d'un signalement).
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const pending = tickets.filter((t) => t.status !== 'resolved').length;

  return (
    <View style={styles.container}>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.headerRow}>
              <Avatar name={profile?.full_name ?? '?'} size={48} />
              <View style={styles.headerText}>
                <Text style={styles.hello}>Bonjour 👋</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {profile?.full_name ?? '…'}
                </Text>
              </View>
            </View>

            {tickets.length > 0 && (
              <View style={styles.summary}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{tickets.length}</Text>
                  <Text style={styles.summaryLabel}>Total</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNumber, { color: colors.warning }]}>
                    {pending}
                  </Text>
                  <Text style={styles.summaryLabel}>En cours</Text>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>Mes signalements</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TicketCard
            ticket={item}
            onPress={() => router.push(`/(tenant)/ticket/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
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
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="documents-outline"
                  size={36}
                  color={colors.textLight}
                />
              </View>
              <Text style={styles.emptyTitle}>Aucun signalement</Text>
              <Text style={styles.emptyText}>
                Appuyez sur l&apos;onglet « Nouveau » pour signaler un incident.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  headerBlock: {
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  hello: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryNumber: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  empty: {
    flex: 1,
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
