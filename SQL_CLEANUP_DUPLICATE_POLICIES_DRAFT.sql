-- ═══════════════════════════════════════════════════════════════════════════
-- DRAFT — Duplicate RLS Policy Cleanup Bundel
-- Status:  REQUIRES BARRY APPROVAL vóór uitvoering
-- Auteur:  Claude Code — All-Hands Council audit 22 april 2026
-- Bron:    7/11's aanbeveling, Layer 3 audit, All-Hands audit item 9
--
-- WERKWIJZE:
--   1. Voer eerst de "PRE-CHECK" queries uit (lees-only)
--   2. Review de resultaten
--   3. Uncomment alleen de DROP-statements die je zeker wilt verwijderen
--   4. Voer uit in BEGIN; … COMMIT; wrapper (Garcia2's patroon)
-- ═══════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- STAP 0 — PRE-CHECK: snapshot huidige staat
-- ────────────────────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('matches', 'notifications', 'buddy_requests')
ORDER BY tablename, cmd, policyname;


-- ────────────────────────────────────────────────────────────────────────────
-- TABEL: matches (6 policies — 3 duplicate paren)
-- ────────────────────────────────────────────────────────────────────────────
-- Duplicate paren (geïdentificeerd Layer 3 + All-Hands):
--
--   INSERT: "matches_insert_party"  vs  "own insert matches"
--           → behoud: matches_insert_party (heeft WITH CHECK op party_a OR party_b)
--
--   SELECT: "matches_select_party"  vs  "own read matches"
--           → behoud: matches_select_party
--
--   UPDATE: "matches_update_party"  vs  "own update matches"
--           → behoud: matches_update_party

-- DROP POLICY "own insert matches" ON matches;
-- DROP POLICY "own read matches"   ON matches;
-- DROP POLICY "own update matches" ON matches;


-- ────────────────────────────────────────────────────────────────────────────
-- TABEL: notifications (4 policies — ALL-beleid overlapt CMD-specifieke)
-- ────────────────────────────────────────────────────────────────────────────
-- "Users manage own notifications" (ALL) overlapt met:
--   notif_insert_auth (INSERT) + notif_select_own (SELECT) + notif_update_own (UPDATE)
-- → behoud de drie specifieke CMD-policies, drop de ALL-variant

-- DROP POLICY "Users manage own notifications" ON notifications;


-- ────────────────────────────────────────────────────────────────────────────
-- TABEL: buddy_requests (8 policies — 3 sets duplicaten)
-- ────────────────────────────────────────────────────────────────────────────
-- INSERT duplicaat:
--   "breq_insert_own"  vs  "buddy_requests: zelf aanmaken"
--   → behoud: breq_insert_own (genormaliseerde naming)

-- SELECT duplicaat:
--   "breq_select_party"  vs  "buddy_requests: eigen rijen lezen"
--   → behoud: breq_select_party

-- UPDATE drievoudige overlap (RECEIVER):
--   "breq_update_receiver"
--   "buddy_requests: ontvanger mag accepteren"
--   "buddy_requests: ontvanger mag accepteren/afwijzen"
--   → behoud: breq_update_receiver (genormaliseerd)
--   ⚠️ ZORG dat breq_update_receiver ALLE statussen dekt (accepted + rejected)
--      vóór de andere twee te droppen

-- UPDATE requester (enige in zijn soort — NIET droppen):
--   "buddy_requests: requester mag intrekken"  → BEHOUDEN

-- DROP POLICY "buddy_requests: zelf aanmaken"                   ON buddy_requests;
-- DROP POLICY "buddy_requests: eigen rijen lezen"               ON buddy_requests;
-- DROP POLICY "buddy_requests: ontvanger mag accepteren"        ON buddy_requests;
-- DROP POLICY "buddy_requests: ontvanger mag accepteren/afwijzen" ON buddy_requests;


-- ────────────────────────────────────────────────────────────────────────────
-- STAP LAATSTE — POST-CHECK: verifieer resultaat
-- ────────────────────────────────────────────────────────────────────────────
SELECT tablename, count(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('matches', 'notifications', 'buddy_requests')
GROUP BY tablename
ORDER BY tablename;

-- Verwacht na cleanup:
--   matches:       3 policies  (INSERT + SELECT + UPDATE, genormaliseerd)
--   notifications: 3 policies  (notif_insert_auth + notif_select_own + notif_update_own)
--   buddy_requests: 4 policies (breq_insert_own + breq_select_party + breq_update_receiver
--                               + "buddy_requests: requester mag intrekken")
