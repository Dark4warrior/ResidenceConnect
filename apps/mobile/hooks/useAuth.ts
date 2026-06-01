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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const profile = session?.user
        ? await fetchProfile(session.user.id)
        : null;

      setState({
        session,
        user: session?.user ?? null,
        profile,
        loading: false,
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const profile = session?.user
          ? await fetchProfile(session.user.id)
          : null;

        setState({
          session,
          user: session?.user ?? null,
          profile,
          loading: false,
        });
      }
    );

    return () => subscription.unsubscribe();
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
