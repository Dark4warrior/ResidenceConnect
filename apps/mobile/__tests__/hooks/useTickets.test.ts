import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useTickets, type CreateTicketInput } from '../../hooks/useTickets';
import { supabase } from '../../lib/supabase';

// Le client Supabase est entièrement simulé : les tests portent sur la
// logique du hook (états, tri, gestion d'erreur, rechargement), pas sur
// le réseau ni sur les politiques RLS (testées côté base de données).
jest.mock('../../lib/supabase');

/**
 * Construit un mock de la chaîne `supabase.from(...).select(...).order(...)`.
 * `order` est le maillon terminal : il résout la promesse avec `result`.
 */
function mockSelectChain(result: { data: unknown; error: unknown }) {
  const order = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ order });
  return { from: jest.fn().mockReturnValue({ select }), select, order };
}

const sampleRows = [
  {
    id: 't1',
    apartment_id: 'a1',
    reported_by: 'p1',
    assigned_to: null,
    title: 'Fuite sous l’évier',
    description: 'Eau au sol',
    category: 'plumbing',
    urgency_level: 'high',
    status: 'pending',
    created_at: '2026-07-10T08:00:00Z',
    updated_at: '2026-07-10T08:00:00Z',
    resolved_at: null,
    apartment: {
      id: 'a1',
      unit_number: 'B12',
      residence: { id: 'r1', name: 'Les Tilleuls' },
    },
  },
];

const mockedFrom = supabase.from as jest.Mock;

afterEach(() => {
  jest.clearAllMocks();
});

describe('useTickets', () => {
  it('démarre en chargement puis expose les tickets récupérés', async () => {
    const chain = mockSelectChain({ data: sampleRows, error: null });
    mockedFrom.mockImplementation(chain.from);

    const { result } = renderHook(() => useTickets());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tickets).toHaveLength(1);
    expect(result.current.tickets[0].title).toBe('Fuite sous l’évier');
    expect(result.current.error).toBeNull();
  });

  it('trie les tickets par date de création décroissante', async () => {
    const chain = mockSelectChain({ data: sampleRows, error: null });
    mockedFrom.mockImplementation(chain.from);

    renderHook(() => useTickets());

    await waitFor(() => expect(chain.order).toHaveBeenCalled());
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('expose le message d’erreur et vide la liste en cas d’échec', async () => {
    const chain = mockSelectChain({
      data: null,
      error: { message: 'permission denied' },
    });
    mockedFrom.mockImplementation(chain.from);

    const { result } = renderHook(() => useTickets());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('permission denied');
    expect(result.current.tickets).toEqual([]);
  });

  it('renvoie une liste vide (pas d’erreur) quand data est null', async () => {
    const chain = mockSelectChain({ data: null, error: null });
    mockedFrom.mockImplementation(chain.from);

    const { result } = renderHook(() => useTickets());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tickets).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  describe('createTicket', () => {
    const input: CreateTicketInput = {
      apartment_id: 'a1',
      reported_by: 'p1',
      title: 'Ampoule grillée',
      description: 'Palier 3e étage',
      category: 'electricity',
      urgency_level: 'low',
    };

    it('insère le ticket et recharge la liste en cas de succès', async () => {
      // 1er from : select initial ; 2e : insert ; 3e : refetch
      const initialSelect = mockSelectChain({ data: [], error: null });
      const single = jest.fn().mockResolvedValue({ data: { id: 't2' }, error: null });
      const insertSelect = jest.fn().mockReturnValue({ single });
      const insert = jest.fn().mockReturnValue({ select: insertSelect });
      const refetch = mockSelectChain({ data: sampleRows, error: null });

      mockedFrom
        .mockReturnValueOnce({ select: initialSelect.select })
        .mockReturnValueOnce({ insert })
        .mockReturnValueOnce({ select: refetch.select });

      const { result } = renderHook(() => useTickets());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let created: { id: string | undefined; error: unknown } | undefined;
      await act(async () => {
        created = await result.current.createTicket(input);
      });

      expect(insert).toHaveBeenCalledWith(input);
      expect(created?.id).toBe('t2');
      expect(created?.error).toBeNull();
      await waitFor(() => expect(result.current.tickets).toHaveLength(1));
    });

    it('ne recharge pas et remonte l’erreur en cas d’échec d’insertion', async () => {
      const initialSelect = mockSelectChain({ data: [], error: null });
      const insertError = { message: 'insert failed' };
      const single = jest.fn().mockResolvedValue({ data: null, error: insertError });
      const insert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ single }),
      });

      mockedFrom
        .mockReturnValueOnce({ select: initialSelect.select })
        .mockReturnValueOnce({ insert });

      const { result } = renderHook(() => useTickets());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let created: { id: string | undefined; error: unknown } | undefined;
      await act(async () => {
        created = await result.current.createTicket(input);
      });

      expect(created?.id).toBeUndefined();
      expect(created?.error).toBe(insertError);
      // Un seul `from('tickets')` supplémentaire (insert), pas de refetch.
      expect(mockedFrom).toHaveBeenCalledTimes(2);
    });
  });
});
