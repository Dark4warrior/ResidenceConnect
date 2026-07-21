import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useTickets } from '../../hooks/useTickets';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');

const mockedFrom = supabase.from as jest.Mock;
const mockedRpc = supabase.rpc as jest.Mock;

const ticketRow = {
  id: 't1',
  apartment_id: 'a1',
  reported_by: 'p1',
  assigned_to: null,
  title: 'Fuite',
  description: 'Eau au sol',
  category: 'plumbing',
  urgency_level: 'high',
  status: 'pending',
  created_at: '2026-07-10T08:00:00Z',
  updated_at: '2026-07-10T08:00:00Z',
  resolved_at: null,
  apartment: null,
};

/** Chaîne `from('tickets').select(...).order(...)` pour le chargement. */
function selectChain(data: unknown) {
  const order = jest.fn().mockResolvedValue({ data, error: null });
  return { select: jest.fn().mockReturnValue({ order }) };
}

/** Chaîne `from('tickets').update(...).eq(...)`. */
function updateChain(error: unknown) {
  const eq = jest.fn().mockResolvedValue({ error });
  return { update: jest.fn().mockReturnValue({ eq }), eq };
}

afterEach(() => jest.clearAllMocks());

describe('useTickets — journal d’audit', () => {
  async function mountWithTicket() {
    mockedFrom.mockReturnValueOnce(selectChain([ticketRow]));
    const { result } = renderHook(() => useTickets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    return result;
  }

  it('écrit une entrée d’audit quand le statut change réellement', async () => {
    const result = await mountWithTicket();

    const upd = updateChain(null);
    const historyInsert = jest.fn().mockResolvedValue({ error: null });
    mockedRpc.mockResolvedValue({ data: 'profile-42', error: null });

    mockedFrom
      .mockReturnValueOnce(upd) // update tickets
      .mockReturnValueOnce({ insert: historyInsert }) // insert ticket_history
      .mockReturnValueOnce(selectChain([ticketRow])); // refetch

    await act(async () => {
      await result.current.updateStatus('t1', 'in_progress', 'Pris en charge');
    });

    expect(mockedRpc).toHaveBeenCalledWith('current_profile_id');
    expect(historyInsert).toHaveBeenCalledWith({
      ticket_id: 't1',
      changed_by: 'profile-42',
      old_status: 'pending',
      new_status: 'in_progress',
      comment: 'Pris en charge',
    });
  });

  it('horodate resolved_at quand le ticket passe à résolu', async () => {
    const result = await mountWithTicket();

    const upd = updateChain(null);
    mockedRpc.mockResolvedValue({ data: 'profile-42', error: null });
    mockedFrom
      .mockReturnValueOnce(upd)
      .mockReturnValueOnce({ insert: jest.fn().mockResolvedValue({ error: null }) })
      .mockReturnValueOnce(selectChain([ticketRow]));

    await act(async () => {
      await result.current.updateStatus('t1', 'resolved');
    });

    const payload = upd.update.mock.calls[0][0] as { resolved_at: string | null };
    expect(payload.resolved_at).not.toBeNull();
  });

  it('n’écrit aucun audit si le statut est identique', async () => {
    const result = await mountWithTicket();

    const upd = updateChain(null);
    mockedFrom
      .mockReturnValueOnce(upd)
      .mockReturnValueOnce(selectChain([ticketRow]));

    await act(async () => {
      await result.current.updateStatus('t1', 'pending');
    });

    expect(mockedRpc).not.toHaveBeenCalled();
  });

  it('remonte l’erreur si la mise à jour échoue et n’écrit pas d’audit', async () => {
    const result = await mountWithTicket();

    const failure = { message: 'refusé par RLS' };
    mockedFrom.mockReturnValueOnce(updateChain(failure));

    let res: { error: unknown } | undefined;
    await act(async () => {
      res = await result.current.updateStatus('t1', 'resolved');
    });

    expect(res?.error).toBe(failure);
    expect(mockedRpc).not.toHaveBeenCalled();
  });

  it('signale explicitement un échec d’écriture de l’audit', async () => {
    const result = await mountWithTicket();

    const historyFailure = { message: 'audit refusé' };
    mockedRpc.mockResolvedValue({ data: 'profile-42', error: null });
    mockedFrom
      .mockReturnValueOnce(updateChain(null))
      .mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: historyFailure }),
      });

    let res: { error: unknown } | undefined;
    await act(async () => {
      res = await result.current.updateStatus('t1', 'resolved');
    });

    // L'échec d'audit n'est pas avalé silencieusement.
    expect(res?.error).toBe(historyFailure);
  });
});

describe('useTickets — assignation', () => {
  it('assigne un technicien puis recharge la liste', async () => {
    mockedFrom.mockReturnValueOnce(selectChain([ticketRow]));
    const { result } = renderHook(() => useTickets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const upd = updateChain(null);
    mockedFrom
      .mockReturnValueOnce(upd)
      .mockReturnValueOnce(selectChain([ticketRow]));

    await act(async () => {
      await result.current.assignTechnician('t1', 'tech-9');
    });

    expect(upd.update).toHaveBeenCalledWith({ assigned_to: 'tech-9' });
  });
});
