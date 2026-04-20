// ── INTERNLY UTILS ──────────────────────────────────────────────────────────
// Centraal gedeeld bestand voor alle pagina's.
// Laad dit als EERSTE script-tag, vóór js/supabase.js, op elke pagina.
// ─────────────────────────────────────────────────────────────────────────────

// Supabase credentials staan uitsluitend in
// js/supabase.js — niet hier.

// ── Role routing ─────────────────────────────────────────────────────────────
// Centrale logica voor ingelogde user landing. Enige plek waar rol → URL beslist.
const ROLE_LANDING = {
  student:      'match-dashboard.html',
  bedrijf:      'company-dashboard.html',
  school:       'school-dashboard.html',
  gepensioneerd:'buddy-dashboard.html',
  begeleider:   'begeleider-dashboard.html',
  admin:        'admin.html',
};

function getRoleLanding(role, bblMode = false) {
  if (role === 'student' && bblMode === true) return 'bbl-hub.html';
  return ROLE_LANDING[role] || 'discover.html';
}

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
      // Geen student_profile → profiel nog niet aangemaakt (halverwege registratie).
      // Spiegelt routeStudent() gedrag exact.
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

async function fetchUserRole() {
  try {
    const client = (typeof db !== 'undefined') ? db
                 : (typeof supabase !== 'undefined') ? supabase
                 : null;
    if (!client) return null;
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

async function requireRole(...allowedRoles) {
  const validRoles = ['student', 'bedrijf', 'school'];
  const invalid = allowedRoles.filter(r => !validRoles.includes(r));
  if (invalid.length > 0) { console.error('[requireRole] onbekende rol(len):', invalid); return false; }
  const role = await fetchUserRole();
  if (!role) { window.location.replace('auth.html'); return false; }
  if (!allowedRoles.includes(role)) {
    console.warn('[requireRole] user rol', role, 'niet in toegestane', allowedRoles);
    window.location.replace(getRoleLanding(role));
    return false;
  }
  return true;
}

function getDisplayName(user) {
  if (!user) return 'Gebruiker';
  const naam = user?.user_metadata?.naam || user?.naam || user?.full_name;
  if (naam && typeof naam === 'string' && naam.trim()) return naam.trim();
  const email = user?.email || user?.user_metadata?.email;
  if (email && typeof email === 'string' && email.includes('@')) return email.split('@')[0];
  return 'Gebruiker';
}

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
window.addEventListener('load', () => {
  const client = (typeof db !== 'undefined') ? db
               : (typeof supabase !== 'undefined') ? supabase
               : null;
  if (client?.auth?.onAuthStateChange) {
    client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        __cachedUserRole = null;
        __cachedUserId   = null;
      }
    });
  }
});

window.requireRole    = requireRole;
window.getDisplayName = getDisplayName;
window.performLogout  = performLogout;

// ── Toast ─────────────────────────────────────────────────────────────────────
const TOAST_TIMEOUT_MS = 3200;
let   _toastTimer      = null;

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

function notify(msg, ok = null) {
  const n = document.getElementById('notif');
  if (!n) return;
  if (_toastTimer) clearTimeout(_toastTimer);

  const icon = ok === true  ? '✓ '
             : ok === false ? '✕ '
             : '';

  n.textContent = icon + msg;
  n.style.background = ok === true
    ? 'var(--green, #1a7a48)'
    : ok === false
    ? 'var(--red, #b82020)'
    : 'var(--ink, #0d1520)';
  n.classList.add('show');
  _toastTimer = setTimeout(() => n.classList.remove('show'), TOAST_TIMEOUT_MS);
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
  const { error } = await client.from('notifications').insert({
    user_id:    userId,
    type,
    ref_id:     refId   || null,
    ref_type:   refType || null,
    message,
    read:       false,
    read_at:    null,
    created_at: new Date().toISOString(),
  });
  if (error) console.warn('[createNotification] non-blocking error:', error.message);
}

// ── Centrale student routing ──────────────────────────────────────────────────
/**
 * Centrale student routing na login.
 * ENIGE plek waar bbl_mode routing beslist.
 * 7/11 principe: nooit dupliceren.
 *
 * @param {object} profile        - Supabase profiles row (moet role === 'student' zijn)
 * @param {object} studentProfile - student_profiles row (of null bij nieuw account)
 */
function routeStudent(profile, studentProfile) {
  if (!profile) {
    window.location.href = 'auth.html';
    return;
  }

  if (profile.role !== 'student') {
    console.error('[route] routeStudent aangeroepen voor non-student rol:', profile.role);
    window.location.href = 'auth.html';
    return;
  }

  // Geen profiel nog → profielaanmaak
  if (!studentProfile) {
    window.location.href = 'student-profile.html';
    return;
  }

  // Delegeer naar hub-routing — routeStudentByMode is de enige beslisser
  routeStudentByMode(studentProfile);
}

// ── Student hub routing na profielopslag ────────────────────────────────────
// Gebruikt na save in student-profile.html en na login met bestaand profiel.
// Andere functie dan routeStudent(): die stuurt naar profiel-invulpagina's;
// deze stuurt naar de werkende hub.
//
// PRODUCT KEUZE 19 apr 2026 — redirect alleen bij eerste aanmaak en track-wissel.
// Normale profielbewerking stuurt niet door (dat is verwarrend voor de student).
// Track-wissel (BOL→BBL of BBL→BOL) is hub-wisselend, daar is redirect logisch.
function routeStudentByMode(studentProfile) {
  if (!studentProfile || typeof studentProfile.bbl_mode !== 'boolean') {
    console.error('[routeStudentByMode] ongeldig profiel', studentProfile);
    if (typeof notify === 'function') notify('Profielgegevens onvolledig — log opnieuw in.');
    window.location.href = 'auth.html';
    return;
  }
  if (studentProfile.bbl_mode === true) {
    window.location.href = 'bbl-hub.html';
  } else {
    window.location.href = 'match-dashboard.html';
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
];

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
    case 'subscription_activated':  return '✓ Abonnement geactiveerd';
    case 'subscription_failed':     return 'Betaling mislukt — controleer je gegevens';
    case 'new_review':              return '⭐ Er is een nieuwe beoordeling over jou geplaatst';
    case 'application_accepted':    return n.message || 'Goed nieuws — je sollicitatie is geaccepteerd!';
    case 'application_rejected':    return n.message || 'Je sollicitatie is helaas afgewezen.';
    case 'school_referral':         return n.message || 'Je school heeft een doorverwijzing voor je gestuurd.';
    default:                        return n.message || 'Nieuwe melding';
  }
}

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
    <a href="/discover.html"          class="${activeTab === 'discover'      ? 'active' : ''}">Vacatures</a>
    <a href="/matches.html"           class="${activeTab === 'matches'       ? 'active' : ''}">Mijn matches</a>
    <a href="/mijn-sollicitaties.html" class="${activeTab === 'sollicitaties' ? 'active' : ''}">Sollicitaties</a>`;

  const bblNav = `
    <a href="/bbl-hub.html"       class="${activeTab === 'discover' ? 'active' : ''}">BBL Traject</a>
    <a href="/bbl-dashboard.html" class="${activeTab === 'matches'  ? 'active' : ''}">Dashboard</a>`;

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
      </div>
    </header>`;
}

async function renderStudentHeader({ containerId = 'student-header', activeTab = null } = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;

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
