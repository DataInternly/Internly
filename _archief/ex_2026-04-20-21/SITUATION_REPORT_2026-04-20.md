# Situatie-rapport — Stage Hub / match-dashboard
Datum: 20 april 2026
Context: Internly.pro, vanilla HTML/CSS/JS met Supabase backend. Gisternacht is `hub.html`
aangemaakt als placeholder voor de "Mijn Stage Hub" tab in de gedeelde student-nav. Die tab
wijst naar `/hub.html`, maar de bestaande `match-dashboard.html` is ook een Stage Hub — een
volwassen, feature-rijke werkruimte. De vraag voor morgen is: zijn dit twee dezelfde dingen,
of twee verschillende dingen met verschillende doelen?

---

## Samenvatting in 5 regels

- `match-dashboard.html` is een multi-party collaboration space die een actieve match (via `?match=UUID`) vereist om zijn kerndata te laden; zonder URL-parameter draait het in demo-modus.
- `hub.html` is een lege placeholder — auth-guard, BBL-redirect, shared header, geen content. Alles moet nog gebouwd worden.
- De student-nav wijst via "Mijn Stage Hub" naar `/hub.html`. `match-dashboard.html` is bereikbaar via deep-link knoppen op `matches.html` en `mijn-sollicitaties.html` (`?match=UUID`), maar staat NIET in de student-nav.
- `match-dashboard.html` gebruikt zijn eigen proprietary topbar (`#hub-topbar`), niet de gedeelde `renderStudentHeader`. Het is een navigatie-eiland.
- Er zijn drie duidelijke paden: (A) hub.html → match-dashboard sturen en hub.html weggooien, (B) hub.html pre-match workspace + match-dashboard post-match, of (C) hub.html groeit tot volledige vervanging van match-dashboard. Elk pad heeft fors verschillende kosten.

---

## Vraag 1 — Wat is match-dashboard.html?

### URL-parameter
`match-dashboard.html` leest altijd als eerste `const MATCH_ID = new URLSearchParams(window.location.search).get('match')` (regel 2109). Dit UUID stuurt alle DB-queries aan. Zonder `?match=UUID` is `MATCH_ID` null.

### Zonder parameter: demo-modus
Wanneer `MATCH_ID` null is, activeer de pagina een "demo-modus":
- Alle data komt uit een hard-coded JavaScript object (`hubState` met demo-namen, dummy reflecties, DEMO_PROFILES etc., regels 2139–2400).
- Als een ingelogde gebruiker zonder `?match=` de pagina opent, detecteert `DOMContentLoaded` zijn rol via `db.from('profiles').select('role')` (regel 2671) en roept automatisch `startHub(mappedRole)` aan (regel 2683). De gebruiker komt direct in demo-modus, als de juiste rol.
- Een back-button (`#back-to-dash`) verschijnt en wijst naar `matches.html` (voor student), `company-dashboard.html` (voor bedrijf) of `school-dashboard.html` (voor school).
- Roles `gepensioneerd` / `buddy` worden doorgestuurd naar `buddy-dashboard.html` (regel 2676).

### Zinvol voor BOL-student zonder actieve match?
In demo-modus: ja, de UI is volledig bruikbaar. De student ziet demo-data voor alle tabs. Planning, Taken, Afspraken, Voortgang — alles werkt op dummy-data. Maar er wordt niks opgeslagen; alle writes vereisen een `MATCH_ID` (elke `db.from(...).insert(...)` bevat `.eq('match_id', MATCH_ID)` als vereiste, en `loadHubFromDB()` returnt vroeg als `!MATCH_ID` — regel 2507).

### Auth guards
- Bij `MATCH_ID` aanwezig: `getUser()` → als geen user: redirect naar `auth.html?redirect=...` (regel 2662). Dan `loadMatchFromDB(user)` (regel 2663).
- In `loadMatchFromDB`: rol-check via `db.from('profiles').select('role')` (regel 2709). Rollen `gepensioneerd` / `buddy` → `buddy-dashboard.html`. Rollen die niet `student` of `begeleider` zijn → `auth.html` (regels 2711–2717).
- Als student niet `party_a` of `party_b` of `school` van de match is: toast + return (regel 2739).
- Geen `requireRole()` van utils.js, geen BBL-check op `bbl_mode`. Een BBL-student met een actieve match zou in principe op match-dashboard.html kunnen landen.

