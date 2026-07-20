import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTicketPhotos } from '../useTicketPhotos';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn(), storage: { from: vi.fn() } },
}));
const mockedFrom = supabase.from as unknown as ReturnType<typeof vi.fn>;
const mockedStorage = supabase.storage.from as unknown as ReturnType<typeof vi.fn>;

function photoQuery(result: { data: unknown; error: unknown }) {
  const order = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  mockedFrom.mockReturnValue({ select });
}

beforeEach(() => vi.clearAllMocks());

describe('useTicketPhotos (web)', () => {
  it('ne charge rien sans identifiant', async () => {
    const { result } = renderHook(() => useTicketPhotos(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.photos).toEqual([]);
  });

  it('résout une URL signée pour chaque photo', async () => {
    photoQuery({
      data: [{ id: 'ph1', storage_path: 't1/a.jpg', url: 'stored://a' }],
      error: null,
    });
    mockedStorage.mockReturnValue({
      createSignedUrl: vi
        .fn()
        .mockResolvedValue({ data: { signedUrl: 'https://signed/a' }, error: null }),
    });

    const { result } = renderHook(() => useTicketPhotos('t1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.photos).toEqual([{ id: 'ph1', url: 'https://signed/a' }]);
  });

  it('retombe sur l’URL stockée si la signature échoue', async () => {
    photoQuery({
      data: [{ id: 'ph1', storage_path: 't1/a.jpg', url: 'stored://a' }],
      error: null,
    });
    mockedStorage.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: { message: 'x' } }),
    });

    const { result } = renderHook(() => useTicketPhotos('t1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.photos[0].url).toBe('stored://a');
  });

  it('renvoie une liste vide en cas d’erreur de requête', async () => {
    photoQuery({ data: null, error: { message: 'RLS' } });
    const { result } = renderHook(() => useTicketPhotos('t1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.photos).toEqual([]);
  });
});
