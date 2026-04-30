// js/swipes.js
// "Interesse in jou" inbox — gedeeld door company-dashboard.html en buddy-dashboard.html
// Laadvolgorde: utils.js → supabase.js → swipes.js → telemetry.js

(function () {
  'use strict';

  // ── Lokale helper (formatRelativeDate bestaat niet in utils.js) ────────────

  function formatRelativeDate(iso) {
    if (!iso) return '';
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days === 0) return 'Vandaag';
    if (days === 1) return 'Gisteren';
    if (days < 7)   return days + ' dagen geleden';
    if (days < 30)  return Math.floor(days / 7) + ' weken geleden';
    return Math.floor(days / 30) + ' maanden geleden';
  }

  // ── Fetch incoming likes voor huidige user ─────────────────────────────────

  async function fetchIncomingLikes(userId) {
    const { data, error } = await db
      .from('swipes')
      .select('id, swiper_id, target_type, direction, created_at, profiles!swipes_swiper_id_fkey(id, naam, role)')
      .eq('target_id', userId)
      .eq('direction', 'like')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[swipes] fetchIncomingLikes fout:', error.message);
      return [];
    }
    return data || [];
  }

  // ── Card renderer ──────────────────────────────────────────────────────────

  function renderIncomingLikeCard(like) {
    const likeId   = String(like.id || '').replace(/[^a-zA-Z0-9\-]/g, '');
    const naam     = escapeHtml(like.profiles?.naam || 'Onbekend');
    const role     = like.profiles?.role || '';
    const datum    = formatRelativeDate(like.created_at);
    const rolLabel = { student: 'Student', bedrijf: 'Bedrijf', gepensioneerd: 'Buddy' }[role] || 'Gebruiker';
    const init     = naam.charAt(0).toUpperCase();

    return `<div class="incoming-like-card" id="ilc-${likeId}" style="
        display:flex;align-items:center;justify-content:space-between;
        gap:12px;padding:14px 16px;background:#fff;
        border:1.5px solid #f0f0ee;border-radius:12px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:12px;min-width:0;">
        <div style="width:40px;height:40px;border-radius:50%;
            background:linear-gradient(135deg,#1a7a48,#0f5c36);
            color:#fff;font-weight:700;font-size:1rem;
            display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          ${init}
        </div>
        <div style="min-width:0;">
          <div style="font-weight:600;font-size:.9rem;color:#0d1520;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${naam}</div>
          <div style="font-size:.78rem;color:#6b7280;">${rolLabel} &middot; ${datum}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        <button type="button" onclick="swipesAcceptLike('${likeId}')"
            style="padding:7px 16px;background:#1a7a48;color:#fff;border:none;border-radius:50px;
            font-family:'Outfit',sans-serif;font-size:.82rem;font-weight:600;cursor:pointer;">
          Accepteren
        </button>
        <button type="button" onclick="swipesPassLike('${likeId}')"
            style="padding:7px 14px;background:#fff;color:#374151;
            border:1.5px solid #e2e8f0;border-radius:50px;
            font-family:'Outfit',sans-serif;font-size:.82rem;font-weight:600;cursor:pointer;">
          Overslaan
        </button>
      </div>
    </div>`;
  }

  // ── Kaart verwijderen met fade ─────────────────────────────────────────────

  function removeCard(likeId) {
    const card = document.getElementById('ilc-' + likeId);
    if (!card) return;
    card.style.transition = 'opacity .25s';
    card.style.opacity = '0';
    setTimeout(() => {
      card.remove();
      // Verberg sectie als leeg
      const list = document.getElementById('incoming-likes-list');
      if (list && !list.querySelector('.incoming-like-card')) {
        const section = document.getElementById('incoming-likes-section');
        if (section) section.style.display = 'none';
      }
    }, 260);
  }

  // ── Accept ─────────────────────────────────────────────────────────────────

  window.swipesAcceptLike = async function (likeId) {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;

    const { data: original, error: fetchErr } = await db
      .from('swipes')
      .select('swiper_id, target_type')
      .eq('id', likeId)
      .maybeSingle();

    if (fetchErr || !original) {
      notify('Actie mislukt — probeer opnieuw', false);
      return;
    }

    const { error: insErr } = await db.from('swipes').insert({
      swiper_id:   user.id,
      target_id:   original.swiper_id,
      target_type: 'student',
      direction:   'like',
    });

    if (insErr) {
      notify('Accepteren mislukt — probeer opnieuw', false);
      return;
    }

    notify('Match geaccepteerd!', true);
    removeCard(likeId);
  };

  // ── Pass ───────────────────────────────────────────────────────────────────

  window.swipesPassLike = async function (likeId) {
    removeCard(likeId);

    const { data: { user } } = await db.auth.getUser();
    if (!user) return;

    const { data: original } = await db
      .from('swipes')
      .select('swiper_id')
      .eq('id', likeId)
      .maybeSingle();

    if (original) {
      await db.from('swipes').insert({
        swiper_id:   user.id,
        target_id:   original.swiper_id,
        target_type: 'student',
        direction:   'pass',
      }).catch(e => console.warn('[swipes] passLike insert fout:', e));
    }
  };

  // ── Publieke reloadIncomingLikes ───────────────────────────────────────────

  window.reloadIncomingLikes = async function () {
    const container = document.getElementById('incoming-likes-list');
    if (!container) return;

    const { data: { user } } = await db.auth.getUser();
    if (!user) return;

    container.innerHTML = '<div style="text-align:center;padding:1.5rem;color:#6b7280;font-size:.88rem">Laden\u2026</div>';

    const likes = await fetchIncomingLikes(user.id);

    // Filter likes waarvoor al een swipe-back bestaat
    const swiperIds = likes.map(l => l.swiper_id);
    let alreadySwiped = new Set();
    if (swiperIds.length > 0) {
      const { data: ownSwipes } = await db
        .from('swipes')
        .select('target_id')
        .eq('swiper_id', user.id)
        .in('target_id', swiperIds);
      if (ownSwipes) alreadySwiped = new Set(ownSwipes.map(s => s.target_id));
    }

    const pending = likes.filter(l => !alreadySwiped.has(l.swiper_id));

    const section = document.getElementById('incoming-likes-section');
    if (section) section.style.display = pending.length > 0 ? 'block' : 'none';

    container.innerHTML = pending.length
      ? pending.map(renderIncomingLikeCard).join('')
      : '';
  };

})();
