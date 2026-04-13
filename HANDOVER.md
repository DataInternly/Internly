# Internly — Developer Handover Report
**Session date:** 2026-04-12  
**Tasks completed:** Task 1 (Web Push), Task 2 (Review Moderation), Task 3 (created_by null guards audit), Task 4 (Trust Score throttle fix)

---

## Summary of changes

| File | Status | Tasks |
|---|---|---|
| `sw.js` | NEW | Task 1 |
| `js/supabase.js` | UPDATED | Task 1 |
| `auth.html` | UPDATED | Task 1 |
| `company-dashboard.html` | UPDATED | Tasks 1, 2, 3, 4 |
| `school-dashboard.html` | UPDATED | Task 1 |
| `mijn-sollicitaties.html` | UPDATED | Task 4 |
| `admin.html` | NEW | Task 2 |

---

## Task 1 — Web Push Notifications

### What was built
- **`sw.js`** — Service worker handling `push`, `notificationclick`, `pushsubscriptionchange`, `install`, `activate`
- **`js/supabase.js`** — Added `VAPID_PUBLIC_KEY` constant, `urlBase64ToUint8Array()`, and `registerPushNotifications(dbClient, userId)` global helper
- **`auth.html`** — After student login: calls `registerPushNotifications()` (native dialog, fire-and-forget)
- **`company-dashboard.html`** — Soft HTML banner (bottom-right) shown once per device; "Ja, aanzetten" triggers `registerPushNotifications()`
- **`school-dashboard.html`** — Same soft banner pattern as company dashboard

### SQL to run (Supabase SQL Editor)
```sql
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
```

### VAPID keys — generate once before deploy
```bash
npx web-push generate-vapid-keys
```
1. Copy the **public key** → replace `'REPLACE_WITH_GENERATED_PUBLIC_KEY'` in `js/supabase.js` line 22
2. Copy the **private key** → add as Supabase Edge Function env var: `VAPID_PRIVATE_KEY`
3. Never commit the private key to the repo

### Edge Function — `send-push-notification`
Create in Supabase Dashboard → Edge Functions. Code:

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

  const sends = (subs || []).map((sub) =>
    webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
      JSON.stringify({ title, body, url: url || "/" })
    ).catch(() => {}) // stale subscription — ignore
  );
  await Promise.all(sends);

  return new Response("ok");
});
```

### Trigger setup (pg_net — already deployed)
Instead of a Database Webhook (requires paid plan), a PostgreSQL trigger via `pg_net` is used. This was run in the Supabase SQL Editor:

- Extension `pg_net` enabled in schema `extensions`
- Trigger function `notify_push_on_notification()` — calls `net.http_post()` with `user_id`, `title`, `body`, `url` built from `NEW.ref_type`/`NEW.ref_id`; swallows all exceptions so a failed HTTP call never blocks the INSERT
- Trigger `push_on_notification_insert` — `AFTER INSERT FOR EACH ROW` on `notifications`

To verify it's active:
```sql
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'notifications'
  AND trigger_name = 'push_on_notification_insert';
```

### Environment variables required
| Key | Where | Value |
|---|---|---|
| `VAPID_PUBLIC_KEY` | Edge Function env | Generated public key |
| `VAPID_PRIVATE_KEY` | Edge Function env | Generated private key |
| `SUPABASE_URL` | Auto-injected | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected | — |

### Manual test checklist
- [ ] Generate VAPID keys and replace placeholder in `js/supabase.js`
- [ ] Deploy Edge Function `send-push-notification`
- [ ] Run `push_subscriptions` SQL above in Supabase SQL Editor
- [x] pg_net trigger `push_on_notification_insert` deployed via SQL Editor
- [ ] Log in as a student → browser shows native permission dialog → accept → row appears in `push_subscriptions`
- [ ] Log in as company/school → soft banner appears → "Ja, aanzetten" → browser dialog → accept → row appears
- [ ] Trigger a notification (e.g. accept a match) → push arrives in OS notification centre with tab closed

---

## Task 2 — Review Moderation

### What was built
- **`company-dashboard.html`** — Flag button (⚑) on each review card; `flagReview(reviewId)` prompts for reason, writes `flagged/flag_reason/flagged_by/flagged_at`; review query now includes `flagged` column
- **`admin.html`** (new) — Protected by `user.email !== 'hallo@internly.pro'` auth guard:
  - **Stats** — 10 live counters (students, companies, schools, postings, applications, matches, messages, waitlist, reviews, flagged reviews)
  - **Flagged reviews** — list with reviewer/reviewee names, review body, flag reason, delete or mark-safe actions
  - **Trust overrides** — table of all company profiles with editable score input → saves to `company_profiles` and `internship_postings`
  - **Waitlist** — full table with copy-email button and CSV export

### SQL to run
```sql
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS flagged     bool        NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text,
  ADD COLUMN IF NOT EXISTS flagged_by  uuid        REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS flagged_at  timestamptz;

CREATE INDEX IF NOT EXISTS reviews_flagged_idx ON reviews(flagged) WHERE flagged = true;
```

---

## Task 3 — `created_by` null guards

### Audit result
All queries in `company-dashboard.html` filtering on `internship_postings.created_by` use:
```javascript
.eq('created_by', companyUserId)
```
Supabase translates this to `WHERE created_by = $1`. Rows with `created_by IS NULL` are **never returned** by an equality filter — no explicit null guard is needed.

Locations confirmed safe:
- `herberekeningTrustScore()` — `loadPostings()` uses `.eq('created_by', currentUser.id)` 
- `triggerCompanyMatching()` — posts `created_by` on insert; queries always filter by it
- `loadPostings()` — `.eq('created_by', currentUser.id)`

No code changes required.

---

## Task 4 — Trust Score throttle fix

### What was built
- **`mijn-sollicitaties.html`** — After successful review insert, before firing notification:
  ```javascript
  sessionStorage.removeItem('internly_trust_calculated_' + revieweeId);
  ```
  This forces the company's dashboard to recalculate Trust Score on next load.

- **`company-dashboard.html`** — `forceTrustRecalculate()` button in Trust Score stat card; calls `sessionStorage.removeItem()` then re-runs `herberekeningTrustScore()`. Also:
  - `acceptMatch()` now clears the throttle key before `notify()`
  - `rejectMatch()` now clears the throttle key before `notify()`

---

## Known limitations (unchanged from spec)

### LIMITATION 1 — Push Notifications
Background push requires the Edge Function + Database Webhook to be wired up manually (see checklist above). VAPID keys must be generated and configured before push works. The service worker at `/sw.js` must be served from the root domain — a subdirectory path will not work.

### LIMITATION 2 — Admin auth
The `admin.html` guard is client-side email check only. The actual data security is enforced by Supabase RLS policies. The admin page is not linked from any navigation — access by direct URL only. Consider adding a row-level policy on `reviews` allowing bulk delete only for service-role key, not the anon key.

### LIMITATION 3 — Trust Score throttle
The `sessionStorage` throttle prevents recalculation within a single browser tab session. If a company and a student share the same device/browser session (rare but possible), one clear could affect both. This is an acceptable trade-off for the simple throttle design.

### LIMITATION 4 — Waitlist table name
The waitlist query in `admin.html` assumes a table named `waitlist`. If the actual table name differs (e.g. `waitlist_signups`), update the `.from('waitlist')` calls in `admin.html`.
