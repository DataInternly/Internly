# Run 1 — Foundation modules
Datum: 1 mei 2026

## Resultaat

| Stap | Status | Bestand(en) |
|---|---|---|
| 1 — withSaveLock | APPLIED | [js/utils.js](js/utils.js) regels 277-310 |
| 2 — renderRoleHeader + CSS | APPLIED | [js/utils.js](js/utils.js) regels 432-547, [css/style.css](css/style.css) regels 1917-2049 |
| 3 — js/profileView.js + CSS | APPLIED | [js/profileView.js](js/profileView.js) (NIEUW, 179 regels), [css/style.css](css/style.css) regels 2051-2212 |

### Pre-checks (allemaal OK)
- `withSaveLock` / `renderRoleHeader` / `HEADER_NAV_BY_ROLE` waren niet aanwezig in utils.js → veilig om toe te voegen
- `js/profileView.js` bestond niet → veilig om aan te maken

### Verificatie

**STAP 1** — [js/utils.js:277-310](js/utils.js#L277-L310):
- JSDoc-blok regels 277-288
- `async function withSaveLock(trigger, fn)` regel 289
- `window.withSaveLock = withSaveLock` regel 309
- Geen-trigger no-op pad: `if (!trigger) return fn();`
- Restore in `finally` voor zowel disabled-state als textContent

**STAP 2** — [js/utils.js:432-547](js/utils.js#L432-L547):
- `HEADER_NAV_BY_ROLE` const met `student` (7 items) + `gepensioneerd` (5 items, "notities" disabled+comingSoon)
- `async function renderRoleHeader(role, activeTab, opts)` met backwards-compat fallback naar `#student-header` container
- Wires `Internly.getUnreadTotal()` als beschikbaar
- `window.renderRoleHeader` + `window.HEADER_NAV_BY_ROLE` exports

**STAP 2 CSS** — [css/style.css:1917-2049](css/style.css#L1917-L2049):
- `.role-header` sticky top, `.role-header-inner`, `.role-header-nav`, `.role-nav-item` met active+disabled states
- `.role-nav-badge` voor "binnenkort" label
- `.role-header-bell`/`-back`/`-logout` action buttons
- `.role-header-chip` profile avatar+naam
- `body[data-role="gepensioneerd"]` overrides naar paars (#7c3aed/#5b21b6)
- `@media (max-width: 640px)` mobile padding+font-size

**STAP 3** — [js/profileView.js](js/profileView.js):
- 179 regels, geen externe dependencies behalve `getAvatarSvg` (avatar.js) en `escapeHtml` (utils.js) op runtime
- `PROFILE_VIEW_CONFIGS.gepensioneerd` met `accentColor: #7c3aed`, stats `grove_beschikbaarheid` + `__matches_count`, sections `kennis_gebieden`/`achtergrond`/`bio`
- `PROFILE_VIEW_CONFIGS.student` als stub voor toekomstig gebruik
- `renderProfileView(profile, role, container, opts)` met `opts.onEdit` callback en `opts.matchesCount` voor dynamische telling
- Falsy-fall pattern: arrays/strings/null worden netjes weggelaten
- `window.renderProfileView` + `window.PROFILE_VIEW_CONFIGS` exports

**STAP 3 CSS** — [css/style.css:2051-2212](css/style.css#L2051-L2212):
- `.pv-card` met box-shadow + rounded
- `.pv-strip` gradient via CSS custom props (`--accent-tint`/`--accent-light`)
- `.pv-avatar` (120px desktop / 100px mobile) met getAvatarSvg-renderslot of `.pv-avatar-initials` fallback
- `.pv-avatar-edit` floating ✏ knop
- `.pv-stats` auto-grid (responsief naar 1-kolom mobiel)
- `.pv-tags` chip-rendering met inline-styled accent-tint backgrounds
- `.pv-edit-btn` met hover-state
- `.pv-empty` voor "profiel nog niet ingevuld"
- Mobile media query op 640px

## Onverwachte vondsten

- Geen. Alle pre-checks slaagden, geen merge-conflicten, geen ontbrekende dependencies. CSS-tokens uit Sprint 1 (`--accent-bg`, `--bg2`, `--ink`, `--border`) worden hergebruikt zonder probleem.
- `Internly.getUnreadTotal()` bestond al ([js/utils.js:565-566](js/utils.js#L565-L566)) — `renderRoleHeader` kan er meteen op haken zodra een pagina dit aanroept.
- `getAvatarSvg` bestaat al in [js/avatar.js:66](js/avatar.js#L66) — profileView.js gebruikt dit zonder runtime-failure mits avatar.js geladen is voor profileView.js.

## Klaar voor Run 2

| Vereiste | Status |
|---|---|
| `withSaveLock` exporteert correct op `window` | ✅ ja |
| `renderRoleHeader` exporteert correct op `window` | ✅ ja |
| `HEADER_NAV_BY_ROLE` exporteert correct op `window` | ✅ ja |
| `js/profileView.js` bestaat en is laadbaar | ✅ ja |
| `renderProfileView` exporteert correct op `window` | ✅ ja |
| `PROFILE_VIEW_CONFIGS` exporteert correct op `window` | ✅ ja |
| CSS classes `.role-*` en `.pv-*` aanwezig in style.css | ✅ ja |
| Geen edits aan productie-pagina's (buddy-dashboard, mijn-berichten, etc.) | ✅ ja |
| Backwards-compatibility: `renderStudentHeader` ongewijzigd | ✅ ja |

Run 2 kan veilig: in een productie-pagina (waarschijnlijk buddy-dashboard.html) `<script src="js/profileView.js"></script>` toevoegen, container `<div id="role-header"></div>` plaatsen, en de drie functies aanroepen.
