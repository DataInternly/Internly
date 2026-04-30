/* ============================================================
   Internly Reviews Module v1.0
   Functies: fetch, samenvatting, validatie, submit, flag, reply
   Vereist: utils.js (notify, escapeHtml, formatNLDate), supabase.js (db),
            profanity.js (window.Internly.profanity.filter)
   ============================================================ */

'use strict';

// ── Rate limiting (audit fix 2026-04-30) ─────────────────
const _reviewRateLimits = {};
function _reviewRateCheck(key, limitMs = 10000) {
  const now = Date.now();
  if (_reviewRateLimits[key] && now - _reviewRateLimits[key] < limitMs) {
    return false; // te snel
  }
  _reviewRateLimits[key] = now;
  return true;
}

// ── Profanity-alias (verwijzing naar profanity.js API) ────────────────────────
function _bobba(text) {
  if (!text) return text;
  return (window.Internly?.profanity?.filter || (s => s))(text);
}

// ── fetchReviewsForCompany ────────────────────────────────────────────────────
async function fetchReviewsForCompany(companyId, { limit = 20, offset = 0 } = {}) {
  if (!companyId) return [];
  const { data, error } = await db
    .from('reviews')
    .select(`
      id, rating, title, body, created_at,
      company_reply, company_reply_at,
      reviewer_id,
      reviewer:profiles!reviewer_id ( role )
    `)
    .eq('reviewee_id', companyId)
    .eq('flagged', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[reviews] fetchReviewsForCompany fout:', error);
    notify('Reviews konden niet worden geladen', false);
    return [];
  }
  return data || [];
}

// ── fetchRatingSummary ────────────────────────────────────────────────────────
async function fetchRatingSummary(companyId) {
  if (!companyId) return { average: null, count: 0, distribution: [0, 0, 0, 0, 0] };
  const { data, error } = await db
    .from('reviews')
    .select('rating')
    .eq('reviewee_id', companyId)
    .eq('flagged', false);

  if (error) {
    console.error('[reviews] fetchRatingSummary fout:', error);
    return { average: null, count: 0, distribution: [0, 0, 0, 0, 0] };
  }

  const ratings = data || [];
  const count = ratings.length;
  if (count === 0) return { average: null, count: 0, distribution: [0, 0, 0, 0, 0] };

  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  const distribution = [0, 0, 0, 0, 0];
  ratings.forEach(r => { if (r.rating >= 1 && r.rating <= 5) distribution[r.rating - 1]++; });

  return {
    average: (sum / count).toFixed(1),
    count,
    distribution,
  };
}

// ── canWriteReview ────────────────────────────────────────────────────────────
async function canWriteReview(companyId) {
  if (!companyId) return { ok: false, reason: 'missing_company_id' };
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, reason: 'not_authenticated' };
  if (user.id === companyId) return { ok: false, reason: 'self_review' };

  const { data: match, error: matchErr } = await db
    .from('matches')
    .select('id, status')
    .or(`and(party_a.eq.${user.id},party_b.eq.${companyId}),and(party_b.eq.${user.id},party_a.eq.${companyId})`)
    .in('status', ['accepted', 'completed'])
    .limit(1)
    .maybeSingle();

  if (matchErr) {
    console.error('[reviews] canWriteReview match-check fout:', matchErr);
    return { ok: false, reason: 'error' };
  }
  if (!match) return { ok: false, reason: 'no_match' };

  const { data: existing } = await db
    .from('reviews')
    .select('id')
    .eq('match_id', match.id)
    .eq('reviewer_id', user.id)
    .maybeSingle();

  if (existing) return { ok: false, reason: 'already_reviewed', match_id: match.id };
  return { ok: true, match_id: match.id };
}

