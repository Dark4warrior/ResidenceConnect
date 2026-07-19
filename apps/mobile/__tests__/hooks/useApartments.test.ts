import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useApartments } from '../../hooks/useApartments';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');

const mockedFrom = supabase.from as jest.Mock;

/** Simule `from('apartments').select(...).order('unit_number')`. */
function mockApartmentsChain(result: { data: unknown; error: unknown }) {
  const order = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ order });
  mockedFrom.mockReturnValue({ select });
  return { select, order };
}

const rows = [
  { id: 'a1', unit_number: 'A01', floor: '0', residence: { id: 'r1', name: 'Les Tilleuls' } },
  { id: 'a2', unit_number: 'B12', floor: '3', residence: null },
];

afterEach(() => {
  jest.clearAllMocks();
});

describe('useApartments', () => {
  it('charge les logements et ordonne par numéro', async () => {
    const chain = mockApartmentsChain({ data: rows, error: null });

    const { result } = renderHook(() => useApartments());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.apartments).toHaveLength(2);
    expect(chain.order).toHaveBeenCalledWith('unit_number');
  });

  it('en cas d’erreur : liste vide et avertissement journalisé', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockApartmentsChain({ data: null, error: { message: 'RLS' } });

    const { result } = renderHook(() => useApartments());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.apartments).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      '[useApartments] erreur de chargement :',
      'RLS'
    );
    warn.mockRestore();
  });

  it('refetch relance une requête', async () => {
    mockApartmentsChain({ data: rows, error: null });

    const { result } = renderHook(() => useApartments());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const callsBefore = mockedFrom.mock.calls.length;
    await act(async () => {
      await result.current.refetch();
    });
    expect(mockedFrom.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