### Supabase data (lees)
| Tabel | Wat |
|---|---|
| `profiles` | `role` — role-guard |
| `matches` | `id, party_a, party_b, roc_profile_id, completion_status, internship_postings(title)` |
| `student_profiles` | `naam, opleiding, jaar` (via `party_a`) |
| `company_profiles` | `bedrijfsnaam, sector` (via `party_b`) |
| `school_profiles` | `schoolnaam` (voor school-rol) |
| `stage_plans` | `*` — via `match_id` |
| `stage_leerdoelen` | `*` — via `match_id` |
| `stage_deadlines` | `*` — via `match_id` |
| `stage_tasks` | `*` — via `match_id` |
| `stage_reflecties` | `*` — via `match_id` |
| `stage_log` | `*` — via `match_id`, limit 20 |
| `meetings` | `*` — via `match_id` + `organizer_id`/`attendee_id` |

---

## Vraag 2 — Welke tabs en functionaliteit?

Alle tabs zitten in de sidebar-nav (`#sidebar`, regels 1981–2054) en worden gerouteerd via `switchTab()` (regel 2936) naar render-functies in `hubState.tabRenderers` (regel 2953).

| Tab | Beschrijving | Match-afhankelijk? |
|---|---|---|
| **Overzicht** | Dashboard met match-indicator (partijen, voortgang), recente activiteit uit `stage_log`, korte samenvatting taken en leerdoelen, snelknoppen naar andere tabs | Ja — rendert demo-data in demo-modus, echte data als `MATCH_ID` aanwezig |
| **Planning** | Deadlines en mijlpalen. Toevoegen, bewerken, verwijderen. Schrijft naar `stage_deadlines` | Ja — schrijven vereist `MATCH_ID` |
| **Kalender** | Maandkalender met deadlines en afspraken gecombineerd. Navigeer maanden, klik op dag voor detail | Ja — data uit `hubState.deadlines` + `hubState.meetings` |
| **Stageplan** | Formulier met stageopdracht, onderzoeksvraag (`sp-hoofdvraag`), deelvragen, methode. Schrijft naar `stage_plans` met upsert. School kan worden uitgenodigd | Ja — schrijven vereist `MATCH_ID`; `sp-hoofdvraag` is een vrij tekstveld in `stage_plans`, niet in `student_profiles` |
| **Taken** | Gedeelde takenlijst voor student + bedrijf + school. Aanmaken, bewerken, afvinken, verwijderen. Schrijft naar `stage_tasks`. Heeft badge-counter in sidebar | Ja — schrijven vereist `MATCH_ID` |
| **Voortgang** | Leerdoelen met voortgangsbalk (percentage). Reflecties aanmaken/bewerken/verwijderen. Schrijft naar `stage_leerdoelen` en `stage_reflecties` | Ja — schrijven vereist `MATCH_ID` |
| **Afspraken** | Overzicht van meetings (aankomend, openstaand, afgewezen). Afspraken aanmaken, accepteren, afwijzen, annuleren. Schrijft naar `meetings` en `notifications` | Ja — schrijven vereist `MATCH_ID` en `currentUser` |
| **Matchpool** | Overzicht van beschikbare bedrijven, scholen en buddy's uit de pool. Demo-toggle voor voorbeeldprofielen (`DEMO_PROFILES`). Geen DB-writes | **Nee** — volledig op demo-data, geen `match_id` nodig |

**Conclusie**: 7 van 8 tabs zijn functioneel match-afhankelijk voor schrijven. De Matchpool-tab is stand-alone. Lezen (demo-data) werkt altijd.

---

## Vraag 3 — Shared header of eigen?

### Eigen proprietary topbar
`match-dashboard.html` gebruikt `renderStudentHeader()` **niet**. Het heeft een eigen topbar (`#hub-topbar`, regels 173–184 CSS, 1950–1972 HTML) met:
- `hub-topbar-logo` → `Internly.` met `smartHomeRedirect()` onclick
- Stage-naam en meta (bedrijf, datumrange) — dynamisch gevuld via `loadMatchFromDB`
- Role badge (student / bedrijf / school)
- Terug-knop `#back-to-dash` (initieel `display:none`, verschijnt na auth)
- "Wissel rol" knop (demo-modus)

Er is geen `<div id="student-header">` op de pagina. Geen `renderStudentHeader` call.

