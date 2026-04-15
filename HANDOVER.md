# Internly — Developer Handover Report
**Last updated:** 2026-04-14 (evening)
**Sessions covered:** 2026-04-12 (Tasks 1–4), 2026-04-13/14 (Security audit, Stage Hub polish, Navigation audit, Info icons), 2026-04-14 (Landing page redesign), 2026-04-14 (Reflectieverslag systeem)

---

## Deploy checklist — all done ✅

| Item | Status |
|------|--------|
| `push_subscriptions` SQL | ✅ done |
| `reviews` moderation SQL | ✅ done |
| Edge Function `send-push-notification` | ✅ deployed |
| VAPID env vars set | ✅ done |
| FileZilla upload | ✅ done |

### FileZilla — reference upload list (for future sessions)
```
index.html
sw.js
js/push.js
js/info.js
css/style.css
auth.html
admin.html
chat.html
matches.html
mijn-sollicitaties.html
match-dashboard.html
stage-hub.html
student-profile.html
vacature-detail.html
company-dashboard.html
company-discover.html
school-dashboard.html
.htaccess
```

---

## Session 2026-04-12 — Tasks 1–4

### Task 1 — Web Push Notifications ✅ code complete

**Files:** `sw.js` (new), `js/push.js` (new), `auth.html`, `company-dashboard.html`, `school-dashboard.html`

- `sw.js` — Service worker: `push`, `notificationclick`, `pushsubscriptionchange`, `install`, `activate`
- `js/push.js` — `VAPID_PUBLIC_KEY` (real key already set), `urlBase64ToUint8Array()`, `registerPushNotifications(dbClient, userId)` — fire-and-forget, never throws
- `auth.html` — student login calls `registerPushNotifications()` after sign-in
- `company-dashboard.html` + `school-dashboard.html` — soft HTML banner shown once per device; "Ja, aanzetten" triggers push registration

**Test checklist**
- [ ] Run `push_subscriptions` SQL above
- [ ] Deploy Edge Function `send-push-notification`
- [x] VAPID public key set in `js/push.js` line 11
- [x] pg_net trigger `push_on_notification_insert` deployed
- [ ] Student login → browser permission dialog → accept → row in `push_subscriptions`
- [ ] Company/school banner → accept → row in `push_subscriptions`
- [ ] Accept a match → push arrives in OS notification centre with tab closed

**Edge Function**
```typescript
// supabase/functions/send-push-notification/index.ts
import webpush from "npm:web-push";
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { user_id, title, body, url } = await req.json();
  webpush.setVapidDetails(
    "mailto:hallo@internly.pro",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!
  );
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", user_id);
  await Promise.all((subs || []).map((sub) =>
    webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
      JSON.stringify({ title, body, url: url || "/" })
    ).catch(() => {})
  ));
  return new Response("ok");
});
```

---

### Task 2 — Review Moderation ✅ code complete

**Files:** `company-dashboard.html`, `admin.html` (new)

- Flag button (⚑) on each review card — writes `flagged / flag_reason / flagged_by / flagged_at`
- `admin.html` — email-guarded (`hallo@internly.pro`), direct URL only, not linked in nav:
  - Live stats (10 counters)
  - Flagged review queue with delete / mark-safe
  - Trust Score overrides per company
  - Waitlist table with CSV export

**Requires** the `ALTER TABLE reviews` SQL above.

---

### Task 3 — `created_by` null guards ✅ no code changes needed

`.eq('created_by', userId)` never returns NULL rows in Supabase. All queries confirmed safe.

---

### Task 4 — Trust Score throttle fix ✅ code complete

**Files:** `mijn-sollicitaties.html`, `company-dashboard.html`

- After review insert: clears `sessionStorage` throttle so company recalculates on next load
- `forceTrustRecalculate()` button added to Trust Score stat card
- `acceptMatch()` and `rejectMatch()` both clear throttle before notifications

---

## Session 2026-04-13/14 — Security + Polish

### Security audit ✅ code complete

| Fix | File | Severity |
|---|---|---|
| School loaded all students when `_schoolNaamFilter` was null | `school-dashboard.html` | P0 |
| Chat conversations leaked across users (client-side filter only) | `chat.html` | P0 |
| `select('*')` exposed all student profile fields to companies | `company-discover.html` | P1 |
| Missing HTTP security headers | `.htaccess` | P1 |

---

