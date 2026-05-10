# HEADER CONSISTENCY AUDIT — Internly

**Datum:** 2026-05-10
**Spec:** [docs/INTERNLY_HEADER_SPEC.md](docs/INTERNLY_HEADER_SPEC.md) v1.0 (5 mei 2026)
**Methode:** grep op `renderStudentHeader`, `renderRoleHeader`, `<aside class="sidebar">`, `<div class="topbar">`, `#7c3aed`, plus inspectie van markup

## Samenvatting

| Spec-type | Pagina's verwacht | Conform | Afwijkend |
|---|---:|---:|---:|
| A — Publiek | 16 | 16 | 0 |
| B — Student (groen) | 15 | 9 | 6 |
| C — Bedrijf (sidebar) | 5 | 1 | 4 |
| D — School/Begeleider (sidebar) | 3 | 3 | 0 |
| E — Buddy (paars) | 3 | 0 | 3 |

**Conclusie:** 13 pagina's wijken af. Geen kritieke security-impact, wel visueel inconsistent. Drie clusters: profielen niet gemigreerd, bedrijf-pagina's missen sidebar, buddy-header heeft witte achtergrond i.p.v. paars.

## Per-pagina tabel

### Type B — Student (groen gradient)

| Pagina | Verwacht | Gevonden | Status |
|---|---|---|---|
| [bbl-hub.html](bbl-hub.html#L2631) | renderStudentHeader (BBL-detect) | `renderStudentHeader({ activeTab: 'discover' })` | ✓ |
| [discover.html](discover.html#L1435) | Type B | `renderStudentHeader({ activeTab: 'discover' })` | ✓ |
| [matches.html](matches.html#L753) | Type B | `renderStudentHeader({ activeTab: …matchpool/buddy })` | ✓ |
| [matchpool.html](matchpool.html) | Type B | `renderStudentHeader` via [js/matchpool.js:292](js/matchpool.js#L292) | ✓ |
| [mijn-berichten.html](mijn-berichten.html#L872) | Type B (of andere rol) | `renderRoleHeader(headerRole, 'berichten')` met BBL-detect | ✓ |
| [mijn-sollicitaties.html](mijn-sollicitaties.html#L808) | Type B | `renderStudentHeader({ activeTab: 'sollicitaties' })` | ✓ |
| [student-home.html](student-home.html#L277) | Type B | `renderStudentHeader({ activeTab: 'home' })` | ✓ |
| [student-profile.html](student-profile.html#L1650) | Type B | `renderStudentHeader({ activeTab: null })` | ✓ |
| [kennisbank.html](kennisbank.html#L1930) | Type B (ingelogd) of A (uitgelogd) | `renderRoleHeader(role, null, …)` | ✓ |
| [bbl-dashboard.html](bbl-dashboard.html#L612) | Type B (BBL-variant) | `renderStudentHeader({ activeTab: 'matches' })` — **invalid tab-key** | ⚠ tab-id `'matches'` staat niet in `student_bbl` nav (= discover/matchpool/berichten/profiel/buddy); active-state highlight werkt niet |
| [bbl-profile.html](bbl-profile.html#L319) | Type B | eigen `<div class="topbar">` met `.topbar-bbl-nav` (4 hardcoded links) | 🔴 niet gemigreerd, drift t.o.v. helper |
| [bol-profile.html](bol-profile.html#L389) | Type B | eigen `<div class="topbar">` met inline `<nav class="nav">` | 🔴 niet gemigreerd |
| [chat.html](chat.html#L481) | Type B (student) of role-aware | eigen `<div class="topbar">` met match-info ipv role-nav | 🔴 special-purpose topbar, geen role-nav |
| [vacature-detail.html](vacature-detail.html#L546) | Type B (semi-publiek) | eigen `<div class="topbar">` met student-links hardcoded | 🔴 niet gemigreerd; voor non-student rollen mismatch |

### Type C — Bedrijf (sidebar zwart)

| Pagina | Verwacht | Gevonden | Status |
|---|---|---|---|
| [company-dashboard.html](company-dashboard.html#L628) | Sidebar | `<aside class="sidebar">` | ✓ markup conform, geen helper-call (zoals C-pages mogen) |
| [company-discover.html](company-discover.html#L571) | Sidebar | `<div class="topbar">` met smartHomeRedirect-logo, **geen sidebar** | 🔴 verkeerd type — bedrijf hoort sidebar te krijgen |
| [match-dashboard.html](match-dashboard.html#L2106) | Sidebar voor bedrijf, top-bar voor student | dual-mode: `renderStudentHeader` als `role==='student'`, anders `<header id="hub-topbar">` | 🔴 bedrijf krijgt eigen `#hub-topbar`, geen sidebar |
| mijn-berichten.html (bedrijf-rol) | Sidebar | gebruikt `renderRoleHeader('bedrijf', …)` als topbar | 🔴 spec zegt sidebar, code rendert top-bar |
| vacature-detail.html (bedrijf-context) | Sidebar | eigen .topbar, geen sidebar | 🔴 zie boven |

> Aandachtspunt: er is **geen `renderBedrijfSidebar()` helper** in `js/utils.js`. Type C-conformiteit hangt nu af van per-pagina handgeschreven `<aside class="sidebar">`-markup. Spec §HEADER_NAV_BY_ROLE definieert wel `bedrijf:` met 6 tabs, maar `renderRoleHeader('bedrijf', …)` produceert dezelfde top-bar als de andere rollen — niet een sidebar.

### Type D — School / Begeleider (sidebar oranje-accent)

| Pagina | Verwacht | Gevonden | Status |
|---|---|---|---|
| [school-dashboard.html](school-dashboard.html#L650) | Sidebar | `<aside class="sidebar">` | ✓ |
| [begeleider-dashboard.html](begeleider-dashboard.html#L479) | Sidebar | `<aside class="sidebar">` | ✓ |
| [international-school-dashboard.html](international-school-dashboard.html#L461) | Sidebar | `<aside class="sidebar">` | ✓ |

### Type E — Buddy (paars #7c3aed)

| Pagina | Verwacht | Gevonden | Status |
|---|---|---|---|
| [buddy-dashboard.html](buddy-dashboard.html#L845) | Top-bar paars | `renderRoleHeader('gepensioneerd', sectionId, …)` | ⚠ helper-call OK, maar zie kleur-issue hieronder |
| [mijn-notities.html](mijn-notities.html#L225) | Top-bar paars | `renderRoleHeader('gepensioneerd', 'notities', …)` | ⚠ zelfde |
| mijn-berichten.html (buddy-rol) | Top-bar paars | `renderRoleHeader(headerRole, 'berichten')` — voor buddy-rol nog niet getest | ⚠ rol-detect kijkt nu alleen naar BBL; voor `gepensioneerd` valt het terug op de generieke pad |

#### Kritisch: `.role-header` background is wit, niet paars

[css/style.css:2218](css/style.css#L2218):
```css
.role-header { background: var(--white, #fff); … }
```

De spec zegt voor Type E:
> Background: paars (#7c3aed gradient)

In de code is paars alleen toegepast op:
- [css/style.css:2352](css/style.css#L2352) `body[data-role="gepensioneerd"] .role-nav-item.active { background: #7c3aed; }`
- [css/style.css:2337](css/style.css#L2337) `.role-header-chip-avatar` (vast paars-gradient, ongeacht rol)
- [css/style.css:2359](css/style.css#L2359) `.role-header-bell-count` voor gepensioneerd

**Resultaat:** buddy-pagina's hebben een **witte** header met paarse active-tab — niet de paarse achtergrond uit de spec. Hetzelfde geldt voor Type B (groen gradient), die in de huidige code ook geen groene achtergrond heeft op de helper-output. De spec en de implementatie zijn hier visueel uit elkaar gegroeid.

#### Naming-drift spec ↔ code

| Bron | Role-key voor buddy |
|---|---|
| [docs/INTERNLY_HEADER_SPEC.md:150](docs/INTERNLY_HEADER_SPEC.md#L150) | `buddy:` |
| [js/utils.js:965](js/utils.js#L965) | `gepensioneerd:` |

De code gebruikt `gepensioneerd` (DB-canon — sluit aan op CLAUDE.md `requireRole('gepensioneerd')`). De spec is uit de pas. `renderRoleHeader('buddy', …)` zou nu `console.warn: unknown role` produceren.

### Type A — Publiek

11 publieke pagina's gebruiken `renderRoleHeader(role, null, { profile })` als overlay voor ingelogde bezoekers. Dat is by design: publieke content + role-aware header voor terugkerende ingelogde gebruikers.

| Pagina | Status |
|---|---|
| about, pricing, faq, hoe-het-werkt, kennisbank, internly-worldwide, esg-rapportage, privacybeleid, spelregels, cookiebeleid, algemene-voorwaarden | ✓ |
| index.html | ✓ marketing, geen helper-call (eigen .topbar) |
| stagebegeleiding, esg-export, internly_simulator, 404, preview, la-sign, blog, security, maintenance, 500, 503, coming-soon-* | ✓ statisch, geen role-aware nodig |

### Niet in spec (apart vermelden)

| Pagina | Markup | Status |
|---|---|---|
| [admin.html](admin.html#L285) | `<nav class="sidebar">` | ✓ admin niet in spec, sidebar-pattern (vergelijkbaar met C/D) is consistent |
| [international-student-dashboard.html](international-student-dashboard.html#L744) | `<aside class="sidebar">` | ⚠ spec noemt deze pagina niet expliciet. Per CLAUDE.md routing is dit een student-route → zou Type B verwachten, niet sidebar |
| [review-form.html](review-form.html#L200) | eigen `<div class="topbar">` | ⚠ niet in spec; geen role-nav, alleen actieformulier |
| [buddy-dashboard.html](buddy-dashboard.html) | als E (zie boven) | — |

## Afwijkings-overzicht (compact)

| Pagina | Verwacht | Gevonden | Status |
|---|---|---|---|
| bbl-dashboard.html | Type B (BBL) — tab-id uit student_bbl-config | `activeTab: 'matches'` (niet in config) | ⚠ active-state werkt niet |
| bbl-profile.html | Type B helper | eigen .topbar | 🔴 |
| bol-profile.html | Type B helper | eigen .topbar | 🔴 |
| chat.html | Type B (student-rol) | eigen match-info topbar (geen role-nav) | 🔴 |
| vacature-detail.html | Type B (student) / C (bedrijf) | eigen student-only .topbar | 🔴 |
| company-discover.html | Type C sidebar | eigen .topbar (geen sidebar) | 🔴 |
| match-dashboard.html (non-student) | Type C sidebar | `#hub-topbar` (top-bar) | 🔴 |
| mijn-berichten.html (bedrijf-rol) | Type C sidebar | `renderRoleHeader('bedrijf', …)` → top-bar | 🔴 |
| buddy-dashboard.html | Type E paarse achtergrond | wit .role-header met paarse active-accent | ⚠ visuele drift |
| mijn-notities.html | Type E paarse achtergrond | zelfde witte .role-header | ⚠ visuele drift |
| international-student-dashboard.html | (geen spec — vermoedelijk B) | sidebar | ⚠ |
| Spec ↔ code | role-key `buddy` | role-key `gepensioneerd` | ⚠ spec-doc verouderd |
| `.role-header` background-color | groen / paars gradient | wit | ⚠ globale visuele drift |

## Aanbevelingen

**P0 — fix vóór livetest niet nodig** (geen functionele bugs, alleen visueel)

**P1 — sprint 5 cluster "header-migratie" (geschat 2-3 sessies):**

1. **bbl-profile + bol-profile + chat + vacature-detail naar helper** — vier pagina's profielen/detail die nog inline `<div class="topbar">` gebruiken. Migreren naar `renderStudentHeader({ activeTab })`. Schat: 30-45 min/page. Maakt mijn-berichten-stijl-consistentie compleet.

2. **bbl-dashboard.html tab-key fix** — `'matches'` → `'discover'` (1-regel-fix). Of bbl-dashboard volledig deprecaten als CLAUDE.md zegt dat bbl-hub het canon-dashboard is.

3. **`renderBedrijfSidebar()` helper bouwen** — vergelijkbaar met `renderStudentHeader`, leest `HEADER_NAV_BY_ROLE.bedrijf`, vult een `<aside id="bedrijf-sidebar">`. Daarna company-discover, match-dashboard (bedrijf-pad), mijn-berichten (bedrijf) migreren.

4. **Spec-doc bijwerken** — role-key `buddy` → `gepensioneerd`, of de codebase consequent rename'n. CLAUDE.md gebruikt al `gepensioneerd` dus spec is degene die fout staat.

**P2 — visuele drift `.role-header`** — de white-background-strategy is bewust gekozen (consistent across roles, met body[data-role] tinten). De spec zou bijgesteld moeten worden naar de werkelijkheid: "white header met role-tinted active-tab + accent-elements", of de CSS moet alsnog gradient achtergronden krijgen per body[data-role]. Beslissing voor Bedward / Barry vóór een tweede spec-cyclus.

## Buddy-kleur #7c3aed correctheid

Grep op `#7c3aed` levert 18 hits in productiecode. Verdeling:

| Locatie | Gebruik | Correct? |
|---|---|---|
| [css/style.css:55](css/style.css#L55) | `--c-buddy-purple-mid: #7c3aed` (CSS-var) | ✓ canon |
| [css/style.css:2337](css/style.css#L2337) | `.role-header-chip-avatar` paars-gradient | ✓ |
| [css/style.css:2353](css/style.css#L2353) | `body[data-role="gepensioneerd"] .role-nav-item.active` | ✓ |
| [buddy-dashboard.html:417,448](buddy-dashboard.html#L417) | `var(--c-buddy-purple, #7c3aed)` (fallback) | ⚠ var-naam suggereert donker (#6d28d9), fallback is medium (#7c3aed) — al genoteerd in COSMETIC_AUDIT.md:194 |
| [chat.html:1532](chat.html#L1532) | buddy-tag pill | ✓ |
| [discover.html:496-503](discover.html#L496) | buddy-color-codering blok | ✓ |

Geen pagina gebruikt een verkeerde paarse tint voor buddy-context. De #7c3aed-toepassingen zijn correct. Het probleem is dat de spec's "paarse achtergrond" niet wordt gerenderd op de header zelf — alleen op accent-elementen.
