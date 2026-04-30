# INTERNLY LIVETEST SCRIPT
**Version:** 1.0  
**Date:** 2026-04-16  
**Platform:** internly.pro (post-FTP upload)  
**Coordinator:** Barry  
**Crew sign-off required:** Picard2 (go / no-go)

> **PRE-CONDITION:** All 10 files from the SESSION_STATE.md pending-FTP list must be uploaded
> before this script is run. SQL migrations confirmed complete. Edge Functions deployed.

---

## BEFORE YOU START — Browser setup

For every journey:
1. Open a **new private/incognito window** in Chrome or Edge
2. Open DevTools → Console tab (keep it visible throughout)
3. Open DevTools → Application → Local Storage (clear any `internly_*` keys if present)
4. Navigate to `https://internly.pro/auth.html`
5. Do **not** reuse tabs between journeys

Console errors to watch globally (any of these = flag immediately):
- `ReferenceError: initSessionTimeout is not defined`
- `TypeError: Cannot read properties of undefined`
- `Failed to load resource` on any `.js` or `.html` file
- Any Supabase `406` or `409` response

---

## Journey 1 — Student (new user, no prior data)

**Test account:** `livetest.student1@gmail.com` / `Test1234!`  
**Start URL:** `https://internly.pro/auth.html`  
**Covers:** signup → profile → discover (demo toggle) → solliciteren → mijn-sollicitaties

### Steps

**SIGNUP**

1. Land on auth.html → **Expected:** Two-panel layout visible; "Inloggen" tab active by default. No console errors on load.

2. Click "Registreren" tab → **Expected:** Registration form appears. Role cards visible: Student, Bedrijf, School, Stagebegeleider.

3. Click the **Student** role card → **Expected:** Card gets selected state (green border/highlight). "Student" label appears in selection indicator.

4. Enter email `livetest.student1@gmail.com`, password `Test1234!`, confirm password `Test1234!` → **Expected:** Fields filled, no validation error yet.

5. Check the ESG consent checkbox ("Jouw stagegegevens worden anoniem gebruikt voor ESG-rapportages van bedrijven.") → **Expected:** Checkbox checked.

6. Click "Registreren" button → **Expected:** Spinner/loading state. Within ~3s: redirected to `discover.html`. No auth error. No console error.

7. In DevTools → Application → Local Storage: check `internly_*` keys → **Expected:** No stale keys from prior sessions.

**PROFILE**

8. Click "Profiel" in the top navigation → **Expected:** Navigates to `student-profile.html`. Form visible (not overview — first visit, no profile exists yet). Step 1 visible.

9. In step 1, fill in:
   - Naam: `Lisa Livetest`
   - Geslacht dropdown: select `Vrouw`
   - Opleiding: `HBO Communicatie`
   - Niveau: select `HBO`
   - Sector voorkeur: `Marketing`
   → **Expected:** All fields accept input. Geslacht dropdown shows four options + blank. Inline note below geslacht reads "Alleen gebruikt voor anonieme diversiteitsrapportage — nooit zichtbaar voor bedrijven."

10. Click "Volgende" / proceed to step 2 → **Expected:** Step 2 visible. No console error. Naam, geslacht, opleiding, niveau are not lost.

11. Fill step 2 skills or proceed through remaining steps → **Expected:** No crash on any step. Steps advance correctly.

12. Click "Opslaan" on final step → **Expected:** Toast "Profiel opgeslagen" (or equivalent) appears. Page switches to profile overview. Name "Lisa Livetest" visible in overview. No `if (!mErr)` false-positive error shown to user.
    > ⚠️ **Known risk:** student-profile.html has inverted error check at ~line 887 (`if (!mErr)` should be `if (mErr)`). Watch for a success save that nonetheless shows an error message.

**DISCOVER**

13. Navigate to `discover.html` (click "Vacatures" in nav or direct URL) → **Expected:** Vacature cards render. Each card shows company name, title, sector, trust badge. No blank page. No "Laden…" stuck state.

14. Scroll through cards. Find a card with a `⚡ Responsgarantie` badge → **Expected:** At least one card shows the guarantee badge if any posting has `guarantee = true`.

