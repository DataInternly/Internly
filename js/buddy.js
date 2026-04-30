// ============================================================
// INTERNLY — BUDDY SYSTEM MODULE
// File: js/buddy.js
// Version: 2.0  (single-type, gepensioneerd-only)
//
// PURPOSE
// Central, reusable module for all buddy functionality across
// the platform. Import once per page that needs it.
//
// BUDDY TYPE — only 'gepensioneerd' is supported.
// Earlier versions defined peer/insider/mentor/school types;
// these were removed (sprint 29 april 2026, kernfeit Barry):
// "Buddy rol = ALLEEN gepensioneerden."
//
//   'gepensioneerd' Student ↔ retired professional volunteer.
//                   Voluntary, opt-in, consent from all parties.
//                   Sources: waitlist (legacy) + profiles (auth flow).
//                   Used on: buddy-dashboard.html,
//                            international-student-dashboard.html,
//                            bbl-hub.html, discover.html.
//
// USAGE
//   <script src="js/buddy.js"></script>
//   await buddyInit(userId, userRole, db, userName);
// ============================================================

// ── CONSTANTS ───────────────────────────────────────────────

const BUDDY_TYPES = ['gepensioneerd'];

const BUDDY_CONFIG = {
  gepensioneerd: {
    label: 'Gepensioneerde buddy',
    description: 'Een ervaren professional die zijn kennis wil doorgeven.',
    matchOn: ['sector', 'expertise_tags'],
    anonymous: false,
    revealStrategy: 'immediate',
    availableFor: ['student'],
    sourceTable: 'waitlist', // candidates from waitlist WHERE type='buddy_gepensioneerd'
  },
};

// ── STATE ───────────────────────────────────────────────────

const BuddyModule = {
  db: null,
  currentUserId: null,
  currentUserRole: null,
  currentUserName: null,  // set via buddyInit — used in outgoing notification messages
  activePairs: [],
  pendingRequests: [],
  initialized: false,
  _realtimeSub: null,
  /**
   * Optional callback invoked after any realtime data refresh.
   * Pages can set this to re-render their buddy UI, e.g.:
   *   BuddyModule.onUpdate = () => myRenderFn();
   */
  onUpdate: null,
};

// ── INIT ────────────────────────────────────────────────────

/**
 * Call once per page that uses the buddy system.
 *
 * @param {string} userId    - auth user id
 * @param {string} userRole  - 'student' | 'bedrijf' | 'school'
 * @param {object} db        - Supabase client instance
 * @param {string} [userName] - display name of current user (used in outgoing notifications)
 */
async function buddyInit(userId, userRole, db, userName = '') {
  BuddyModule.db              = db;
  BuddyModule.currentUserId   = userId;
  BuddyModule.currentUserRole = userRole;
  BuddyModule.currentUserName = userName;

  await Promise.all([
    buddyLoadPairs(),
    buddyLoadPendingRequests(),
  ]);

  BuddyModule.initialized = true;
  _buddySubscribeRealtime();
}

// ── REALTIME ────────────────────────────────────────────────

function _buddySubscribeRealtime() {
  const { db, currentUserId: uid } = BuddyModule;
  if (!db || !uid || BuddyModule._realtimeSub) return;

  BuddyModule._realtimeSub = db
    .channel('buddy-' + uid)
    // Incoming request for this user
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'buddy_requests',
      filter: `receiver_id=eq.${uid}`,
    }, async () => {
      await buddyLoadPendingRequests();
      buddyShowToast('Nieuw buddyverzoek ontvangen');
      BuddyModule.onUpdate?.();
    })
    // One of this user's sent requests was accepted or declined
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'buddy_requests',
      filter: `requester_id=eq.${uid}`,
    }, async (payload) => {
      if (payload.new?.status === 'accepted') {
        await buddyLoadPairs();
        buddyShowToast('Je buddyverzoek is geaccepteerd!');
        BuddyModule.onUpdate?.();
      }
    })
    // New active pair (accepted by either side)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'buddy_pairs',
      filter: `requester_id=eq.${uid}`,
    }, async () => { await buddyLoadPairs(); BuddyModule.onUpdate?.(); })
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'buddy_pairs',
      filter: `receiver_id=eq.${uid}`,
    }, async () => { await buddyLoadPairs(); BuddyModule.onUpdate?.(); })
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[buddy] realtime verbinding verbroken:', err?.message);
        notify('Verbinding verbroken — ververs de pagina om door te gaan', false);
      }
    });

  window.addEventListener('beforeunload', () => {
    if (BuddyModule._realtimeSub) {
      try { BuddyModule.db?.removeChannel(BuddyModule._realtimeSub); } catch(e) {}
    }
  }, { once: true });
}

