# Polish Tweede Run — Beslissingen vereist van Barry
Datum: 2 mei 2026

Negen items, ruwweg gesorteerd op impact. Items 1-3 hebben de hoogste polish-return-on-effort. Items 7-9 zijn architectuur-keuzes die buiten een polish-sprint horen.

---

## Categorie 1 — Topbar inline-style consolidatie (A1)

**Bevinding**: 10 dashboard-pagina's hebben elk 5-18 eigen inline `.topbar` style-rules in hun `<style>` blok. Range: bbl-dashboard 18, bbl-hub 17, buddy-dashboard 11, chat 10, bol-profile 8, school/admin/company 6, begeleider 5. Match-dashboard en mijn-* pagina's hebben 0 (waarschijnlijk omdat ze via shared header werken of een andere header-class gebruiken).

**Aantal pagina's**: 10 met inline topbar-CSS. Totaal ~100 rules verspreid.

**Voorstel**:
- **Optie A** — alle inline topbar-rules naar `css/style.css` consolideren, één canonical `.topbar` class. Hoge ROI maar visuele regressie-risico (sommige dashboards hebben subtiele kleur/height-verschillen die intentioneel kunnen zijn).
- **Optie B** — alle dashboards laten doorrenderen via `renderRoleHeader()` of `renderStudentHeader()` zoals buddy-dashboard, mijn-berichten, mijn-notities al doen. Meer werk maar consistenter eindplaatje.
- **Optie C** — laten zoals het is. Niet kapot.

**Tijds-inschatting**: Optie A 1-2 uur, Optie B 4-6 uur (vereist HTML-restructure per dashboard).

**Risico**: visuele regressies op live dashboards. Topbar zit op elke ingelogde pagina — eén verkeerde rule en alles ziet er raar uit.

**Beslissing van Barry vereist**: gaan we voor één unified topbar (Optie A/B) of accepteren we de huidige fragmentatie?

---

## Categorie 2 — Hardcoded styling cleanup (A2)

**Bevinding**: hardcoded hex-kleuren over alle dashboards. Per-page tellingen:

| Page | color: # | background: # |
|---|---|---|
| bbl-hub.html | **122** | **90** |
| company-dashboard.html | 59 | 29 |
| mijn-berichten.html | 47 | 30 |
| student-profile.html | 47 | 23 |
| chat.html | 43 | 28 |
| discover.html | 39 | 35 |
| buddy-dashboard.html | 35 | 14 |
| school-dashboard.html | 35 | 20 |
| match-dashboard.html | 34 | 43 |
| bbl-dashboard.html | 30 | 23 |
| admin.html | 20 | 10 |
| begeleider-dashboard.html | 16 | 4 |
| mijn-sollicitaties.html | 13 | 6 |
| matches.html | 11 | 5 |
| mijn-notities.html | 5 | 4 |

**Aantal hits**: ~600+ hardcoded kleuren totaal in productie HTML. CSS-variabelen (`--ink`, `--accent`, `--bg`, etc.) bestaan in style.css maar worden inconsistent gebruikt.

**Voorstel**:
- **Optie A** — per-page sprint: pagina-voor-pagina hardcoded `#0d1520` → `var(--ink)`, `#e05c1a` → `var(--accent)`, `#f4f3ef` → `var(--bg)`. Eén pagina per sessie, smoke-test ertussen.
- **Optie B** — automatisering met sed-script + grondige diff-review. Risico op false positives (hex-codes in JSON-data, in SVG paths, in licht/donker varianten).
- **Optie C** — accepteer fragmentatie zolang de visuele output klopt.

**Tijds-inschatting**: Optie A: ~30 min/pagina × 15 pagina's = 7-8 uur. Optie B: 2-3 uur incl. review.

**Risico**: enkele hex-codes zijn intentioneel afwijkend van de tokens (bv. donkere/lichte versies). Pure find/replace gevaarlijk.

**Beslissing van Barry vereist**: hoe belangrijk is design-token consistency vs. de kosten? Begin bij bbl-hub (122 hits — grootste)?

---

## Categorie 3 — Loading-state / body-opacity flicker (A3)

**Bevinding**: **0 pagina's** hebben het `body { opacity: 0; transition: opacity .2s }` + post-auth-check `body.style.opacity = '1'` patroon. Geen enkele dashboard voorkomt actief de "witte flits" voor het auth-check redirect. Op tragere verbindingen ziet de gebruiker bij elke navigatie naar een ingelogde pagina een korte flits van de page-content vóór de redirect (als die getriggerd wordt) of vóór de inhoud volledig is geladen.

**Aantal pagina's**: 19 dashboards/gateway-pagina's, allemaal zonder anti-flicker.