### Stage Hub polish ✅ code complete

**File:** `match-dashboard.html`

- `CAN.student.addDeadline` set to `true`
- Kalender tab: `+ Deadline` and `+ Afspraak` buttons in page header
- Overzicht tab: quick-nav row (Planning / Kalender / Afspraken / Taken)
- Planning tab: `→ Kalender` button next to `+ Deadline`

---

### Navigation audit ✅ code complete

All student pages now have a consistent 5-tab mobile nav (Ontdek · Matches · Stages · Hub · Profiel).

| File | Change |
|---|---|
| `matches.html` | Matches icon ❤️ → 💫 |
| `vacature-detail.html` | Mobile tab bar added (Ontdek active); topbar link to Stage Hub |
| `student-profile.html` | 5th tab 📊 Hub added |
| `company-discover.html` | Mobile tab bar added (Stagiairs active) |
| `chat.html` | Mobile tab bar added (Stages active); `padding-bottom: 68px` on mobile input-bar |
| `stage-hub.html` | `renderTaken`: `+ Taak toevoegen` hidden for school role |

---

### Info help icons ✅ code complete

**New files:** `js/info.js`, additions to `css/style.css`

Click-to-reveal popovers. No hover-only — mobile-safe. Closes on outside click or Escape. Auto-positions based on viewport.

| Page | Placement | Content |
|---|---|---|
| `matches.html` | Matchpool toggle | What the matchpool is and how it works |
| `mijn-sollicitaties.html` | Page title | All 3 statuses explained + Stage Hub tip |
| `match-dashboard.html` | Sidebar: Planning | Deadlines and milestones |
| `match-dashboard.html` | Sidebar: Kalender | Monthly view + add shortcuts |
| `match-dashboard.html` | Sidebar: Stageplan | Official plan with supervisors |
| `match-dashboard.html` | Sidebar: Taken | Shared task list across all roles |
| `match-dashboard.html` | Sidebar: Voortgang | Competencies + supervisor feedback |
| `match-dashboard.html` | Sidebar: Afspraken | Scheduling meetings |
| `company-dashboard.html` | Trust Score stat card | A/B/C/D logic + how to improve |
| `school-dashboard.html` | Studenten heading | School-name coupling, Stage Hub access |
| `school-dashboard.html` | Signalen heading | 14-day inactivity rule |

**Note:** `match-dashboard.html` has no `<link>` to `css/style.css` (self-contained). Info CSS is duplicated into its inline `<style>` block.

---

---

## Session 2026-04-14 — Landing page redesign

### Landing page ✅ code complete

**File:** `index.html`

Implemented a 10-step redesign spec using `internly-demo-v10.html` as visual reference. All existing Supabase integrations (`schrijfInHero`, `schrijfIn`, `enterApp`, waitlist popup) preserved intact.

**What changed:**

| Step | Change |
|------|--------|
| 1 | Hero gradient depth + radial vignette `::before` |
| 2 | Logo breathe animation (`lp-breathe`, 4s, `prefers-reduced-motion` safe) |
| 3 | Hook h1 — "40 mails. / 0 reacties. / Dat kan anders." with strikethrough animation (`lp-strike`) |
| 4 | Tagline subline — `lp-tagline` italic below the hook |
| 5 | Niveau pills (BBL / MBO / HBO / WO) — `lp-np` / `lp-np-on` classes |
| 6 | 3-column role tiles — `rt` / `rt-s` / `rt-b` / `rt-sc` replacing old vertical role-card list |
| 7 | Role description panel + microcopy + full-width CTA button (`btn-enter`) + explore text link |
| 8 | Post-hero sections: divider → stat strip (CBS data) → 3 quotes → how-it-works (3 cards) → ESG band → prev-user strip |
| 9 | Newsletter eyebrow badge (`lp-nl-eyebrow`) |
| 10 | Landing JS IIFE — `lpSetNiveau`, `pickRole`, `lpGoToRole`, `lpSetRole`, `lpUpdateBtn`, struck IntersectionObserver, scroll-reveal for `.lp-rev` elements |

**Architecture decisions:**
- All new CSS uses `lp-` prefix to avoid conflicts with app CSS in `css/style.css`
- `pickRole(el, role)` is the primary tile handler; `lpPickTile` is a fallback; `lpSetRole` bridges them to sync `lp.role` state
- Struck animation fires at t=1000ms (after heroIn completes at t=700ms) to avoid overlap
- `DM Mono` added to Google Fonts link for quote citations

