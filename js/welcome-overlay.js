// ── js/welcome-overlay.js ────────────────────────────
// Internly Welkom Overlay
// Verschijnt eenmalig per user na eerste login
// Flag: localStorage.internly_welcomed_<userId>
// Role gelezen uit DB — nooit uit URL-param
// Geen wijzigingen aan auth.html / roles.js / utils.js
// 1 mei 2026
// ─────────────────────────────────────────────────────

'use strict';

const _WC = {
  student: {
    emoji: '👋',
    heading: 'Goed dat je er bent',
    sub: 'Vind een stage die bij jou past. Jouw Trust Score-beschermde matchpool staat klaar.',
    btn: '#0d1520',
    actions: [
      { icon: '🔍', bg: '#e8f5ee', color: '#1a7a48',
        label: 'Vacatures ontdekken',
        sub: 'Browse stages op Trust Score',
        href: 'discover.html' },
      { icon: '👤', bg: '#e8f5ee', color: '#1a7a48',
        label: 'Profiel aanvullen',
        sub: 'Vergroot je kans op een match',
        href: 'student-profile.html' },
      { icon: '📋', bg: '#fdf0e8', color: '#e05c1a',
        label: 'Mijn sollicitaties',
        sub: 'Bekijk reacties van bedrijven',
        href: 'mijn-sollicitaties.html' }
    ],
    features: [
      { icon: '💬', bg: '#e8f0fc', color: '#1756a8',
        label: 'Berichten', href: 'mijn-berichten.html' },
      { icon: '💜', bg: '#ede9fe', color: '#7c3aed',
        label: 'Zoek een buddy', href: 'student-profile.html' },
      { icon: '📊', bg: '#e8f5ee', color: '#1a7a48',
        label: 'Stage Hub', href: 'match-dashboard.html' },
      { icon: '⭐', bg: '#fdf3e0', color: '#a06010',
        label: 'Beoordeel bedrijf', href: 'review-form.html' }
    ]
  },
  student_bbl: {
    emoji: '🔧',
    heading: 'Welkom BBL-student',
    sub: 'Combineer werk en leren. Jouw leerbedrijf en school werken samen via de Stage Hub.',
    btn: '#0d1520',
    actions: [
      { icon: '📊', bg: '#e8f5ee', color: '#1a7a48',
        label: 'Stage Hub',
        sub: 'Volg je voortgang en mijlpalen',
        href: 'bbl-hub.html' },
      { icon: '👤', bg: '#e8f5ee', color: '#1a7a48',
        label: 'Profiel aanvullen',
        sub: 'Stel je BBL-contract in',
        href: 'bbl-profile.html' },
      { icon: '💬', bg: '#e8f0fc', color: '#1756a8',
        label: 'Berichten',
        sub: 'Chat met begeleider en school',
        href: 'mijn-berichten.html' }
    ],
    features: [
      { icon: '📅', bg: '#fdf3e0', color: '#a06010',
        label: 'Beschikbaarheid', href: '#' },
      { icon: '📋', bg: '#fdf0e8', color: '#e05c1a',
        label: 'Mijn sollicitaties', href: 'mijn-sollicitaties.html' },
      { icon: '💜', bg: '#ede9fe', color: '#7c3aed',
        label: 'Zoek een buddy', href: 'student-profile.html' },
      { icon: '⭐', bg: '#fdf3e0', color: '#a06010',
        label: 'Beoordeel bedrijf', href: 'review-form.html' }
    ]
  },
  student_international: {
    emoji: '🌍',
    heading: 'Welcome, international student',
    sub: 'Your Trust Score-protected internship journey starts here. Learning Agreement support included.',
    btn: '#0d1520',
    actions: [
      { icon: '🔍', bg: '#e8f5ee', color: '#1a7a48',
        label: 'Find internships',
        sub: 'Browse with Trust Score protection',
        href: 'discover.html' },
      { icon: '📄', bg: '#e8f0fc', color: '#1756a8',
        label: 'Learning Agreement',
        sub: 'Manage your LA signing flow',
        href: 'international-student-dashboard.html' },
      { icon: '👤', bg: '#fdf0e8', color: '#e05c1a',
        label: 'My profile',
        sub: 'Complete your international profile',
        href: 'international-student-dashboard.html' }
    ],
    features: [
      { icon: '💬', bg: '#e8f5ee', color: '#1a7a48',
        label: 'Messages', href: 'mijn-berichten.html' },
      { icon: '📊', bg: '#e8f5ee', color: '#1a7a48',
        label: 'Stage Hub', href: 'match-dashboard.html' },
      { icon: '🌍', bg: '#fdf3e0', color: '#a06010',
        label: 'Internly Worldwide', href: 'internly-worldwide.html' },
      { icon: '⭐', bg: '#fdf3e0', color: '#a06010',
        label: 'Rate employer', href: 'review-form.html' }
    ]
  },
  bedrijf: {
    emoji: '🏢',
    heading: 'Welkom bij Internly',
    sub: 'Vind gemotiveerde stagiairs en bouw je reputatie op via de Trust Score.',
    btn: '#0d1520',
    actions: [
      { icon: '✓', bg: '#e8f5ee', color: '#1a7a48',
        label: 'Bedrijf verifiëren',
        sub: 'Maak vacatures zichtbaar voor studenten',
        href: 'company-dashboard.html' },
      { icon: '📌', bg: '#fdf0e8', color: '#e05c1a',
        label: 'Vacature plaatsen',
        sub: 'Bereik gemotiveerde studenten',
        href: 'company-dashboard.html' },
      { icon: '👥', bg: '#e8f0fc', color: '#1756a8',
        label: 'Studenten ontdekken',
        sub: 'Zoek proactief naar talent',
        href: 'company-discover.html' }
    ],
    features: [
      { icon: '📩', bg: '#fdf0e8', color: '#e05c1a',
        label: 'Aanmeldingen', href: 'company-dashboard.html' },
      { icon: '⭐', bg: '#e8f5ee', color: '#1a7a48',
        label: 'Trust Score', href: 'company-dashboard.html' },
      { icon: '📊', bg: '#e8f0fc', color: '#1756a8',
        label: 'Stage Hub', href: 'match-dashboard.html' },
      { icon: '💬', bg: '#e8f0fc', color: '#1756a8',
        label: 'Berichten', href: 'mijn-berichten.html' }
    ]
  },
  school: {
    emoji: '🎓',
    heading: 'Hallo, welkom bij Internly',
    sub: 'Monitor je studenten en verifieer welke bedrijven veilig zijn voor plaatsing.',
    btn: '#0d1520',
    actions: [
      { icon: '👥', bg: '#e8f5ee', color: '#1a7a48',
        label: 'Studenten bekijken',
        sub: 'Monitor voortgang per student',
        href: 'school-dashboard.html' },
      { icon: '🏢', bg: '#fdf3e0', color: '#a06010',
        label: 'Bedrijven checken',
        sub: 'Verifieer Trust Scores',
        href: 'school-dashboard.html' },
      { icon: '📊', bg: '#e8f0fc', color: '#1756a8',
        label: 'Stage Hub',
        sub: 'Bekijk het volledige stageverloop',
        href: 'match-dashboard.html' }
    ],
    features: [
      { icon: '⚠', bg: '#fdeaea', color: '#b82020',
        label: 'Signalen', href: 'school-dashboard.html' },
      { icon: '✓', bg: '#e8f5ee', color: '#1a7a48',
        label: 'Mijlpalen bevestigen', href: 'school-dashboard.html' },
      { icon: '💬', bg: '#e8f0fc', color: '#1756a8',
        label: 'Berichten', href: 'mijn-berichten.html' },
      { icon: '📈', bg: '#e8f5ee', color: '#0f5c36',
        label: 'Stagerapportage', href: 'school-dashboard.html' }
    ]
  },
  begeleider: {
    emoji: '📋',
    heading: 'Welkom, praktijkbegeleider',
    sub: 'Begeleid je studenten en volg hun voortgang via de Stage Hub.',
    btn: '#0d1520',
    actions: [
      { icon: '👥', bg: '#e8f5ee', color: '#1a7a48',
        label: 'Mijn studenten',
        sub: 'Bekijk alle studenten die je begeleidt',
        href: 'begeleider-dashboard.html' },
      { icon: '📊', bg: '#e8f0fc', color: '#1756a8',
        label: 'Stage Hub',
        sub: 'Volg de voortgang',
        href: 'match-dashboard.html' },
      { icon: '👤', bg: '#fdf0e8', color: '#e05c1a',
        label: 'Profiel invullen',
        sub: 'Stel je begeleiderssectie in',
        href: 'begeleider-dashboard.html' }
    ],
    features: [
      { icon: '📋', bg: '#e8f5ee', color: '#1a7a48',
        label: 'Stageplan', href: 'match-dashboard.html' },
      { icon: '💬', bg: '#e8f0fc', color: '#1756a8',
        label: 'Berichten', href: 'mijn-berichten.html' },
      { icon: '📅', bg: '#fdf3e0', color: '#a06010',
        label: 'Afspraken', href: 'match-dashboard.html' },
      { icon: '✓', bg: '#e8f5ee', color: '#1a7a48',
        label: 'Voortgang', href: 'match-dashboard.html' }
    ]
  },
  gepensioneerd: {
    emoji: '💜',
    heading: 'Welkom bij Internly Buddy',
    sub: 'Jouw ervaring maakt het verschil. Vind een student die jouw begeleiding kan gebruiken.',
    btn: '#7c3aed',
    actions: [
      { icon: '🎓', bg: '#ede9fe', color: '#7c3aed',
        label: 'Studenten vinden',
        sub: 'Studenten die een buddy zoeken',
        href: 'buddy-dashboard.html' },
      { icon: '💬', bg: '#ede9fe', color: '#7c3aed',
        label: 'Mijn koppelingen',
        sub: 'Actieve buddy-verbindingen',
        href: 'buddy-dashboard.html' },
      { icon: '👤', bg: '#fdf0e8', color: '#e05c1a',
        label: 'Profiel aanvullen',
        sub: 'Vertel studenten wie je bent',
        href: 'buddy-dashboard.html' }
    ],
    features: [
      { icon: '📩', bg: '#ede9fe', color: '#7c3aed',
        label: 'Aanvragen', href: 'buddy-dashboard.html' },
      { icon: '💬', bg: '#e8f0fc', color: '#1756a8',
        label: 'Berichten', href: 'mijn-berichten.html' },
      { icon: '📅', bg: '#fdf3e0', color: '#a06010',
        label: 'Beschikbaarheid', href: 'buddy-dashboard.html' },
      { icon: '⚙', bg: '#f4f3ef', color: '#7a8799',
        label: 'Instellingen', href: 'buddy-dashboard.html' }
    ]
  }
};

