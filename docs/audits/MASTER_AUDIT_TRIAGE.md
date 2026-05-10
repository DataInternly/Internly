# MASTER AUDIT — TRIAGE & ACTIEPLAN
Datum: 9 mei 2026 (zaterdag) · LT-deadline: 11 mei 2026 9:00 (maandag)
Bron: Fase 1-7 audit-rapporten
Methode: prioritering + bundeling + sequencing + GO/NO-GO

---

## EXECUTIVE SUMMARY

Het Internly platform is **fundamenteel solide** voor de LT van 11 mei. Auth, RLS, security headers, escapeHtml, anon-key isolatie en clearUserState zijn correct geïmplementeerd. **Eén P0 blocker resteert** (RLS UPDATE-policy laat user zijn eigen role naar admin wijzigen — F1.3.G) plus **3 P1 verifieer-items** (Run 1.7 schema-sync, send-push-notification auth-mode, push-subscription cleanup bij logout op shared device). PAT-rotatie is al gedaan ✓. Met **~5u30m gerichte werk verdeeld over zaterdag+zondag** en 4 LT-spelregels voor testers (incognito + push weigeren of fixen) is het platform **GO** voor maandag 9:00. De grootste resterende UX-risico's (mama-tests #1-#4) zijn P2 en kunnen in week 1 post-LT worden opgepakt zonder LT in gevaar te brengen.

---

## P0 PRE-LT BLOCKERS

| ID | Beschrijving | Tijdkost | Dependencies | Status |
|---|---|---|---|---|
| ~~F6.8.A~~ | ~~GitHub PAT in remote URL~~ | ~~5 min~~ | ~~geen~~ | ✓ **DICHT** (gerouteerd in deze sessie) |
| **F1.3.G** | `profiles_update_own` mist WITH CHECK → user kan eigen `role` wijzigen naar `admin` via DevTools | 10 min DDL | Supabase SQL-editor toegang | **OPEN** |
| **F6.6.B / F2.1.B** | Run 1.7 schema-sync — `meetings.match_id` + `messages.type` op productie verifiëren/uitvoeren | 5 min SQL-query + eventueel ALTER | Supabase SQL-editor | **VERIFY** |

### F1.3.G fix (DDL):
```sql
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK (
    (select auth.uid()) = id
    AND role IN (SELECT role FROM profiles WHERE id = (select auth.uid()))
  );
```

### F6.6.B verificatie:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='meetings' AND column_name='match_id';
-- Verwacht: 1 row. Indien 0:
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES matches(id);
CREATE INDEX IF NOT EXISTS idx_meetings_match ON meetings(match_id);
```

---

## P1 PRE-LT MUST-FIX

### Bundel "RLS+ groot-onderhoud" (~2u30m)
Eén DDL-script dat onderstaande in transactie afwikkelt:

| ID | Beschrijving | Onderdeel script |
|---|---|---|
| F1.3.A | 21 UPDATE-policies missen WITH CHECK (matches, notifications, student/company/school_profiles, applications, messages, buddy_pairs, buddy_requests, meetings, internship_postings, waitlist) | DROP POLICY + CREATE met `USING (...) WITH CHECK (...)` per tabel |
| F1.3.B | 8 `FOR ALL` policies zonder WITH CHECK (stage_*, company_doorstroom, push_subscriptions, school_postings, buddy_queue) | DROP + CREATE met `WITH CHECK` toegevoegd |
| F1.3.D | Performance: wrap `auth.uid()` in `(select auth.uid())` | inline tijdens herschrijven |
| - | TO clauses: voeg `TO authenticated` toe aan elke policy waar van toepassing | inline |
| F5.7.B | `SQL_CLEANUP_DUPLICATE_POLICIES_DRAFT.sql` doorvoeren als al niet uitgevoerd | DROP duplicate policies (matches, notifications, buddy_requests) |
| F2.1.A | `matches.roc_profile_id` toevoegen indien niet in productie-DB | `ALTER TABLE matches ADD COLUMN IF NOT EXISTS roc_profile_id uuid REFERENCES profiles(id)` |

**Output**: één SQL-bestand `sql/2026-05-09-rls-hardening.sql` met BEGIN; … COMMIT; wrapper (Garcia2's patroon, conform draft-bestand).

**Dependencies**: Supabase SQL-editor, post-fix verifiëren via:
```sql
SELECT tablename, policyname, cmd, with_check
FROM pg_policies WHERE schemaname='public'
  AND with_check IS NULL
  AND cmd IN ('UPDATE','ALL');