**Bugs fixed during debug passes:**
- DM Mono not in Google Fonts link
- `.btn-enter` was `inline-flex` → `display:block; width:100%; max-width:420px`
- Role tiles missing `data-role` attributes
- Struck animation timing conflict with heroIn animation
- 7 orphaned CSS classes from old landing page removed
- Hero mobile padding (`padding:80px 24px`) → `48px 16px 40px` at ≤680px
- `.struck` clamp minimum too large for 375px phones → `clamp(2.6rem,13vw,5rem)` at ≤480px
- Pulse animation used `box-shadow` (clipped by `overflow:hidden`) → switched to `transform:scale(1.04)`

---

---

## Session 2026-04-14 (evening) — Reflectieverslag systeem

### ⚠️ SQL — MUST RUN BEFORE TESTING

Run these in the Supabase SQL editor in order:

```sql
-- 1. STARR-kolommen op stage_reflecties
ALTER TABLE stage_reflecties
  ADD COLUMN IF NOT EXISTS situatie   TEXT,
  ADD COLUMN IF NOT EXISTS taak       TEXT,
  ADD COLUMN IF NOT EXISTS actie      TEXT,
  ADD COLUMN IF NOT EXISTS resultaat  TEXT,
  ADD COLUMN IF NOT EXISTS leermoment TEXT,
  ADD COLUMN IF NOT EXISTS leerdoel   TEXT;

-- 2. Toelichting-kolom op student_profiles (BBL leerdoelen)
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS skills_toelichting JSONB DEFAULT '{}';

-- 3. Verlengingsstatus (al eerder gepland, nog steeds pending)
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS renewal_status JSONB DEFAULT '{}';

-- 4. Meetings-status constraint uitbreiden (BBL evaluatie handtekeningen)
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check;
ALTER TABLE meetings ADD CONSTRAINT meetings_status_check
  CHECK (status IN (
    'openstaand','bevestigd','afgewezen','student_getekend',
    'bedrijf_getekend','voltooid','geannuleerd'
  ));
```

### FTP — upload deze bestanden

```
match-dashboard.html
bbl-hub.html
```

### Wat is gebouwd

#### match-dashboard.html (Stage Hub — student/bedrijf/school)

| Feature | Detail |
|---|---|
| STARR reflectie modal | 5 velden (S/T/A/R/R) + periode + datum + leerdoel-koppeling |
| STARR chip indicators | Groene/grijze chips op elke reflectie-kaart; "x/5 ingevuld" label |
| Expand/collapse per reflectie | "Bekijk STARR-analyse ▾" toggle per kaart |
| Leerdoel-chip op kaart | Blauwe chip als reflectie gekoppeld is aan een leerdoel |
| Verwijder-knop | Rood prullenbak-icoon, bevestigingsdialoog, DB delete |
| PDF export | Volledig jsPDF A4: groene header, samenvatting, leerdoelen met minibalk, alle reflecties met STARR-secties en gekleurde badges |
| Voortgang stat-strip | Bovenaan voortgang-tab: leerdoelen gem. / reflecties count / STARR % |
| PDF shortcut in kaart | "📄 PDF" knop in reflectie-kaart header (verschijnt als er ≥1 reflectie is) |
| Volledigheid-kaart in overzicht | Voortgangsbalk + teller op de overzicht-tab |
| DB load uitgebreid | `reflectiesRes.data.map()` leest nu alle 7 STARR-velden |
| Demo data gevuld | Beide demo-reflecties hebben volledige STARR-inhoud + leerdoel-koppeling |

#### bbl-hub.html (BBL Hub — student)

| Feature | Detail |
|---|---|
| STARR zelfreflectie-form | 5 gekleurde STARR-velden vervangt enkelvoudige textarea |
| Live voortgangsteller | "x/5 velden ingevuld" — groen bij volledig |
| Auto-save draft | Elke toetsaanslag schrijft naar `internly_bbl_reflectie_draft_[uid]`; herstel bij tabwisseling |
| Opslaan naar DB | Sla op als `[Zelfreflectie-STARR] JSON` in messages-tabel |
| Velden wissen na opslaan | Draft + velden leeg na succesvolle opslag |
| Zelfreflectie-geschiedenis | Panel met eerdere STARR-reflecties (datum + chips + expand); verborgen als leeg |
| `loadBBLReflecties()` | Laadt van DB (messages), parset oud én nieuw formaat, synct naar localStorage |
| PDF export | Volledig jsPDF A4: leerdoelen met toelichtingen + alle zelfreflecties met STARR-breakdown |
| Leerdoel toelichtingen | Toggle-knop per leerdoel → textarea → opslaan naar `student_profiles.skills_toelichting` |
| jsPDF CDN | Toegevoegd aan `<head>` |

