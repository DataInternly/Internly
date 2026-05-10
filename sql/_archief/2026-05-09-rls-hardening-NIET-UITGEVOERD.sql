-- ARCHIVED 2026-05-09 — niet uitgevoerd
-- Reden: pg_policies query toonde dat alle UPDATE-policies
-- al WITH CHECK hebben en F1.3.G role-immutability al actief
-- is in profiles_update_own. Audit-bevindingen F1.3.A/G zijn
-- false-positives door migration-file-scan ipv DB-query.
-- Bewaard als referentie voor post-LT WITH CHECK + auth.uid
-- wrapping cleanup van 5 ALL policies + 38 unwrapped policies.

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS HARDENING — bundel pre-LT 11 mei 2026
-- Datum:  9 mei 2026
-- Auteur: Claude Code — MASTER_AUDIT_TRIAGE.md Bundel A
-- Bron:   internly_migration.sql regels 540-1007 (huidige policies)
--
-- WIJZIGINGEN T.O.V. ORIGINEEL:
--   1. WITH CHECK toegevoegd aan alle UPDATE-policies (F1.3.A — eigenaar-
--      overdracht voorkomen)
--   2. WITH CHECK toegevoegd aan alle FOR ALL-policies (F1.3.B — INSERT-pad)
--   3. profiles_update_own krijgt extra check op role-immutability (F1.3.G P0 —
--      voorkomt self-promotion naar admin)
--   4. Alle auth.uid() gewrapped als (select auth.uid()) (F1.3.D performance)
--   5. TO clauses expliciet (anon/authenticated) toegevoegd waar van toepassing
--
-- SEMANTIEK-INVARIANTEN:
--   • USING-clause behouden 1-op-1 met origineel
--   • WITH CHECK = USING tenzij anders gemarkeerd (eigenaar-overdracht block)
--   • Public-read policies (USING true) houden TO anon, authenticated
--
-- NIET INBEGREPEN (opzettelijk):
--   • F2.1.A roc_profile_id + F2.1.B meetings.match_id — kolommen bestaan al
--   • SQL_CLEANUP_DUPLICATE_POLICIES_DRAFT.sql — al uitgevoerd
--
-- WERKWIJZE:
--   1. Eerst PRE-CHECK queries draaien om huidige staat vast te leggen
--   2. Dit script in transactie draaien (BEGIN ... COMMIT;)
--   3. POST-CHECK queries draaien om te verifiëren
--   4. Bij issues: ROLLBACK; en review
-- ═══════════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────────────
-- PRE-CHECK — snapshot huidige staat (lees-only, draai apart vóór BEGIN)
-- ────────────────────────────────────────────────────────────────────────────
/*
-- Snapshot alle policies (verwacht ~50 rijen)
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- Verifieer F1.3.G voorvereiste — zelfde role per user
SELECT count(*) FROM profiles WHERE role IS NULL;
-- Verwacht: 0 (anders breekt role-immutability check voor null-role users)
*/


-- ────────────────────────────────────────────────────────────────────────────
-- TRANSACTIE START
-- ────────────────────────────────────────────────────────────────────────────
BEGIN;


-- ════════════════════════════════════════════════════════════════════════════
-- profiles
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "profiles_select_all"  ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON profiles;

-- SELECT: publieke leesbaarheid behouden (matchpool/discovery design-keuze).
-- AVG-impact gedocumenteerd in F1.3.C — adresseren via aparte view in week 1.
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- INSERT: alleen eigen rij. WITH CHECK voorkomt insert van rij voor andere user.
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- UPDATE: F1.3.G P0 — WITH CHECK voorkomt (a) id-wijziging en (b) role-promotie.
-- Role-immutability via subquery: nieuwe role moet matchen met huidige role.
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (
    id = (select auth.uid())
    AND role = (SELECT p2.role FROM profiles p2 WHERE p2.id = (select auth.uid()))
  );


-- ════════════════════════════════════════════════════════════════════════════
-- student_profiles
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "sp_select_all"   ON student_profiles;
DROP POLICY IF EXISTS "sp_insert_own"   ON student_profiles;
DROP POLICY IF EXISTS "sp_update_own"   ON student_profiles;

-- SELECT: publiek (matchpool). Zie F7.4.A — adresseren via column-RLS in week 1.
CREATE POLICY "sp_select_all" ON student_profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "sp_insert_own" ON student_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = (select auth.uid()));