15. Click on any vacature card → **Expected:** Navigates to `vacature-detail.html?id=[uuid]&source=internship_postings`. Detail page loads. Company name, title, description visible.
    > **Note:** vacature-detail.html has no auth guard (P1 known issue) — this is expected to work even logged out. Do not flag as a fail.

16. Return to discover.html → **Expected:** Back button or browser back works. Cards still visible.

**SOLLICITEREN**

17. On a vacature detail page, find the "Solliciteren" or apply action → **Expected:** Apply button or flow is present and clickable.

18. Complete or initiate a sollicitatie → **Expected:** Confirmation shown or redirect to mijn-sollicitaties.html.

**MIJN SOLLICITATIES**

19. Navigate to `mijn-sollicitaties.html` → **Expected:** Page loads. If sollicitatie was submitted, it appears in the list. If the list is empty, a "Geen sollicitaties" empty state is shown — NOT a blank white screen and NOT a stuck "Laden…".

20. Check DevTools Console for the entire journey → **Expected:** Zero ReferenceErrors, zero uncaught TypeErrors. Network errors on optional push-subscription registration are acceptable (not a test fail).

### Pass criteria
- User successfully created and redirected without error
- Profile saved with geslacht field; no false error toast shown
- Discover page renders cards; detail page loads from card click
- Mijn-sollicitaties page shows either list or proper empty state
- Zero ReferenceErrors in console throughout

### Known risks
- student-profile.html ~line 887 inverted `!mErr` check may show error toast on successful save — flag but do not hard-fail the journey if the data was actually saved (verify by reloading profile)
- If no `internship_postings` rows have `status = 'active'` in production, discover.html may show nothing — check DB before test
- "Laden…" empty state bug: if Supabase returns 0 rows, the page may show nothing (no empty state message) — flag as cosmetic fail

---

## Journey 2 — Bedrijf Starter (new user)

**Test account:** `livetest.starter1@gmail.com` / `Test1234!`  
**Start URL:** `https://internly.pro/auth.html`  
**Covers:** signup → company-dashboard → first vacature → Starter limit bar → ESG upgrade prompt → vestigingen upgrade notice

### Steps

**SIGNUP**

1. Open fresh incognito window → navigate to `https://internly.pro/auth.html` → **Expected:** Auth page loads cleanly.

2. Click "Registreren" → select **Bedrijf** role card → **Expected:** Bedrijf card selected (green/orange highlight).

3. Enter email `livetest.starter1@gmail.com`, password `Test1234!`, confirm → click "Registreren" → **Expected:** Redirected to `company-dashboard.html`. No errors.

4. Check DevTools → Console: look specifically for `ReferenceError: initSessionTimeout is not defined` → **Expected:** This error does NOT appear. Session timeout should be wired via js/supabase.js.

**COMPANY PROFILE**

5. Navigate to "Profiel" tab in company-dashboard nav → **Expected:** Company profile form visible (first visit).

6. Fill in: Bedrijfsnaam `Livetest BV`, Sector `Tech`, Omschrijving `Test bedrijf` → click "Opslaan" → **Expected:** Toast confirming save. Overview shows Livetest BV.

**SUBSCRIPTION (Starter — seeded at signup)**

7. Navigate to main Dashboard screen → **Expected:** Plan badge reads "Starter" or shows company_starter plan. Starter limit bar or posting cap is visible.

8. Check vacature post limit indicator → **Expected:** Bar shows e.g. "0 van 3 vacatures geplaatst" (or whatever the Starter cap is). Not a blank area.

**EERSTE VACATURE PLAATSEN**

9. Click "Nieuwe vacature" (or equivalent nav button) → **Expected:** New posting form appears. Form fields visible: titel, sector, beschrijving, duur, startdatum, postcode, tags.

10. Check for vestiging selector → **Expected:** Vestiging selector (`f-vestiging` dropdown, labelled "Vestiging") is **NOT visible** for Starter plan — it should be hidden (`display:none`). Only visible for Business plan.

11. Fill in all required fields:
    - Titel: `Test Stageplek Marketing`
    - Sector: `Marketing`
    - Beschrijving: `Dit is een testvacature voor de livetest.`
    - Duur: `5 maanden`
    - Startdatum: `2026-09-01`
    - Postcode: `1012 AB`
    → click "Plaatsen" → **Expected:** Toast "Vacature geplaatst" or equivalent. Vacature appears in "Mijn vacatures" list. Posting cap bar increments (e.g. "1 van 3").

