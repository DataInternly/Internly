# Run 7 Audit Report
Datum: 2 mei 2026
Audit-tijd: ~30 minuten

## Pre-conditie check
- Run 7 wijzigingen aanwezig in working tree: ✓ (38 modified files in `git status`)
- `markAuthReady` aanwezig in utils.js:127: ✓
- `kb-shared-footer` / `page-back-btn` / `chat-topbar-avatar` in css/style.css: ✓
- Run 1-5 markers (`renderRoleHeader`, `HEADER_NAV_BY_ROLE`) intact: ✓

## Audit per bestand (14 totaal)

### review-form.html — **PASS**
- ✓ Logo onclick = `event.preventDefault();smartHomeRedirect();` ([:174](review-form.html#L174))
- ✓ href fallback = `index.html` (niet meer discover.html)
- ✓ utils.js + supabase.js geladen op [:15](review-form.html#L15) en [:18](review-form.html#L18)
- ✓ Andere `discover.html` references ([:337, :371](review-form.html#L337)) zijn legitieme error-state CTA's
- ✓ Footer present ([:382](review-form.html#L382)) met TODO-comment + `kb-shared-footer` class

### mijn-berichten.html — **PASS**
- ✓ `page-back-btn` class + `goBack()` op [:236](mijn-berichten.html#L236)
- ✓ SVG-arrow-pattern identiek met andere 2 pagina's
- ✓ Plaatsing na `#student-header`, vóór `<main class="page-wrap">` — geen interferentie

### mijn-notities.html — **PASS**
- ✓ Cat 5: `page-back-btn` op [:161](mijn-notities.html#L161), na `<header id="role-header">`
- ✓ Cat 6: `kb-shared-footer` op [:379](mijn-notities.html#L379), met TODO-comment
- ✓ Beide additions zitten in verschillende DOM-secties — geen conflict
- ✓ 10 footer-links

### mijn-sollicitaties.html — **PASS** met inline-style noot
- ✓ `page-back-btn` op [:194](mijn-sollicitaties.html#L194), inside `<main class="main">`
- ✓ Inline override `style="max-width:none;margin:0 0 12px;padding:0;"` gerechtvaardigd: deze pagina heeft eigen layout-systeem (`.layout > .main > .page-head`) waar de generieke `.page-back-row` constraints visueel zouden conflicteren
- Tech debt: niet gestandaardiseerd met de andere 2 — bewuste afweging, niet defect

### international-school-dashboard.html — **PASS**
- ✓ `kb-shared-footer` op [:962](international-school-dashboard.html#L962), TODO-comment present
- ✓ 10 links, identiek met andere 5 pagina's

### international-student-dashboard.html — **PASS**
- ✓ `kb-shared-footer` op [:2314](international-student-dashboard.html#L2314), TODO-comment present
- ✓ 10 links

### matchpool.html — **PASS**
- ✓ `kb-shared-footer` op [:472](matchpool.html#L472), TODO-comment present
- ✓ 10 links

### pricing.html — **PASS**
- ✓ `kb-shared-footer` op [:727](pricing.html#L727), TODO-comment present
- ✓ 10 links
- ✓ css/style.css geladen (publieke pagina maar wel utils.js + supabase.js per Run 7 audit) — `.kb-shared-footer` styling werkt

### chat.html — **PASS**
- ✓ HTML-slot heeft `aria-hidden="true"` op [:457](chat.html#L457)
- ✓ JS-wiring guard `typeof getAvatarSvg === 'function'` op [:1015](chat.html#L1015)
- ✓ Initials-fallback escapes naam-input via `escapeHtml(_init)` op [:1019](chat.html#L1019)
- ✓ CSS-class `chat-topbar-avatar` (kb-namespaced via `chat-` prefix) — geen conflict met bestaande `.topbar-avatar` of `.avatar` rules

### buddy-dashboard.html — **ISSUES**
- ✓ `data-auth-pending="true"` op `<body>` ([:280](buddy-dashboard.html#L280))
- ✓ `markAuthReady()` op success-pad ([:1310](buddy-dashboard.html#L1310))
- ✓ `markAuthReady()` op wrong-role redirect ([:1300](buddy-dashboard.html#L1300))
- ✗ **BUG**: `markAuthReady()` ontbreekt op no-user redirect ([:1288](buddy-dashboard.html#L1288))
- ✗ **BUG**: `markAuthReady()` ontbreekt op `unhandledrejection` JWT-expired redirect ([:1275](buddy-dashboard.html#L1275))

### company-dashboard.html — **ISSUES**
- ✓ `data-auth-pending="true"` op `<body>` ([:510](company-dashboard.html#L510))
- ✓ `markAuthReady()` op success-pad in `loadUser()` ([:1428](company-dashboard.html#L1428))
- ✓ `markAuthReady()` op no-user pad in `loadUser()` ([:1423](company-dashboard.html#L1423))
- ✗ **BUG**: `loadUser()` is NIET het init-pad. De DOMContentLoaded handler op [:3361](company-dashboard.html#L3361) doet zelf `db.auth.getUser()` op [:3365](company-dashboard.html#L3365) — geen `markAuthReady()` aanroep daarvoor
- ✗ **BUG**: `unhandledrejection` JWT-expired redirect ([:3334](company-dashboard.html#L3334)) zonder `markAuthReady()`

### school-dashboard.html — **ISSUES**
- ✓ `data-auth-pending="true"` op `<body>` ([:531](school-dashboard.html#L531))
- ✓ `markAuthReady()` op success-pad in `loadUser()` ([:1134](school-dashboard.html#L1134))
- ✓ `markAuthReady()` op no-user pad in `loadUser()` ([:1129](school-dashboard.html#L1129))
- ✗ **BUG**: DOMContentLoaded handler op [:2498](school-dashboard.html#L2498) doet zelf `db.auth.getUser()` op [:2500](school-dashboard.html#L2500) — geen `markAuthReady()` daarvoor
- ✗ **BUG**: `unhandledrejection` redirect ([:2313](school-dashboard.html#L2313)) zonder `markAuthReady()`

### css/style.css — **PASS**
- ✓ Geen specificity-conflicts: `.kb-shared-footer` namespace voorkomt conflict met `index.html` inline `footer{}` rules
- ✓ Reduced-motion-rule heeft juiste cascade-volgorde (na default rules)
- ✓ Anti-flicker rules op [:2409-2434](css/style.css#L2409-L2434), page-back op [:2438+](css/style.css#L2438), chat-avatar op [:2462+](css/style.css#L2462), shared-footer op [:2480+](css/style.css#L2480) — netjes onderaan toegevoegd, niet midden in bestaande secties

### js/utils.js — **PASS**
- ✓ `markAuthReady` correct exported via `window.markAuthReady` ([:133](js/utils.js#L133))
- ✓ `requireRole()` backwards-compat — alle bestaande callers werken nog (try/catch wraps maar geen signature-change)
- ✓ try/catch re-throws exception via `throw err` op [:163](js/utils.js#L163) — caller-error-handling intact
- ✓ Alle exit-paths in `requireRole()` roepen `_markReady()` aan: success, no-role, wrong-role, exception

## Cross-cutting bevindingen

### Patroon-consistentie
Cat 5 back-button: 100% consistent (3 pagina's, identiek SVG + label + class)
Cat 6 footer: 100% consistent (6 pagina's, identieke 10 links + TODO-comment)
Cat 8 avatar: enkel chat.html, geen andere referenties
Cat 3 anti-flicker: **incompleet** — body-attribuut op alle 3, maar markAuthReady op slechts ~50% van de exit-paths

### Specificity / namespace conflicts
Geen. Alle nieuwe classes zijn óf kb-prefixed (`kb-shared-footer`, `chat-topbar-avatar`) óf semantisch uniek (`page-back-btn`, `data-auth-pending`).

### Backwards-compat utils.js
`requireRole()` signatuur ongewijzigd. Try/catch wrappet de body en re-throwt — bestaande callers zoals `mijn-berichten.html`, `mijn-notities.html`, `chat.html`, `discover.html`, `matches.html`, `mijn-sollicitaties.html` (6 pagina's) werken zonder aanpassing.

## Tech debt geïnventariseerd

### Categorie A — uit Run 7 voortkomend (must-fix kandidaten)

1. **Cat 3 incomplete: 6 missende `markAuthReady()` aanroepen** — HOOG severity, ~10 min
   - 3× init no-user exit-path (buddy:1288, company:3365, school:2500)
   - 3× unhandledrejection JWT-expired redirect (buddy:1275, company:3334, school:2313)
   - **Impact**: voor non-ingelogde bezoekers en JWT-expiry valt het hele anti-flicker pattern terug op de 300ms CSS-fallback. De fix is bedoeld om DIE situatie juist te voorkomen.

### Categorie B — bekend uit eerdere runs (selectief fix)

1. **requireRole vs inline auth-check inconsistentie** — 19 pagina's gebruiken inline `db.auth.getUser()`, slechts 6 gebruiken `requireRole()`. MIDDEL severity. Migratie zou Cat 3 fix #1 grotendeels overbodig maken — maar significant werk (~2-3 uur).
2. **welcomeMsg legacy in 2 dashboards** — bbl-dashboard.html, begeleider-dashboard.html gebruiken nog welcomeMsg-pattern (niet legacy zoals buddy was — gebruiken het wel actief). Geen fix nodig, alleen documenteren in CLAUDE.md voor latere consolidatie. LAAG severity.
3. **Logo-click in 3 publieke pagina's** — privacybeleid, spelregels, stagebegeleiding gebruiken hardcoded `href="index.html"` zonder smartHomeRedirect. Bedward P2 grijze zone (laden van utils.js + supabase.js op publieke pagina's). LAAG severity. **NIET fixen**.
4. **match-dashboard.html mist anti-flicker** — Stage Hub heilig per regels. NIET fixen.
5. **chat.html heeft eigen topbar (geen renderRoleHeader)** — Run 6 parked werk. LAAG. NIET fixen.
6. **esg-export.html mist css/style.css** — placeholder pagina. NIET fixen.

### Categorie C — architectuur, niet vandaag

1. Cat 1 topbar consolidatie [parked, week 13-25]
2. Cat 2 hardcoded kleuren [parked, week 13-25]
3. Cat 7 P2 publieke pagina's [pragmatisch laten]
4. Backlog #8 shared `renderFooter()` [aparte sprint]

## Severity-classificatie

| Item | Severity | Tijd | Risico |
|---|---|---|---|
| Cat 3 incomplete (6 ontbrekende markAuthReady) | **HOOG** | 10 min | Pattern werkt niet voor 50% van exit-paths; zonder fix is Run 7 Cat 3 grotendeels cosmetisch |
| requireRole-migratie 19 pagina's | MIDDEL | 2-3 uur | Breekt mogelijk subtiele auth-flows; vereist per-pagina test |
| welcomeMsg legacy bbl + begeleider | LAAG | 5 min elk | Geen functionele impact; enkel patroon-cleanup |
| Logo-click publieke pagina's | LAAG | 30 min | P2 grijze zone — keuze van Bedward |

## Aanbeveling voor Fase 2

**Klein en gericht**:
1. Cat A item 1 (Cat 3 completeren — 6 markAuthReady-calls toevoegen) — **HOOG prio, 10 min, geen risico**

**Niet vandaag** (uit scope of te groot):
- Cat B 1 (requireRole-migratie) — te invasief voor polish-sprint
- Cat B 2-6 — niet kritiek, parkeren tot consolidatie-sprint
- Cat C — architectuur

Totale Fase 2 inschatting bij minimal scope: **10-15 minuten**.
