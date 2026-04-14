# Internly — Developer Handover Report
**Last updated:** 2026-04-14  
**Sessions covered:** 2026-04-12 (Tasks 1–4), 2026-04-13/14 (Security audit, Stage Hub polish, Navigation audit, Info icons)

---

## Deploy checklist — what still needs external action

### Supabase SQL Editor (run once)
```sql
-- 1. Push subscriptions table
CREATE TABLE push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL,
  auth_key   text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manages own subscriptions"
  ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- 2. Reviews moderation columns
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS flagged     bool        NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text,
  ADD COLUMN IF NOT EXISTS flagged_by  uuid        REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS flagged_at  timestamptz;
CREATE INDEX IF NOT EXISTS reviews_flagged_idx ON reviews(flagged) WHERE flagged = true;
```

### Supabase Edge Functions
Deploy `supabase/functions/send-push-notification/index.ts` — see full code in the Task 1 section below.  
Set environment variables: `VAPID_PUBLIC_KEY` (copy from `js/push.js` line 11), `VAPID_PRIVATE_KEY`.

### FileZilla — full upload list
```
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

## Known limitations

| # | Limitation |
|---|---|
| 1 | Push requires Edge Function + pg_net trigger. Trigger is live; Edge Function is not yet deployed. |
| 2 | `admin.html` auth guard is client-side email check only. Not linked in nav — direct URL access only. |
| 3 | Trust Score `sessionStorage` throttle — one tab session. Acceptable trade-off. |
| 4 | `admin.html` queries `.from('waitlist')` — update if table is named differently. |
| 5 | `stage-hub.html` is a static demo hub; `match-dashboard.html` is the live DB-connected hub. Demo links should always use `match-dashboard.html?match=UUID`. |
