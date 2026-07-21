import { describe, it, expect } from 'vitest';
import { filterTickets, sortByUrgencyThenDate } from '../filters';
import { EMPTY_FILTERS, type TicketFilters } from '../../types';
import { makeTicket } from '../../test/fixtures';

const withFilters = (partial: Partial<TicketFilters>): TicketFilters => ({
  ...EMPTY_FILTERS,
  ...partial,
});

describe('filterTickets', () => {
  const tickets = [
    makeTicket({ status: 'pending', urgency_level: 'low', category: 'plumbing', title: 'Robinet' }),
    makeTicket({ status: 'resolved', urgency_level: 'critical', category: 'elevator', title: 'Ascenseur bloqué' }),
    makeTicket({ status: 'in_progress', urgency_level: 'high', category: 'electricity', title: 'Panne de courant' }),
  ];

  it('sans filtre : renvoie tous les tickets', () => {
    expect(filterTickets(tickets, EMPTY_FILTERS)).toHaveLength(3);
  });

  it('filtre par statut', () => {
    const res = filterTickets(tickets, withFilters({ status: 'resolved' }));
    expect(res).toHaveLength(1);
    expect(res[0].title).toBe('Ascenseur bloqué');
  });

  it('filtre par urgence', () => {
    expect(filterTickets(tickets, withFilters({ urgency: 'high' }))).toHaveLength(1);
  });

  it('filtre par catégorie', () => {
    expect(filterTickets(tickets, withFilters({ category: 'plumbing' }))).toHaveLength(1);
  });

  it('combine plusieurs filtres (ET logique)', () => {
    const res = filterTickets(
      tickets,
      withFilters({ status: 'pending', category: 'electricity' })
    );
    expect(res).toHaveLength(0);
  });

  it('recherche insensible à la casse dans titre et logement', () => {
    expect(filterTickets(tickets, withFilters({ search: 'ASCENSEUR' }))).toHaveLength(1);
    expect(filterTickets(tickets, withFilters({ search: 'b12' }))).toHaveLength(3);
  });

  it('recherche sans résultat renvoie une liste vide', () => {
    expect(filterTickets(tickets, withFilters({ search: 'zzz' }))).toHaveLength(0);
  });

  it('ne mute pas le tableau d’entrée', () => {
    const copy = [...tickets];
    filterTickets(tickets, withFilters({ status: 'pending' }));
    expect(tickets).toEqual(copy);
  });
});

describe('sortByUrgencyThenDate', () => {
  it('trie par urgence décroissante puis date décroissante', () => {
    const list = [
      makeTicket({ urgency_level: 'low', created_at: '2026-07-01T00:00:00Z', title: 'A' }),
      makeTicket({ urgency_level: 'critical', created_at: '2026-07-01T00:00:00Z', title: 'B' }),
      makeTicket({ urgency_level: 'critical', created_at: '2026-07-05T00:00:00Z', title: 'C' }),
    ];
    const sorted = sortByUrgencyThenDate(list);
    expect(sorted.map((t) => t.title)).toEqual(['C', 'B', 'A']);
  });

  it('ne mute pas le tableau d’entrée', () => {
    const list = [makeTicket({ urgency_level: 'low' }), makeTicket({ urgency_level: 'high' })];
    const copy = [...list];
    sortByUrgencyThenDate(list);
    expect(list).toEqual(copy);
  });
});
