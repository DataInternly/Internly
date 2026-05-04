// ============================================================
// INTERNLY — AVATAR MODULE
// File: js/avatar.js
// Datum: 30 april 2026
//
// Doel: een gedeelde 14-avatar selector + display-helper
// die op alle profielpagina's gebruikt kan worden.
//
// Globale exports (window):
//   INTERNLY_AVATARS       — array van avatar-definities
//   renderAvatarPicker()   — rendert picker UI in container
//   getAvatarSvg()         — returnt SVG-markup voor display
//   _internlyAvatarKey     — runtime-state, globale geselecteerde key
//
// DB-koppeling:
//   profile-tabellen krijgen kolom avatar_key (text).
//   Als migratie nog niet draait: save als null, fallback initials.
// ============================================================

// ── 14 vaste avatars — geometrisch, brand-palette ───────────
// Brand: groen #0f5c36/#1a7a48, oranje #FF7E42/#e05c1a,
//        beige #f4f3ef/#faf7f3, ink #0d1520
const INTERNLY_AVATARS = [
  { key: 'a01', label: 'Groen golf',        bg: '#1a7a48', fg: '#e8f5ee', shape: 'wave'    },
  { key: 'a02', label: 'Diepgroen ster',    bg: '#0f5c36', fg: '#e8f5ee', shape: 'star'    },
  { key: 'a03', label: 'Oranje cirkel',     bg: '#FF7E42', fg: '#fff7f0', shape: 'circle'  },
  { key: 'a04', label: 'Diep oranje vlam',  bg: '#e05c1a', fg: '#fff7f0', shape: 'flame'   },
  { key: 'a05', label: 'Beige driehoek',    bg: '#f4f3ef', fg: '#0d1520', shape: 'tri'     },
  { key: 'a06', label: 'Crème vierkant',    bg: '#faf7f3', fg: '#0d1520', shape: 'square'  },
  { key: 'a07', label: 'Inkt diamant',      bg: '#0d1520', fg: '#FF7E42', shape: 'diamond' },
  { key: 'a08', label: 'Groen blad',        bg: '#1a7a48', fg: '#fff7f0', shape: 'leaf'    },
  { key: 'a09', label: 'Oranje boog',       bg: '#FF7E42', fg: '#0d1520', shape: 'arc'     },
  { key: 'a10', label: 'Groen-oranje duo',  bg: '#1a7a48', fg: '#FF7E42', shape: 'duo'     },
  { key: 'a11', label: 'Beige hart',        bg: '#f4f3ef', fg: '#e05c1a', shape: 'heart'   },
  { key: 'a12', label: 'Groen zigzag',      bg: '#0f5c36', fg: '#FF7E42', shape: 'zigzag'  },
  { key: 'a13', label: 'Oranje zon',        bg: '#FF7E42', fg: '#0f5c36', shape: 'sun'     },
  { key: 'a14', label: 'Inkt cirkel',       bg: '#0d1520', fg: '#f4f3ef', shape: 'ring'    }
];

window.INTERNLY_AVATARS = INTERNLY_AVATARS;

// ── Shape paths — 32×32 viewBox ─────────────────────────────
function _shapePath(shape, fg) {
  const f = `fill="${fg}"`;
  switch (shape) {
    case 'wave':    return `<path ${f} d="M4 20 Q10 10 16 18 Q22 26 28 16 L28 28 L4 28 Z"/>`;
    case 'star':    return `<path ${f} d="M16 6 L19 13 L26 14 L21 19 L22 26 L16 23 L10 26 L11 19 L6 14 L13 13 Z"/>`;
    case 'circle':  return `<circle ${f} cx="16" cy="16" r="8"/>`;
    case 'flame':   return `<path ${f} d="M16 6 Q22 14 18 18 Q22 22 16 26 Q10 22 14 18 Q10 14 16 6 Z"/>`;
    case 'tri':     return `<path ${f} d="M16 8 L26 24 L6 24 Z"/>`;
    case 'square':  return `<rect ${f} x="8" y="8" width="16" height="16" rx="3"/>`;
    case 'diamond': return `<path ${f} d="M16 6 L26 16 L16 26 L6 16 Z"/>`;
    case 'leaf':    return `<path ${f} d="M16 6 Q26 12 22 22 Q12 26 8 16 Q10 8 16 6 Z"/>`;
    case 'arc':     return `<path ${f} d="M6 22 Q16 6 26 22 L22 22 Q16 12 10 22 Z"/>`;
    case 'duo':     return `<circle ${f} cx="12" cy="16" r="6"/><circle fill="${fg === '#FF7E42' ? '#FF7E42' : fg}" cx="20" cy="16" r="6" opacity=".7"/>`;
    case 'heart':   return `<path ${f} d="M16 24 C8 18 6 12 10 9 C13 7 16 10 16 13 C16 10 19 7 22 9 C26 12 24 18 16 24 Z"/>`;
    case 'zigzag':  return `<path ${f} d="M6 12 L12 18 L18 12 L24 18 L26 16 L26 22 L6 22 Z"/>`;
    case 'sun':     return `<circle ${f} cx="16" cy="16" r="5"/><g ${f}><rect x="15" y="4"  width="2" height="4" rx="1"/><rect x="15" y="24" width="2" height="4" rx="1"/><rect x="4"  y="15" width="4" height="2" rx="1"/><rect x="24" y="15" width="4" height="2" rx="1"/></g>`;
    case 'ring':    return `<circle cx="16" cy="16" r="10" stroke="${fg}" stroke-width="3" fill="none"/>`;
    default:        return `<circle ${f} cx="16" cy="16" r="6"/>`;
  }
}