-- UPDATE: WITH CHECK voorkomt overdracht naar andere profile_id (F1.3.A).
CREATE POLICY "sp_update_own" ON student_profiles
  FOR UPDATE
  TO authenticated
  USING (profile_id = (select auth.uid()))
  WITH CHECK (profile_id = (select auth.uid()));


-- ════════════════════════════════════════════════════════════════════════════
-- company_profiles
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cp_select_all"   ON company_profiles;
DROP POLICY IF EXISTS "cp_insert_own"   ON company_profiles;
DROP POLICY IF EXISTS "cp_update_own"   ON company_profiles;

CREATE POLICY "cp_select_all" ON company_profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "cp_insert_own" ON company_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = (select auth.uid()));

-- UPDATE: WITH CHECK voorkomt company-overdracht naar andere profile_id (F1.3.A).
CREATE POLICY "cp_update_own" ON company_profiles
  FOR UPDATE
  TO authenticated
  USING (profile_id = (select auth.uid()))
  WITH CHECK (profile_id = (select auth.uid()));


-- ════════════════════════════════════════════════════════════════════════════
-- school_profiles
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "school_p_select_all"   ON school_profiles;
DROP POLICY IF EXISTS "school_p_insert_own"   ON school_profiles;
DROP POLICY IF EXISTS "school_p_update_own"   ON school_profiles;

CREATE POLICY "school_p_select_all" ON school_profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "school_p_insert_own" ON school_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = (select auth.uid()));

-- UPDATE: WITH CHECK voorkomt school-overdracht naar andere profile_id (F1.3.A).
CREATE POLICY "school_p_update_own" ON school_profiles
  FOR UPDATE
  TO authenticated
  USING (profile_id = (select auth.uid()))
  WITH CHECK (profile_id = (select auth.uid()));


-- ════════════════════════════════════════════════════════════════════════════
-- internships
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "internships_select_all" ON internships;

-- SELECT: publieke browse — geen wijziging in semantiek.
CREATE POLICY "internships_select_all" ON internships
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ════════════════════════════════════════════════════════════════════════════
-- internship_postings
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "ip_select_active"  ON internship_postings;
DROP POLICY IF EXISTS "ip_insert_own"     ON internship_postings;
DROP POLICY IF EXISTS "ip_update_own"     ON internship_postings;
DROP POLICY IF EXISTS "ip_delete_own"     ON internship_postings;

-- SELECT: actieve postings publiek; eigen posting altijd zichtbaar.
-- TO anon, authenticated zodat publieke discovery werkt voor uitgelogde users.
CREATE POLICY "ip_select_active" ON internship_postings
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active' OR created_by = (select auth.uid()));

CREATE POLICY "ip_insert_own" ON internship_postings
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

-- UPDATE: WITH CHECK voorkomt overdracht naar andere created_by (F1.3.A).
CREATE POLICY "ip_update_own" ON internship_postings
  FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "ip_delete_own" ON internship_postings
  FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));


-- ════════════════════════════════════════════════════════════════════════════
-- matches
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "matches_select_party"    ON matches;
DROP POLICY IF EXISTS "matches_insert_auth"     ON matches;
DROP POLICY IF EXISTS "matches_update_party"    ON matches;

CREATE POLICY "matches_select_party" ON matches
  FOR SELECT
  TO authenticated
  USING (
    party_a = (select auth.uid()) OR
    party_b = (select auth.uid()) OR
    initiated_by = (select auth.uid()) OR
    praktijkbegeleider_profile_id = (select auth.uid())
  );

CREATE POLICY "matches_insert_auth" ON matches
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- UPDATE: WITH CHECK voorkomt party-overdracht (F1.3.A) — kritiek vector.
-- Originele USING: party_a OR party_b moet user zijn. WITH CHECK identiek
-- zodat na update user nog steeds party_a of party_b is.
CREATE POLICY "matches_update_party" ON matches
  FOR UPDATE
  TO authenticated
  USING (party_a = (select auth.uid()) OR party_b = (select auth.uid()))
  WITH CHECK (party_a = (select auth.uid()) OR party_b = (select auth.uid()));


