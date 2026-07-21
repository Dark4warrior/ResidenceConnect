import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

/**
 * Protège les routes du dashboard : redirige vers /login si aucune session,
 * et affiche un message si l'utilisateur connecté n'est pas gestionnaire.
 */
export function ProtectedRoute() {
  const { session, profile, loading, signOut } = useAuthContext();

  const handleSignOut = () => {
    void signOut();
  };

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
    const roleLabel =
      profile.role === 'tenant' ? 'locataire' : 'technicien';

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
            <span className="text-2xl" aria-hidden="true">
              🔒
            </span>
          </div>
          <h1 className="mt-4 text-lg font-semibold text-slate-800">
            Accès réservé aux gestionnaires
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Votre compte a le rôle <strong>{roleLabel}</strong>. L&apos;espace
            web est réservé aux gestionnaires — utilisez l&apos;application
            mobile ResidenceConnect avec ce compte.
          </p>
          {/* Sans cette action, l'utilisateur était bloqué : la session reste
              active, donc toute navigation le ramenait sur cet écran. */}
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-6 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Changer de compte
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
