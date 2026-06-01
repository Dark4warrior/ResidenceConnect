-- Migration 001 : Schéma initial ResidenceConnect
-- Tables créées sans RLS — les politiques seront ajoutées dans 002_rls_policies.sql

-- Extension UUID (déjà activée par défaut sur Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE : profiles
-- Étend auth.users de Supabase avec les infos métier
-- ============================================================
CREATE TABLE profiles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('tenant', 'manager', 'technician')),
  phone        TEXT,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (auth_user_id)
);

-- ============================================================
-- TABLE : residences
-- Immeubles gérés par un gestionnaire
-- ============================================================
CREATE TABLE residences (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  address     TEXT NOT NULL,
  city        TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  manager_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE : apartments
-- Logements dans une résidence, associés à un locataire
-- ============================================================
CREATE TABLE apartments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  residence_id UUID NOT NULL REFERENCES residences(id) ON DELETE CASCADE,
  unit_number  TEXT NOT NULL,
  floor        TEXT,
  tenant_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE : tickets
-- Cœur du système — signalements d'incidents
-- ============================================================
CREATE TABLE tickets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  apartment_id  UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  reported_by   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  assigned_to   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('plumbing', 'electricity', 'elevator', 'other')),
  urgency_level TEXT NOT NULL CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at   TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- TABLE : ticket_photos
-- Photos jointes à un ticket (stockées dans Supabase Storage)
-- ============================================================
CREATE TABLE ticket_photos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id    UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url          TEXT NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE : ticket_history
-- Journal d'audit de chaque changement de statut
-- ============================================================
CREATE TABLE ticket_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  changed_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  old_status  TEXT NOT NULL CHECK (old_status IN ('pending', 'in_progress', 'resolved')),
  new_status  TEXT NOT NULL CHECK (new_status IN ('pending', 'in_progress', 'resolved')),
  comment     TEXT,
  changed_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE : notifications
-- Alertes générées pour chaque événement important
-- ============================================================
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_id  UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('ticket_created', 'ticket_assigned', 'status_changed', 'ticket_resolved')),
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE : push_tokens
-- Tokens Expo Push pour les notifications iOS/Android
-- ============================================================
CREATE TABLE push_tokens (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expo_push_token  TEXT NOT NULL,
  platform         TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (expo_push_token)
);

-- ============================================================
-- INDEX — accélèrent les requêtes fréquentes
-- ============================================================
CREATE INDEX idx_tickets_apartment_id    ON tickets(apartment_id);
CREATE INDEX idx_tickets_reported_by     ON tickets(reported_by);
CREATE INDEX idx_tickets_assigned_to     ON tickets(assigned_to);
CREATE INDEX idx_tickets_status          ON tickets(status);
CREATE INDEX idx_tickets_urgency_level   ON tickets(urgency_level);
CREATE INDEX idx_tickets_created_at      ON tickets(created_at DESC);
CREATE INDEX idx_apartments_residence_id ON apartments(residence_id);
CREATE INDEX idx_apartments_tenant_id    ON apartments(tenant_id);
CREATE INDEX idx_ticket_photos_ticket_id ON ticket_photos(ticket_id);
CREATE INDEX idx_ticket_history_ticket_id ON ticket_history(ticket_id);
CREATE INDEX idx_notifications_user_id   ON notifications(user_id);
CREATE INDEX idx_notifications_is_read   ON notifications(user_id, is_read);
CREATE INDEX idx_push_tokens_user_id     ON push_tokens(user_id);

-- ============================================================
-- TRIGGER — met à jour updated_at automatiquement sur tickets
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
