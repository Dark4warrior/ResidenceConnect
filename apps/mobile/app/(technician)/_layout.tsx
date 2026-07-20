import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBackButton } from '../../components/ui/HeaderBackButton';

export default function TechnicianLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1e3a5f',
        tabBarInactiveTintColor: '#94a3b8',
        headerStyle: { backgroundColor: '#1e3a5f' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: { paddingTop: 4, height: 88 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mes missions',
          tabBarLabel: 'Missions',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Mon profil',
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ticket/[id]"
        options={{
          href: null,
          title: 'Détail du signalement',
          // Écran hors barre d'onglets : il faut fournir le retour nous-mêmes.
          headerLeft: () => <HeaderBackButton fallbackHref="/(technician)" />,
        }}
      />
    </Tabs>
  );
}