// ── Resolve welcome key from role + optional flags ────
function _resolveWelcomeKey(role, flags) {
  if (role === 'student') {
    if (flags && flags.bbl) return 'student_bbl';
    if (flags && flags.international) return 'student_international';
    return 'student';
  }
  return role || 'student';
}

// ── Render one action card ────────────────────────────
function _actionCard(a, userId) {
  return `<a href="${a.href}"
    onclick="if(typeof _wDismiss==='function')_wDismiss('${userId}')"
    style="display:flex;align-items:center;gap:.85rem;
    padding:.7rem .9rem;background:#faf7f3;
    border:1px solid rgba(13,21,32,.07);border-radius:10px;
    text-decoration:none;color:#0d1520;margin-bottom:7px;
    transition:background .12s">
    <div style="width:36px;height:36px;border-radius:8px;
      display:flex;align-items:center;justify-content:center;
      font-size:.95rem;flex-shrink:0;
      background:${a.bg};color:${a.color}">${a.icon}</div>
    <div style="flex:1;min-width:0">
      <div style="font-family:'Bricolage Grotesque',sans-serif;
        font-size:.88rem;font-weight:600;color:#0d1520;
        margin-bottom:2px">${a.label}</div>
      <div style="font-size:.72rem;color:#7a8799;
        line-height:1.3">${a.sub}</div>
    </div>
    <span style="color:#d4d2cc;font-size:.9rem">›</span>
  </a>`;
}

