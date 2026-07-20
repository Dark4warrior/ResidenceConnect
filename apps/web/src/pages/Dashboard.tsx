import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TICKET_CATEGORY_LABELS,
} from '@residenceconnect/shared';
import { useTickets } from '../hooks/useTickets';
import { filterTickets, sortByUrgencyThenDate } from '../lib/filters';
import { ticketsToCsv, UTF8_BOM } from '../lib/csv';
import { formatDate } from '../lib/format';
import { EMPTY_FILTERS, type TicketFilters } from '../types';
import { FilterBar } from '../components/FilterBar';
import { StatusBadge, UrgencyBadge } from '../components/Badges';

/** Déclenche le téléchargement d'un contenu texte comme fichier. */
function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Page principale : liste filtrable des tickets + export CSV. */
export function Dashboard() {
  const { tickets, loading, error } = useTickets();
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);

  const visible = useMemo(
    () => sortByUrgencyThenDate(filterTickets(tickets, filters)),
    [tickets, filters]
  );

  const handleExport = () => {
    // Le BOM UTF-8 est indispensable pour qu'Excel affiche correctement les
    // accents ; sans lui le fichier est lu en ANSI.
    downloadTextFile(
      'tickets-residenceconnect.csv',
      UTF8_BOM + ticketsToCsv(visible),
      'text/csv;charset=utf-8;'
    );
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Signalements</h1>
        <button
          type="button"
          onClick={handleExport}
          disabled={visible.length === 0}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Exporter en CSV
        </button>
      </div>

      <div className="mb-4">
        <FilterBar filters={filters} onChange={setFilters} resultCount={visible.length} />
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Impossible de charger les tickets : {error}
        </p>
      ) : loading ? (
        <p className="text-sm text-slate-400">Chargement des tickets…</p>
      ) : visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          Aucun ticket à afficher.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Titre</th>
                <th className="px-4 py-3 font-semibold">Logement</th>
                <th className="px-4 py-3 font-semibold">Catégorie</th>
                <th className="px-4 py-3 font-semibold">Urgence</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/tickets/${t.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {t.apartment
                      ? `${t.apartment.residence?.name ?? '—'} · ${t.apartment.unit_number}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {TICKET_CATEGORY_LABELS[t.category]}
                  </td>
                  <td className="px-4 py-3">
                    <UrgencyBadge level={t.urgency_level} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(t.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