-- ════════════════════════════════════════════════════════════════════════════
-- applications
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "app_select_own"   ON applications;
DROP POLICY IF EXISTS "app_insert_own"   ON applications;
DROP POLICY IF EXISTS "app_update_own"   ON applications;

CREATE POLICY "app_select_own" ON applications
  FOR SELECT
  TO authenticated
  USING (
    student_id = (select auth.uid()) OR
    profile_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM internship_postings ip
      WHERE ip.id = applications.posting_id
        AND ip.created_by = (select auth.uid())
    )
  );

CREATE POLICY "app_insert_own" ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = (select auth.uid()) OR profile_id = (select auth.uid())
  );

-- UPDATE: WITH CHECK = USING. Voorkomt dat user de eigen sollicitatie
-- doorschrijft naar andere student/profiel (F1.3.A).
CREATE POLICY "app_update_own" ON applications
  FOR UPDATE
  TO authenticated
  USING (
    student_id = (select auth.uid()) OR profile_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM internship_postings ip
      WHERE ip.id = applications.posting_id
        AND ip.created_by = (select auth.uid())
    )
  )
  WITH CHECK (
    student_id = (select auth.uid()) OR profile_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM internship_postings ip
      WHERE ip.id = applications.posting_id
        AND ip.created_by = (select auth.uid())
    )
  );


-- ════════════════════════════════════════════════════════════════════════════
-- conversations
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "conv_select_party"  ON conversations;
DROP POLICY IF EXISTS "conv_insert_auth"   ON conversations;

CREATE POLICY "conv_select_party" ON conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = conversations.match_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()))
    )
    OR
    EXISTS (
      SELECT 1 FROM buddy_pairs bp
      WHERE bp.id = conversations.buddy_pair_id
        AND (bp.requester_id = (select auth.uid()) OR bp.receiver_id = (select auth.uid()))
    )
  );

CREATE POLICY "conv_insert_auth" ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);


-- ════════════════════════════════════════════════════════════════════════════
-- messages
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "msg_select_party"  ON messages;
DROP POLICY IF EXISTS "msg_insert_own"    ON messages;
DROP POLICY IF EXISTS "msg_update_read"   ON messages;

CREATE POLICY "msg_select_party" ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN matches m ON m.id = c.match_id
      WHERE c.id = messages.conversation_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()))
    )
    OR
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN buddy_pairs bp ON bp.id = c.buddy_pair_id
      WHERE c.id = messages.conversation_id
        AND (bp.requester_id = (select auth.uid()) OR bp.receiver_id = (select auth.uid()))
    )
  );

CREATE POLICY "msg_insert_own" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (select auth.uid()));

-- UPDATE: WITH CHECK = USING. Voorkomt dat user message verplaatst naar
-- andere conversation (F1.3.A).
CREATE POLICY "msg_update_read" ON messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN matches m ON m.id = c.match_id
      WHERE c.id = messages.conversation_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN matches m ON m.id = c.match_id
      WHERE c.id = messages.conversation_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()))
    )
  );


-- ════════════════════════════════════════════════════════════════════════════
-- notifications
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "notif_select_own"   ON notifications;
DROP POLICY IF EXISTS "notif_insert_auth"  ON notifications;
DROP POLICY IF EXISTS "notif_update_own"   ON notifications;

CREATE POLICY "notif_select_own" ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "notif_insert_auth" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- UPDATE: WITH CHECK = USING. Voorkomt dat user notif doorschrijft naar
-- andere user_id (F1.3.A).
CREATE POLICY "notif_update_own" ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));


-- ════════════════════════════════════════════════════════════════════════════
-- buddy_pairs
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "bp_select_party"   ON buddy_pairs;
DROP POLICY IF EXISTS "bp_insert_auth"    ON buddy_pairs;
DROP POLICY IF EXISTS "bp_update_party"   ON buddy_pairs;

CREATE POLICY "bp_select_party" ON buddy_pairs
  FOR SELECT
  TO authenticated
  USING (requester_id = (select auth.uid()) OR receiver_id = (select auth.uid()));

CREATE POLICY "bp_insert_auth" ON buddy_pairs
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- UPDATE: WITH CHECK = USING. Voorkomt overdracht van buddy-pair (F1.3.A).
CREATE POLICY "bp_update_party" ON buddy_pairs
  FOR UPDATE
  TO authenticated
  USING (requester_id = (select auth.uid()) OR receiver_id = (select auth.uid()))
  WITH CHECK (requester_id = (select auth.uid()) OR receiver_id = (select auth.uid()));