**ESG TAB — UPGRADE PROMPT**

12. Click "ESG" in the left nav → **Expected:** One of two outcomes:
    - (A) ESG metrics show with ESRS S1 labels on all 5 stat cards (if ESG is accessible at Starter), OR
    - (B) An upgrade card is shown ("Upgrade naar Pro voor ESG-rapportage" or similar)
    → Document which outcome occurs. Neither is a hard fail but (B) must show a proper upgrade CTA, not a blank screen.

13. If ESG metrics show: verify the 5 stat cards each have a small ESRS reference label below them (e.g. "ESRS S1 — niet-werknemers", "ESRS S1 — werkomstandigheden", "ESRS S1-13 — begeleiding & ontwikkeling", "ESRS S1 — werkgeversbetrokkenheid", "Internly-score") → **Expected:** All 5 labels present.

14. Verify ESG page subtitle reads "Automatische S1-stagedata voor je CSRD-verslag" — NOT "CSRD-compliant" → **Expected:** Updated copy present.

**VESTIGINGEN TAB — UPGRADE NOTICE**

15. Click "Vestigingen" in the left nav (📍 icon) → **Expected:** Tab navigates without crash. Because plan is Starter (not Business), the screen should show an upgrade notice — NOT the full CRUD interface. The notice should mention "Business" or "Upgrade".

16. Verify the upgrade card is visible and has a CTA button → **Expected:** Card present, button present, no blank screen.

### Pass criteria
- Signup completes, company-dashboard loads without initSessionTimeout ReferenceError
- First vacature successfully posted; cap bar increments
- Vestiging selector hidden on new-posting form for Starter
- ESG tab shows either real metrics with ESRS labels, or a clean upgrade prompt
- Vestigingen tab shows upgrade notice for Starter plan
- Zero ReferenceErrors in console

### Known risks
- `initSessionTimeout is not defined` ReferenceError — highest risk item; if it fires, note the exact console line
- ESG may be Pro-gated — if so, an upgrade prompt is the expected result (not a fail)
- Vacature post cap may not be enforced in UI beyond the bar display — check if posting a 4th vacature beyond cap is blocked or allowed silently

---

## Journey 3 — Bedrijf Pro (existing subscription)

**Test account:** `livetest.pro@gmail.com` / `Test1234!`  
**Pre-condition:** This account must have a `company_pro` subscription row in Supabase with `status = 'active'`.  
**Setup:** Before running this journey, insert manually in Supabase Dashboard:
```sql
-- Run in Supabase SQL editor before test:
-- First find the user_id after account creation, then:
INSERT INTO subscriptions (user_id, plan, status, current_period_end)
VALUES ('[USER_ID]', 'company_pro', 'active', '2027-01-01T00:00:00Z');
```
**Start URL:** `https://internly.pro/auth.html`  
**Covers:** login → dashboard → Trust Score tab → ESG tab with real metrics → vestigingen tab full CRUD

### Steps

**LOGIN**

1. Open fresh incognito window → `https://internly.pro/auth.html` → **Expected:** Auth page loads.

2. Enter `livetest.pro@gmail.com` / `Test1234!` → click "Inloggen" → **Expected:** Redirected to `company-dashboard.html`. Plan badge reads "Pro".

3. DevTools Console: confirm no `initSessionTimeout is not defined` → **Expected:** No error.

**DASHBOARD — PLAN BADGE**

4. On main Dashboard screen → **Expected:** Plan badge shows "Pro" (or "company_pro"). Posting cap shows Pro limit (e.g. "10 vacatures" or equivalent). No Starter upgrade CTA visible.

**TRUST SCORE TAB**

5. Click "Trust Score" in left nav → **Expected:** Trust Score screen renders. Score displayed (may be 0 or a demo value for a new account). Trust grade shown (e.g. "N/A", "B", etc.). No blank screen, no uncaught error.

6. Scroll through Trust Score breakdown → **Expected:** At minimum the score container renders. Individual metric rows or explanatory text visible. No "Laden…" stuck state.

**ESG TAB — FULL METRICS**

7. Click "ESG" in left nav → **Expected:** ESG metrics load. All 5 stat cards visible:
   - Stages (today / total)
   - Kwaliteitscore (avg rating)
   - Gesprekken (begeleiding %)
   - Respons (reply rate %)
   - ESG-punten (composite score)