// ── DATA FETCHING ────────────────────────────────────────────

async function buddyLoadPairs() {
  const { db, currentUserId: uid } = BuddyModule;
  if (!db || !uid) return;

  // Fetch active pairs with both parties' names so we can resolve "the other one"
  const { data, error } = await db
    .from('buddy_pairs')
    .select(`
      id, type, status, reveal_after, created_at,
      req:profiles!buddy_pairs_requester_id_fkey(id, naam),
      rec:profiles!buddy_pairs_receiver_id_fkey(id, naam)
    `)
    .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[buddy] loadPairs error:', error.message);
    return;
  }

  BuddyModule.activePairs = (data || []).map(row => {
    // Determine which side is the other party
    const other = row.req?.id === uid ? row.rec : row.req;
    const config = BUDDY_CONFIG[row.type] || {};
    const isAnon = config.anonymous && row.reveal_after && new Date(row.reveal_after) > new Date();
    return {
      id:          row.id,
      type:        row.type,
      reveal_after: row.reveal_after,
      buddy_id:   isAnon ? null : (other?.id || null),
      buddy_name: isAnon ? 'Anonieme buddy' : (other?.naam || 'Buddy'),
    };
  });
}

async function buddyLoadPendingRequests() {
  const { db, currentUserId: uid } = BuddyModule;
  if (!db || !uid) return;

  const { data, error } = await db
    .from('buddy_requests')
    .select(`
      id, type, message, created_at,
      sender:profiles!buddy_requests_requester_id_fkey(id, naam)
    `)
    .eq('receiver_id', uid)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[buddy] loadPendingRequests error:', error.message);
    return;
  }

  BuddyModule.pendingRequests = (data || []).map(row => {
    const config = BUDDY_CONFIG[row.type] || {};
    return {
      id:          row.id,
      type:        row.type,
      message:     row.message || '',
      sender_name: config.anonymous ? 'Anonieme student' : (row.sender?.naam || 'Onbekend'),
    };
  });
}

/**
 * Find candidate buddies for a given user and type.
 * Returns an array of profile objects, ordered by match score.
 *
 * @param {string} type    - one of BUDDY_TYPES
 * @param {object} context - { sector, opleiding, opdracht_domein, company_id, school }
 */
async function buddyFindCandidates(type, context = {}) {
  const { db, currentUserId: uid } = BuddyModule;
  const config = BUDDY_CONFIG[type];
  if (!config || !db || !uid) return [];

  // IDs already paired or with a pending request — exclude from results
  const { data: excluded } = await db
    .from('buddy_pairs')
    .select('requester_id, receiver_id')
    .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`)
    .eq('status', 'active');

  const { data: pending } = await db
    .from('buddy_requests')
    .select('requester_id, receiver_id')
    .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`)
    .eq('status', 'pending');

  const excludedIds = new Set([uid]);
  [...(excluded || []), ...(pending || [])].forEach(r => {
    excludedIds.add(r.requester_id);
    excludedIds.add(r.receiver_id);
  });

  // ── per-type matching query (only 'gepensioneerd' supported) ──

  if (type === 'gepensioneerd') {
    // Candidates come from the waitlist table, not profiles
    let q = db
      .from('waitlist')
      .select('id, naam, sector, email')
      .eq('type', 'buddy_gepensioneerd')
      .limit(5);

    if (context.sector) q = q.eq('sector', context.sector);

    const { data } = await q;
    return (data || [])
      .filter(r => !excludedIds.has(r.id))
      .map(r => ({ id: r.id, naam: r.naam, sub: r.sector || '' }));
  }

  return [];
}

// ── ACTIONS ─────────────────────────────────────────────────

/**
 * Send a buddy request.
 *
 * @param {string} receiverId
 * @param {string} type
 * @param {string} message
 */
