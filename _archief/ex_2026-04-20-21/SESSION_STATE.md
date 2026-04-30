---

# SESSION_STATE.md — Internly.pro
Last updated: 2026-04-16
Updated by: Barry + crew (Picard2, Data2, Deanna2, De Sensei, Tarlok)

---

## 1. Project state (macro)
Phase: Pre-livetest — week 6
Stack: Vanilla HTML/CSS/JS · Supabase (qoxgbkbnjsycodcqqmft) · 
       Mollie payments · FileZilla FTP · Supabase Edge Functions
Legal entity: Sasubo Holding B.V.

Last milestone: Full begeleider role implemented end-to-end — two new
subscription plans (begeleider_starter €49 / begeleider_pro €79), two
Edge Functions deployed, new begeleider-dashboard.html, auth.html role
card, pricing.html toggle section, hasActivePlan() updated in all three
copies, and session timeout wired across all five dashboard pages.

Next milestone: FTP upload of all pending files → live end-to-end test
→ livetest week 6

---

## 2. What was done this session (meso)

### Confirmed complete

#### Session timeout (A1)
- `initSessionTimeout()` wired into confirmed-auth block of five pages:
  - company-dashboard.html (after InternlyCalendar.render)
  - school-dashboard.html (after InternlyCalendar.render)
  - match-dashboard.html (after auth guard, before loadMatchFromDB)
  - bbl-hub.html (after loadRenewalStatus)
  - bbl-dashboard.html (after renderLeerdoelen)
- Verified `initSessionTimeout()` exists and works correctly in js/supabase.js

#### Homepage spacing (A2)
- index.html: `body { line-height: 1.7 }` added
- index.html: `.lp-tagline` → `max-width: 560px; margin: 0 auto 20px`
- index.html: BBL card grid gap `8px` → `20px`

#### Pricing Signalen mismatch fix (A3)
- pricing.html: Freemium "✓ Signalenoverzicht" changed to "– Signalen (Premium)"

#### Free tier dead code fix (A4)
- pricing.html: "Begin gratis" buttons changed from `goToAuth()` to
  `startCheckout('company_starter')` and `startCheckout('school_freemium')`

#### Begeleider plans — full implementation (B3–B9)

**B3 — create-checkout Edge Function**
- Added `begeleider_starter` (€49.00/mnd) and `begeleider_pro` (€79.00/mnd) to PLANS map
- `planAllowed` extended with `plan.startsWith('begeleider_') && profile.role === 'begeleider'`
- `redirectUrl` now three-way conditional (school → school-dashboard, begeleider → begeleider-dashboard, else → company-dashboard)
- `max_students` added to upsert: 30 (starter) / 100 (pro) / null (all others)
- **DEPLOYED** (Docker warning shown but upload confirmed successful)

**B4 — mollie-webhook Edge Function**
- `planIntervals`, `planAmounts`, `planDescriptions` all extended with both begeleider plans
- `max_students` added to first-payment activation update: 30 / 100 / `undefined` (non-begeleider)
- Note: `undefined` used (not null) for non-begeleider plans to avoid overwriting existing values
- **DEPLOYED with `--no-verify-jwt`** (confirmed successful)

**B5 — hasActivePlan() tiers updated in all three locations**
- js/supabase.js: tiers array extended to include `begeleider_starter`, `begeleider_pro`
- company-dashboard.html (~line 1182): same tiers extension
- school-dashboard.html (~line 1105): same tiers extension
- Ordering: begeleider plans at indices 5–6 (after school plans at 3–4)

