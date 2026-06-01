-- ============================================================
-- Données de TEST (seed) — à exécuter manuellement dans le SQL Editor.
-- Ce fichier n'est PAS une migration : il sert uniquement à créer
-- des données de démonstration pour tester l'application.
--
-- ⚠️ AVANT D'EXÉCUTER : remplace les deux emails ci-dessous
--    par tes comptes réels (créés via l'inscription dans l'app).
-- ============================================================

DO $$
DECLARE
  -- 👇 MODIFIE CES DEUX LIGNES
  v_tenant_email  TEXT := 'laleyesteven@gmail.com';   -- ton compte LOCATAIRE
  v_manager_email TEXT := 'laleyesteven@gmail.com';   -- ton compte GESTIONNAIRE
                                                       -- (si tu n'en as pas encore,
                                                       --  laisse l'email du locataire)

  v_tenant_id    UUID;
  v_manager_id   UUID;
  v_residence_id UUID;
BEGIN
  -- Récupère les profils à partir des emails (table auth.users)
  SELECT p.id INTO v_tenant_id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.auth_user_id
  WHERE u.email = v_tenant_email;

  SELECT p.id INTO v_manager_id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.auth_user_id
  WHERE u.email = v_manager_email;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Aucun profil trouvé pour le locataire : %', v_tenant_email;
  END IF;
  IF v_manager_id IS NULL THEN
    RAISE EXCEPTION 'Aucun profil trouvé pour le gestionnaire : %', v_manager_email;
  END IF;

  -- Crée une résidence
  INSERT INTO public.residences (name, address, city, postal_code, manager_id)
  VALUES ('Résidence Les Tilleuls', '12 rue des Tilleuls', 'Paris', '75011', v_manager_id)
  RETURNING id INTO v_residence_id;

  -- Crée un logement rattaché au locataire
  INSERT INTO public.apartments (residence_id, unit_number, floor, tenant_id)
  VALUES (v_residence_id, 'A12', '3', v_tenant_id);

  RAISE NOTICE 'Seed OK : logement A12 (Résidence Les Tilleuls) rattaché au locataire %', v_tenant_email;
END $$;
