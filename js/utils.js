// ── INTERNLY UTILS ──────────────────────────────────────────────────────────
// Centraal gedeeld bestand voor alle pagina's.
// Laad dit als EERSTE script-tag, vóór js/supabase.js, op elke pagina.
// ─────────────────────────────────────────────────────────────────────────────

// Supabase credentials staan uitsluitend in
// js/supabase.js — niet hier.

// ── Role routing ─────────────────────────────────────────────────────────────
// ROLE_LANDING — canon voor non-student-routing.
// Voor student-routing zie resolveStudentDashboard in js/roles.js.
// Beide worden door getRoleLanding (regel 20) gewrapt.
// Niet aanraken zonder §Rollen en routing in CLAUDE.md bij te werken.
//
// De 'student' entry hieronder is alleen een vangnet — getRoleLanding
// leest hem nooit voor role === 'student' (delegeert dan naar de canon
// in roles.js). Behouden voor het geval een toekomstige caller direct
// ROLE_LANDING[role] doet.
const ROLE_LANDING = {
  student:      'discover.html',
  bedrijf:      'company-dashboard.html',
  school:       'school-dashboard.html',
  gepensioneerd:'buddy-dashboard.html',
  begeleider:   'begeleider-dashboard.html',
  admin:        'admin.html',
};

// ── PUBLIC_PAGES — pagina's waar SIGNED_OUT geen redirect mag triggeren ──
// Bron-van-waarheid voor "publieke pagina ja/nee" — ook gebruikt door
// _isPublicPage() helper. Bijwerken bij elke nieuwe publieke pagina (CC-2:
// algemene-voorwaarden.html en cookiebeleid.html toegevoegd).
const PUBLIC_PAGES = [
  'index.html', 'about.html', 'kennisbank.html', 'kennisbank-artikel.html',
  'privacybeleid.html', 'algemene-voorwaarden.html', 'cookiebeleid.html',
  'spelregels.html', 'faq.html', 'hoe-het-werkt.html', 'pricing.html',
  'stagebegeleiding.html', '404.html', 'auth.html', 'internly-worldwide.html',
  'la-sign.html', 'preview.html', 'esg-rapportage.html', 'esg-export.html',
  'internly_simulator.html'
];
function _isPublicPage() {
  const path = window.location.pathname;
  if (path === '/' || path === '') return true;
  const currentPage = path.split('/').pop() || 'index.html';
  return PUBLIC_PAGES.includes(currentPage);
}
window.PUBLIC_PAGES  = PUBLIC_PAGES;
window._isPublicPage = _isPublicPage;

function getRoleLanding(role, bblMode = false) {
  // Wrapper for two canon mechanisms:
  //   - resolveStudentDashboard (js/roles.js) for student-routing
  //   - ROLE_LANDING (this file) for non-student-routing
  // See §Rollen en routing in CLAUDE.md.

  // Student path — delegate to roles.js canon
  // js/roles.js gegarandeerd geladen via §Laadvolgorde — geen typeof-check nodig
  if (role === 'student') {
    return resolveStudentDashboard(
      { role: role },
      bblMode ? { bbl_mode: true } : null
    );
  }

  // Non-student path — local lookup
  return ROLE_LANDING[role] || 'index.html';
}

// isValidRole — valideert of een rol-string een bekende
// productie-rol is. Gebruikt ROLE_LANDING als bron-van-waarheid.
// Zie §Rollen en routing in CLAUDE.md.
function isValidRole(role) {
  return typeof role === 'string' && role in ROLE_LANDING;
}
if (typeof window !== 'undefined') window.isValidRole = isValidRole;

async function smartHomeRedirect() {
  try {
    const client = (typeof db !== 'undefined') ? db
                 : (typeof supabase !== 'undefined') ? supabase
                 : null;
    if (!client) { window.location.href = 'index.html'; return; }

    const { data: { user } } = await client.auth.getUser();
    if (!user) { window.location.href = 'index.html'; return; }

    const { data: prof } = await client.from('profiles')
      .select('role').eq('id', user.id).maybeSingle();
    if (!prof?.role) { window.location.href = 'index.html'; return; }

    let bblMode = false;
    if (prof.role === 'student') {
      const { data: sp } = await client.from('student_profiles')
        .select('bbl_mode').eq('profile_id', user.id).maybeSingle();
      // Onboarding-guard: student zonder profiel → profiel-form
      // OPEN VRAAG (30 apr 2026): mogelijk conflict met canon B2 —
      // zie stap 4 deliverable. Identiek patroon als discover.html:1406
      // en auth.html:843.
      if (!sp) { window.location.href = 'student-profile.html'; return; }
      bblMode = sp.bbl_mode === true;
    }
    window.location.href = getRoleLanding(prof.role, bblMode);
  } catch (err) {
    console.error('[smartHomeRedirect] fout:', err?.message || err);
    window.location.href = 'index.html';
  }
}

window.smartHomeRedirect = smartHomeRedirect;
window.getRoleLanding    = getRoleLanding;

