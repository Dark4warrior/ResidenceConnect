import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeOptions {
  /** Table PostgreSQL à écouter (schéma `public`). */
  table: string;
  /** Type d'événement à écouter. Par défaut tous (`*`). */
  event?: PostgresEvent;
  /** Rappelé à chaque changement reçu. */
  onChange: () => void;
  /** Permet de désactiver l'abonnement (ex. tant que l'utilisateur n'est pas prêt). */
  enabled?: boolean;
}

/**
 * Abonne le composant aux changements temps réel d'une table via Supabase
 * Realtime (WebSocket). Le rappel `onChange` est déclenché à chaque
 * INSERT/UPDATE/DELETE correspondant. Le canal est proprement fermé au
 * démontage ou quand `enabled` repasse à false.
 *
 * Le cloisonnement des données reste assuré par les politiques RLS : un
 * utilisateur ne reçoit en temps réel que les lignes qu'il a le droit de voir.
 */
export function useRealtime({
  table,
  event = '*',
  onChange,
  enabled = true,
}: UseRealtimeOptions): void {
  // Référence stable vers le dernier callback pour éviter de recréer le canal
  // à chaque rendu si le parent passe une fonction inline.
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    const channel: RealtimeChannel = supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table },
        () => {
          callbackRef.current();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, event, enabled]);
}
