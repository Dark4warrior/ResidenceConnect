import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

export default function ManagerProfileScreen() {
  const { profile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{profile?.full_name}</Text>
      <Text style={styles.role}>Gestionnaire</Text>
      {profile?.phone && <Text style={styles.phone}>{profile.phone}</Text>}
      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', gap: 8 },
  name: { fontSize: 22, fontWeight: '700', color: '#1e293b' },
  role: { fontSize: 14, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  phone: { fontSize: 14, color: '#475569' },
  logoutButton: { marginTop: 32, backgroundColor: '#ef4444', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
