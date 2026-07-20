import { File } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { supabase } from './supabase';

const BUCKET = 'ticket-photos';

export interface UploadedTicketPhoto {
  id: string;
  storage_path: string;
  url: string;
}

/**
 * Envoie une photo locale dans le bucket privé `ticket-photos`, puis crée
 * la ligne correspondante dans `ticket_photos`.
 *
 * Chemin Storage : `{ticketId}/{uuid}.jpg`.
 *
 * @throws Error avec un message explicite en français si une étape échoue.
 */
export async function uploadTicketPhoto(
  ticketId: string,
  localUri: string,
): Promise<UploadedTicketPhoto> {
  if (!ticketId) {
    throw new Error('Identifiant de ticket manquant pour l’upload de photo.');
  }
  if (!localUri) {
    throw new Error('URI locale de la photo manquante.');
  }

  // Lecture du fichier en ArrayBuffer via l'API `File` d'expo-file-system.
  //
  // On n'utilise volontairement PAS `fetch(uri).blob()` : en React Native, le
  // Blob produit n'expose pas ses données à supabase-js, ce qui aboutit à des
  // fichiers de 0 octet envoyés silencieusement dans le Storage.
  let bytes: ArrayBuffer;
  try {
    bytes = await new File(localUri).arrayBuffer();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Impossible de lire la photo : ${detail}`);
  }

  if (bytes.byteLength === 0) {
    throw new Error('La photo lue est vide (0 octet).');
  }

  // `randomUUID` vient d'expo-crypto : le moteur Hermes de React Native
  // n'expose pas l'API Web Crypto, donc `crypto.randomUUID()` n'existe pas.
  const storagePath = `${ticketId}/${randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Échec de l’upload Storage : ${uploadError.message}`);
  }

  // URL signée longue durée pour affichage ; le chemin reste la source de vérité.
  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  if (signError || !signed?.signedUrl) {
    throw new Error(
      `Upload OK mais URL signée impossible : ${signError?.message ?? 'réponse vide'}`,
    );
  }

  const { data: row, error: insertError } = await supabase
    .from('ticket_photos')
    .insert({
      ticket_id: ticketId,
      storage_path: storagePath,
      url: signed.signedUrl,
    })
    .select('id, storage_path, url')
    .single();

  if (insertError || !row) {
    throw new Error(
      `Photo uploadée mais enregistrement en base impossible : ${insertError?.message ?? 'ligne absente'}`,
    );
  }

  return row as UploadedTicketPhoto;
}

/**
 * Renouvelle une URL signée à partir du chemin Storage (bucket privé).
 */
export async function getTicketPhotoSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Impossible de signer l’URL de la photo : ${error?.message ?? 'réponse vide'}`,
    );
  }
  return data.signedUrl;
}