// ── Public: getAvatarSvg(key, fallbackName, size) ───────────
// size: 'sm' (28), 'md' (44), 'lg' (72)
function getAvatarSvg(key, fallbackName, size) {
  const av = INTERNLY_AVATARS.find(a => a.key === key);
  const px = size === 'sm' ? 28 : size === 'lg' ? 72 : 44;
  if (!av) {
    const init = (fallbackName || '?').slice(0, 2).toUpperCase();
    return `<div style="width:${px}px;height:${px}px;border-radius:50%;background:#e8f5ee;color:#1a7a48;display:flex;align-items:center;justify-content:center;font-size:${px*0.36}px;font-weight:600;font-family:'Outfit',sans-serif">${init.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[c])}</div>`;
  }
  return `<svg width="${px}" height="${px}" viewBox="0 0 32 32" style="display:block;background:${av.bg};border-radius:50%" aria-label="${av.label}">${_shapePath(av.shape, av.fg)}</svg>`;
}

window.getAvatarSvg = getAvatarSvg;

// ── Picker CSS injection ────────────────────────────────────
function _injectAvatarCSS() {
  if (document.getElementById('avatar-css')) return;
  const s = document.createElement('style');
  s.id = 'avatar-css';
  s.textContent = `
.av-picker{background:#fff;border:1px solid rgba(13,21,32,.09);border-radius:10px;padding:.85rem 1rem;margin-bottom:.85rem;}
.av-picker-label{font-size:.78rem;font-weight:600;color:#3a4455;margin-bottom:.55rem;display:block;}
.av-picker-grid{display:flex;flex-wrap:wrap;gap:.55rem;}
.av-picker-btn{width:44px;height:44px;border-radius:50%;border:2.5px solid transparent;padding:0;cursor:pointer;background:transparent;transition:transform .12s,border-color .15s;display:flex;align-items:center;justify-content:center;}
.av-picker-btn:hover{transform:scale(1.06);}
.av-picker-btn.selected{border-color:#FF7E42;box-shadow:0 0 0 3px rgba(255,126,66,.18);}
.av-picker-btn svg{width:38px;height:38px;}
.av-picker-clear{background:transparent;border:1px dashed rgba(13,21,32,.2);color:#7a8799;font-size:.74rem;padding:.35rem .7rem;border-radius:6px;cursor:pointer;margin-top:.55rem;font-family:'Outfit',sans-serif;}
.av-picker-clear:hover{color:#0d1520;border-color:rgba(13,21,32,.45);}
@media(prefers-reduced-motion:reduce){.av-picker-btn{transition:none!important;}}
  `;
  document.head.appendChild(s);
}

// ── Public: renderAvatarPicker(containerId, currentKey, onChange) ──
function renderAvatarPicker(containerId, currentKey, onChange) {
  _injectAvatarCSS();
  const c = document.getElementById(containerId);
  if (!c) return;

  let selected = currentKey || null;
  window._internlyAvatarKey = selected;

  function paint() {
    c.innerHTML = `
      <div class="av-picker">
        <span class="av-picker-label">Kies een avatar (optioneel)</span>
        <div class="av-picker-grid" id="${containerId}-grid">
          ${INTERNLY_AVATARS.map(av => `
            <button type="button"
                    class="av-picker-btn${av.key === selected ? ' selected' : ''}"
                    data-key="${av.key}"
                    title="${av.label}"
                    aria-label="${av.label}"
                    aria-pressed="${av.key === selected ? 'true' : 'false'}">
              ${getAvatarSvg(av.key, '', 'md')}
            </button>`).join('')}
        </div>
        ${selected ? `<button type="button" class="av-picker-clear" data-clear="1">Geen avatar (gebruik initialen)</button>` : ''}
      </div>`;

    c.querySelectorAll('.av-picker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selected = btn.dataset.key;
        window._internlyAvatarKey = selected;
        if (typeof onChange === 'function') onChange(selected);
        paint();
      });
    });
    const clearBtn = c.querySelector('[data-clear="1"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        selected = null;
        window._internlyAvatarKey = null;
        if (typeof onChange === 'function') onChange(null);
        paint();
      });
    }
  }

  paint();
}

window.renderAvatarPicker = renderAvatarPicker;
window._internlyAvatarKey = null;