-- ════════════════════════════════════════════════════════════════════════════
-- buddy_requests
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "breq_select_party"    ON buddy_requests;
DROP POLICY IF EXISTS "breq_insert_own"      ON buddy_requests;
DROP POLICY IF EXISTS "breq_update_receiver" ON buddy_requests;

CREATE POLICY "breq_select_party" ON buddy_requests
  FOR SELECT
  TO authenticated
  USING (requester_id = (select auth.uid()) OR receiver_id = (select auth.uid()));

CREATE POLICY "breq_insert_own" ON buddy_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = (select auth.uid()));

-- UPDATE: alleen receiver mag updaten (accepteren/weigeren). WITH CHECK = USING
-- zodat receiver de receiver_id niet kan wijzigen (F1.3.A).
CREATE POLICY "breq_update_receiver" ON buddy_requests
  FOR UPDATE
  TO authenticated
  USING (receiver_id = (select auth.uid()))
  WITH CHECK (receiver_id = (select auth.uid()));


-- ════════════════════════════════════════════════════════════════════════════
-- buddy_queue
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "bq_own" ON buddy_queue;

-- FOR ALL: WITH CHECK toegevoegd (F1.3.B). Voorkomt INSERT met andere user_id.
CREATE POLICY "bq_own" ON buddy_queue
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));


-- ════════════════════════════════════════════════════════════════════════════
-- meetings
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "meet_select_party"  ON meetings;
DROP POLICY IF EXISTS "meet_insert_auth"   ON meetings;
DROP POLICY IF EXISTS "meet_update_party"  ON meetings;

CREATE POLICY "meet_select_party" ON meetings
  FOR SELECT
  TO authenticated
  USING (organizer_id = (select auth.uid()) OR attendee_id = (select auth.uid()));

CREATE POLICY "meet_insert_auth" ON meetings
  FOR INSERT
  TO authenticated
  WITH CHECK (organizer_id = (select auth.uid()));

-- UPDATE: WITH CHECK = USING. Voorkomt overdracht van meeting naar andere
-- organizer/attendee (F1.3.A).
CREATE POLICY "meet_update_party" ON meetings
  FOR UPDATE
  TO authenticated
  USING (organizer_id = (select auth.uid()) OR attendee_id = (select auth.uid()))
  WITH CHECK (organizer_id = (select auth.uid()) OR attendee_id = (select auth.uid()));


-- ════════════════════════════════════════════════════════════════════════════
-- availability
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "avail_select_all"  ON availability;
DROP POLICY IF EXISTS "avail_write_own"   ON availability;
DROP POLICY IF EXISTS "avail_delete_own"  ON availability;

-- SELECT: publiek (calendar.js leest andermans slots — design-keuze).
CREATE POLICY "avail_select_all" ON availability
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "avail_write_own" ON availability
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "avail_delete_own" ON availability
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));


-- ════════════════════════════════════════════════════════════════════════════
-- reviews — bestaande WITH CHECK behouden, alleen auth.uid() wrapping
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "rev_select_public"             ON reviews;
DROP POLICY IF EXISTS "rev_insert_own"                ON reviews;
DROP POLICY IF EXISTS "rev_update_reviewer"           ON reviews;
DROP POLICY IF EXISTS "rev_delete_admin"              ON reviews;
DROP POLICY IF EXISTS "reviews_select_public"         ON reviews;
DROP POLICY IF EXISTS "reviews_insert_match_gated"    ON reviews;
DROP POLICY IF EXISTS "reviews_update_own"            ON reviews;
DROP POLICY IF EXISTS "reviews_update_company_reply"  ON reviews;
DROP POLICY IF EXISTS "reviews_update_flag"           ON reviews;
DROP POLICY IF EXISTS "reviews_delete_admin"          ON reviews;

-- SELECT: unflagged publiek, flagged alleen voor eigen reviewer.
CREATE POLICY "reviews_select_public" ON reviews
  FOR SELECT
  TO anon, authenticated
  USING (
    flagged = false
    OR ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = reviewer_id)
  );