// ── submitReview ──────────────────────────────────────────────────────────────
async function submitReview({ companyId, rating, title, body, matchId }) {
  if (!_reviewRateCheck('submit_' + (companyId || 'x'), 15000)) {
    if (typeof notify === 'function')
      notify('Even geduld — je kunt niet te snel een review plaatsen.', false);
    return;
  }
  if (!companyId || !matchId) return { ok: false, error: 'missing_ids' };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: 'invalid_rating' };

  const trimmedBody = (body || '').trim();
  if (trimmedBody.length < 20 || trimmedBody.length > 1000) return { ok: false, error: 'invalid_body_length' };

  const trimmedTitle = title ? title.trim() : null;
  if (trimmedTitle && trimmedTitle.length > 100) return { ok: false, error: 'invalid_title_length' };

  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: 'not_authenticated' };

  const filteredBody  = _bobba(trimmedBody);
  const filteredTitle = trimmedTitle ? _bobba(trimmedTitle) : null;

  try {
    const { data, error } = await db
      .from('reviews')
      .insert({
        reviewer_id: user.id,
        reviewee_id: companyId,
        match_id:    matchId,
        rating,
        title:       filteredTitle,
        body:        filteredBody,
        flagged:     false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[reviews] submitReview insert fout:', error);
      notify('Review kon niet worden opgeslagen. Probeer opnieuw.', false);
      return { ok: false, error: error.message };
    }

    notify('Review geplaatst. Bedankt voor je bijdrage!');
    return { ok: true, review_id: data.id };
  } catch (e) {
    console.error('[reviews] submitReview exception:', e);
    notify('Er ging iets mis. Probeer opnieuw.', false);
    return { ok: false, error: 'exception' };
  }
}

// ── flagReview ────────────────────────────────────────────────────────────────
async function flagReview(reviewId, reason) {
  if (!_reviewRateCheck('flag_' + (reviewId || 'x'), 5000)) {
    if (typeof notify === 'function')
      notify('Even geduld.', false);
    return;
  }
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: 'not_authenticated' };

  const trimmedReason = (reason || '').trim();
  if (trimmedReason.length < 5 || trimmedReason.length > 500) return { ok: false, error: 'invalid_reason' };

  try {
    const { error } = await db
      .from('reviews')
      .update({
        flagged:     true,
        flagged_by:  user.id,
        flagged_at:  new Date().toISOString(),
        flag_reason: trimmedReason,
      })
      .eq('id', reviewId);

    if (error) {
      console.error('[reviews] flagReview fout:', error);
      notify('Melding kon niet worden verzonden', false);
      return { ok: false };
    }

    notify('Review gemeld. We kijken er naar.');
    return { ok: true };
  } catch (e) {
    console.error('[reviews] flagReview exception:', e);
    notify('Melding kon niet worden verzonden', false);
    return { ok: false };
  }
}

