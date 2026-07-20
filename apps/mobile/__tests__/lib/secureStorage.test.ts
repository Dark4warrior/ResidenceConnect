import * as SecureStore from 'expo-secure-store';
import { chunkedSecureStore, CHUNK_SIZE } from '../../lib/secureStorage';

jest.mock('expo-secure-store');

const mocked = SecureStore as jest.Mocked<typeof SecureStore>;

/** Magasin en mémoire simulant le keychain. */
let store: Record<string, string>;

beforeEach(() => {
  jest.clearAllMocks();
  store = {};
  mocked.getItemAsync.mockImplementation(async (k: string) => store[k] ?? null);
  mocked.setItemAsync.mockImplementation(async (k: string, v: string) => {
    store[k] = v;
  });
  mocked.deleteItemAsync.mockImplementation(async (k: string) => {
    delete store[k];
  });
});

// Session Supabase réaliste : largement au-delà de la limite de 2048 octets
// qui provoquait l'avertissement puis l'échec de restauration.
const bigSession = 'x'.repeat(5000);

describe('chunkedSecureStore', () => {
  it('découpe une valeur volumineuse en plusieurs fragments', async () => {
    await chunkedSecureStore.setItem('session', bigSession);

    const expected = Math.ceil(bigSession.length / CHUNK_SIZE);
    expect(store['session__chunks']).toBe(String(expected));
    expect(store['session__0']).toBeDefined();

    // Aucun fragment ne dépasse la limite de SecureStore.
    for (let i = 0; i < expected; i++) {
      expect(store[`session__${i}`].length).toBeLessThanOrEqual(CHUNK_SIZE);
    }
  });

  it('relit exactement la valeur d’origine', async () => {
    await chunkedSecureStore.setItem('session', bigSession);
    await expect(chunkedSecureStore.getItem('session')).resolves.toBe(bigSession);
  });

  it('gère une valeur courte sans perte', async () => {
    await chunkedSecureStore.setItem('session', 'court');
    await expect(chunkedSecureStore.getItem('session')).resolves.toBe('court');
  });

  it('supprime tous les fragments', async () => {
    await chunkedSecureStore.setItem('session', bigSession);
    await chunkedSecureStore.removeItem('session');
    expect(Object.keys(store)).toHaveLength(0);
  });

  it('ne laisse pas de fragments orphelins lors d’une réécriture plus courte', async () => {
    await chunkedSecureStore.setItem('session', bigSession);
    await chunkedSecureStore.setItem('session', 'court');

    expect(store['session__chunks']).toBe('1');
    expect(store['session__1']).toBeUndefined();
    await expect(chunkedSecureStore.getItem('session')).resolves.toBe('court');
  });

  it('reste compatible avec une valeur écrite avant le découpage', async () => {
    store['session'] = 'ancienne-valeur';
    await expect(chunkedSecureStore.getItem('session')).resolves.toBe(
      'ancienne-valeur'
    );
  });

  it('renvoie null si un fragment manque (valeur corrompue)', async () => {
    await chunkedSecureStore.setItem('session', bigSession);
    delete store['session__1'];
    await expect(chunkedSecureStore.getItem('session')).resolves.toBeNull();
  });

  it('renvoie null au lieu de propager une erreur de lecture', async () => {
    mocked.getItemAsync.mockRejectedValue(new Error('keychain verrouillé'));
    await expect(chunkedSecureStore.getItem('session')).resolves.toBeNull();
  });

  it('n’explose pas si l’écriture échoue', async () => {
    mocked.setItemAsync.mockRejectedValue(new Error('quota dépassé'));
    await expect(
      chunkedSecureStore.setItem('session', bigSession)
    ).resolves.toBeUndefined();
  });
});
