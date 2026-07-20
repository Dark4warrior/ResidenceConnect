import {
  sortTicketsByPriority,
  filterTickets,
  groupTicketsByStatus,
} from '../../lib/ticketList';
import type { UrgencyLevel, TicketStatus } from '@residenceconnect/shared';

function ticket(
  overrides: Partial<{
    id: string;
    urgency_level: UrgencyLevel;
    created_at: string;
    status: TicketStatus;
  }> = {},
) {
  return {
    id: '1',
    urgency_level: 'medium' as UrgencyLevel,
    created_at: '2026-07-01T12:00:00Z',
    status: 'pending' as TicketStatus,
    ...overrides,
  };
}

describe('sortTicketsByPriority', () => {
  it('trie par urgence décroissante puis date décroissante', () => {
    const sorted = sortTicketsByPriority([
      ticket({ id: 'a', urgency_level: 'low', created_at: '2026-07-03T00:00:00Z' }),
      ticket({ id: 'b', urgency_level: 'critical', created_at: '2026-07-01T00:00:00Z' }),
      ticket({ id: 'c', urgency_level: 'critical', created_at: '2026-07-02T00:00:00Z' }),
      ticket({ id: 'd', urgency_level: 'high', created_at: '2026-07-04T00:00:00Z' }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['c', 'b', 'd', 'a']);
  });

  it('ne mute pas le tableau d’origine', () => {
    const input = [ticket({ id: 'x', urgency_level: 'low' })];
    const copy = [...input];
    sortTicketsByPriority(input);
    expect(input).toEqual(copy);
  });
});

describe('filterTickets', () => {
  const list = [
    ticket({ id: '1', status: 'pending', urgency_level: 'high' }),
    ticket({ id: '2', status: 'resolved', urgency_level: 'low' }),
    ticket({ id: '3', status: 'pending', urgency_level: 'low' }),
  ];

  it('renvoie tout si filtres = all', () => {
    expect(filterTickets(list, 'all', 'all')).toHaveLength(3);
  });

  it('filtre par statut', () => {
    expect(filterTickets(list, 'pending', 'all').map((t) => t.id)).toEqual([
      '1',
      '3',
    ]);
  });

  it('filtre par urgence et statut combinés', () => {
    expect(filterTickets(list, 'pending', 'low').map((t) => t.id)).toEqual(['3']);
  });
});

describe('groupTicketsByStatus', () => {
  it('répartit dans les trois buckets', () => {
    const groups = groupTicketsByStatus([
      ticket({ id: '1', status: 'in_progress' }),
      ticket({ id: '2', status: 'pending' }),
      ticket({ id: '3', status: 'resolved' }),
      ticket({ id: '4', status: 'pending' }),
    ]);
    expect(groups.in_progress.map((t) => t.id)).toEqual(['1']);
    expect(groups.pending.map((t) => t.id)).toEqual(['2', '4']);
    expect(groups.resolved.map((t) => t.id)).toEqual(['3']);
  });
});