async function buddySendRequest(receiverId, type, message = '') {
  const { db, currentUserId: uid } = BuddyModule;
  if (!db || !uid) return;

  // Guard: prevent duplicate pending requests for same pair + type.
  // .limit(1) before .maybeSingle() is required — without it, PGRST116 errors
  // if a race condition produced 2 rows.
  const { data: existing } = await db
    .from('buddy_requests')
    .select('id')
    .or(`and(requester_id.eq.${uid},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${uid})`)
    .eq('type', type)
    .in('status', ['pending', 'accepted'])
    .limit(1)
    .maybeSingle();

  if (existing) {
    buddyShowToast('Je hebt al een buddyverzoek uitstaan voor dit type');
    return;
  }

  const { data: req, error } = await db
    .from('buddy_requests')
    .insert({ requester_id: uid, receiver_id: receiverId, type, message, status: 'pending' })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[buddy] sendRequest error:', error.message);
    buddyShowToast('Verzoek kon niet worden verstuurd — probeer het opnieuw');
    return;
  }

  if (!req) {
    buddyShowToast('Aanvraag verstuurd — we zoeken een match');
    return;
  }

  // Notify receiver — anonymous for insider type
  const config = BUDDY_CONFIG[type] || {};
  const senderMeta = BuddyModule.currentUserName || 'Iemand';
  const notifMsg = config.anonymous
    ? 'Een BBL-student bij jouw leerbedrijf wil een anonieme buddy-koppeling.'
    : `${senderMeta} wil jouw ${config.label?.toLowerCase() || 'buddy'} worden`;

  await _buddyNotify(receiverId, 'buddy_request', req.id, 'buddy', notifMsg);

  buddyShowToast('Buddyverzoek verstuurd!');
}

/**
 * Accept a buddy request.
 *
 * @param {string} requestId - buddy_requests.id
 */