-- INSERT: match-gated; self-review verboden. WITH CHECK reeds aanwezig.
CREATE POLICY "reviews_insert_match_gated" ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = reviewer_id
    AND reviewer_id != reviewee_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
        AND m.status IN ('accepted', 'completed')
        AND (
          (m.party_a = (select auth.uid()) AND m.party_b = reviewee_id)
          OR
          (m.party_b = (select auth.uid()) AND m.party_a = reviewee_id)
        )
    )
  );

-- UPDATE: reviewer mag eigen review wijzigen.
CREATE POLICY "reviews_update_own" ON reviews
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = reviewer_id)
  WITH CHECK ((select auth.uid()) = reviewer_id);

-- UPDATE: reviewee (bedrijf) mag company_reply zetten.
CREATE POLICY "reviews_update_company_reply" ON reviews
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = reviewee_id)
  WITH CHECK ((select auth.uid()) = reviewee_id);

-- UPDATE: iedere authenticated user mag een review flaggen.
CREATE POLICY "reviews_update_flag" ON reviews
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    flagged = true
    AND flagged_by = (select auth.uid())
    AND flagged_at IS NOT NULL
  );

-- DELETE: alleen admin (hallo@internly.pro).
CREATE POLICY "reviews_delete_admin" ON reviews
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND email = 'hallo@internly.pro')
  );


-- ════════════════════════════════════════════════════════════════════════════
-- waitlist
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "wl_insert_public"  ON waitlist;
DROP POLICY IF EXISTS "wl_select_own"     ON waitlist;
DROP POLICY IF EXISTS "wl_update_own"     ON waitlist;
DROP POLICY IF EXISTS "wl_admin_all"      ON waitlist;

-- INSERT: publieke signup — anon EN authenticated mogen toevoegen.
CREATE POLICY "wl_insert_public" ON waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "wl_select_own" ON waitlist
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = (select auth.uid())) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND email = 'hallo@internly.pro')
  );

-- UPDATE: WITH CHECK = USING. Voorkomt dat user andermans waitlist-rij
-- aan zichzelf toewijst (F1.3.A).
CREATE POLICY "wl_update_own" ON waitlist
  FOR UPDATE
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
  )
  WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
  );

-- FOR ALL admin: WITH CHECK = USING (F1.3.B).
CREATE POLICY "wl_admin_all" ON waitlist
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND email = 'hallo@internly.pro')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND email = 'hallo@internly.pro')
  );


-- ════════════════════════════════════════════════════════════════════════════
-- stage_plans
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "splan_select_match"   ON stage_plans;
DROP POLICY IF EXISTS "splan_write_match"    ON stage_plans;

CREATE POLICY "splan_select_match" ON stage_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_plans.match_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()) OR m.praktijkbegeleider_profile_id = (select auth.uid()))
    )
  );

-- FOR ALL: WITH CHECK = USING (F1.3.B). USING beperkt tot party_a/b
-- (begeleider mag lezen via SELECT-policy, niet schrijven). WITH CHECK
-- voorkomt INSERT met match_id van match waar user geen partij is.
CREATE POLICY "splan_write_match" ON stage_plans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_plans.match_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_plans.match_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()))
    )
  );


-- ════════════════════════════════════════════════════════════════════════════
-- stage_leerdoelen
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "sleer_match_party" ON stage_leerdoelen;

-- FOR ALL: WITH CHECK = USING (F1.3.B).
CREATE POLICY "sleer_match_party" ON stage_leerdoelen
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_leerdoelen.match_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()) OR m.praktijkbegeleider_profile_id = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_leerdoelen.match_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()) OR m.praktijkbegeleider_profile_id = (select auth.uid()))
    )
  );


-- ════════════════════════════════════════════════════════════════════════════
-- stage_deadlines
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "sdead_match_party" ON stage_deadlines;

-- FOR ALL: WITH CHECK = USING (F1.3.B).
CREATE POLICY "sdead_match_party" ON stage_deadlines
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_deadlines.match_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()) OR m.praktijkbegeleider_profile_id = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_deadlines.match_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()) OR m.praktijkbegeleider_profile_id = (select auth.uid()))
    )
  );


-- ════════════════════════════════════════════════════════════════════════════
-- stage_tasks
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "stask_match_party" ON stage_tasks;

