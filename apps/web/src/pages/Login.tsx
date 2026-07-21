import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { ConfigBanner } from '../components/ConfigBanner';

/** Page de connexion du gestionnaire (email + mot de passe). */
export function Login() {
  const { session, loading, signIn } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      setError("Identifiants invalides ou service indisponible.");
    }
  };

  return (
    <div className="min-h-screen">
      <ConfigBanner />
      <main className="flex min-h-[80vh] items-center justify-center px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <h1 className="text-xl font-bold text-brand">ResidenceConnect</h1>
          <p className="mt-1 text-sm text-slate-500">Espace gestionnaire</p>

          <label className="mt-6 block text-sm font-medium text-slate-700">
            Adresse e-mail
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Mot de passe
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>

          {error ? (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !isSupabaseConfigured}
            className="mt-6 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>

          {!isSupabaseConfigured ? (
            <p className="mt-3 text-center text-xs text-slate-400">
              Connexion désactivée en mode démonstration.
            </p>
          ) : null}
        </form>
      </main>
    </div>
  );
}
