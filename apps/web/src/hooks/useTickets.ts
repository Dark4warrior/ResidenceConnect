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
   * Change le statut d'un ticket. Renseigne `resolved_at` quand le ticket
   * passe à « résolu » et le remet à null sinon.
   */
  const updateStatus = useCallback(
    async (ticketId: string, status: TicketStatus) => {
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        })
        .eq('id', ticketId);

      if (!updateError) await fetchTickets();
      return { error: updateError };
    },
    [fetchTickets]
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
