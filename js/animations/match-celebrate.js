/**
 * match-celebrate.js — Internly match-animaties library v1.0
 * Standalone, vanilla JS, geen dependencies.
 * Brief: MATCH_ANIMATIONS_DESIGN_BRIEF_2026-04-21.md
 */
(function () {
  'use strict';

  const G = '#1A7A48'; // internly-green
  const O = '#E85D24'; // internly-orange

  // ── CSS injection (één keer per pagina) ───────────────────────────────────
  let _cssInjected = false;
  function _injectCSS() {
    if (_cssInjected || document.getElementById('mc-styles')) { _cssInjected = true; return; }
    _cssInjected = true;
    const s = document.createElement('style');
    s.id = 'mc-styles';
    s.textContent = `
      .internly-match-celebrate{position:absolute;inset:0;z-index:9000;pointer-events:none;overflow:hidden;display:flex;align-items:center;justify-content:center;}
      .internly-match-celebrate svg{display:block;overflow:visible;}

      /* Variant A – Buddy 900ms */
      @keyframes mc-slide-l{from{transform:translateX(-50px);opacity:0}to{transform:translateX(0);opacity:.9}}
      @keyframes mc-slide-r{from{transform:translateX(50px);opacity:0}to{transform:translateX(0);opacity:.9}}
      @keyframes mc-dash48{from{stroke-dashoffset:48}to{stroke-dashoffset:0}}
      @keyframes mc-stroke-pulse{0%{stroke:#1A7A48}50%{stroke:#E85D24}100%{stroke:#1A7A48}}

      /* Variant B – School 800ms */
      @keyframes mc-fade09{from{opacity:0}to{opacity:.9}}
      @keyframes mc-tilt-in{from{opacity:0;transform:rotate(0deg)}to{opacity:.9;transform:rotate(2deg)}}
      @keyframes mc-dash72{from{stroke-dashoffset:72}to{stroke-dashoffset:0}}
      @keyframes mc-dot-out{from{opacity:1}to{opacity:0}}

      /* Variant C – Bedrijf 1100ms */
      @keyframes mc-drift-l{from{transform:translateX(-20px);opacity:0}to{transform:translateX(0);opacity:1}}
      @keyframes mc-drift-r{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}
      @keyframes mc-unfold{from{transform:scaleY(0)}to{transform:scaleY(1)}}
      @keyframes mc-line-in{from{opacity:0}to{opacity:1}}
      @keyframes mc-check-pop{0%{transform:scale(0)}70%{transform:scale(1.1)}100%{transform:scale(1)}}

      /* Variant D – completion-bol 1200ms */
      @keyframes mc-seal-swing{
        0%{transform:translateY(-60px) rotate(-20deg);opacity:0}
        55%{transform:translateY(0) rotate(0deg);opacity:1}
        63%{transform:translateY(2px) rotate(-.5deg)}
        71%{transform:translateY(-2px) rotate(.5deg)}
        79%{transform:translateY(1px) rotate(-.3deg)}
        100%{transform:translateY(0) rotate(0deg);opacity:1}
      }
      @keyframes mc-aura-out{0%{opacity:.7;transform:scale(1)}100%{opacity:0;transform:scale(1.3)}}

      /* Variant E – completion-bbl 1400ms */
      @keyframes mc-line180{from{stroke-dashoffset:180}to{stroke-dashoffset:0}}
      @keyframes mc-marker-flash{0%{opacity:0}35%{opacity:1}65%{opacity:.4}100%{opacity:1}}
      @keyframes mc-chevron-in{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
    `;
    document.head.appendChild(s);
  }

  // ── ARIA live region ──────────────────────────────────────────────────────
  function _announce(msg) {
    let r = document.getElementById('mc-aria-live');
    if (!r) {
      r = document.createElement('div');
      r.id = 'mc-aria-live';
      r.setAttribute('aria-live', 'polite');
      r.setAttribute('aria-atomic', 'true');
      r.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
      document.body.appendChild(r);
    }
    r.textContent = '';
    requestAnimationFrame(function () { r.textContent = msg; });
  }

  // ── Container helper ──────────────────────────────────────────────────────
  function _mkRoot(targetEl) {
    if (getComputedStyle(targetEl).position === 'static') targetEl.style.position = 'relative';
    var div = document.createElement('div');
    div.className = 'internly-match-celebrate';
    targetEl.appendChild(div);
    return div;
  }

  // ── Sound hook (MVP: assets null, geen geluid) ────────────────────────────
  var _soundAssets = { bedrijf: null, 'completion-bol': null };
  function _playSound(type) {
    var src = _soundAssets[type];
    if (!src) return;
    try { new Audio(src).play().catch(function () {}); } catch (_) {}
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Variant A — Buddy (900 ms)
  // Twee cirkels inschuiven, aanraken, verbindingslijn verschijnt + pulse
  // ─────────────────────────────────────────────────────────────────────────
  function _buddy(reduced) {
    if (reduced) {
      return '<svg viewBox="0 0 120 60" width="120" height="60">' +
        '<circle cx="24" cy="30" r="12" fill="' + G + '" opacity=".9"/>' +
        '<line x1="36" y1="30" x2="84" y2="30" stroke="' + G + '" stroke-width="2.5"/>' +
        '<circle cx="96" cy="30" r="12" fill="' + G + '" opacity=".9"/>' +
        '</svg>';
    }
    return '<svg viewBox="0 0 120 60" width="120" height="60">' +
      // Left circle — inschuif vanuit links, 350ms overshoot
      '<circle cx="24" cy="30" r="12" fill="' + G + '" opacity="0"' +
        ' style="animation:mc-slide-l 350ms cubic-bezier(0.34,1.56,0.64,1) forwards"/>' +
      // Right circle — inschuif vanuit rechts, 350ms overshoot
      '<circle cx="96" cy="30" r="12" fill="' + G + '" opacity="0"' +
        ' style="animation:mc-slide-r 350ms cubic-bezier(0.34,1.56,0.64,1) forwards"/>' +
      // Verbindingslijn — dashoffset appear 250ms na 450ms, daarna pulse orange 200ms
      '<line x1="36" y1="30" x2="84" y2="30" stroke="' + G + '" stroke-width="2.5"' +
        ' stroke-dasharray="48" stroke-dashoffset="48"' +
        ' style="animation:mc-dash48 250ms ease-out 450ms forwards,mc-stroke-pulse 200ms ease-in-out 700ms forwards"/>' +
      '</svg>';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Variant B — School/begeleider (800 ms)
  // Schild fade-in, persoon fade-in +100ms met 2° tilt, dotted→solid lijn
  // ─────────────────────────────────────────────────────────────────────────
  function _school(reduced) {
    var shieldPath = 'M12,8 L28,8 L28,22 C28,29 20,33 20,33 C20,33 12,29 12,22 Z';
    if (reduced) {
      return '<svg viewBox="0 0 120 60" width="120" height="60">' +
        '<path d="' + shieldPath + '" fill="' + G + '" opacity=".9"/>' +
        '<circle cx="96" cy="30" r="12" fill="' + G + '" opacity=".9"' +
          ' style="transform-box:fill-box;transform-origin:center;transform:rotate(2deg)"/>' +
        '<line x1="36" y1="46" x2="108" y2="46" stroke="' + G + '" stroke-width="2"/>' +
        '</svg>';
    }
    return '<svg viewBox="0 0 120 60" width="120" height="60">' +
      // Schild — fade-in 200ms
      '<path d="' + shieldPath + '" fill="' + G + '" opacity="0"' +
        ' style="animation:mc-fade09 200ms ease-out forwards"/>' +
      // Persoon cirkel — fade-in + 2° tilt, delay 100ms
      '<circle cx="96" cy="30" r="12" fill="' + G + '" opacity="0"' +
        ' style="transform-box:fill-box;transform-origin:center;animation:mc-tilt-in 200ms ease-out 100ms forwards"/>' +
      // Dotted lijn — dashoffset 250ms, delay 300ms, daarna fade-out op 600ms
      '<line x1="36" y1="46" x2="108" y2="46" stroke="' + G + '" stroke-width="2"' +
        ' stroke-dasharray="4 4" stroke-dashoffset="72"' +
        ' style="animation:mc-dash72 250ms ease-out 300ms forwards,mc-dot-out 1ms 600ms forwards"/>' +
      // Solid lijn — dashoffset 150ms, delay 550ms (morph na dotted)
      '<line x1="36" y1="46" x2="108" y2="46" stroke="' + G + '" stroke-width="2"' +
        ' stroke-dasharray="72" stroke-dashoffset="72"' +
        ' style="animation:mc-dash72 150ms ease-out 550ms forwards"/>' +
      '</svg>';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Variant C — Bedrijf (1100 ms)
  // Cards drift-in, briefje vouwt open, drie lijnen, check-mark pop
  // ─────────────────────────────────────────────────────────────────────────
  function _bedrijf(reduced) {
    var checkMark =
      '<circle cx="130" cy="48" r="8" fill="' + G + '"/>' +
      '<polyline points="126,48 129,51 134,45" fill="none" stroke="#fff"' +
        ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';

    if (reduced) {
      return '<svg viewBox="0 0 160 70" width="160" height="70">' +
        '<rect x="4" y="16" width="52" height="38" rx="4" fill="none" stroke="' + G + '" stroke-width="2"/>' +
        '<rect x="104" y="16" width="52" height="38" rx="4" fill="none" stroke="' + G + '" stroke-width="2"/>' +
        '<rect x="60" y="20" width="40" height="30" rx="3" fill="#f0faf5" stroke="' + G + '" stroke-width="1.5"/>' +
        '<line x1="66" y1="30" x2="94" y2="30" stroke="' + G + '" stroke-width="1.5"/>' +
        '<line x1="66" y1="36" x2="94" y2="36" stroke="' + G + '" stroke-width="1.5"/>' +
        '<line x1="66" y1="42" x2="94" y2="42" stroke="' + G + '" stroke-width="1.5"/>' +
        '<g>' + checkMark + '</g>' +
        '</svg>';
    }
    return '<svg viewBox="0 0 160 70" width="160" height="70">' +
      // Linker card — drift-in vanuit links 300ms
      '<rect x="4" y="16" width="52" height="38" rx="4" fill="none" stroke="' + G + '" stroke-width="2" opacity="0"' +
        ' style="animation:mc-drift-l 300ms ease-out forwards"/>' +
      // Rechter card — drift-in vanuit rechts 300ms
      '<rect x="104" y="16" width="52" height="38" rx="4" fill="none" stroke="' + G + '" stroke-width="2" opacity="0"' +
        ' style="animation:mc-drift-r 300ms ease-out forwards"/>' +
      // Briefje ontvouwt — scaleY 400ms ease-in-out, delay 300ms
      '<g style="transform-origin:80px 35px;transform:scaleY(0);animation:mc-unfold 400ms ease-in-out 300ms forwards">' +
        '<rect x="60" y="20" width="40" height="30" rx="3" fill="#f0faf5" stroke="' + G + '" stroke-width="1.5"/>' +
        // Drie tekstlijnen — pulse-in 200ms gespreid, 50ms tussenpoos
        '<line x1="66" y1="30" x2="94" y2="30" stroke="' + G + '" stroke-width="1.5" opacity="0"' +
          ' style="animation:mc-line-in 200ms 700ms forwards"/>' +
        '<line x1="66" y1="36" x2="94" y2="36" stroke="' + G + '" stroke-width="1.5" opacity="0"' +
          ' style="animation:mc-line-in 200ms 750ms forwards"/>' +
        '<line x1="66" y1="42" x2="94" y2="42" stroke="' + G + '" stroke-width="1.5" opacity="0"' +
          ' style="animation:mc-line-in 200ms 800ms forwards"/>' +
      '</g>' +
      // Check — scale pop 200ms cubic-bezier overshoot, delay 900ms
      '<g style="transform-box:fill-box;transform-origin:130px 48px;transform:scale(0);' +
        'animation:mc-check-pop 200ms cubic-bezier(0.34,1.56,0.64,1) 900ms forwards">' +
        checkMark +
      '</g>' +
      '</svg>';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Variant D — Internship completion BOL (1200 ms)
  // Zegel zwaait in van boven, micro-shake, aura fade-out
  // ─────────────────────────────────────────────────────────────────────────
  var _iconMap = {
    theory:    '<text x="50" y="57" text-anchor="middle" font-size="22" fill="#fff">📖</text>',
    technical: '<text x="50" y="57" text-anchor="middle" font-size="22" fill="#fff">🔧</text>',
    creative:  '<text x="50" y="57" text-anchor="middle" font-size="22" fill="#fff">🎨</text>',
  };

  function _completionBol(reduced, categoryIcon) {
    var icon = _iconMap[categoryIcon] || _iconMap.theory;
    var seal = '<circle cx="50" cy="50" r="36" fill="' + G + '"/>' + icon;

    if (reduced) {
      return '<svg viewBox="0 0 100 100" width="100" height="100">' +
        '<circle cx="50" cy="50" r="36" fill="' + G + '"/>' + icon +
        '</svg>';
    }
    return '<svg viewBox="0 0 100 100" width="100" height="100">' +
      // Aura — verschijnt op 500ms, fade-out 600ms
      '<circle cx="50" cy="50" r="38" fill="none" stroke="' + O + '" stroke-width="3" opacity="0"' +
        ' style="transform-box:fill-box;transform-origin:center;' +
        'animation:mc-aura-out 600ms ease-out 500ms forwards"/>' +
      // Zegel — zwaai-in 650ms cubic-bezier stamp-curve
      '<g style="transform-box:fill-box;transform-origin:50px 50px;' +
        'animation:mc-seal-swing 650ms cubic-bezier(0.55,0.085,0.68,0.53) forwards">' +
        seal +
      '</g>' +
      '</svg>';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Variant E — BBL traject completion (1400 ms)
  // Tijdlijn vult links→rechts, drie markers flikkeren, chevron verschijnt
  // ─────────────────────────────────────────────────────────────────────────
  function _completionBbl(reduced) {
    if (reduced) {
      return '<svg viewBox="0 0 200 60" width="200" height="60">' +
        '<line x1="10" y1="26" x2="190" y2="26" stroke="' + G + '" stroke-width="4"/>' +
        '<circle cx="64" cy="26" r="5" fill="' + O + '"/>' +
        '<circle cx="118" cy="26" r="5" fill="' + O + '"/>' +
        '<circle cx="172" cy="26" r="5" fill="' + O + '"/>' +
        '<polyline points="154,20 160,26 154,32" fill="none" stroke="' + G + '" stroke-width="2.5" stroke-linecap="round"/>' +
        '<text x="145" y="50" font-size="8" fill="' + G + '" font-family="sans-serif" letter-spacing="1">VOLTOOID</text>' +
        '</svg>';
    }
    return '<svg viewBox="0 0 200 60" width="200" height="60">' +
      // Basis-lijn grijs
      '<line x1="10" y1="26" x2="190" y2="26" stroke="#e2e8f0" stroke-width="4"/>' +
      // Groene fill-lijn — dashoffset 180px, fill 1000ms ease-out
      '<line x1="10" y1="26" x2="190" y2="26" stroke="' + G + '" stroke-width="4"' +
        ' stroke-dasharray="180" stroke-dashoffset="180"' +
        ' style="animation:mc-line180 1000ms ease-out forwards"/>' +
      // Marker 1 — 30% van 1000ms = 300ms
      '<circle cx="64" cy="26" r="5" fill="' + O + '" opacity="0"' +
        ' style="animation:mc-marker-flash 200ms 300ms forwards"/>' +
      // Marker 2 — 60% = 600ms
      '<circle cx="118" cy="26" r="5" fill="' + O + '" opacity="0"' +
        ' style="animation:mc-marker-flash 200ms 600ms forwards"/>' +
      // Marker 3 — 95% = 950ms
      '<circle cx="172" cy="26" r="5" fill="' + O + '" opacity="0"' +
        ' style="animation:mc-marker-flash 200ms 950ms forwards"/>' +
      // Chevron + tekst — 300ms, delay 1100ms
      '<g style="transform-box:fill-box;transform-origin:157px 26px;transform:scale(0);opacity:0;' +
        'animation:mc-chevron-in 300ms ease-out 1100ms forwards">' +
        '<polyline points="154,20 160,26 154,32" fill="none" stroke="' + G + '" stroke-width="2.5" stroke-linecap="round"/>' +
        '<text x="145" y="50" font-size="8" fill="' + G + '" font-family="sans-serif" letter-spacing="1">VOLTOOID</text>' +
      '</g>' +
      '</svg>';
  }

  // ── Renderers register ────────────────────────────────────────────────────
  var RENDERERS = {
    'buddy':          function (o) { return _buddy(o.reduced); },
    'school':         function (o) { return _school(o.reduced); },
    'bedrijf':        function (o) { return _bedrijf(o.reduced); },
    'completion-bol': function (o) { return _completionBol(o.reduced, o.categoryIcon); },
    'completion-bbl': function (o) { return _completionBbl(o.reduced); },
  };

  var DURATIONS = {
    'buddy': 900, 'school': 800, 'bedrijf': 1100,
    'completion-bol': 1200, 'completion-bbl': 1400,
  };

  // ── Main: celebrate() ─────────────────────────────────────────────────────
  function celebrate(opts) {
    var type         = opts && opts.type;
    var targetEl     = opts && opts.targetEl;
    var withSound    = opts && opts.sound === true;
    var categoryIcon = (opts && opts.categoryIcon) || null;

    if (!RENDERERS[type]) {
      console.error('[match-celebrate] onbekend type:', type,
        '— geldig: buddy, school, bedrijf, completion-bol, completion-bbl');
      return;
    }
    if (!targetEl || !targetEl.isConnected) {
      console.error('[match-celebrate] targetEl ontbreekt of niet in DOM');
      return;
    }

    _injectCSS();
    _announce('Match bevestigd met ' + type);

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      var root = _mkRoot(targetEl);
      root.innerHTML = RENDERERS[type]({ reduced: true, categoryIcon: categoryIcon });
      return; // eindstaat, geen cleanup — element blijft als statisch bevestiging
    }

    if (withSound && window.Internly.animations.soundEnabled) {
      _playSound(type);
    }

    var root = _mkRoot(targetEl);
    root.style.willChange = 'transform, opacity';
    root.innerHTML = RENDERERS[type]({ reduced: false, categoryIcon: categoryIcon });

    var dur = DURATIONS[type];
    setTimeout(function () {
      root.style.willChange = '';
      if (root.parentNode) root.remove();
    }, dur + 120);
  }

  // ── Publieke API ──────────────────────────────────────────────────────────
  window.Internly = window.Internly || {};
  window.Internly.animations = {
    celebrate: celebrate,
    soundEnabled: false,
  };

  // ── Self-test (IIFE bij parse) ────────────────────────────────────────────
  (function _selfTest() {
    var types = ['buddy', 'school', 'bedrijf', 'completion-bol', 'completion-bbl'];
    var fail = false;

    // 1. Alle renderers aanwezig?
    types.forEach(function (t) {
      if (!RENDERERS[t]) {
        console.error('[match-celebrate] self-test FAIL: renderer ontbreekt voor type "' + t + '"');
        fail = true;
      }
    });

    // 2. Renderers crashen niet in reduced én motion modus?
    types.forEach(function (t) {
      ['reduced', 'motion'].forEach(function (mode) {
        try {
          RENDERERS[t]({ reduced: mode === 'reduced', categoryIcon: 'theory' });
        } catch (e) {
          console.error('[match-celebrate] self-test FAIL: renderer crash "' + t + '" (' + mode + '):', e.message);
          fail = true;
        }
      });
    });

    // 3. matchMedia beschikbaar?
    if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
      console.error('[match-celebrate] self-test WARN: matchMedia niet beschikbaar in deze omgeving');
    }

    // 4. API correct geëxporteerd?
    if (!window.Internly || typeof window.Internly.animations.celebrate !== 'function') {
      console.error('[match-celebrate] self-test FAIL: window.Internly.animations.celebrate niet beschikbaar');
      fail = true;
    }

    if (!fail && window.__INTERNLY_DEBUG) {
      console.log('[match-celebrate] self-test OK — 5 renderers, reduced + motion modes getest');
    }
  }());

}());
