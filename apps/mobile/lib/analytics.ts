/**
 * Indicateurs analytiques calculés côté mobile (espace gestionnaire).
 * Fonction pure, sans dépendance React / Supabase.
 */

import type {
  TicketStatus,
  TicketCategory,
  UrgencyLevel,
} from '@residenceconnect/shared';

/** Sous-ensemble de champs nécessaires au calcul des KPIs. */
export interface AnalyticsTicket {
  status: TicketStatus;
  category: TicketCategory;
  urgency_level: UrgencyLevel;
  created_at: string;
  resolved_at: string | null;
}

export interface TicketKpis {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byCategory: Record<TicketCategory, number>;
  byUrgency: Record<UrgencyLevel, number>;
  /** Délai moyen de résolution en heures, ou null si aucun ticket résolu valide. */
  avgResolutionHours: number | null;
  /** Taux de résolution en pourcentage (0–100). */
  resolutionRate: number;
}

const STATUSES: TicketStatus[] = ['pending', 'in_progress', 'resolved'];
const CATEGORIES: TicketCategory[] = [
  'plumbing',
  'electricity',
  'elevator',
  'other',
];
const URGENCIES: UrgencyLevel[] = ['low', 'medium', 'high', 'critical'];

function zero<K extends string>(keys: K[]): Record<K, number> {
  return keys.reduce(
    (acc, k) => {
      acc[k] = 0;
      return acc;
    },
    {} as Record<K, number>,
  );
}

/** Durée en heures arrondie entre deux ISO ; null si incohérent. */
function hoursBetween(startIso: string, endIso: string | null): number | null {
  if (!endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / (1000 * 60 * 60));
}

/**
 * Calcule les KPI d'un ensemble de tickets.
 * Le délai moyen n'inclut que les tickets `resolved` avec `resolved_at` valide.
 */
export function computeKpis(tickets: AnalyticsTicket[]): TicketKpis {
  const byStatus = zero(STATUSES);
  const byCategory = zero(CATEGORIES);
  const byUrgency = zero(URGENCIES);

  let resolutionSum = 0;
  let resolutionCount = 0;

  for (const t of tickets) {
    byStatus[t.status] += 1;
    byCategory[t.category] += 1;
    byUrgency[t.urgency_level] += 1;

    if (t.status === 'resolved') {
      const delay = hoursBetween(t.created_at, t.resolved_at);
      if (delay !== null) {
        resolutionSum += delay;
        resolutionCount += 1;
      }
    }
  }

  const total = tickets.length;
  return {
    total,
    byStatus,
    byCategory,
    byUrgency,
    avgResolutionHours:
      resolutionCount > 0 ? Math.round(resolutionSum / resolutionCount) : null,
    resolutionRate: total > 0 ? Math.round((byStatus.resolved / total) * 100) : 0,
  };
}

/** Formate une durée en heures (« — », « 5 h », « 2 j 3 h »). */
export function formatDuration(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest === 0 ? `${days} j` : `${days} j ${rest} h`;
}