// ═══════════════════════════════════════════════════════════════════════════
// SPRINT 5 — GECENTRALISEERDE HELPERS
// requireRole · getDisplayName · performLogout
// Vervangt 16 role guards, 23 email-splits, 14 logout flows
//
// The Doctor — paradox note: requireRole gebruikt een in-memory cache als
// primaire rol-bron. sessionStorage.internly_role bestaat parallel als
// UI-cache voor pagina's die dat patroon al gebruiken. Beide zijn bronnen van
// waarheid totdat sprint 5b sessionStorage volledig vervangt. DB-waarde wint.
// ═══════════════════════════════════════════════════════════════════════════

let __cachedUserRole = null;
let __cachedUserId   = null;

// ── _waitForSession — race-fix voor session-restore ──
// Supabase v2 herstelt de sessie asynchroon uit localStorage. Bij verse
// page-load kan getSession()/getUser() null teruggeven vóórdat
// _recoverAndRefresh klaar is, met als gevolg een onterechte redirect
// naar auth.html. Deze helper resolved zodra:
//   - Supabase het INITIAL_SESSION event vuurt (sessie geladen)
//   - of getSession() nu al een sessie heeft (cache-hit)
//   - of een hard timeout van 3s om hangen te voorkomen
// Singleton — eenmalige cost per page-load.
let __sessionReadyPromise = null;
function _waitForSession() {
  if (__sessionReadyPromise) return __sessionReadyPromise;
  __sessionReadyPromise = new Promise((resolve) => {
    const client = (typeof db !== 'undefined') ? db
                 : (typeof supabase !== 'undefined') ? supabase
                 : null;
    if (!client?.auth) { resolve(null); return; }

    let resolved = false;
    let sub = null;
    const _resolve = (session) => {
      if (resolved) return;
      resolved = true;
      try { sub?.unsubscribe(); } catch (_) {}
      resolve(session);
    };

    // 1. Luister naar het auth-state-change event voor INITIAL_SESSION
    try {
      const result = client.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          _resolve(session);
        }
      });
      sub = result?.data?.subscription || null;
    } catch (e) {
      console.warn('[_waitForSession] onAuthStateChange failed:', e?.message || e);
    }

    // 2. Fallback — sessie kan al beschikbaar zijn (warm tab)
    client.auth.getSession()
      .then(({ data: { session } }) => { if (session) _resolve(session); })
      .catch(() => {});

    // 3. Hard timeout — voorkom hangen op edge-cases
    setTimeout(() => _resolve(null), 3000);
  });
  return __sessionReadyPromise;
}
window.awaitSession = _waitForSession;

async function fetchUserRole() {
  try {
    const client = (typeof db !== 'undefined') ? db
                 : (typeof supabase !== 'undefined') ? supabase
                 : null;
    if (!client) return null;
    // Wacht op session-restore vóór de eerste auth-check (race-fix CC-3)
    await _waitForSession();
    const { data: { user } } = await client.auth.getUser();
    if (!user) { __cachedUserRole = null; __cachedUserId = null; return null; }
    if (__cachedUserId === user.id && __cachedUserRole) return __cachedUserRole;
    const { data, error } = await client.from('profiles')
      .select('role').eq('id', user.id).maybeSingle();
    if (error) { console.error('[fetchUserRole] DB error:', error.message); return null; }
    __cachedUserRole = data?.role || null;
    __cachedUserId   = user.id;
    return __cachedUserRole;
  } catch (err) {
    console.error('[fetchUserRole] exception:', err);
    return null;
  }
}

// RUN7 Cat 3 — anti-flicker helper: maakt body zichtbaar na auth-check.
// Aanroepbaar vanuit pagina's die inline auth-checks doen (geen requireRole).
function markAuthReady() {
  if (document.body) {
    delete document.body.dataset.authPending;
    document.body.dataset.authReady = 'true';
  }
}
window.markAuthReady = markAuthReady;

/**
 * @deprecated Use guardPage() for new code. Kept for backwards-compat with
 * 6 existing callers (chat, discover, matches, mijn-berichten, mijn-notities,
 * mijn-sollicitaties) that haven't been migrated yet.
 *
 * Original auth guard — checks role, redirects on failure.
 */
async function requireRole(...allowedRoles) {
  const validRoles = [
    'student', 'bedrijf', 'school',
    'gepensioneerd', 'begeleider', 'admin'
  ];
  const invalid = allowedRoles.filter(r => !validRoles.includes(r));
  if (invalid.length > 0) { console.error('[requireRole] onbekende rol(len):', invalid); return false; }
  // RUN7 Cat 3 — anti-flicker: helper om body zichtbaar te maken na auth-check
  const _markReady = markAuthReady;
  try {
    const role = await fetchUserRole();
    if (!role) {
      _markReady();
      window.location.replace('auth.html');
      return false;
    }
    if (!allowedRoles.includes(role)) {
      console.warn('[requireRole] user rol', role, 'niet in toegestane', allowedRoles);
      _markReady();
      window.location.replace(getRoleLanding(role));
      return false;
    }
    _markReady();
    return true;
  } catch (err) {
    // Bij onverwachte fout: maak body sowieso zichtbaar zodat error niet onzichtbaar is
    _markReady();
    throw err;
  }
}

