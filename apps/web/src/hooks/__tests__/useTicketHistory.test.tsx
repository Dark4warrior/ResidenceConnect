import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTicketHistory, formatHistoryTransition } from '../useTicketHistory';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn() } }));
const mockedFrom = supabase.from as unknown as ReturnType<typeof vi.fn>;

/** Simule `from('ticket_history').select(...).eq(...).order(...)`. */
function chain(result: { data: unknown; error: unknown }) {
  const order = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  mockedFrom.mockReturnValue({ select });
  return { order, eq };
}

beforeEach(() => vi.clearAllMocks());

describe('formatHistoryTransition', () => {
  it('formate une transition lisible', () => {
    const labels = {
      pending: 'En attente',
      in_progress: 'En cours',
      resolved: 'Résolu',
    };
    expect(formatHistoryTransition('pending', 'in_progress', labels)).toBe(
      'En attente → En cours'
    );
  });
});

describe('useTicketHistory', () => {
  it('ne charge rien sans identifiant de ticket', async () => {
    const { result } = renderHook(() => useTicketHistory(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedFrom).not.toHaveBeenCalled();
    expect(result.current.history).toEqual([]);
  });

  it('charge l’historique trié par date croissante', async () => {
    const c = chain({
      data: [
        {
          id: 'h1',
          ticket_id: 't1',
          changed_by: 'p1',
          old_status: 'pending',
          new_status: 'in_progress',
          comment: null,
          changed_at: '2026-07-01T08:00:00Z',
          author: { id: 'p1', full_name: 'Marc' },
        },
      ],
      error: null,
    });
    const { result } = renderHook(() => useTicketHistory('t1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(c.eq).toHaveBeenCalledWith('ticket_id', 't1');
    expect(c.order).toHaveBeenCalledWith('changed_at', { ascending: true });
    expect(result.current.history).toHaveLength(1);
  });

  it('expose l’erreur en cas d’échec', async () => {
    chain({ data: null, error: { message: 'boom' } });
    const { result } = renderHook(() => useTicketHistory('t1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('boom');
  });
});