### Bekende beperkingen na vandaag

| # | Beperking |
|---|---|
| 1 | `stage_reflecties` STARR-kolommen werken pas na SQL-migratie (zie boven). Tot dan: nieuwe reflecties slaan STARR op in DB, oude rijen hebben NULL. Fallback: `leermoment` valt terug op `text`. |
| 2 | `student_profiles.skills_toelichting` werkt pas na SQL-migratie. Tot dan: toelichtingen alleen in localStorage. |
| 3 | BBL-history panel laadt alleen als `activeConvId` bekend is (= user heeft een actieve koppeling). Studenten zonder koppeling zien het panel niet. Correct gedrag. |
| 4 | PDF-export van match-dashboard gebruikt demo-`match`-object voor naam/bedrijf. Wanneer live DB-data wordt geladen, moeten `match.student.name` en `match.company.name` vanuit de DB worden gevuld (dat is al het geval zodra `loadHubFromDB()` de data overschrijft). |

---

## Morgen verder — instructies voor de volgende sessie

### Prioriteit 1 — SQL uitvoeren (5 min)
Voer de 4 SQL-statements uit in de Supabase SQL editor (zie boven). Zonder deze migraties mislukken STARR-opslag en leerdoel-toelichtingen in de DB.

### Prioriteit 2 — FTP uploaden
Upload `match-dashboard.html` en `bbl-hub.html` via FileZilla.

### Prioriteit 3 — Testen
Testscript:
1. Log in als BBL-student → bbl-hub.html
2. Ga naar Evaluatie-tab → schrijf een STARR-reflectie in alle 5 velden → Opslaan
3. Ververs de pagina → controleer dat de reflectie in "Eerdere zelfreflecties" verschijnt
4. Exporteer PDF → controleer dat leerdoelen, toelichtingen en reflectie erin staan
5. Log in als student (BOL) → match-dashboard.html
6. Ga naar Voortgang-tab → klik "+ Reflectie toevoegen" → vul STARR in → Opslaan
7. Controleer dat de chips groen zijn, de stat-strip klopt, en de "📄 PDF" knop werkt

### Prioriteit 4 — Volgende features (kies één)

**Optie A — Buddy-systeem afmaken**
- `buddy_pair_id` kolom op `conversations` (SQL in bbl-hub.html comment blok #4 — buddy_queue)
- Buddy-matching logica in `js/buddy.js` afmaken
- Test: student zonder koppeling → buddy-flow

**Optie B — Mollie betaalintegratie**
- `hasActivePlan()` in `js/supabase.js` is momenteel altijd `true` (stub)
- Pricing pagina heeft `startCheckout(plan)` stub
- Implementeer Mollie Payment Links of Checkout API
- Koppel subscription-status aan `profiles.plan` kolom

**Optie C — Privacybeleid afronden**
- Postadres Sasubo Holding ontbreekt in `privacybeleid.html`
- DPA met Supabase aanvragen (formulier bij Supabase dashboard → Settings → Legal)
- FTP upload `privacybeleid.html` na aanpassing

**Optie D — Admin-pagina versterken**
- `admin.html` auth-guard is alleen client-side e-mailcheck → voeg Supabase RLS-rol toe
- Waitlist CSV-export testen
- Flagged reviews queue testen met echte data

---

## Known limitations

| # | Limitation |
|---|---|
| 1 | ~~Push requires Edge Function + pg_net trigger~~ — both live as of 2026-04-14. Web Push fully operational. |
| 2 | `admin.html` auth guard is client-side email check only. Not linked in nav — direct URL access only. |
| 3 | Trust Score `sessionStorage` throttle — one tab session. Acceptable trade-off. |
| 4 | `admin.html` queries `.from('waitlist')` — update if table is named differently. |
| 5 | `stage-hub.html` is a static demo hub; `match-dashboard.html` is the live DB-connected hub. Demo links should always use `match-dashboard.html?match=UUID`. |
