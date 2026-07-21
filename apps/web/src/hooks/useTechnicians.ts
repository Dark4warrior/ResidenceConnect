import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface TechnicianProfile {
  id: string;
  full_name: string;
  phone: string | null;
}

/**
 * Liste les profils au rôle `technician` pour l'assignation web.
 */
export function useTechnicians() {
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTechnicians = useCallback(async () => {
    setError(null);
    const { data, error: queryError } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('role', 'technician')
      .order('full_name');

    if (queryError) {
      setError(queryError.message);
      setTechnicians([]);
    } else {
      setTechnicians((data as TechnicianProfile[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTechnicians();
  }, [fetchTechnicians]);

  return { technicians, loading, error, refetch: fetchTechnicians };
}
