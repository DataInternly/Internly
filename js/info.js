/* info.js — Contextual help popovers for Internly
   Usage: <span class="info-btn" onclick="toggleInfoPop(this,event)" role="button" tabindex="0" aria-label="Meer informatie">ⓘ
            <span class="info-pop">Help text here.</span>
          </span>

   The popover uses position:fixed so it is never clipped by overflow:auto
   containers (e.g. the sidebar). Coordinates are computed from
   getBoundingClientRect() on every open.

   Click inside the open popover is stopped at the .info-pop level so it
   never reaches .info-btn's onclick — the user can read the text without
   accidentally closing it.
*/
(function (win) {
  'use strict';

  var active = null;
  var POP_W  = 240;   // must match CSS width
  var GAP    = 6;     // px gap between trigger and popover

  function close() {
    if (active) { active.classList.remove('info-open'); active = null; }
  }

  function position(trigger, pop) {
    var rect = trigger.getBoundingClientRect();
    var vw   = window.innerWidth;
    var vh   = window.innerHeight;
    var pad  = 12; // minimum distance from viewport edges

    pop.style.top    = '';
    pop.style.bottom = '';
    pop.style.left   = '';
    pop.style.right  = '';

    // ── Horizontal ────────────────────────────────────────────────────────
    // Left-align to trigger; shift left if it would overflow the right edge.
    var leftCandidate = rect.left;
    if (leftCandidate + POP_W + pad > vw) {
      leftCandidate = vw - POP_W - pad;
    }
    pop.style.left = Math.max(pad, leftCandidate) + 'px';

    // ── Vertical ──────────────────────────────────────────────────────────
    // Open below trigger by default; flip above if too close to the bottom.
    // aboveBottom = distance from viewport bottom so the popover sits GAP px
    // above the trigger top: vh - (rect.top - GAP) = vh - rect.top + GAP
    var belowTop    = rect.bottom + GAP;
    var aboveBottom = vh - rect.top + GAP;
    var estH        = 160; // safe upper bound for wrapped text at 240px wide

    if (belowTop + estH > vh - pad) {
      pop.style.bottom = aboveBottom + 'px';
    } else {
      pop.style.top = belowTop + 'px';
    }
  }

  win.toggleInfoPop = function (trigger, event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    var pop = trigger.querySelector('.info-pop');
    if (!pop) return;
    if (pop.classList.contains('info-open')) { close(); return; }
    close();
    position(trigger, pop);
    pop.classList.add('info-open');
    active = pop;
  };

  // Close when clicking anywhere outside an open popover.
  // (Clicks on .info-btn are stopped by toggleInfoPop's stopPropagation
  //  so they never reach this listener.)
  document.addEventListener('click', close);

  // ── Keep popover open when user clicks INSIDE it ─────────────────────────
  // .info-pop is a child of .info-btn.  Without this, a click inside the
  // popover would bubble to .info-btn's onclick → toggleInfoPop → close.
  // We stop propagation at the .info-pop level so the user can read the text.
  // All six .info-pop elements are in the static sidebar HTML (never re-rendered),
  // so querySelectorAll at script-load time (bottom of <body>) is safe.
  document.querySelectorAll('.info-pop').forEach(function (pop) {
    pop.addEventListener('click', function (e) { e.stopPropagation(); });
  });

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  // Keyboard activation for role="button" spans
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('info-btn')) {
      toggleInfoPop(e.target, e);
    }
  });
}(window));