async function buddyAcceptRequest(requestId) {
  const { db, currentUserId: uid } = BuddyModule;
  if (!db || !uid) return;

  // Fetch the request so we know both parties and the type
  const { data: req, error: reqErr } = await db
    .from('buddy_requests')
    .select('id, requester_id, receiver_id, type')
    .eq('id', requestId)
    .eq('receiver_id', uid) // security: only the receiver can accept
    .maybeSingle();

  if (reqErr || !req) {
    console.error('[buddy] acceptRequest — request not found or access denied');
    buddyShowToast('Verzoek niet gevonden');
    return;
  }

  // 1. Mark request accepted
  const { error: updErr } = await db
    .from('buddy_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId);

  if (updErr) {
    console.error('[buddy] acceptRequest update error:', updErr.message);
    buddyShowToast('Accepteren mislukt — probeer opnieuw');
    return;
  }

  // 2. Create the pair
  const { data: pair, error: pairErr } = await db
    .from('buddy_pairs')
    .insert({
      requester_id: req.requester_id,
      receiver_id:  req.receiver_id,
      type:         req.type,
      status:       'active',
      reveal_after: null, // set externally for 'insider' type based on contract end date
    })
    .select('id')
    .maybeSingle();

  if (pairErr) {
    console.error('[buddy] acceptRequest pair insert error:', pairErr.message);
    // Roll back: revert request to pending so the receiver can retry
    await db.from('buddy_requests').update({ status: 'pending' }).eq('id', requestId);
    buddyShowToast('Koppeling aanmaken mislukt — probeer opnieuw');
    return;
  }

  if (!pair) {
    buddyShowToast('Koppeling aangemaakt');
    return;
  }

  // 3. Open a conversation thread (not for anonymous insider pairs — reveal later)
  if (req.type !== 'insider') {
    const { error: convErr } = await db
      .from('conversations')
      .insert({ buddy_pair_id: pair.id });
    if (convErr) console.warn('[buddy] conversation create failed (non-blocking):', convErr.message);
  }

  // 4. Notify the requester
  const config = BUDDY_CONFIG[req.type] || {};
  await _buddyNotify(
    req.requester_id,
    'buddy_accepted',
    pair.id,
    'buddy',
    `Jouw ${config.label?.toLowerCase() || 'buddyverzoek'} is geaccepteerd!`
  );

  await buddyLoadPairs();
  await buddyLoadPendingRequests();
  BuddyModule.onUpdate?.();
  buddyShowToast('Buddy-koppeling bevestigd!');
}

/**
 * Decline a buddy request (silent — no notification to requester).
 *
 * @param {string} requestId
 * @param {string} reason - stored for analytics, never shown to requester
 */
async function buddyDeclineRequest(requestId, reason = '') {
  const { db, currentUserId: uid } = BuddyModule;
  if (!db || !uid) return;

  const { error } = await db
    .from('buddy_requests')
    .update({ status: 'declined', decline_reason: reason || null })
    .eq('id', requestId)
    .eq('receiver_id', uid); // security: only the receiver can decline

  if (error) {
    console.error('[buddy] declineRequest error:', error.message);
    buddyShowToast('Afwijzen mislukt — probeer opnieuw');
    return;
  }

  await buddyLoadPendingRequests();
  BuddyModule.onUpdate?.();
  // No toast — silently declined to avoid awkwardness for the requester
}

/**
 * End an active buddy pair.
 *
 * @param {string} pairId
 */
async function buddyEndPair(pairId) {
  const { db, currentUserId: uid } = BuddyModule;
  if (!db || !uid) return;

  const { error } = await db
    .from('buddy_pairs')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', pairId)
    .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`); // security: only a member can end

  if (error) {
    console.error('[buddy] endPair error:', error.message);
    buddyShowToast('Beëindigen mislukt — probeer opnieuw');
    return;
  }

  // Do NOT delete — keep for Trust Score history and analytics
  BuddyModule.activePairs = BuddyModule.activePairs.filter(p => p.id !== pairId);
  BuddyModule.onUpdate?.();
  buddyShowToast('Buddy-koppeling beëindigd');
}

// ── INTERNAL NOTIFICATION HELPER ────────────────────────────

async function _buddyNotify(userId, type, refId, refType, message) {
  const { db } = BuddyModule;
  if (!db || !userId) return;
  // Supabase v2 never throws — always destructure {error}
  const { error } = await db.from('notifications').insert({
    user_id:  userId,
    type,
    ref_id:   refId   || null,
    ref_type: refType || null,
    message,
    read:     false,
  });
  if (error) console.warn('[buddy] notification failed (non-blocking):', error.message);
}

// ── RENDER HELPERS ───────────────────────────────────────────

/**
 * Render a buddy card for display in any page context.
 * Returns an HTML string.
 *
 * @param {object} pair    - from BuddyModule.activePairs
 * @param {string} context - 'dashboard' | 'sidebar' | 'profile'
 */
function buddyRenderPairCard(pair, context = 'dashboard') {
  const config = BUDDY_CONFIG[pair.type] || {};
  const isAnon = config.anonymous && pair.reveal_after && new Date(pair.reveal_after) > new Date();
  const name   = isAnon ? 'Anonieme buddy' : escapeHtml(pair.buddy_name || 'Buddy');
  const label  = escapeHtml(config.label || pair.type);
  // pair.id is a UUID — safe for both HTML attrs and JS string literals.
  // buddyEsc is for HTML attribute values; for onclick JS literals we keep the raw UUID.
  const pairId = String(pair.id || '').replace(/[^a-zA-Z0-9\-]/g, '');  // allow only UUID chars

  const initial = isAnon ? '?' : escapeHtml((pair.buddy_name || '?')[0].toUpperCase());

  return `
    <div class="buddy-card" data-pair-id="${pairId}" data-type="${escapeHtml(pair.type)}">
      <div class="buddy-card__avatar">${initial}</div>
      <div class="buddy-card__info">
        <div class="buddy-card__name">${name}</div>
        <div class="buddy-card__label">${label}</div>
        ${isAnon ? `<div class="buddy-card__anon-note">Identiteit zichtbaar na contract</div>` : ''}
      </div>
      <div class="buddy-card__actions">
        ${!isAnon ? `<button onclick="buddyOpenChat('${pairId}')">Stuur bericht</button>` : ''}
        ${context === 'dashboard' ? `<button class="btn-ghost" onclick="buddyEndPair('${pairId}')">Beëindig</button>` : ''}
      </div>
    </div>`;
}

/**
 * Render the incoming buddy request panel for this user.
 * Returns HTML string.
 */
function buddyRenderIncomingRequests() {
  if (BuddyModule.pendingRequests.length === 0) {
    return `<div class="buddy-empty">Geen openstaande buddyverzoeken.</div>`;
  }

  return BuddyModule.pendingRequests.map(req => {
    const config     = BUDDY_CONFIG[req.type] || {};
    const senderName = escapeHtml(req.sender_name || 'Onbekend');
    const labelText  = escapeHtml(config.label || req.type);
    // UUID — strip non-UUID chars so it is safe in both HTML attrs and JS onclick literals
    const reqId      = String(req.id || '').replace(/[^a-zA-Z0-9\-]/g, '');

    return `
      <div class="buddy-request" data-request-id="${reqId}">
        <div class="buddy-request__who">${senderName} wil een <strong>${labelText}</strong>-koppeling</div>
        ${req.message ? `<div class="buddy-request__message">&ldquo;${escapeHtml(req.message)}&rdquo;</div>` : ''}
        <div class="buddy-request__actions">
          <button onclick="buddyAcceptRequest('${reqId}')">Accepteren</button>
          <button class="btn-ghost" onclick="buddyDeclineRequest('${reqId}')">Afwijzen</button>
        </div>
      </div>`;
  }).join('');
}

/**
 * Render a "request a buddy" widget for a given type.
 * Context values are stored on data attributes — never in onclick.
 *
 * @param {string} type     - buddy type
 * @param {object} context  - { sector, opleiding, company_id, school }
 * @param {string} targetEl - optional CSS selector to inject into
 */
function buddyRenderRequestWidget(type, context = {}, targetEl = null) {
  const config = BUDDY_CONFIG[type];
  if (!config) return;

  const contextJson = escapeHtml(JSON.stringify(context));

  const html = `
    <div class="buddy-widget" data-type="${escapeHtml(type)}" data-context="${contextJson}">
      <div class="buddy-widget__description">${escapeHtml(config.description)}</div>
      ${config.privacyNote ? `<div class="buddy-widget__privacy">${escapeHtml(config.privacyNote)}</div>` : ''}
      <button class="buddy-widget__btn" onclick="buddyHandleRequestFromWidget(this)">
        Koppel mij aan een ${escapeHtml(config.label.toLowerCase())}
      </button>
    </div>`;

  if (targetEl) {
    const el = document.querySelector(targetEl);
    if (el) el.innerHTML = html;
  }

  return html;
}

// ── NAVIGATION ───────────────────────────────────────────────

function buddyOpenChat(pairId) {
  // chat.html handles ?buddy_pair_id=UUID — loads or creates conversation via buddy_pair_id column
  window.location.href = `chat.html?buddy_pair_id=${encodeURIComponent(pairId)}`;
}

// ── ORCHESTRATION ────────────────────────────────────────────

async function buddyHandleRequestFromWidget(btn) {
  const widget = btn.closest('[data-type]');
  if (!widget) return;
  const type = widget.dataset.type;
  let context = {};
  try { context = JSON.parse(widget.dataset.context || '{}'); } catch (e) { /* ignore */ }
  // Pass btn explicitly so buddyHandleRequest can disable/enable the correct element
  await buddyHandleRequest(type, context, btn);
}

/**
 * Main entry point from any "request buddy" button.
 * Finds candidates and sends the request (or queues the user if no candidates).
 *
 * @param {string}      type    - buddy type
 * @param {object}      context - matching context
 * @param {HTMLElement} [triggerBtn] - button that triggered the action (to disable during async work)
 */
async function buddyHandleRequest(type, context = {}, triggerBtn = null) {
  if (!BuddyModule.initialized) {
    buddyShowToast('Buddy-systeem nog niet geladen — probeer het opnieuw');
    return;
  }

  // Use explicitly passed button; fall back to activeElement only if none provided
  const btn = triggerBtn || (document.activeElement !== document.body ? document.activeElement : null);
  if (btn) btn.disabled = true;

  try {
    const candidates = await buddyFindCandidates(type, context);

    if (candidates.length === 0) {
      // No candidates — add to waiting pool
      const { db, currentUserId: uid } = BuddyModule;
      if (db && uid) {
        await db.from('buddy_queue').upsert(
          { user_id: uid, type, context: JSON.stringify(context), created_at: new Date().toISOString() },
          { onConflict: 'user_id,type' }
        );
      }
      buddyShowToast('We zoeken een buddy voor je — je krijgt bericht zodra er een match is.');
      return;
    }

    // Fase 1: auto-select best candidate (index 0 = best match from query ordering)
    // Fase 2: show buddyRenderCandidateModal(candidates, type) for user selection
    await buddySendRequest(candidates[0].id, type, '');

  } finally {
    if (btn) btn.disabled = false;
  }
}

// ── TOAST ────────────────────────────────────────────────────

function buddyShowToast(message) {
  let el = document.getElementById('notif') || document.getElementById('notif-buddy');
  if (!el) {
    el = document.createElement('div');
    el.id = 'notif-buddy';
    el.style.cssText = [
      'position:fixed;bottom:1.5rem;right:1.5rem',
      'background:var(--ink,#0f1117);color:#fff',
      'padding:.85rem 1.25rem;border-radius:12px',
      'font-size:.88rem;max-width:300px',
      'box-shadow:0 8px 24px rgba(0,0,0,.2)',
      'z-index:9999;opacity:0;transform:translateY(20px)',
      'transition:all .25s ease;pointer-events:none',
    ].join(';');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.opacity = '1';
  el.style.transform = 'translateY(0)';
  clearTimeout(el._buddyTimeout);
  el._buddyTimeout = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
  }, 3200);
}

// ── Buddy profile (buddy_profiles tabel) ──────────────────────────────────

async function loadBuddyProfile() {
  const form = document.getElementById('buddy-profile-form');
  if (!form) return;

  const { data: { user } } = await db.auth.getUser();
  if (!user) return;

  const { data: bp, error } = await db
    .from('buddy_profiles')
    .select('kennis_gebieden, specialiteiten, grove_beschikbaarheid, postcode, stad, leeftijd, active')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('[buddy-dash] loadBuddyProfile fout:', error.message);
    return;
  }

  if (bp) populateBuddyProfile(form, bp);
}

function populateBuddyProfile(form, data) {
  if (!form || !data) return;

  const kg = data.kennis_gebieden || [];
  form.querySelectorAll('[data-kg]').forEach(cb => { cb.checked = kg.includes(cb.value); });

  const sp = data.specialiteiten || [];
  form.querySelectorAll('[data-sp]').forEach(cb => { cb.checked = sp.includes(cb.value); });

  const gbd = form.querySelector('#bp-grove-beschikbaarheid');
  if (gbd && data.grove_beschikbaarheid) gbd.value = data.grove_beschikbaarheid;

  const postcode = form.querySelector('#bp-postcode');
  if (postcode && data.postcode) postcode.value = data.postcode;

  const stad = form.querySelector('#bp-stad');
  if (stad && data.stad) stad.value = data.stad;

  const leeftijd = form.querySelector('#bp-leeftijd');
  if (leeftijd && data.leeftijd != null) leeftijd.value = data.leeftijd;

  const actief = form.querySelector('#bp-actief');
  if (actief) actief.checked = data.active !== false;
}

function collectBuddyProfileData(form) {
  return {
    kennis_gebieden:      [...form.querySelectorAll('[data-kg]:checked')].map(cb => cb.value),
    specialiteiten:       [...form.querySelectorAll('[data-sp]:checked')].map(cb => cb.value),
    grove_beschikbaarheid: form.querySelector('#bp-grove-beschikbaarheid')?.value || null,
    postcode:             form.querySelector('#bp-postcode')?.value.trim() || null,
    stad:                 form.querySelector('#bp-stad')?.value.trim() || null,
    leeftijd:             parseInt(form.querySelector('#bp-leeftijd')?.value, 10) || null,
    active:               form.querySelector('#bp-actief')?.checked !== false,
  };
}

async function saveBuddyProfile(formData) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) { notify('Niet ingelogd', false); return; }

  const { error } = await db
    .from('buddy_profiles')
    .upsert({ profile_id: user.id, ...formData }, { onConflict: 'profile_id' });

  if (error) {
    notify('Profiel opslaan mislukt — probeer opnieuw', false);
    console.error('[buddy-dash] saveBuddyProfile fout:', error.message);
    return;
  }
  notify('Profiel bijgewerkt!', true);
}
