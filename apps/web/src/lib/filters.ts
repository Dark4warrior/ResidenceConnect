import type { TicketRow, TicketFilters } from '../types';

/**
 * Applique les critères de filtrage à une liste de tickets.
 *
 * - Les filtres `status` / `urgency` / `category` à `all` sont ignorés.
 * - `search` est insensible à la casse et cherche dans le titre, la
 *   description, le numéro de logement et le nom de la résidence.
 *
 * Fonction pure : ne mute pas l'entrée, renvoie un nouveau tableau.
 */
export function filterTickets(
  tickets: TicketRow[],
  filters: TicketFilters
): TicketRow[] {
  const needle = filters.search.trim().toLowerCase();

  return tickets.filter((t) => {
    if (filters.status !== 'all' && t.status !== filters.status) return false;
    if (filters.urgency !== 'all' && t.urgency_level !== filters.urgency) {
      return false;
    }
    if (filters.category !== 'all' && t.category !== filters.category) {
      return false;
    }

    if (needle.length > 0) {
      const haystack = [
        t.title,
        t.description,
        t.apartment?.unit_number ?? '',
        t.apartment?.residence?.name ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    return true;
  });
}

// Ordre de gravité croissant : sert au tri "les plus urgents d'abord".
const URGENCY_WEIGHT: Record<TicketRow['urgency_level'], number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

/**
 * Trie les tickets par urgence décroissante puis par date de création
 * décroissante. Fonction pure (copie avant tri).
 */
export function sortByUrgencyThenDate(tickets: TicketRow[]): TicketRow[] {
  return [...tickets].sort((a, b) => {
    const byUrgency =
      URGENCY_WEIGHT[b.urgency_level] - URGENCY_WEIGHT[a.urgency_level];
    if (byUrgency !== 0) return byUrgency;
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });
}
