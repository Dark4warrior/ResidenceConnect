import {
  TICKET_STATUS_LABELS,
  TICKET_CATEGORY_LABELS,
  URGENCY_LEVEL_LABELS,
} from '@residenceconnect/shared';
import type { TicketFilters } from '../types';

interface FilterBarProps {
  filters: TicketFilters;
  onChange: (filters: TicketFilters) => void;
  resultCount: number;
}

const selectClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand';

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
        className={`${selectClass} min-w-56 flex-1`}
      />

      <select
        aria-label="Filtrer par statut"
        value={filters.status}
        onChange={(e) =>
          onChange({ ...filters, status: e.target.value as TicketFilters['status'] })
        }
        className={selectClass}
      >
        <option value="all">Tous les statuts</option>
        {Object.entries(TICKET_STATUS_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrer par urgence"
        value={filters.urgency}
        onChange={(e) =>
          onChange({ ...filters, urgency: e.target.value as TicketFilters['urgency'] })
        }
        className={selectClass}
      >
        <option value="all">Toutes urgences</option>
        {Object.entries(URGENCY_LEVEL_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrer par catégorie"
        value={filters.category}
        onChange={(e) =>
          onChange({ ...filters, category: e.target.value as TicketFilters['category'] })
        }
        className={selectClass}
      >
        <option value="all">Toutes catégories</option>
        {Object.entries(TICKET_CATEGORY_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>

      <span className="ml-auto text-sm text-slate-500">
        {resultCount} ticket{resultCount > 1 ? 's' : ''}
      </span>
    </div>
  );
}
