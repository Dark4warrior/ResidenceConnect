import { renderHook, waitFor } from '@testing-library/react-native';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');

const auth = supabase.auth as unknown as {
  getSession: jest.Mock;
  onAuthStateChange: jest.Mock;
};
const mockedFrom = supabase.from as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  auth.onAuthStateChange = jest.fn().mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  });
});

/**
 * Régression : l'application restait bloquée indéfiniment sur l'écran de
 * chargement quand la restauration de session échouait (session stockée
 * illisible car dépassant la limite de SecureStore). `loading` doit
 * TOUJOURS retomber à false.
 */
describe('useAuth — résilience du chargement', () => {
  it('sort du chargement même si getSession rejette', async () => {
    auth.getSession = jest.fn().mockRejectedValue(new Error('stockage illisible'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('sort du chargement même si la récupération du profil échoue', async () => {
    auth.getSession = jest
      .fn()
      .mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });

    // `from('profiles')` lève au lieu de renvoyer une réponse.
    mockedFrom.mockImplementation(() => {
      throw new Error('réseau indisponible');
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
    // La session reste exploitable même sans profil chargé.
    expect(result.current.user?.id).toBe('u1');
  });

  it('n’écrase pas l’état après démontage', async () => {
    auth.getSession = jest.fn().mockResolvedValue({ data: { session: null } });
    const single = jest.fn().mockResolvedValue({ data: null, error: null });
    mockedFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single }) }),
    });

    const { result, unmount } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Ne doit pas lever d'avertissement React ni planter.
    expect(() => unmount()).not.toThrow();
  });
});
