# Public Header Fix — Fase 2 implementatie

**Datum**: 5 mei 2026
**Crew**: 7/11 + Bedward
**Voorgaande**: Fase 1 audit ([PUBLIC_HEADER_AUDIT.md](PUBLIC_HEADER_AUDIT.md))

## Wijzigingen overzicht

- `js/utils.js` — `findPublicHeader()` helper toegevoegd op regel 522 (na `escapeHtml`, vóór `renderRoleLanding`)
- 10 publieke files — `data-public-header` attribuut + selector-fallback toegevoegd
- `kennisbank.html` — geen wijzigingen (skip per spec — script is dood-code)

## Per-file diff-rapport

### 1. about.html
- **Wijziging 1 — attribuut** (regel 631):
  - voor: `<nav class="topbar">`
  - na:   `<nav class="topbar" data-public-header>`
- **Wijziging 2 — selector** (regel 1139):
  - voor: 1-regel querySelector met generic `header` fallback
  - na:   3-regel `findPublicHeader()` defensive helper-call
- **Tag-balance**: nav=1/1, header=0/0, div=68/68 ✓

### 2. algemene-voorwaarden.html
- **Wijziging 1** (regel 319): `<header class="header">` → `<header class="header" data-public-header>`
- **Wijziging 2** (regel 506): selector vervangen
- **Tag-balance**: nav=0/0, header=1/1, div=12/12 ✓

### 3. cookiebeleid.html
- **Wijziging 1** (regel 378): `<header class="header">` → `<header class="header" data-public-header>`
- **Wijziging 2** (regel 528): selector vervangen
- **Tag-balance**: nav=0/0, header=1/1, div=12/12 ✓

### 4. esg-rapportage.html
- **Wijziging 1** (regel 565): `<nav class="esg-nav" aria-label="Paginanavigatie">` → idem `+ data-public-header`
- **Wijziging 2** (regel 902): selector vervangen
- **Tag-balance**: nav=1/1, header=0/0, div=80/80 ✓

### 5. faq.html
- **Wijziging 1** (regel 418): `<nav class="topbar">` → `<nav class="topbar" data-public-header>`
- **Wijziging 2** (regel 1088): selector vervangen
- **Tag-balance**: nav=2/2, header=8/8, div=118/118 ✓

### 6. hoe-het-werkt.html ❌ HARD BUG → FIXED
- **Wijziging 1** (regel 770): `<nav class="nav">` → `<nav class="nav" data-public-header>`
- **Wijziging 2** (regel 1456): selector vervangen
- Effect: `findPublicHeader()` matcht nu `[data-public-header]` op `<nav class="nav">` ipv `<header class="hero">`
- **Tag-balance**: nav=1/1, header=1/1, div=170/170 ✓

### 7. internly-worldwide.html ❌ HARD BUG → FIXED
- **Wijziging 1** (regel 1019): `<nav class="nav">` → `<nav class="nav" data-public-header>`
- **Wijziging 2** (regel 1805): selector vervangen
- Zelfde fix als hoe-het-werkt.html
- **Tag-balance**: nav=1/1, header=1/1, div=203/203 ✓

### 8. pricing.html
- **Wijziging 1** (regel 444): `<nav class="topbar">` → `<nav class="topbar" data-public-header>`
- **Wijziging 2** (regel 799): selector vervangen
- **Tag-balance**: nav=1/1, header=1/1, div=48/48 ✓

### 9. privacybeleid.html
- **Wijziging 1** (regel 470): `<header class="header">` → `<header class="header" data-public-header>`
- **Wijziging 2** (regel 790): selector vervangen
- **Tag-balance**: nav=0/0, header=1/1, div=80/80 ✓

### 10. spelregels.html (Optie A — div behouden)
- **Wijziging 1** (regel 420): `<div class="topbar">` → `<div class="topbar" data-public-header>`
- **Wijziging 2** (regel 644): selector vervangen
- Effect: helper accepteert nu div via `[data-public-header]` selector — geen element-refactor
- **Tag-balance**: nav=0/0, header=0/0, div=100/100 ✓

## Verify-resultaten

| Check | Verwacht | Gevonden | Status |
|---|---|---|---|
| `data-public-header` attribuut count (10 files × 1) | 10 | 10 | ✓ |
| `findPublicHeader` fallback regel count (10 files × 1) | 10 | 10 | ✓ |
| `kennisbank.html` ongewijzigd (0 hits) | 0 | 0 | ✓ |
| `kennisbank.html` oude selector aanwezig (per skip) | 1 | 1 | ✓ |
| Tag-balance per file | open=close | open=close (allemaal) | ✓ |
| `findPublicHeader` in js/utils.js (jsdoc/decl/window-export) | 2+ | 2 (declaration + window.export) | ✓ |

**Note**: 1e check `findPublicHeader` count is 2 ipv 3 (jsdoc bevat geen `findPublicHeader` als pure-string match — alleen functie-declaratie en window-export). Functie is correct geëxposed.

## Files voor FTP-upload

1. `js/utils.js`
2. `about.html`
3. `algemene-voorwaarden.html`
4. `cookiebeleid.html`
5. `esg-rapportage.html`
6. `faq.html`
7. `hoe-het-werkt.html`
8. `internly-worldwide.html`
9. `pricing.html`
10. `privacybeleid.html`
11. `spelregels.html`

**Totaal: 11 files**

## Klaar voor commit

```bash
git add js/utils.js about.html algemene-voorwaarden.html cookiebeleid.html \
        esg-rapportage.html faq.html hoe-het-werkt.html internly-worldwide.html \
        pricing.html privacybeleid.html spelregels.html \
        docs/audits/PUBLIC_HEADER_AUDIT.md docs/audits/PUBLIC_HEADER_FIX_FASE2.md

git commit -m "fix(public-header): site-wide selector fix met findPublicHeader helper + data-public-header attribuut"
```

## Backlog post-livetest

- Centraliseer hybrid-header inline scripts naar één shared module (laad-script in utils.js of nieuw `js/public-header.js`)
- Verwijder legacy `nav.topbar` en `header.public-header` selectors zodra alle pagina's `data-public-header` hebben
- spelregels.html `<div class="topbar">` → `<nav class="topbar">` semantische refactor (Optie B uit Fase 1)
- kennisbank.html: hybrid-script-blok verwijderen als dood-code, of refactor zodat `<div id="kb-header">` ook werkt met helper
