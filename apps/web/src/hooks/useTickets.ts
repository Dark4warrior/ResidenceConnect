import { useEffect, useState, useCallback } from 'react';
import type { TicketStatus } from '@residenceconnect/shared';
import { supabase } from '../lib/supabase';
import type { TicketRow } from '../types';

const TICKET_SELECT =
  'id, apartment_id, reported_by, assigned_to, title, description, category, urgency_level, status, created_at, updated_at, resolved_at, ' +
  'apartment:apartments(id, unit_number, residence:residences(id, name)), ' +
  'reporter:profiles!tickets_reported_by_fkey(id, full_name), ' +
  'assignee:profiles!tickets_assigned_to_fkey(id, full_name)';

/**
 * Charge et gère les tickets visibles par le gestionnaire connecté.
 * Le cloisonnement est assuré par les politiques RLS : aucun filtrage de
 * sécurité n'est fait ici.
 */
export function useTickets() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setError(null);
    const { data, error: queryError } = await supabase
      .from('tickets')
      .select(TICKET_SELECT)
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setTickets([]);
    } else {
      setTickets((data as unknown as TicketRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  /**
   * Change le statut d'un ticket ET journalise le changement dans
   * `ticket_history`.
   *
   * L'audit est écrit ici, au plus près de la mutation, pour qu'aucune page ne
   * puisse modifier un statut sans laisser de trace. L'auteur provient de la
   * fonction SQL `current_profile_id()` (SECURITY DEFINER) : il ne peut pas
   * être falsifié côté client.
   *
   * @param comment commentaire facultatif joint à l'entrée d'audit.
   */
  const updateStatus = useCallback(
    async (ticketId: string, status: TicketStatus, comment?: string) => {
      const previous = tickets.find((t) => t.id === ticketId)?.status ?? null;

      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        })
        .eq('id', ticketId);

      if (updateError) return { error: updateError };

      if (previous !== null && previous !== status) {
        const { data: profileId, error: rpcError } = await supabase.rpc(
          'current_profile_id'
        );
        if (rpcError) return { error: rpcError };

        const { error: historyError } = await supabase
          .from('ticket_history')
          .insert({
            ticket_id: ticketId,
            changed_by: profileId as string,
            old_status: previous,
            new_status: status,
            comment: comment ?? null,
          });
        if (historyError) return { error: historyError };
      }

      await fetchTickets();
      return { error: null };
    },
    [tickets, fetchTickets]
  );

  /** Assigne (ou désassigne avec null) un technicien à un ticket. */
  const assignTechnician = useCallback(
    async (ticketId: string, technicianId: string | null) => {
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ assigned_to: technicianId })
        .eq('id', ticketId);

      if (!updateError) await fetchTickets();
      return { error: updateError };
    },
    [fetchTickets]
  );

  return {
    tickets,
    loading,
    error,
    refetch: fetchTickets,
    updateStatus,
    assignTechnician,
  };
}