8. Verify each stat card has an ESRS reference label directly below the number:
   - Stages card → "ESRS S1 — niet-werknemers"
   - Kwaliteit card → "ESRS S1 — werkomstandigheden"
   - Gesprekken card → "ESRS S1-13 — begeleiding & ontwikkeling"
   - Respons card → "ESRS S1 — werkgeversbetrokkenheid"
   - ESG-punten card → "Internly-score"
   → **Expected:** All 5 labels present, small grey text below each number.

9. Verify ESG page subtitle → **Expected:** "Automatische S1-stagedata voor je CSRD-verslag" (not "CSRD-compliant").

10. Scroll to CSRD disclaimer at bottom of ESG tab → **Expected:** Disclaimer text contains both "dient als richtlijn" and "geen officiële CSRD-meetwaarde".

**VESTIGINGEN TAB — FULL CRUD**

11. Click "Vestigingen" (📍) in left nav → **Expected:** Full CRUD interface loads (NOT an upgrade card). A form with fields: Naam, Adres, Stad, Postcode. An "Toevoegen" button. An empty list (or existing vestigingen if previously added).

12. Fill in: Naam `Hoofdkantoor`, Adres `Teststraat 1`, Stad `Amsterdam`, Postcode `1012 AB` → click "Toevoegen" → **Expected:** Toast confirmation. New vestiging card appears in list below form. Card shows naam, stad, postcode, and a delete button.

13. Navigate to "Nieuwe vacature" (new posting form) → **Expected:** Vestiging selector (`f-vestiging`) dropdown IS visible for Pro plan — labelled "Vestiging" with helper text "koppel een vestiging — postcode wordt automatisch ingevuld". Dropdown contains the "Hoofdkantoor" vestiging just created.

14. Select "Hoofdkantoor" from the vestiging dropdown → **Expected:** The `f-postcode` field auto-fills with `1012 AB`.

15. Complete and submit the vacature form → **Expected:** `vestiging_id` is saved (verify in Supabase Dashboard: `internship_postings` row has non-null `vestiging_id`).

16. Navigate to `discover.html` (new tab, still logged in) → find the just-posted vacature → **Expected:** Card shows "📍 Hoofdkantoor" as a subtitle beneath the company name, and "📍 Amsterdam" in the meta row.

17. Click the card → vacature detail page → **Expected:** A "Vestiging" section card appears with: naam "Hoofdkantoor", adres "Teststraat 1", stad "Amsterdam", postcode "1012 AB".

18. Return to vestigingen tab → click delete on "Hoofdkantoor" → **Expected:** Confirmation modal appears (via `openModal()`). Confirm deletion. Vestiging card disappears from list.

### Pass criteria
- Dashboard loads with Pro plan badge; no session timeout error
- Trust Score tab renders without crash
- ESG tab shows all 5 metric cards with correct ESRS labels and updated subtitle
- CSRD disclaimer present with both required phrases
- Vestigingen CRUD: add, selector auto-fill, form submission with vestiging_id, discover card shows location, detail page shows vestiging block, delete with modal confirmation
- Zero ReferenceErrors in console

### Known risks
- Pro plan must be manually seeded in DB before test — if not done, this journey degrades to Starter behavior
- Vestiging selector visible condition: if `currentPlan` is not read correctly from subscription (timing issue), selector may remain hidden — watch for this
- discover.html FK join `vestigingen(naam,stad,postcode)` only works if `vestiging_id` FK was added via SQL migration — confirm this migration ran

---

## Journey 4 — School Freemium (new user)

**Test account:** `livetest.school1@gmail.com` / `Test1234!`  
**Start URL:** `https://internly.pro/auth.html`  
**Covers:** signup → school-dashboard → cohort view → 25-student cap visible → bundeling tab

> ⚠️ **KNOWN EXPECTED FAIL — Bundeling tab not built.** The bundeling feature (aanmelden, wachtrij, pakketkoppeling) is architecturally absent from school-dashboard.html. Steps 14–16 will fail. Document the failure but do not abort the journey — complete all other steps.

### Steps

**SIGNUP**

1. Open fresh incognito window → `https://internly.pro/auth.html` → **Expected:** Auth page loads.

