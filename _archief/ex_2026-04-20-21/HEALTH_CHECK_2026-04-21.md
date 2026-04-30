# Health Check Internly.pro
Datum: 21 april 2026
Scope: pre-deploy operationele check — links, scripts, navigation, queries

---

## Sectie 1 — Broken HTML links

Alle lokale `href`-waarden in niet-backup `.html`-bestanden gecheckt. Hieronder alleen de relevante bevindingen; de meerderheid (discover.html, about.html, auth.html, pricing.html, etc.) verwijst naar bestaande bestanden.

| Bron-bestand:regel | href | Bestaat? |
|--------------------|------|----------|
| about.html:633 | `https://internly.pro/blog` | Nee — blog bestaat niet als directory |
| esg-rapportage.html:741 | `/esg-rapportage.html` (self-link) | Ja |
| company-dashboard.html:912 | `/esg-rapportage.html` | Ja |
| index.html:967 | `/esg-rapportage.html` | Ja |
| index.html:1654 | `/esg-rapportage.html` | Ja |
| hub.html (via utils.js:474) | `/hub.html` in nav-template | Ja (bestand bestaat, maar is WIP/stub) |

**Alle andere lokale hrefs naar .html-bestanden: bestaan.** Geen broken HTML links in de applicatienavigatie.

Noot: `https://internly.pro/blog` is een externe URL (geen lokaal bestand), buiten scope voor fix.

---

## Sectie 2 — Broken script/link/img references

### CSS-referenties
Alle `<link rel="stylesheet" href="css/style.css">` en `<link rel="stylesheet" href="/css/style.css">` verwijzen naar een bestaand bestand. Geen broken CSS links.

### Script-referenties (lokaal)
Alle gerefereerde JS-bestanden in niet-backup HTML-bestanden:

| Bron-bestand:regel | Referentie | Bestaat? | Opmerking |
|--------------------|------------|----------|-----------|
| auth.html:19 | `js/roles.js` | Ja | |
| auth.html:919 | `js/translate.js` | Ja | |
| begeleider-dashboard.html:920 | `js/translate.js` | Ja | |
| chat.html:1196 | `js/translate.js` | Ja | |
| chat.html:1197 | `js/calendar.js` | Ja | |
| company-dashboard.html:2828 | `js/info.js` | Ja | |
| company-dashboard.html:2829 | `js/esg-export.js` | Ja | |
| company-discover.html:538 | `js/translate.js` | Ja | |
| discover.html:20 | `js/reistijd.js` | Ja | |
| discover.html:1370 | `js/translate.js` | Ja | |
| esg-export.html:1107 | `/js/esg-inject.js` | Ja | |
| hub.html:8 | `/js/roles.js` | Ja | |
| match-dashboard.html:6138 | `js/info.js` | Ja | |
| matches.html:889 | `js/translate.js` | Ja | |
| matches.html:890 | `js/info.js` | Ja | |
| mijn-sollicitaties.html:712 | `js/translate.js` | Ja | |
| mijn-sollicitaties.html:713 | `js/info.js` | Ja | |
| school-dashboard.html:2189 | `js/calendar.js` | Ja | |
| school-dashboard.html:2190 | `js/info.js` | Ja | |
| bol-profile.html:1664 | `js/calendar.js` | Ja | |
| student-profile.html:1663 | `js/calendar.js` | Ja | |

### Favicon/icons
| Referentie | Bestaat? | Opmerking |
|------------|----------|-----------|
| `/favicon.ico` | Ja | |
| `/favicon.svg` | Ja | |
| `/favicon_180x180.png` | Ja | |
| `/manifest.json` | Ja | |
| `/icons/icon-192.png` (sw.js:17) | **Nee** | icons/ map bestaat niet — reeds bekend in audit |
| `/icons/badge-72.png` (sw.js:18) | **Nee** | icons/ map bestaat niet — reeds bekend in audit |

### Img-tags
Geen `<img src="...">` met lokale paden gevonden in HTML-bestanden. Alle afbeeldingen zijn inline SVG of data-URI.

**Totaal broken referenties: 2** (sw.js icons — reeds bekend)

---

## Sectie 3 — Dood invoke() naar Edge Functions

Grep op `.invoke(` in alle HTML en JS bestanden: **geen resultaten gevonden**.

Er zijn geen `.invoke()`-aanroepen in de codebase. De eerder bekende `send-meeting-email`-aanroep was al verwijderd vóór deze audit (bevestigd in CLAUDE.md en TECH_INVENTORY_2026-04-21.md).

Geen bevindingen. Gecheckt.

---

## Sectie 4 — Orphan files

Bestanden die nergens via `<a href>`, `<script src>` of `window.location` gerefereerd worden in niet-backup HTML/JS-bestanden:

| Orphan file | Type | Reden verdacht |
|-------------|------|----------------|
| `hub.html` | HTML | Alleen gerefereerd via `utils.js` nav-template (regel 474) als `/hub.html` — WIP-pagina, geen echte navigatieroute vanuit login-flow |
| `esg-export.html` | HTML | Alleen geopend via `js/esg-export.js:217` (`window.open('/esg-export.html', '_blank')`) — niet via directe nav-link |
| `internly_simulator.html` | HTML | Alleen via `index.html:1060` (`<a href="internly_simulator.html">`) — geen auth-guard zichtbaar |
| `bbl-dashboard.html` | HTML | Gerefereerd vanuit `bbl-profile.html` en `bbl-hub.html` — actief in BBL-flow, geen orphan |
| `js/roles.backup.2026-04-21-routing.js` | JS | Backup-bestand, niet gerefereerd |
| `js/utils.backup.2026-04-20-0904.js` | JS | Backup-bestand, niet gerefereerd |
| `admin.html` | HTML | Alleen via `utils.js:17` als ROUTES-entry voor role 'admin' — bereikbaar maar ongedocumenteerd als directe URL |

