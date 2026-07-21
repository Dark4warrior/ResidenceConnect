import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const BUCKET = 'ticket-photos';

export interface DisplayPhoto {
  id: string;
  url: string;
}

/**
 * Charge les photos d'un ticket et en résout une URL signée (bucket privé).
 * La visibilité est filtrée par le RLS : le gestionnaire ne voit que les
 * photos des tickets de ses résidences.
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
    setLoading(true);

    const { data, error } = await supabase
      .from('ticket_photos')
      .select('id, storage_path, url')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      setPhotos([]);
      setLoading(false);
      return;
    }

    const resolved: DisplayPhoto[] = [];
    for (const row of data as { id: string; storage_path: string; url: string }[]) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, 3600);
      resolved.push({ id: row.id, url: signed?.signedUrl ?? row.url });
    }
    setPhotos(resolved);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    void fetchPhotos();
  }, [fetchPhotos]);

  return { photos, loading, refetch: fetchPhotos };
}