### Navigatie terug naar andere BOL-pagina's
Beperkt en context-afhankelijk:
- `#back-to-dash` wijst voor student naar `matches.html` (regel 2755) — alleen zichtbaar na auth.
- In demo-modus zonder login: de back-button is `display:none`.
- Er is geen link naar `discover.html` of `mijn-sollicitaties.html` vanuit match-dashboard.

### Conclusie: eiland
`match-dashboard.html` is een navigatie-eiland. Het heeft geen gedeelde student-nav. Een student die via `matches.html` naar match-dashboard gaat, kan terug naar `matches.html` via de back-button — maar alleen als hij ingelogd was. Er is geen link naar `discover.html`, `hub.html` of `mijn-sollicitaties.html`.

---

## Vraag 4 — Wat doet hub.html nu?

`hub.html` is een minimale placeholder van 60 regels (aangemaakt gisternacht).

**Wat de gebruiker ziet:**
- De gedeelde student-header (`renderStudentHeader({ activeTab: 'hub' })`) — dus dezelfde nav als discover/matches.
- Paginatitel "Mijn Stage Hub".
- Intro-tekst: "Plan je stage voordat je matcht. Bedrijven zien straks jouw onderzoeksvraag, leerdoelen en aanpak..."
- Een witte card met 🚧 en tekst "Stage Hub wordt morgen verder gebouwd".

**Guards aanwezig:**
1. Auth guard: `db.auth.getUser()` → geen user → `window.location.replace('/auth.html')` (regel 39–43).
2. BBL-only guard: `student_profiles.bbl_mode === true` → `window.location.replace('/bbl-hub.html')` (regel 45–53).

**Kan het BBL-studenten kwijt?** Ja, via guard op regel 51–53.

**Functionaliteit:** Geen. Uitsluitend placeholder. Geen DB-reads behalve de auth-check en bbl_mode-check.

**Wat ontbreekt ten opzichte van de taakbeschrijving:**
- `requireRole('student')` ontbreekt (niet opgeroepen via utils.js `requireRole`). Er is alleen een bbl_mode check, geen rol-check. Een bedrijf of school die handmatig naar `/hub.html` navigeert ziet de pagina.
- Geen `telemetry.js`.

---

## Vraag 5 — Navigatie status

### Waar wijst de Stage Hub tab naartoe?
`js/utils.js` bolNav (regel 379):
```
<a href="/hub.html" class="...">Mijn Stage Hub</a>
```
De tab wijst naar `/hub.html` — de placeholder van gisternacht.

### Is match-dashboard bereikbaar vanuit de student-nav?
**Nee.** `match-dashboard.html` zit niet in de gedeelde `bolNav` of `bblNav`. Het is bereikbaar via:
1. `matches.html:439` — een knop "📊 Stage Hub →" per match-kaart met `href="match-dashboard.html?match=UUID"`.
2. `mijn-sollicitaties.html:329` — idem, per sollicitatie met actieve status een "📊 Stage Hub →" link.
3. `discover.html:406` — een mobile-tab-bar link naar `match-dashboard.html` **zonder** `?match=` parameter (demo-modus).

### Kan een student van match-dashboard terug naar discover of matches?
- Via `#back-to-dash` → `matches.html` (alleen na auth, alleen voor student-rol).
- Via `smartHomeRedirect()` op het logo (redirect op basis van rol/bbl_mode naar discover of bbl-hub).
- Er is geen directe link naar `discover.html` of `mijn-sollicitaties.html` vanuit match-dashboard.

### Conflict tussen hub.html en match-dashboard als landing?
**Ja, er is een conflict in naamgeving en semantiek:**
- De Stage Hub tab in de nav (`hub.html`) en de "📊 Stage Hub →" deeplink-knop op matches/sollicitaties (`match-dashboard.html`) hebben dezelfde naam maar wijzen naar verschillende pagina's.
- Vanuit `mijn-sollicitaties.html:121` wordt in een tooltip uitgelegd: "Klik op Stage Hub → bij een actieve stage om je persoonlijke werkruimte te openen." Die Stage Hub is `match-dashboard.html`.
- De tab in de nav heet ook "Mijn Stage Hub" maar gaat naar `hub.html`.
- Een student die op de nav-tab klikt en een student die op de deeplink-knop klikt, landen op totaal verschillende pagina's met dezelfde label.

---

