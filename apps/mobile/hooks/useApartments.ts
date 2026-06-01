import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ApartmentItem {
  id: string;
  unit_number: string;
  floor: string | null;
  residence: { id: string; name: string } | null;
}

/**
 * Récupère les logements visibles par l'utilisateur connecté.
 * Pour un locataire, le RLS ne renvoie que son ou ses logements.
 */
export function useApartments() {
  const [apartments, setApartments] = useState<ApartmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApartments = useCallback(async () => {
    const { data } = await supabase
      .from('apartments')
      .select('id, unit_number, floor, residence:residences(id, name)')
      .order('unit_number');

    setApartments((data as unknown as ApartmentItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchApartments();
  }, [fetchApartments]);

  return { apartments, loading, refetch: fetchApartments };
}