/**
 * Centralized auth guard for protected pages — successor to requireRole.
 * Encapsulates: body anti-flicker state, getSession (fast), role-check,
 * redirect-on-fail, exception-safety. Use on every protected page as first
 * action in your init flow.
 *
 * Usage:
 *   const auth = await guardPage('gepensioneerd');
 *   if (!auth) return; // redirect already happened
 *   const { user, profile, role } = auth;
 *
 * @param {string|string[]} allowedRoles - role names that may access this page
 * @param {object} [options]
 * @param {boolean} [options.useSession=true] - getSession() fast vs getUser() verified
 * @param {string} [options.fallbackUrl='auth.html'] - where to redirect on no-user
 * @returns {Promise<{user, profile, role}|null>}
 */
async function guardPage(allowedRoles, options) {
  options = options || {};
  const useSession  = options.useSession !== false; // default true
  const fallbackUrl = options.fallbackUrl || 'auth.html';
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  // Anti-flicker: mark pending if not already
  if (document.body && !document.body.dataset.authReady) {
    document.body.dataset.authPending = 'true';
  }

  // Internal helper — guarantees body becomes visible on every exit path
  const _markReady = () => {
    if (document.body) {
      delete document.body.dataset.authPending;
      document.body.dataset.authReady = 'true';
    }
  };

  try {
    const client = (typeof db !== 'undefined' && db) ||
                   (typeof supabase !== 'undefined' && supabase) ||
                   null;
    if (!client) {
      _markReady();
      window.location.replace('index.html');
      return null;
    }

    // Step 0: wait for Supabase session-restore — race-fix CC-3
    await _waitForSession();

    // Step 1: check session (fast — local storage, no network unless expired)
    let user = null;
    if (useSession) {
      const { data: sd } = await client.auth.getSession();
      user = sd && sd.session ? sd.session.user : null;
    } else {
      const { data: ud } = await client.auth.getUser();
      user = ud ? ud.user : null;
    }

    if (!user) {
      _markReady();
      window.location.replace(fallbackUrl);
      return null;
    }

    // Step 2: fetch profile + role
    const { data: profile } = await client
      .from('profiles')
      .select('id, role, naam')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !profile.role) {
      _markReady();
      window.location.replace(fallbackUrl);
      return null;
    }

    // Step 3: role check
    if (!roles.includes(profile.role)) {
      _markReady();
      const landing = (typeof getRoleLanding === 'function')
        ? getRoleLanding(profile.role)
        : 'index.html';
      window.location.replace(landing);
      return null;
    }

    // Success
    _markReady();
    return { user, profile, role: profile.role };

  } catch (err) {
    console.error('[guardPage] Auth-check failed:', err);
    _markReady(); // Always reveal body, even on error
    window.location.replace(fallbackUrl);
    return null;
  }
}

window.guardPage = guardPage;


function getDisplayName(user) {
  if (!user) return 'Gebruiker';
  const naam = user?.user_metadata?.naam || user?.naam || user?.full_name;
  if (naam && typeof naam === 'string' && naam.trim()) return naam.trim();
  const email = user?.email || user?.user_metadata?.email;
  if (email && typeof email === 'string' && email.includes('@')) return email.split('@')[0];
  return 'Gebruiker';
}

/**
 * Geef passende begroeting o.b.v. lokale tijd.
 * @param {string} naam - voornaam of volledige naam
 * @returns {string} bv "Goedemorgen, Jan van der Berg"
 */
function getDaypartGreeting(naam) {
  const u = new Date().getHours();
  let greeting;
  if (u >= 6 && u < 12)       greeting = 'Goedemorgen';
  else if (u >= 12 && u < 18) greeting = 'Goedemiddag';
  else if (u >= 18 && u < 23) greeting = 'Goedenavond';
  else                        greeting = 'Welkom terug';
  return naam ? `${greeting}, ${naam}` : greeting;
}
window.getDaypartGreeting = getDaypartGreeting;

// Ga terug naar vorige pagina; val terug op fallbackHref als er geen history is.
// Respecteert de authenticatie: logt NIET uit.
function goBack(fallbackHref) {
  const ref = document.referrer;
  const hasMeaningfulHistory = ref && !ref.includes('auth.html') && ref !== window.location.href;
  if (hasMeaningfulHistory || window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = fallbackHref || 'index.html';
  }
}
window.goBack = goBack;

async function performLogout() {
  try {
    const client = (typeof db !== 'undefined') ? db
                 : (typeof supabase !== 'undefined') ? supabase
                 : null;
    if (!client) throw new Error('geen Supabase client beschikbaar');
    const { error } = await client.auth.signOut();
    if (error) throw error;
    sessionStorage.clear();
    __cachedUserRole = null;
    __cachedUserId   = null;
    if (typeof setApplying === 'function') { try { setApplying(false); } catch (_) {} }
    window.location.replace('/index.html');
  } catch (err) {
    console.error('[performLogout] fout bij uitloggen:', err);
    if (typeof notify === 'function') notify('Uitloggen mislukt, probeer opnieuw', false);
    else alert('Uitloggen mislukt, probeer opnieuw');
  }
}

