import { useEffect, useState, useCallback } from 'react';
import type { TicketHistory, TicketStatus } from '@residenceconnect/shared';
import { supabase } from '../lib/supabase';

export interface TicketHistoryItem extends TicketHistory {
  author: { id: string; full_name: string } | null;
}

/**
 * Charge le journal d'audit d'un ticket (`ticket_history`), tri chronologique
 * croissant, avec le nom de l'auteur de chaque changement.
 */
export function useTicketHistory(ticketId: string | undefined) {
  const [history, setHistory] = useState<TicketHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!ticketId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setError(null);
    const { data, error: queryError } = await supabase
      .from('ticket_history')
      .select(
        'id, ticket_id, changed_by, old_status, new_status, comment, changed_at, author:profiles!ticket_history_changed_by_fkey(id, full_name)',
      )
      .eq('ticket_id', ticketId)
      .order('changed_at', { ascending: true });

    if (queryError) {
      setError(queryError.message);
      setHistory([]);
    } else {
      setHistory((data as unknown as TicketHistoryItem[]) ?? []);
    }
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    setLoading(true);
    void fetchHistory();
  }, [fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
}

/** Libellé court d'une transition de statut pour l'UI. */
export function formatHistoryTransition(
  oldStatus: TicketStatus,
  newStatus: TicketStatus,
  labels: Record<TicketStatus, string>,
): string {
  return `${labels[oldStatus]} → ${labels[newStatus]}`;
}