// ── Render one feature pill ───────────────────────────
function _featurePill(f, userId) {
  return `<a href="${f.href}"
    onclick="if(typeof _wDismiss==='function')_wDismiss('${userId}')"
    style="display:flex;align-items:center;gap:.6rem;
    padding:.55rem .8rem;background:#fff;
    border:1px solid rgba(13,21,32,.07);border-radius:8px;
    text-decoration:none;color:#0d1520;
    transition:background .12s">
    <div style="width:28px;height:28px;border-radius:6px;
      display:flex;align-items:center;justify-content:center;
      font-size:.8rem;flex-shrink:0;
      background:${f.bg};color:${f.color}">${f.icon}</div>
    <span style="font-size:.8rem;font-weight:500;
      color:#0d1520">${f.label}</span>
    <span style="margin-left:auto;color:#d4d2cc;
      font-size:.8rem">›</span>
  </a>`;
}

// ── Main: show overlay ────────────────────────────────
async function maybeShowWelcomeOverlay(userId, role, naam, flags) {
  if (!userId) return;

  // Check flag — localStorage persists across sessions
  const _flagKey = 'internly_welcomed_' + userId;
  if (localStorage.getItem(_flagKey)) return;

  const _key = _resolveWelcomeKey(role, flags);
  const cfg = _WC[_key];
  if (!cfg) return;

  const firstName = ((naam || '') + '').split(' ')[0] || 'daar';

  // Build overlay
  const ov = document.createElement('div');
  ov.id = 'internly-welcome-overlay';
  ov.style.cssText = [
    'position:fixed', 'inset:0',
    'background:rgba(13,21,32,.72)',
    'backdrop-filter:blur(3px)',
    '-webkit-backdrop-filter:blur(3px)',
    'z-index:9900',
    'display:flex', 'align-items:center',
    'justify-content:center', 'padding:1rem',
    'animation:_wFadeIn .25s ease both'
  ].join(';');

  ov.innerHTML = `
    <style>
      @keyframes _wFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes _wUp{
        from{opacity:0;transform:translateY(18px)}
        to{opacity:1;transform:translateY(0)}}
      #internly-welcome-overlay a:hover{background:#f0ede8!important}
      #internly-welcome-overlay a[href="buddy-dashboard.html"]:hover{
        background:#f5f0ff!important}
    </style>
    <div style="background:#fff;border-radius:16px;
      padding:1.75rem 1.5rem 1.5rem;max-width:480px;width:100%;
      max-height:90vh;overflow-y:auto;
      box-shadow:0 24px 60px rgba(13,21,32,.28);
      animation:_wUp .3s .08s ease both;
      font-family:'Outfit',sans-serif">

      <!-- Header -->
      <div style="text-align:center;margin-bottom:1.4rem">
        <div style="font-size:2.2rem;margin-bottom:.4rem">
          ${cfg.emoji}
        </div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;
          font-size:1.3rem;font-weight:600;color:#0d1520;
          line-height:1.2;margin-bottom:.35rem">
          ${cfg.heading}, ${firstName}!
        </div>
        <div style="font-size:.85rem;color:#7a8799;
          line-height:1.55;max-width:340px;margin:0 auto">
          ${cfg.sub}
        </div>
      </div>

      <!-- Quick actions label -->
      <div style="font-size:.68rem;font-weight:600;
        letter-spacing:.09em;text-transform:uppercase;
        color:#7a8799;margin-bottom:.6rem">
        Snelle acties
      </div>

      <!-- Action cards -->
      <div style="margin-bottom:1rem">
        ${cfg.actions.map(a => _actionCard(a, userId)).join('')}
      </div>

      <!-- Divider -->
      <div style="height:1px;background:rgba(13,21,32,.06);
        margin-bottom:.85rem"></div>

      <!-- Features label -->
      <div style="font-size:.68rem;font-weight:600;
        letter-spacing:.09em;text-transform:uppercase;
        color:#7a8799;margin-bottom:.6rem">
        Alle functies
      </div>

      <!-- Feature pills -->
      <div style="display:grid;grid-template-columns:1fr 1fr;
        gap:6px;margin-bottom:1.25rem">
        ${cfg.features.map(f => _featurePill(f, userId)).join('')}
      </div>

      <!-- Dismiss button -->
      <button id="_wDismissBtn"
        onclick="_wDismiss('${userId}')"
        style="width:100%;padding:.7rem;border:none;
        border-radius:8px;
        background:${cfg.btn};color:#fff;
        font-family:'Outfit',sans-serif;
        font-size:.88rem;font-weight:500;cursor:pointer;
        transition:opacity .15s">
        Ga naar mijn dashboard →
      </button>

    </div>`;

  // Click outside to dismiss
  ov.addEventListener('click', e => {
    if (e.target === ov) _wDismiss(userId);
  });

  document.body.appendChild(ov);
}

// ── Dismiss overlay ───────────────────────────────────
function _wDismiss(userId) {
  localStorage.setItem('internly_welcomed_' + userId, '1');
  const ov = document.getElementById('internly-welcome-overlay');
  if (!ov) return;
  ov.style.transition = 'opacity .18s ease';
  ov.style.opacity = '0';
  setTimeout(() => ov.remove(), 200);
}

// ── Exports ───────────────────────────────────────────
window.maybeShowWelcomeOverlay = maybeShowWelcomeOverlay;
window._wDismiss               = _wDismiss;
