-- Migration 003 : Politiques Row Level Security (RLS)
-- À exécuter APRÈS 002_functions.sql
--
-- Principe : chaque table a le RLS activé, puis des politiques
-- définissent QUI peut SELECT / INSERT / UPDATE / DELETE quelles lignes.
-- Les fonctions current_profile_id() et current_user_role()
-- (définies en 002) renvoient l'identité de l'utilisateur connecté.
--
-- Astuce performance : on enveloppe les appels de fonction dans
-- (SELECT ...) pour que PostgreSQL les évalue UNE seule fois par
-- requête au lieu d'une fois par ligne.

-- ============================================================
-- Activation du RLS sur toutes les tables
-- (sans politique, RLS = tout est bloqué par défaut)
-- ============================================================
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residences     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_photos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- - Lecture : son propre profil ; gestionnaires et techniciens voient tous
-- - Modification : son propre profil uniquement
-- - Création : aucune (gérée par le trigger handle_new_user)
-- ============================================================
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR (SELECT public.current_user_role()) IN ('manager', 'technician')
  );

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ============================================================
-- RESIDENCES
-- - Lecture : son gestionnaire ; locataires qui y habitent ;
--             techniciens ayant un ticket assigné dans la résidence
-- - Écriture : gestionnaire propriétaire uniquement
-- ============================================================
CREATE POLICY "residences_select" ON public.residences
  FOR SELECT TO authenticated
  USING (
    manager_id = (SELECT public.current_profile_id())
    OR id IN (
      SELECT residence_id FROM public.apartments
      WHERE tenant_id = (SELECT public.current_profile_id())
    )
    OR id IN (
      SELECT a.residence_id FROM public.apartments a
      JOIN public.tickets t ON t.apartment_id = a.id
      WHERE t.assigned_to = (SELECT public.current_profile_id())
    )
  );

CREATE POLICY "residences_insert" ON public.residences
  FOR INSERT TO authenticated
  WITH CHECK (
    manager_id = (SELECT public.current_profile_id())
    AND (SELECT public.current_user_role()) = 'manager'
  );

CREATE POLICY "residences_update" ON public.residences
  FOR UPDATE TO authenticated
  USING (manager_id = (SELECT public.current_profile_id()))
  WITH CHECK (manager_id = (SELECT public.current_profile_id()));

CREATE POLICY "residences_delete" ON public.residences
  FOR DELETE TO authenticated
  USING (manager_id = (SELECT public.current_profile_id()));

-- ============================================================
-- APARTMENTS
-- - Lecture : son locataire ; gestionnaire de la résidence ;
--             technicien ayant un ticket assigné sur le logement
-- - Écriture : gestionnaire de la résidence
-- ============================================================
CREATE POLICY "apartments_select" ON public.apartments
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT public.current_profile_id())
    OR residence_id IN (
      SELECT id FROM public.residences
      WHERE manager_id = (SELECT public.current_profile_id())
    )
    OR id IN (
      SELECT apartment_id FROM public.tickets
      WHERE assigned_to = (SELECT public.current_profile_id())
    )
  );

CREATE POLICY "apartments_insert" ON public.apartments
  FOR INSERT TO authenticated
  WITH CHECK (
    residence_id IN (
      SELECT id FROM public.residences
      WHERE manager_id = (SELECT public.current_profile_id())
    )
  );

CREATE POLICY "apartments_update" ON public.apartments
  FOR UPDATE TO authenticated
  USING (
    residence_id IN (
      SELECT id FROM public.residences
      WHERE manager_id = (SELECT public.current_profile_id())
    )
  )
  WITH CHECK (
    residence_id IN (
      SELECT id FROM public.residences
      WHERE manager_id = (SELECT public.current_profile_id())
    )
  );

CREATE POLICY "apartments_delete" ON public.apartments
  FOR DELETE TO authenticated
  USING (
    residence_id IN (
      SELECT id FROM public.residences
      WHERE manager_id = (SELECT public.current_profile_id())
    )
  );