**Voorstel**:
- **Optie A** — voeg het patroon toe aan `js/utils.js` `requireRole()` zodat het automatisch werkt bij elke caller. Body-opacity 0 default + `requireRole` zet 'em op 1 na succes. Vereist body-CSS aanpassing in elke pagina.
- **Optie B** — alleen op de drie meest-gebruikte pagina's (buddy-dashboard, company-dashboard, school-dashboard). Pragmatisch.
- **Optie C** — accepteer de flits, focus op snellere auth-check.

**Tijds-inschatting**: Optie A 1-2 uur (en risico dat statische pagina's onbedoeld zwart blijven), Optie B 30 min.

**Risico**: als body opacity blokkeert ÉN auth-check faalt om welke reden dan ook → blanke pagina permanent. Nodig: timeout-fallback.

**Beslissing van Barry vereist**: is de witte flits écht een issue (heeft Barry het zelf gezien?) of theoretisch?

---

## Categorie 4 — Logo-click standaardisatie (B1)

**Bevinding**: 5 van 41 pagina's gebruiken direct `href` ipv `smartHomeRedirect()` voor de logo-click:
- `auth.html`: `<a href="index.html">` (correct — auth.html zelf, geen smartHome nodig)
- `privacybeleid.html`: `<a href="index.html">` (publiek, utils.js niet geladen)
- `review-form.html`: `<a href="discover.html">` (hardcoded discover — fout voor non-students)
- `spelregels.html`: `<a href="index.html">` (publiek)
- `stagebegeleiding.html`: `<a href="index.html">` (publiek)

Alle 36 andere pagina's volgen het `onclick="event.preventDefault();smartHomeRedirect();"` patroon correct.

**Aantal afwijkend**: 5, waarvan 1 echt verkeerd (review-form.html — als een buddy/bedrijf een review schrijft en op het logo klikt, gaat hij naar discover.html).

**Voorstel**:
- **Optie A — minimaal** — fix alleen review-form.html (verander `discover.html` href naar `index.html` of voeg `smartHomeRedirect`-onclick toe).
- **Optie B — volledig** — alle publieke pagina's krijgen ook `smartHomeRedirect` (vereist js/utils.js + js/supabase.js laden op privacybeleid + spelregels + stagebegeleiding).

**Tijds-inschatting**: Optie A 5 min, Optie B 30 min + Bedward P2 herwaardering.

**Risico**: Optie B raakt Bedward P2 (publieke pagina's geen Supabase) → grijze zone.

**Beslissing van Barry vereist**: is review-form.html-bug Optie-A-only fix? Geen B1-actie op publieke pagina's?

---

## Categorie 5 — Back-button affordance (B2)

**Bevinding**: 3 mijn-* pagina's missen een back-knop:
- `mijn-berichten.html` — 0 back-affordances
- `mijn-notities.html` — 0 back-affordances
- `mijn-sollicitaties.html` — 0 back-affordances

Deze pagina's worden via de top-nav (`renderRoleHeader` / `renderStudentHeader`) bereikt, dus user heeft altijd nav-links boven om mee te navigeren. Een aparte "← Terug" is functioneel niet strikt nodig.

Pagina's mét back-knop: chat (1), vacature-detail (3), student-profile (7), bol-profile (7), bbl-profile (1), review-form (2).

**Voorstel**:
- **Optie A — laat zoals het is** — top-nav voorziet in navigatie, "Terug" is redundant.
- **Optie B — voeg toe voor consistency** — minimale `<a class="topbar-back" onclick="goBack(...)">← Terug</a>` op de drie mijn-* pagina's.

**Tijds-inschatting**: Optie B ~15 min.

**Risico**: laag.

**Beslissing van Barry vereist**: visueel-consistency-prioriteit hoog genoeg om deze toe te voegen?

---

## Categorie 6 — Footer architectuur (Backlog #8 / A4)

**Bevinding**: 31 van 41 pagina's hebben een `<footer>` element. **9 pagina's missen footer**:
- `esg-export.html` — placeholder
- `international-school-dashboard.html` — actief dashboard
- `international-student-dashboard.html` — actief dashboard
- `matchpool.html` — actief
- `mijn-notities.html` — net gebouwd (Run5)
- `preview.html` — demo
- `pricing.html` — publiek!
- `review-form.html` — actief
- (esg-rapportage heeft er wel één)

**Aantal pagina's**: 9 zonder footer. `pricing.html` is meest opvallend (publieke pagina zonder footer).

**Voorstel**:
- **Optie A** — wachten op Backlog #8 footer-architectuur sprint (geconsolideerde shared footer).
- **Optie B** — quick-fix: kopieer footer van `kennisbank.html` of `index.html` naar de 9 missende pagina's.

**Tijds-inschatting**: Optie B 30 min.

**Risico**: Optie B duplicate-code, harder om centraal te updaten later.

**Beslissing van Barry vereist**: Backlog #8 inplannen of quick-fix nu?

---

## Categorie 7 — Publieke pagina supabase.js review (C3)

**Bevinding**: `about.html`, `kennisbank.html`, `pricing.html`, `faq.html` laden allemaal `js/supabase.js`. Niet om auth te enforcen, maar om "auth-aware UX" te bieden:
- kennisbank.html: `kbInitAuthCTA()` verbergt CTA-card als user ingelogd is
- about.html: `smartHomeRedirect` op logo-click
- pricing.html: 1× `getSession()` call (CTA-routing)
- faq.html: `smartHomeRedirect` op logo-click

Bedward P2 (CLAUDE.md) zegt: "publieke pagina's geen credentials/supabase.js". Dit is een grijze zone — we gebruiken `window.db` voor read-only auth-detectie, geen sensitive operaties.

**Voorstel**:
- **Optie A** — laten zoals het is. Auth-aware UX is een echte verbetering.
- **Optie B** — Bedward P2 strict naleven: verwijder `js/supabase.js` van de 4 publieke pagina's, accepteer dat ingelogde gebruikers de CTA's blijven zien.
- **Optie C** — verplaats de "auth-aware CTA" logica naar een aparte mini-loader die alleen `auth.getUser()` doet zonder volledige Supabase-client.

**Tijds-inschatting**: Optie B 15 min, Optie C 1 uur.

**Risico**: Optie B = downgrade in UX; Optie C = nieuw mini-systeem onderhouden.

**Beslissing van Barry vereist**: Bedward P2 letter of geest? Strict of pragmatisch?

---

## Categorie 8 — Chat topbar avatar (D1, micro-feature)

**Bevinding**: Run3 noemde dat `chat.html:1002` de `avatar_key` SELECT-uitvoert maar er is geen UI-slot in de topbar om het te tonen. Dat slot toevoegen vraagt:
- `<div class="topbar-match-avatar">` element in HTML
- CSS-styling
- `getAvatarSvg(avatar_key, otherPartyName, 'sm')` call in profile-fetch handler

**Aantal pagina's**: 1.

**Voorstel**:
- **Optie A** — bouw het. ~30 min werk, low risk, leuke micro-improvement.
- **Optie B** — laten staan, avatar_key-SELECT blijft dood-data tot een feature-sprint.

**Beslissing van Barry vereist**: prio voor visueel polish in chat-header?

---

## Categorie 9 — section-overzicht 2-fragmenten consolidatie (D3)

**Bevinding**: buddy-dashboard.html heeft 2 `<section data-section="overzicht">` fragmenten (een vóór en een na de matches/profiel sections). Werkt functioneel identiek aan 1 fragment maar oogt rommelig in de DOM.

**Aantal pagina's**: 1.

**Voorstel**: DOM-reorder zodat alle overzicht-content tussen één `<section>` zit. Vereist verplaatsing van matches-section en profiel-section ondernaar overzicht of bovenaan. Niet triviaal — sectie-volgorde beïnvloedt scroll-flow en je-eerste-blik UX.

**Tijds-inschatting**: 30-45 min incl. visuele test.

**Risico**: section-volgorde wijzigt; gebruikers landen mogelijk anders bij hash-routes.

**Beslissing van Barry vereist**: alleen cosmetisch DOM-cleanup waard? Of niet — werkt prima.

---

## Aanbeveling voor prioriteit

1. **Categorie 4 — Logo-click review-form bug (~5 min, lage risk, echte bug)**. Pak ASAP. Eén pagina, minimale wijziging.
2. **Categorie 8 — Chat topbar avatar (~30 min, low risk, hoge polish-return)**. Visuele consistency met avatar-sweep van Run3.
3. **Categorie 5 — Back-button op mijn-* pagina's (~15 min, low risk, consistency)**. Klein maar voelbaar voor gebruikers die scroll-down zonder te realiseren dat top-nav er is.

Lager prioriteit:
4. Categorie 6 (footer) — wacht op Backlog #8.
5. Categorie 1 (topbar consolidatie) — significante refactor, plan apart in.
6. Categorie 2 (hardcoded kleuren) — grootste werk, doe per-pagina.
7. Categorie 3 (body-opacity flicker) — eerst checken of het écht een UX-issue is.
8. Categorie 7 (Bedward P2) — architectuur-discussie, niet polish.
9. Categorie 9 (section-fragmenten) — pure cosmetisch DOM, laagste prio.
