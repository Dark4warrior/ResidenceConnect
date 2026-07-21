import * as SecureStore from 'expo-secure-store';

/**
 * Taille maximale d'un fragment stocké.
 *
 * `expo-secure-store` avertit au-delà de 2048 octets et lèvera une erreur dans
 * une prochaine version du SDK. Or une session Supabase (access_token +
 * refresh_token + objet utilisateur) dépasse largement cette limite : on
 * découpe donc la valeur. Les jetons étant en ASCII, 1 caractère ≈ 1 octet.
 */
export const CHUNK_SIZE = 1800;

const countKey = (key: string) => `${key}__chunks`;
const chunkKey = (key: string, i: number) => `${key}__${i}`;

/**
 * Stockage sécurisé supportant les valeurs volumineuses, destiné au client
 * Supabase.
 *
 * La valeur est répartie sur plusieurs entrées SecureStore (chiffrées par le
 * système), accompagnées d'une entrée indiquant le nombre de fragments.
 *
 * Toute erreur est neutralisée (`null` en lecture, silence en écriture)
 * plutôt que propagée : une session illisible doit ramener l'utilisateur à
 * l'écran de connexion, jamais bloquer l'application sur un écran de
 * chargement.
 */
export const chunkedSecureStore = {
  async getItem(key: string): Promise<string | null> {
    try {
      const rawCount = await SecureStore.getItemAsync(countKey(key));

      // Valeur écrite avant l'introduction du découpage : lecture directe.
      if (rawCount === null) return await SecureStore.getItemAsync(key);

      const count = Number(rawCount);
      if (!Number.isInteger(count) || count <= 0) return null;

      const parts = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          SecureStore.getItemAsync(chunkKey(key, i))
        )
      );

      // Un fragment manquant rend la valeur inexploitable.
      if (parts.some((p) => p === null)) return null;
      return parts.join('');
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await chunkedSecureStore.removeItem(key);

      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }

      await Promise.all(
        chunks.map((c, i) => SecureStore.setItemAsync(chunkKey(key, i), c))
      );
      await SecureStore.setItemAsync(countKey(key), String(chunks.length));
    } catch {
      // Stockage indisponible (keychain verrouillé, quota…) : la session
      // reste utilisable en mémoire, elle ne sera simplement pas persistée.
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const rawCount = await SecureStore.getItemAsync(countKey(key));
      if (rawCount !== null) {
        const count = Number(rawCount);
        if (Number.isInteger(count) && count > 0) {
          await Promise.all(
            Array.from({ length: count }, (_, i) =>
              SecureStore.deleteItemAsync(chunkKey(key, i))
            )
          );
        }
        await SecureStore.deleteItemAsync(countKey(key));
      }
      // Nettoie aussi une éventuelle valeur non découpée héritée.
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Suppression best-effort.
    }
  },
};
