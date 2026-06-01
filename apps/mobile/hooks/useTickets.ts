import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Ticket,
  TicketCategory,
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

  return { tickets, loading, error, refetch: fetchTickets, createTicket };
}
