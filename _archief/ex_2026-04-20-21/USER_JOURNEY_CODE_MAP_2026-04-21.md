# User Journey Code Map
Datum: 21 april 2026
Scope: code-gebaseerde uitlezing van user-flow per pagina per rol.

---

## Sectie 1 — Landing Mapping

### Betrokken functies

| Functie | Locatie | Wordt aangeroepen op |
|---|---|---|
| `routeForRole()` | js/roles.js:48 | Na login in auth.html (via `Internly.routeForRole`) |
| `routeStudentByMode()` | js/utils.js:396 | Na profiel-opslaan in student-profile.html / bbl-profile.html |
| `getRoleLanding()` | js/utils.js:20 | Via `smartHomeRedirect()` op logo-klik en home-knop |
| `ROUTES{}` | auth.html:489 | Al-ingelogd check bij paginaload auth.html |

**Tijdstip per functie:**
- `routeForRole()` — eenmalig bij login-redirect (setTimeout 1000ms na succesvolle auth).
- `getRoleLanding()` — bij logo-klik en homeknop (elke paginaload waarbij `smartHomeRedirect()` wordt aangeroepen).
- `routeStudentByMode()` — bij opslaan studentprofiel (track-wissel of eerste aanmaak). Niet bij login.
- `ROUTES{}` + al-ingelogd check in auth.html — bij paginaload van auth.html terwijl sessie actief.

### Routing matrix

| User type | auth.html login → (roles.js `routeForRole`) | al-ingelogd check auth.html (`ROUTES{}`) | `getRoleLanding()` (logo/home) | Consistent? |
|---|---|---|---|---|
| Student MBO-BBL (`bbl_mode=true`) | `/bbl-hub.html` | `match-dashboard.html` (via `ROUTES['student']`) | `bbl-hub.html` | ✗ INCONSISTENT — al-ingelogd check stuurt naar match-dashboard |
| Student MBO-BOL (`onderwijsniveau=MBO_BOL`) | `/discover.html` | `bol-profile.html` (auth.html:888, als `sp.onderwijsniveau === 'MBO_BOL'`) | `discover.html` | ✗ INCONSISTENT — al-ingelogd check stuurt naar bol-profile.html, niet discover.html |
| Student HBO (`onderwijsniveau=HBO`) | `/discover.html` | `match-dashboard.html` (via `ROUTES['student']`) | `discover.html` | ✗ INCONSISTENT — al-ingelogd check stuurt naar match-dashboard |
| Student WO (`onderwijsniveau=WO`) | `/discover.html` | `match-dashboard.html` (via `ROUTES['student']`) | `discover.html` | ✗ INCONSISTENT — al-ingelogd check stuurt naar match-dashboard |
| Student onbekend/nieuw (geen `student_profile`) | `/student-profile.html` | `match-dashboard.html` (via `ROUTES['student']`, tenzij geen sp) | `student-profile.html` (via maybeSingle guard) | ✗ INCONSISTENT — al-ingelogd check mist `sp = null` guard |
| Bedrijf | `/company-dashboard.html` | `company-dashboard.html` | `company-dashboard.html` | ✓ |
| School | `/school-dashboard.html` | `school-dashboard.html` | `school-dashboard.html` | ✓ |
| Begeleider | `/begeleider-dashboard.html` | `begeleider-dashboard.html` | `begeleider-dashboard.html` | ✓ |
| Buddy (gepensioneerd) | `/buddy-dashboard.html` | `buddy-dashboard.html` | `buddy-dashboard.html` | ✓ |
| Admin | niet gedefinieerd in `INTERNLY_ROLES` / `routeForRole` geeft `/student-profile.html` (default) | niet in `ROUTES{}` → fallback `'match-dashboard.html'` (auth.html:669) | `admin.html` (via `ROLE_LANDING['admin']` in utils.js) | ✗ INCONSISTENT — drie functies geven drie verschillende bestemmingen |

**Toelichting inconsistenties:**
- `ROUTES{}` in auth.html (regel 489) heeft `student: 'match-dashboard.html'` — dit is een generieke fallback die geen BBL/BOL/onderwijsniveau onderscheid maakt.
- De al-ingelogd check (auth.html:887-888) heeft een afzonderlijke BBL-check maar stuurt BOL naar `bol-profile.html` in plaats van `discover.html`.
- Admin is aanwezig in `ROLE_LANDING` (utils.js:17) en in `admin.html` maar ontbreekt in `INTERNLY_ROLES` (roles.js) en in `ROUTES{}` (auth.html).

---

## Sectie 2 — Nav Consistency per Pagina

