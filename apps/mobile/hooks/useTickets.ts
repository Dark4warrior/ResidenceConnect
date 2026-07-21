import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Ticket,
  TicketCategory,
  TicketStatus,
  UrgencyLevel,
} from '@residenceconnect/shared';

export interface TicketListItem extends Ticket {
  apartment: {
    id: string;
    unit_number: string;
    residence: { id: string; name: string } | null;
  } | null;
}

export interface CreateTicketInput {
  apartment_id: string;
  reported_by: string;
  title: string;
  description: string;
  category: TicketCategory;
  urgency_level: UrgencyLevel;
}

/**
 * Récupère et gère les tickets visibles par l'utilisateur connecté.
 * Le filtrage par rôle est assuré par les politiques RLS de Supabase :
 * ce hook ne contient aucune logique de cloisonnement côté client.
 */
export function useTickets() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setError(null);
    const { data, error: queryError } = await supabase
      .from('tickets')
      .select(
        'id, apartment_id, reported_by, assigned_to, title, description, category, urgency_level, status, created_at, updated_at, resolved_at, apartment:apartments(id, unit_number, residence:residences(id, name))'
      )
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setTickets([]);
    } else {
      setTickets((data as unknown as TicketListItem[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const createTicket = useCallback(
    async (input: CreateTicketInput) => {
      const { data, error: insertError } = await supabase
        .from('tickets')
        .insert(input)
        .select('id')
        .single();

      if (!insertError) {
        await fetchTickets();
      }

      return { id: data?.id as string | undefined, error: insertError };
    },
    [fetchTickets]
  );

  /**
   * Change le statut d'un ticket ET journalise le changement dans
   * `ticket_history`.
   *
   * L'écriture de l'audit est faite ici, au plus près de la mutation, pour
   * qu'aucun écran ne puisse changer un statut sans laisser de trace. Le
   * `changed_by` provient de la fonction SQL `current_profile_id()`
   * (SECURITY DEFINER) : l'identité de l'auteur ne peut donc pas être
   * falsifiée depuis le client.
   *
   * Si le ticket passe à « resolved », `resolved_at` est horodaté ; il est
   * remis à null dans le cas contraire (réouverture).
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

      // Journal d'audit — le statut a réellement changé.
      if (previous !== null && previous !== status) {
        const { data: profileId, error: rpcError } = await supabase.rpc(
          'current_profile_id'
        );

        if (rpcError) {
          // Le ticket est modifié mais l'audit a échoué : on le signale
          // explicitement plutôt que de l'ignorer silencieusement.
          return { error: rpcError };
        }

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

  /** Assigne (ou retire avec `null`) un technicien à un ticket. */
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
    createTicket,
    updateStatus,
    assignTechnician,
  };
}
