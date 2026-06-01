import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '@residenceconnect/shared';

function getRoleRoute(role: UserRole): string {
  switch (role) {
    case 'tenant':
      return '/(tenant)';
    case 'manager':
      return '/(manager)';
    case 'technician':
      return '/(technician)';
  }
}

export default function RootLayout() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (session && profile) {
      if (inAuthGroup) {
        router.replace(getRoleRoute(profile.role) as never);
      }
    }
  }, [session, profile, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tenant)" />
      <Stack.Screen name="(manager)" />
      <Stack.Screen name="(technician)" />
    </Stack>
  );
}
