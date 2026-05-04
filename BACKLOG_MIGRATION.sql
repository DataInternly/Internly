-- INTERNLY — BACKLOG MIGRATION
-- Datum: 30 april 2026

-- Item 1: zoekt_buddy toggle
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS zoekt_buddy boolean
  DEFAULT false;

-- Item 4: avatar_key op profiles (voor begeleider)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_key text;

SELECT 'backlog_migration_ready' AS status;
