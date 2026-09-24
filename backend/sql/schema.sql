-- =============================================================================
-- EventHub — schema.sql
-- Idempotent : peut etre rejoue sans erreur (DROP IF EXISTS en cascade).
-- Extension pgcrypto requise pour gen_random_uuid().
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extension
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Suppression dans l ordre inverse des FK (idempotence)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS registrations  CASCADE;
DROP TABLE IF EXISTS participants    CASCADE;
DROP TABLE IF EXISTS events          CASCADE;
DROP TABLE IF EXISTS users           CASCADE;

-- ---------------------------------------------------------------------------
-- Trigger function : met a jour updated_at automatiquement
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- TABLE : users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(150) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(10)  NOT NULL CHECK (role IN ('admin', 'staff')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT uq_users_email UNIQUE (email)
);

-- ---------------------------------------------------------------------------
-- TABLE : events
-- ---------------------------------------------------------------------------
CREATE TABLE events (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  location         VARCHAR(255),
  event_date       TIMESTAMPTZ  NOT NULL,
  max_participants INTEGER      NOT NULL CHECK (max_participants > 0),
  status           VARCHAR(20)  NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'published', 'cancelled')),
  created_by       UUID         NOT NULL
                                REFERENCES users(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Trigger updated_at sur events
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLE : participants
-- ---------------------------------------------------------------------------
CREATE TABLE participants (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  VARCHAR(150) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  phone      VARCHAR(30),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT uq_participants_email UNIQUE (email)
);

-- ---------------------------------------------------------------------------
-- TABLE : registrations
-- ---------------------------------------------------------------------------
CREATE TABLE registrations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID        NOT NULL
                             REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID        NOT NULL
                             REFERENCES participants(id) ON DELETE CASCADE,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_registrations_event_participant UNIQUE (event_id, participant_id)
);

-- ---------------------------------------------------------------------------
-- INDEX
-- ---------------------------------------------------------------------------

-- events
CREATE INDEX idx_events_status     ON events (status);
CREATE INDEX idx_events_event_date ON events (event_date);

-- registrations
CREATE INDEX idx_registrations_event_status ON registrations (event_id, status);
CREATE INDEX idx_registrations_participant  ON registrations (participant_id);
CREATE INDEX idx_registrations_created_at  ON registrations (created_at);

-- participants — index d expression insensible a la casse pour l email
CREATE UNIQUE INDEX idx_participants_email_lower ON participants (lower(email));
CREATE INDEX        idx_participants_full_name   ON participants (full_name);

-- =============================================================================
-- FIN DU SCHEMA
-- =============================================================================
