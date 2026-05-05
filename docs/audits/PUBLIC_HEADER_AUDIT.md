# Public Header Audit — 5 mei 2026

## Crew
- Lead: 7/11 (architecture fault) + Bedward (selector hygiene)
- Review: Hal, Geordi2, Picard2

## Bugbevestiging
`hoe-het-werkt.html` met BBL-session: hybrid-script vond `<header class="hero">` ipv `<nav class="nav">`, schreef `id='role-header'` + `className='role-header'` over de hero — **hero kapot**.

Root cause: selector bevat generic `header` als 3e fallback. Op pagina's zonder `nav.topbar` of `header.public-header` matcht dit het EERSTE `<header>` element op de pagina — vaak de hero.

## Bestandsinventaris (11 publieke pagina's met hybrid-script)

| File | Nav element | Header element | Selector resolves to | Conflict-status |
|------|-------------|----------------|----------------------|-----------------|
| about.html | `<nav class="topbar">` (631) | — | `nav.topbar` ✓ first-match | **OK** |
| algemene-voorwaarden.html | — | `<header class="header">` (319) | `header` (3e fallback) → header.header | ⚠️ accidentaal correct (geen ander `<header>` op pagina) |
| cookiebeleid.html | — | `<header class="header">` (378) | `header` → header.header | ⚠️ accidentaal correct |
| esg-rapportage.html | `<nav class="esg-nav">` (565) | — | geen match → `if (!publicHeader) return` no-op | **SAFE NO-OP** |
| faq.html | `<nav class="topbar">` (418) | (faq-cat-head later) | `nav.topbar` ✓ first-match | **OK** |
| **hoe-het-werkt.html** | `<nav class="nav">` (770) | `<header class="hero">` (787) | `header` → header.hero | ❌ **BUG** (gerapporteerd) |
| **internly-worldwide.html** | `<nav class="nav">` (1019) | `<header class="hero">` (1038) | `header` → header.hero | ❌ **BUG** (zelfde patroon) |
| kennisbank.html | — (gebruikt `<div id="kb-header">` anchor) | — | geen match → no-op | **SAFE NO-OP** |
| pricing.html | `<nav class="topbar">` (444) | `<header class="hero">` (456) | `nav.topbar` ✓ first-match | **OK** |
| privacybeleid.html | — | `<header class="header">` (470) | `header` → header.header | ⚠️ accidentaal correct |
| spelregels.html | `<div class="topbar">` (420) — NIET `<nav>` | `<div class="hero">` (426) — NIET `<header>` | geen match → no-op | **SAFE NO-OP** |

## Conflict-pagina's (vereisen fix)

**Hard bugs (2):**
- `hoe-het-werkt.html` — header.hero overschreven met role-header className
- `internly-worldwide.html` — zelfde patroon, vermoedelijk zelfde visuele breuk

**Brittle (3 — werken nu, kunnen breken bij toevoeging van extra `<header>` op pagina):**
- `algemene-voorwaarden.html`, `cookiebeleid.html`, `privacybeleid.html` — afhankelijk van "er is precies één `<header>` op de pagina, en het is de juiste"

**Geen actie nodig (6):**
- `about.html`, `faq.html`, `pricing.html` — eerste-match `nav.topbar` werkt correct
- `esg-rapportage.html`, `kennisbank.html`, `spelregels.html` — geen matchend element, script no-op (safe)

## Selector-strategie post-fix

Huidig:
```js
'nav.topbar, header.public-header, header, .public-header'
```
Probleem: laatste 2 selectors (`header`, `.public-header`) zijn te breed.

Voorgesteld:
```js
'[data-public-header], nav.public-nav, nav.topbar, header.public-header'
```
- `[data-public-header]` — canonical, future-proof attribuut
- `nav.public-nav` — preferred class voor nieuwe pagina's
- `nav.topbar`, `header.public-header` — legacy, behouden voor backwards-compat

Geen generic `header` fallback meer — geen accidental matches.

## Voorgestelde Fase 2-acties

1. **Helper toevoegen aan `js/utils.js`**: `findPublicHeader()` (rond regel 512, vóór renderRoleLanding)
2. **Inline selector vervangen op 11 files** met defensive helper-call
3. **`data-public-header` attribuut toevoegen** aan de 11 publieke nav/header elementen:
   - `about.html` regel 631 — `nav.topbar` → `<nav class="topbar" data-public-header>`
   - `algemene-voorwaarden.html` 319 — `header.header` → `<header class="header" data-public-header>`
   - `cookiebeleid.html` 378 — idem
   - `esg-rapportage.html` 565 — `nav.esg-nav` → `<nav class="esg-nav" data-public-header>`
   - `faq.html` 418 — `nav.topbar` → idem
   - `hoe-het-werkt.html` 770 — `<nav class="nav">` → `<nav class="nav" data-public-header>`
   - `internly-worldwide.html` 1019 — idem
   - `kennisbank.html` — vereist apart spec (gebruikt `div#kb-header` als anchor, niet matched element)
   - `pricing.html` 444 — `nav.topbar` → idem
   - `privacybeleid.html` 470 — `header.header` → idem
   - `spelregels.html` 420 — `<div class="topbar">` → vervang door `<nav class="topbar" data-public-header>` (HTML-element correctie + attribuut)

**Gespecialiseerd geval — kennisbank.html:**
Heeft geen native nav/header — pagina rendert eigen header via `renderKBHeader()` in `<div id="kb-header">`. Hybrid-script kan veilig overgeslagen worden, of `data-public-header` op de div zetten + helper aanpassen om div-elementen te accepteren. Aanbevolen: **skip kennisbank in Fase 2** — script rendert toch al via eigen pad (renderKBHeader); script-blok is dood-code op deze pagina. Verwijderen of `if (!publicHeader) return` is genoeg.

**Gespecialiseerd geval — spelregels.html:**
Gebruikt `<div class="topbar">` ipv `<nav class="topbar">`. Twee opties:
- A: behoud `<div>`, voeg `data-public-header` toe (helper accepteert ook divs via attribuut)
- B: refactor `<div>` naar `<nav>` (semantisch correcter, geen helper-aanpassing nodig)

Aanbevolen: **B** — semantisch correct + consistent met andere publieke pagina's.

## Risico-classificatie

| Niveau | Aantal | Items |
|---|---|---|
| KRITIEK | 0 | — |
| HOOG (blokkeert publieke pagina-render bij ingelogd) | 2 | hoe-het-werkt.html, internly-worldwide.html |
| MEDIUM (brittle — kan future-breken) | 3 | algemene-voorwaarden, cookiebeleid, privacybeleid |
| LAAG | 0 | — |

## STOP — wacht op Barry voor Fase 2 GO

Open beslispunten:
1. Akkoord met `data-public-header` attribuut-strategie?
2. Akkoord met spelregels.html `<div>` → `<nav>` refactor?
3. Skip kennisbank.html, of attribuut op `<div id="kb-header">`?
