import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { ConfigBanner } from './ConfigBanner';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100',
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
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              Tickets
            </NavLink>
            <NavLink to="/analytics" className={linkClass}>
              Analytics
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {profile ? (
              <span className="text-sm text-slate-500">{profile.full_name}</span>
            ) : null}
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
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
