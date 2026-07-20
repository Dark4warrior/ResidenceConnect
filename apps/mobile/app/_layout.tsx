import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import type { UserRole } from '@residenceconnect/shared';

/** Groupe de routes correspondant à chaque rôle. */
function getRoleGroup(role: UserRole): string {
  switch (role) {
    case 'tenant':
      return '(tenant)';
    case 'manager':
      return '(manager)';
    case 'technician':
      return '(technician)';
  }
}

export default function RootLayout() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Enregistre l'appareil pour les notifications push dès qu'un profil est
  // connu. Le hook ne fait rien tant que `profile` est null (déconnecté), et
  // l'enregistrement est idempotent (upsert sur le token).
  useNotifications(profile?.id ?? null);

  useEffect(() => {
    if (loading) return;

    const currentGroup = segments[0];
    const inAuthGroup = currentGroup === '(auth)';

    // Non connecté → forcer l'écran de connexion
    if (!session || !profile) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Connecté → garantir qu'on est dans le groupe correspondant au rôle.
    // Indispensable : les trois groupes partagent l'URL "/", donc au
    // démarrage à froid Expo Router peut afficher le mauvais espace.
    const targetGroup = getRoleGroup(profile.role);
    if (currentGroup !== targetGroup) {
      router.replace(`/${targetGroup}` as never);
    }
  }, [session, profile, loading, segments, router]);

  // Tant que la session/le profil se charge, on affiche un écran neutre
  // pour éviter le flash vers un espace incorrect.
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1e3a5f" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tenant)" />
      <Stack.Screen name="(manager)" />
      <Stack.Screen name="(technician)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
});
