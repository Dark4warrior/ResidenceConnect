import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TICKET_CATEGORY_LABELS } from '@residenceconnect/shared';
import { StatusBadge, UrgencyBadge } from './TicketStatusBadge';
import type { TicketListItem } from '../../hooks/useTickets';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  plumbing: 'water-outline',
  electricity: 'flash-outline',
  elevator: 'swap-vertical-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface TicketCardProps {
  ticket: TicketListItem;
  onPress?: () => void;
}

/** Carte résumant un ticket dans une liste. */
export function TicketCard({ ticket, onPress }: TicketCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons
            name={CATEGORY_ICONS[ticket.category] ?? 'help-outline'}
            size={20}
            color="#1e3a5f"
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {ticket.title}
          </Text>
          <Text style={styles.meta}>
            {TICKET_CATEGORY_LABELS[ticket.category]}
            {ticket.apartment?.unit_number
              ? ` · Logement ${ticket.apartment.unit_number}`
              : ''}
          </Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {ticket.description}
      </Text>

      <View style={styles.footer}>
        <View style={styles.badges}>
          <StatusBadge status={ticket.status} />
          <UrgencyBadge level={ticket.urgency_level} />
        </View>
        <Text style={styles.date}>{formatDate(ticket.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eef2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  meta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  date: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