// Cache invalideren bij auth-state-change (laadt nadat alle scripts klaar zijn)
// CC-3: SIGNED_OUT triggert nu ook een redirect naar auth.html zolang we
// op een beschermde pagina staan. Op publieke pagina's blijft de
// gebruiker waar hij is (bv. logout vanaf about.html).
window.addEventListener('load', () => {
  const client = (typeof db !== 'undefined') ? db
               : (typeof supabase !== 'undefined') ? supabase
               : null;
  if (client?.auth?.onAuthStateChange) {
    client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        __cachedUserRole = null;
        __cachedUserId   = null;
        __sessionReadyPromise = null; // reset zodat volgende login opnieuw wacht
        if (!_isPublicPage()) {
          window.location.replace('auth.html');
        }
      }
    });
  }
});

window.requireRole    = requireRole;
window.getDisplayName = getDisplayName;
window.performLogout  = performLogout;

// ── Toast ─────────────────────────────────────────────────────────────────────
// TOAST_TIMEOUT_MS bewaard voor backward compat (callers kunnen het uitlezen)
const TOAST_TIMEOUT_MS = 3200;

// ── Globale sollicitatie-guard ────────────────────────────────────────────────
// Voorkomt dat een student tegelijkertijd op meerdere vacatures solliciteert,
// ook na paginanavigatie. Opgeslagen in sessionStorage (reset bij logout).
function isApplying() {
  return sessionStorage.getItem('internly_applying') === 'true';
}
function setApplying(bool) {
  if (bool) {
    sessionStorage.setItem('internly_applying', 'true');
  } else {
    sessionStorage.removeItem('internly_applying');
  }
}

// notify() — backward-compat wrapper om window.toast heen.
// ok === true  → toast.success (groen)
// ok === false → toast.error   (rood, persistent)
// ok === null  → toast.info    (blauw)
// Als toast.js nog niet geladen is: valt terug op de #notif div.
function notify(msg, ok = null) {
  if (window.toast) {
    if (ok === true)  return window.toast.success(msg);
    if (ok === false) return window.toast.error(msg);
    return window.toast.info(msg);
  }
  // Fallback — toast.js niet geladen
  const n = document.getElementById('notif');
  if (!n) return;
  n.textContent = (ok === true ? '✓ ' : ok === false ? '✕ ' : '') + msg;
  n.style.background = ok === true ? 'var(--green,#1a7a48)' : ok === false ? 'var(--red,#b82020)' : 'var(--ink,#0d1520)';
  n.classList.add('show');
  setTimeout(() => n.classList.remove('show'), TOAST_TIMEOUT_MS);
}

// ── Trust badge (platform-breed gedeeld) ─────────────────────────────────────
// wrapClass: optionele CSS-klasse voor de wrapper-span (standaard 'trust-badge').
// Gebruik 'trust-badge-sm' voor compacte kaartjes.
function renderTrustBadge(grade, score, showHint, wrapClass) {
  if (!grade || score === null) {
    return `<span class="trust-badge trust-new" title="Eerste vacature — nog geen reputatie opgebouwd. Geef het bedrijf een kans of wees alert.">Nieuw</span>`;
  }
  const g = grade.toLowerCase();
  const label = g === 'a'
    ? 'Betrouwbaar' : g === 'b'
    ? 'Gemiddeld' : 'Let op';
  const titleMap = {
    a: 'A score — betrouwbaar bedrijf, snelle reactie verwacht',
    b: 'B score — gemiddelde reactietijd',
    c: 'C score — langzame of geen reactie verwacht',
  };
  const hint = showHint
    ? `<span class="trust-hint">A = &lt;2 dagen · B = 2–5 dagen · C = traag</span>`
    : '';
  const base = wrapClass || 'trust-badge';
  return `<span class="${base} grade-${g}" title="${escapeHtml(titleMap[g] || '')}">${escapeHtml(grade)}${score != null ? ` <span style="opacity:.7;font-size:.68rem">${escapeHtml(String(score))}</span>` : ''} ${label}</span>${hint}`;
}

// ── XSS-bescherming ───────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/**
 * Disable a button or trigger element while an async operation runs.
 * Re-enables on success or error. Use to prevent double-submit.
 *
 * @example
 * await withSaveLock(submitBtn, async () => {
 *   await saveProfile(data);
 * });
 *
 * @param {HTMLElement|null} trigger - button to disable, or null for no-op
 * @param {Function} fn - async function to execute while locked
 * @returns {Promise<*>} whatever fn returns
 */
async function withSaveLock(trigger, fn) {
  if (!trigger) return fn();
  const wasDisabled = trigger.disabled;
  const originalText = trigger.textContent;
  trigger.disabled = true;
  trigger.dataset.saving = '1';
  // Optional UX: show "Bezig..." if button has text content
  if (originalText && !trigger.querySelector('*')) {
    trigger.textContent = 'Bezig...';
  }
  try {
    return await fn();
  } finally {
    trigger.disabled = wasDisabled;
    delete trigger.dataset.saving;
    if (originalText && !trigger.querySelector('*')) {
      trigger.textContent = originalText;
    }
  }
}
window.withSaveLock = withSaveLock;

