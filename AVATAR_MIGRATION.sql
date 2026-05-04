-- INTERNLY — AVATAR MIGRATION
-- Datum: 30 april 2026
-- Run in Supabase SQL Editor BEFORE avatar saving works.
-- Picker UI works without this (saves null).

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS avatar_key text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS avatar_key text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE school_profiles
  ADD COLUMN IF NOT EXISTS avatar_key text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE buddy_queue
  ADD COLUMN IF NOT EXISTS avatar_key text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_name = 'bbl_student_profiles') THEN
    EXECUTE 'ALTER TABLE bbl_student_profiles
      ADD COLUMN IF NOT EXISTS avatar_key text,
      ADD COLUMN IF NOT EXISTS avatar_url text';
  END IF;
END $$;

SELECT 'avatar_migration_ready' AS status;
