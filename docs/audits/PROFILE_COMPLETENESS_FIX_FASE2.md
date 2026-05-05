# Profile Completeness Fix — Fase 2 implementatie

**Datum**: 6 mei 2026
**Crew**: 7/11 + Bedward
**Voorgaande**: Fase 1 audit ([PROFILE_COMPLETENESS_AUDIT.md](PROFILE_COMPLETENESS_AUDIT.md))

## Wijzigingen overzicht

- `js/utils.js`: `_heeftWaarde` + `COMPLETENESS_CONFIG` + 2 helpers + `renderRoleLanding` uitgebreid met suggesties + <100% guard
- `css/style.css`: 3 nieuwe regels (`.rl-completeness-suggestions`, `.rl-completeness-suggestion`, `:hover`)
- `bbl-hub.html`: SELECT uitgebreid met `postcode` + 1 helper-aanroep
- `company-dashboard.html`: SELECT uitgebreid met 4 velden + 1 helper-aanroep
- `school-dashboard.html`: SELECT uitgebreid met `avatar_key` + 1 helper-aanroep
- `student-home.html`: lokale CALC + suggestion-rendering vervangen door centrale helper-aanroepen

## Per-file diff-rapport

### 1. js/utils.js
- **Wijziging 1.A** (nieuwe regel ~520): `_heeftWaarde(v)` helper toegevoegd vóór `findPublicHeader`
- **Wijziging 1.B** (regel ~538): `COMPLETENESS_CONFIG` constant met 3 rol-configs (student/bedrijf/school)
- **Wijziging 1.C** (regel ~571): `calculateProfileCompleteness(role, profileData)` + `window.calculateProfileCompleteness` export
- **Wijziging 1.D** (regel ~587): `getCompletenessSuggestions(role, profileData)` + `window.getCompletenessSuggestions` export
- **Wijziging 1.E** (regel ~877-908): `renderRoleLanding` `completenessHtml` uitgebreid met:
  - Guard `< 100` toegevoegd (nu verbergen bij 100%)
  - `suggestions` array uit `profileData.completeness_suggestions`
  - `profileEditUrl` uit `profileData.profile_edit_url` met `'#'` fallback
  - Suggestie-block met top-2 impact-CTAs, `escapeHtml(s.impact)` voor XSS-defense
- Alle helpers `student_bbl` → `student` config-mapping (DRY)

### 2. css/style.css
- **Wijziging** (regel 2701-2723): 3 nieuwe regels na bestaande `.rl-completeness-fill`
  - `.rl-completeness-suggestions` — flex container, 6px gap, 0.65rem margin-top
  - `.rl-completeness-suggestion` — pill-style CTA, groene tint (rgba 26,122,72), 8px border-radius
  - `.rl-completeness-suggestion:hover` — verhoogde opacity-tint

### 3. bbl-hub.html (regel 720-746)
- **Wijziging 1 — SELECT** (regel 725):
  - voor: `'opleiding, jaar, school, opdracht_domein, motivatie, skills, bbl_mode'`
  - na:   `'opleiding, jaar, school, opdracht_domein, motivatie, skills, bbl_mode, postcode'`
- **Wijziging 2 — profileData verrijkt** (regels 731-743):
  - 4 nieuwe keys (school, opdracht_domein, postcode, motivatie, skills) toegevoegd aan `data`
  - 3 helper-aanroepen: `calculateProfileCompleteness('student_bbl', data)`, `getCompletenessSuggestions('student_bbl', data)`, `profile_edit_url = 'bbl-profile.html'`

### 4. company-dashboard.html (regel 757-784)
- **Wijziging 1 — SELECT** (regel 759):
  - voor: `'bedrijfsnaam, sector, size, trust_score, trust_grade'`
  - na:   `'bedrijfsnaam, sector, size, trust_score, trust_grade, website, beschrijving, avatar_key, remote_possible'`
- **Wijziging 2 — profileData verrijkt** (regels 770-782):
  - 6 nieuwe keys (bedrijfsnaam, website, beschrijving, avatar_key, remote_possible) toegevoegd
  - 3 helper-aanroepen: `calculateProfileCompleteness('bedrijf', data)`, `getCompletenessSuggestions('bedrijf', data)`, `profile_edit_url = '#'`

### 5. school-dashboard.html (regel 734-751)
- **Wijziging 1 — SELECT** (regel 736):
  - voor: `'schoolnaam, contactpersoon, locatie, opleidingen'`
  - na:   `'schoolnaam, contactpersoon, locatie, opleidingen, avatar_key'`
