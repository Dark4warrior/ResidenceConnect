import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  useTicketHistory,
  formatHistoryTransition,
} from '../../hooks/useTicketHistory';
import { supabase } from '../../lib/supabase';
import { TICKET_STATUS_LABELS } from '@residenceconnect/shared';

jest.mock('../../lib/supabase');

const mockedFrom = supabase.from as jest.Mock;

function mockHistoryChain(result: { data: unknown; error: unknown }) {
  const order = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ eq });
  mockedFrom.mockReturnValue({ select });
  return { select, eq, order };
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('formatHistoryTransition', () => {
  it('compose les libellés de statut', () => {
    expect(
      formatHistoryTransition('pending', 'in_progress', TICKET_STATUS_LABELS),
    ).toBe('En attente → En cours');
  });
});

describe('useTicketHistory', () => {
  it('ne charge rien si ticketId est absent', async () => {
    const { result } = renderHook(() => useTicketHistory(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.history).toEqual([]);
    expect(mockedFrom).not.toHaveBeenCalled();
  });

  it('charge l’historique trié chronologiquement', async () => {
    const rows = [
      {
        id: 'h1',
        ticket_id: 'tk1',
        changed_by: 'p1',
        old_status: 'pending',
        new_status: 'in_progress',
        comment: 'Prise en charge',
        changed_at: '2026-07-01T10:00:00Z',
        author: { id: 'p1', full_name: 'Manager' },
      },
    ];
    const chain = mockHistoryChain({ data: rows, error: null });

    const { result } = renderHook(() => useTicketHistory('tk1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.history).toHaveLength(1);
    expect(chain.eq).toHaveBeenCalledWith('ticket_id', 'tk1');
    expect(chain.order).toHaveBeenCalledWith('changed_at', { ascending: true });
  });

  it('expose l’erreur en cas d’échec', async () => {
    mockHistoryChain({ data: null, error: { message: 'échec' } });
    const { result } = renderHook(() => useTicketHistory('tk1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('échec');
    expect(result.current.history).toEqual([]);
  });

  it('refetch recharge l’historique', async () => {
    mockHistoryChain({ data: [], error: null });
    const { result } = renderHook(() => useTicketHistory('tk1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockHistoryChain({
      data: [
        {
          id: 'h2',
          ticket_id: 'tk1',
          changed_by: 'p1',
          old_status: 'in_progress',
          new_status: 'resolved',
          comment: null,
          changed_at: '2026-07-02T10:00:00Z',
          author: null,
        },
      ],
      error: null,
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.history).toHaveLength(1);
  });
});
