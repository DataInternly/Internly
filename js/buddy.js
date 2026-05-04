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
        <div class="buddy-card__name" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          ${name}
          <span style="background:#ede9fe;color:#7c3aed;font-size:.72rem;font-weight:500;padding:2px 8px;border-radius:20px;display:inline-block">Buddy</span>
        </div>
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
  if (!form) return null;

  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;

  const { data: bp, error } = await db
    .from('buddy_profiles')
    .select('pitch, achtergrond, bio, avatar_key, kennis_gebieden, specialiteiten, grove_beschikbaarheid, postcode, stad, leeftijd, active')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('[buddy-dash] loadBuddyProfile fout:', error.message);
    return null;
  }

  if (bp) populateBuddyProfile(form, bp);
  return bp;
}

function populateBuddyProfile(form, data) {
  if (!form || !data) return;

  // RUN2 — drie nieuwe velden
  const pitch = form.querySelector('#bp-pitch');
  if (pitch && data.pitch) pitch.value = data.pitch;

  const achtergrond = form.querySelector('#bp-achtergrond');
  if (achtergrond && data.achtergrond) achtergrond.value = data.achtergrond;

  const bio = form.querySelector('#bp-bio');
  if (bio && data.bio) bio.value = data.bio;

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

// prefillBuddyForm — RUN2 helper. Wrapper rond populateBuddyProfile +
// avatar-key sync. Kan globaal worden aangeroepen vanuit init-flow.
function prefillBuddyForm(data) {
  const form = document.getElementById('buddy-profile-form');
  if (!form || !data) return;
  populateBuddyProfile(form, data);
  if (data.avatar_key) window._internlyAvatarKey = data.avatar_key;
}
window.prefillBuddyForm = prefillBuddyForm;

function collectBuddyProfileData(form) {
  // Drie nieuwe content-velden (mockup-mapping 1 mei 2026 — RUN2)
  const pitch       = (form.querySelector('#bp-pitch')?.value       || '').trim();
  const achtergrond = (form.querySelector('#bp-achtergrond')?.value || '').trim();
  const bio         = (form.querySelector('#bp-bio')?.value         || '').trim();

  return {
    pitch:                pitch       || null,
    achtergrond:          achtergrond || null,
    bio:                  bio         || null,
    kennis_gebieden:      [...form.querySelectorAll('[data-kg]:checked')].map(cb => cb.value),
    specialiteiten:       [...form.querySelectorAll('[data-sp]:checked')].map(cb => cb.value),
    grove_beschikbaarheid: form.querySelector('#bp-grove-beschikbaarheid')?.value || null,
    postcode:             form.querySelector('#bp-postcode')?.value.trim() || null,
    stad:                 form.querySelector('#bp-stad')?.value.trim() || null,
    leeftijd:             parseInt(form.querySelector('#bp-leeftijd')?.value, 10) || null,
    active:               form.querySelector('#bp-actief')?.checked !== false,
  };
}

// ── Profiel saved-view via renderProfileView (RUN2 — 1 mei 2026) ─────
// Vervangt de oude inline overzicht-render. Gebruikt js/profileView.js
// Backwards-compat: oude #buddy-profile-overzicht container blijft hidden.
function showBuddyOverzicht(buddyProfile) {
  const matchesCount   = window.BUDDY_PAIRS_COUNT || 0;
  const savedContainer = document.getElementById('buddy-profile-saved-view');
  const formCard       = document.getElementById('buddy-profile-form-card');
  const oudOverzicht   = document.getElementById('buddy-profile-overzicht');

  // Hide oude inline overzicht-card als die nog in de DOM zit
  if (oudOverzicht) oudOverzicht.style.display = 'none';

  if (savedContainer && typeof renderProfileView === 'function') {
    renderProfileView(buddyProfile, 'gepensioneerd', savedContainer, {
      matchesCount,
      onEdit: () => {
        savedContainer.hidden = true;
        if (formCard) {
          formCard.hidden = false;
          formCard.style.display = '';
          formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
    savedContainer.hidden = false;
    if (formCard) formCard.hidden = true;
  } else {
    // Fallback: alleen form tonen als profileView ontbreekt
    if (formCard) {
      formCard.hidden = false;
      formCard.style.display = '';
    }
    console.warn('[buddy-dash] renderProfileView ontbreekt — geen saved-view gerenderd');
  }
}

function showBuddyForm() {
  const formCard       = document.getElementById('buddy-profile-form-card');
  const savedContainer = document.getElementById('buddy-profile-saved-view');
  if (savedContainer) savedContainer.hidden = true;
  if (formCard) {
    formCard.hidden = false;
    formCard.style.display = '';
  }
}

async function saveBuddyProfile(formData) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) { notify('Niet ingelogd', false); return; }

  const payload = {
    profile_id: user.id,
    ...formData,
    avatar_key: window._internlyAvatarKey || null
  };

  const { error } = await db
    .from('buddy_profiles')
    .upsert(payload, { onConflict: 'profile_id' });

  if (error) {
    notify('Profiel opslaan mislukt — probeer opnieuw', false);
    console.error('[buddy-dash] saveBuddyProfile fout:', error.message);
    return;
  }
  notify('Profiel bijgewerkt!', true);

  // Re-fetch volledig profiel + naam-join voor de saved-view (RUN2)
  try {
    const { data: refreshed } = await db
      .from('buddy_profiles')
      .select('profile_id, naam, pitch, bio, achtergrond, kennis_gebieden, specialiteiten, grove_beschikbaarheid, postcode, stad, leeftijd, talen, foto_url, active, open_to_international, avatar_key')
      .eq('profile_id', user.id)
      .maybeSingle();
    if (refreshed) {
      // Fallback naam uit profiles als buddy_profiles.naam null
      if (!refreshed.naam) {
        const { data: prof } = await db
          .from('profiles').select('naam').eq('id', user.id).maybeSingle();
        if (prof?.naam) refreshed.naam = prof.naam;
      }
      showBuddyOverzicht(refreshed);
    } else {
      showBuddyOverzicht({ ...payload });
    }
  } catch (e) {
    console.warn('[buddy-dash] saved-view re-fetch fout:', e?.message || e);
    showBuddyOverzicht({ ...payload });
  }
}

// ── Buddy → student discovery ────────────────────────
// 1 mei 2026 — BUDDY_SWIPE_RESEARCH.md Optie A

async function fetchBuddySeekers(userId) {
  // Load students with zoekt_buddy = true
  const _baseSelect =
    'profile_id, naam, opleiding, school, jaar, ' +
    'beschikbaar_vanaf, opdracht_domein, motivatie, ' +
    'skills, avatar_url, sector, niveau';

  let spData, spErr;

  try {
    const res = await db
      .from('student_profiles')
      .select(_baseSelect + ', avatar_key')
      .eq('zoekt_buddy', true)
      .limit(30);
    spData = res.data;
    spErr  = res.error;
    if (spErr) throw spErr;
  } catch {
    // Fallback: avatar_key kolom bestaat mogelijk
    // nog niet (AVATAR_MIGRATION.sql niet gedraaid)
    const res = await db
      .from('student_profiles')
      .select(_baseSelect)
      .eq('zoekt_buddy', true)
      .limit(30);
    spData = res.data;
    spErr  = res.error;
  }

  if (spErr) {
    console.error('[buddy-seekers] student load fout:',
      spErr.message);
    return [];
  }

  const students = spData || [];

  if (!students || students.length === 0) return [];

  // Filter out students already requested
  const { data: existing } = await db
    .from('buddy_requests')
    .select('receiver_id')
    .eq('requester_id', userId)
    .in('receiver_id', students.map(s => s.profile_id));

  const alreadyRequested = new Set(
    (existing || []).map(r => r.receiver_id)
  );

  return students.filter(
    s => !alreadyRequested.has(s.profile_id)
  );
}

async function loadBuddySeekers() {
  const section = document.getElementById(
    'buddy-seekers-section');
  const loading = document.getElementById(
    'buddy-deck-loading');

  if (!section) return;

  const { data: { user } } = await db.auth.getUser();
  if (!user) return;

  const students = await fetchBuddySeekers(user.id);

  if (loading) loading.style.display = 'none';

  if (students.length === 0) {
    const emptyEl =
      document.getElementById('buddy-deck-empty');
    if (emptyEl) emptyEl.style.display = '';
    section.style.display = '';
    return;
  }

  _deckStudents = students;
  _deckIndex    = 0;
  _deckActive   = true;
  section.style.display = '';
  _renderDeck();
}

async function buddyRequestStudent(studentId, btn) {
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Versturen...';
  }

  try {
    const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Niet ingelogd');

    // Insert buddy request
    const { data: req, error } = await db
      .from('buddy_requests')
      .insert({
        requester_id: user.id,
        receiver_id:  studentId,
        type:         'gepensioneerd',
        status:       'pending'
      })
      .select('id')
      .maybeSingle();

    if (error) throw error;

    // Notify student
    if (typeof createNotification === 'function') {
      const { data: profRow } = await db
        .from('profiles')
        .select('naam')
        .eq('id', user.id)
        .maybeSingle();

      await createNotification(
        studentId,
        'buddy_request',
        req?.id || null,
        'buddy',
        `${profRow?.naam || 'Een buddy'} wil jouw buddy worden.`
      );
    }

    // Remove card with animation
    const card = document.getElementById(
      'bsc-' + studentId);
    if (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateX(60px)';
      setTimeout(() => {
        card.remove();
        // Check if list is now empty
        const list = document.getElementById(
          'buddy-seekers-list');
        if (list && list.children.length === 0) {
          const empty = document.getElementById(
            'buddy-seekers-empty');
          if (empty) empty.style.display = '';
        }
      }, 250);
    }

    // Toast
    if (typeof notify === 'function') {
      notify('Aanvraag verstuurd! De student ontvangt een melding.');
    }

  } catch (err) {
    console.error('[buddy-request] fout:', err.message);
    if (typeof notify === 'function') {
      notify('Aanvraag mislukt. Probeer opnieuw.', false);
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = '💜 Buddy worden';
    }
  }
}

function buddySkipStudent(studentId) {
  const card = document.getElementById('bsc-' + studentId);
  if (!card) return;
  card.style.opacity = '0';
  card.style.transform = 'translateX(-40px)';
  setTimeout(() => {
    card.remove();
    const list = document.getElementById(
      'buddy-seekers-list');
    if (list && list.children.length === 0) {
      const empty = document.getElementById(
        'buddy-seekers-empty');
      if (empty) empty.style.display = '';
    }
  }, 220);
}

// ═══════════════════════════════════════════════
// BUDDY SWIPE DECK ENGINE
// 1 mei 2026
// Team-reviewed: BUDDY_DECK_AUDIT.md
// Reuses: fetchBuddySeekers, buddyRequestStudent,
//         buddySkipStudent (unchanged)
// ═══════════════════════════════════════════════

// ── Deck state ────────────────────────────────
let _deckStudents   = [];
let _deckIndex      = 0;
// _deckActive: true while user is browsing the deck.
// Prevents realtime reload from resetting the deck.
// Resets to false when deck is exhausted or reloaded.
// Note: skip() writes no DB record — on page reload
// the buddy will see skipped students again. Intentional.
let _deckActive     = false;
// _deckSwiping: mutex to prevent double-insert on
// rapid taps of the like button.
let _deckSwiping    = false;
// _deckAnimating: true during the 200ms fly-out
// animation after a drag release. Prevents a second
// drag from starting during the animation.
let _deckAnimating  = false;
// AbortController for document-level drag listeners.
// Replaced on every render, aborted on cleanup.
let _deckController = null;
let _deckDragStartX = 0;
let _deckDragCurX   = 0;
let _deckIsDragging = false;

function _deckCleanup() {
  if (_deckController) {
    _deckController.abort();
    _deckController = null;
  }
}

function _deckSetupListeners() {
  _deckCleanup();
  _deckController = new AbortController();
  const sig = { signal: _deckController.signal };

  document.addEventListener('mousemove', e => {
    _deckOnMove(e.clientX);
  }, sig);
  document.addEventListener('touchmove', e => {
    if (e.touches[0]) _deckOnMove(e.touches[0].clientX);
  }, { ...sig, passive: true });
  document.addEventListener('mouseup',   _deckOnEnd, sig);
  document.addEventListener('touchend',  _deckOnEnd, sig);
}

function _buildDeckCard(student, stackPos) {
  const _esc = typeof escapeHtml === 'function'
    ? escapeHtml : s => String(s ?? '');

  const initials = ((student.naam || '?')
    .split(' ').filter(Boolean)
    .map(w => w[0]).slice(0, 2).join('')
    .toUpperCase()) || '?';

  const skills = Array.isArray(student.skills)
    ? student.skills.slice(0, 3) : [];

  const beschikbaar = student.beschikbaar_vanaf
    ? new Date(student.beschikbaar_vanaf)
        .toLocaleDateString('nl-NL',
          { month: 'long', year: 'numeric' })
    : null;

  // stackPos 0 = top card, 1 = second, 2 = third
  const rotate  = stackPos * 1.5;
  const offsetY = stackPos * 5;
  const zIndex  = 10 - stackPos;
  const isTop   = stackPos === 0;

  const el = document.createElement('div');
  el.className         = 'buddy-deck-card';
  el.dataset.studentId = student.profile_id;
  el.style.cssText = [
    'position:absolute', 'inset:0',
    'background:#fff',
    'border:1px solid rgba(13,21,32,.09)',
    'border-radius:14px',
    'padding:16px 18px',
    `z-index:${zIndex}`,
    `transform:rotate(${rotate}deg) translateY(${offsetY}px)`,
    isTop ? 'cursor:grab' : 'pointer-events:none',
    'will-change:transform',
    'transition:none',
    'overflow:hidden'
  ].join(';');

  el.innerHTML = `
    <div class="deck-like-ind" style="position:absolute;
      top:16px;left:16px;
      background:var(--c-buddy-purple,#7c3aed);
      color:#fff;padding:4px 12px;border-radius:8px;
      font-size:.76rem;font-weight:700;opacity:0;
      transform:rotate(-15deg);transition:opacity .1s;
      pointer-events:none">BUDDY! 💜</div>
    <div class="deck-pass-ind" style="position:absolute;
      top:16px;right:16px;background:#ef4444;color:#fff;
      padding:4px 12px;border-radius:8px;font-size:.76rem;
      font-weight:700;opacity:0;transform:rotate(15deg);
      transition:opacity .1s;pointer-events:none">
      SKIP ✕</div>

    <div style="display:flex;align-items:flex-start;
      gap:10px;margin-bottom:10px">
      <div style="width:44px;height:44px;border-radius:50%;
        background:linear-gradient(135deg,#1a7a48,#0f5c36);
        display:flex;align-items:center;
        justify-content:center;color:#fff;
        font-weight:700;font-size:.9rem;flex-shrink:0">
        ${initials}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-family:'Bricolage Grotesque',
          sans-serif;font-weight:600;font-size:.95rem;
          color:#0d1520;white-space:nowrap;overflow:hidden;
          text-overflow:ellipsis">
          ${_esc(student.naam || 'Student')}
        </div>
        <div style="font-size:.76rem;color:#6b7280;
          margin-top:1px;white-space:nowrap;overflow:hidden;
          text-overflow:ellipsis">
          ${_esc(student.opleiding || '')}
          ${student.jaar ? ' · Jaar ' + student.jaar : ''}
        </div>
      </div>
      <span style="background:#e8f5ee;color:#1a7a48;
        font-size:.68rem;font-weight:500;padding:2px 8px;
        border-radius:10px;flex-shrink:0;white-space:nowrap">
        Zoekt buddy
      </span>
    </div>

    ${student.motivatie ? `
      <p style="font-size:.8rem;color:#374151;
        line-height:1.5;margin-bottom:8px;
        display:-webkit-box;-webkit-line-clamp:3;
        -webkit-box-orient:vertical;overflow:hidden">
        "${_esc(student.motivatie)}"
      </p>` : ''}

    <div style="display:flex;flex-wrap:wrap;gap:4px;
      margin-bottom:${skills.length > 0 ? '6px' : '0'}">
      ${[
        student.opdracht_domein
          ? `<span style="background:#f3f4f6;color:#374151;
              font-size:.69rem;padding:2px 7px;
              border-radius:8px">
              ${_esc(student.opdracht_domein)}</span>`
          : '',
        student.school
          ? `<span style="background:#f3f4f6;color:#374151;
              font-size:.69rem;padding:2px 7px;
              border-radius:8px">
              ${_esc(student.school)}</span>`
          : '',
        beschikbaar
          ? `<span style="background:#e8f5ee;color:#1a7a48;
              font-size:.69rem;padding:2px 7px;
              border-radius:8px">
              📅 ${beschikbaar}</span>`
          : ''
      ].join('')}
    </div>

    ${skills.length > 0 ? `
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${skills.map(s => {
          const label = typeof s === 'string' ? s
            : (s?.naam || s?.name || String(s));
          return `<span style="background:#fdf0e8;
            color:#b84910;font-size:.68rem;
            padding:2px 7px;border-radius:8px">
            ${_esc(label)}</span>`;
        }).join('')}
      </div>` : ''}
  `;

  if (isTop) {
    el.addEventListener('mousedown', e => {
      if (_deckAnimating) return;
      _deckIsDragging = true;
      _deckDragStartX = e.clientX;
      _deckDragCurX   = e.clientX;
      el.style.transition = 'none';
    });
    el.addEventListener('touchstart', e => {
      if (_deckAnimating) return;
      if (!e.touches[0]) return;
      _deckIsDragging = true;
      _deckDragStartX = e.touches[0].clientX;
      _deckDragCurX   = e.touches[0].clientX;
      el.style.transition = 'none';
    }, { passive: true });
  }

  return el;
}

function _deckOnMove(x) {
  if (!_deckIsDragging) return;
  _deckDragCurX = x;
  const diff    = x - _deckDragStartX;
  const topCard =
    document.querySelector('.buddy-deck-card');
  if (!topCard) return;

  topCard.style.transform =
    `translateX(${diff}px) rotate(${diff * 0.06}deg)`;

  const likeInd =
    topCard.querySelector('.deck-like-ind');
  const passInd =
    topCard.querySelector('.deck-pass-ind');
  const threshold = 35;
  if (likeInd) likeInd.style.opacity =
    diff > threshold
      ? String(Math.min((diff - threshold) / 60, 1))
      : '0';
  if (passInd) passInd.style.opacity =
    diff < -threshold
      ? String(Math.min((-diff - threshold) / 60, 1))
      : '0';
}

function _deckOnEnd() {
  if (!_deckIsDragging) return;
  _deckIsDragging = false;

  const diff    = _deckDragCurX - _deckDragStartX;
  const topCard =
    document.querySelector('.buddy-deck-card');
  if (!topCard) return;

  topCard.style.transition = 'transform .22s ease';

  if (diff > 75) {
    _deckAnimating = true;
    topCard.style.transform =
      `translateX(115%) rotate(22deg)`;
    setTimeout(() => {
      _deckAnimating = false;
      deckAction('like');
    }, 210);
  } else if (diff < -75) {
    _deckAnimating = true;
    topCard.style.transform =
      `translateX(-115%) rotate(-22deg)`;
    setTimeout(() => {
      _deckAnimating = false;
      deckAction('pass');
    }, 210);
  } else {
    topCard.style.transform =
      `rotate(0deg) translateY(0)`;
    const likeInd =
      topCard.querySelector('.deck-like-ind');
    const passInd =
      topCard.querySelector('.deck-pass-ind');
    if (likeInd) likeInd.style.opacity = '0';
    if (passInd) passInd.style.opacity = '0';
  }
}

function _renderDeck() {
  const wrap    =
    document.getElementById('buddy-deck-wrap');
  const actions =
    document.getElementById('buddy-deck-actions');
  const counter =
    document.getElementById('buddy-deck-counter');
  const empty   =
    document.getElementById('buddy-deck-empty');
  const done    =
    document.getElementById('buddy-deck-done');
  const loading =
    document.getElementById('buddy-deck-loading');
  if (!wrap) return;

  const remaining = _deckStudents.length - _deckIndex;

  if (remaining <= 0) {
    wrap.style.display    = 'none';
    if (actions) actions.style.display = 'none';
    if (counter) counter.style.display = 'none';
    if (done)    done.style.display    = '';
    if (empty)   empty.style.display   = 'none';
    if (loading) loading.style.display = 'none';
    _deckActive = false;
    _deckCleanup();
    return;
  }

  if (loading) loading.style.display = 'none';
  if (empty)   empty.style.display   = 'none';
  if (done)    done.style.display    = 'none';
  wrap.style.display    = '';
  if (actions) actions.style.display = 'flex';
  if (counter) {
    counter.style.display = '';
    counter.textContent   =
      `${_deckIndex + 1} van ${_deckStudents.length}`;
  }

  wrap.innerHTML = '';
  const count = Math.min(3, remaining);
  for (let i = count - 1; i >= 0; i--) {
    const s = _deckStudents[_deckIndex + i];
    if (s) wrap.appendChild(_buildDeckCard(s, i));
  }

  _deckSetupListeners();
}

async function deckAction(direction) {
  if (_deckSwiping) return;
  _deckSwiping = true;

  const student = _deckStudents[_deckIndex];
  if (!student) { _deckSwiping = false; return; }

  _deckIndex++;
  _deckCleanup();
  _renderDeck();

  try {
    if (direction === 'like') {
      await buddyRequestStudent(
        student.profile_id, null);
    } else {
      buddySkipStudent(student.profile_id);
    }
  } catch (err) {
    console.error('[deck] actie fout:', err.message);
  } finally {
    _deckSwiping = false;
  }
}

async function reloadBuddyDeck() {
  _deckIndex    = 0;
  _deckStudents = [];
  _deckActive   = true;
  _deckAnimating = false;
  _deckIsDragging = false;
  _deckCleanup();

  const els = ['buddy-deck-done', 'buddy-deck-wrap',
    'buddy-deck-actions', 'buddy-deck-counter',
    'buddy-deck-empty'];
  els.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const loading =
    document.getElementById('buddy-deck-loading');
  if (loading) loading.style.display = '';

  await loadBuddySeekers();
}

// ── Window exports — buddy seekers ────────────────────
window.loadBuddySeekers    = loadBuddySeekers;
window.buddyRequestStudent = buddyRequestStudent;
window.buddySkipStudent    = buddySkipStudent;
window.deckAction          = deckAction;
window.reloadBuddyDeck     = reloadBuddyDeck;

// ── Window exports — profiel toggle ────────────────────
window.showBuddyOverzicht = showBuddyOverzicht;
window.showBuddyForm      = showBuddyForm;
