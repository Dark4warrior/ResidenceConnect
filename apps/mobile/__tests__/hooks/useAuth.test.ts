import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');

const auth = supabase.auth as unknown as {
  getSession: jest.Mock;
  onAuthStateChange: jest.Mock;
  signInWithPassword: jest.Mock;
  signUp: jest.Mock;
  signOut: jest.Mock;
};
const mockedFrom = supabase.from as jest.Mock;

const profileRow = {
  id: 'p1',
  auth_user_id: 'u1',
  full_name: 'Camille Locataire',
  role: 'tenant',
  phone: null,
  created_at: '2026-01-01T00:00:00Z',
};

/** Simule `from('profiles').select('*').eq(...).single()`. */
function mockProfileFetch(result: { data: unknown; error: unknown }) {
  const single = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ single });
  const select = jest.fn().mockReturnValue({ eq });
  mockedFrom.mockReturnValue({ select });
  return { select, eq, single };
}

let unsubscribe: jest.Mock;

beforeEach(() => {
  unsubscribe = jest.fn();
  auth.onAuthStateChange = jest.fn().mockReturnValue({
    data: { subscription: { unsubscribe } },
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useAuth', () => {
  it('sans session : profil null et chargement terminé', async () => {
    auth.getSession = jest.fn().mockResolvedValue({ data: { session: null } });
    mockProfileFetch({ data: null, error: null });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('avec session : charge le profil métier associé', async () => {
    const session = { user: { id: 'u1' } };
    auth.getSession = jest.fn().mockResolvedValue({ data: { session } });
    mockProfileFetch({ data: profileRow, error: null });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user?.id).toBe('u1');
    expect(result.current.profile?.role).toBe('tenant');
    expect(result.current.profile?.full_name).toBe('Camille Locataire');
  });

  it('profil introuvable (erreur) : profile reste null', async () => {
    const session = { user: { id: 'u1' } };
    auth.getSession = jest.fn().mockResolvedValue({ data: { session } });
    mockProfileFetch({ data: null, error: { message: 'not found' } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
  });

  it('se désabonne du listener au démontage', async () => {
    auth.getSession = jest.fn().mockResolvedValue({ data: { session: null } });
    mockProfileFetch({ data: null, error: null });

    const { unmount, result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  describe('actions', () => {
    beforeEach(() => {
      auth.getSession = jest.fn().mockResolvedValue({ data: { session: null } });
      mockProfileFetch({ data: null, error: null });
    });

    it('signIn délègue à signInWithPassword et propage l’erreur', async () => {
      auth.signInWithPassword = jest
        .fn()
        .mockResolvedValue({ error: { message: 'bad creds' } });

      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: { error: unknown } | undefined;
      await act(async () => {
        res = await result.current.signIn('a@b.fr', 'secret');
      });

      expect(auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'a@b.fr',
        password: 'secret',
      });
      expect(res?.error).toEqual({ message: 'bad creds' });
    });

    it('signUp transmet les métadonnées lues par le trigger SQL', async () => {
      auth.signUp = jest.fn().mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signUp('new@b.fr', 'pw', 'Marc Tech', 'technician', '0600');
      });

      expect(auth.signUp).toHaveBeenCalledWith({
        email: 'new@b.fr',
        password: 'pw',
        options: {
          data: { full_name: 'Marc Tech', role: 'technician', phone: '0600' },
        },
      });
    });

    it('signUp met phone à null quand il est omis', async () => {
      auth.signUp = jest.fn().mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signUp('x@b.fr', 'pw', 'Sans Tel', 'manager');
      });

      expect(auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { data: expect.objectContaining({ phone: null }) },
        })
      );
    });

    it('signOut délègue à supabase.auth.signOut', async () => {
      auth.signOut = jest.fn().mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signOut();
      });

      expect(auth.signOut).toHaveBeenCalledTimes(1);
    });
  });
});
