import type { Ticket } from '@residenceconnect/shared';

/**
 * Ticket enrichi tel que renvoyé au dashboard : jointures logement / résidence
 * et noms lisibles du déclarant et du technicien assigné.
 */
export interface TicketRow extends Ticket {
  apartment: {
    id: string;
    unit_number: string;
    residence: { id: string; name: string } | null;
  } | null;
  reporter: { id: string; full_name: string } | null;
  assignee: { id: string; full_name: string } | null;
}

/** Critères de filtrage du tableau de tickets. `all` = pas de filtre. */
export interface TicketFilters {
  status: Ticket['status'] | 'all';
  urgency: Ticket['urgency_level'] | 'all';
  category: Ticket['category'] | 'all';
  search: string;
}

export const EMPTY_FILTERS: TicketFilters = {
  status: 'all',
  urgency: 'all',
  category: 'all',
  search: '',
};