**B6 — begeleider-dashboard.html created (new file)**
- Full teal color scheme (--teal: #0e7490, --teal-dark: #0a5668, --teal-bg: #ecfeff)
- Auth guard: getUser → role check (begeleider) → hasActivePlan('begeleider_starter') → redirect if no plan
- initSessionTimeout() called after guards pass
- Three screens: Dashboard (stats + plan card), Mijn studenten (with cap banner), Profiel
- loadSubscription() → plan badge, student limit, progress bar, upgrade CTA for starter
- loadStudents() → queries student_profiles where begeleider_profile_id = userId (graceful fallback)
- saveProfiel() upserts naam + sector to profiles table
- Local copies of notify(), hasActivePlan(), escapeHtml(), initSessionTimeout()

**B7 — auth.html begeleider role**
- CSS added: `.begeleider-role` with teal (#0e7490) border and selection styles
- Role card added (after school card): "Ik ben stagebegeleider", icon 📋
- ROUTES: `begeleider: 'begeleider-dashboard.html'`
- selectRole forEach now includes 'begeleider'
- roleLabel map: `begeleider: 'Stagebegeleider'`
- seedFreeSubscription guard at line ~706 confirmed: `if (role !== 'bedrijf' && role !== 'school') return` — begeleider users correctly get no free subscription seeded

**B8 — pricing.html begeleider section**
- Toggle button added: "Voor begeleiders"
- showSection() refactored from hardcoded two-section to forEach over ['bedrijf','school','begeleider']
- URL param handler: `if (p === 'school' || p === 'begeleider') showSection(p)`
- section-begeleider added with:
  - Starter: €49/mnd, max 30 studenten
  - Pro: €79/mnd, max 100 studenten

**B9 — pricing.html hero subtitle**
- Updated to: "Geen verborgen kosten. Bedrijven en scholen starten gratis. Individuele begeleiders starten vanaf €49/mnd."

#### Demo profiles feature for matchpool (match-dashboard.html)
- `DEMO_PROFILES` constant added (3 profiles: Vandaag Agency bedrijf, HvA school, Johan de Vries buddy)
  — each with trust_scores / stats / info_steps (4 steps per profile = 12 guide steps total)
- "Matchpool" tab added to sidebar (with 🔍 icon and info popover)
- `matchpool: renderMatchpool` added to switchTab renderers map
- `initDemoToggle()` called from `startHub()` so toggle state restores from localStorage on load
- Functions added: `_demoEnabled`, `initDemoToggle()`, `toggleDemoProfiles()`, `renderDemoCards()`, `renderDemoCard(p, idx)`
  — renderDemoCard has three type-specific branches: bedrijf (Trust Score + tags), school (3-stat grid), buddy (beschikbaarheid)
- `renderMatchpool()` function added — renders page-head + amber toggle bar + demo cards + empty state
- Guide overlay added to end of `<body>` (id="demo-guide-overlay", 12 dot indicators)
- Guide functions: `openDemoGuide()`, `closeDemoGuide()`, `demoGuideStep(dir)`, `renderGuideStep()`
  — outside-click on overlay closes guide
  — last step shows "Sluiten ✓" instead of "Volgende →"
- Toggle state persisted in `localStorage` key `internly_demo_profiles`

---

### Pending FTP upload
Every file below has been changed locally and has NOT yet been uploaded to internly.pro:

```
match-dashboard.html          ← initSessionTimeout + matchpool tab + demo profiles
company-dashboard.html        ← initSessionTimeout + hasActivePlan tiers
school-dashboard.html         ← initSessionTimeout + hasActivePlan tiers
bbl-hub.html                  ← initSessionTimeout
bbl-dashboard.html            ← initSessionTimeout
js/supabase.js                ← hasActivePlan tiers (begeleider plans added)
auth.html                     ← begeleider role card + ROUTES + selectRole + roleLabel
pricing.html                  ← begeleider section + A3 fix + A4 fix + B8 + B9
index.html                    ← A2 spacing fixes
begeleider-dashboard.html     ← NEW FILE — full dashboard
```

---

### SQL confirmed in Supabase this session
- subscriptions table — created ✅
- webhook_events table — created ✅
- STARR columns on stage_reflecties — confirmed ✅
- skills_toelichting on student_profiles — confirmed ✅
- meetings status constraint — confirmed ✅
- roc_profile_id on matches — confirmed ✅
- max_students on subscriptions — confirmed ✅
- subscriptions_plan_check constraint — confirmed ✅
- profiles_role_check constraint — confirmed ✅
- Full RLS policies on all tables — confirmed ✅

### Nothing SQL-related is pending before livetest.

---

### Edge Functions deployed
- `create-checkout` — deployed this session (Docker warning, upload confirmed)
- `mollie-webhook` — deployed this session with `--no-verify-jwt` (confirmed)

---

## 3. Open items by priority (micro)

### P1 — do before livetest

1. **FTP upload all 10 pending files** — see "Pending FTP upload" list above.

2. **match-dashboard.html 8× .single() crash** (audit P1) — lines 2541, 2556, 3513, 3572,
   3734, 3989, 4288, 4311. Change to .maybeSingle() or wrap in try/catch. Will crash on
   missing rows in production.

3. **vacature-detail.html — no auth guard** (audit P1) — any user can access without login.

4. **student-profile.html inverted error check** (audit P1) — `if (!mErr)` should be `if (mErr)`
   at line ~887.

5. **Test begeleider end-to-end**: register as begeleider → select role → checkout → Mollie
   webhook → begeleider-dashboard loads → Mijn studenten cap banner correct.

### P2 — do this week

7. **admin.html hardcoded email guard** (audit P1) — change to check `role = 'admin'` in profiles.

8. **company-dashboard.html conversation insert error destructuring** (audit P1).

9. **chat.html 4× .single() + missing theme-color** (audit P1).

10. **bbl-profile.html — no role guard** (audit P2) — any student can access.

11. **Missing theme-color meta** on student-profile.html, bbl-profile.html,
    vacature-detail.html, chat.html (audit P2).

12. **Supabase DPA** — aangevraagd 2026-04-14, nog niet ontvangen. Follow up.

13. **Postadres Sasubo Holding** — straatnaam/huisnummer ontbreekt in privacybeleid.html.

### P3 — backlog

15. **Shared JS module refactor** — escapeHtml, notify, Supabase URL/key duplicated in 8–11 files.
    Deferred post-launch deliberately.

16. **Buddy-systeem afmaken** — buddy_pair_id kolom op conversations + matching logica.

17. **Demo profiles in matchpool — real data** — currently shows only DEMO_PROFILES constant;
    wire to Supabase query for real company/school/buddy profiles.

18. **begeleider-dashboard.html — student_profiles.begeleider_profile_id column** — the
    loadStudents() query depends on this column existing; currently falls back gracefully to
    empty state if missing. Add via SQL when ready to go live with real data.

19. **accessibility — skip links + alt text** on all pages (audit P3).

20. **internly_simulator.html** — orphan page, only 1 inbound link, no topbar nav (audit P3).

---

## 4. Known system state

### Database (Supabase)
**Project:** qoxgbkbnjsycodcqqmft

Confirmed tables and key columns (as of latest known state):

| Table | Key columns / notes |
|-------|---------------------|
| profiles | id, role — constraint includes 'begeleider' ✅ |
| subscriptions | user_id, plan, status, current_period_end, max_students ✅ — plan constraint includes begeleider plans ✅ |
| matches | id, party_a, party_b, renewal_status, roc_profile_id ✅ |
| company_profiles | profile_id, bedrijfsnaam, sector |
| student_profiles | profile_id, skills (JSONB), skills_toelichting (JSONB) ✅ |
| stage_reflecties | situatie, taak, actie, resultaat, leermoment, leerdoel ✅ |
| meetings | status constraint includes all 7 values incl. student_getekend/bedrijf_getekend ✅ |
| push_subscriptions | endpoint, p256dh, auth_key, user_id |
| reviews | flagged, flag_reason, flagged_by, flagged_at |
| webhook_events | created this session ✅ |

### Live site vs local
**Currently live on internly.pro** (uploaded prior to this session):
- Last confirmed FTP state: as of HANDOVER.md 2026-04-14 upload list

**Local only — awaiting FTP upload this session:**
```
match-dashboard.html
company-dashboard.html
school-dashboard.html
bbl-hub.html
bbl-dashboard.html
js/supabase.js
auth.html
pricing.html
index.html
begeleider-dashboard.html (NEW — not yet on server at all)
```

**Edge Functions on Supabase (deployed this session):**
- `create-checkout` ✅ live
- `mollie-webhook` ✅ live
- `send-push-notification` ✅ live (deployed prior session)

### Pricing plans (current)

| Plan | Price | Role | Students |
|------|-------|------|----------|
| company_starter | Mollie flow (€ TBC) | bedrijf | — |
| company_pro | Mollie flow | bedrijf | — |
| company_business | Mollie flow | bedrijf | — |
| school_freemium | Free (seeded at signup) | school | — |
| school_premium | Mollie flow | school | — |
| begeleider_starter | €49/mnd | begeleider | max 30 |
| begeleider_pro | €79/mnd | begeleider | max 100 |

### Known architectural quirks

- **match-dashboard.html is self-contained** — no link to css/style.css. Info icon CSS
  and all shared utilities are duplicated inline. Intentional, deferred refactor post-launch.
- **hasActivePlan() exists in THREE places**: js/supabase.js, company-dashboard.html, school-dashboard.html.
  All three were updated this session to include begeleider plans.
- **begeleider users do NOT get a free subscription seeded** — confirmed: seedFreeSubscription
  guard at auth.html ~line 706: `if (role !== 'bedrijf' && role !== 'school') return`.
- **hasActivePlan() tier ordering caveat** — begeleider plans at indices 5–6; school plans at 3–4.
  A begeleider_starter (index 5) technically passes school_freemium gate (index 3) due to
  linear ordering. Acceptable for now — each dashboard has its own role guard as primary protection.
- **stage-hub.html = static demo only** — match-dashboard.html is the live DB-connected hub.

---

## 5. Start next session with this prompt

Copy-paste this at the start of your next Claude conversation:

"Read c:\Projects\Internly\SESSION_STATE.md and confirm you 
understand the current project state. Then tell me what the 
most important next step is before the week 6 livetest."

---
