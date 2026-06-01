import { Tabs } from 'expo-router';

export default function TenantLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1e3a5f',
        headerStyle: { backgroundColor: '#1e3a5f' },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Mes signalements', tabBarLabel: 'Signalements' }}
      />
      <Tabs.Screen
        name="new-ticket"
        options={{ title: 'Nouveau signalement', tabBarLabel: 'Nouveau' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Mon profil', tabBarLabel: 'Profil' }}
      />
      <Tabs.Screen name="ticket/[id]" options={{ href: null }} />
    </Tabs>
  );
}