## Vraag 6 — BBL-overlap?

### Kan een BBL-student op match-dashboard komen?
Indirect: ja. `match-dashboard.html` heeft geen `bbl_mode`-check in zijn auth-flow. De check in `loadMatchFromDB` kijkt alleen naar `role` (not in `gepensioneerd`/`buddy`, must be `student` or `begeleider`). Als een BBL-student een match-record heeft en de URL `?match=UUID` opent, zal hij de Stage Hub laden.

Vanuit de navigatie: via `matches.html` — maar `matches.html` redirect BBL-studenten naar `bbl-hub.html` (regel 823), dus in de normale flow bereikt een BBL-student `matches.html` niet. Via directe URL navigatie is het mogelijk.

### Overlap met bbl-hub.html?
`bbl-hub.html` heeft een geheel andere structuur: het gaat over het BBL-traject (praktijkbegeleider, schooldag, contractdata). `match-dashboard.html` gaat over de lopende stage-samenwerking na acceptatie.

Functioneel zijn ze complementair, niet overlappend — maar beide zijn een "stage hub" voor hun eigen doelgroep.

### BBL-specifieke kolommen in match-dashboard?
`match-dashboard.html` leest `roc_profile_id` uit de `matches`-tabel (regel 2721) en slaat het op in `hubPartyIds.roc` (regel 2804). Dit veld is BBL-specifiek (ROC = Regionaal Onderwijs Centrum). Het wordt niet actief gebruikt in de UI-render-functies die ik kon lezen — het wordt bewaard maar er is geen zichtbare functionaliteit op gebouwd in de code.

`praktijkbegeleider_profile_id` (ander BBL-kolom) wordt **niet** gelezen door match-dashboard. Geen `bbl_mode` column-reads.

---

## Vraag 7 — Data-flows

### Gelezen tabellen
| Tabel | Velden | Context |
|---|---|---|
| `profiles` | `role` | Auth guard + rol-detectie |
| `matches` | `id, party_a, party_b, roc_profile_id, completion_status, internship_postings(title)` | Match-kern |
| `student_profiles` | `naam, opleiding, jaar` | Weergave studentnaam |
| `company_profiles` | `bedrijfsnaam, sector` | Weergave bedrijfsnaam |
| `school_profiles` | `schoolnaam` | Weergave schoolnaam |
| `stage_plans` | `*` | Stageplan-tab |
| `stage_leerdoelen` | `*` | Voortgang-tab |
| `stage_deadlines` | `*` | Planning + Kalender |
| `stage_tasks` | `*` | Taken-tab |
| `stage_reflecties` | `*` | Voortgang-tab |
| `stage_log` | `*` (limit 20) | Activiteitslog Overzicht |
| `meetings` | `*` | Afspraken + Kalender |

### Geschreven tabellen
| Tabel | Operaties |
|---|---|
| `stage_tasks` | INSERT, UPDATE (status, velden), DELETE |
| `stage_deadlines` | INSERT, UPDATE (title, date), DELETE (impliciet) |
| `stage_leerdoelen` | UPDATE (progress, notes) |
| `stage_reflecties` | INSERT, UPDATE, DELETE |
| `stage_plans` | UPSERT (onConflict: match_id) |
| `stage_log` | INSERT (activiteitslog) |
| `meetings` | INSERT, UPDATE (status: bevestigd/afgewezen/geannuleerd) |
| `notifications` | INSERT (bij meeting-acties) |
| `matches` | UPDATE (completion_status: 'completed', completed_at) |

### Realtime subscriptions
Geen. `grep -n "channel\|subscribe\|realtime\|postgres_changes"` geeft nul hits op match-dashboard.html. Alle data is poll-based: `visibilitychange` event triggert `loadHubFromDB()` bij terugkeer naar de tab (regel 2622).

### Velden gelezen die niet in student_profiles zitten
- **`stage_plans.hoofdvraag`**: De onderzoeksvraag staat in de `stage_plans` tabel (match-gebonden), niet in `student_profiles`. In `hub.html` beschrijft de intro-tekst "bedrijven zien straks jouw onderzoeksvraag" — dit duidt op een toekomstige `student_profiles` kolom of een aparte `hub_visibility` tabel die nog niet bestaat.
- **`hub_visibility`**: Niet aanwezig in match-dashboard.html of ergens anders in de codebase. De kolom bestaat niet in de gecodeerde queries.
- **`leerdoelen` (pre-match)**: `stage_leerdoelen` is match-gebonden. Er is geen pre-match leerdoelen tabel in de code.