2. Click "Registreren" → select **School** role card → **Expected:** School card selected.

3. Enter `livetest.school1@gmail.com` / `Test1234!` → click "Registreren" → **Expected:** Redirected to `school-dashboard.html`. `school_freemium` subscription row seeded automatically (this is done by `seedFreeSubscription()` in auth.html for school role).

4. DevTools Console: `initSessionTimeout is not defined`? → **Expected:** No error.

**SCHOOL PROFILE**

5. Navigate to "Profiel" tab → fill in: School naam `ROC Livetest`, Stad `Rotterdam`, Sector `MBO` → click "Opslaan" → **Expected:** Toast confirmation. Overview shows ROC Livetest.

**COHORT VIEW**

6. Navigate to "Studenten" or main cohort view tab → **Expected:** Student list renders. May be empty for new account — if so, an empty state message is shown (NOT a blank white screen).

7. Check for Freemium student cap indicator → **Expected:** A limit bar or badge is visible showing the 25-student cap (e.g. "0 van 25 studenten"). This confirms the Freemium plan gate is active.
   > If no cap indicator is visible, note as a WARN — the limit exists in logic but may not be surfaced in UI.

8. Navigate to "Matches" or "Stageplaatsen" tab (if present) → **Expected:** Tab renders. Empty state shown if no matches yet.

9. Navigate to "Signalen" tab → **Expected:** Either full signalen view (if Freemium includes signalen), or an upgrade prompt to Premium. "Signalen (Premium)" text in pricing.html implies this is Premium-only — an upgrade CTA here is the expected result.

10. Navigate to "Rapportage" or "ESG" tab (if present) → **Expected:** Renders without crash. Premium-gated content shows upgrade CTA.

**BUNDELING TAB — EXPECTED FAIL**

11. Look for a "Bundeling" or "Opleiding aanmelden" tab in the school nav → **Expected (KNOWN FAIL):** No such tab exists. Document as ❌ FAIL: bundeling feature not built.

12. If a bundeling tab unexpectedly exists: click it → fill request form → check for disclaimer checkbox → **Expected (if tab exists):** Form visible with bundeling disclaimer checkbox present. (This step only runs if step 11 passes.)

**SESSION TIMEOUT TEST (school-dashboard)**

13. Leave the school-dashboard open and idle (do not interact) for 15 minutes → **Expected:** Session timeout modal appears warning of auto-logout. (Only run this step if time allows; skip if not.)
    > If `initSessionTimeout` was a ReferenceError in step 4, this test is moot — flag that instead.

### Pass criteria
- Signup completes, school_freemium subscription seeded, school-dashboard loads
- Profile saves successfully
- Cohort view renders (empty state or list — no blank screen)
- 25-student Freemium cap indicator visible
- Signalen tab shows Premium upgrade CTA (not content)
- Bundeling tab: document as expected fail (not built) — this does NOT fail the journey overall
- Zero unexpected ReferenceErrors in console

### Known risks
- **CONFIRMED FAIL:** Bundeling tab does not exist — this is a known pre-livetest gap from the master audit
- `school_freemium` subscription seed depends on `seedFreeSubscription()` running correctly in auth.html — if it fails silently, the dashboard may show a plan error
- School cohort list may show "Laden…" with no empty state if zero students matched
- Signalen tab behavior (included vs gated) has not been fully audited — note the actual result

---

## Journey 5 — Begeleider (new signup, trial)

**Test account:** `livetest.begel1@gmail.com` / `Test1234!`  
**Start URL:** `https://internly.pro/auth.html`  
**Covers:** signup → trial subscription seeded → begeleider-dashboard loads → trial banner visible → days remaining correct → profiel save

### Steps

**SIGNUP**

1. Open fresh incognito window → `https://internly.pro/auth.html` → **Expected:** Auth page loads. Four role cards visible: Student, Bedrijf, School, Stagebegeleider.

2. Click "Registreren" → select **Stagebegeleider** role card → **Expected:** Card selected with teal border/highlight (CSS class `.begeleider-role`). "Stagebegeleider" label in selection indicator.

3. Enter `livetest.begel1@gmail.com` / `Test1234!` → click "Registreren" → **Expected:** Redirected to `begeleider-dashboard.html`. This is a NEW FILE uploaded as part of the pending FTP list — if it 404s, the FTP upload did not include this file.

