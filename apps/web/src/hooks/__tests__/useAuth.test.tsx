import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

const auth = supabase.auth as unknown as {
  getSession: ReturnType<typeof vi.fn>;
  onAuthStateChange: ReturnType<typeof vi.fn>;
  signInWithPassword: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
};
const mockedFrom = supabase.from as unknown as ReturnType<typeof vi.fn>;

function mockProfile(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  mockedFrom.mockReturnValue({ select });
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.onAuthStateChange = vi
    .fn()
    .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});

describe('useAuth (web)', () => {
  it('sans session : profil null, chargement terminé', async () => {
    auth.getSession = vi.fn().mockResolvedValue({ data: { session: null } });
    mockProfile({ data: null, error: null });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('avec session : charge le profil gestionnaire', async () => {
    auth.getSession = vi
      .fn()
      .mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    mockProfile({ data: { id: 'p1', role: 'manager', full_name: 'Marc' }, error: null });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile?.role).toBe('manager');
  });

  it('sort du chargement même si getSession rejette', async () => {
    auth.getSession = vi.fn().mockRejectedValue(new Error('réseau'));
    mockProfile({ data: null, error: null });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
  });

  it('signIn délègue à signInWithPassword', async () => {
    auth.getSession = vi.fn().mockResolvedValue({ data: { session: null } });
    auth.signInWithPassword = vi.fn().mockResolvedValue({ error: null });
    mockProfile({ data: null, error: null });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signIn('a@b.fr', 'pw');
    });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.fr',
      password: 'pw',
    });
  });
});
