# Internly Migrations Log — Hard-Won Lessons
**Enige plek voor wijzigingen aan het DB-schema. Nieuwe entries BOVENAAN.**

Tom Bomba's regel: voor elke schema-wijziging, eerst de live DB-staat queryen
voordat ALTER/CREATE/DROP/REPLACE wordt geschreven.

Garcia2's rule: elke nieuwe migratie eerst in `BEGIN; … ROLLBACK;` draaien.

---

## 2026-04-29 — Telemetry P0 patch (post-wheels-up)

### LA-SIGN _GUARD SEMANTIC REGRESSIE GECORRIGEERD
**Bestand**: `la-sign.html`
**Bug-window**: tussen telemetry-coverage-update (29 apr, eerder vandaag)
en P0-patch (29 apr, deze sessie). Vermoedelijk korte exposure.
**Bug**: `if (_fCtx._guard('la-sign')) return;` (truthy=block) — verkeerde
semantiek t.o.v. shim-spec en t.o.v. polymorf `_guard(label)` dat true=OK
returnt. Effect: een **gevulde honeypot** zou de sign-flow doorgelaten
hebben in plaats van blokkeren.
**Scope**: publieke pagina, geen auth, post-token signing flow voor
Learning Agreements. Bot die token brute-forced + honeypot invult kreeg
géén tarpit en kon de UPDATE-call bereiken.
**Fix**: `if (!_fCtx._guard('la-sign')) return;` (falsy=block, correct).
Zelfde bug + fix toegepast op `international-student-dashboard.html`
(`buddy-request` flow).
**Status**: ✅ Geverifieerd via grep — geen residue meer.
**Geen DB-impact**, geen migratie nodig.
**Geen exploitatie bekend** — regressievenster vermoedelijk uren tot
maximaal de tijd tussen de twee sessies.

---

## 2026-04-22 — Sprint 2 + Layer 3 hardening

### SECURITY DEFINER EXECUTE REVOKE
**Functies**: `check_mutual_swipe_match()`, `notify_on_mutual_match()`
**Wijziging**: REVOKE EXECUTE FROM anon, authenticated, PUBLIC
**Reden**: defense-in-depth — PostgREST RPC drempel verhogen (Bedward / Layer 3 audit HIGH #2)
**Behouden**: postgres + service_role (nodig voor trigger-werking)
**Status**: ✅ Uitgevoerd (geverifieerd via pg_proc)

### TEST-DATA SEED
**Tabel**: `buddy_profiles`
**Insert**: `profile_id = d629ebb5-860b-4653-a87d-afeade244dc5` (Jan van der Berg)
**Velden**: `active=true`, kennis_gebieden, specialiteiten, stad='Amsterdam', leeftijd=66
**Reden**: Sprint 3 buddy-deck vereist minstens 1 actieve buddy voor livetest
**Status**: ✅ Aanwezig in DB

---

## 2026-04-22 — Sprint 2 migratie (gedeeltelijk uitgevoerd)

### TABEL AANGEMAAKT: buddy_profiles (no-op — bestond al)
**SQL**: `CREATE TABLE IF NOT EXISTS buddy_profiles ...`
**Status**: No-op — tabel bestond al. Veilig.

### ALTER TABLE swipes (no-op — constraint bestond al)
**SQL**: `ALTER TABLE swipes ADD COLUMN ...`
**Status**: No-op. Veilig.

### RLS policies op swipes
**Toegevoegd**: `swipes_insert_own`, `swipes_select_own`
**Status**: ✅ Actief (geverifieerd via pg_policies)

### CHECK constraint matches uitgebreid
**Constraint**: `matches_type_check`
**Was**: `type IN ('student_bedrijf','school_bedrijf','student_posting','school_posting','begeleider_link')`
**Nu**: + `'mutual_swipe'`
**Reden**: Sprint 2 trigger schrijft `'mutual_swipe'` matches

### TRIGGERS aangemaakt (bestonden al in betere vorm — NIET opnieuw aangemaakt)
**Trigger 1**: `trigger_swipe_mutual_match` → `check_mutual_swipe_match()`
**Trigger 2**: `trigger_notify_on_mutual_match` → `notify_on_mutual_match()`
**Reden**: Sprint 2 migratie-SQL had verkeerde versies — bestaande triggers zijn beter
**Actie**: Sprint 2 CREATE TRIGGER statements uit migratie-bundel verwijderd
**Status**: ✅ Bestaande triggers actief (tgenabled = 'O')

---

## 2026-04-22 — Kolomnaam-correcties (code-side)

### GEEN DB-wijziging — alleen code-fix
**Bug**: `begeleider-dashboard.html` + `school-dashboard.html` gebruikten `match_type` ipv `type`
**Fix**: 6 occurrences vervangen door `type` (Layer 3 HIGH #1)
**DB kolom**: `matches.type` (was altijd correct)

### GEEN DB-wijziging — buddy_profiles.active
**Bug**: `buddy.js` gebruikte `actief` ipv `active`
**Fix**: 3 occurrences in buddy.js gecorrigeerd

---

## Vóór eerste productie-sprint (datum onbekend)

### INITIEEL SCHEMA
**Bestand**: `internly_migration.sql` (in repo root)
**Tabellen aangemaakt**: profiles, student_profiles, company_profiles, school_profiles,
buddy_profiles, matches, swipes, conversations, messages, meetings, notifications,
applications, reviews, availability, push_subscriptions, waitlist, internship_postings,
school_postings, vestigingen, buddy_pairs, buddy_requests, buddy_queue, esg_reports,
esg_exports, stage_plans, stage_leerdoelen, stage_deadlines, stage_tasks, stage_reflecties,
stage_log, subscriptions, trust_score_history, webhook_events, bundling_requests
**Status**: ✅ Alle tabellen aanwezig (geverifieerd via pg_tables, 35 public tabellen)

---

## Patroon voor toekomstige entries

```
## YYYY-MM-DD — [Sprint N | Reden]

### [Wijzigingstype]
**Tabel/Functie**: ...
**SQL** (samenvatting): ...
**Reden**: ...
**Status**: ✅ Uitgevoerd / 🔶 Pending approval / ❌ Teruggedraaid
**Rollback** (indien relevant): ...
```

*Aangemaakt: 22 april 2026 — All-Hands Council audit (item 18)*