4. DevTools Console: `initSessionTimeout is not defined`? → **Expected:** No error (begeleider-dashboard.html has its own inline `initSessionTimeout()` copy).

**TRIAL SUBSCRIPTION VERIFICATION**

5. On dashboard load → **Expected:** Trial subscription was seeded during signup (auth.html:675-688). This upsert fires for `selectedRole === 'begeleider'` and sets:
   - `plan = 'begeleider_starter'`
   - `status = 'trial'`
   - `trial_ends_at = now() + 30 days`

6. Check plan badge in the dashboard → **Expected:** Badge reads "Starter" or "Trial" (not "Pro"). Plan name `begeleider_starter` implied.

7. Check for trial banner → **Expected:** A visible banner or notice indicating trial status. Text should reference the trial period and when it ends. Days-remaining count should be approximately 30 (accept 29–30).
   > If no trial banner is visible at all, note as ❌ FAIL.

8. Verify trial_ends_at is ~30 days from now → **Expected:** Cross-check in Supabase Dashboard: `subscriptions` table for this user_id should show `trial_ends_at` approximately equal to `now() + 30 days`. Date should NOT be in the past.

**STUDENT CAP DISPLAY**

9. Navigate to "Mijn studenten" tab → **Expected:** Student list renders (empty for new account). A cap banner shows "max 30 studenten" (Starter cap). No crash.

10. The empty state shows a helpful message (e.g. "Nog geen studenten gekoppeld") → **Expected:** Not a blank white screen and not stuck "Laden…".

**PROFIEL SAVE**

11. Navigate to "Profiel" tab in begeleider-dashboard → **Expected:** Profile form visible with: Naam field, Sector field.

12. Fill in: Naam `Jan Begeleider`, Sector `Zorg` → click "Opslaan" → **Expected:** Toast confirmation. Profile saved to `profiles` table (`full_name` and `sector` columns). Overview shows "Jan Begeleider".

13. Reload the page (`F5`) → navigate back to Profiel → **Expected:** Naam "Jan Begeleider" and sector "Zorg" are pre-populated in the form (data persisted to DB, not just in-memory).

**NAVIGATION CHECK**

14. Click through all three nav tabs: Dashboard, Mijn studenten, Profiel → **Expected:** Each tab renders without crash. Active tab has correct highlight. No tab shows a blank screen.

15. DevTools Console final check → **Expected:** Zero ReferenceErrors. Zero uncaught TypeErrors. Any 404 on a resource = flag with the URL.

### Pass criteria
- Begeleider role card visible and selectable in auth.html
- begeleider-dashboard.html loads (not a 404) — confirms FTP upload completed
- Trial subscription row in DB: `plan = 'begeleider_starter'`, `status = 'trial'`, `trial_ends_at ≈ now + 30d`
- Trial banner visible in dashboard with ~30 days remaining
- Student cap "max 30" visible in Mijn studenten tab
- Profiel saves and persists across page reload
- Zero ReferenceErrors in console

### Known risks
- **FTP risk:** begeleider-dashboard.html is a NEW file — if FTP upload was incomplete, this page returns 404 and the journey cannot proceed. This is the highest single-point-of-failure for this journey.
- Trial seed (`auth.html:675-688`) depends on `selectedRole === 'begeleider'` being set correctly — if role selection state is lost before the upsert fires, no trial row is created
- `begeleider_profile_id` column on `student_profiles` may not exist yet — `loadStudents()` falls back gracefully to empty state; this is expected, not a fail
- `initSessionTimeout()` is defined inline in begeleider-dashboard.html (not from js/supabase.js) — this is by design; confirm the inline copy is present if a ReferenceError fires

---

## COORDINATOR NOTES — For Barry

### What to have open before you start

| Window | Purpose |
|--------|---------|
| Chrome Incognito (one per journey) | Each journey needs a fresh window — do NOT reuse |
| DevTools → Console (always visible) | Watch for ReferenceErrors during every journey |
| DevTools → Network (keep open) | Spot 404s on js/supabase.js and HTML files |
| Supabase Dashboard → Table Editor | Verify DB rows for Journey 3 (manual Pro seed) and Journey 5 (trial_ends_at) |
| FileZilla or FTP client | Re-upload any file that 404s during test |
| SESSION_STATE.md | Reference for all known P1 issues |

