// js/matchpool.js
// Matchpool — swipe-based discovery voor BOL-studenten
// Laadvolgorde: utils.js → supabase.js → matchpool.js → telemetry.js

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────

  let _user  = null;
  let _pools = { vacature: [], buddy: [], bedrijf: [] };
  let _on    = { vacature: true, buddy: true, bedrijf: true };
  let _rrIdx = 0;
  let _seen  = 0;
  let _busy  = false;
  let _cur   = null; // { item, type }

  const TYPES     = ['vacature', 'buddy', 'bedrijf'];
  const TYPE_NAAM = { vacature: 'Vacatures', buddy: 'Buddies', bedrijf: 'Bedrijven' };

  // ── Fetch pool ─────────────────────────────────────────────────────────────

  async function fetchPool() {
    const { data: done } = await db
      .from('swipes')
      .select('target_id, target_type')
      .eq('swiper_id', _user.id);

    const seen = { vacature: new Set(), buddy: new Set(), bedrijf: new Set() };
    if (done) done.forEach(s => {
      if (seen[s.target_type]) seen[s.target_type].add(s.target_id);
    });

    const [vacRes, budRes, bedRes] = await Promise.all([
      db.from('internship_postings')
        .select('id, title, description, sector, duration, start_date, tags, trust_score, trust_grade, company_name, created_by')
        .eq('is_active_profile', true)
        .order('trust_score', { ascending: false })
        .limit(30),
      db.from('buddy_profiles')
        .select('profile_id, kennis_gebieden, specialiteiten, grove_beschikbaarheid, stad, leeftijd, profiles(naam)')
        .eq('active', true)
        .limit(30),
      db.from('company_profiles')
        .select('profile_id, bedrijfsnaam, sector, size, beschrijving, trust_score, trust_grade')
        .limit(30),
    ]);

    _pools.vacature = (vacRes.data || []).filter(v => !seen.vacature.has(v.id));
    _pools.buddy    = (budRes.data || []).filter(b => !seen.buddy.has(b.profile_id));
    _pools.bedrijf  = (bedRes.data || []).filter(b => !seen.bedrijf.has(b.profile_id));
  }

  // ── Round-robin ────────────────────────────────────────────────────────────

  function nextCard() {
    for (let i = 0; i < 3; i++) {
      const type = TYPES[_rrIdx % 3];
      _rrIdx++;
      if (_on[type] && _pools[type].length > 0) {
        return { item: _pools[type].shift(), type };
      }
    }
    return null;
  }

  // ── Card renderers ─────────────────────────────────────────────────────────

  function renderVacature(v) {
    const tags   = Array.isArray(v.tags) ? v.tags.slice(0, 3) : [];
    const desc   = v.description ? escapeHtml(v.description.slice(0, 130)) + '…' : '';
    const grade  = v.trust_grade || '';

    return `
      <div class="mp-card-header mp-card-header--vacature">
        <span class="mp-type-badge">Vacature</span>
        <div class="mp-card-title">${escapeHtml(v.title || '')}</div>
        <div class="mp-card-sub">${escapeHtml(v.company_name || '')}</div>
      </div>
      <div class="mp-card-body">
        ${grade ? `<span class="mp-trust mp-trust--${grade.toLowerCase()}">Trust ${grade}</span>` : ''}
        <div class="mp-meta-row">
          ${v.sector   ? `<span class="mp-meta">${escapeHtml(v.sector)}</span>`   : ''}
          ${v.duration ? `<span class="mp-meta">${escapeHtml(v.duration)}</span>` : ''}
          ${v.start_date ? `<span class="mp-meta">Start ${escapeHtml(v.start_date)}</span>` : ''}
        </div>
        ${desc ? `<p class="mp-desc">${desc}</p>` : ''}
        ${tags.length ? `<div class="mp-tags">${tags.map(t => `<span class="mp-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      </div>`;
  }

  function renderBuddy(b) {
    const naam = b.profiles?.naam || 'Buddy';
    const init = naam.charAt(0).toUpperCase();
    const kg   = Array.isArray(b.kennis_gebieden) ? b.kennis_gebieden.slice(0, 3) : [];
    const sp   = Array.isArray(b.specialiteiten)  ? b.specialiteiten.slice(0, 2) : [];
    const meta = [b.leeftijd ? b.leeftijd + ' jaar' : null, b.stad ? escapeHtml(b.stad) : null].filter(Boolean).join(' · ');

    return `
      <div class="mp-card-header mp-card-header--buddy">
        <span class="mp-type-badge">Buddy</span>
        <div class="mp-avatar">${escapeHtml(init)}</div>
        <div class="mp-card-title">${escapeHtml(naam)}</div>
        ${meta ? `<div class="mp-card-sub">${meta}</div>` : ''}
      </div>
      <div class="mp-card-body">
        ${kg.length ? `<div class="mp-card-label">Kennis</div><div class="mp-tags">${kg.map(k => `<span class="mp-tag mp-tag--buddy">${escapeHtml(k)}</span>`).join('')}</div>` : ''}
        ${sp.length ? `<div class="mp-card-label" style="margin-top:10px">Als buddy</div><div class="mp-tags">${sp.map(s => `<span class="mp-tag mp-tag--buddy">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
        ${b.grove_beschikbaarheid ? `<p class="mp-desc">${escapeHtml(b.grove_beschikbaarheid)}</p>` : ''}
      </div>`;
  }

  function renderBedrijf(b) {
    const desc  = b.beschrijving ? escapeHtml(b.beschrijving.slice(0, 130)) + '…' : '';
    const grade = b.trust_grade || '';

    return `
      <div class="mp-card-header mp-card-header--bedrijf">
        <span class="mp-type-badge">Bedrijf</span>
        <div class="mp-card-title">${escapeHtml(b.bedrijfsnaam || '')}</div>
        ${b.size ? `<div class="mp-card-sub">${escapeHtml(b.size)}</div>` : ''}
      </div>
      <div class="mp-card-body">
        ${grade ? `<span class="mp-trust mp-trust--${grade.toLowerCase()}">Trust ${grade}</span>` : ''}
        <div class="mp-meta-row">
          ${b.sector ? `<span class="mp-meta">${escapeHtml(b.sector)}</span>` : ''}
        </div>
        ${desc ? `<p class="mp-desc">${desc}</p>` : ''}
      </div>`;
  }

  function renderCard(item, type) {
    if (type === 'vacature') return renderVacature(item);
    if (type === 'buddy')    return renderBuddy(item);
    return renderBedrijf(item);
  }

  // ── Show / hide card ───────────────────────────────────────────────────────

  function showCard(entry) {
    _cur = entry;
    const el = document.getElementById('mp-card');
    if (el) {
      el.className = 'mp-card mp-card--in';
      el.innerHTML = renderCard(entry.item, entry.type);
    }
    const act = document.getElementById('mp-actions');
    if (act) act.style.display = 'flex';
    const emp = document.getElementById('mp-empty');
    if (emp) emp.style.display = 'none';
    _updateProgress();
  }

  function showEmpty() {
    _cur = null;
    const el = document.getElementById('mp-card');
    if (el) { el.className = 'mp-card'; el.innerHTML = ''; }
    const act = document.getElementById('mp-actions');
    if (act) act.style.display = 'none';

    const emp = document.getElementById('mp-empty');
    if (!emp) return;
    emp.style.display = 'block';

    const body = emp.querySelector('.mp-empty-body');
    if (!body) return;

    const allOff = TYPES.every(t => !_on[t]);
    if (allOff) {
      body.innerHTML = '<p>Zet minstens één categorie aan om kaarten te zien.</p>';
      return;
    }

    const msgs = {
      vacature: 'Je hebt alle vacatures in de pool gezien. Nieuwe komen er regelmatig bij — kijk later weer!',
      buddy:    'Nog weinig buddies actief. We breiden ons buddy-netwerk uit — je krijgt een melding zodra er nieuwe matches mogelijk zijn.',
      bedrijf:  'Je hebt alle bedrijven in de pool gezien. Nieuwe bedrijven sluiten regelmatig aan.',
    };
    const empties = TYPES.filter(t => _on[t]);
    body.innerHTML = empties.map(t => `<p>${msgs[t]}</p>`).join('');
    _updateProgress();
  }

  // ── Toggle ─────────────────────────────────────────────────────────────────

  function _updateToggles() {
    TYPES.forEach(type => {
      const btn = document.getElementById('mpt-' + type);
      if (!btn) return;
      const count = _pools[type].length;
      btn.className = 'mp-pill' + (_on[type] ? ' mp-pill--on' : '');
      btn.textContent = count > 0 ? `${TYPE_NAAM[type]} (${count})` : TYPE_NAAM[type];
    });
  }

  window.mpToggle = function (type) {
    if (!TYPES.includes(type)) return;
    _on[type] = !_on[type];
    _updateToggles();
    if (_cur && !_on[_cur.type]) _advance();
    if (!_cur) {
      const next = nextCard();
      next ? showCard(next) : showEmpty();
      _updateToggles();
    }
  };

  // ── Progress ───────────────────────────────────────────────────────────────

  function _updateProgress() {
    const rem = _pools.vacature.length + _pools.buddy.length + _pools.bedrijf.length;
    const el  = document.getElementById('mp-progress');
    if (!el) return;
    el.textContent = rem > 0
      ? `${_seen} gezien · ${rem} te gaan`
      : _seen > 0 ? `${_seen} kaarten bekeken` : '';
  }

  // ── Swipe ──────────────────────────────────────────────────────────────────

  async function doSwipe(direction) {
    if (_busy || !_cur) return;
    _busy = true;

    const entry  = _cur;
    const cardEl = document.getElementById('mp-card');
    if (cardEl) cardEl.className = `mp-card mp-card--out-${direction}`;

    const targetId = entry.type === 'vacature' ? entry.item.id : entry.item.profile_id;

    const [, swipeResult] = await Promise.all([
      new Promise(r => setTimeout(r, 280)),
      db.from('swipes').insert({
        swiper_id:   _user.id,
        target_id:   targetId,
        target_type: entry.type,
        direction,
      }).select('id').maybeSingle(),
    ]);

    if (swipeResult.error) console.error('[matchpool] swipe fout:', swipeResult.error.message);

    const swipeId = swipeResult.data?.id || null;

    _seen++;
    _advance();
    _busy = false;

    // Undo-toast — alleen tonen als swipe opgeslagen is en we het ID hebben
    if (swipeId && window.toast) {
      toast.successUndoable(direction === 'right' ? 'Geliket' : 'Overgeslagen', async () => {
        const { error: delErr } = await db.from('swipes').delete().eq('id', swipeId).eq('swiper_id', _user.id);
        if (delErr) {
          toast.info('Ongedaan maken niet meer mogelijk — er is al een match aangemaakt');
          return;
        }
        // Zet kaart terug vooraan in de pool
        _pools[entry.type].unshift(entry.item);
        _seen = Math.max(0, _seen - 1);
        showCard(entry);
        _updateToggles();
        _updateProgress();
      }, { duration: 4000 });
    }
  }

  function _advance() {
    const next = nextCard();
    if (next) {
      showCard(next);
    } else {
      showEmpty();
    }
    _updateToggles();
  }

  window.mpLike = () => doSwipe('like');
  window.mpPass = () => doSwipe('pass');

  // ── Init ───────────────────────────────────────────────────────────────────

  async function init() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) { window.location.href = 'auth.html'; return; }
    _user = user;

    const valid = await requireRole('student');
    if (!valid) return;

    window.currentUser = user;
    document.getElementById('app').style.display = '';
    await renderStudentHeader({ containerId: 'student-header', activeTab: 'matchpool' });

    const bellEl = document.getElementById('notifBell');
    if (bellEl) bellEl.style.display = 'flex';
    loadNotifications();
    startNotifSubscription();

    await fetchPool();

    _updateToggles();

    const first = nextCard();
    if (first) {
      showCard(first);
    } else {
      showEmpty();
    }
    _updateProgress();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
