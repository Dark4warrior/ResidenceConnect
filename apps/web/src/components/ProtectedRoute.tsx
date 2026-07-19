import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

/**
 * Protège les routes du dashboard : redirige vers /login si aucune session,
 * et affiche un message si l'utilisateur connecté n'est pas gestionnaire.
 */
export function ProtectedRoute() {
  const { session, profile, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Chargement…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (profile && profile.role !== 'manager') {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <div>
          <p className="text-lg font-semibold text-slate-800">Accès réservé</p>
          <p className="mt-2 text-sm text-slate-500">
            L'espace web est réservé aux gestionnaires. Votre rôle actuel ne
            permet pas d'y accéder.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