-- ============================================================
-- TICKETS
-- - Lecture : créateur (locataire) ; technicien assigné ;
--             gestionnaire de la résidence concernée
-- - Création : locataire pour son logement, ou gestionnaire de la résidence
-- - Modification : technicien assigné ou gestionnaire de la résidence
-- - Suppression : gestionnaire de la résidence
-- ============================================================
CREATE POLICY "tickets_select" ON public.tickets
  FOR SELECT TO authenticated
  USING (
    reported_by = (SELECT public.current_profile_id())
    OR assigned_to = (SELECT public.current_profile_id())
    OR apartment_id IN (
      SELECT a.id FROM public.apartments a
      JOIN public.residences r ON r.id = a.residence_id
      WHERE r.manager_id = (SELECT public.current_profile_id())
    )
  );

CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    reported_by = (SELECT public.current_profile_id())
    AND (
      apartment_id IN (
        SELECT id FROM public.apartments
        WHERE tenant_id = (SELECT public.current_profile_id())
      )
      OR apartment_id IN (
        SELECT a.id FROM public.apartments a
        JOIN public.residences r ON r.id = a.residence_id
        WHERE r.manager_id = (SELECT public.current_profile_id())
      )
    )
  );

CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE TO authenticated
  USING (
    assigned_to = (SELECT public.current_profile_id())
    OR apartment_id IN (
      SELECT a.id FROM public.apartments a
      JOIN public.residences r ON r.id = a.residence_id
      WHERE r.manager_id = (SELECT public.current_profile_id())
    )
  )
  WITH CHECK (
    assigned_to = (SELECT public.current_profile_id())
    OR apartment_id IN (
      SELECT a.id FROM public.apartments a
      JOIN public.residences r ON r.id = a.residence_id
      WHERE r.manager_id = (SELECT public.current_profile_id())
    )
  );

CREATE POLICY "tickets_delete" ON public.tickets
  FOR DELETE TO authenticated
  USING (
    apartment_id IN (
      SELECT a.id FROM public.apartments a
      JOIN public.residences r ON r.id = a.residence_id
      WHERE r.manager_id = (SELECT public.current_profile_id())
    )
  );

-- ============================================================
-- TICKET_PHOTOS
-- Astuce : "ticket_id IN (SELECT id FROM tickets)" réutilise
-- automatiquement le RLS de tickets. On voit donc les photos
-- des tickets qu'on a le droit de voir, sans réécrire la logique.
-- - Lecture : photos des tickets visibles
-- - Création : le créateur du ticket peut ajouter des photos
-- ============================================================
CREATE POLICY "ticket_photos_select" ON public.ticket_photos
  FOR SELECT TO authenticated
  USING (ticket_id IN (SELECT id FROM public.tickets));

CREATE POLICY "ticket_photos_insert" ON public.ticket_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE reported_by = (SELECT public.current_profile_id())
    )
  );

CREATE POLICY "ticket_photos_delete" ON public.ticket_photos
  FOR DELETE TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE reported_by = (SELECT public.current_profile_id())
    )
  );

-- ============================================================
-- TICKET_HISTORY (journal d'audit)
-- - Lecture : historique des tickets visibles
-- - Création : l'auteur du changement (gestionnaire/technicien agissant)
-- - Pas de modification/suppression : un audit ne se réécrit jamais
-- ============================================================
CREATE POLICY "ticket_history_select" ON public.ticket_history
  FOR SELECT TO authenticated
  USING (ticket_id IN (SELECT id FROM public.tickets));

CREATE POLICY "ticket_history_insert" ON public.ticket_history
  FOR INSERT TO authenticated
  WITH CHECK (
    changed_by = (SELECT public.current_profile_id())
    AND ticket_id IN (SELECT id FROM public.tickets)
  );

-- ============================================================
-- NOTIFICATIONS
-- - Lecture : ses propres notifications
-- - Modification : marquer ses notifications comme lues
-- - Création : aucune côté client (les Edge Functions utilisent
--   la clé service_role qui contourne le RLS)
-- ============================================================
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT public.current_profile_id()));

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT public.current_profile_id()))
  WITH CHECK (user_id = (SELECT public.current_profile_id()));

-- ============================================================
-- PUSH_TOKENS
-- - Tout (lecture/écriture) : ses propres tokens uniquement
-- ============================================================
CREATE POLICY "push_tokens_all" ON public.push_tokens
  FOR ALL TO authenticated
  USING (user_id = (SELECT public.current_profile_id()))
  WITH CHECK (user_id = (SELECT public.current_profile_id()));
