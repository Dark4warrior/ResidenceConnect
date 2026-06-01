import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

export default function TenantHomeScreen() {
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        Bonjour, {profile?.full_name ?? '…'}
      </Text>
      <Text style={styles.subtitle}>Vos signalements d'incidents</Text>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Aucun signalement pour le moment.
        </Text>
        <Text style={styles.placeholderText}>
          Appuyez sur "Nouveau" pour créer un signalement.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