// ── NL datum-formaat ──────────────────────────────────────────────────────────
function formatNLDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── createNotification (shared DB helper) ────────────────────────────────────
async function createNotification(userId, type, refId, refType, message) {
  if (!userId) {
    console.error('[createNotification] userId ontbreekt — notificatie niet verstuurd', { type, message });
    return;
  }
  // Tarpit vertraagt verdachte sessies (score >= 4) met 1.5–3.5s.
  // Normale gebruikers (score 0) merken geen vertraging.
  if (!VALID_NOTIFICATION_TYPES.includes(type)) {
    console.error('[createNotification] onbekend type:', type, '— geldige types:', VALID_NOTIFICATION_TYPES);
  }
  if (typeof _yield === 'function') await _yield();
  const client = (typeof db !== 'undefined') ? db
               : (typeof supabase !== 'undefined') ? supabase
               : null;
  if (!client) return;
  // RPC naar SECURITY DEFINER function (server-side validatie + audit-trail)
  // 29-04-2026 — gepatched van directe .insert() naar .rpc('create_notification')
  // om notification-spoofing (Unsub Knob P1) te blokkeren.
  const { error } = await client.rpc('create_notification', {
    target_user_id:  userId,
    notif_type:      type,
    notif_ref_id:    refId   || null,
    notif_ref_type:  refType || null,
    notif_message:   message,
  });
  if (error) {
    if (error.code === '42501') {
      console.warn('[createNotification] geweigerd door RPC validatie:', error.message);
    } else {
      console.warn('[createNotification] non-blocking error:', error.message);
    }
  }
}

// ── Notification type → weergavetekst ────────────────────────────────────────
// Single source of truth voor notification types.
// Bij toevoegen nieuw type: update DRIE plekken samen —
//   1. deze lijst  2. switch in getNotifText()  3. HANDOVER.md
const VALID_NOTIFICATION_TYPES = [
  'new_message', 'new_meeting',
  'meeting_accepted', 'meeting_rejected',
  'new_match',
  'eval_signed', 'eval_completed',
  'buddy_request', 'buddy_accepted', 'buddy_declined',
  'subscription_activated', 'subscription_failed',
  'new_review',
  'application_accepted', 'application_rejected',
  'school_referral',
  'begeleider_invite',
  'bundeling_approved',
  'bundeling_denied',
  'milestone_submitted',
  'milestone_confirmed',
  'verification_approved',
  'verification_rejected',
  'verification_pending',
];

// Worldwide company verification — shared contract
// 7/11 principe: één definitie voor alle locaties
// 1 mei 2026
const VERIFICATION_STATES = Object.freeze({
  UNVERIFIED: 'unverified',
  PENDING:    'pending',
  VERIFIED:   'verified',
  REJECTED:   'rejected'
});

const VERIFICATION_LABELS_NL = Object.freeze({
  unverified: '⚪ Niet geverifieerd',
  pending:    '⏳ In behandeling',
  verified:   '✓ Geverifieerd',
  rejected:   '✕ Afgewezen'
});

window.VERIFICATION_STATES    = VERIFICATION_STATES;
window.VERIFICATION_LABELS_NL = VERIFICATION_LABELS_NL;

function getNotifText(n) {
  switch (n.type) {
    case 'new_message':          return 'Nieuw bericht ontvangen';
    case 'new_meeting':          return 'Nieuwe afspraak aangevraagd';
    case 'meeting_accepted':     return '✓ Je afspraak is bevestigd';
    case 'meeting_rejected':     return '✕ Je afspraak is afgewezen';
    case 'new_match':            return 'Nieuwe match aangemaakt';
    case 'eval_signed': {
      const naam = (n.message || '').split(' heeft')[0] || '';
      return naam ? `${naam} heeft getekend — jouw handtekening is nodig` : 'Handtekening vereist';
    }
    case 'eval_completed':          return '✅ Evaluatie volledig afgerond';
    case 'buddy_request':           return 'Nieuw buddy-verzoek ontvangen';
    case 'buddy_accepted':          return '✓ Buddy-verzoek geaccepteerd';
    case 'buddy_declined':          return 'Buddy-verzoek afgewezen';
    case 'begeleider_invite':       return 'Nieuw begeleider-verzoek';
    case 'bundeling_approved':      return '✓ Je bundelverzoek is goedgekeurd';
    case 'bundeling_denied':        return 'Je bundelverzoek is helaas afgewezen';
    case 'subscription_activated':  return '✓ Abonnement geactiveerd';
    case 'subscription_failed':     return 'Betaling mislukt — controleer je gegevens';
    case 'new_review':              return '⭐ Er is een nieuwe beoordeling over jou geplaatst';
    case 'application_accepted':    return n.message || 'Goed nieuws — je sollicitatie is geaccepteerd!';
    case 'application_rejected':    return n.message || 'Je sollicitatie is helaas afgewezen.';
    case 'school_referral':         return n.message || 'Je school heeft een doorverwijzing voor je gestuurd.';
    case 'milestone_submitted':     return 'Nieuwe stap ingediend — bevestig in je dashboard.';
    case 'milestone_confirmed':     return 'Een mijlpaal in je stagevoortgang is bevestigd.';
    case 'verification_approved':   return '✓ Je bedrijf is geverifieerd — vacatures zijn nu zichtbaar voor studenten';
    case 'verification_rejected':   return '✕ Verificatie afgewezen — bekijk de reden in je profiel';
    case 'verification_pending':    return '⏳ Verificatie in behandeling — je ontvangt bericht binnen 48 uur';
    default:                        return n.message || 'Nieuwe melding';
  }
}

