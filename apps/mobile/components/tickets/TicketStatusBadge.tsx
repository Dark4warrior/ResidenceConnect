import { View, Text, StyleSheet } from 'react-native';
import {
  TICKET_STATUS_LABELS,
  STATUS_COLORS,
  URGENCY_LEVEL_LABELS,
  URGENCY_COLORS,
  type TicketStatus,
  type UrgencyLevel,
} from '@residenceconnect/shared';

/** Pastille colorée pour le statut d'un ticket. */
export function StatusBadge({ status }: { status: TicketStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1a` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>
        {TICKET_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

/** Pastille colorée pour le niveau d'urgence d'un ticket. */
export function UrgencyBadge({ level }: { level: UrgencyLevel }) {
  const color = URGENCY_COLORS[level];
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1a` }]}>
      <Text style={[styles.text, { color }]}>
        {URGENCY_LEVEL_LABELS[level]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
