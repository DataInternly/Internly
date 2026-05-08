# UNCOMMITTED ANALYSE — Pre-FTP triage
**Datum** 2026-05-04 · **Modus** READ-ONLY · **Vergelijking** working tree vs `origin/main`

12 files met wijzigingen die niet in vandaag's drie pakket-A/bedrijf-flow commits zaten. Per file: wat is veranderd, of het op afgemaakt werk lijkt, en een FTP-aanbeveling.

---

## CLAUDE.md
**Type**: modified
**Samenvatting**: +52 regels documentatie. Voegt `[Tech debt B-1]` requireRole-migratie regel toe en compleet nieuwe sectie "Auth-architectuur (Mei 2026)" met migratie-tabel, `guardPage()` API, voor- en nadelen, architectuur-principes.
**Status**: afgemaakt
**Aanbeveling**: niet uploaden
**Reden**: project-documentatie, blijft in repo. Wel committen voor traceability.

---

## about.html
**Type**: modified
**Samenvatting**: +1 regel. Voegt `<a href="kennisbank.html">Kennisbank</a>` toe aan footer-links tussen "FAQ" en "Blog".
**Status**: afgemaakt
**Aanbeveling**: klaar voor FTP
**Reden**: cosmetische footer-aanvulling, sluit aan bij kennisbank-routing van eerdere commits. Geen dependencies.

---

## js/buddy.js
**Type**: modified
**Samenvatting**: +678 regels. RUN2 buddy-profile uitbreiding: drie nieuwe content-velden (pitch, achtergrond, bio), `prefillBuddyForm` helper, `showBuddyOverzicht`/`showBuddyForm` met `renderProfileView`-saved-view, avatar_key integratie in upsert, en nieuwe `fetchBuddySeekers` voor buddy → student discovery.
**Status**: WIP — gekoppeld aan ongedeployde dependencies
**Aanbeveling**: twijfel
**Reden**: schrijft naar `pitch`/`achtergrond`/`bio`/`avatar_key` kolommen die alleen bestaan na `AVATAR_MIGRATION.sql` + `BACKLOG_MIGRATION.sql`. Roept `renderProfileView` aan uit ongedeployde `js/profileView.js`. Functioneert als coupled deploy (SQL + 3 JS + HTML-mutaties op buddy-dashboard.html), niet als losse upload. Buddy-dashboard.html zit niet in working-tree wijzigingen — onduidelijk of de saved-view containers (`buddy-profile-saved-view`, `buddy-profile-form-card`) al in productie HTML staan.

---

## js/calendar.js
**Type**: modified
**Samenvatting**: +10 regels. Voegt `.ical-instruction` CSS-class toe en een instructie-paragraaf in de kalender UI die de leeg → beschikbaar → voorkeur → bezet click-cycle uitlegt.
**Status**: afgemaakt
**Aanbeveling**: klaar voor FTP
**Reden**: pure UX-toelichting, zelfstandige aanpassing zonder DB- of HTML-dependencies. Verbetert kalender-discoverability voor livetest.

---

## pricing.html
**Type**: modified
**Samenvatting**: +1 regel. Voegt `<a href="blog.html">Blog</a>` toe aan footer-links onder "Kennisbank".
**Status**: afgemaakt
**Aanbeveling**: klaar voor FTP
**Reden**: footer-aanvulling consistent met about.html en andere publieke pagina's.

---

## robots.txt
**Type**: modified
**Samenvatting**: +24 regels. Toevoegt `Allow: /` bovenaan en uitgebreide Disallow-lijst voor 19+ auth-gated pagina's (chat, matches, dashboards, profielen, esg, preview, etc.) plus `/supabase/` en `/js/telemetry.js`.
**Status**: afgemaakt
**Aanbeveling**: klaar voor FTP
**Reden**: SEO-hygiene — voorkomt indexering van inlog-vereiste URLs. Hoort vóór livetest gedeployd te zijn anders crawlt Google auth-gated pagina's. Geen breakage-risico.

---

## sitemap.xml
**Type**: modified
**Samenvatting**: Voegt `<lastmod>2026-05-01</lastmod>` toe aan alle entries en nieuwe entries voor hoe-het-werkt, internly-worldwide, kennisbank, faq. Verwijdert `discover.html` (auth-gated, hoort niet in sitemap).
**Status**: afgemaakt
**Aanbeveling**: klaar voor FTP
**Reden**: SEO-update consistent met robots.txt — discover.html-removal sluit aan bij Disallow-toevoeging. Lastmod-datum 2026-05-01 is een paar dagen oud maar acceptabel.

---

## js/avatar.js
**Type**: untracked (nieuw bestand)
**Samenvatting**: Avatar-module met 14 vaste brand-avatars (geometrisch, brand-palette), picker UI helper, `getAvatarSvg()` display-helper. Gedateerd 30 april 2026. Doel: gedeelde selector op alle profielpagina's. Globale exports via `window`.
**Status**: afgemaakt (op basis van eerste 50 regels — module-structuur is compleet)
**Aanbeveling**: twijfel
**Reden**: zonder `AVATAR_MIGRATION.sql` slaan profielen `avatar_key=null` op (header zegt "Picker UI works without this"). Maar onduidelijk welke HTML-pagina's deze module daadwerkelijk includeren — niet getest. Hoort gedeployd te worden als coupled set met buddy.js + profileView.js + AVATAR_MIGRATION.sql.

