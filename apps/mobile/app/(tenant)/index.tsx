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

  return (
    <View style={styles.container}>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.greeting}>
              Bonjour, {profile?.full_name ?? '…'}
            </Text>
            <Text style={styles.subtitle}>
              {tickets.length > 0
                ? `${tickets.length} signalement${tickets.length > 1 ? 's' : ''}`
                : 'Vos signalements d’incidents'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TicketCard
            ticket={item}
            onPress={() => router.push(`/(tenant)/ticket/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              color="#1e3a5f"
              size="large"
              style={{ marginTop: 80 }}
            />
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="documents-outline"
                  size={36}
                  color="#94a3b8"
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
    backgroundColor: '#f1f5f9',
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  headerBlock: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#334155',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
