import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTechnicians } from '../useTechnicians';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn() } }));
const mockedFrom = supabase.from as unknown as ReturnType<typeof vi.fn>;

/** Simule `from('profiles').select(...).eq(...).order(...)`. */
function chain(result: { data: unknown; error: unknown }) {
  const order = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  mockedFrom.mockReturnValue({ select });
  return { select, eq, order };
}

beforeEach(() => vi.clearAllMocks());

describe('useTechnicians', () => {
  it('ne liste que les profils au rôle technician, triés par nom', async () => {
    const c = chain({
      data: [{ id: 't1', full_name: 'Lucas', phone: null }],
      error: null,
    });
    const { result } = renderHook(() => useTechnicians());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(c.eq).toHaveBeenCalledWith('role', 'technician');
    expect(c.order).toHaveBeenCalledWith('full_name');
    expect(result.current.technicians).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('expose l’erreur et vide la liste en cas d’échec', async () => {
    chain({ data: null, error: { message: 'RLS' } });
    const { result } = renderHook(() => useTechnicians());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('RLS');
    expect(result.current.technicians).toEqual([]);
  });
});
