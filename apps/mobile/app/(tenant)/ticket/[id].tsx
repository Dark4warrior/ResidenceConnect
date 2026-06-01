import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  TICKET_CATEGORY_LABELS,
  type Ticket,
} from '@residenceconnect/shared';
import { supabase } from '../../../lib/supabase';
import {
  StatusBadge,
  UrgencyBadge,
} from '../../../components/tickets/TicketStatusBadge';

interface TicketDetail extends Ticket {
  apartment: {
    unit_number: string;
    floor: string | null;
    residence: { name: string; address: string; city: string } | null;
  } | null;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TenantTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tickets')
        .select(
          'id, apartment_id, reported_by, assigned_to, title, description, category, urgency_level, status, created_at, updated_at, resolved_at, apartment:apartments(unit_number, floor, residence:residences(name, address, city))'
        )
        .eq('id', id)
        .single();

      setTicket((data as unknown as TicketDetail) ?? null);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1e3a5f" size="large" />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Signalement introuvable.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Détail du signalement' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{ticket.title}</Text>

        <View style={styles.badges}>
          <StatusBadge status={ticket.status} />
          <UrgencyBadge level={ticket.urgency_level} />
        </View>

        <View style={styles.card}>
          <Row
            icon="pricetag-outline"
            label="Catégorie"
            value={TICKET_CATEGORY_LABELS[ticket.category]}
          />
          {ticket.apartment && (
            <Row
              icon="home-outline"
              label="Logement"
              value={`${ticket.apartment.residence?.name ?? ''} · ${ticket.apartment.unit_number}${
                ticket.apartment.floor ? ` (étage ${ticket.apartment.floor})` : ''
              }`}
            />
          )}
          <Row
            icon="calendar-outline"
            label="Créé le"
            value={formatDateTime(ticket.created_at)}
          />
          {ticket.resolved_at && (
            <Row
              icon="checkmark-done-outline"
              label="Résolu le"
              value={formatDateTime(ticket.resolved_at)}
            />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{ticket.description}</Text>
        </View>
      </ScrollView>
    </>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color="#64748b" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 16, gap: 16 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  notFound: { fontSize: 15, color: '#64748b' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  badges: { flexDirection: 'row', gap: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { fontSize: 14, color: '#64748b', width: 90 },
  rowValue: { fontSize: 14, color: '#0f172a', fontWeight: '600', flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#334155' },
  description: { fontSize: 15, color: '#475569', lineHeight: 22 },
});
