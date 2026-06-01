import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

export default function ManagerDashboardScreen() {
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Bonjour, {profile?.full_name ?? '…'}</Text>
      <Text style={styles.subtitle}>Vue d'ensemble des incidents</Text>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Tableau de bord — à venir</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  greeting: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 14, color: '#94a3b8' },
});
