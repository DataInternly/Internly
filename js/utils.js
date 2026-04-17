// ── INTERNLY UTILS ──────────────────────────────────────────────────────────
// Centraal gedeeld bestand voor alle pagina's.
// Laad dit als EERSTE script-tag, vóór js/supabase.js, op elke pagina.
// ─────────────────────────────────────────────────────────────────────────────

// Supabase credentials staan uitsluitend in
// js/supabase.js — niet hier.

// ── Toast ─────────────────────────────────────────────────────────────────────
const TOAST_TIMEOUT_MS = 3200;
let   _toastTimer      = null;

function notify(msg, ok = null) {
  const n = document.getElementById('notif');
  if (!n) return;
  if (_toastTimer) clearTimeout(_toastTimer);
  n.textContent = msg;
  n.style.background = ok === true
    ? 'var(--green, #1a7a48)'
    : ok === false
    ? 'var(--red, #b82020)'
    : 'var(--ink, #0d1520)';
  n.classList.add('show');
  _toastTimer = setTimeout(() => n.classList.remove('show'), TOAST_TIMEOUT_MS);
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
  if (!userId) return;
  const client = (typeof db !== 'undefined') ? db
               : (typeof supabase !== 'undefined') ? supabase
               : null;
  if (!client) return;
  const { error } = await client.from('notifications').insert({
    user_id: userId, type,
    ref_id: refId || null, ref_type: refType || null,
    message, read: false,
  });
  if (error) console.warn('[createNotification] non-blocking error:', error.message);
}

// ── Notification type → weergavetekst ────────────────────────────────────────
function getNotifText(n) {
  switch (n.type) {
    case 'new_message':          return 'Nieuw bericht ontvangen';
    case 'new_meeting':          return 'Nieuwe afspraak aangevraagd';
    case 'meeting_accepted':     return '✓ Je afspraak is bevestigd';
    case 'meeting_rejected':     return '✕ Je afspraak is afgewezen';
    case 'new_match':            return 'Nieuwe match aangemaakt';
    case 'eval_signed': {
      const naam = escapeHtml((n.message || '').split(' heeft')[0] || '');
      return naam ? `${naam} heeft getekend — jouw handtekening is nodig` : 'Handtekening vereist';
    }
    case 'eval_completed':          return '✅ Evaluatie volledig afgerond';
    case 'buddy_request':           return 'Nieuw buddy-verzoek ontvangen';
    case 'buddy_accepted':          return '✓ Buddy-verzoek geaccepteerd';
    case 'buddy_declined':          return 'Buddy-verzoek afgewezen';
    case 'subscription_activated':  return '✓ Abonnement geactiveerd';
    case 'subscription_failed':     return 'Betaling mislukt — controleer je gegevens';
    default:                        return escapeHtml(n.message || 'Nieuwe melding');
  }
}
