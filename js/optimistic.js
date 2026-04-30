/* ============================================================
   Internly Optimistic UI Module v1.0
   Vereist: toast.js (window.toast)
   ============================================================ */

(function () {
  'use strict';

  // optimistic.hideEl(el) — slide-out animatie, retourneert restore-functie
  function hideEl(el) {
    if (!el) return () => {};
    el.style.transition = 'opacity .28s ease, transform .28s ease';
    el.style.opacity    = '0';
    el.style.transform  = 'translateX(-10px)';
    return function restore() {
      el.style.opacity   = '1';
      el.style.transform = '';
      el.classList.add('undo-flash');
    };
  }

  // optimistic.do(label, dbFn, undoFn?, opts?)
  //   label   — tekst voor de success/undo toast
  //   dbFn    — async function → { error } (Supabase-stijl)
  //   undoFn  — async function die de actie terugdraait, of null
  //   opts    — { undoDuration: 7000, retryFn }
  async function doAction(label, dbFn, undoFn, opts = {}) {
    const { undoDuration = 7000, retryFn } = opts;
    try {
      const { error } = await dbFn();
      if (error) {
        console.error('[optimistic] DB fout:', error?.message || error);
        toast.error('Actie mislukt — probeer het opnieuw', retryFn || null);
        return false;
      }
    } catch (err) {
      console.error('[optimistic] onverwachte fout:', err?.message || err);
      toast.error('Actie mislukt — probeer het opnieuw', retryFn || null);
      return false;
    }

    if (typeof undoFn === 'function') {
      toast.successUndoable(label, undoFn, { duration: undoDuration });
    } else {
      toast.success(label);
    }
    return true;
  }

  window.optimistic = { do: doAction, hideEl };
})();
