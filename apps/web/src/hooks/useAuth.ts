import { useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '@residenceconnect/shared';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

/**
 * Gère la session Supabase et le profil métier associé côté web.
 * L'accès au dashboard est réservé aux rôles `manager` (contrôlé à l'affichage
 * en plus des politiques RLS côté base).
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    profile: null,
    loading: true,
  });

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', userId)
      .single();
    if (error) return null;
    return data as Profile;
  }, []);

  useEffect(() => {
    let active = true;

    const sync = async (session: Session | null) => {
      const profile = session?.user ? await loadProfile(session.user.id) : null;
      if (active) setState({ session, profile, loading: false });
    };

    supabase.auth
      .getSession()
      .then(({ data }) => sync(data.session))
      .catch(() => active && setState({ session: null, profile: null, loading: false }));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void sync(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  /**
   * Met à jour les informations personnelles du profil connecté (nom,
   * téléphone) et rafraîchit l'état. La politique RLS `profiles_update_own`
   * garantit qu'on ne peut modifier que son propre profil.
   */
  const updateProfile = useCallback(
    async (fields: { full_name: string; phone: string | null }) => {
      if (!state.profile) return { error: { message: 'Profil introuvable' } };

      const { error } = await supabase
        .from('profiles')
        .update(fields)
        .eq('id', state.profile.id);

      if (error) return { error };

      setState((s) => ({
        ...s,
        profile: s.profile ? { ...s.profile, ...fields } : s.profile,
      }));
      return { error: null };
    },
    [state.profile]
  );

  return { ...state, signIn, signOut, updateProfile };
}
