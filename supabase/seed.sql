-- ============================================================
-- SEED de démonstration — ResidenceConnect
-- À exécuter MANUELLEMENT dans le SQL Editor de Supabase.
-- Ce n'est PAS une migration : uniquement des données de démo.
--
-- PRÉREQUIS (une seule fois) : créer 3 comptes via
--   Dashboard > Authentication > Users > Add user
--   (cocher « Auto Confirm User »), avec ces emails :
--     • manager@residenceconnect.dev     (gestionnaire)
--     • tenant@residenceconnect.dev      (locataire)
--     • technicien@residenceconnect.dev  (technicien)
--   Mot de passe suggéré : Demo1234!
--
-- Le trigger handle_new_user crée automatiquement un profil (rôle
-- « tenant » par défaut). Ce script FORCE ensuite les bons rôles,
-- puis peuple des données réalistes. Il est IDEMPOTENT : on peut le
-- relancer sans créer de doublons.
-- ============================================================

DO $$
DECLARE
  v_manager_email    TEXT := 'manager@residenceconnect.dev';
  v_tenant_email     TEXT := 'tenant@residenceconnect.dev';
  v_technician_email TEXT := 'technicien@residenceconnect.dev';

  v_manager_id    UUID;
  v_tenant_id     UUID;
  v_technician_id UUID;
  v_residence_id  UUID;
  v_apt_a12       UUID;
  v_apt_b03       UUID;
  v_ticket_resolved UUID;
  v_ticket_progress UUID;
BEGIN
  -- ---------- 1. Récupération des profils par email ----------
  SELECT p.id INTO v_manager_id
  FROM public.profiles p JOIN auth.users u ON u.id = p.auth_user_id
  WHERE u.email = v_manager_email;

  SELECT p.id INTO v_tenant_id
  FROM public.profiles p JOIN auth.users u ON u.id = p.auth_user_id
  WHERE u.email = v_tenant_email;

  SELECT p.id INTO v_technician_id
  FROM public.profiles p JOIN auth.users u ON u.id = p.auth_user_id
  WHERE u.email = v_technician_email;

  IF v_manager_id IS NULL OR v_tenant_id IS NULL OR v_technician_id IS NULL THEN
    RAISE EXCEPTION 'Comptes manquants. Crée d''abord les 3 users (manager/tenant/technicien) via Authentication > Add user. Trouvés : manager=%, tenant=%, technicien=%',
      v_manager_id, v_tenant_id, v_technician_id;
  END IF;

  -- ---------- 2. Forcer les rôles et compléter les profils ----------
  UPDATE public.profiles SET role = 'manager',
    full_name = COALESCE(NULLIF(full_name, ''), 'Marc Gestionnaire'),
    phone = COALESCE(phone, '0600000001')
  WHERE id = v_manager_id;

  UPDATE public.profiles SET role = 'tenant',
    full_name = COALESCE(NULLIF(full_name, ''), 'Camille Locataire'),
    phone = COALESCE(phone, '0600000002')
  WHERE id = v_tenant_id;

  UPDATE public.profiles SET role = 'technician',
    full_name = COALESCE(NULLIF(full_name, ''), 'Lucas Technicien'),
    phone = COALESCE(phone, '0600000003')
  WHERE id = v_technician_id;

  -- ---------- 3. Nettoyage des données de démo précédentes ----------
  -- (les tickets/logements/historique/notifs partent en cascade)
  DELETE FROM public.residences WHERE name = 'Résidence Les Tilleuls'
    AND manager_id = v_manager_id;

  -- ---------- 4. Résidence + logements ----------
  INSERT INTO public.residences (name, address, city, postal_code, manager_id)
  VALUES ('Résidence Les Tilleuls', '12 rue des Tilleuls', 'Lyon', '69003', v_manager_id)
  RETURNING id INTO v_residence_id;

  INSERT INTO public.apartments (residence_id, unit_number, floor, tenant_id)
  VALUES (v_residence_id, 'A12', '3', v_tenant_id)
  RETURNING id INTO v_apt_a12;

  INSERT INTO public.apartments (residence_id, unit_number, floor, tenant_id)
  VALUES (v_residence_id, 'B03', '0', v_tenant_id)
  RETURNING id INTO v_apt_b03;

  INSERT INTO public.apartments (residence_id, unit_number, floor, tenant_id)
  VALUES (v_residence_id, 'C07', '5', NULL); -- logement vacant

  -- ---------- 5. Tickets variés (analytics parlantes) ----------
  -- a) Résolu (permet un délai moyen de résolution)
  INSERT INTO public.tickets
    (apartment_id, reported_by, assigned_to, title, description, category,
     urgency_level, status, created_at, updated_at, resolved_at)
  VALUES
    (v_apt_a12, v_tenant_id, v_technician_id,
     'Fuite sous l''évier', 'De l''eau s''écoule en continu sous l''évier de la cuisine.',
     'plumbing', 'high', 'resolved',
     NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days')
  RETURNING id INTO v_ticket_resolved;

  -- b) En cours, assigné
  INSERT INTO public.tickets
    (apartment_id, reported_by, assigned_to, title, description, category,
     urgency_level, status, created_at, updated_at)
  VALUES
    (v_apt_a12, v_tenant_id, v_technician_id,
     'Panne de courant partielle', 'Plus d''électricité dans deux pièces depuis ce matin.',
     'electricity', 'critical', 'in_progress',
     NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 days')
  RETURNING id INTO v_ticket_progress;

  -- c) En attente, non assigné
  INSERT INTO public.tickets
    (apartment_id, reported_by, title, description, category, urgency_level, status, created_at, updated_at)
  VALUES
    (v_apt_b03, v_tenant_id,
     'Ascenseur bloqué au RDC', 'L''ascenseur ne répond plus, portes ouvertes au rez-de-chaussée.',
     'elevator', 'critical', 'pending',
     NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours');

  INSERT INTO public.tickets
    (apartment_id, reported_by, title, description, category, urgency_level, status, created_at, updated_at)
  VALUES
    (v_apt_a12, v_tenant_id,
     'Ampoule grillée dans le couloir', 'L''ampoule du couloir du 3e étage ne fonctionne plus.',
     'other', 'low', 'pending',
     NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 days');

  -- ---------- 6. Historique d'audit ----------
  INSERT INTO public.ticket_history (ticket_id, changed_by, old_status, new_status, comment, changed_at)
  VALUES
    (v_ticket_resolved, v_technician_id, 'pending', 'in_progress',
     'Intervention planifiée.', NOW() - INTERVAL '5 days' + INTERVAL '2 hours'),
    (v_ticket_resolved, v_technician_id, 'in_progress', 'resolved',
     'Joint remplacé, fuite stoppée.', NOW() - INTERVAL '4 days'),
    (v_ticket_progress, v_technician_id, 'pending', 'in_progress',
     'Diagnostic en cours sur le tableau électrique.', NOW() - INTERVAL '1 days');

  -- ---------- 7. Notifications (pour le locataire) ----------
  INSERT INTO public.notifications (user_id, ticket_id, type, message, is_read, created_at)
  VALUES
    (v_tenant_id, v_ticket_resolved, 'ticket_resolved',
     'Votre signalement « Fuite sous l''évier » a été résolu.', FALSE, NOW() - INTERVAL '4 days'),
    (v_tenant_id, v_ticket_progress, 'status_changed',
     'Votre signalement « Panne de courant partielle » est passé au statut : En cours.', FALSE, NOW() - INTERVAL '1 days');

  RAISE NOTICE 'Seed OK : résidence + 3 logements + 4 tickets + historique + notifications créés.';
END $$;
