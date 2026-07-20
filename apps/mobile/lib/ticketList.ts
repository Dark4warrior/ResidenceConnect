/**
 * Tri et filtrage purs des listes de tickets (espace gestionnaire / technicien).
 */

import type { TicketStatus, UrgencyLevel } from '@residenceconnect/shared';

/** Ordre d'urgence décroissant (critique en tête). */
const URGENCY_RANK: Record<UrgencyLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export interface SortableTicket {
  urgency_level: UrgencyLevel;
  created_at: string;
  status: TicketStatus;
}

/**
 * Trie par urgence décroissante, puis par date de création décroissante.
 * Renvoie une **nouvelle** liste (ne mute pas l'entrée).
 */
export function sortTicketsByPriority<T extends SortableTicket>(tickets: T[]): T[] {
  return [...tickets].sort((a, b) => {
    const urgencyDiff = URGENCY_RANK[b.urgency_level] - URGENCY_RANK[a.urgency_level];
    if (urgencyDiff !== 0) return urgencyDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export type StatusFilter = TicketStatus | 'all';
export type UrgencyFilter = UrgencyLevel | 'all';

/**
 * Filtre une liste selon statut et urgence (`all` = pas de filtre).
 */
export function filterTickets<T extends SortableTicket>(
  tickets: T[],
  status: StatusFilter,
  urgency: UrgencyFilter,
): T[] {
  return tickets.filter((t) => {
    if (status !== 'all' && t.status !== status) return false;
    if (urgency !== 'all' && t.urgency_level !== urgency) return false;
    return true;
  });
}

/** Groupes affichés dans « Mes missions » (technicien). */
export interface TicketStatusGroups<T> {
  in_progress: T[];
  pending: T[];
  resolved: T[];
}

/**
 * Regroupe les tickets par statut dans l'ordre métier terrain :
 * En cours → En attente → Résolus.
 */
export function groupTicketsByStatus<T extends SortableTicket>(
  tickets: T[],
): TicketStatusGroups<T> {
  const groups: TicketStatusGroups<T> = {
    in_progress: [],
    pending: [],
    resolved: [],
  };
  for (const t of tickets) {
    groups[t.status].push(t);
  }
  return groups;
}
