import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { computeKpis, type TicketKpis } from '../lib/analytics';
import type { TicketCategory } from '@residenceconnect/shared';
import type { TicketRow } from '../types';

/** Une ligne de la répartition par catégorie renvoyée par la RPC SQL. */
export interface CategoryBreakdownRow {
  category: TicketCategory;
  total: number;
  resolved: number;
  avg_resolution_hours: number | null;
}

/** Origine des indicateurs : agrégation SQL, ou repli calculé côté client. */
export type AnalyticsSource = 'sql' | 'client';

interface AnalyticsResult {
  kpis: TicketKpis;
  breakdown: CategoryBreakdownRow[];
  source: AnalyticsSource;
  loading: boolean;
}

const CATEGORIES: TicketCategory[] = [
  'plumbing',
  'electricity',
  'elevator',
  'other',
];

/** Déduit la catégorie dominante d'une répartition (null si aucun ticket). */
function topCategory(
  byCategory: Record<TicketCategory, number>,
  total: number
): TicketCategory | null {
  if (total === 0) return null;
  return CATEGORIES.reduce((a, b) => (byCategory[b] > byCategory[a] ? b : a));
}

/**
 * Fournit les indicateurs analytiques.
 *
 * Stratégie : on interroge en priorité les **fonctions RPC PostgreSQL**
 * (`get_ticket_analytics`, `get_category_breakdown`), qui agrègent les données
 * côté serveur en respectant le RLS. Si ces fonctions ne sont pas encore
 * déployées (migration 006 non appliquée) ou échouent, on **retombe** sur le
 * calcul côté client à partir de la liste `tickets` déjà chargée : l'écran
 * reste fonctionnel dans tous les cas.
 *
 * @param tickets liste servant de repli au calcul client.
 */
export function useAnalytics(tickets: TicketRow[]): AnalyticsResult {
  const [state, setState] = useState<AnalyticsResult>({
    kpis: computeKpis([]),
    breakdown: [],
    source: 'client',
    loading: true,
  });

  const clientFallback = useCallback((): AnalyticsResult => {
    const kpis = computeKpis(tickets);
    const breakdown: CategoryBreakdownRow[] = CATEGORIES.map((c) => ({
      category: c,
      total: kpis.byCategory[c],
      resolved: 0,
      avg_resolution_hours: null,
    }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
    return { kpis, breakdown, source: 'client', loading: false };
  }, [tickets]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [analyticsRes, breakdownRes] = await Promise.all([
        supabase.rpc('get_ticket_analytics'),
        supabase.rpc('get_category_breakdown'),
      ]);

      if (!active) return;

      // RPC indisponible (fonction absente) → repli client.
      if (analyticsRes.error || !analyticsRes.data) {
        setState(clientFallback());
        return;
      }

      const raw = analyticsRes.data as Omit<TicketKpis, 'topCategory'>;
      const kpis: TicketKpis = {
        ...raw,
        topCategory: topCategory(raw.byCategory, raw.total),
      };
      const breakdown = (breakdownRes.data as CategoryBreakdownRow[] | null) ?? [];

      setState({ kpis, breakdown, source: 'sql', loading: false });
    };

    void load();
    return () => {
      active = false;
    };
  }, [clientFallback]);

  return state;
}
