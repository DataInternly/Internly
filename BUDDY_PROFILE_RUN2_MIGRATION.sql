-- INTERNLY — BUDDY_PROFILES RUN2 MIGRATION
-- Datum: 4 mei 2026
-- Context: RUN2 buddy-profile uitbreiding (1 mei 2026) voegt
-- vier nieuwe content-velden toe aan buddy_profiles voor de
-- saved-view-renderer in js/profileView.js.
--
-- Velden:
--   pitch         — korte bio-line zichtbaar in de profielkaart-strip
--   achtergrond   — loopbaan-tekst, vrije tekstsectie
--   bio           — "Wat ik te bieden heb", vrije tekstsectie
--   avatar_key    — referentie naar INTERNLY_AVATARS in js/avatar.js
--
-- Status: deze migratie is voor reproduceerbaarheid van het schema.
-- Productie-DB heeft deze kolommen al (geverifieerd via Supabase
-- SQL Editor vóór deze RUN2-deploy).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS — veilig om opnieuw te draaien.

ALTER TABLE buddy_profiles
  ADD COLUMN IF NOT EXISTS pitch text,
  ADD COLUMN IF NOT EXISTS achtergrond text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_key text;

SELECT 'buddy_profile_run2_migration_ready' AS status;