**Definitie kolommen:**
- `renderStudentHeader?` — de pagina heeft `<div id="student-header">` en roept `renderStudentHeader()` aan.
- `Eigen nav/topbar?` — de pagina heeft een eigen `<div class="topbar">`, `<nav>`, of `<header>` naast of in plaats van de gedeelde header.
- `Gedoeld voor rol` — primaire doelgroep op basis van auth-guard en inhoud.

| Pagina | renderStudentHeader? | Eigen nav/topbar? | Gedoeld voor rol |
|---|---|---|---|
| discover.html | ✓ (regel 1155, activeTab='discover') | ✓ (logo via student-header, mobile-tabs eigen nav) | Student BOL/HBO/WO |
| matches.html | ✓ (regel 816, activeTab='matches') | ✓ (eigen mobile-tabs) | Student BOL/HBO/WO |
| mijn-sollicitaties.html | ✓ (regel 682, activeTab='sollicitaties') | ✓ (eigen mobile-tabs) | Student BOL/HBO/WO |
| match-dashboard.html | ✗ | ✓ (eigen `<header id="hub-topbar">` + sidebar nav, regel 1950+1981) | Student / Bedrijf / School / Begeleider |
| hub.html | ✓ (regel 41, activeTab='hub') | ✗ | Student BOL (oud bestand — stub) |
| student-profile.html | ✓ (regel 1292, activeTab=null) | ✓ (eigen mobile-tabs) | Student nieuw/onbekend |
| bol-profile.html | ✗ | ✓ (eigen `<div class="topbar">` + `<nav class="nav">` + mobile-tabs) | Student MBO-BOL |
| bbl-profile.html | ✗ | ✓ (eigen `<div class="topbar">` + `<nav class="topbar-bbl-nav">`) | Student MBO-BBL |
| bbl-hub.html | ✓ (regel 2505, activeTab='discover') | ✓ (eigen topbar-stijlen, geen eigen topbar-div — renderStudentHeader vult `<div id="student-header">`) | Student MBO-BBL |
| bbl-dashboard.html | ✓ (regel 548, activeTab='matches') | ✗ | Student MBO-BBL |
| chat.html | ✗ | ✓ (eigen `<div class="topbar">` met terug-knop) | Student / Bedrijf |
| company-dashboard.html | ✗ | ✓ (eigen `<div class="topbar">` + mobile-tabs) | Bedrijf |
| company-discover.html | ✗ | ✓ (eigen `<div class="topbar">` + `<nav class="nav">` + mobile-tabs) | Bedrijf |
| school-dashboard.html | ✗ | ✓ (eigen `<div class="topbar">` + mobile-tabs) | School |
| begeleider-dashboard.html | ✗ | ✓ (eigen `<div class="topbar">` + mobile-tabs) | Begeleider |
| buddy-dashboard.html | ✗ | ✓ (eigen `<div class="topbar">`) | Buddy (gepensioneerd) |

**Observatie:** `hub.html` (regel 14) heeft `<div id="student-header">` en roept `renderStudentHeader` aan maar is een stub-bestand ("Stage Hub wordt morgen verder gebouwd"). De pagina is bereikbaar maar bevat geen actieve functionaliteit.

---

## Sectie 3 — Match-dashboard Multi-role Toegang

### Toegestane rollen

**Auth-modus** (met `?match=<uuid>` parameter) — `loadMatchFromDB()`, regels 2708-2716:
- Expliciet geblokkeerd: `gepensioneerd`, `buddy` → redirect naar `buddy-dashboard.html`
- `allowedRoles = ['student', 'begeleider']` (regel 2712) — overige rollen (bedrijf, school, admin) worden via match-rij bepaald (regels 2732-2741), niet via allowedRoles

**Demo-modus** (zonder `?match=` parameter) — DOMContentLoaded handler, regels 2668-2700:
- `gepensioneerd` en `buddy` → redirect naar `buddy-dashboard.html`
- `roleMap = { student, bedrijf, school }` — begeleider ontbreekt in demo-roleMap
- Niet-herkende rol → role-picker wordt getoond (geen redirect)

### Rol-specifieke UI

Bepaling via `startHub(role)` functie en `hubState.role`:
- `switch`-statement in `startHub()` bepaalt welke panelen zichtbaar zijn
- Rol-badge wordt getoond via `<span id="role-badge-display">` (regel 1967)
- Terug-knop (`#back-to-dash`) krijgt dynamisch href:

| Rol | Terug-knop doel |
|---|---|
| student | `matches.html` |
| bedrijf | `company-dashboard.html` |
| school | `school-dashboard.html` |
| begeleider | niet ingesteld (ontbreekt in backTargets) |

