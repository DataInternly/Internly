// ── INTERNLY UTILS ──────────────────────────────────────────────────────────
// Centraal gedeeld bestand voor alle pagina's.
// Laad dit als EERSTE script-tag, vóór js/supabase.js, op elke pagina.
// ─────────────────────────────────────────────────────────────────────────────

// Supabase credentials staan uitsluitend in
// js/supabase.js — niet hier.

// ── Role routing ─────────────────────────────────────────────────────────────
// Centrale logica voor ingelogde user landing. Enige plek waar rol → URL beslist.
const ROLE_LANDING = {
  student:      'discover.html',
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
      bblMode = sp?.bbl_mode === true;
    }
    window.location.href = getRoleLanding(prof.role, bblMode);
  } catch (err) {
    console.error('[smartHomeRedirect] fout:', err?.message || err);
    window.location.href = 'index.html';
  }
}

window.smartHomeRedirect = smartHomeRedirect;
window.getRoleLanding    = getRoleLanding;

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
