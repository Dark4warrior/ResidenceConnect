-- Migration 004 : Correction de la récursion infinie RLS (erreur 42P17)
--
-- Problème : les politiques de "apartments" et "residences" se
-- référençaient mutuellement (apartments interroge residences, qui
-- interroge apartments...). Idem entre "tickets" et "apartments".
-- PostgreSQL détectait une récursion infinie sur les requêtes liées.
--
-- Solution : déplacer toutes les requêtes CROISÉES (qui lisent une
-- autre table) dans des fonctions SECURITY DEFINER. Ces fonctions
-- s'exécutent avec les droits du propriétaire et CONTOURNENT le RLS,
-- ce qui casse la boucle. Les politiques n'utilisent plus que :
--   - des comparaisons de colonnes directes (= current_profile_id())
--   - des appels à ces fonctions SECURITY DEFINER

-- ============================================================
-- FONCTIONS UTILITAIRES (SECURITY DEFINER, ne déclenchent pas le RLS)
-- ============================================================

-- Résidences gérées par l'utilisateur connecté (gestionnaire)
CREATE OR REPLACE FUNCTION public.managed_residence_ids()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE AS $$
  SELECT id FROM public.residences WHERE manager_id = public.current_profile_id();
$$;

-- Résidences où l'utilisateur a un logement (locataire)
CREATE OR REPLACE FUNCTION public.my_residence_ids()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE AS $$
  SELECT residence_id FROM public.apartments WHERE tenant_id = public.current_profile_id();
$$;

-- Résidences où l'utilisateur a un ticket assigné (technicien)
CREATE OR REPLACE FUNCTION public.assigned_residence_ids()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE AS $$
  SELECT a.residence_id
  FROM public.apartments a
  JOIN public.tickets t ON t.apartment_id = a.id
  WHERE t.assigned_to = public.current_profile_id();
$$;

-- Logements appartenant à l'utilisateur (locataire)
CREATE OR REPLACE FUNCTION public.my_apartment_ids()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE AS $$
  SELECT id FROM public.apartments WHERE tenant_id = public.current_profile_id();
$$;

-- Logements situés dans les résidences gérées par l'utilisateur (gestionnaire)
CREATE OR REPLACE FUNCTION public.managed_apartment_ids()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE AS $$
  SELECT id FROM public.apartments
  WHERE residence_id IN (SELECT public.managed_residence_ids());
$$;

-- Logements avec un ticket assigné à l'utilisateur (technicien)
CREATE OR REPLACE FUNCTION public.assigned_apartment_ids()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE AS $$
  SELECT apartment_id FROM public.tickets WHERE assigned_to = public.current_profile_id();
$$;

-- ============================================================
-- RESIDENCES — réécriture de la politique de lecture
-- ============================================================
DROP POLICY IF EXISTS "residences_select" ON public.residences;
CREATE POLICY "residences_select" ON public.residences
  FOR SELECT TO authenticated
  USING (
    manager_id = (SELECT public.current_profile_id())
    OR id IN (SELECT public.my_residence_ids())
    OR id IN (SELECT public.assigned_residence_ids())
  );

-- ============================================================
-- APARTMENTS — réécriture des politiques
-- ============================================================
DROP POLICY IF EXISTS "apartments_select" ON public.apartments;
CREATE POLICY "apartments_select" ON public.apartments
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT public.current_profile_id())
    OR residence_id IN (SELECT public.managed_residence_ids())
    OR id IN (SELECT public.assigned_apartment_ids())
  );

DROP POLICY IF EXISTS "apartments_insert" ON public.apartments;
CREATE POLICY "apartments_insert" ON public.apartments
  FOR INSERT TO authenticated
  WITH CHECK (residence_id IN (SELECT public.managed_residence_ids()));

DROP POLICY IF EXISTS "apartments_update" ON public.apartments;
CREATE POLICY "apartments_update" ON public.apartments
  FOR UPDATE TO authenticated
  USING (residence_id IN (SELECT public.managed_residence_ids()))
  WITH CHECK (residence_id IN (SELECT public.managed_residence_ids()));

DROP POLICY IF EXISTS "apartments_delete" ON public.apartments;
CREATE POLICY "apartments_delete" ON public.apartments
  FOR DELETE TO authenticated
  USING (residence_id IN (SELECT public.managed_residence_ids()));

-- ============================================================
-- TICKETS — réécriture des politiques
-- ============================================================
DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
CREATE POLICY "tickets_select" ON public.tickets
  FOR SELECT TO authenticated
  USING (
    reported_by = (SELECT public.current_profile_id())
    OR assigned_to = (SELECT public.current_profile_id())
    OR apartment_id IN (SELECT public.managed_apartment_ids())
  );

DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    reported_by = (SELECT public.current_profile_id())
    AND (
      apartment_id IN (SELECT public.my_apartment_ids())
      OR apartment_id IN (SELECT public.managed_apartment_ids())
    )
  );

DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE TO authenticated
  USING (
    assigned_to = (SELECT public.current_profile_id())
    OR apartment_id IN (SELECT public.managed_apartment_ids())
  )
  WITH CHECK (
    assigned_to = (SELECT public.current_profile_id())
    OR apartment_id IN (SELECT public.managed_apartment_ids())
  );

DROP POLICY IF EXISTS "tickets_delete" ON public.tickets;
CREATE POLICY "tickets_delete" ON public.tickets
  FOR DELETE TO authenticated
  USING (apartment_id IN (SELECT public.managed_apartment_ids()));
