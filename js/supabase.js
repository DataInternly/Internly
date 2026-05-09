// js/supabase.js
// Laad dit bestand ALTIJD na de Supabase CDN script en vóór alle pagina-scripts.
// Maakt één globale `db` client aan — beschikbaar als window.db op alle pagina's.
// SUPABASE_URL en SUPABASE_ANON_KEY staan uitsluitend in js/supabase.js (single source of truth).

const SUPABASE_URL      = 'https://qoxgbkbnjsycodcqqmft.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFveGdia2JuanN5Y29kY3FxbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MTg4OTUsImV4cCI6MjA5MTM5NDg5NX0.XpfdNGwTUG7uzuM0wifeXrws-hok_Ta7H5MyNZMZPzg';
// Beschikbaar stellen voor telemetry.js _tel.
// Volgorde: supabase.js → utils.js → telemetry.js — key is gegarandeerd aanwezig.
window.__SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

/* ── Run 1.5 v2 Issue 1 — passive client config op publieke pagina's ───────
   Op publieke pagina's draait Supabase JS v2 default met autoRefreshToken=true.
   Bij refresh-failure (expired refresh-token, netwerk-glitch) wist de client
   sb-auth-token uit localStorage → stille uitlog na navigatie terug naar
   beschermde pagina. Optie A (Barry-keuze): op publieke pagina's de refresh
   uitschakelen + URL-detect uit. localStorage blijft leesbaar (persistSession=true)
   zodat getUser() in waitlist (about), subscriptions (pricing) en kb.js
   blijft werken — alleen geen actieve refresh-poging meer.

   DRY-FLAG: PUBLIC_PAGES dupliceert de array in js/utils.js:41-48. Backlog:
   consolideer via js/config.js. Niet vandaag — utils.js laadt na supabase.js,
   geen import mogelijk zonder load-order te breken.
   ────────────────────────────────────────────────────────────────────────── */
const _supabaseIsPublicPage = (() => {
  const path = window.location.pathname;
  if (path === '/' || path === '') return true;
  const page = path.split('/').pop() || 'index.html';
  return [
    'index.html',
    'about.html',
    'kennisbank.html',
    'kennisbank-artikel.html',
    'privacybeleid.html',
    'algemene-voorwaarden.html',
    'cookiebeleid.html',
    'security.html',
    'spelregels.html',
    'faq.html',
    'hoe-het-werkt.html',
    'pricing.html',
    'stagebegeleiding.html',
    '404.html',
    'auth.html',
    'internly-worldwide.html',
    'la-sign.html',
    'preview.html',
    'esg-rapportage.html',
    'esg-export.html',
    'internly_simulator.html',
    'coming-soon-stagebegeleider.html',
    'coming-soon-international-student.html',
    'coming-soon-international-school.html'
  ].includes(page);
})();

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken:   !_supabaseIsPublicPage,
    persistSession:     true,
    detectSessionInUrl: !_supabaseIsPublicPage,
  }
});
window.db = db;

// Gedeelde constante voor het notification-type bij meeting-uitnodigingen.
// Gebruik deze in alle INSERT-statements zodat typen consistent blijven.
const MEETING_NOTIFICATION_TYPE = 'new_meeting';

/* ── SESSION FIXES ──────────────────────────────────────────────────────────
   Removed dead helpers: getCurrentUser(), signUp(), getInternships(),
   applyToInternship() — each page uses its own inline db client.
   ─────────────────────────────────────────────────────────────────────────── */

/* ── STATE CLEANUP (Run 1.6) ────────────────────────────────────────────────
   clearUserState() — verwijdert alle user-bound localStorage + sessionStorage
   bij logout én pre-login. Voorkomt cross-account data-leak (bv.
   internly_saved_vacatures van student A zichtbaar voor student B).

   PROTECTED_KEYS blijven staan: cookie-consent, taal, en device-flags die
   niet account-bound zijn.

   Ontworpen op basis van Run 1.6 storage-inventarisatie:
   - User-bound met _<userId> suffix: bbl_reflectie_draft, ld, ld_toelichting,
     bbl_reflecties, bbl_bedrijf, student_postcode, buddy_optin, welcomed,
     buddy_anon, buddy_paused
   - NOT user-bound (cross-leak risk): saved_vacatures, show_vacatures,
     referral_dismissed, demo_profiles
   ─────────────────────────────────────────────────────────────────────────── */
const PROTECTED_KEYS = [
  'internly_consent',       // AVG cookie-consent — moet blijven
  'internly_lang',          // UI-taal — device-pref
  'internly_waitlist_seen', // publieke flag, niet account-bound
  'internly_push_asked',    // browser-permission flag, device-bound
];

function clearUserState() {
  // F7.1.A: defensieve in-memory state cleanup (cross-account leak prevention)
  if (typeof window !== 'undefined') {
    if ('_currentUserId' in window) window._currentUserId = null;
    if ('__currentUser' in window)  window.__currentUser  = null;
    if ('__currentRole' in window)  window.__currentRole  = null;
  }

  // localStorage: verwijder alle internly_* en buddy_* keys behalve protected
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const isInternly = key.startsWith('internly_') || key.startsWith('buddy_');
    if (isInternly && !PROTECTED_KEYS.includes(key)) {
      toRemove.push(key);
    }
  }
  toRemove.forEach(k => localStorage.removeItem(k));

  // sessionStorage: volledig leeg
  try { sessionStorage.clear(); } catch (_) {}

  // In-memory globals
  if (typeof window !== 'undefined') {
    if (window.currentUser)    window.currentUser    = null;
    if (window.currentProfile) window.currentProfile = null;
  }
}
window.clearUserState = clearUserState;

// Push helpers live in js/push.js — loaded by all app pages that need push.
// index.html is a public landing page and does not register push notifications.

/* ── SESSION TIMEOUT ────────────────────────────────────────────────────────
   Tracks inactivity. Warns user at 18 min, signs out at 20 min.
   Resets on any user activity (mouse, keyboard, touch, scroll).
   Call once after confirming the user is authenticated.
   Works with both the global `supabase` client (index.html) and the page-level
   `db` client used by all other pages.
   ─────────────────────────────────────────────────────────────────────────── */
function initSessionTimeout() {
  const WARN_MS    = 18 * 60 * 1000; // 18 minutes — warn 2 min before signout
  const SIGNOUT_MS = 20 * 60 * 1000; // 20 minutes inactivity → signout
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
      // Run 1.6: state cleanup ook bij idle-timeout
      try { clearUserState(); } catch (_) {}
      window.location.replace('auth.html?reason=timeout');
    }, SIGNOUT_MS);
  }

  ['mousemove', 'keydown', 'click', 'touchstart', 'scroll', 'pointerdown'].forEach(evt =>
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
      .select('plan, status, next_billing_date')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (error || !sub) return false;
    if (!['active', 'past_due', 'trial'].includes(sub.status)) return false;
    if (sub.next_billing_date && new Date(sub.next_billing_date) < new Date()) return false;

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
    console.error('hasActivePlan error:', err?.message || 'onbekende fout');
    return false;
  }
}
