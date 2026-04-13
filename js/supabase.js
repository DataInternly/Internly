// js/supabase.js
// Laad dit bestand ALTIJD na de Supabase CDN script en vóór alle pagina-scripts.
// Het maakt één globale `supabase` client aan die index.html kan hergebruiken.
// Alle andere pagina's declareren hun eigen `db` client inline.

const SUPABASE_URL      = 'https://qoxgbkbnjsycodcqqmft.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFveGdia2JuanN5Y29kY3FxbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MTg4OTUsImV4cCI6MjA5MTM5NDg5NX0.XpfdNGwTUG7uzuM0wifeXrws-hok_Ta7H5MyNZMZPzg';

// Globale client — beschikbaar als `supabase` op index.html
// (gebruikt door schrijfInHero() en de waitlist-popup op index.html)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── SESSION FIXES ──────────────────────────────────────────────────────────
   Removed dead helpers: getCurrentUser(), signUp(), getInternships(),
   applyToInternship() — each page uses its own inline db client.
   ─────────────────────────────────────────────────────────────────────────── */

// ── WEB PUSH — VAPID PUBLIC KEY ───────────────────────────────────────────────
// Generate once with:  npx web-push generate-vapid-keys
// Store public key here. Private key goes ONLY in the Supabase Edge Function
// environment variable VAPID_PRIVATE_KEY — never in any frontend file.
const VAPID_PUBLIC_KEY = 'BFf-cKMpdJYQu8zSEQ3yg3F50kl8wmnYtQM0tDxM6fBOixY6kBC1LfZx_8jzMe6oKkkWXd0GVfQ7DLCuMwcf1EY';

// ── WEB PUSH — HELPER: base64url → Uint8Array ─────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding  = '='.repeat((4 - base64String.length % 4) % 4);
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData  = window.atob(base64);
  const output   = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

// ── WEB PUSH — REGISTER SUBSCRIPTION ─────────────────────────────────────────
// Called after login (auth.html) and after user clicks "Ja, aanzetten" in the
// soft prompt banner (company-dashboard.html, school-dashboard.html).
// Always fire-and-forget — never block any user flow.
//
// Parameters:
//   dbClient  — the page's local Supabase client (const db = …)
//   userId    — the authenticated user's profiles.id
//
// Returns: true if permission was granted and subscription was stored,
//          false/undefined on any failure.
async function registerPushNotifications(dbClient, userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (!userId) return false;
  // Guard: VAPID key not yet configured — skip silently
  if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.startsWith('REPLACE_')) return false;

  try {
    // 1. Register / reuse service worker
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // 2. Check permission state
    if (Notification.permission === 'denied') return false;

    // 3. Request permission only if not already granted
    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return false;
    }

    // 4. Get or create push subscription
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    // 5. Upsert subscription in Supabase (endpoint is UNIQUE)
    const subJson = subscription.toJSON();
    await dbClient.from('push_subscriptions').upsert({
      user_id:  userId,
      endpoint: subJson.endpoint,
      p256dh:   subJson.keys.p256dh,
      auth_key: subJson.keys.auth
    }, { onConflict: 'endpoint' });

    // 6. Listen for re-subscription requests from the service worker
    try {
      const bc = new BroadcastChannel('internly-sw');
      bc.onmessage = function(e) {
        if (e.data?.type === 'resubscribe_needed') {
          localStorage.removeItem('internly_push_asked');
        }
      };
    } catch(_) { /* BroadcastChannel not available — ignore */ }

    return true;

  } catch(e) {
    console.warn('[push] Registration failed (non-blocking):', e);
    return false;
  }
}

/* ── SESSION IMPLEMENTATION ─────────────────────────────────────────────────
   TASK:           1 — Web Push Notifications
   LIMITATION:     LIMITATION 1 — Push Notifications
   ADDED:          VAPID_PUBLIC_KEY constant (placeholder — replace before deploy)
                   urlBase64ToUint8Array() — converts VAPID key for PushManager
                   registerPushNotifications(dbClient, userId) — registers SW,
                     requests permission, upserts push_subscriptions row,
                     wires BroadcastChannel for key-rotation recovery
   MODIFIED:       js/supabase.js — appended to existing file
   NULL GUARDS:    Guards against missing VAPID key, missing userId,
                   unsupported browser — all fail silently
   SQL REQUIRED:
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
   EDGE FUNCTION:  registerPushNotifications() stores the subscription that
                   the Edge Function send-push-notification reads when sending
   VERIFIED VIA:   After login → push permission banner shown →
                   user clicks "Ja, aanzetten" → subscription stored in DB →
                   next notification insert triggers push delivery
   ─────────────────────────────────────────────────────────────────────────── */
