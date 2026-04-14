/* info.js — Contextual help popovers for Internly
   Usage: <span class="info-btn" onclick="toggleInfoPop(this,event)" role="button" tabindex="0" aria-label="Meer informatie">ⓘ
            <span class="info-pop">Help text here.</span>
          </span>
*/
(function (win) {
  'use strict';

  var active = null;

  function close() {
    if (active) { active.classList.remove('info-open'); active = null; }
  }

  function position(trigger, pop) {
    var rect = trigger.getBoundingClientRect();
    var vw   = window.innerWidth;
    var vh   = window.innerHeight;

    pop.style.top    = '';
    pop.style.bottom = '';
    pop.style.left   = '';
    pop.style.right  = '';

    // Horizontal: open rightward unless near right edge
    if (rect.right + 248 > vw - 16) {
      pop.style.right = '0';
    } else {
      pop.style.left = '0';
    }

    // Vertical: open below unless near bottom
    if (rect.bottom + 140 > vh) {
      pop.style.bottom = 'calc(100% + 6px)';
    } else {
      pop.style.top = 'calc(100% + 6px)';
    }
  }

  win.toggleInfoPop = function (trigger, event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    var pop = trigger.querySelector('.info-pop');
    if (!pop) return;
    if (pop === active) { close(); return; }
    close();
    position(trigger, pop);
    pop.classList.add('info-open');
    active = pop;
  };

  document.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  // Keyboard activation for role="button" spans
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('info-btn')) {
      toggleInfoPop(e.target, e);
    }
  });
}(window));
