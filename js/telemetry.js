// ── INTERNLY TELEMETRY v2.1 ───────────────────────────────────────────────────
// Client-side sessie-bewaking en gedragsanalyse.
//
// Laad dit bestand ALTIJD als laatste script, na js/utils.js en js/supabase.js.
// Alle modules degraderen graceful als afhankelijkheden ontbreken.
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// BLOK 0 — _cfg
// Object.freeze direct bij declaratie — volgorde correct.
// ═══════════════════════════════════════════════════════════════════════════════

const _cfg = Object.freeze({

  // ── Globale schakelaar ──────────────────────────────────────────────────────
  ENABLED: true,

  // ── Per-module aan/uit ──────────────────────────────────────────────────────
  honeypot:       { enabled: true, score: 8 },
  canary:         { enabled: true, score: 6 },
  domGuard:       { enabled: true, score: 7 },
  cspReporter:    { enabled: true, score: 4 },
  timingGuard:    { enabled: true, score: 2 },
  integrityPulse: { enabled: true, score: 9 },

  // ── Drempels ─────────────────────────────────────────────────────────────────
  // Kant's maatstaf: kan een legitieme gebruiker met slecht wifi score 6
  // bereiken zonder kwaad opzet?
  // Antwoord: score 6 vereist timing (2) + één verdacht element (4) —
  // onwaarschijnlijk voor een gewone gebruiker.
  THRESHOLD_OBSERVE: 2,   // log alleen
  THRESHOLD_TARPIT:  4,   // vertraag 1.5–3.5s
  THRESHOLD_FREEZE:  7,   // bevries 30s
  THRESHOLD_POISON:  9,   // vergiftig sessie

  // ── Vertragingsconfiguratie ──────────────────────────────────────────────────
  TARPIT_MIN_MS: 1500,
  TARPIT_MAX_MS: 3500,

  // ── Bevriezingsconfiguratie ──────────────────────────────────────────────────
  FREEZE_DURATION_MS: 30000,

  // ── Logging ─────────────────────────────────────────────────────────────────
  LOG_TO_CONSOLE: true,
  LOG_TO_DB:      true,
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOK 2 — _tel
// window.__SUPABASE_ANON_KEY wordt gezet door supabase.js.
// Fallback: typeof SUPABASE_ANON_KEY (ook bruikbaar op app-pagina's).
// Op index.html (geen supabase.js): DB-logging werkt niet — console.warn eenmalig.
// ═══════════════════════════════════════════════════════════════════════════════

const _tel = (function() {
  const ENDPOINT =
    'https://qoxgbkbnjsycodcqqmft.supabase.co'
    + '/rest/v1/security_reports';

  // Eenmalige key-lookup bij initialisatie (supabase.js al geladen).
  const _key = window.__SUPABASE_ANON_KEY
    || (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '');

  if (!_key && _cfg.LOG_TO_DB) {
    console.warn(
      '[t] geen sleutel gevonden —'
      + ' DB-logging uitgeschakeld voor deze pagina'
    );
  }

  function report(type, payload) {
    if (!_cfg.LOG_TO_DB) return;
    if (!type || !_key) return;
    fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': _key,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ type, payload: payload || {} })
    }).catch(() => {}); // async
    // Stille failure altijd — UX mag nooit geraakt worden
  }

  return { report };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// BLOK 1 — _sess
// _responding flag voorkomt race-condition (dubbele _pause/_shadow).
// _pause gebruikt max z-index, sluit modals, markeert overlay.
// freeze-overlay krijgt data-hunter-internal zodat _render hem overslaat.
// ═══════════════════════════════════════════════════════════════════════════════

const _sess = (function() {
  let _score      = 0;
  let _frozen     = false;
  let _poisoned   = false;
  let _responding = false; // race-condition guard

  function _inc(hunterName, points, detail) {
    if (!_cfg.ENABLED) return;
    const cfg = _cfg[hunterName];
    if (!cfg?.enabled) return;

    _score += points;

    if (_cfg.LOG_TO_CONSOLE) {
      console.warn(
        `[s] ${hunterName} +${points} → totaal: ${_score}`
      );
    }

    _tel.report('sess_evt', {
      hunter: hunterName,
      points,
      total:  _score,
      detail: (detail || '').substring(0, 80)
    });

    _respond();
  }

  // try/finally + _responding flag voorkomt dubbele respons
  // als twee modules tegelijk triggeren.
  function _respond() {
    if (_responding) return;
    _responding = true;

    try {
      if (_score >= _cfg.THRESHOLD_POISON && !_poisoned) {
        _poisoned = true;
        _tel.report('sess_shadow', { score: _score });
        _shadow();
        return;
      }
      if (_score >= _cfg.THRESHOLD_FREEZE && !_frozen) {
        _frozen = true;
        _tel.report('sess_pause', { score: _score });
        _pause();
        return;
      }
      if (_score >= _cfg.THRESHOLD_TARPIT) {
        _tel.report('sess_yield', { score: _score });
        // _yield is per-actie — geen globale state hier
      }
    } finally {
      _responding = false;
    }
  }

  // ui state
  function _pause() {
    // Sluit openstaande modals vóór bevriezing zodat gebruiker niet vast zit.
    document.querySelectorAll(
      '[role="dialog"],[data-modal],.modal-overlay'
    ).forEach(m => {
      if (m.style.display !== 'none') {
        m.dataset.frozenHidden = 'true'; // data-frozen-hidden
        m.style.display = 'none';
      }
    });

    const overlay = document.createElement('div');
    overlay.id = '_hunter_freeze';
    overlay.dataset.hunterInternal = 'true'; // _render skipt dit element
    overlay.style.cssText =
      'position:fixed;inset:0;'
      + 'z-index:2147483647;'          // max mogelijk z-index
      + 'background:transparent;'
      + 'cursor:wait;'
      + 'pointer-events:all;';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.remove();
      // Herstel gesloten modals
      document.querySelectorAll('[data-frozen-hidden]').forEach(m => {
        m.style.display = '';
        delete m.dataset.frozenHidden;
      });
      _frozen = false;
      _score  = Math.max(0, _score - 4);
    }, _cfg.FREEZE_DURATION_MS);
  }

  // shadow mode
  function _shadow() {
    if (typeof window.notify === 'function') {
      const orig = window.notify.bind(window);
      window.notify = function(msg, ok) {
        _tel.report('shadow_call', {
          msg: (msg || '').substring(0, 60)
        });
        return orig(msg, ok);
      };
    }
  }

  function _slow()  { return _score >= _cfg.THRESHOLD_TARPIT; }
  function _held()  { return _frozen;   }
  function _shad()  { return _poisoned; }
  function _val()   { return _score;    }

  return { _inc, _slow, _held, _shad, _val };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// BLOK 3 — _yield
// Geen stapeling als isApplying() actief is.
// ═══════════════════════════════════════════════════════════════════════════════

async function _yield() {
  if (!_cfg.ENABLED) return;
  if (!_sess._slow()) return;
  // Als een sollicitatie al bezig is, sla over —
  // anders stapelen delays zich op en blokkeert de UX.
  if (typeof isApplying === 'function' && isApplying()) return;
  const delay = _cfg.TARPIT_MIN_MS
    + Math.random() * (
        _cfg.TARPIT_MAX_MS
        - _cfg.TARPIT_MIN_MS
      );
  await new Promise(r => setTimeout(r, delay));
}

// Geïntegreerd in js/utils.js createNotification():
//   if (typeof _yield === 'function') await _yield();
// Score 0 (normale gebruiker): keert direct terug.
// Score >= 4 (verdacht): 1.5–3.5s vertraging per actie.

// ═══════════════════════════════════════════════════════════════════════════════
// BLOK 4 — _fCtx
// Per-form unieke IDs via counter (_plantCount).
//   _plant() — voegt verborgen veld toe aan een container.
//   _guard() — voor echte <form>-elementen (submit-event).
//   blockIfFilled(label) — voor button-handlers zonder <form>.
//   isFilled() — controleert alle geplante traps op waarde.
// ═══════════════════════════════════════════════════════════════════════════════

const _fCtx = (function() {
  if (!_cfg.honeypot.enabled)
    return {
      _plant() {},
      _guard() {},
      isFilled()     { return false; },
      blockIfFilled(){ return false; }
    };

  let _plantCount = 0; // telt geplante velden voor unieke IDs

  function _plant(containerEl) {
    if (!containerEl) return;
    // Voorkom dubbele plant op dezelfde container
    if (containerEl.querySelector('[data-hp-id]')) return;

    const trapId = `_hp_${_plantCount++}`; // uniek per aanroep

    const t = document.createElement('input');
    t.type         = 'text';
    t.name         = 'website';
    t.id           = trapId;
    t.dataset.hpId = trapId; // zoekbaar via [data-hp-id]
    t.autocomplete  = 'off';
    t.tabIndex     = -1;
    t.setAttribute('aria-hidden', 'true');
    t.style.cssText =
      'position:absolute;left:-9999px;'
      + 'width:0;height:0;opacity:0;pointer-events:none;';
    containerEl.appendChild(t);
  }

  // Voor echte <form>-elementen met submit-event.
  function _guard(formEl, onBlocked) {
    if (!formEl) return;
    _plant(formEl);
    formEl.addEventListener('submit', e => {
      // zoek trap binnen deze specifieke form
      const trap = formEl.querySelector('[data-hp-id]');
      if ((trap?.value?.length ?? 0) > 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        _sess._inc(
          'honeypot',
          _cfg.honeypot.score,
          'form submit with trap filled'
        );
        if (typeof onBlocked === 'function') onBlocked();
      }
    });
  }

  // Controleert ALLE geplante traps op de pagina.
  function isFilled() {
    return Array.from(document.querySelectorAll('[data-hp-id]'))
      .some(t => (t.value?.length ?? 0) > 0);
  }

  // Gebruikt in button-handlers (auth.html, index.html).
  function blockIfFilled(label) {
    if (!isFilled()) return false;
    _sess._inc(
      'honeypot',
      _cfg.honeypot.score,
      label || 'trap filled on submit'
    );
    return true;
  }

  return { _plant, _guard, isFilled, blockIfFilled };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// BLOK 5 — _env
// Bulletproof fetch-wrapper.
//   — typeof check vóór wrapping
//   — try/catch om detector-logica (nooit fetch laten crashen)
//   — try/catch om doorgifte (veilige doorgave)
// ═══════════════════════════════════════════════════════════════════════════════

const _env = (function() {
  if (!_cfg.canary.enabled)
    return { watch() {} };

  // endpoint config
  const _k = '_x_cfg_ref';
  const _u = 'https://internly.pro/api/v0/';

  function watch() {
    const origFetch = window.fetch;
    // veiligheidscheck vóór wrapping
    if (typeof origFetch !== 'function') return;

    window.fetch = function(url, ...args) {
      // detector-check in try/catch — nooit de hele wrapper laten crashen
      try {
        if (typeof url === 'string' && url.startsWith(_u)) {
          _sess._inc(
            'canary',
            _cfg.canary.score,
            'endpoint called: ' + url.substring(0, 60)
          );
          return Promise.reject(new Error('Not found'));
        }
      } catch (e) {
        console.error('[ev] guard error:', e?.message || 'onbekende fout');
      }
      // doorgifte aan origineel ook in try/catch
      try {
        return origFetch.apply(window, [url, ...args]);
      } catch (e) {
        return Promise.reject(e);
      }
    };
  }

  return { watch };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// BLOK 6 — _render
// data-hunter-internal elementen worden overgeslagen.
// Allowlist gesynchroniseerd met CSP in .htaccess.
// ═══════════════════════════════════════════════════════════════════════════════

const _render = (function() {
  if (!_cfg.domGuard.enabled)
    return { start() {} };

  // LINK bewust NIET in deze lijst — LINK-tags zijn geen aanvalsvector
  // in Internly's context; stylesheets/favicons/preloads gebruiken LINK.
  const DANGEROUS = ['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED'];

  // Gesynchroniseerd met de CSP in .htaccess.
  // Voeg nieuwe bronnen hier én in .htaccess toe.
  const ALLOWED = [
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
    'translate.google.com',
    'translate.googleapis.com',
    'translate.gstatic.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'www.gstatic.com',
    'maps.googleapis.com',
    'maps.gstatic.com',
    'js.mollie.com',
  ];

  function start() {
    const obs = new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          // overgeslagen interne elementen (bijv. freeze-overlay)
          if (n.dataset?.hunterInternal) continue;
          if (!DANGEROUS.includes(n.tagName)) continue;
          const src = n.src || n.href || '';
          if (!src) continue; // inline scripts zonder src: geen externe injectie
          if (ALLOWED.some(a => src.includes(a))) continue;
          // cleanup
          n.remove();
          _sess._inc(
            'domGuard',
            _cfg.domGuard.score,
            n.tagName + ' ' + src.substring(0, 50)
          );
        }
      }
    });
    obs.observe(document.body || document.documentElement, {
      childList: true,
      subtree:   true
    });
  }

  return { start };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// BLOK 7 — _pol
// Passief — browser triggert securitypolicyviolation event.
// ═══════════════════════════════════════════════════════════════════════════════

const _pol = (function() {
  if (!_cfg.cspReporter.enabled)
    return { start() {} };

  function start() {
    document.addEventListener('securitypolicyviolation', e => {
      _sess._inc(
        'cspReporter',
        _cfg.cspReporter.score,
        e.blockedURI.substring(0, 60)
      );
    });
  }

  return { start };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// BLOK 8 — _perf
// Kant's drempel: 15 acties per 3 seconden.
// Deanna2: MBO-student met gedeeld wifi mag nooit geblokkeerd worden.
// ═══════════════════════════════════════════════════════════════════════════════

const _perf = (function() {
  if (!_cfg.timingGuard.enabled)
    return { tick() { return true; } };

  const MAX = 15;
  const WIN = 3000;
  let   ts  = [];

  function tick() {
    const now = Date.now();
    ts.push(now);
    ts = ts.filter(t => now - t < WIN);
    if (ts.length > MAX) {
      _sess._inc(
        'timingGuard',
        _cfg.timingGuard.score,
        `${ts.length} actions / ${WIN}ms`
      );
      return false;
    }
    return true;
  }

  return { tick };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// BLOK 9 — _state
// Object.freeze direct bij declaratie — volgorde is correct.
// ═══════════════════════════════════════════════════════════════════════════════

const _state = Object.freeze(
  (function() {
    if (!_cfg.integrityPulse.enabled)
      return Object.freeze({
        snapshot() {},
        verify() { return true; }
      });

    const snaps = {};

    function snapshot(name, fn) {
      if (typeof fn === 'function') snaps[name] = fn.toString();
    }

    function verify(name, fn) {
      if (!snaps[name]) return true;
      if (typeof fn !== 'function') return false;
      if (fn.toString() === snaps[name]) return true;
      _sess._inc(
        'integrityPulse',
        _cfg.integrityPulse.score,
        'function hijack: ' + name
      );
      return false;
    }

    return { snapshot, verify };
  })()
);

// ═══════════════════════════════════════════════════════════════════════════════
// BLOK 10 — BOOT SEQUENCE
// _env.watch() synchroon (zo vroeg mogelijk).
//   Rest via DOMContentLoaded (_bootReady) — garandeert dat:
//   1. document.body bestaat voor _render.observe()
//   2. utils.js functies beschikbaar zijn voor _state.snapshot()
// ═══════════════════════════════════════════════════════════════════════════════

(function boot() {
  if (!_cfg.ENABLED) return;

  // _env zo vroeg mogelijk — wraps window.fetch synchroon.
  _env.watch();

  // rest na DOMContentLoaded — document.body en window-functies bestaan.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bootReady);
  } else {
    // DOM al klaar (bijv. defer-script of late loading)
    _bootReady();
  }
})();

// hoisted function declaration — beschikbaar in boot() IIFE hierboven.
function _bootReady() {
  if (!_cfg.ENABLED) return;

  _render.start();
  _pol.start();

  // Snapshots van kritieke utils-functies via window[name].
  // typeof-guard: graceful degradation als utils.js niet geladen is (index.html).
  ['notify', 'escapeHtml', 'createNotification'].forEach(name => {
    if (typeof window[name] === 'function') {
      _state.snapshot(name, window[name]);
    } else {
      console.warn(
        `[t] snapshot miss: ${name} — function not found at boot`
      );
    }
  });

  _tel.report('tel_init', { ts: Date.now() });
}
