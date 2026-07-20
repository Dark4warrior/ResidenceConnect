import { renderHook, waitFor } from '@testing-library/react-native';
import { useTicketPhotos } from '../../hooks/useTicketPhotos';
import { supabase } from '../../lib/supabase';
import { getTicketPhotoSignedUrl } from '../../lib/photos';

jest.mock('../../lib/supabase');
jest.mock('../../lib/photos', () => ({
  getTicketPhotoSignedUrl: jest.fn(),
}));

const mockedFrom = supabase.from as jest.Mock;
const mockedSign = getTicketPhotoSignedUrl as jest.Mock;

/** Simule `from('ticket_photos').select(...).eq(...).order(...)`. */
function photoQuery(result: { data: unknown; error: unknown }) {
  const order = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ eq });
  mockedFrom.mockReturnValue({ select });
}

afterEach(() => jest.clearAllMocks());

describe('useTicketPhotos (mobile)', () => {
  it('ne charge rien sans identifiant', async () => {
    const { result } = renderHook(() => useTicketPhotos(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.photos).toEqual([]);
    expect(mockedFrom).not.toHaveBeenCalled();
  });

  it('résout une URL signée par photo', async () => {
    photoQuery({
      data: [{ id: 'ph1', ticket_id: 't1', storage_path: 't1/a.jpg', url: 'stored://a' }],
      error: null,
    });
    mockedSign.mockResolvedValue('https://signed/a');

    const { result } = renderHook(() => useTicketPhotos('t1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.photos).toEqual([{ id: 'ph1', uri: 'https://signed/a' }]);
  });

  it('retombe sur l’URL stockée si la signature échoue', async () => {
    photoQuery({
      data: [{ id: 'ph1', ticket_id: 't1', storage_path: 't1/a.jpg', url: 'stored://a' }],
      error: null,
    });
    mockedSign.mockRejectedValue(new Error('signature KO'));

    const { result } = renderHook(() => useTicketPhotos('t1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.photos[0].uri).toBe('stored://a');
  });

  it('renvoie une liste vide en cas d’erreur de requête', async () => {
    photoQuery({ data: null, error: { message: 'RLS' } });
    const { result } = renderHook(() => useTicketPhotos('t1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.photos).toEqual([]);
  });
});