---

## Vraag 8 — Drie scenarios

### Pad A — Stage Hub tab → match-dashboard.html; hub.html verwijderen

**Beschrijving:**  
Wijzig in `js/utils.js` bolNav de href van `/hub.html` naar `/match-dashboard.html`. Verwijder `hub.html`.

**Impact per rol:**
- **BOL-student**: Nav-tab "Mijn Stage Hub" opent match-dashboard in demo-modus (geen `?match=` in de URL). Student ziet demo-data, kan niet opslaan. Zonder actieve match is de pagina slechts demonstratief.
- **BBL-student**: Niet bereikbaar (bolNav alleen voor BOL; BBL ziet bblNav). Geen impact.
- **Bedrijf / School**: Geen impact op hun dashboards.

**Hoeveelheid werk:** Klein. Één regel in utils.js. Hub.html verwijderen. Eventueel `requireRole` toevoegen aan match-dashboard als extra guard.

**Risico's:**
1. **Naamverwarring verdwijnt niet**: "Stage Hub" in de nav en "Stage Hub →" deeplinks verwijzen nu allebei naar match-dashboard — maar de nav-versie heeft geen `?match=`, dus demo-modus. Gebruiker klikt op nav-tab en ziet demo-data; klikt op deeplink en ziet echte data. Verwarrend.
2. **Geen pre-match workspace**: De introductietekst in `hub.html` ("Plan je stage voordat je matcht") vervalt. Er is geen plek voor een student om zich voor te bereiden op matching.
3. **match-dashboard is een eiland**: Na navigatie via de tab belandt de student op een pagina zonder gedeelde student-nav. Geen weg terug naar Vacatures.

---

### Pad B — hub.html = pre-match workspace; match-dashboard = post-match collaboration

**Beschrijving:**  
`hub.html` wordt uitgebouwd als de persoonlijke stagevoorbereiding-werkruimte: leerdoelen, onderzoeksvraag, hub_visibility (wat bedrijven zien op het profiel). `match-dashboard.html` blijft de gedeelde multi-party workspace na acceptatie van een match.

Dit vereist nieuwe DB-kolommen (bijv. `student_profiles.leerdoelen`, `student_profiles.hub_visibility`) of een nieuwe tabel.

**Impact per rol:**
- **BOL-student**: Heeft twee verschillende Stage Hub pagina's voor twee fasen. Logisch als de UX duidelijk communiceert wanneer je op welke pagina moet zijn.
- **BBL-student**: `hub.html` redirect naar `bbl-hub.html` — geen wijziging nodig.
- **Bedrijf**: Ziet op het studentprofiel (discover.html) wat de student in `hub_visibility` vrijgeeft. Vereist aanpassing aan discover.html of company-discover.html.
- **School**: Geen directe impact.

**Hoeveelheid werk:** Groot.
- Schema-wijziging: nieuwe kolommen of tabel.
- hub.html bouwen: formulier voor leerdoelen, onderzoeksvraag, hub_visibility toggles.
- discover.html / company-discover.html aanpassen: hub-data tonen op studentprofielen.
- De deeplink-knoppen "📊 Stage Hub →" op matches.html en mijn-sollicitaties.html logisch houden (wijzen naar match-dashboard, niet hub.html).

**Risico's:**
1. De twee pagina's heten beide "Stage Hub" maar hebben fundamenteel verschillende doelen. Naming is lastig.
2. De DB-migratie voor hub_visibility is niet triviaal — welke velden, welke privacy-granulariteit?
3. Fase-overgang (pre-match → post-match) is voor de student niet vanzelfsprekend.

---

### Pad C — hub.html uitbreiden tot volledige vervanging van match-dashboard; match-dashboard deprecated

**Beschrijving:**  
`hub.html` krijgt alle functionaliteit van match-dashboard: tabs voor Planning, Kalender, Stageplan, Taken, Voortgang, Afspraken, Matchpool — plus gedeelde student-nav in plaats van proprietary topbar. `match-dashboard.html` wordt deprecated en op termijn verwijderd.

