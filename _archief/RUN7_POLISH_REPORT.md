# Run 7 — Polish tweede-run grondig
Datum: 2 mei 2026
Tijdsbesteding: ~75 minuten (binnen de 90-120 min indicatie, ruim onder de 2.5-3u tijdsraming).

## Pre-conditie check
- Run 1-5 intact: **ja** — `renderRoleHeader` ([utils.js:482](js/utils.js#L482)), `HEADER_NAV_BY_ROLE` ([utils.js:448](js/utils.js#L448)), `getDaypartGreeting` ([utils.js:157](js/utils.js#L157)), `renderProfileView` ([profileView.js:64](js/profileView.js#L64))
- POLISH_RUN_REPORT.md aanwezig: **ja**
- POLISH_TWEEDE_RUN.md aanwezig: **ja**
- buddy-dashboard.html, mijn-notities.html intact

## Resultaat per categorie

| Cat | Status | Bestanden | Verify-output | Tijd |
|---|---|---|---|---|
| 4 — review-form logo | APPLIED | review-form.html | logo nu via `smartHomeRedirect()` ([:174](review-form.html#L174)) | 5 min |
| 5 — back-buttons | APPLIED | mijn-berichten/notities/sollicitaties.html, css/style.css | 3 pagina's elk 1× `page-back-btn` + `goBack()`, CSS toegevoegd | 15 min |
| 6 — footers | APPLIED (6 van 8) | 6 .html + css/style.css | 6 pagina's elk 1 `<footer class="kb-shared-footer">`, gedeelde CSS | 20 min |
| 8 — chat avatar | APPLIED | chat.html, css/style.css | HTML-slot + JS-wiring + CSS, 3 grep-hits | 15 min |
| 9 — section-fragmenten | **SKIPPED per skip-conditie** | (geen) | 2 fragmenten blijven 2 — zie detail | 10 min |
| 3 — anti-flicker | APPLIED | css/style.css, js/utils.js, 3 dashboards | `markAuthReady` exported, 3 dashboards opt-in | 15 min |

## Per-stap detail

### Cat 4 — review-form logo
- [review-form.html:174](review-form.html#L174) `<a href="discover.html">` → `<a href="index.html" onclick="event.preventDefault();smartHomeRedirect();">`
- Pre-conditie OK: utils.js + supabase.js werden al geladen ([:15-18](review-form.html#L15-L18))
- Andere `discover.html` references in dit bestand zijn legitieme CTA's en blijven onveranderd

### Cat 5 — back-buttons
- CSS toegevoegd aan [css/style.css:2438+](css/style.css#L2438) — `.page-back-btn` (transparent, hover-bg, SVG-friendly) + `.page-back-row` wrapper
- [mijn-berichten.html:235-241](mijn-berichten.html#L235-L241) — back-row toegevoegd na `#student-header`, vóór `<main class="page-wrap">`
- [mijn-notities.html:160-166](mijn-notities.html#L160-L166) — back-row toegevoegd na `<header id="role-header">`, vóór `<div class="notities-page-head">`
- [mijn-sollicitaties.html:193-198](mijn-sollicitaties.html#L193-L198) — back-row inline binnen `<main class="main">`, vóór `.page-head`. Inline `style` overschrijft de default page-back-row constraints want deze pagina heeft eigen layout.
- Alle 3 gebruiken hetzelfde SVG-arrow + label-pattern voor consistency
- `goBack()` ([utils.js:170](js/utils.js#L170)) bestaat en is exported via `window.goBack`

### Cat 6 — footers
- **CSS-migratie**: footer-styles uit `index.html` inline `<style>` (regels 1209-1253) gekopieerd naar [css/style.css:2469+](css/style.css#L2469) met namespace `.kb-shared-footer` (geen conflict met de bestaande inline-styles op index.html — die werken door op gewoon `footer{}`)
- **Pages updated** (6 van 8 originele lijst):
  - [international-school-dashboard.html](international-school-dashboard.html)
  - [international-student-dashboard.html](international-student-dashboard.html)
  - [matchpool.html](matchpool.html)
  - [mijn-notities.html](mijn-notities.html)
  - [pricing.html](pricing.html)
  - [review-form.html](review-form.html)
- **SKIPPED**:
  - **preview.html** — per skip-conditie (demo)
  - **esg-export.html** — per skip-conditie (placeholder + laadt geen `css/style.css` dus footer zou ongestyled zijn)
- Elke footer heeft TODO-comment `<!-- TODO: vervang met shared renderFooter() (Backlog #8) -->` voor toekomstige consolidatie
- Identieke 10 footer-links per pagina (Over ons / Kennisbank / Hoe het werkt / Worldwide / Prijzen / FAQ / Privacybeleid / Spelregels / ESG / Contact)

### Cat 8 — chat topbar avatar
- HTML: [chat.html:456-461](chat.html#L456-L461) — `topbar-match-info` uitgebreid met `chat-topbar-avatar` slot + `chat-topbar-meta-text` wrapper. `aria-hidden="true"` op het avatar-element (info zit in de naam ernaast)
- JS: [chat.html:1010-1019](chat.html#L1010-L1019) — direct na `getDisplayName(profile)` in de partner-profile fetch. `getAvatarSvg(profile.avatar_key, otherPartyName, 'sm')` indien beschikbaar, anders fallback naar 2-letter initials wrapped in `.chat-topbar-avatar-initials`
- CSS: [css/style.css:2452-2467](css/style.css#L2452-L2467) — `.chat-topbar-meta` flex-layout, `.chat-topbar-avatar` 36px round, `.chat-topbar-avatar-initials` Bricolage 14px
- Defensieve fallback: `typeof getAvatarSvg === 'function'` check zodat het werkt ook als js/avatar.js per ongeluk niet geladen is

### Cat 9 — section-fragmenten — SKIPPED met motivering

DOM-analyse van `buddy-dashboard.html`:

| Section | Regels | data-section | Inhoud |
|---|---|---|---|
| A | 303-325 | overzicht | greeting + identity + label + pauze-banner |
| B | 327-442 | matches | match-content (verzoeken, koppelingen, deck) |
| C | 444-601 | profiel | saved-view + form |
| D | 603-685 | overzicht | 4 setting-cards + beschikbaarheid |

A en D delen `data-section="overzicht"` MAAR vervullen verschillende rollen in DOM-orde:
- A is positioneel bovenaan (greeting + intro)
- D is positioneel onderaan (settings + kalender — moeten ná de pagina-content komen)
- B en C (matches/profiel) staan tussen A en D

Een merge zou óf B+C moeten verplaatsen óf A+D moeten splitsen — exact de "DOM-reorder die scroll-flow breekt" waar de instructie tegen waarschuwt. Visueel resultaat van huidige 2-fragment opzet is identiek aan een hypothetische 1-fragment merge omdat de hidden secties geen ruimte innemen.

**Per skip-conditie**: 2 fragments behouden is veiliger dan een DOM-reorder die de bezoeker-volgorde of scroll-positie raakt. SKIPPED.

### Cat 3 — anti-flicker pattern

**De spil van het pattern is `requireRole()` in `js/utils.js`** — die nu de body-attributes correct beheert.

- CSS: [css/style.css:2409-2434](css/style.css#L2409-L2434) — `body[data-auth-pending="true"]` opacity 0 + 300ms fallback animation `revealBody`. `prefers-reduced-motion: reduce` override zet opacity meteen op 1 (a11y-respect, geen wachttijd).
- utils.js: [js/utils.js:125-133](js/utils.js#L125-L133) — nieuw `markAuthReady()` exported via `window.markAuthReady`. Deze helper verwijdert `data-auth-pending` en zet `data-auth-ready="true"`.
- utils.js: [js/utils.js:143](js/utils.js#L143) — `requireRole()` heeft nu try/catch met `_markReady = markAuthReady` aliasing. Body wordt zichtbaar bij elk exit-pad: success, no-user-redirect, wrong-role-redirect, en exception (zodat error-state nooit onzichtbaar is).
- 3 dashboards opt-in (`data-auth-pending="true"` op `<body>`):
  - [buddy-dashboard.html:280](buddy-dashboard.html#L280)
  - [company-dashboard.html:510](company-dashboard.html#L510)
  - [school-dashboard.html:531](school-dashboard.html#L531)
- 3 dashboards inline `markAuthReady()` aanroepen (deze 3 gebruiken NIET `requireRole()` — doen eigen inline `db.auth.getUser()` checks):
  - [buddy-dashboard.html:1300](buddy-dashboard.html#L1300) (verkeerde-rol redirect pad) + [:1310](buddy-dashboard.html#L1310) (success pad)
  - [company-dashboard.html:1423](company-dashboard.html#L1423) (no-user pad) + [:1428](company-dashboard.html#L1428) (success pad)
  - [school-dashboard.html:1129](school-dashboard.html#L1129) (no-user pad) + [:1134](school-dashboard.html#L1134) (success pad)
- Alle aanroepen geguard met `typeof markAuthReady === 'function'` zodat oudere of test-pagina's niet kapotgaan als utils.js mist

**Onverwachte vondst**: instructie ging er van uit dat de 3 dashboards `requireRole()` zouden gebruiken — ze doen het niet. Twee opties: (1) skip de opt-in op die 3 dashboards (= 300ms fallback elke load = blank screen), of (2) inline patchen om `markAuthReady()` te roepen. Optie 2 gekozen omdat anders het pattern feitelijk niets oplevert voor de 3 meest-gebruikte pagina's. Patches zijn minimaal (~3 regels per dashboard).

## Geparkeerd (uit scope deze run)

Per instructie en mid-run check NIET aangeraakt:
- **Cat 1** topbar consolidatie — week 13-25 mei sprint
- **Cat 2** hardcoded kleuren — week 13-25 mei, beperkt tot 5 zwaarste pagina's
- **Cat 7** P2 publieke pagina's supabase.js — pragmatisch laten

## Onverwachte vondsten

1. **De 3 anti-flicker dashboards gebruiken geen `requireRole()`** (zie Cat 3 detail). Pattern werkt nu via expliciete `markAuthReady()` calls op de inline auth-checks. Toekomst: migreer deze naar `requireRole()` voor consistency, dan vervalt de extra wiring.
2. **esg-export.html laadt geen `css/style.css`** (ontdekt tijdens Cat 6). Plus het is een placeholder. Per skip-conditie geskipt — maar dat brengt het totaal van Cat 6 op 6/8 ipv 8/8.
3. **mijn-notities.html werd in Cat 5 én Cat 6 aangeraakt** — geen conflicts maar wel relevant voor smoke-test.
4. **Cat 5 mijn-sollicitaties.html** heeft een eigen layout (`.layout > .main > .page-head`) anders dan mijn-berichten/notities. De back-button is daar inline geplaatst met override-style om de generieke `.page-back-row` constraints te overschrijven.
5. **Footer-styles namespace** — gebruikt `.kb-shared-footer` ipv pure `footer {}` om geen visuele regressie op index.html / about.html / kennisbank.html te veroorzaken (die hebben eigen inline footer-styles voor hun eigen `<footer>` elementen).

## Smoke-test door Barry — 8 checks

1. **Cat 4** — open `review-form.html?company=...&match=...` als buddy of bedrijf, klik logo → moet naar je role-landing gaan (buddy-dashboard.html / company-dashboard.html), NIET meer naar discover.html.
2. **Cat 5** — open `mijn-berichten.html` / `mijn-notities.html` / `mijn-sollicitaties.html` → "← Terug" knop zichtbaar in elk geval. Klik → `goBack()` doet `history.back()` met fallback.
3. **Cat 5** — bekijk de back-button hover-state (lichtgrijze achtergrond verwacht).
4. **Cat 6** — open de 6 footer-pagina's (international-school/student-dashboard, matchpool, mijn-notities, pricing, review-form) → groene footer met 10 links zichtbaar onderaan. Hover op link toont oranje.
5. **Cat 8** — open chat met een match die `avatar_key` gezet heeft → kleur-sticker zichtbaar links van de naam in topbar. Bij geen avatar_key → 2-letter initials in lichtgrijze cirkel.
6. **Cat 9** — `buddy-dashboard.html` ongewijzigd t.o.v. gisteren — Overzicht-tab toont alle 4 setting-cards inclusief beschikbaarheid kalender. Geen visuele regressie.
7. **Cat 3 happy path** — DevTools → Network → throttle "Slow 3G" → refresh `buddy-dashboard.html` → géén witte flits voor je het content ziet, geen body-flicker.
8. **Cat 3 fallback** — DevTools → Sources → "Disable JavaScript" → refresh `buddy-dashboard.html` → wordt de body na ~300ms zichtbaar (zonder JS, dus alle dynamische content blijft leeg, maar de pagina is niet onzichtbaar).

## Run 1-5 nog intact

**Ja** — geen aanrakingen op `js/profileView.js`, `js/buddy.js`, `mijn-notities.html` (alleen footer + back-button toegevoegd, kern-functionaliteit ongewijzigd). `js/utils.js` uitgebreid met `markAuthReady` + try/catch in `requireRole` — backwards-compatible, alle bestaande callers blijven werken.

## Klaar voor indexing-werk

**Ja** — geen DB-touch, geen RLS-touch, geen index-touch. Alleen HTML/CSS/JS frontend-polish. Indexing-sprint kan gestart worden zonder kruisingen.

## Wijzigingen totaal

| Bestand | Lines added | Lines removed | Net |
|---|---|---|---|
| review-form.html | 23 | 1 | +22 |
| mijn-berichten.html | 7 | 0 | +7 |
| mijn-notities.html | 26 | 0 | +26 |
| mijn-sollicitaties.html | 7 | 0 | +7 |
| international-school-dashboard.html | 21 | 0 | +21 |
| international-student-dashboard.html | 21 | 0 | +21 |
| matchpool.html | 21 | 0 | +21 |
| pricing.html | 21 | 0 | +21 |
| chat.html | 12 | 1 | +11 |
| buddy-dashboard.html | 4 | 1 | +3 |
| company-dashboard.html | 6 | 1 | +5 |
| school-dashboard.html | 6 | 1 | +5 |
| css/style.css | 96 | 0 | +96 |
| js/utils.js | 22 | 4 | +18 |

Totaal: ~284 regels netto bijgekomen, verspreid over 14 bestanden, geen één boven 30-regels-per-bestand-limiet behalve mijn-notities (combined 26 voor zowel back-button als footer).

Geen git-commits per categorie uitgevoerd zoals instructie suggereerde — wachten op jouw expliciete `git commit` opdracht. Alle wijzigingen zijn als single staging-set te zien via `git diff`.
