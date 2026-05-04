/* ─────────────────────────────────────────────────────────────────────
   js/profileView.js
   Rol-aware saved-view profielkaart renderer.
   Eerste consumer: buddy-dashboard.html — andere rollen als stubs.
   Hangt af van: js/avatar.js (getAvatarSvg), js/utils.js (escapeHtml)
   ───────────────────────────────────────────────────────────────────── */

const PROFILE_VIEW_CONFIGS = {
  gepensioneerd: {
    accentColor:    '#7c3aed',
    accentDeep:     '#5b21b6',
    accentLight:    '#ede9fe',
    accentTint:     '#f5f3ff',
    roleLabel:      'Buddy · gepensioneerd',
    showAvatar:     true,
    avatarKeyField: 'avatar_key',
    nameField:      'naam',
    locationField:  'stad',
    taglineField:   'pitch',
    stats: [
      { source: 'grove_beschikbaarheid', label: 'Beschikbaar' },
      { source: '__matches_count',       label: 'Matches' },
    ],
    sections: [
      { source: 'kennis_gebieden', label: 'Vakgebied',          type: 'tags' },
      { source: 'achtergrond',     label: 'Loopbaan',           type: 'text' },
      { source: 'bio',             label: 'Wat ik te bieden heb', type: 'text' },
    ],
  },
  student: {
    accentColor: '#1756a8',
    accentDeep:  '#0f3d7a',
    accentLight: '#e8f0fc',
    accentTint:  '#f3f7fd',
    roleLabel:   'Student',
    showAvatar:  true,
    avatarKeyField: 'avatar_key',
    nameField:   'naam',
    locationField: 'school',
    taglineField:  null,
    stats: [
      { source: 'opleiding', label: 'Opleiding' },
      { source: 'jaar',      label: 'Jaar' },
    ],
    sections: [
      { source: 'skills',     label: 'Vaardigheden', type: 'tags' },
      { source: 'motivatie',  label: 'Motivatie',    type: 'text' },
      { source: 'beschrijving', label: 'Over mij',   type: 'text' },
    ],
  },
  // Toekomstig: company, school
};

/**
 * Render een rol-specifieke saved-view profielkaart in een container.
 *
 * @param {object} profile - data object met de velden uit het schema
 * @param {string} role - bv 'gepensioneerd' of 'student'
 * @param {HTMLElement|string} container - DOM element of element-id
 * @param {object} [opts]
 * @param {Function} [opts.onEdit] - callback voor "Profiel bewerken"-knop
 * @param {number}   [opts.matchesCount] - dynamische telling, vervangt __matches_count
 */
function renderProfileView(profile, role, container, opts = {}) {
  const config = PROFILE_VIEW_CONFIGS[role];
  if (!config) {
    console.warn('renderProfileView: unknown role', role);
    return;
  }
  const el = (typeof container === 'string')
    ? document.getElementById(container)
    : container;
  if (!el) {
    console.warn('renderProfileView: container not found');
    return;
  }
  if (!profile) {
    el.innerHTML = '<div class="pv-empty">Profiel nog niet ingevuld.</div>';
    return;
  }

  const dataLookup = {
    ...profile,
    __matches_count: opts.matchesCount != null ? opts.matchesCount : '—',
  };

  const safe = (v) => (v == null || v === '') ? null : v;
  const get = (key) => dataLookup[key];

  /* Avatar */
  const avatarHtml = (() => {
    if (!config.showAvatar) return '';
    const key = get(config.avatarKeyField);
    let inner;
    if (key && typeof window.getAvatarSvg === 'function') {
      inner = window.getAvatarSvg(key);
    } else {
      const initials = (get(config.nameField) || '?')
        .split(' ').map(s => s[0] || '').slice(0,2).join('').toUpperCase();
      inner = `<div class="pv-avatar-initials">${escapeHtml(initials)}</div>`;
    }
    return `<div class="pv-avatar" style="--accent:${config.accentColor};--accent-deep:${config.accentDeep}">
      ${inner}
      ${opts.onEdit ? '<div class="pv-avatar-edit" title="Avatar wijzigen">✏</div>' : ''}
    </div>`;
  })();

  /* Tagline (e.g. pitch) */
  const tagline = config.taglineField ? safe(get(config.taglineField)) : null;
  const taglineHtml = tagline
    ? `<div class="pv-tagline">${escapeHtml(tagline)}</div>`
    : '';

  /* Location */
  const loc = safe(get(config.locationField));
  const locHtml = loc
    ? `<div class="pv-location">📍 ${escapeHtml(loc)}</div>`
    : '';

  /* Stats */
  const statsHtml = config.stats.map(stat => {
    const val = get(stat.source);
    if (val == null || val === '') return '';
    return `<div class="pv-stat">
      <div class="pv-stat-val">${escapeHtml(String(val))}</div>
      <div class="pv-stat-label">${escapeHtml(stat.label)}</div>
    </div>`;
  }).filter(Boolean).join('');

  /* Sections */
  const sectionsHtml = config.sections.map(section => {
    const val = get(section.source);
    if (val == null || val === '' || (Array.isArray(val) && val.length === 0)) return '';
    let bodyHtml = '';
    if (section.type === 'tags' && Array.isArray(val)) {
      bodyHtml = `<div class="pv-tags">${val.map(t =>
        `<span class="pv-tag" style="background:${config.accentTint};color:${config.accentDeep}">${escapeHtml(t)}</span>`
      ).join('')}</div>`;
    } else {
      bodyHtml = `<div class="pv-section-text">${escapeHtml(String(val))}</div>`;
    }
    return `<div class="pv-section">
      <div class="pv-section-label">${escapeHtml(section.label)}</div>
      ${bodyHtml}
    </div>`;
  }).filter(Boolean).join('');

  /* Edit button */
  const editBtnHtml = opts.onEdit
    ? `<button class="pv-edit-btn" id="pv-edit-trigger">✏ Profiel bewerken</button>`
    : '';

  el.innerHTML = `
    <div class="pv-card" style="--accent:${config.accentColor};--accent-deep:${config.accentDeep};--accent-light:${config.accentLight};--accent-tint:${config.accentTint}">
      <div class="pv-strip">
        ${avatarHtml}
        <div class="pv-name">${escapeHtml(safe(get(config.nameField)) || '—')}</div>
        <div class="pv-role">${escapeHtml(config.roleLabel)}</div>
        ${locHtml}
        ${taglineHtml}
      </div>
      <div class="pv-body">
        ${statsHtml ? `<div class="pv-stats">${statsHtml}</div>` : ''}
        ${sectionsHtml}
      </div>
      ${editBtnHtml ? `<div class="pv-actions">${editBtnHtml}</div>` : ''}
    </div>
  `;

  if (opts.onEdit) {
    const trigger = document.getElementById('pv-edit-trigger');
    if (trigger) trigger.addEventListener('click', opts.onEdit);
    const avatarEdit = el.querySelector('.pv-avatar-edit');
    if (avatarEdit) avatarEdit.addEventListener('click', opts.onEdit);
  }
}

window.renderProfileView = renderProfileView;
window.PROFILE_VIEW_CONFIGS = PROFILE_VIEW_CONFIGS;