- **Wijziging 2 — profileData verrijkt** (regels 740-750):
  - 4 nieuwe keys (contactpersoon, locatie, opleidingen, avatar_key) toegevoegd
  - 3 helper-aanroepen: `calculateProfileCompleteness('school', data)`, `getCompletenessSuggestions('school', data)`, `profile_edit_url = '#'`

### 6. student-home.html (regel 252-273)
- **Wijziging — lokale logica vervangen**:
  - voor: 16 regels lokale `_cVelden` config + lokale `_heeftWaarde` + `_totaal` + `_behaald` berekening + `_ontbrekend` filter
  - na:   1 regel `pct = window.calculateProfileCompleteness('student', sp)` + 1 regel `_ontbrekend = window.getCompletenessSuggestions('student', sp)`
  - Eigen UI (sh-pct, sh-progress-fill, sh-suggesties) **behouden** — alleen berekening en field-config gemigreerd
  - `bol-profile.html` href in suggestie-CTA behouden (BOL student → BOL profile-edit)

## Verify-resultaten

| Check | Verwacht | Gevonden | Status |
|---|---|---|---|
| `js/utils.js` nieuwe symbols (function/const/window-exports) | 10 | 10 | ✓ |
| 4 callers met `calculateProfileCompleteness` (bbl-hub, company, school, student-home) | 4 | 4 | ✓ |
| `student-home.html` lokale `_cVelden`/`_totaal`/`_behaald` verwijderd | 0 hits | 0 | ✓ |
| `css/style.css` `rl-completeness-suggestion*` regels | 3 | 3 (regels 2701, 2707, 2721) | ✓ |
| Tag-balance `bbl-hub.html` | pre-existing 228/227 | 228/227 (ongewijzigd) | ✓ |
| Tag-balance `company-dashboard.html` | balanced | 361/361 | ✓ |
| Tag-balance `school-dashboard.html` | balanced | 242/242 | ✓ |
| Tag-balance `student-home.html` | balanced | 33/33 | ✓ |

## Hal validatie — profile_edit_url paths

Hal flagde: paths moeten BESTAAN. Resultaten:
- BBL → `'bbl-profile.html'` — **bestaat**, gevalideerd via Glob (`bbl-profile.html` aanwezig in root)
- BOL → `'bol-profile.html'` — **bestaat**, gevalideerd (hardcoded in student-home.html)
- Bedrijf → `'#'` — **placeholder, geen URL**. Reden: company-dashboard gebruikt `show('profiel')` JS-function (geen URL/hash routing). Suggestie-CTA werkt niet als klikbare link, maar de impact-text wordt wel zichtbaar als visual hint. Gebruiker kent al de `✏️ Bewerken` button bij company-view-profiel.
- School → `'#'` — idem als bedrijf, gebruikt `show('profiel')` + `toonSchoolFormulier()`.

**Niet verzonnen — bewust gekozen** ipv `#section-profiel` of `javascript:show('profiel')` (zou suggereren dat dashboards hash-routing hebben terwijl ze die niet hebben). Backlog: bedrijf/school suggestie-CTA via `data-action` + delegate handler in een latere refactor.

## Files voor FTP-upload

1. `js/utils.js`
2. `css/style.css`
3. `bbl-hub.html`
4. `company-dashboard.html`
5. `school-dashboard.html`
6. `student-home.html`

**Totaal: 6 files**

## Klaar voor commit

```bash
git add js/utils.js css/style.css \
        bbl-hub.html company-dashboard.html \
        school-dashboard.html student-home.html \
        docs/audits/PROFILE_COMPLETENESS_AUDIT.md \
        docs/audits/PROFILE_COMPLETENESS_FIX_FASE2.md

git commit -m "feat(completeness): centrale helper + suggesties op 4 dashboards"
```

## Backlog post-Fase 2

- **Bedrijf/school suggestie-CTA functionaliteit**: vervang `'#'` placeholder door werkende click-handler (data-action + delegate)
- **profile_edit_url URL-escape**: indien ooit user-input passen, encodeURI toepassen op href
- **Begeleider/admin/gepensioneerd**: voeg COMPLETENESS_CONFIG entries toe wanneer profielvelden gespecificeerd zijn
- **i18n**: impact-teksten zijn nu hardcoded NL — verplaatsen naar getNotifText-pattern wanneer EN-versie nodig is
- **Server-side completeness**: indien Trust Score algoritme completeness wil meenemen, Edge Function + DB-trigger op profiel-updates
