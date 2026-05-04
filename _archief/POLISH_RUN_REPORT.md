# Polish Run — Websitebrede consistentie sweep
Datum: 2 mei 2026
Tijdsbesteding: ~25 minuten (audit-fase + 1 fix + 2 rapporten)

## Pre-conditie check
- Run 1-5 intact: **ja** — `renderRoleHeader` ([utils.js:482](js/utils.js#L482)), `withSaveLock` ([utils.js:305](js/utils.js#L305)), `getDaypartGreeting` ([utils.js:157](js/utils.js#L157)), `renderProfileView` ([profileView.js:64](js/profileView.js#L64)), `mijn-notities.html` aanwezig (12793 bytes, 1 mei 12:30).
- AUDIT_NAV_AUTH_BUDDY.md bestond niet als bestand op disk — wel verstrekt in vorige chat-turn als ground truth voor 41 .html files + auth-guard pattern matrix; gebruikt als referentie.

## Wat is APPLIED (klein/zeker)

| Categorie | Wat | Bestand | Hoeveel |
|---|---|---|---|
| D2 welcomeMsg legacy | CSS rules `.welcome-head` + `.welcome-sub` verwijderd | buddy-dashboard.html | -2 regels CSS |
| D2 welcomeMsg legacy | Twee hidden divs (`#welcomeMsg` + `.welcome-sub`) verwijderd | buddy-dashboard.html | -2 regels HTML |
| D2 welcomeMsg legacy | Dead `welcomeMsg.textContent` init + dode `h`/`greeting` vars | buddy-dashboard.html | -3 regels JS |

**Totaal**: 7 regels weg uit één bestand. Ruim binnen de 30-regel-per-bestand-limiet.

## Per-categorie detail

### D2 — welcomeMsg legacy (APPLIED)
- `.welcome-head` + `.welcome-sub` CSS rules ([buddy-dashboard.html:84-85](buddy-dashboard.html#L84-L85)) verwijderd
- Hidden divs `<div class="welcome-head" id="welcomeMsg" hidden>` + sub ([buddy-dashboard.html:306-307](buddy-dashboard.html#L306-L307)) verwijderd
- Init-block "3. Welkomstgroet" gereduceerd: alleen `topbarUser.textContent = naam` blijft. Greeting wordt nu via `overz-greeting-text` + `getDaypartGreeting(naam)` gerenderd (Run4 RUN4_OVERZICHT_REDESIGN_REPORT)
- Verificatie: 0 hits voor `welcomeMsg` in buddy-dashboard.html nu, andere dashboards (bbl-dashboard, begeleider-dashboard) blijven intact met eigen `welcomeMsg` references

### B3 — page-title consistentie (NO ACTION nodig)
Alle 41 pagina's volgen `<title>... — Internly</title>` patroon. Geverifieerd via BLOK 1 van AUDIT_NAV_AUTH_BUDDY.md. Geen fix nodig.

### C1 — dead code (NO ACTION nodig)
- `renderBuddySeekerCard`: 0 hits in js/buddy.js (al verwijderd in eerdere run)
- 0 hits voor `TODO_REMOVE` markers
- Niets te verwijderen.

### C2 — duplicate CSS (NO ACTION nodig)
- `.topbar` 1× gedefinieerd in css/style.css (op pagina-niveau zit het in inline `<style>` blokken — dat is niet duplicate maar overlap; zie A1 in tweede-run rapport)
- `.shell` 0× in style.css — bestaat alleen inline in dashboards
- Geen duplicaten te dedupliceren binnen style.css zelf.

### C4 — console.log (NO ACTION nodig)
- HTML: 0 hits
- JS: 2 hits — beide `[self-test]` markers in `js/animations/match-celebrate.js:371` en `js/profanity.js:113` (intentioneel, geen debug)

## Wat NIET gedaan (zie POLISH_TWEEDE_RUN.md)

| Categorie | Reden |
|---|---|
| A1 Topbar inline-style consolidatie | 10 dashboards hebben 5-18 inline `.topbar` rules — >2 inconsistenties → tweede-run |
| A2 Hardcoded kleuren | Per-page 5-122 hits, totaal honderden — >5/page → tweede-run |
| A3 Loading-states / body-opacity | 0 pagina's hebben de pattern — vereist structurele toevoeging op meerdere bestanden → tweede-run |
| A4 Footer inventaris | 9/41 pagina's missen footer — Backlog #8 → tweede-run |
| B1 Logo-click bypass | 5 pagina's gebruiken direct `href` ipv `smartHomeRedirect` (vooral publieke pagina's) → tweede-run |
| B2 Back-button affordance | 3 mijn-* pagina's missen back-knop, gecompenseerd door top-nav → tweede-run |
| B4 Auth-guard race | Geen race conditions gevonden, niets te fixen — geen apart rapport-item |
| C3 Publieke supabase.js | Per instructie: "RAPPORTEER NIET FIXEN" → tweede-run |
| D1 Chat topbar avatar | Per instructie: micro-feature, geen polish → tweede-run |
| D3 Two overzicht-fragmenten | Per instructie: vereist DOM-reorder → tweede-run |

## Smoke-test door Barry

Top 5 visueel te checken na deze sweep:

1. **buddy-dashboard.html** — laad de pagina. Zie je nog steeds de greeting bovenaan ("Goedemorgen, [naam]" of vergelijkbaar)? Het komt nu enkel uit `overz-greeting`, niet meer uit het oude `welcomeMsg`-blok. Als de greeting weg is, is `getDaypartGreeting` of de Run4 init-flow gebroken.
2. **buddy-dashboard.html** — `topbarUser` rechtsboven moet nog steeds de naam tonen.
3. **bbl-dashboard.html** — eigen `welcomeMsg`-element ongemoeid, moet nog steeds "Goedemorgen, [naam]" tonen ([bbl-dashboard.html:510](bbl-dashboard.html#L510)).
4. **begeleider-dashboard.html** — eigen `welcomeMsg` ongemoeid, init-line 1015 + 1264 moet nog steeds werken.
5. **Console** — geen `Cannot read properties of null (reading 'textContent')` op buddy-dashboard.

## Klaar voor indexing-werk

**Ja**. Geen DB-touch, geen RLS-touch, geen index-touch. Eén kosmetische fix in één HTML-bestand. RLS-policies en index-werk kunnen los hierna in de aparte sprints van vandaag.

## Onverwachte vondsten

- Bash-script voor footer-inventaris had een minor kwoting-issue (integer compare op multi-line string); herhaald met simpeler conditie en alle 41 pagina's geïnventariseerd zonder problemen.
- `auth.html` en `privacybeleid.html` gebruiken bewust geen `smartHomeRedirect` — auth.html is de bestemming zelf, privacybeleid is volledig statisch zonder utils.js geladen. Niet een bug, maar wel relevant voor de tweede-run B1 inventaris.
- Buddy-dashboard had naast `welcomeMsg` ook lokale `h` en `greeting` variabelen die alleen voor de dode textContent-call werden gebruikt — meegenomen in de cleanup.