### Test accounts to create before running

Create all five accounts BEFORE starting the journeys (use Supabase Auth or the auth.html register form):

| Journey | Email | Password | Pre-work needed |
|---------|-------|----------|-----------------|
| 1 — Student | `livetest.student1@gmail.com` | `Test1234!` | None — fresh signup in Journey 1 |
| 2 — Starter | `livetest.starter1@gmail.com` | `Test1234!` | None — fresh signup in Journey 2 |
| 3 — Pro | `livetest.pro@gmail.com` | `Test1234!` | **Manual:** register first, then add Pro subscription row in Supabase |
| 4 — School | `livetest.school1@gmail.com` | `Test1234!` | None — school_freemium seeded at signup |
| 5 — Begeleider | `livetest.begel1@gmail.com` | `Test1234!` | None — trial seeded at signup |

**Journey 3 manual subscription setup:**
1. Register `livetest.pro@gmail.com` as Bedrijf via auth.html
2. Go to Supabase Dashboard → SQL Editor → run:
   ```sql
   INSERT INTO subscriptions (user_id, plan, status, current_period_end)
   SELECT id, 'company_pro', 'active', '2027-01-01T00:00:00Z'
   FROM profiles WHERE id = (
     SELECT id FROM auth.users WHERE email = 'livetest.pro@gmail.com'
   );
   ```
3. Confirm the row is visible in Table Editor before starting Journey 3.

### What to do if something breaks mid-journey

**If `ReferenceError: initSessionTimeout is not defined`:**
- Stop the journey, do not continue
- Open the failing HTML file in the FTP client
- Confirm `js/supabase.js` is loaded in the `<head>`
- If not, add `<script src="js/supabase.js"></script>` and re-upload
- This is the P1 blocker identified in the master audit

**If any HTML file returns a 404:**
- Immediately open FileZilla and re-upload the missing file from `c:\Projects\Internly\`
- Most likely candidate: `begeleider-dashboard.html` (new file, only exists locally until FTP)
- After upload, clear browser cache and retry the journey from step 1

**If match-dashboard.html crashes with a TypeError:**
- This is the known `.single()` bug (P1: 8× `.single()` calls that crash on missing rows, lines 2541, 2556, 3513, 3572, 3734, 3989, 4288, 4311)
- Do not try to fix live — note the failing line from the console and continue with other journeys

**If student-profile.html shows an error toast after a successful save:**
- This is the known inverted `if (!mErr)` bug at ~line 887
- Verify the data actually saved by reloading the profile
- If the profile loads correctly on reload, mark as a WARN (cosmetic) not a FAIL

**If the bundeling tab is missing from school-dashboard (Journey 4, step 11):**
- This is a **CONFIRMED EXPECTED FAIL** from the master audit
- Mark it clearly in your notes but do not abort Journey 4
- Continue with remaining school-dashboard steps

**If Mollie checkout triggers (Journeys 2/3 upgrade prompts):**
- Use Mollie test card: `4111 1111 1111 1111`, expiry `12/27`, CVC `123`
- Do not use real payment details in livetest

### Go / No-Go decision criteria (Picard2)

**GO for production if all of the following are true:**
- [ ] Zero `ReferenceError: initSessionTimeout is not defined` across all 5 journeys
- [ ] Journeys 1, 2, 3, 5 all pass their pass criteria
- [ ] Journey 4 passes all steps except bundeling (bundeling fail is pre-approved)
- [ ] begeleider-dashboard.html loads (not 404) in Journey 5
- [ ] Trial banner visible with correct ~30 day countdown in Journey 5
- [ ] Pro ESG metrics with ESRS S1 labels visible in Journey 3

**HOLD if any of the following are true:**
- [ ] `initSessionTimeout is not defined` fires in any dashboard
- [ ] begeleider-dashboard.html returns 404
- [ ] company-dashboard.html or school-dashboard.html fails to load at all
- [ ] Trial subscription not seeded for begeleider signup
- [ ] Any Supabase 500 error in Network tab during auth or profile save

---

*Script generated: 2026-04-16 · Based on SESSION_STATE.md (last updated 2026-04-16) + master audit findings*