/* ─── Role-aware top navigation header ─── */

const HEADER_NAV_BY_ROLE = {
  student: [
    { id: 'stagehub',     label: 'Mijn Stage Hub', href: 'student-profile.html',     icon: '🎯' },
    { id: 'matchpool',    label: 'Matchpool',       href: 'matchpool.html',           icon: '🌊' },
    { id: 'vacatures',    label: 'Vacatures',       href: 'discover.html',            icon: '🔍' },
    { id: 'sollicitaties',label: 'Sollicitaties',   href: 'mijn-sollicitaties.html',  icon: '📋' },
    { id: 'berichten',    label: 'Berichten',       href: 'mijn-berichten.html',      icon: '💬' },
    { id: 'kennisbank',   label: 'Kennisbank',      href: 'kennisbank.html',          icon: '📚' },
    { id: 'buddy',        label: 'Buddy',           href: 'matches.html?type=buddy',  icon: '🤝' },
  ],
  gepensioneerd: [
    { id: 'overzicht',    label: 'Overzicht',       href: '#section-overzicht', icon: '🏠' },
    { id: 'matches',      label: 'Mijn matches',    href: '#section-matches',   icon: '🤝' },
    { id: 'berichten',    label: 'Mijn berichten',  href: 'mijn-berichten.html', icon: '💬' },
    { id: 'notities',     label: 'Mijn notities',   href: 'mijn-notities.html',  icon: '📓' },
    { id: 'profiel',      label: 'Mijn profiel',    href: '#section-profiel',   icon: '👤' },
  ],
  // Toekomstige rollen krijgen hier hun eigen nav-config.
  // company / school behouden hun bestaande sidebar-pattern.
};

/**
 * Render een rol-aware top-nav header in de container met id `role-header`.
 * Backwards-compatible: als die container niet bestaat, gebruikt `student-header`.
 *
 * @param {string} role - 'student' | 'gepensioneerd' | etc.
 * @param {string} activeTab - id van het actieve nav-item
 * @param {object} opts
 * @param {string} [opts.containerId='role-header'] - DOM target id
 * @param {object} [opts.profile] - profielinfo voor profile-chip
 * @param {boolean} [opts.showNotifBell=true]
 * @param {boolean} [opts.showBack=true]
 * @param {boolean} [opts.showLogout=true]
 */
async function renderRoleHeader(role, activeTab, opts = {}) {
  const items = HEADER_NAV_BY_ROLE[role];
  if (!items) {
    console.warn('renderRoleHeader: unknown role', role);
    return;
  }
  const containerId = opts.containerId || 'role-header';
  let container = document.getElementById(containerId);
  if (!container) {
    // Backwards-compat: probeer student-header
    container = document.getElementById('student-header');
    if (!container) {
      console.warn('renderRoleHeader: no container element');
      return;
    }
  }

  const showNotif  = opts.showNotifBell !== false;
  const showBack   = opts.showBack !== false;
  const showLogout = opts.showLogout !== false;
  const profile    = opts.profile || {};

  // Build nav HTML
  const navHtml = items.map(item => {
    const cls = [
      'role-nav-item',
      activeTab === item.id ? 'active' : '',
      item.disabled ? 'disabled' : '',
    ].filter(Boolean).join(' ');
    const href = item.disabled ? 'javascript:void(0)' : item.href;
    const aria = item.disabled ? ' aria-disabled="true"' : '';
    const badge = item.comingSoon ? ' <span class="role-nav-badge">binnenkort</span>' : '';
    return `<a href="${href}" class="${cls}"${aria} data-tab="${item.id}">
      <span class="role-nav-icon">${item.icon || ''}</span>
      <span class="role-nav-label">${escapeHtml(item.label)}</span>${badge}
    </a>`;
  }).join('');

  // Build chip + actions
  const initials = (profile.naam || '?').split(' ').map(s => s[0] || '').slice(0,2).join('').toUpperCase();
  const chipHtml = profile.naam
    ? `<div class="role-header-chip">
         <div class="role-header-chip-avatar">${initials}</div>
         <span class="role-header-chip-name">${escapeHtml(profile.naam)}</span>
       </div>`
    : '';

  const notifHtml = showNotif
    ? `<button class="role-header-bell" id="role-notif-bell" title="Notificaties">🔔<span class="role-header-bell-count" id="role-bell-count" hidden>0</span></button>`
    : '';
  const backHtml = showBack
    ? `<button class="role-header-back" onclick="goBack()" title="Terug">←</button>`
    : '';
  const logoutHtml = showLogout
    ? `<button class="role-header-logout" onclick="performLogout()" title="Uitloggen">Uit</button>`
    : '';

  container.innerHTML = `
    <div class="role-header-inner">
      <nav class="role-header-nav">${navHtml}</nav>
      <div class="role-header-actions">
        ${notifHtml}${chipHtml}${backHtml}${logoutHtml}
      </div>
    </div>
  `;

  // Wire notif-bell unread-count if available
  if (showNotif && typeof Internly?.getUnreadTotal === 'function') {
    try {
      const total = await Internly.getUnreadTotal();
      const countEl = document.getElementById('role-bell-count');
      if (countEl && total > 0) {
        countEl.textContent = total;
        countEl.hidden = false;
      }
    } catch (e) {
      console.warn('renderRoleHeader: unread fetch failed', e);
    }
  }
}
window.renderRoleHeader = renderRoleHeader;
window.HEADER_NAV_BY_ROLE = HEADER_NAV_BY_ROLE;

