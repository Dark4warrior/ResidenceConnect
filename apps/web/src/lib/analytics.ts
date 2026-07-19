import type {
  TicketStatus,
  TicketCategory,
  UrgencyLevel,
} from '@residenceconnect/shared';
import type { TicketRow } from '../types';
import { hoursBetween } from './format';

export interface TicketKpis {
  /** Nombre total de tickets analysés. */
  total: number;
  /** Répartition par statut. */
  byStatus: Record<TicketStatus, number>;
  /** Répartition par catégorie. */
  byCategory: Record<TicketCategory, number>;
  /** Répartition par niveau d'urgence. */
  byUrgency: Record<UrgencyLevel, number>;
  /** Délai moyen de résolution en heures (tickets résolus), ou null. */
  avgResolutionHours: number | null;
  /** Taux de résolution en pourcentage (0–100). */
  resolutionRate: number;
  /** Catégorie la plus fréquente, ou null si aucun ticket. */
  topCategory: TicketCategory | null;
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
    {} as Record<K, number>
  );
}

/**
 * Calcule les indicateurs clés d'un ensemble de tickets.
 *
 * Le délai moyen de résolution n'inclut que les tickets réellement résolus
 * (statut `resolved` ET `resolved_at` renseigné et cohérent). Fonction pure.
 */
export function computeKpis(tickets: TicketRow[]): TicketKpis {
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
  const avgResolutionHours =
    resolutionCount > 0
      ? Math.round(resolutionSum / resolutionCount)
      : null;
  const resolutionRate =
    total > 0 ? Math.round((byStatus.resolved / total) * 100) : 0;

  let topCategory: TicketCategory | null = null;
  let topCount = -1;
  for (const c of CATEGORIES) {
    if (byCategory[c] > topCount) {
      topCount = byCategory[c];
      topCategory = c;
    }
  }
  if (total === 0) topCategory = null;

  return {
    total,
    byStatus,
    byCategory,
    byUrgency,
    avgResolutionHours,
    resolutionRate,
    topCategory,
  };
}
