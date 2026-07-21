import { isSupabaseConfigured } from '../lib/supabase';

/**
 * Bandeau d'avertissement affiché quand le backend Supabase n'est pas
 * configuré (variables d'environnement absentes ou projet injoignable).
 * Permet à l'interface de rester utilisable et explicite en démonstration.
 */
export function ConfigBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800">
      <strong>Mode démonstration :</strong> aucun backend Supabase configuré
      (renseignez <code>VITE_SUPABASE_URL</code> et{' '}
      <code>VITE_SUPABASE_ANON_KEY</code> dans <code>apps/web/.env.local</code>).
      Les données ne peuvent pas être chargées.
    </div>
  );
}
