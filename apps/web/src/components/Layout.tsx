import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { ConfigBanner } from './ConfigBanner';

// Onglets de navigation : visibles comme des onglets même au repos (bordure +
// fond), pas seulement au survol.
const tabClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'border-brand bg-brand text-white'
      : 'border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand',
  ].join(' ');

/** Cadre commun du dashboard : en-tête, navigation et zone de contenu. */
export function Layout() {
  const { profile, signOut } = useAuthContext();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen">
      <ConfigBanner />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <span className="text-lg font-bold text-brand">ResidenceConnect</span>
          <nav className="flex items-center gap-2">
            <NavLink to="/" end className={tabClass}>
              Tickets
            </NavLink>
            <NavLink to="/analytics" className={tabClass}>
              Analytics
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {profile ? (
              <NavLink
                to="/profil"
                className={({ isActive }) =>
                  [
                    'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-brand bg-brand-light text-brand'
                      : 'border-slate-200 text-slate-600 hover:border-brand hover:text-brand',
                  ].join(' ')
                }
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white"
                  aria-hidden="true"
                >
                  {profile.full_name.charAt(0).toUpperCase()}
                </span>
                {profile.full_name}
              </NavLink>
            ) : null}
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
