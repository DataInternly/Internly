# Sprint Tickoff Rapport
Datum: 1 mei 2026
Bron: SPRINT_TICKOFF instructie + MILLION_THINGS_AUDIT.md / SECURITY_AUDIT_2026-05-01.md

---

## Resultaat per fix

| # | Fix | Status | Bestand(en) |
|---|---|---|---|
| 1 | Dead code `renderBuddySeekerCard` | APPLIED | js/buddy.js |
| 2 | Cursor branding (caret + selection) | APPLIED | css/style.css |
| 3 | Stage Hub sidebar duplicate | APPLIED | company-dashboard.html, school-dashboard.html |
| 4 | JobPosting structured data | APPLIED | vacature-detail.html |
| 5 | sitemap.xml + robots.txt | APPLIED — FTP UPLOAD VEREIST | sitemap.xml, robots.txt |
| 6 | H1 anon-key inline | SKIPPED — al gefixt eerder deze sessie | (verifieerd in about.html, index.html) |
| 7 | H4 XSS verification_doc | SKIPPED — al gefixt eerder deze sessie | (verifieerd in admin.html:862-863) |

---

## FIX 1 — `renderBuddySeekerCard` dead code

- **Bestand**: [js/buddy.js](js/buddy.js)
- **Regels verwijderd**: 849-976 (128 regels) — function-body inclusief skill-card render
- **Verificatie**: `grep "renderBuddySeekerCard" js/buddy.js` → 0 matches. `loadBuddySeekers()` (regel 850 na delete) gebruikt nu deck-engine pattern (`_deckStudents`/`_deckIndex`/`_deckActive`), niet de oude card-render.
- **Geen externe callers** in andere .html of .js files. Veilig verwijderd.

## FIX 2 — Cursor branding