-- Verwacht: 0 rows behalve waar policy bedoeld is zonder check
```

### Bundel "Quick-fixes" (~45m)
Eén commit met 6 kleine code-edits:

| ID | Beschrijving | Pagina | Tijdkost |
|---|---|---|---|
| F1.4 | International signOut wrappers vervangen door `performLogout()` (cosmetic, downgrade van P1→P3 — opt-in) | intl-school + intl-student | overslaan / 5 min |
| F2.3.A | Match-dashboard silent `.catch()` op meeting-status updates → try/catch + notify | match-dashboard.html:5528,5585,5619 | 15 min |
| F2.5.A | `js/account.js:25` `.single()` → `.maybeSingle()` + null-check | js/account.js | 2 min |
| F4.3.A | `goBack('discover.html')` → role-aware fallback per pagina | school-dashboard:709 + begeleider-dashboard:513 | 5 min |
| F7.1.A | clearUserState toevoegen: nullen `_currentUserId`, `__currentUser`, `__currentRole` | js/supabase.js | 5 min |
| F7.3.A | performLogout: DELETE eigen push_subscription + browser unsubscribe | js/utils.js performLogout | 15 min |

### Verifieer-items (geen code-werk, alleen Barry-keuze)

| ID | Beschrijving | Wie | Deadline |
|---|---|---|---|
| F2.6.A / F3.6.B | `supabase functions list` — verify `verify_jwt` setting van send-push-notification | Barry | zondag |
| F6.1.A | Testaccounts bevestiging — pre-aangemaakt of echte deelnemers? | Barry | zaterdag 12:00 |
| F6.5.A | Productie internly.pro spotcheck (5 min browser-test) | iemand | zondag avond |

---

## P2 POST-LT WEEK 1 (mama-test sessie)

| ID | Beschrijving | Mama-test | Tijdkost |
|---|---|---|---|
| F4.6.A | bedrijf + school `profile_edit_url = '#'` → completeness-suggesties dood | #4 | 30-90 min |
| F4.4.A | `renderAccountScreen` geen rol-param → toont alle plans ongeacht rol | #1 | ~30 min |
| F4.2.A | 4 logout-teksten over 13 pagina's — standaardiseer op 🚪 Uitloggen of ↪ Uit | #2 | ~30 min |
| F6.4.A | Viewer-banner niet geïmplementeerd | #6 | 30 min |
| F1.3.C / F7.4.A | profiles + *_profiles `USING (true)` → public_profiles view + restrict | AVG | ~1u |
| F1.2 | 13 inline-auth pagina's missen `data-auth-pending` body-state (anti-flicker) | UX | ~5 min/pagina = 1u |
| F7.5.A | review-form.html client-side ownership-check op _matchId | UX | 10 min |
| F3.6.A | pushsubscriptionchange resubscribe alleen bij open tab | UX | ~1u SW-rewrite |
| F4.7.A | Mobile-logout bereikbaarheid op buddy/bbl-profile/chat/match-dashboard | mobile | 5 min DevTools-check + fix |
| F5.7.A | Migration-versie-tracking documenteren (sql/MIGRATION_LOG.md) | ops | 30 min |
| F5.1.A | `function formatDate(` x7 vervangen door utils.formatNLDate | DRY | ~30 min |
| F5.2.A | `56px` topbar-height → CSS-variabele `--topbar-h` over 22 bestanden | DRY | ~45 min |

---

## P2/P3 POST-LT BACKLOG (week 2+)

| ID | Beschrijving | Sprint kandidaat |
|---|---|---|
| F1.3.F | availability SELECT public — design-keuze, verifieer met PO | post-LT review |
| F2.6.C | vat-verify pre-existing uncommitted | next sprint |
| F3.3.A | Google Maps API key — verifieer Cloud Console referrer-restrictions | post-LT |
| F3.4.A | CSP `script-src 'unsafe-inline'` — design-beperking static hosting | accept of major refactor |
| F3.4.B | Geen CSP `report-uri` (CSPReporter telemetry-component zonder browser-input) | post-LT |
| F3.4.C | `img-src https:` te breed | post-LT |
| F4.5.A | "Overzicht" tekst inconsistent over 6 rollen | post-LT |
| F4.4.B | Wrong-role guard in renderAccountScreen | post-LT |
| F5.3.A | 927 hardcoded hex-codes — CSS-variabelen al gedefinieerd | gepland sprint 5 |
| F5.4.A | 48 hardcoded `<footer>` — `renderFooter()` helper bouwen | gepland (TODO_FOOTER_REFACTOR) |
| F5.5.A | IIFE welkomstblok-pattern → `setupRoleLanding()` helper | post-LT |
| F6.3.A | Mollie subscription view (Bucket A 4.6) | Run 5+ |
| F6.5.C | Stray files cleanup (`changed.txt`, `tatus --short`) | 5 min cleanup |
| F6.6.A | docs/journal entries voor 6/7/8/9 mei | post-LT |
| F6.6.C | CLAUDE.md updaten met recente leerprincipes | post-LT |
| F7.6.B | Browser-level state op shared device | LT-spelregel |
| Fase 1 §1.1 | guardPage() migratie 19 pagina's (Run 7C-7G) | post-LT, gepland 30-90 min/sprint |

---

## FIX-VOLGORDE (gantt-stijl)

| Stap | Taak | Tijdkost | Dependencies | Eigenaar |
|---|---|---|---|---|
| 1 | ~~PAT rotatie~~ | ~~5 min~~ | — | ✓ **DICHT** |
| 2 | RLS+ groot-onderhoud (DDL bundel) | ~2u30m | Supabase SQL-editor + Barry-review op transactie | Barry / The Doctor |
| 3 | Quick-fixes sessie (6 items, 1 commit) | ~45m | git workflow, FTP-target lijst | dev-sessie |
| 4 | Indexing F1 baseline + F3a top-10 FK | ~50m | RLS+ klaar (idx op `auth.uid()` columns) | Barry / The Doctor |
| 5 | Logout commit + browser-test bundel (vrijdag b7b1c90 + quick-fix push-cleanup) | ~30m | Quick-fixes klaar | dev-sessie |
| 6 | FTP + smoke-test 6 accounts | ~1u | DirectAdmin upload, testaccounts ready | Barry + Geordi2 |
| 7 | Tester data binnen voor 12:00 (verifieer F6.1.A) | — | Barry communicatie | Barry |
| 8 | Productie spotcheck (incognito browser) | 5 min | FTP klaar | iemand |

**Totaal pre-LT actief werk**: **~5u30m–6u** verdeeld over zaterdag (DDL + quick-fixes) en zondag (FTP + smoke-test).

**Kritisch pad**: stap 2 (RLS+) → stap 6 (FTP smoke-test) — vereist dat ALTER-statements eerst gedraaid zijn vóór code-FTP, anders falen meeting-INSERTs.

---

## LT-SPELREGELS VOOR TESTERS (uit Fase 7)

Deze regels moeten in de tester-runbook (zaterdag 9:00 hard start onderwerp):

1. **Gebruik incognito mode** per testsessie — wist alle browser-state (history, auto-fill, push-perm) tussen testers automatisch
2. **Weiger push-permissions** wanneer Chrome erom vraagt **OF** wacht tot F7.3.A is gedeployed (push_subscriptions cleanup bij logout). Op shared device blijft anders 1 endpoint gemapped aan meerdere user_ids.
3. **Unieke browser-profielen per tester** als alternatief: Chrome → "Personen" → nieuwe persoon. Volledig geïsoleerde state.
4. **Sluit alle Internly-tabs vóór wisselen van tester** — defense in depth tegen open BroadcastChannels en in-memory state.

Deze spelregels zijn **noodzakelijk indien shared devices**, **optioneel indien elk tester eigen device gebruikt**.

---

## DEPENDENCIES + BUNDELING

### Bundel A — "RLS+ sessie" (één SQL-script)
Bundelt:
- F1.3.G (P0) — profiles_update_own WITH CHECK + role-immutability
- F1.3.A (P1) — 21 UPDATE-policies WITH CHECK
- F1.3.B (P1) — 8 FOR ALL policies WITH CHECK
- F1.3.D (P3) — `auth.uid()` → `(select auth.uid())` performance
- TO authenticated clauses inline
- F5.7.B — `SQL_CLEANUP_DUPLICATE_POLICIES_DRAFT.sql` doorvoeren (verifieer eerst of al uitgevoerd)
- F2.1.A — `matches.roc_profile_id` ALTER (als kolom mist op productie)
- F6.6.B / F2.1.B — `meetings.match_id` + `messages.type` schema-sync (als nodig)

**Voordeel bundeling**: één review, één transaction, één deployment-window. Voorkomt "ik heb policy X gedraaid maar Y vergeten" risico.

**Bestandsnaam**: `sql/2026-05-09-rls-hardening.sql`. Verplaatsbaar naar `_archief/` na uitvoering.

### Bundel B — "Quick-fixes commit"
Bundelt:
- F1.4 (P3 cosmetic) — int'l signOut wrappers (optioneel)
- F2.3.A (P2) — match-dashboard silent .catch
- F2.5.A (P2) — account.js .single
- F4.3.A (P2) — school + begeleider goBack fix
- F7.1.A (P2 defensief) — clearUserState 3 extra globals
- F7.3.A (P1) — push_subscriptions DELETE bij logout

**Voordeel**: één commit-message ("quick-fixes pre-LT 11 mei: silent-catch + maybeSingle + back-fallback + state-cleanup + push-cleanup"), één FTP-upload, één browser-test pass.

### Bundel C — "Logout finalize"
Bundeling van vrijdag b7b1c90 (al committed) + bundel B's push-cleanup. b7b1c90 is "niet browser-getest" per commit-message dus heeft sowieso een browser-test nodig vóór FTP. Combineer met quick-fixes-test.

---

## GO / NO-GO VERDICT

### Stand van zaken na deze audit
| Categorie | Aantal items | Status |
|---|---|---|
| P0 dicht | 1 | ✓ (PAT-rotatie) |
| P0 open | 1 | F1.3.G — 10 min DDL |
| P1 verifieer | 3 | F2.6.A + F6.1.A + F6.5.A — Barry/zondag |
| P1 code-fix | 1 | F7.3.A — 15 min in bundel B |
| P1 DDL-fix | 2 | F1.3.A + F1.3.B — in bundel A |
| P2 LT-aanbevolen | 1 | F6.4.A viewer-banner — 30 min, optioneel |
| P2 post-LT | 12 | week 1 |
| P3 backlog | 17 | week 2+ |

### Verdict: **GO voor 11 mei 9:00** mits:

**Verplicht (~3u15m gericht werk):**
- ✓ F6.8.A PAT — al gedaan
- F1.3.G — 10 min DDL (in bundel A)
- F2.6.A verify + eventueel fix — 5-25 min Barry
- F6.1.A testaccount-bevestiging — Barry voor zaterdag 12:00
- F6.5.A productie-spotcheck — 5 min zondag
- Bundel A RLS+ — 2u30m
- Bundel B quick-fixes inclusief F7.3.A push-cleanup — 45 min

**Plus FTP+smoke (~1u):** stap 6 in fix-volgorde.

**LT-spelregels (gratis):** vermeld in tester-runbook.

### Verdict: **NO-GO** als:
- F1.3.G niet wordt gefixt → één DevTools-savvy tester kan zichzelf admin maken (auth-bypass via DB UPDATE)
- F6.6.B (meetings.match_id) niet geverifieerd → meeting-INSERTs falen silently bij driegesprek-flow
- Testaccounts niet beschikbaar 12:00 zaterdag

### Voorwaardelijke GO:
- **Met F7.3.A push-cleanup gefixt**: shared-device LT zonder spelregels mogelijk
- **Zonder F7.3.A**: shared-device LT vereist tester-spelregel "weiger push-permissions"

### Niet-blokkerend voor LT (bewust uitgesteld):
- Mama-tests #1-#4 zijn P2 — verwacht UX-feedback tijdens LT, niet pre-fix
- Viewer-banner F6.4.A is optioneel 30 min werk, ontbreken creëert P2 mama-test risico maar geen functionele blocker
- Mollie integratie F6.3.A is bewust stub — geen betaalflow tijdens LT
- guardPage migratie staat al bewust gepland post-LT (Run 7C-7G)
- 927 hardcoded hex + 48 footers + 22× 56px zijn bekende DRY-tech-debt, P3

---

## NA-TRIAGE TODO LIJST (chronologisch)

```
ZATERDAG 9 MEI
[09:00] Hard start — Run 1.7 SQL keuze door Barry (Optie 1/2/3)
[09:30] Begin Bundel A SQL-script schrijven (RLS+ hardening)
[10:30] Bundel A review door Bedward + The Doctor
[11:00] Bundel A draaien op productie via Supabase SQL-editor
[12:00] DEADLINE: testaccount-namen + telefoonnummers binnen
[13:00] Bundel B quick-fixes coden + 1 commit
[13:45] Browser-test bundel B + b7b1c90 (logout-flow)
[14:30] FTP upload via DirectAdmin
[15:00] Smoke-test 6 paths door Geordi2
[16:00] Buffer voor onverwachts

ZONDAG 10 MEI
[10:00] Productie spotcheck door iemand (incognito)
[10:30] Tester-runbook finaliseren met LT-spelregels (Fase 7)
[11:00] Optioneel: F6.4.A viewer-banner indien tijd
[14:00] Final smoke door alle 4 hoofdrollen
[18:00] Sluit + ready

MAANDAG 11 MEI
[08:30] Final spotcheck
[09:00] LT GO
```

---

**Wacht op verdere instructies.**
