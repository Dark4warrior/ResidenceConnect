import {
  TICKET_STATUS_LABELS,
  TICKET_CATEGORY_LABELS,
  type TicketCategory,
  type TicketStatus,
} from '@residenceconnect/shared';
import { useTickets } from '../hooks/useTickets';
import { useAnalytics } from '../hooks/useAnalytics';
import { formatDuration } from '../lib/format';
import { StatCard } from '../components/StatCard';

/** Page d'analyse : indicateurs clés et répartitions. */
export function Analytics() {
  const { tickets, loading, error } = useTickets();
  const { kpis, breakdown, source } = useAnalytics(tickets);

  if (loading) return <p className="text-sm text-slate-400">Chargement…</p>;
  if (error)
    return (
      <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
    );

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <span
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500"
          title={
            source === 'sql'
              ? 'Indicateurs agrégés par une fonction PostgreSQL (RPC)'
              : 'Indicateurs calculés côté client (fonction RPC non déployée)'
          }
        >
          {source === 'sql' ? 'Agrégation SQL' : 'Calcul client'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tickets au total" value={kpis.total} />
        <StatCard label="Taux de résolution" value={`${kpis.resolutionRate} %`} />
        <StatCard
          label="Délai moyen de résolution"
          value={formatDuration(kpis.avgResolutionHours)}
          hint="Sur les tickets résolus"
        />
        <StatCard
          label="Catégorie la plus fréquente"
          value={kpis.topCategory ? TICKET_CATEGORY_LABELS[kpis.topCategory] : '—'}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Distribution
          title="Répartition par statut"
          entries={(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((k) => ({
            label: TICKET_STATUS_LABELS[k],
            count: kpis.byStatus[k],
          }))}
          total={kpis.total}
        />
        <Distribution
          title="Répartition par catégorie"
          entries={(Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[]).map((k) => ({
            label: TICKET_CATEGORY_LABELS[k],
            count: kpis.byCategory[k],
          }))}
          total={kpis.total}
        />
      </div>

      {source === 'sql' && breakdown.length > 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-700">
            Récurrence et délai par catégorie
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="pb-2 font-semibold">Catégorie</th>
                  <th className="pb-2 text-right font-semibold">Signalements</th>
                  <th className="pb-2 text-right font-semibold">Résolus</th>
                  <th className="pb-2 text-right font-semibold">Délai moyen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {breakdown.map((row) => (
                  <tr key={row.category}>
                    <td className="py-2 text-slate-700">
                      {TICKET_CATEGORY_LABELS[row.category]}
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-700">
                      {row.total}
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-500">
                      {row.resolved}
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-500">
                      {formatDuration(
                        row.avg_resolution_hours === null
                          ? null
                          : Math.round(row.avg_resolution_hours)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

interface DistributionProps {
  title: string;
  entries: { label: string; count: number }[];
  total: number;
}

function Distribution({ title, entries, total }: DistributionProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <ul className="mt-4 space-y-3">
        {entries.map((e) => {
          const pct = total > 0 ? Math.round((e.count / total) * 100) : 0;
          return (
            <li key={e.label}>
              <div className="flex justify-between text-sm text-slate-600">
                <span>{e.label}</span>
                <span className="tabular-nums">
                  {e.count} · {pct} %
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-brand"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
