import { renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { useNotifications } from '../../hooks/useNotifications';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');
jest.mock('expo-notifications');

const mockedFrom = supabase.from as jest.Mock;
const notif = Notifications as jest.Mocked<typeof Notifications>;

/** Configure le mock de `from('push_tokens').upsert(...)`. */
function mockUpsert(result: { error: unknown }) {
  const upsert = jest.fn().mockResolvedValue(result);
  mockedFrom.mockReturnValue({ upsert });
  return upsert;
}

beforeEach(() => {
  jest.clearAllMocks();
  notif.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
  notif.requestPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
  notif.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc]' } as never);
});

describe('useNotifications', () => {
  it('ne fait rien tant qu’aucun utilisateur n’est fourni', async () => {
    mockUpsert({ error: null });
    const { result } = renderHook(() => useNotifications(null));

    // Laisse passer un tick pour s'assurer qu'aucun effet asynchrone ne se lance.
    await waitFor(() => expect(result.current.token).toBeNull());
    expect(notif.getPermissionsAsync).not.toHaveBeenCalled();
    expect(mockedFrom).not.toHaveBeenCalled();
  });

  it('enregistre le token en base quand la permission est déjà accordée', async () => {
    const upsert = mockUpsert({ error: null });
    const { result } = renderHook(() => useNotifications('user-1'));

    await waitFor(() => expect(result.current.token).toBe('ExponentPushToken[abc]'));
    expect(result.current.granted).toBe(true);
    expect(result.current.error).toBeNull();
    expect(upsert).toHaveBeenCalledWith(
      { user_id: 'user-1', expo_push_token: 'ExponentPushToken[abc]', platform: 'ios' },
      { onConflict: 'expo_push_token' }
    );
  });

  it('demande la permission si elle n’est pas encore accordée', async () => {
    notif.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' } as never);
    mockUpsert({ error: null });

    const { result } = renderHook(() => useNotifications('user-1'));
    await waitFor(() => expect(result.current.granted).toBe(true));
    expect(notif.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('remonte une erreur si la permission est refusée', async () => {
    notif.getPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);
    notif.requestPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);

    const { result } = renderHook(() => useNotifications('user-1'));
    await waitFor(() => expect(result.current.error).toBe('Permission refusée'));
    expect(result.current.token).toBeNull();
    expect(mockedFrom).not.toHaveBeenCalled();
  });

  it('remonte l’erreur d’upsert sans perdre le token', async () => {
    mockUpsert({ error: { message: 'insert failed' } });

    const { result } = renderHook(() => useNotifications('user-1'));
    await waitFor(() => expect(result.current.error).toBe('insert failed'));
    expect(result.current.token).toBe('ExponentPushToken[abc]');
    expect(result.current.granted).toBe(true);
  });

  it('capture une exception inattendue dans error', async () => {
    notif.getExpoPushTokenAsync.mockRejectedValue(new Error('réseau indisponible'));
    mockUpsert({ error: null });

    const { result } = renderHook(() => useNotifications('user-1'));
    await waitFor(() => expect(result.current.error).toBe('réseau indisponible'));
  });
});
