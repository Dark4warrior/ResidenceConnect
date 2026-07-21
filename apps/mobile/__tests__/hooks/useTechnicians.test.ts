import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useTechnicians } from '../../hooks/useTechnicians';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');

const mockedFrom = supabase.from as jest.Mock;

function mockChain(result: { data: unknown; error: unknown }) {
  const order = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ eq });
  mockedFrom.mockReturnValue({ select });
  return { select, eq, order };
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('useTechnicians', () => {
  it('charge les techniciens ordonnés par nom', async () => {
    const chain = mockChain({
      data: [
        { id: 't1', full_name: 'Alice Tech', phone: null },
        { id: 't2', full_name: 'Bob Tech', phone: '0600000000' },
      ],
      error: null,
    });

    const { result } = renderHook(() => useTechnicians());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.technicians).toHaveLength(2);
    expect(chain.eq).toHaveBeenCalledWith('role', 'technician');
    expect(chain.order).toHaveBeenCalledWith('full_name');
    expect(result.current.error).toBeNull();
  });

  it('expose l’erreur et une liste vide en cas d’échec', async () => {
    mockChain({ data: null, error: { message: 'RLS denied' } });

    const { result } = renderHook(() => useTechnicians());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.technicians).toEqual([]);
    expect(result.current.error).toBe('RLS denied');
  });

  it('refetch recharge la liste', async () => {
    mockChain({ data: [], error: null });
    const { result } = renderHook(() => useTechnicians());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockChain({
      data: [{ id: 't1', full_name: 'Claire', phone: null }],
      error: null,
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.technicians).toHaveLength(1);
  });
});
