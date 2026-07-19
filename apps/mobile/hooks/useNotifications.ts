import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Platform as PushPlatform } from '@residenceconnect/shared';
import { supabase } from '../lib/supabase';

interface NotificationsState {
  /** Token Expo Push obtenu, ou null. */
  token: string | null;
  /** Permission accordée par l'utilisateur. */
  granted: boolean;
  /** Message d'erreur explicite en cas d'échec, ou null. */
  error: string | null;
}

/**
 * Enregistre l'appareil pour les notifications push Expo et persiste le token
 * dans la table `push_tokens` pour l'utilisateur donné.
 *
 * Étapes : demande de permission → récupération du token Expo → upsert en base
 * (clé unique sur le token). Toute erreur est remontée dans `error` plutôt que
 * silencieusement ignorée.
 *
 * @param userId identifiant du profil connecté, ou null si non connecté.
 */
export function useNotifications(userId: string | null) {
  const [state, setState] = useState<NotificationsState>({
    token: null,
    granted: false,
    error: null,
  });

  const register = useCallback(async () => {
    if (!userId) return;

    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let status = existing;
      if (existing !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status;
      }

      if (status !== 'granted') {
        setState({ token: null, granted: false, error: 'Permission refusée' });
        return;
      }

      const { data: token } = await Notifications.getExpoPushTokenAsync();

      const platform: PushPlatform = Platform.OS === 'ios' ? 'ios' : 'android';
      const { error: upsertError } = await supabase
        .from('push_tokens')
        .upsert(
          { user_id: userId, expo_push_token: token, platform },
          { onConflict: 'expo_push_token' }
        );

      if (upsertError) {
        setState({ token, granted: true, error: upsertError.message });
        return;
      }

      setState({ token, granted: true, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Échec de l’enregistrement push';
      setState({ token: null, granted: false, error: message });
    }
  }, [userId]);

  useEffect(() => {
    void register();
  }, [register]);

  return { ...state, register };
}
