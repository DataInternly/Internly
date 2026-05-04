# Run 2.5 — Nav click-fix + design polish
Datum: 1 mei 2026

## Diagnose

**Hoofdoorzaak: A — Z-index conflict.**

In [buddy-dashboard.html:47-54](buddy-dashboard.html#L47-L54) (inline `<style>` blok van de pagina zelf):
```css
.topbar {
  position: sticky; top: 0; z-index: 100;
}
```

In [css/style.css:1929 (oud)](css/style.css#L1929):
```css
.role-header {
  position: sticky; top: 0; z-index: 50;
}
```

DOM-volgorde: `<header id="role-header">` (regel 289) → `<div class="topbar">` (regel 292). Beide elementen zijn `position:sticky;top:0`. Op `scrollY=0` staan ze gestapeld in de natuurlijke flow (klikbaar). Zodra de gebruiker scrolt, sticken **beide** aan top:0 en bedekt de topbar (z-index:100) de role-header (z-index:50) — alle clicks landen op de topbar i.p.v. de nav-items. De click-handler `document.addEventListener('click', ...)` op [:723-733](buddy-dashboard.html#L723-L733) is correct top-level — Cause B uitgesloten.

**Bijkomstige issue: C — full-href triggert onnodig navigation risk.** De Overzicht-link had `href="buddy-dashboard.html"` (geen hash). Bij click → preventDefault → showSection. Maar als preventDefault om welke reden dan ook te laat valt, zou de browser een full page-reload doen. `#section-X` als href is veiliger — pure hash-change, geen network request mogelijk.

## Wijzigingen

| Stap | Status | Bestand(en) |
|---|---|---|
| 1 — Click-fix (Fix A: z-index 50→110) | APPLIED | [css/style.css:1931](css/style.css#L1931) |
| 1 — Click-fix (Fix C: hrefs naar `#section-X`) | APPLIED | [js/utils.js:443-447](js/utils.js#L443-L447) |
| 2 — Active-state pill (gevulde donkere bg ipv onderlijn) | APPLIED | [css/style.css:1972-1981](css/style.css#L1972-L1981) |
| 3 — Action buttons subtieler (border weg, alleen hover-bg) | APPLIED | [css/style.css:2003-2020](css/style.css#L2003-L2020) |
| 4 — Mobile breakpoints (720px + 480px) | APPLIED | [css/style.css:2061-2070](css/style.css#L2061-L2070) |

### Per-stap detail

**STAP 1A — z-index naar 110**: `.role-header` krijgt `z-index: 110`, hoger dan topbar's 100. Topbar blijft op z-index 100 (geen wijziging in pagina-inline CSS, voorkomt risico op visuele regressies elders). Op scroll zit role-header nu BOVEN de topbar — clicks landen waar ze moeten.

**STAP 1C — hrefs**: HEADER_NAV_BY_ROLE.gepensioneerd interne links (overzicht/matches/profiel) van `buddy-dashboard.html#section-X` naar bare `#section-X`. Externe links (berichten/notities) onveranderd. Click-handler doet nog steeds `preventDefault` voor de drie interne tabs — bare hash zou zelfs zonder preventDefault geen page-reload doen.

**STAP 2 — Active-state pill**: weg van underline border-bottom, nu een gevulde donkere pill (default `--ink` #0d1520, body-role gepensioneerd override naar `#7c3aed` paars). Hover op niet-actieve items: lichte grijze achtergrond (`--bg2`). Active state behoudt zijn kleur op hover.

**STAP 3 — Action buttons**: `.role-header-bell` / `-back` / `-logout` hebben nu `border:none`, default kleur `--ink3` (subtiel grijs), op hover een `--bg2` background + `--ink` text. Schoner, minder visuele ruis naast de pill-nav.

**STAP 4 — Mobile**: twee breakpoints. Op `720px` verdwijnen `.role-header-chip-name` en `.role-header-back` (terug-knop overbodig op mobiel — gebruikers swipen). Op `480px` verdwijnen `.role-nav-label` en `.role-nav-badge` — alleen icoontjes blijven zichtbaar in nav. Compacte mobile UX.

### Bonus polish

- `.role-header-nav` krijgt `overflow-x: auto` + verborgen scrollbar (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`) — als nav-items niet passen scrolt de nav horizontaal in plaats van te wrappen of te clippen.
- `.role-header-actions` krijgt `flex-shrink: 0` — actions blijven altijd zichtbaar, alleen nav scrolt.
- `.role-header` padding gehalveerd van `0 24px` naar `8px 24px` voor een rustigere verticale ritme.

## Onverwachte vondsten

- **Topbar inline CSS niet aangepakt**: de `.topbar` z-index:100 zit in `buddy-dashboard.html` zelf (inline `<style>`), niet in `css/style.css`. Ik heb deze NIET verlaagd om geen risico te lopen op visuele regressies in andere pagina's die `.topbar` ook gebruiken (chat.html, etc.). In plaats daarvan heeft role-header een hogere z-index (110) gekregen — defensieve fix die geen andere pagina's raakt.
- **Twee top-bars boven elkaar blijft visueel druk**: de oude `.topbar` (logo + Privacy/Spelregels/Terug/Uit) zit nog ONDER de nieuwe role-header. Voor MVP acceptabel, maar overweeg in latere run de oude topbar te verwijderen of subtieler te maken (alleen logo) nu de role-header dezelfde back/logout actions heeft.
- **`.role-nav-item.active:hover` was nodig**: zonder deze rule zou de active-pill zijn donkere kleur verliezen op hover (zou veranderen naar de grijze hover-bg). Toegevoegd aan zowel default als de buddy-paars-override.

## Smoke-test door Barry

| Test | Verwachting |
|---|---|
| Click op nav-items (Overzicht/Matches/Profiel) werkt | ✅ z-index fix: nav nu klikbaar ook bij scroll |
| Click op "Mijn berichten" navigeert naar mijn-berichten.html | ✅ externe href ongewijzigd |
| Click op "Mijn notities" doet niets | ✅ disabled + pointer-events:none |
| Active-state visueel: gevulde paarse pill (geen onderlijn) | ✅ body[data-role="gepensioneerd"] override |
| Hover op niet-actief item: lichte grijze background | ✅ |
| Action buttons (🔔 ← Uit) zonder borders, alleen op hover bg | ✅ |
| Resize browser naar < 720px | ✅ chip-naam + terug-knop verdwijnen |
| Resize browser naar < 480px | ✅ alleen icoontjes in nav, labels weg |
| Console clean | ✅ geen errors verwacht |