---

## js/profileView.js
**Type**: untracked (nieuw bestand)
**Samenvatting**: Rol-aware saved-view profielkaart renderer met config-tabel per rol (gepensioneerd/student/...). Comment zegt "Eerste consumer: buddy-dashboard.html — andere rollen als stubs". Hangt af van js/avatar.js + js/utils.js.
**Status**: WIP — andere rol-stubs nog niet uitgewerkt
**Aanbeveling**: twijfel
**Reden**: gepensioneerd-config compleet, andere rollen onbekend zonder volledige file te lezen. Coupled aan buddy.js wijzigingen — buddy.js valt terug op console.warn als deze module ontbreekt, dus partial deploy is veilig maar levert geen feature op.

---

## js/welcome-overlay.js
**Type**: untracked (nieuw bestand)
**Samenvatting**: Eenmalige welkom-overlay na eerste login. Flag in `localStorage.internly_welcomed_<userId>`. Role uit DB (niet URL). Configs voor student, student_bbl, en (vermoedelijk) andere rollen. Gedateerd 1 mei 2026.
**Status**: afgemaakt (op basis van eerste 50 regels — heeft compleet ogende config-objecten)
**Aanbeveling**: twijfel
**Reden**: onduidelijk welke HTML-pagina's deze module includeren — geen `<script src="js/welcome-overlay.js">` reference geverifieerd. Als geen pagina hem laadt is upload zonder effect. Hoort gedeployd te worden samen met de pagina-wijzigingen die hem includeren (niet zichtbaar in working tree).

---

## AVATAR_MIGRATION.sql
**Type**: untracked (nieuw bestand)
**Samenvatting**: `ALTER TABLE` voor student_profiles, company_profiles, school_profiles, buddy_queue, bbl_student_profiles — voegt `avatar_key` en `avatar_url` kolommen toe. Idempotent met `IF NOT EXISTS`.
**Status**: afgemaakt
**Aanbeveling**: niet uploaden (geen FTP-bestemming)
**Reden**: SQL — uitvoeren in Supabase SQL Editor, niet via FTP. Vereist vóór avatar-feature daadwerkelijk persistentie heeft. Idempotent dus veilig om opnieuw te draaien.

---

## BACKLOG_MIGRATION.sql
**Type**: untracked (nieuw bestand)
**Samenvatting**: `ALTER student_profiles ADD zoekt_buddy boolean DEFAULT false` (item 1) en `ALTER profiles ADD avatar_key text` (item 4 voor begeleider). Idempotent.
**Status**: afgemaakt
**Aanbeveling**: niet uploaden (geen FTP-bestemming)
**Reden**: SQL — uitvoeren in Supabase SQL Editor. `zoekt_buddy` is vereist voor `fetchBuddySeekers` in js/buddy.js. Zonder deze migratie faalt de buddy → student discovery query.

---

## Samenvatting

| Aanbeveling | Aantal | Files |
|---|---|---|
| **klaar voor FTP** | 4 | about.html, js/calendar.js, pricing.html, robots.txt, sitemap.xml |
| **niet uploaden** | 3 | CLAUDE.md (repo-only), AVATAR_MIGRATION.sql (Supabase Console), BACKLOG_MIGRATION.sql (Supabase Console) |
| **twijfel** | 4 | js/buddy.js, js/avatar.js, js/profileView.js, js/welcome-overlay.js |

(robots.txt + sitemap.xml = 5 in "klaar voor FTP" lijst — typo, lees als 5)

### Patroon dat opvalt

De vier "twijfel"-files (`js/buddy.js`, `js/avatar.js`, `js/profileView.js`, `js/welcome-overlay.js`) plus de twee SQL-files (`AVATAR_MIGRATION.sql`, `BACKLOG_MIGRATION.sql`) lijken één coupled feature-set: **RUN2 buddy-profile uitbreiding plus avatar-systeem plus welkom-overlay**, gedateerd 30 april — 1 mei 2026.

Deze hangt onderling samen:
- `js/buddy.js` schrijft naar kolommen die `AVATAR_MIGRATION.sql` + `BACKLOG_MIGRATION.sql` toevoegen
- `js/buddy.js` roept `renderProfileView` aan uit `js/profileView.js`
- `js/profileView.js` gebruikt `getAvatarSvg` uit `js/avatar.js`
- `js/welcome-overlay.js` is mogelijk gerelateerd of stand-alone

**Aanbeveling voor jouw beslissing:** behandel deze als één coupled deploy of laat hem volledig wachten. Half-deployen (alleen JS zonder SQL, of buddy.js zonder profileView.js) levert geen feature, alleen risico op console-warnings of write-errors. Vraag voor jou: is RUN2 klaar voor livetest 11 mei, of een deferred feature?

### Veilige FTP-upload nu (5 files, geen RUN2-coupling)

```
about.html
js/calendar.js
pricing.html
robots.txt
sitemap.xml
```

Deze vijf zijn zelfstandig, geen DB- of cross-file dependencies, klaar voor losse upload. De RUN2-set kan later als coupled deploy.
