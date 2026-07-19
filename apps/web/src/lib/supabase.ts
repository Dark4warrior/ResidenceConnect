import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Indique si le client Supabase est correctement configuré.
 * Contrairement au mobile, on ne lève pas d'erreur au chargement : l'app web
 * doit pouvoir s'afficher (et guider l'utilisateur) même sans backend, ce qui
 * permet aussi de la tester sans instance Supabase active.
 */
export const isSupabaseConfigured =
  typeof url === 'string' &&
  url.startsWith('http') &&
  typeof anonKey === 'string' &&
  anonKey.length > 0 &&
  anonKey !== 'REMPLACER_PAR_LA_CLE_ANON';

// Client réel si configuré, sinon URL/clé factices : les appels échoueront
// proprement (gérés par les hooks) au lieu de faire planter le rendu.
export const supabase = createClient(
  isSupabaseConfigured ? (url as string) : 'http://localhost:54321',
  isSupabaseConfigured ? (anonKey as string) : 'public-anon-key-placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
