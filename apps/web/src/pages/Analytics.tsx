import { useMemo } from 'react';
import {
  TICKET_STATUS_LABELS,
  TICKET_CATEGORY_LABELS,
  type TicketCategory,
  type TicketStatus,
} from '@residenceconnect/shared';
import { useTickets } from '../hooks/useTickets';
import { computeKpis } from '../lib/analytics';
import { formatDuration } from '../lib/format';
import { StatCard } from '../components/StatCard';

/** Page d'analyse : indicateurs clés et répartitions. */
export function Analytics() {
  const { tickets, loading, error } = useTickets();
  const kpis = useMemo(() => computeKpis(tickets), [tickets]);

  if (loading) return <p className="text-sm text-slate-400">Chargement…</p>;
  if (error)
    return (
      <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
    );

  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Analytics</h1>

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