-- FOR ALL: WITH CHECK = USING (F1.3.B).
CREATE POLICY "stask_match_party" ON stage_tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_tasks.match_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()) OR m.praktijkbegeleider_profile_id = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_tasks.match_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()) OR m.praktijkbegeleider_profile_id = (select auth.uid()))
    )
  );


-- ════════════════════════════════════════════════════════════════════════════
-- stage_reflecties
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "srefl_match_party" ON stage_reflecties;

-- FOR ALL: WITH CHECK = USING (F1.3.B).
CREATE POLICY "srefl_match_party" ON stage_reflecties
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_reflecties.match_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()) OR m.praktijkbegeleider_profile_id = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_reflecties.match_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()) OR m.praktijkbegeleider_profile_id = (select auth.uid()))
    )
  );


-- ════════════════════════════════════════════════════════════════════════════
-- stage_log
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "slog_match_party" ON stage_log;

-- FOR ALL: WITH CHECK = USING (F1.3.B).
CREATE POLICY "slog_match_party" ON stage_log
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_log.match_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()) OR m.praktijkbegeleider_profile_id = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = stage_log.match_id
        AND (m.party_a = (select auth.uid()) OR m.party_b = (select auth.uid()) OR m.praktijkbegeleider_profile_id = (select auth.uid()))
    )
  );


-- ════════════════════════════════════════════════════════════════════════════
-- company_doorstroom
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cdoor_select_all"  ON company_doorstroom;
DROP POLICY IF EXISTS "cdoor_write_own"   ON company_doorstroom;

-- SELECT: publiek (doorstroom-statistieken zichtbaar voor scholen/studenten).
CREATE POLICY "cdoor_select_all" ON company_doorstroom
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- FOR ALL: WITH CHECK = USING (F1.3.B). Voorkomt dat bedrijf doorstroom
-- onder andere company_id schrijft.
CREATE POLICY "cdoor_write_own" ON company_doorstroom
  FOR ALL
  TO authenticated
  USING (company_id = (select auth.uid()))
  WITH CHECK (company_id = (select auth.uid()));


-- ════════════════════════════════════════════════════════════════════════════
-- push_subscriptions
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "push_own" ON push_subscriptions;

-- FOR ALL: WITH CHECK = USING (F1.3.B). Voorkomt dat user push-subscriptie
-- onder andere user_id registreert (cross-account leak vector — F7.6.A).
CREATE POLICY "push_own" ON push_subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));


-- ════════════════════════════════════════════════════════════════════════════
-- school_postings
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "sp2_select_active"  ON school_postings;
DROP POLICY IF EXISTS "sp2_write_own"      ON school_postings;

-- SELECT: actieve postings publiek; eigen posting altijd zichtbaar.
CREATE POLICY "sp2_select_active" ON school_postings
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active' OR created_by = (select auth.uid()));

-- FOR ALL: WITH CHECK = USING (F1.3.B). Voorkomt dat school posting
-- onder andere created_by schrijft.
CREATE POLICY "sp2_write_own" ON school_postings
  FOR ALL
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));


-- ────────────────────────────────────────────────────────────────────────────
-- TRANSACTIE EINDE
-- ────────────────────────────────────────────────────────────────────────────
COMMIT;


-- ────────────────────────────────────────────────────────────────────────────
-- POST-CHECK — verifieer resultaat (lees-only, draai apart na COMMIT)
-- ────────────────────────────────────────────────────────────────────────────
/*
-- 1. Alle UPDATE/ALL policies hebben WITH CHECK
SELECT tablename, policyname, cmd, with_check IS NOT NULL AS has_check
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd IN ('UPDATE', 'ALL')
ORDER BY tablename, policyname;
-- Verwacht: alle has_check = true

-- 2. Geen policy gebruikt nog onverpakte auth.uid() — verwacht 0 rijen
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual ~ 'auth\.uid\(\)(?!\s*\))' OR with_check ~ 'auth\.uid\(\)(?!\s*\))');

-- 3. profiles_update_own role-immutability check werkt
-- Test als willekeurige authenticated user:
--   UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
-- Verwacht: 0 rows updated (WITH CHECK blokkeert)

-- 4. Tel totaal aantal policies
SELECT count(*) FROM pg_policies WHERE schemaname = 'public';
-- Verwacht: zelfde aantal als pre-check (geen verloren policies)
*/