### Rol-picker (demo-modus)

De rol-picker (`<div id="role-picker">`, regel 1920) toont drie kaarten:
- Student (demo-naam: Lena Hartman)
- Bedrijf (demo-naam: NIOZ Zeewetenschappen)
- School (demo-naam: M. Jansen · HBO Communicatie)

Buddy en Begeleider zijn niet als kaart aanwezig in de picker.

### Zonder `?match=` parameter (demo-modus)

- Ingelogde gebruiker: rol automatisch bepaald via DB, role-picker verborgen
- Niet-ingelogde gebruiker: role-picker getoond, `body.auth-boot` class verwijderd
- `begeleider` in DB: valt door roleMap-check heen → role-picker wordt getoond alsof niet ingelogd

---

## Sectie 4 — Taalconsistentie

Grep uitgevoerd op: "Stage Hub", "Match Dashboard", "Stageprofiel", "Mijn stage", "Mijn Hub" (case-insensitive, exclusief backup-bestanden).

| String | Bestand:regel | Context |
|---|---|---|
| `Mijn Stage Hub` | js/utils.js:474 | nav-link (bolNav, gerenderd door renderStudentHeader) |
| `Stage Hub` | match-dashboard.html:11 | `<title>` paginatitel |
| `Stage Hub — gedeeld stagedashboard` | match-dashboard.html:1922 | ondertitel in role-picker |
| `Stage Hub` | match-dashboard.html:2195 | tooltip / info-tekst |
| `Stage Hub` | match-dashboard.html:2293 | logboek-tekst |
| `Stage Hub` | match-dashboard.html:2674 | commentaar (redirect-logica) |
| `Stage Hub` | match-dashboard.html:2743 | toast-foutmelding |
| `Stage Hub` | match-dashboard.html:5636,5648,5667 | PDF-export header/footer |
| `Stage Hub` | matches.html:444 | knop-label in match-kaart (`📊 Stage Hub →`) |
| `Stage Hub` | mijn-sollicitaties.html:121 | tooltip (info-pop tekst) |
| `Stage Hub →` | mijn-sollicitaties.html:332 | knop-label in sollicitatie-kaart |
| `Stage Hub` | company-dashboard.html:619 | nav-link (`<span class="nav-icon">`) |
| `Stage Hub →` | company-dashboard.html:1539,1659 | knop-label in match-kaart |
| `Stage Hub` | school-dashboard.html:579 | nav-link |
| `Stage Hub →` | school-dashboard.html:1388 | knop-label in student-overzicht |
| `Stage Hub` | school-dashboard.html:689,698 | info-pop tooltip-tekst |
| `📊 Stage Hub` | chat.html:220 | topbar-pill (conditioneel zichtbaar) |
| `Stage Hub` | vacature-detail.html:257 | nav-link (`📊 Stage Hub`) |
| `Mijn Stage Hub — Internly` | hub.html:6 | `<title>` paginatitel (stub-bestand) |
| `Mijn Stage Hub` | hub.html:18 | paginakop (stub-bestand) |
| `Mijn BOL-stageprofiel` | bol-profile.html:11 | `<title>` paginatitel |
| `BOL-stageprofiel` | bol-profile.html:468,469 | paginakop + role-badge tekst |
| `stageprofiel` | bol-profile.html:1278 | commentaar in JS |
| `stageprofiel` | student-profile.html:1283 | commentaar in JS |
| `Mijn Stages` | matches.html:655 | notify-tekst (toast bij opslaan) |
| `Mijn Stages` | vacature-detail.html:256 | nav-link |
| `Mijn Stages` | bol-profile.html:364 | nav-link |
| `begeleider-dashboard.html:469` | `via Stage Hub` | stat-note tekst |
| `kennisbank.html:421` | `in de Stage Hub` | informatietekst |
| `pricing.html:311,330,350,384,445` | `Stage Hub (basis/volledig)` | bullet-punt in prijsoverzicht |

**Observaties taalconsistentie:**
- "Stage Hub" (zonder "Mijn") is de dominante schrijfwijze: 20+ vindplaatsen.
- "Mijn Stage Hub" verschijnt alleen in `renderStudentHeader` (utils.js:474) en de stub `hub.html` — niet in `match-dashboard.html` zelf.
- "Match Dashboard" wordt nergens als gebruikersgerichte tekst gebruikt; het is uitsluitend de bestandsnaam.
- "Mijn Stages" (mijn-sollicitaties.html) en "Stageprofiel" (bol-profile.html) zijn consistente enkelvoudige labels op hun eigen pagina.
- "Mijn Hub" wordt nergens gebruikt.

---

## Sectie 5 — Empty-state Handling

