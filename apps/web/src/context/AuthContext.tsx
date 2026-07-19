import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

type AuthValue = ReturnType<typeof useAuth>;

const AuthContext = createContext<AuthValue | null>(null);

/** Fournit l'état d'authentification à toute l'application. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

/** Accède au contexte d'authentification. Doit être utilisé sous AuthProvider. */
export function useAuthContext(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext doit être utilisé dans un AuthProvider');
  }
  return ctx;
}
