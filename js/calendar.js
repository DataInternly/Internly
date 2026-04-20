// ─────────────────────────────────────────────────────────────────────────────
// Gedeelde beschikbaarheidskalender + afsprakenmodule voor internly.pro
//
// Gebruik:
//   1. Voeg toe aan pagina:  <script src="js/calendar.js"></script>
//   2. Render de kalender:   InternlyCalendar.render('container-id', dbClient, userId)
//   3. Chat-knop:            InternlyCalendar.renderChatButton(otherUserId, otherEmail, otherName, 'sendBtn', db, userId)
//
// Vereist:
//   - Supabase client beschikbaar als db of supabase
//   - Tabellen: availability, meetings (zie SQL in HANDOVER.md)
//   - Edge Function: send-meeting-email (voor e-mailbevestiging)
// ─────────────────────────────────────────────────────────────────────────────

const InternlyCalendar = (() => {

  const DAYS  = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];
  const HOURS = [8,9,10,11,12,13,14,15,16,17];

  let _db = null, _userId = null, _containerId = null, _saving = false, _isSavingMeeting = false;
  let _matchId = null; // match UUID — doorgegeven vanuit renderChatButton()
  let _slots = {}; // key: "day_hour" → status string

  // ── helpers ──────────────────────────────────────────────────────────────────
  const k = (d,h) => `${d}_${h}`;
  const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function calNotify(msg, ok = true) {
    let n = document.getElementById('cal-notif');
    if (!n) { n = document.createElement('div'); n.id='cal-notif'; document.body.appendChild(n); }
    n.textContent = msg;
    n.style.background = ok ? '#1a7a48' : '#b82020';
    n.classList.add('show');
    setTimeout(() => n.classList.remove('show'), 3200);
  }

  function nextStatus(s) {
    if (!s)               return 'beschikbaar';
    if (s==='beschikbaar') return 'voorkeur';
    if (s==='voorkeur')    return 'bezet';
    return null;
  }

  // ── CSS ───────────────────────────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('ical-css')) return;
    const s = document.createElement('style');
    s.id = 'ical-css';
    s.textContent = `
#cal-notif{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(16px);background:#1a7a48;color:#fff;padding:.7rem 1.4rem;border-radius:10px;font-size:.87rem;font-family:'Outfit',sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.2);opacity:0;transition:opacity .25s,transform .25s;z-index:9999;pointer-events:none;white-space:nowrap;}
#cal-notif.show{opacity:1;transform:translateX(-50%) translateY(0);}

.ical-wrap{background:#fff;border:1px solid rgba(13,21,32,.09);border-radius:12px;padding:1.25rem;margin-bottom:1.5rem;}
.ical-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem;}
.ical-title{font-family:'Bricolage Grotesque','Outfit',sans-serif;font-size:1rem;font-weight:600;color:#0d1520;display:flex;align-items:center;gap:.4rem;}
.ical-legend{display:flex;gap:.6rem;flex-wrap:wrap;}
.ical-leg-item{display:inline-flex;align-items:center;gap:4px;font-size:.72rem;color:#7a8799;}
.ical-leg-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0;}
.ical-grid{overflow-x:auto;-webkit-overflow-scrolling:touch;}
.ical-table{width:100%;border-collapse:collapse;min-width:340px;}
.ical-table th{font-size:.72rem;font-weight:600;color:#7a8799;letter-spacing:.06em;text-transform:uppercase;padding:.3rem .35rem;text-align:center;}
.ical-table th:first-child{text-align:right;min-width:36px;}
.ical-hlabel{font-size:.7rem;color:#9ca3af;padding-right:.45rem;text-align:right;white-space:nowrap;vertical-align:middle;}
.ical-cell{display:block;width:100%;height:26px;border-radius:5px;border:1.5px solid #e5e7eb;background:#f4f3ef;cursor:pointer;transition:transform .1s,border-color .12s,background .12s;margin:2px;}
.ical-cell:hover{transform:scale(1.08);border-color:#1a7a48;}
.ical-cell.beschikbaar{background:#e8f5ee;border-color:#1a7a48;}
.ical-cell.voorkeur{background:#fdf3e0;border-color:#a06010;}
.ical-cell.bezet{background:#fdeaea;border-color:#b82020;}
.ical-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-top:1rem;padding-top:.85rem;border-top:1px solid rgba(13,21,32,.09);}
.ical-hint{font-size:.76rem;color:#7a8799;}
.ical-save{background:#1a7a48;color:#fff;border:none;border-radius:8px;padding:8px 20px;font-family:'Outfit',sans-serif;font-size:.85rem;font-weight:600;cursor:pointer;transition:background .12s,transform .1s;}
.ical-save:hover{background:#155f39;}
.ical-save:disabled{background:#d1d5db;cursor:not-allowed;}

/* meeting modal */
.mtg-bg{position:fixed;inset:0;background:rgba(13,21,32,.45);z-index:500;display:none;align-items:flex-end;justify-content:center;}
.mtg-bg.open{display:flex;}
@media(min-width:520px){.mtg-bg{align-items:center;}.mtg-box{border-radius:12px!important;max-width:480px;}}
.mtg-box{background:#fff;border-radius:12px 12px 0 0;padding:1.5rem;width:100%;max-height:80vh;overflow-y:auto;-webkit-overflow-scrolling:touch;animation:calUp .2s ease;}
@keyframes calUp{from{transform:translateY(18px);opacity:0;}to{transform:translateY(0);opacity:1;}}
@keyframes calDown{from{transform:translateY(0);opacity:1;}to{transform:translateY(18px);opacity:0;}}
.mtg-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.1rem;}
.mtg-title{font-family:'Bricolage Grotesque','Outfit',sans-serif;font-size:1rem;font-weight:700;color:#0d1520;}
.mtg-close{background:none;border:none;font-size:1.1rem;cursor:pointer;color:#7a8799;padding:4px;}
.mtg-close:hover{color:#0d1520;}
.mf-row{margin-bottom:.8rem;}
.mf-row-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.mf-label{display:block;font-size:.78rem;font-weight:500;color:#3a4455;margin-bottom:.28rem;}
.mf-input,.mf-select,.mf-ta{width:100%;padding:.58rem .82rem;border:1.5px solid rgba(13,21,32,.12);border-radius:8px;font-family:'Outfit',sans-serif;font-size:.87rem;color:#0d1520;background:#fff;outline:none;transition:border-color .12s;}
.mf-input:focus,.mf-select:focus,.mf-ta:focus{border-color:#e05c1a;}
.mf-ta{resize:vertical;min-height:68px;line-height:1.5;}
.mf-time-row{display:flex;gap:6px;align-items:center;}
.mf-time-row .mf-input{flex:1;}
.mf-time-sep{font-size:.8rem;color:#7a8799;}
.avail-prev{background:#f4f3ef;border-radius:8px;padding:.7rem;margin-bottom:.8rem;}
.avail-prev-title{font-size:.78rem;font-weight:600;color:#3a4455;margin-bottom:.35rem;}
.avail-slots{display:flex;flex-wrap:wrap;gap:4px;}
.avail-slot{padding:2px 8px;border-radius:20px;font-size:.71rem;font-weight:500;}
.avail-slot.beschikbaar{background:#e8f5ee;color:#1a7a48;}
.avail-slot.voorkeur{background:#fdf3e0;color:#a06010;}
.mtg-submit{width:100%;padding:11px;background:#e05c1a;color:#fff;border:none;border-radius:8px;font-family:'Outfit',sans-serif;font-size:.93rem;font-weight:600;cursor:pointer;transition:background .12s;margin-top:.4rem;}
.mtg-submit:hover{background:#b84910;}
.mtg-submit:disabled{background:#d1d5db;cursor:not-allowed;}

/* chat button */
.cal-chat-btn{width:38px;height:38px;border-radius:8px;background:#e8f5ee;border:1.5px solid rgba(26,122,72,.25);display:flex;align-items:center;justify-content:center;font-size:1.05rem;cursor:pointer;flex-shrink:0;transition:background .12s,transform .1s;}
.cal-chat-btn:hover{background:#d5eede;}
.cal-chat-btn:active{transform:scale(.94);}

/* ripple on cell toggle */
.ical-cell{position:relative;overflow:hidden;}
.ical-ripple{position:absolute;inset:0;border-radius:inherit;background:rgba(255,255,255,.55);pointer-events:none;animation:icalRipple .28s ease forwards;}
@keyframes icalRipple{from{opacity:.9;transform:scale(.4);}to{opacity:0;transform:scale(1.5);}}

/* reduced motion */
@media(prefers-reduced-motion:reduce){.ical-cell,.cal-chat-btn{transition:none!important;}.ical-ripple{display:none;}}
    `;
    document.head.appendChild(s);
  }

  // ── data ─────────────────────────────────────────────────────────────────────
  async function loadSlots() {
    if (!_db || !_userId) return;
    try {
      const { data, error } = await _db.from('availability')
        .select('day_of_week,hour_start,status').eq('user_id', _userId);
      if (error) throw error;
      _slots = {};
      (data||[]).forEach(r => { _slots[k(r.day_of_week, r.hour_start)] = r.status; });
      renderGrid();
    } catch(e) { console.error('[cal] load:', e?.message || 'onbekende fout'); }
  }

  async function saveAll() {
    if (!_db || !_userId || _saving) return;
    _saving = true;
    const btn = document.getElementById('ical-save-btn');
    if (btn) { btn.disabled=true; btn.textContent='Opslaan...'; }
    try {
      await _db.from('availability').delete().eq('user_id', _userId);
      const rows = Object.entries(_slots).map(([key, status]) => {
        const [d,h] = key.split('_').map(Number);
        return { user_id:_userId, day_of_week:d, hour_start:h, status };
      });
      if (rows.length) { const { error } = await _db.from('availability').insert(rows); if(error) throw error; }
      calNotify('Beschikbaarheid opgeslagen ✓');
    } catch(e) { console.error('[cal] save:', e?.message || 'onbekende fout'); calNotify('Opslaan mislukt', false); }
    finally { _saving=false; if(btn){btn.disabled=false;btn.textContent='Opslaan';} }
  }

  // ── grid ─────────────────────────────────────────────────────────────────────
  function renderGrid() {
    const c = document.getElementById(_containerId);
    if (!c) return;
    c.innerHTML = `
      <div class="ical-wrap">
        <div class="ical-head">
          <div class="ical-title">📅 Mijn beschikbaarheid</div>
          <div class="ical-legend">
            <span class="ical-leg-item"><span class="ical-leg-dot" style="background:#e8f5ee;border:1.5px solid #1a7a48"></span>Beschikbaar</span>
            <span class="ical-leg-item"><span class="ical-leg-dot" style="background:#fdf3e0;border:1.5px solid #a06010"></span>Voorkeur</span>
            <span class="ical-leg-item"><span class="ical-leg-dot" style="background:#fdeaea;border:1.5px solid #b82020"></span>Bezet</span>
          </div>
        </div>
        <div class="ical-grid">
          <table class="ical-table">
            <thead><tr><th></th>${DAYS.map(d=>`<th>${d}</th>`).join('')}</tr></thead>
            <tbody>${HOURS.map(h=>`
              <tr>
                <td class="ical-hlabel">${h}:00</td>
                ${[0,1,2,3,4].map(d=>{
                  const st = _slots[k(d,h)]||'';
                  return `<td><button type="button" class="ical-cell ${st}" data-d="${d}" data-h="${h}"
                    title="${DAYS[d]} ${h}:00${st?' — '+st:''}"
                    onclick="InternlyCalendar._toggle(${d},${h})"></button></td>`;
                }).join('')}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="ical-footer">
          <span class="ical-hint">Klik om te wisselen: leeg → beschikbaar → voorkeur → bezet → leeg</span>
          <button type="button" class="ical-save" id="ical-save-btn" onclick="InternlyCalendar._saveAll()">Opslaan</button>
        </div>
      </div>`;
  }

  function toggleSlot(d, h) {
    const key = k(d,h);
    const next = nextStatus(_slots[key]||null);
    if (next===null) delete _slots[key]; else _slots[key]=next;
    const cell = document.querySelector(`[data-d="${d}"][data-h="${h}"]`);
    if (cell) {
      // Ripple feedback
      const r = document.createElement('span');
      r.className = 'ical-ripple';
      cell.appendChild(r);
      r.addEventListener('animationend', () => r.remove(), { once: true });

      cell.className = `ical-cell ${_slots[key]||''}`;
      cell.title = `${DAYS[d]} ${h}:00${_slots[key]?' — '+_slots[key]:''}`;
    }
  }

  // ── meeting modal ─────────────────────────────────────────────────────────────
  async function openModal(otherUserId, otherEmail, otherName) {
    let otherSlots = [];
    if (_db && otherUserId) {
      try {
        const { data } = await _db.from('availability')
          .select('day_of_week,hour_start,status')
          .eq('user_id', otherUserId)
          .in('status',['beschikbaar','voorkeur']);
        otherSlots = data||[];
      } catch(_){ console.warn('[cal] slots laden mislukt:', _); }
    }

    const byDay = {};
    otherSlots.forEach(s => { (byDay[s.day_of_week]||(byDay[s.day_of_week]=[])).push(s); });

    const previewHTML = otherSlots.length
      ? `<div class="avail-prev"><div class="avail-prev-title">Beschikbaarheid van ${esc(otherName)}</div>
          <div class="avail-slots">${Object.entries(byDay).flatMap(([d,ss])=>
            ss.map(s=>`<span class="avail-slot ${s.status}">${DAYS[d]} ${s.hour_start}:00</span>`)
          ).join('')}</div></div>`
      : `<div class="avail-prev" style="font-size:.78rem;color:#7a8799">${esc(otherName)} heeft nog geen beschikbaarheid ingesteld.</div>`;

    const old = document.getElementById('mtg-modal-bg');
    if (old) old.remove();

    const today = new Date().toISOString().split('T')[0];
    const wrap = document.createElement('div');
    wrap.id = 'mtg-modal-bg';
    wrap.className = 'mtg-bg open';
    wrap.innerHTML = `
      <div class="mtg-box">
        <div class="mtg-head">
          <div class="mtg-title">📅 Afspraak plannen met ${esc(otherName)}</div>
          <button type="button" class="mtg-close" onclick="InternlyCalendar._close()">✕</button>
        </div>
        ${previewHTML}
        <div class="mf-row">
          <label class="mf-label">Onderwerp *</label>
          <input class="mf-input" id="mf-subj" placeholder="Bijv. Voortgangsgesprek week 4">
        </div>
        <div class="mf-row">
          <label class="mf-label">Type *</label>
          <select class="mf-select" id="mf-type" onchange="InternlyCalendar._updateLabel()">
            <option value="video">🎥 Videocall</option>
            <option value="call">📞 Telefonisch</option>
            <option value="fysiek">🏢 Fysiek gesprek</option>
            <option value="driegesprek">👥 Driegesprek (jij + bedrijf + school)</option>
          </select>
        </div>
        <div class="mf-row">
          <label class="mf-label" id="mf-clabel">Vergaderlink *</label>
          <input class="mf-input" id="mf-contact" placeholder="https://meet.google.com/...">
        </div>
        <div class="mf-row-2">
          <div class="mf-row" style="margin-bottom:0">
            <label class="mf-label">Datum *</label>
            <input class="mf-input" id="mf-date" type="date" min="${today}">
          </div>
          <div class="mf-row" style="margin-bottom:0">
            <label class="mf-label">Tijdstip *</label>
            <div class="mf-time-row">
              <input class="mf-input" id="mf-start" type="time" value="10:00">
              <span class="mf-time-sep">–</span>
              <input class="mf-input" id="mf-end" type="time" value="11:00">
            </div>
          </div>
        </div>
        <div class="mf-row" style="margin-top:.75rem">
          <label class="mf-label">Toelichting (optioneel)</label>
          <textarea class="mf-ta" id="mf-note" placeholder="Wat wil je bespreken?"></textarea>
        </div>
        <button type="button" class="mtg-submit" id="mf-submit"
          data-uid="${esc(otherUserId)}"
          data-email="${esc(otherEmail)}"
          data-name="${esc(otherName)}">
          Afspraak versturen →
        </button>
      </div>`;

    document.body.appendChild(wrap);
    wrap.addEventListener('click', e => { if(e.target===wrap) closeModal(); });
    const submitBtn = document.getElementById('mf-submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', () =>
        submitMeeting(submitBtn.dataset.uid, submitBtn.dataset.email, submitBtn.dataset.name));
    }
  }

  function closeModal() {
    const bg = document.getElementById('mtg-modal-bg');
    if (!bg) return;
    const box = bg.querySelector('.mtg-box');
    if (box) {
      box.style.animation = 'calDown .18s ease forwards';
      setTimeout(() => bg.remove(), 175);
    } else {
      bg.remove();
    }
  }

  function updateLabel() {
    const t = document.getElementById('mf-type')?.value;
    const l = document.getElementById('mf-clabel');
    const i = document.getElementById('mf-contact');
    if (!l||!i) return;
    const map = {
      video:  ['Vergaderlink *','https://meet.google.com/...'],
      call:   ['Telefoonnummer *','+31 6 ...'],
      fysiek: ['Adres of locatie *','Straat 1, Amsterdam'],
    };
    [l.textContent, i.placeholder] = map[t]||['Contactgegevens *',''];
  }

  async function submitMeeting(otherUserId, otherEmail, otherName) {
    if (_isSavingMeeting) return;
    _isSavingMeeting = true;
    const subj    = document.getElementById('mf-subj')?.value.trim();
    const type    = document.getElementById('mf-type')?.value;
    const contact = document.getElementById('mf-contact')?.value.trim();
    const date    = document.getElementById('mf-date')?.value;
    const start   = document.getElementById('mf-start')?.value;
    const end     = document.getElementById('mf-end')?.value;
    const note    = document.getElementById('mf-note')?.value.trim();

    if (!subj||!contact||!date||!start||!end) { calNotify('Vul alle verplichte velden in',false); return; }
    if (end<=start) { calNotify('Eindtijd moet na starttijd liggen',false); return; }

    const btn = document.getElementById('mf-submit');
    if (btn) { btn.disabled=true; btn.textContent='Versturen...'; }

    try {
      const { data:{user} } = await _db.auth.getUser();
      const orgEmail = user?.email||'';

      const { data:mtg, error } = await _db.from('meetings').insert({
        organizer_id:   _userId,
        attendee_id:    otherUserId,
        subject:        subj,
        type,
        contact_info:   contact,
        proposed_date:  date,
        time_start:     start,
        time_end:       end,
        status:         'openstaand',
        note:           note||null,
        organizer_email: orgEmail,
        attendee_email:  otherEmail,
        match_id:        _matchId || null,
      }).select().maybeSingle();

      if (error) throw error;
      if (!mtg) { calNotify('Beschikbaarheid kon niet worden opgeslagen — probeer opnieuw'); return; }

      // In-app notificatie verstuurd via createNotification() — e-mail nog niet actief

      // In-app notificatie naar attendee
      if (otherUserId && mtg?.id) {
        const userName = getDisplayName({ email: orgEmail, user_metadata: user?.user_metadata }); // SPRINT5 NOTE: orgEmail is separate var, not user.email
        await _db.from('notifications').insert({
          user_id:  otherUserId,
          type:     (window.MEETING_NOTIFICATION_TYPE || 'new_meeting'),
          ref_id:   mtg.id,
          ref_type: 'meeting',
          message:  `${userName} wil een afspraak plannen: ${subj} op ${date} om ${start}.`,
          read:     false,
        }).catch(err => console.warn('[cal] notif skipped:', err));
      }

      appendMeetingCard({ subj, type, contact, date, start, end });
      closeModal();
      calNotify(`Afspraak verstuurd naar ${otherName} ✓`);

    } catch(e) {
      console.error('[cal] submit:', e?.message || 'onbekende fout');
      calNotify('Er ging iets mis — probeer opnieuw',false);
      if(btn){btn.disabled=false;btn.textContent='Afspraak versturen →';}
    } finally {
      _isSavingMeeting = false;
    }
  }

  // ── meeting card in chat ─────────────────────────────────────────────────────
  function appendMeetingCard(data) {
    const container = document.querySelector('#messagesArea') ||
                      document.querySelector('.messages-list') ||
                      document.querySelector('[data-chat-container]');
    if (!container) return;
    const empty = container.querySelector('.chat-empty');
    if (empty) empty.remove();

    const typeIcon = data.type === 'video' ? '📹 Video'
                   : data.type === 'call'  ? '📞 Bellen'
                   : '🏢 Fysiek';
    const contactLine = data.contact ? ` · ${esc(data.contact)}` : '';
    const now = new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

    const row = document.createElement('div');
    row.className = 'msg-row own';
    row.innerHTML = `
      <div class="bubble-wrap">
        <div class="bubble" style="background:transparent;padding:0;max-width:340px;">
          <div style="background:var(--bg2,#f0ede8);border-radius:8px;padding:.75rem 1rem;
            font-size:.85rem;border-left:3px solid var(--accent,#e05c1a);color:#0d1520;">
            <div style="font-weight:500;margin-bottom:.25rem;">📅 Afspraak aangevraagd</div>
            <div style="color:#3a4455;">${esc(data.subj)} · ${esc(data.date ? new Date(data.date + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '')} · ${esc(data.start)}–${esc(data.end)}</div>
            <div style="font-size:.78rem;color:#7a8799;margin-top:.25rem;">${typeIcon}${contactLine}</div>
          </div>
        </div>
        <span class="msg-time">${now}</span>
      </div>`;
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  // ── public ────────────────────────────────────────────────────────────────────
  return {
    /**
     * Render de beschikbaarheidskalender.
     * @param {string} containerId   ID van het container-element
     * @param {object} dbClient      Supabase client
     * @param {string} userId        UUID van de ingelogde gebruiker
     */
    render(containerId, dbClient, userId) {
      _containerId = containerId;
      _db          = dbClient;
      _userId      = userId;
      injectCSS();
      loadSlots();
    },

    /**
     * Voeg de 📅 knop toe aan de chatbalk.
     * @param {string} otherUserId     UUID van de gesprekspartner
     * @param {string} otherEmail      E-mail van de gesprekspartner
     * @param {string} otherName       Naam van de gesprekspartner
     * @param {string} insertBeforeId  ID van het element voor de knop (bijv. 'sendBtn')
     * @param {object} dbClient        Supabase client
     * @param {string} userId          UUID van de ingelogde gebruiker
     * @param {string} [matchId]       UUID van de match (voor match_id op meetings)
     */
    renderChatButton(otherUserId, otherEmail, otherName, insertBeforeId, dbClient, userId, matchId) {
      _db      = dbClient;
      _userId  = userId;
      _matchId = matchId || null;
      injectCSS();
      if (document.getElementById('cal-chat-btn')) return;
      const btn = document.createElement('button');
      btn.id = 'cal-chat-btn';
      btn.type = 'button';
      btn.className = 'cal-chat-btn';
      btn.title = 'Afspraak plannen';
      btn.style.cssText += ';width:auto;padding:0 10px;gap:5px;';
      btn.innerHTML = '📅 <span style="font-size:.78rem;font-weight:600;font-family:\'Outfit\',sans-serif;">Afspraak</span>';
      btn.onclick = () => openModal(otherUserId, otherEmail, otherName);
      const anchor = document.getElementById(insertBeforeId);
      if (anchor) anchor.parentNode.insertBefore(btn, anchor);
    },

    _toggle:      toggleSlot,
    _saveAll:     saveAll,
    _close:       closeModal,
    _updateLabel: updateLabel,
    _submit:      submitMeeting,
    _open:        openModal,
  };

})();