**Impact per rol:**
- **BOL-student**: Stage Hub in de nav werkt voor zowel pre-match als post-match. Geïntegreerde navigatie. Student verliest het navigatie-eiland-gevoel.
- **BBL-student**: `hub.html` redirect naar `bbl-hub.html` — geen overlap.
- **Bedrijf**: Zou `company-dashboard.html` links naar `match-dashboard.html?match=UUID` moeten krijgen of er nu al links zijn die verlopen. `match-dashboard.html` is ook bereikbaar voor bedrijf en school in de huidige opzet.
- **School**: Idem.

**Hoeveelheid werk:** Zeer groot.
- `match-dashboard.html` is 6141 regels met 8 tabs, proprietary kalender, meeting-flow, reflecties, stageplan, leerdoelen, role-switcher, demo-modus, student-switcher voor bedrijf, school-switcher, matchpool.
- Alles herschrijven met gedeelde student-nav en path-based tab-routing is meerdere sprints werk.
- Bestaande deep-links van `matches.html` en `mijn-sollicitaties.html` moeten worden bijgewerkt.
- Bedrijf en school hebben ook toegang tot match-dashboard — die flows moeten ook meegaan.

**Risico's:**
1. Hoogste regressie-risico: alles wat nu werkt in match-dashboard moet opnieuw werken.
2. Multi-party rol (student + bedrijf + school op dezelfde pagina) past slecht bij de student-only `renderStudentHeader`.
3. Deprecated period: `match-dashboard.html` blijft in FileZilla-structuur totdat alle deeplinks zijn bijgewerkt. Dual-maintenance.

---

## Aanbeveling

**Pad B**, maar gefaseerd en met een naamswijziging.

De introductietekst in `hub.html` ("Plan je stage voordat je matcht. Bedrijven zien straks jouw onderzoeksvraag, leerdoelen en aanpak") beschrijft een duidelijk ander product dan match-dashboard: een persoonlijke workspace voor pre-match profilering. Dat is waardevol en ontbreekt nu echt in het platform.

Pad A gooit dat idee weg voor de kortetermijn-opruim-winst. Pad C is maanden werk met hoog regressie-risico.

Concrete suggestie voor Pad B gefaseerd:
1. Fase 1 (morgen/komende sprint): `hub.html` uitbouwen met leerdoelen-invoer, opgeslagen in een nieuwe of bestaande kolom. Geen hub_visibility nog. Eenvoudig.
2. Fase 2: hub_visibility toggles toevoegen zodat bedrijven kunnen zien wat de student wil tonen.
3. Fase 3 (later): Match-dashboard evalueren. Blijft het nodig naast hub.html? Dan eventueel integreren.

Naamgeving-advies: noem `hub.html` iets als "Mijn Profiel (Stage)" of "Stageprofiel" om verwarring met de `match-dashboard` "Stage Hub" labels te vermijden. Maar dat is een product-beslissing, geen technische.

---

## Open vragen

1. **Welke DB-kolommen zijn gepland voor hub_visibility?** De intro-tekst in `hub.html` veronderstelt dat bedrijven iets kunnen zien op het studentprofiel. Welke velden? `onderzoeksvraag`? `leerdoelen`? `motivatie`? En zitten die al in `student_profiles` of moeten ze worden toegevoegd?

2. **Is match-dashboard.html bedoeld voor BBL?** Er is een `roc_profile_id` in de matches-query. Is dat voor een toekomstige BBL-kopie van match-dashboard, of is match-dashboard nu al bedoeld voor BBL-studenten (die immers ook een actieve match hebben)?

3. **Wie toegang heeft tot match-dashboard voor bedrijf en school?** `match-dashboard.html` ondersteunt drie rollen (student, bedrijf, school). In Pad B of C moet die multi-party functionaliteit ergens naartoe. Is het de bedoeling dat bedrijf en school ook via `/hub.html` gaan, of blijft match-dashboard hun portaal?

4. **Wordt match-dashboard.html nog actief ontwikkeld?** CLAUDE.md meldt "match-dashboard.html vervangt stage-hub.html (dood bestand)". Is match-dashboard.html zelf ook al aan het deprecaten, of is het het aktieve product?

5. **Heeft `requireRole('student')` een plek in hub.html?** Momenteel checkt hub.html alleen `bbl_mode`, niet de rol zelf. Een bedrijfs-account of school-account die `/hub.html` opent, belandt op de placeholder zonder redirect. Is dat acceptabel tijdens de bouwfase, of moet er al een rol-guard bij?