| Pagina | Empty state aanwezig? | Tekst/UI |
|---|---|---|
| discover.html | ✓ | "Nog geen vacatures beschikbaar." (state-box met 📭 icoon + herlaad-hint); "Geen vacatures gevonden voor deze filters." (filter-leegstand + wis-filter knop) |
| matches.html | ✓ | "Nog geen matches." / "Geen vacatures beschikbaar." (beide conditioneel, regels 515-523) |
| mijn-sollicitaties.html | ✓ | "Je hebt nog geen sollicitaties ingediend." (regel 278, met link naar discover.html) |
| bbl-hub.html | ✓ | Meerdere: "Nog geen berichten. Stuur een bericht om te starten." (regel 1155); "Nog geen leerdoelen ingesteld." (regel 1706); "Nog geen afgeronde evaluaties." (regel 2338) |
| bbl-dashboard.html | ✓ | "Geen aankomende afspraken" (regel 430); "Nog geen leerdoelen — vul ze in op je profiel." (regel 459) |
| company-discover.html | ✓ | "Geen studenten gevonden voor deze filters." (regel 408, met 🔎 icoon) |
| match-dashboard.html | ✓ | Meerdere: lege deadlines/taken/reflecties renderen als lege sectie (regels 3164, 3285, 3468); lege kalender-dag (regel 4828); lege evaluatie-lijsten per status (regels 5014-5022) |

---

## Sectie 6 — Back-trail / Home-knop per Pagina

| Pagina | Terug-link? | Doel-URL | Via |
|---|---|---|---|
| discover.html | ✓ | `smartHomeRedirect()` → rol-afhankelijk | Logo (via renderStudentHeader, href naar discover.html voor BOL) |
| matches.html | ✓ | `smartHomeRedirect()` → rol-afhankelijk | Logo (via renderStudentHeader) |
| mijn-sollicitaties.html | ✓ | `smartHomeRedirect()` → rol-afhankelijk | Logo (via renderStudentHeader) |
| match-dashboard.html | ✓ (conditioneel) | student → `matches.html`; bedrijf → `company-dashboard.html`; school → `school-dashboard.html` | Knop `#back-to-dash` (verborgen in demo-modus zonder `?match=`) |
| hub.html | ✓ | `smartHomeRedirect()` → rol-afhankelijk | Logo (via renderStudentHeader) |
| student-profile.html | ✓ | `smartHomeRedirect()` → rol-afhankelijk | Logo (via renderStudentHeader) |
| bol-profile.html | ✓ | `discover.html` | Logo (`smartHomeRedirect`) + nav-link "Ontdek" + mobile-tab |
| bbl-profile.html | ✓ | `bbl-dashboard.html` | Terug-link (regel 251: "← Terug naar dashboard") |
| bbl-hub.html | ✓ | `smartHomeRedirect()` → bbl-hub.html voor BBL | Logo (via renderStudentHeader) |
| bbl-dashboard.html | ✓ | `smartHomeRedirect()` → bbl-hub.html voor BBL | Logo (via renderStudentHeader) |
| chat.html | ✓ | `matches.html` | Knop "← Terug" (regel 215, `class="back-btn"`) |
| company-dashboard.html | ✓ | `company-dashboard.html` (zelfverwijzend) | Logo (`smartHomeRedirect`) + topbar-link "Dashboard" (regel 531) |
| company-discover.html | ✓ | `company-dashboard.html` | Logo (`smartHomeRedirect`) + nav-link "Dashboard" + "← Terug naar dashboard" (regel 251) |
| school-dashboard.html | ✓ | `smartHomeRedirect()` → school-dashboard.html | Logo (`smartHomeRedirect`) |
| begeleider-dashboard.html | ✓ | `smartHomeRedirect()` → begeleider-dashboard.html | Logo (`smartHomeRedirect`) |
| buddy-dashboard.html | ✓ | `smartHomeRedirect()` → buddy-dashboard.html | Logo (`smartHomeRedirect`) |

**Observaties:**
- `match-dashboard.html` heeft de `#back-to-dash` knop initieel `display:none` (regel 1969). De knop wordt alleen zichtbaar gemaakt na rol-bepaling in `loadMatchFromDB` of demo-modus-handler. Voor de rol `begeleider` ontbreekt de knop-activering in demo-modus (niet in `backTargets`).
- Alle pagina's met `smartHomeRedirect()` op het logo verbergen de bestemming achter een async DB-aanroep — zonder actieve sessie redirect naar `index.html`.
- `company-dashboard.html` topbar-link "Dashboard" (regel 531) is een zelfverwijzende link naar dezelfde pagina.
