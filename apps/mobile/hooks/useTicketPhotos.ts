import { useCallback, useEffect, useState } from 'react';
import type { TicketPhoto } from '@residenceconnect/shared';
import { supabase } from '../lib/supabase';
import { getTicketPhotoSignedUrl } from '../lib/photos';

export interface DisplayPhoto {
  id: string;
  uri: string;
}

/**
 * Charge les photos d'un ticket et résout une URL signée pour chacune.
 *
 * Le bucket `ticket-photos` est privé : chaque affichage passe par une URL
 * signée temporaire. En cas d'échec de signature, on retombe sur l'URL
 * stockée (potentiellement expirée) plutôt que de masquer la photo.
 *
 * La visibilité est déjà filtrée par le RLS : un utilisateur ne récupère que
 * les photos des tickets qu'il a le droit de consulter.
 */
export function useTicketPhotos(ticketId: string | undefined) {
  const [photos, setPhotos] = useState<DisplayPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPhotos = useCallback(async () => {
    if (!ticketId) {
      setPhotos([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('ticket_photos')
      .select('id, ticket_id, storage_path, url, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      setPhotos([]);
      setLoading(false);
      return;
    }

    const resolved: DisplayPhoto[] = [];
    for (const row of data as TicketPhoto[]) {
      try {
        resolved.push({ id: row.id, uri: await getTicketPhotoSignedUrl(row.storage_path) });
      } catch {
        resolved.push({ id: row.id, uri: row.url });
      }
    }
    setPhotos(resolved);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    void fetchPhotos();
  }, [fetchPhotos]);

  return { photos, loading, refetch: fetchPhotos };
}
