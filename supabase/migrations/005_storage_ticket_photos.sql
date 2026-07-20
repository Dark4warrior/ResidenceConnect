-- Migration 005 : bucket Storage privé pour les photos de signalements
-- Chemin des fichiers : {ticket_id}/{uuid}.jpg

-- Bucket privé (pas d'accès anonyme)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-photos',
  'ticket-photos',
  false,
  5242880, -- 5 Mo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Lecture : tout utilisateur authentifié qui peut voir le ticket (RLS tickets)
CREATE POLICY "ticket_photos_storage_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ticket-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.tickets
    )
  );

-- Écriture : uniquement le déclarant du ticket
CREATE POLICY "ticket_photos_storage_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text
      FROM public.tickets
      WHERE reported_by = (SELECT public.current_profile_id())
    )
  );

-- Suppression : déclarant uniquement (nettoyage éventuel)
CREATE POLICY "ticket_photos_storage_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ticket-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text
      FROM public.tickets
      WHERE reported_by = (SELECT public.current_profile_id())
    )
  );
