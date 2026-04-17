// js/supabase.js
// Laad dit bestand ALTIJD na de Supabase CDN script en vóór alle pagina-scripts.
// Het maakt één globale `supabase` client aan die index.html kan hergebruiken.
// Alle andere pagina's declareren hun eigen `db` client inline.
// SUPABASE_URL en SUPABASE_ANON_KEY staan uitsluitend in js/supabase.js (single source of truth).
// De typeof-guard hieronder zorgt dat er nooit een duplicate-declaration crash kan optreden.

// Globale client — beschikbaar als `supabase` op index.html
// (gebruikt door schrijfInHero() en de waitlist-popup op index.html)
const SUPABASE_URL      = 'https://qoxgbkbnjsycodcqqmft.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFveGdia2JuanN5Y29kY3FxbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MTg4OTUsImV4cCI6MjA5MTM5NDg5NX0.XpfdNGwTUG7uzuM0wifeXrws-hok_Ta7H5MyNZMZPzg';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Gedeelde constante voor het notification-type bij meeting-uitnodigingen.
// Gebruik deze in alle INSERT-statements zodat typen consistent blijven.
const MEETING_NOTIFICATION_TYPE = 'new_meeting';

/* ── SESSION FIXES ──────────────────────────────────────────────────────────
   Removed dead helpers: getCurrentUser(), signUp(), getInternships(),
   applyToInternship() — each page uses its own inline db client.
   ─────────────────────────────────────────────────────────────────────────── */

// Push helpers live in js/push.js — loaded by all app pages that need push.
// index.html is a public landing page and does not register push notifications.

/* ── SESSION TIMEOUT ────────────────────────────────────────────────────────
   Tracks inactivity. Warns user at 25 min, signs out at 30 min.
   Call once after confirming the user is authenticated.
   Works with both the global `supabase` client (index.html) and the page-level
   `db` client used by all other pages.
   ─────────────────────────────────────────────────────────────────────────── */
function initSessionTimeout() {
  const WARN_MS    = 25 * 60 * 1000; // 25 minutes
  const SIGNOUT_MS = 30 * 60 * 1000; // 30 minutes
  let warnTimeout, signoutTimeout;

  function resetTimers() {
    clearTimeout(warnTimeout);
    clearTimeout(signoutTimeout);

    warnTimeout = setTimeout(() => {
      const notifyFn = typeof notify === 'function' ? notify : null;
      if (notifyFn) notifyFn('Je sessie verloopt over 5 minuten — sla je werk op');
    }, WARN_MS);

    signoutTimeout = setTimeout(async () => {
      const client = (typeof db !== 'undefined') ? db
                   : (typeof supabase !== 'undefined') ? supabase
                   : null;
      if (client) await client.auth.signOut().catch(() => {});
      window.location.replace('auth.html?reason=timeout');
    }, SIGNOUT_MS);
  }

  ['mousemove', 'keydown', 'click', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, resetTimers, { passive: true })
  );
  resetTimers();
}

/* ── FEATURE FLAGS ──────────────────────────────────────────────────────────
   hasActivePlan(minPlan) — returns true if the current user has at least the
   given plan tier active. Queries the subscriptions table in real-time.

   Plans:  'company_starter' | 'company_pro' | 'company_business'
           'school_freemium' | 'school_premium'

   Usage:
     if (await hasActivePlan('company_pro')) { renderESGExport(); }
   ─────────────────────────────────────────────────────────────────────────── */
async function hasActivePlan(minPlan = 'company_starter') {
  try {
    const client = (typeof db !== 'undefined') ? db
                 : (typeof supabase !== 'undefined') ? supabase
                 : null;
    if (!client) return false;
    const { data: { user } } = await client.auth.getUser();
    if (!user) return false;

    const { data: sub, error } = await client
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (error || !sub) return false;
    if (!['active', 'past_due', 'trial'].includes(sub.status)) return false;
    if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return false;

    const tiers = [
      'company_starter',
      'company_pro',
      'company_business',
      'school_freemium',
      'school_premium',
      'school_premium_monthly',
      'begeleider_starter',
      'begeleider_pro',
    ];

    return tiers.indexOf(sub.plan) >= tiers.indexOf(minPlan);
  } catch (err) {
    console.error('hasActivePlan error:', err);
    return false;
  }
}