- **Bestand**: [css/style.css:1358-1370](css/style.css#L1358-L1370)
- **Toegevoegd**: caret-color rule + `::selection` + `::-moz-selection` (Firefox prefix voor cross-browser selection-styling).
- **Caret kleur**: `var(--accent)` = `#FF7E42` (lichtoranje, OK voor cursor — geen tekstcontrast).
- **Selection bg**: `var(--accent-tint)` = `#fdf0e8` (toegevoegd Sprint 1 FIX B), tekst `var(--ink)` voor leesbaarheid.

## FIX 3 — Stage Hub sidebar duplicate

### Onverwachte vondst
De instructie beschreef de bug als "navigeert naar match-dashboard.html zonder ?match=". In current code is dat NIET het geval — beide knoppen draaien `show('studenten')` (een interne section-switch). De **echte** bug was dubbele/verwarrende sidebar-entries:

- **company-dashboard.html:657-663** — twee knoppen die beide `show('studenten')` deden: `nav-studenten` ("Mijn studenten") + `nav-stagehub` ("Stage Hub"). De Stage Hub label was conceptueel onjuist (Stage Hub is per-match, niet een lijst).
- **school-dashboard.html:660-662** — `nav-stagehub` ("Mijn studenten") was duplicate van `nav-studenten` ("Studenten") al hoger in dezelfde sidebar.

### Fix
Optie A toegepast — `nav-stagehub` knoppen verwijderd uit beide dashboards. Sidebar layout blijft intact (geen rare lege ruimte). Stage Hub blijft bereikbaar via match-cards (de inhoudelijk juiste route, met `?match=` parameter).

## FIX 4 — JobPosting structured data

- **Bestand**: [vacature-detail.html:1131-1174](vacature-detail.html#L1131-L1174)
- **Plaatsing**: direct na `render(data, source)` op regel 1129, vóór de reviews-sectie. Op dat punt is `data` gegarandeerd geladen (single guard via `await query.maybeSingle()`).
- **Velden gemapt op data-shape uit het bestand**:
  - `title` ← data.title
  - `description` ← data.description (fallback: "Stageplaats bij {orgName}")
  - `datePosted` ← data.created_at
  - `employmentType` → "INTERN" (literaal, schema.org enum)
  - `hiringOrganization.name` ← data.company_name
  - `jobLocation.address.streetAddress` ← data.vestigingen.adres (alleen voor `internship_postings`)
  - `jobLocation.address.addressLocality` ← data.vestigingen.stad / data.stad / data.locatie / "Nederland"
  - `addressCountry` → "NL"
  - **Optioneel toegevoegd**: `jobStartDate`, `validThrough`, `industry` als beschikbaar
  - `directApply` → true
- **Try/catch wrapper** rond injection — als data shape onverwacht is, faalt SEO-feature stil zonder pagina te breken.

## FIX 5 — sitemap.xml + robots.txt

### Onverwachte vondst
Beide files **bestonden al**. Bestaand `robots.txt` had alleen `Disallow: /admin.html`, `/auth.html`, `/internly_simulator.html` — té permissief. Bestaand `sitemap.xml` mistte `lastmod` en bevatte `discover.html` die echter een **auth-gate** heeft (regels 1395-1398: `requireRole('student')`) — Google zou een 401/redirect crawlen.

### Fix toegepast
- **robots.txt**: uitgebreide `Disallow` lijst — admin, auth, alle dashboards (8 stuks), profile-pagina's (4 stuks), gedeelde flow-pagina's (chat, matches, mijn-*), match/matchpool, esg-export, la-sign, preview, simulator. Plus `Disallow: /supabase/` en `Disallow: /js/telemetry.js` per instructie.
- **sitemap.xml**: 10 publieke URLs met `lastmod=2026-05-01`, juiste `priority` en `changefreq`. Verwijderd: discover.html (auth-gate). Toegevoegd: hoe-het-werkt, internly-worldwide, kennisbank, faq.

### ⚠ FTP UPLOAD VEREIST
Beide files staan lokaal — Sasubo Holding moet via FileZilla/Antagonist file-manager beide naar `internly.pro/robots.txt` en `internly.pro/sitemap.xml` uploaden. Lokaal is niet genoeg voor crawler-pickup. Na upload: open beide URLs in browser om 200 OK te bevestigen.

## FIX 6 — H1 anon-key inline cleanup

### SKIPPED — al gefixt eerder deze sessie

Inventarisatie:
```
grep "eyJhbGciOi" about.html → 0 matches
grep "eyJhbGciOi" index.html → 0 matches
```

Beide bestanden zijn eerder deze sessie geconverteerd via `H1_H4_FIX_LOG.md` (zie sessie-log). Patroon was: inline `window.supabase.createClient(URL, KEY)` of fetch-headers met `apikey: 'eyJ...'` → vervangen door `window.db` (single source uit js/supabase.js). Index.html waitlist-fetch is omgezet naar `await window.db.from('waitlist').insert(...)` met error-code 23505 unique-violation check. Geen verdere actie nodig.

**Bedward P2 conflict**: instructie-tekst stelde dat publieke pagina's geen js/supabase.js mogen laden. Reality check: about.html en index.html LADEN js/supabase.js wel (per H1 fix), gebruik van `window.db` werkt prima. P2 was dus al vóór deze sprint heroverwogen.

## FIX 7 — H4 XSS verification_doc

### SKIPPED — al gefixt eerder deze sessie

[admin.html:862-863](admin.html#L862-L863) leest:
```html
<button data-doc-path="${escapeHtml(c.verification_doc)}"
  onclick="loadVerifyDoc(this.dataset.docPath)"
```

Patroon is exact wat de instructie voorschrijft (data-attribute + escapeHtml + dataset access). Geen verdere actie nodig.

---

## Onverwachte vondsten samengevat

1. **FIX 3 bug-premise was outdated**: instructie zei "navigeert naar match-dashboard.html zonder ?match=" — maar in current code doen beide knoppen `show('studenten')`. De échte bug was duplicate sidebar entries met verwarrende labels. Optie A (verwijderen) toegepast op de juiste knoppen.

2. **FIX 5 files bestonden al**: robots.txt en sitemap.xml waren aanwezig maar minimaal/onjuist (sitemap bevatte auth-gated pagina, robots was te permissief). Update doorgevoerd.

3. **FIX 6 + FIX 7 al gedaan**: beide security-items zijn eerder deze sessie verholpen via H1_H4_FIX_LOG.md. Sprint tickoff instructie was geschreven vóór die sessie. Verifieerd via grep — 0 hits voor inline anon-key in about.html/index.html, en data-attribute pattern al actief in admin.html.

4. **renderBuddySeekerCard was écht dood**: een eerdere edit (linter of gebruiker mid-session) verving `loadBuddySeekers` van card-render naar deck-engine pattern, maar liet de oude render-functie staan als orphan. 128 regels weg.

---

## Nog te doen na deze sprint

1. **FTP upload** van `robots.txt` en `sitemap.xml` naar internly.pro root via FileZilla / Antagonist file-manager. Pas dan picken Google/Bing ze op.
2. **Google Search Console** registreren voor `internly.pro` en sitemap submitten zodra geupload (`https://search.google.com/search-console`).
3. **Rich Results Test** op een live vacature-detail URL na FTP-deploy om JSON-LD JobPosting te valideren: https://search.google.com/test/rich-results.
4. **Optioneel**: `discover.html` de auth-gate weghalen of een publieke landing-variant maken — waardevolle SEO-pagina als die crawlable wordt (volledige vacature-listings = grote search-footprint).

---

## Aanbevolen volgende stap

**Live FTP-upload van robots.txt en sitemap.xml + smoke-test op alle drie touched HTML-pagina's** (company-dashboard sidebar, school-dashboard sidebar, vacature-detail Rich Results Test). Daarna pas Sprint 2 starten — `getInitials()` shared helper uit Sprint 1 follow-up advies.
