import {
  TICKET_STATUS_LABELS,
  TICKET_CATEGORY_LABELS,
  URGENCY_LEVEL_LABELS,
} from '@residenceconnect/shared';
import type { TicketFilters } from '../types';
import { Select, type SelectOption } from './Select';

interface FilterBarProps {
  filters: TicketFilters;
  onChange: (filters: TicketFilters) => void;
  resultCount: number;
}

/** Construit les options d'un filtre avec une entrée « tout » en tête. */
function withAll<T extends string>(
  allLabel: string,
  labels: Record<string, string>
): SelectOption<T | 'all'>[] {
  return [
    { value: 'all', label: allLabel },
    ...Object.entries(labels).map(([value, label]) => ({
      value: value as T,
      label,
    })),
  ];
}

/** Barre de filtres du tableau de tickets (statut, urgence, catégorie, recherche). */
export function FilterBar({ filters, onChange, resultCount }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        aria-label="Rechercher un ticket"
        placeholder="Rechercher (titre, logement…)"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="min-w-56 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition-colors hover:border-brand focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />

      <Select
        ariaLabel="Filtrer par statut"
        value={filters.status}
        options={withAll<TicketFilters['status']>('Tous les statuts', TICKET_STATUS_LABELS)}
        onChange={(status) => onChange({ ...filters, status })}
      />

      <Select
        ariaLabel="Filtrer par urgence"
        value={filters.urgency}
        options={withAll<TicketFilters['urgency']>('Toutes urgences', URGENCY_LEVEL_LABELS)}
        onChange={(urgency) => onChange({ ...filters, urgency })}
      />

      <Select
        ariaLabel="Filtrer par catégorie"
        value={filters.category}
        options={withAll<TicketFilters['category']>('Toutes catégories', TICKET_CATEGORY_LABELS)}
        onChange={(category) => onChange({ ...filters, category })}
      />

      <span className="ml-auto text-sm text-slate-500">
        {resultCount} ticket{resultCount > 1 ? 's' : ''}
      </span>
    </div>
  );
}
