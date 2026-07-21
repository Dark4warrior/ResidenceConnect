import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TICKET_CATEGORY_LABELS } from '@residenceconnect/shared';
import { useTickets } from '../hooks/useTickets';
import { filterTickets, sortByUrgencyThenDate } from '../lib/filters';
import { ticketsToCsv, UTF8_BOM } from '../lib/csv';
import { formatDate } from '../lib/format';
import { EMPTY_FILTERS, type TicketFilters, type TicketRow } from '../types';
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

type Assignment = 'all' | 'unassigned' | 'assigned';

/** Page principale : liste filtrable des tickets + export CSV. */
export function Dashboard() {
  const { tickets, loading, error } = useTickets();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);
  const [assignment, setAssignment] = useState<Assignment>('all');

  // Un signalement résolu n'attend plus d'attribution : il ne compte pas
  // comme « non attribué ».
  const isUnassigned = (t: TicketRow) => !t.assigned_to && t.status !== 'resolved';

  const counts = useMemo(
    () => ({
      all: tickets.length,
      unassigned: tickets.filter(isUnassigned).length,
      assigned: tickets.filter((t) => !isUnassigned(t)).length,
    }),
    [tickets]
  );

  const visible = useMemo(() => {
    const byAssignment = tickets.filter((t) => {
      if (assignment === 'unassigned') return isUnassigned(t);
      if (assignment === 'assigned') return !isUnassigned(t);
      return true;
    });
    return sortByUrgencyThenDate(filterTickets(byAssignment, filters));
  }, [tickets, filters, assignment]);

  const handleExport = () => {
    // Le BOM UTF-8 est indispensable pour qu'Excel affiche correctement les
    // accents ; sans lui le fichier est lu en ANSI.
    downloadTextFile(
      'tickets-residenceconnect.csv',
      UTF8_BOM + ticketsToCsv(visible),
      'text/csv;charset=utf-8;'
    );
  };

  const tabs: { key: Assignment; label: string; count: number }[] = [
    { key: 'all', label: 'Tous', count: counts.all },
    { key: 'unassigned', label: 'Non attribués', count: counts.unassigned },
    { key: 'assigned', label: 'Attribués', count: counts.assigned },
  ];

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Signalements</h1>
        <button
          type="button"
          onClick={handleExport}
          disabled={visible.length === 0}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
        >
          Exporter en CSV
        </button>
      </div>

      {/* Distinction attribués / non attribués */}
      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
        {tabs.map((tab) => {
          const active = assignment === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setAssignment(tab.key)}
              className={[
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              {tab.label}
              <span
                className={[
                  'rounded-full px-1.5 text-xs font-semibold',
                  active ? 'bg-brand text-white' : 'bg-slate-200 text-slate-600',
                ].join(' ')}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-3">
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
        <>
          <p className="mb-2 text-xs text-slate-400">
            Cliquez sur une ligne pour ouvrir le détail et attribuer un technicien.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Titre</th>
                  <th className="px-4 py-3 font-semibold">Logement</th>
                  <th className="px-4 py-3 font-semibold">Urgence</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">Assigné à</th>
                  <th className="px-4 py-3 font-semibold">Créé le</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    className="cursor-pointer transition-colors hover:bg-brand-light/40"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-brand">{t.title}</span>
                      <span className="block text-xs text-slate-400">
                        {TICKET_CATEGORY_LABELS[t.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {t.apartment
                        ? `${t.apartment.residence?.name ?? '—'} · ${t.apartment.unit_number}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <UrgencyBadge level={t.urgency_level} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3">
                      {t.assignee ? (
                        <span className="text-slate-700">{t.assignee.full_name}</span>
                      ) : t.status === 'resolved' ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                          Non assigné
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(t.created_at)}</td>
                    <td className="px-4 py-3 text-right text-slate-300" aria-hidden="true">
                      ›
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
