/**
 * Mock manuel du client Supabase pour les tests unitaires.
 *
 * Le module réel (`lib/supabase.ts`) instancie `createClient` au chargement et
 * lève une erreur si les variables d'environnement sont absentes ; on ne peut
 * donc pas l'auto-mocker. Ce mock expose les mêmes points d'entrée
 * (`from`, `auth`, `channel`, `removeChannel`) sous forme de `jest.fn()` que
 * chaque test configure.
 */
export const supabase = {
  from: jest.fn(),
  channel: jest.fn(),
  removeChannel: jest.fn(),
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  },
};
