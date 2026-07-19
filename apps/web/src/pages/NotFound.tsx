import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="text-3xl font-bold text-slate-800">404</p>
      <p className="text-sm text-slate-500">Cette page n'existe pas.</p>
      <Link to="/" className="text-sm text-brand hover:underline">
        Retour au dashboard
      </Link>
    </div>
  );
}
