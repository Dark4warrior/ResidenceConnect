-- Migration 002 : Fonctions utilitaires + création automatique de profil
-- À exécuter APRÈS 001_initial_schema.sql et AVANT 003_rls_policies.sql

-- ============================================================
-- FONCTIONS UTILITAIRES pour le RLS
--
-- Ces deux fonctions sont en SECURITY DEFINER : elles s'exécutent
-- avec les droits du propriétaire (postgres) et CONTOURNENT le RLS.
-- C'est indispensable : sans ça, une politique sur "profiles" qui
-- interroge "profiles" provoquerait une récursion infinie.
--
-- search_path = '' force à qualifier chaque table (public.xxx) :
-- c'est une protection contre les attaques par détournement de schéma.
-- ============================================================

-- Renvoie l'id (profiles.id) de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid();
$$;

-- Renvoie le rôle (tenant / manager / technician) de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT role FROM public.profiles WHERE auth_user_id = auth.uid();
$$;

-- ============================================================
-- TRIGGER : création automatique du profil à l'inscription
--
-- Quand un utilisateur s'inscrit, Supabase crée une ligne dans
-- auth.users. Ce trigger lit les métadonnées passées par l'app
-- (full_name, role, phone) et crée automatiquement le profil.
--
-- Avantage : la création de profil contourne le RLS proprement,
-- et fonctionne même si la confirmation par email est activée.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, full_name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'tenant'),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

-- Déclenche handle_new_user() après chaque inscription
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
