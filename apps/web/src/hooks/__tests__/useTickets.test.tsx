import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTickets } from '../useTickets';
import { supabase } from '../../lib/supabase';
import { makeTicket } from '../../test/fixtures';

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));
const mockedFrom = supabase.from as unknown as ReturnType<typeof vi.fn>;
const mockedRpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

/** `from('tickets').select(...).order(...)` du chargement. */
function selectChain(data: unknown, error: unknown = null) {
  const order = vi.fn().mockResolvedValue({ data, error });
  return { select: vi.fn().mockReturnValue({ order }) };
}

/** `from('tickets').update(...).eq(...)`. */
function updateChain(error: unknown) {
  const eq = vi.fn().mockResolvedValue({ error });
  const update = vi.fn().mockReturnValue({ eq });
  return { update, eq };
}

beforeEach(() => vi.clearAllMocks());

describe('useTickets (web)', () => {
  it('charge les tickets triés par date décroissante', async () => {
    mockedFrom.mockReturnValueOnce(selectChain([makeTicket({ title: 'A' })]));
    const { result } = renderHook(() => useTickets());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tickets).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('expose l’erreur de chargement', async () => {
    mockedFrom.mockReturnValueOnce(selectChain(null, { message: 'RLS' }));
    const { result } = renderHook(() => useTickets());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('RLS');
    expect(result.current.tickets).toEqual([]);
  });

  it('journalise l’audit lors d’un changement de statut', async () => {
    mockedFrom.mockReturnValueOnce(selectChain([makeTicket({ id: 't1', status: 'pending' })]));
    const { result } = renderHook(() => useTickets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const upd = updateChain(null);
    const historyInsert = vi.fn().mockResolvedValue({ error: null });
    mockedRpc.mockResolvedValue({ data: 'profile-1', error: null });
    mockedFrom
      .mockReturnValueOnce(upd)
      .mockReturnValueOnce({ insert: historyInsert })
      .mockReturnValueOnce(selectChain([makeTicket({ id: 't1', status: 'in_progress' })]));

    await act(async () => {
      await result.current.updateStatus('t1', 'in_progress');
    });

    expect(mockedRpc).toHaveBeenCalledWith('current_profile_id');
    expect(historyInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket_id: 't1',
        changed_by: 'profile-1',
        old_status: 'pending',
        new_status: 'in_progress',
      })
    );
  });

  it('n’insère pas d’audit si la mise à jour échoue', async () => {
    mockedFrom.mockReturnValueOnce(selectChain([makeTicket({ id: 't1', status: 'pending' })]));
    const { result } = renderHook(() => useTickets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedFrom.mockReturnValueOnce(updateChain({ message: 'refusé' }));
    let res: { error: unknown } | undefined;
    await act(async () => {
      res = await result.current.updateStatus('t1', 'resolved');
    });

    expect(res?.error).toEqual({ message: 'refusé' });
    expect(mockedRpc).not.toHaveBeenCalled();
  });
});
