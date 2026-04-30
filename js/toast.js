/* ============================================================
   Internly Toast Module v1.0
   API: toast.success / successUndoable / info / warning / error
   Vereist: geen (self-contained, werkt zonder utils.js)
   Geladen: na supabase.js, vóór telemetry.js
   ============================================================ */

(function () {
  'use strict';

  const MAX_CONCURRENT = 3;
  const DEFAULTS = {
    success:         { bg: '#1a7a48', icon: '✓', duration: 3200, priority: 'polite'    },
    successUndoable: { bg: '#3a4455', icon: '↶', duration: 7000, priority: 'polite'    },
    info:            { bg: '#1756a8', icon: 'ℹ', duration: 4000, priority: 'polite'    },
    warning:         { bg: '#a06010', icon: '⚠', duration: 5000, priority: 'polite'    },
    error:           { bg: '#b82020', icon: '✕', duration: 0,    priority: 'assertive' },
  };

  // ── Container ──────────────────────────────────────────────────────────────
  let _container = null;

  function _ensureContainer() {
    if (_container) return _container;
    _container = document.createElement('div');
    _container.id = '_iToastStack';
    _container.setAttribute('aria-live', 'polite');
    _container.setAttribute('aria-atomic', 'false');
    _container.setAttribute('role', 'status');
    document.body.appendChild(_container);

    const style = document.createElement('style');
    style.textContent = `
      #_iToastStack {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column-reverse;
        gap: 8px;
        z-index: 9990;
        pointer-events: none;
        width: max-content;
        max-width: min(92vw, 420px);
      }
      ._iToast {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 18px;
        border-radius: 12px;
        color: #fff;
        font-family: 'Outfit', sans-serif;
        font-size: .9rem;
        font-weight: 500;
        box-shadow: 0 10px 30px rgba(0,0,0,.25);
        pointer-events: auto;
        opacity: 0;
        transform: translateY(12px);
        transition: opacity .2s ease-out, transform .2s ease-out;
        min-width: 220px;
      }
      ._iToast._iToastVisible {
        opacity: 1;
        transform: translateY(0);
      }
      ._iToast._iToastHiding {
        opacity: 0;
        transform: translateY(8px);
        transition: opacity .15s ease-in, transform .15s ease-in;
      }
      ._iToast ._iToastMsg {
        flex: 1;
      }
      ._iToast button {
        background: rgba(255,255,255,.2);
        border: none;
        border-radius: 6px;
        color: #fff;
        font-family: inherit;
        font-size: .82rem;
        font-weight: 600;
        padding: 4px 10px;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
      }
      ._iToast button:hover { background: rgba(255,255,255,.35); }
      @media (prefers-reduced-motion: reduce) {
        ._iToast { transition: opacity .1s; transform: none !important; }
        ._iToast._iToastHiding { transition: opacity .1s; }
      }
      @keyframes _iUndoFlash {
        0%   { background-color: rgba(26, 122, 72, 0.18); }
        100% { background-color: transparent; }
      }
      .undo-flash {
        animation: _iUndoFlash 1.5s ease-out;
      }
      @media (prefers-reduced-motion: reduce) {
        .undo-flash { animation: none; }
      }
    `;
    document.head.appendChild(style);
    return _container;
  }

  // ── Core show ─────────────────────────────────────────────────────────────
  function _show(type, message, { undoFn, retryFn, duration, ariaPriority } = {}) {
    const cfg = DEFAULTS[type] || DEFAULTS.info;
    const dur = duration ?? cfg.duration;
    const prio = ariaPriority || cfg.priority;

    const container = _ensureContainer();

    // Enforce max concurrent — remove oldest
    const existing = container.querySelectorAll('._iToast');
    if (existing.length >= MAX_CONCURRENT) {
      _remove(existing[existing.length - 1]);
    }

    const el = document.createElement('div');
    el.className = '_iToast';
    el.style.background = cfg.bg;
    el.setAttribute('role', prio === 'assertive' ? 'alert' : 'status');
    el.setAttribute('aria-live', prio);
    el.setAttribute('aria-atomic', 'true');

    const msgEl = document.createElement('span');
    msgEl.className = '_iToastMsg';
    msgEl.textContent = cfg.icon + ' ' + message;
    el.appendChild(msgEl);

    let undoTimer = null;

    if (type === 'successUndoable' && typeof undoFn === 'function') {
      const undoBtn = document.createElement('button');
      undoBtn.textContent = 'Ongedaan maken';
      undoBtn.setAttribute('aria-label', 'Ongedaan maken: ' + message);
      undoBtn.onclick = function () {
        if (undoTimer) clearTimeout(undoTimer);
        _remove(el);
        undoFn();
      };
      el.appendChild(undoBtn);
    }

    if (type === 'error' || type === 'warning') {
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Sluiten';
      closeBtn.setAttribute('aria-label', 'Melding sluiten');
      closeBtn.onclick = function () {
        if (undoTimer) clearTimeout(undoTimer);
        _remove(el);
      };
      el.appendChild(closeBtn);

      if (typeof retryFn === 'function') {
        const retryBtn = document.createElement('button');
        retryBtn.textContent = 'Opnieuw';
        retryBtn.setAttribute('aria-label', 'Opnieuw proberen');
        retryBtn.onclick = function () {
          if (undoTimer) clearTimeout(undoTimer);
          _remove(el);
          retryFn();
        };
        el.insertBefore(retryBtn, closeBtn);
      }
    }

    container.insertBefore(el, container.firstChild);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('_iToastVisible'));
    });

    // Auto-dismiss (duration === 0 means persistent)
    if (dur > 0) {
      undoTimer = setTimeout(() => _remove(el), dur);
    }

    return el;
  }

  function _remove(el) {
    if (!el || !el.parentNode) return;
    el.classList.add('_iToastHiding');
    el.classList.remove('_iToastVisible');
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 160);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  const toast = {
    success(message, opts)                    { return _show('success', message, opts || {}); },
    successUndoable(message, undoFn, opts)    { return _show('successUndoable', message, Object.assign({}, opts, { undoFn })); },
    info(message, opts)                       { return _show('info', message, opts || {}); },
    warning(message, retryFn, opts)           { return _show('warning', message, Object.assign({}, opts, { retryFn })); },
    error(message, retryFn, opts)             { return _show('error', message, Object.assign({}, opts, { retryFn })); },
  };

  window.toast = toast;
})();