// ── submitCompanyReply ────────────────────────────────────────────────────────
async function submitCompanyReply(reviewId, replyText) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: 'not_authenticated' };

  const trimmed = (replyText || '').trim();
  if (trimmed.length < 10 || trimmed.length > 1000) return { ok: false, error: 'invalid_length' };

  const filtered = _bobba(trimmed);

  try {
    const { error } = await db
      .from('reviews')
      .update({
        company_reply:    filtered,
        company_reply_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .eq('reviewee_id', user.id);

    if (error) {
      console.error('[reviews] submitCompanyReply fout:', error);
      notify('Reactie kon niet worden opgeslagen', false);
      return { ok: false };
    }

    notify('Reactie geplaatst');
    return { ok: true };
  } catch (e) {
    console.error('[reviews] submitCompanyReply exception:', e);
    notify('Reactie kon niet worden opgeslagen', false);
    return { ok: false };
  }
}

// ── renderStars ───────────────────────────────────────────────────────────────
function renderStars(n) {
  return [1, 2, 3, 4, 5].map(i =>
    `<span class="rev-star${i <= n ? ' filled' : ''}">★</span>`
  ).join('');
}

// ── renderRatingSummary ───────────────────────────────────────────────────────
function renderRatingSummary(summary, container) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;
  if (!summary || summary.count === 0) {
    el.innerHTML = `<span class="rev-no-ratings">Nog geen beoordelingen</span>`;
    return;
  }
  const hist = [5, 4, 3, 2, 1].map(n => {
    const count = summary.distribution[n - 1];
    const pct = summary.count > 0 ? (count / summary.count * 100).toFixed(0) : 0;
    return `
      <div class="rev-hist-row">
        <span class="rev-hist-label">${n} ★</span>
        <div class="rev-hist-bar"><div class="rev-hist-fill" style="width:${pct}%"></div></div>
        <span class="rev-hist-count">${count}</span>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="rev-summary-wrap">
      <div class="rev-big-rating">
        <span class="rev-avg-num">${summary.average}</span>
        <div class="rev-avg-stars">${renderStars(Math.round(Number(summary.average)))}</div>
        <span class="rev-total-count">${summary.count} review${summary.count === 1 ? '' : 's'}</span>
      </div>
      <div class="rev-histogram">${hist}</div>
    </div>`;
}

// ── renderReviewCard ──────────────────────────────────────────────────────────
function renderReviewCard(r) {
  const reviewerLabel = r.reviewer_id === null ? 'Verwijderde gebruiker' : 'Student';
  const dateStr = formatNLDate(r.created_at);

  let titleHtml = '';
  if (r.title) titleHtml = `<h3 class="rev-card-title">${escapeHtml(r.title)}</h3>`;

  let replyHtml = '';
  if (r.company_reply) {
    replyHtml = `
      <div class="rev-company-reply">
        <div class="rev-reply-label">Reactie van het bedrijf <time class="rev-reply-date">${formatNLDate(r.company_reply_at)}</time></div>
        <p class="rev-reply-body">${escapeHtml(r.company_reply)}</p>
      </div>`;
  }

  return `
    <article class="rev-card" data-review-id="${escapeHtml(r.id)}">
      <header class="rev-card-header">
        <div class="rev-card-stars">${renderStars(r.rating)}</div>
        <time class="rev-card-date">${dateStr}</time>
      </header>
      ${titleHtml}
      <p class="rev-card-body">${escapeHtml(r.body)}</p>
      <footer class="rev-card-footer">
        <span class="rev-card-author">— ${escapeHtml(reviewerLabel)}</span>
        <button class="rev-btn-flag" data-review-id="${escapeHtml(r.id)}" type="button">Meld</button>
      </footer>
      ${replyHtml}
    </article>`;
}

// ── renderReviewList ──────────────────────────────────────────────────────────
function renderReviewList(reviews, container) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;

  if (!reviews || reviews.length === 0) {
    el.innerHTML = `
      <div class="rev-empty">
        <p>Nog geen reviews voor dit bedrijf.</p>
        <p class="rev-empty-sub">Help andere studenten door je ervaring te delen.</p>
      </div>`;
    return;
  }

  el.innerHTML = reviews.map(renderReviewCard).join('');

  // Flag-knop event delegation
  el.addEventListener('click', e => {
    const btn = e.target.closest('.rev-btn-flag');
    if (!btn) return;
    const reviewId = btn.dataset.reviewId;
    const reason = prompt('Waarom meld je deze review? (min. 5 tekens)');
    if (!reason || reason.trim().length < 5) return;
    flagReview(reviewId, reason.trim());
    btn.textContent = 'Gemeld';
    btn.disabled = true;
  });
}

// ── Expose globals ────────────────────────────────────────────────────────────
window.fetchReviewsForCompany = fetchReviewsForCompany;
window.fetchRatingSummary     = fetchRatingSummary;
window.canWriteReview         = canWriteReview;
window.submitReview           = submitReview;
window.flagReview             = flagReview;
window.submitCompanyReply     = submitCompanyReply;
window.renderStars            = renderStars;
window.renderRatingSummary    = renderRatingSummary;
window.renderReviewList       = renderReviewList;