// ── Shared student header ─────────────────────────────────────────────────────
// Rendert de student-header voor bol en bbl pagina's.
// Vereist: Supabase client beschikbaar als `db` (gezet door js/supabase.js).

function _renderStudentHeaderLoggedOut() {
  return `
    <header class="student-header student-header--out">
      <a href="/index.html" class="student-header-logo">intern<span style="color:#e05c1a">ly</span></a>
      <a href="/auth.html?mode=signup" class="cta-create-profile">Maak nu een profiel aan</a>
    </header>`;
}

function _renderStudentHeaderLoggedIn({ profile, bblMode, buddyCount, activeTab }) {
  const avatarInit  = (profile.naam || '?').charAt(0).toUpperCase();
  const buddyLabel  = buddyCount > 0 ? `Buddy (${buddyCount})` : 'Vind een buddy';
  const buddyHref   = buddyCount > 0 ? '/matches.html?filter=buddy' : '/discover.html?filter=buddy';
  const profileHref = bblMode ? '/bbl-profile.html' : '/student-profile.html';
  const logoHref    = bblMode ? '/bbl-hub.html' : '/discover.html';

  const bolNav = `
    <a href="/match-dashboard.html"    class="${activeTab === 'hub'           ? 'active' : ''}">Mijn Stage Hub</a>
    <a href="/matchpool.html"          class="${activeTab === 'matchpool'     ? 'active' : ''}">Matchpool</a>
    <a href="/discover.html"          class="${activeTab === 'discover'      ? 'active' : ''}">Vacatures</a>
    <a href="/mijn-sollicitaties.html" class="${activeTab === 'sollicitaties' ? 'active' : ''}">Sollicitaties</a>
    <a href="/mijn-berichten.html"    class="${activeTab === 'berichten'     ? 'active' : ''}">Berichten</a>
    <a href="/kennisbank.html"         class="${activeTab === 'kennisbank'    ? 'active' : ''}">Kennisbank</a>`;

  const bblNav = `
    <a href="/bbl-hub.html"        class="${activeTab === 'discover'    ? 'active' : ''}">BBL Traject</a>
    <a href="/bbl-dashboard.html"  class="${activeTab === 'matches'     ? 'active' : ''}">Dashboard</a>
    <a href="/mijn-berichten.html" class="${activeTab === 'berichten'   ? 'active' : ''}">Berichten</a>
    <a href="/kennisbank.html"     class="${activeTab === 'kennisbank'  ? 'active' : ''}">Kennisbank</a>`;

  return `
    <header class="student-header">
      <a href="${logoHref}" class="student-header-logo">intern<span style="color:#e05c1a">ly</span></a>
      <nav class="student-nav">
        ${bblMode ? bblNav : bolNav}
        <a href="${buddyHref}" class="buddy-tab ${activeTab === 'buddy' ? 'active' : ''}">${escapeHtml(buddyLabel)}</a>
      </nav>
      <div class="student-header-actions">
        <div class="notif-bell" id="notifBell" onclick="toggleNotifDropdown(event)" style="display:none" role="button" aria-label="Meldingen" tabindex="0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span class="bell-count" id="bellCount" style="display:none">0</span>
          <div class="notif-dropdown" id="notifDropdown" style="display:none" onclick="event.stopPropagation()">
            <div class="nd-header">
              <span>Meldingen</span>
              <button class="nd-mark-all" onclick="markAllRead()">Alles gelezen</button>
            </div>
            <div class="nd-list" id="ndList"><div class="nd-empty">Geen meldingen</div></div>
          </div>
        </div>
        <a href="${profileHref}" class="profile-chip" title="Mijn profiel" aria-label="Mijn profiel">
          <span class="avatar">${escapeHtml(avatarInit)}</span>
        </a>
        <button class="sh-back-btn" onclick="goBack('discover.html')" title="Vorige pagina" aria-label="Vorige pagina">← Terug</button>
        <button class="sh-logout-btn" onclick="performLogout()" title="Uitloggen" aria-label="Uitloggen">↪ Uit</button>
      </div>
    </header>`;
}

