import { Tabs } from 'expo-router';

export default function ManagerLayout() {
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
        options={{ title: 'Tableau de bord', tabBarLabel: 'Tableau de bord' }}
      />
      <Tabs.Screen
        name="analytics"
        options={{ title: 'Statistiques', tabBarLabel: 'Stats' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Mon profil', tabBarLabel: 'Profil' }}
      />
      <Tabs.Screen name="ticket/[id]" options={{ href: null }} />
    </Tabs>
  );
}
