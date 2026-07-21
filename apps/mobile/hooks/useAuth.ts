import { useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '@residenceconnect/shared';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
  });

  const fetchProfile = useCallback(async (userId: string) => {
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

    /**
     * Applique une session à l'état. `loading` repasse TOUJOURS à false, même
     * en cas d'échec : sans cela, la moindre erreur (session illisible,
     * réseau indisponible) laisserait l'application bloquée indéfiniment sur
     * l'écran de chargement du layout racine.
     */
    const applySession = async (session: Session | null) => {
      let profile: Profile | null = null;
      try {
        if (session?.user) profile = await fetchProfile(session.user.id);
      } catch {
        profile = null;
      }
      if (!active) return;
      setState({
        session,
        user: session?.user ?? null,
        profile,
        loading: false,
      });
    };

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => applySession(session))
      .catch(() => {
        // Session illisible ou stockage indisponible : on retombe sur l'état
        // « déconnecté », ce qui affiche l'écran de connexion.
        if (active) {
          setState({ session: null, user: null, profile: null, loading: false });
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void applySession(session);
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: Profile['role'],
    phone?: string
  ) => {
    // Les métadonnées (full_name, role, phone) sont lues par le trigger
    // PostgreSQL handle_new_user() qui crée automatiquement le profil.
    // Aucune insertion manuelle dans "profiles" n'est nécessaire.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          phone: phone ?? null,
        },
      },
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    ...state,
    signIn,
    signUp,
    signOut,
  };
}