/**
 * Rendert de gedeelde student-header voor BOL en BBL pagina's.
 *
 * @param {object} [opts={}]
 * @param {string} [opts.containerId='student-header']  id van het div-element waar de header in rendert.
 * @param {string|null} [opts.activeTab=null]  welke tab visueel actief is. Waarden: 'hub' | 'matchpool' | 'discover' | 'sollicitaties' | 'berichten' | 'buddy' | null.
 * @returns {Promise<void>}  Rendert inline, geen return-waarde.
 */
async function renderStudentHeader({ containerId = 'student-header', activeTab = null } = {}) {
  const el = document.getElementById(containerId);
  if (!el) {
    console.warn('[renderStudentHeader] container #' + containerId + ' not found');
    return;
  }

  const { data: { user } } = await db.auth.getUser();

  if (!user) {
    el.innerHTML = _renderStudentHeaderLoggedOut();
    return;
  }

  const [profileRes, spRes, buddyRes] = await Promise.all([
    db.from('profiles')
      .select('id, naam, role, is_buddy_eligible')
      .eq('id', user.id)
      .maybeSingle(),
    db.from('student_profiles')
      .select('bbl_mode, buddy_opt_in')
      .eq('profile_id', user.id)
      .maybeSingle(),
    db.from('buddy_pairs')
      .select('id', { count: 'exact', head: true })
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'active'),
  ]);

  if (profileRes.error) {
    console.error('[renderStudentHeader] profiles fout:', profileRes.error);
    notify('Header kon niet laden', false);
    return;
  }
  if (spRes.error) {
    console.error('[renderStudentHeader] student_profiles fout:', spRes.error);
  }
  if (buddyRes.error) {
    console.error('[renderStudentHeader] buddy_pairs fout:', buddyRes.error);
  }

  const profile    = profileRes.data || { naam: '' };
  const bblMode    = spRes?.data?.bbl_mode === true;
  const buddyCount = buddyRes?.count ?? 0;

  el.innerHTML = _renderStudentHeaderLoggedIn({ profile, bblMode, buddyCount, activeTab });
}

window.renderStudentHeader = renderStudentHeader;

// ── Ongelezen berichten teller (over alle conversations) ──────────────────────
async function getUnreadTotal(userId) {
  if (!userId) return 0;
  try {
    const client = (typeof db !== 'undefined') ? db : null;
    if (!client) return 0;

    // 1. Match-based conversations
    const { data: userMatches } = await client.from('matches')
      .select('id')
      .or(`party_a.eq.${userId},party_b.eq.${userId}`)
      .eq('status', 'accepted');
    const matchIds = (userMatches || []).map(m => m.id);

    // 2. Buddy-pair conversations
    const { data: userPairs } = await client.from('buddy_pairs')
      .select('id')
      .or(`student_id.eq.${userId},buddy_id.eq.${userId}`);
    const pairIds = (userPairs || []).map(p => p.id);

    if (matchIds.length === 0 && pairIds.length === 0) return 0;

    // 3. Conversation IDs voor beide bronnen
    let convFilter = '';
    if (matchIds.length > 0) convFilter += `match_id.in.(${matchIds.join(',')})`;
    if (pairIds.length > 0)  convFilter += (convFilter ? ',' : '') + `buddy_pair_id.in.(${pairIds.join(',')})`;

    const { data: convs } = await client.from('conversations')
      .select('id')
      .or(convFilter);
    const convIds = (convs || []).map(c => c.id);
    if (convIds.length === 0) return 0;

    // 4. Ongelezen berichten waar ik NIET de afzender ben
    const { count } = await client.from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .eq('read', false)
      .neq('sender_id', userId);

    return count || 0;
  } catch (e) {
    console.warn('[utils] getUnreadTotal failed:', e?.message || e);
    return 0;
  }
}

window.getUnreadTotal = getUnreadTotal;
window.Internly = window.Internly || {};
window.Internly.getUnreadTotal = getUnreadTotal;

// ── Validatie helpers ─────────────────────────────────────────────────────────
// Één plek. Nooit elders definiëren. (7/11 principe)

function validatePassword(password) {
  if (typeof password !== 'string') return { length:false, uppercase:false, number:false, valid:false };
  const length    = password.length >= 8;
  const uppercase = /[A-Z]/.test(password);
  const number    = /[0-9]/.test(password);
  return { length, uppercase, number, valid: length && uppercase && number };
}

function validateEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim().toLowerCase());
}

function sanitizeNaam(naam) {
  if (typeof naam !== 'string') return '';
  return naam.trim().slice(0, 100);
}

function validatePostcode(postcode) {
  if (typeof postcode !== 'string') return null;
  const normalized = postcode.trim().toUpperCase().replace(/\s/g, '');
  return /^[0-9]{4}[A-Z]{2}$/.test(normalized) ? normalized : null;
}

window.validatePassword = validatePassword;
window.validateEmail    = validateEmail;
window.sanitizeNaam     = sanitizeNaam;
window.validatePostcode = validatePostcode;
