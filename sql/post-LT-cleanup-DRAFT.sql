-- ════════════════════════════════════════════════════════
-- POST-LT TEST-DATA CLEANUP (DRAFT)
-- Te draaien NA 13 mei 2026, 17:00 (LT-eind)
-- VEREIST: Pa-akkoord + 7 dagen wachten op tester-feedback
-- VEREIST: aanpassen tester-email-pattern naar werkelijke conventie
-- ════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────
-- 1. Identificeer test-tester accounts via email-pattern
-- LET OP: pas pattern aan vóór run.
--   Voorgestelde conventie: lt2026-test-N@internly.pro (N=1..5)
--   Of: %.tester@internly.pro
-- ────────────────────────────────────────────────────────
WITH lt_testers AS (
  SELECT id, email FROM auth.users
  WHERE email LIKE 'lt2026-%@internly.pro'
     OR email LIKE '%.tester@internly.pro'
)
SELECT count(*) AS tester_accounts_to_delete FROM lt_testers;
-- Verwacht: 5 (de 5 LT-testers)
-- Indien anders → STOP, controleer email-pattern.

-- ────────────────────────────────────────────────────────
-- 2. Bewaar samenvattings-stats VÓÓR cleanup
-- (TODO: vul echte waardes in op basis van Supabase dashboard
--  vóór deze cleanup wordt gecommit)
-- ────────────────────────────────────────────────────────
-- INSERT INTO _lt_metrics (period, metric, value)
-- VALUES
--   ('LT-2026-05-11', 'total_signups',  TBD),
--   ('LT-2026-05-11', 'total_matches',  TBD),
--   ('LT-2026-05-11', 'total_messages', TBD),
--   ('LT-2026-05-11', 'total_meetings', TBD),
--   ('LT-2026-05-11', 'total_reviews',  TBD);

-- ────────────────────────────────────────────────────────
-- 3. CASCADE deletion zorgt automatisch voor cleanup van:
--    - student_profiles, company_profiles, school_profiles
--    - matches, applications, messages, conversations
--    - notifications, push_subscriptions, swipes
--    - meetings, reviews, evaluations
--   (per FK ON DELETE CASCADE configuration in migrations)
--
-- VOOR run: verifieer cascade-rules in Supabase dashboard
-- ────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────
-- 4. Voer DELETE uit (uncomment NA Pa-akkoord)
-- ────────────────────────────────────────────────────────
-- DELETE FROM auth.users WHERE id IN (
--   SELECT id FROM auth.users
--   WHERE email LIKE 'lt2026-%@internly.pro'
--      OR email LIKE '%.tester@internly.pro'
-- );

-- ────────────────────────────────────────────────────────
-- 5. Verifieer cleanup
-- ────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM auth.users
     WHERE email LIKE 'lt2026-%@internly.pro'
        OR email LIKE '%.tester@internly.pro')
    AS remaining_test_users,
  (SELECT count(*) FROM matches)        AS total_matches,
  (SELECT count(*) FROM messages)       AS total_messages,
  (SELECT count(*) FROM notifications)  AS total_notifications;

-- ────────────────────────────────────────────────────────
-- 6. Cleanup van orphan-records (indien CASCADE incompleet)
-- ────────────────────────────────────────────────────────
-- DELETE FROM messages WHERE sender_id NOT IN (SELECT id FROM auth.users);
-- DELETE FROM notifications WHERE user_id NOT IN (SELECT id FROM auth.users);
-- DELETE FROM push_subscriptions WHERE user_id NOT IN (SELECT id FROM auth.users);

-- ────────────────────────────────────────────────────────
-- 7. Bevestig en commit
--    Bij twijfel: ROLLBACK (geen werk verloren)
-- ────────────────────────────────────────────────────────
COMMIT;
-- ROLLBACK;  -- Use indien iets niet klopt

-- ════════════════════════════════════════════════════════
-- POST-RUN VERIFICATIE (handmatig na COMMIT)
-- ════════════════════════════════════════════════════════
-- 1. Telling test-users → 0
-- 2. Geen orphans in dependent-tabellen
-- 3. Real production data intact (Pa, Barry, demo-bedrijven)
-- 4. Supabase Storage: tester-uploads in avatars/ bucket
--    handmatig opgeruimd (geen automatische cascade)