Noot: backup-bestanden (`.backup.*`) zijn per instructie niet verwijderd — alleen gerapporteerd.

---

## Sectie 5 — Broken navigation patterns

Grep op `window.location.href` en `window.location.replace` met lokale targets.

| Bestand:regel | Target | Bestaat? | Opmerking |
|---------------|--------|----------|-----------|
| auth.html:666 | `student-profile.html` | Ja | Fallback als geen profiel bij student-login |
| auth.html:887 | `bbl-hub.html` | Ja | BBL-flow |
| auth.html:887 | `bbl-profile.html` | Ja | BBL zonder naam |
| auth.html:888 | `bol-profile.html` | Ja | MBO-BOL flow |
| bbl-dashboard.html:518 | `auth.html` | Ja | |
| bbl-dashboard.html:541 | `discover.html` | Ja | |
| bbl-hub.html:2479 | `auth.html` | Ja | |
| bbl-hub.html:2493 | `discover.html` | Ja | |
| bbl-profile.html:621 | `auth.html` | Ja | |
| bbl-profile.html:648 | `student-profile.html` | Ja | |
| bol-profile.html:1275 | `auth.html` | Ja | |
| bol-profile.html:1305 | `bbl-profile.html` | Ja | |
| bol-profile.html:1310 | `student-profile.html` | Ja | |
| buddy-dashboard.html:761 | `auth.html` | Ja | |
| company-dashboard.html:1150 | `auth.html` | Ja | |
| company-dashboard.html:1254 | `chat.html` | Ja | |
| company-dashboard.html:1280 | `company-discover.html` | Ja | |
| company-discover.html:511 | `auth.html` | Ja | |
| discover.html:1184 | `bbl-profile.html` | Ja | |
| discover.html:1186 | `bol-profile.html` | Ja | |
| index.html:1140 | `student-profile.html` | Ja | |
| match-dashboard.html:2676 | `buddy-dashboard.html` | Ja | |
| match-dashboard.html:2851 | `match-dashboard.html` | Ja | Self-redirect met ?match= param |
| matches.html:823 | `bbl-hub.html` | Ja | |
| matches.html:824 | `bol-profile.html` | Ja | |
| mijn-sollicitaties.html:679 | `bbl-hub.html` | Ja | |
| mijn-sollicitaties.html:680 | `bol-profile.html` | Ja | |
| student-profile.html:1303 | `bbl-profile.html` | Ja | |
| student-profile.html:1309 | `bol-profile.html` | Ja | |
| js/utils.js:45 | `student-profile.html` | Ja | |
| js/utils.js:380 | `student-profile.html` | Ja | |
| js/utils.js:404 | `bbl-profile.html` | Ja | |
| js/utils.js:406 | `bol-profile.html` | Ja | |

**stage-hub.html**: Geen enkele referentie gevonden in niet-backup bestanden. String bestaat niet meer in de codebase. Bevestigd verwijderd.

Geen broken navigation patterns gevonden.

---

## Sectie 6 — Supabase table/column references

| Kolom/tabel | Bestanden:regels | Status |
|-------------|-----------------|--------|
| `student_profiles_pool` | `company-discover.html:363` | Enige gebruiker. View bestaat na migratie vandaag. Consistent: 1 bestand, 1 query. |
| `initialen` | `company-discover.html:318, 332, 364` | Gelezen uit `student_profiles_pool`. Render en SELECT gesynchroniseerd (P8-compliant). |
| `leerdoelen` (als kolom in `student_profiles`) | **0 bestanden** | Geen enkel bestand doet `.select('leerdoelen')` op `student_profiles`. `leerdoelen` verschijnt alleen als JS-variabelenaam (hubState), DOM-tekst en als `stage_leerdoelen`-tabel in match-dashboard. Kolom bestaat niet in DB en wordt ook niet opgevraagd — geen risico. |
| `hub_visibility` | **0 bestanden** | Geen enkele referentie in HTML of JS. Niet aanwezig in codebase. |
| `profiel_zichtbaar_voor_bedrijven` | **0 bestanden** | Geen enkele query leest deze kolom. Bevestigt bevinding uit audit: kolom bestaat in DB maar UI ontbreekt. |
| `aggregation_consent` | **0 bestanden** | Geen enkele query leest of schrijft deze kolom. Kolom bestaat in DB, UI ontbreekt — sprint 5 werk. |
| `begeleider_profile_id` | `begeleider-dashboard.html:693, 698` | Aanwezig in codebase. Commentaar op regel 693 zegt expliciet "field may not exist yet" — kolom staat nog niet in DB per audit. Query zal silently falen. Risico: geen foutmelding voor gebruiker. |
| `praktijkbegeleider_profile_id` | `bbl-hub.html` (meerdere regels), `bbl-dashboard.html:556, 581, 585` | Actief gebruikt in BBL-flow. Aparte kolom van `begeleider_profile_id`. Consistent in beide BBL-bestanden. |
| `stage-hub.html` als string | **0 bestanden** | Niet gevonden in enige HTML of JS (niet-backup). Volledig opgeruimd. |

**Aanvullende bevinding:** `bbl-hub.html:2560` heeft commentaar "school naam + initialen tonen" maar de `initialen`-kolom wordt alleen in `student_profiles_pool` gedefinieerd (company-discover flow). Niet gelezen in bbl-hub context — geen bug, alleen opmerking.
