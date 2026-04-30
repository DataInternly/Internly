# Navigatie-Integriteit Audit — 29 april 2026
Auditor: Claude (general-purpose agent, gedelegeerd door hoofdsessie)
Scope: 39 HTML files (instructie zei 26 — werkelijk aantal afwijkend) + 20 JS files
Methode: read-only grep sweep, drie passes, Reid's zeven faalmodi-classificatie
Sign-off vereist: Reid2 + Hotch2 + 7/11

## Samenvatting

Ongeveer **240 unieke navigatie-utterances** gevonden in de werkdirectory (root HTML + js). Indeling:

- **A WERKEND**: ~210 (~88%). Het overgrote deel van de links wijst correct naar bestaande targets.
- **B DOOD-EIND**: 0 echte 404's in productie-paden. (Enige twijfel: hub.html wordt aangeroepen als impliciete tabset-bestemming via de student-header maar bestaat — als placeholder.)
- **C HERNOEMD**: 0 directe rename-debt. De `bbl-dashboard.html` / `bbl-hub.html` paar is geen rename — beide bestaan parallel.
- **D PLACEHOLDER**: 1 (`hub.html` — "Stage Hub wordt morgen verder gebouwd"). Niet rechtstreeks aangelinkt vanuit een productieflow, maar wel bereikbaar.
- **E CONDITIONEEL**: 6 (post-login redirects in discover.html, matches.html, mijn-sollicitaties.html die MBO_BOL-studenten naar `bol-profile.html` kicken — zelfs als ze al een profiel hebben; eerder geflagged in `_archief/.../CODEBASE_AUDIT_2026-04-21.md`).
- **F VERKEERDE FALLBACK**: 1 forensisch bewezen (`auth.html:849` — bij bestaand BOL-profiel valt fallback terug op `match-dashboard.html` i.p.v. `discover.html`, dat conflicteert met `js/utils.js getRoleLanding()` die `discover.html` retourneert).
- **G NON-RESPONSIVE**: 2 (`bbl-dashboard.html:549` `<a href="">`; `company-dashboard.html:1012` `<a id="cpv-website" href="#">` zonder bound handler — wordt later gevuld via JS, niet altijd).

**Top zorg**: er draaien **drie parallelle post-login student-routers** (`utils.js getRoleLanding/routeStudentByMode`, `roles.js resolveStudentDashboard`, `auth.html ROUTES`), en ze geven **verschillende bestemmingen** voor exact dezelfde input (BOL-student met profiel). CLAUDE.md zegt expliciet "routeStudent() in utils.js — enige routing-beslisser (7/11)". Dat klopt niet meer. Zie eindvraag 3.

---

## TABEL 1 — Navigation map

Sortering: B → C → D → E → F → G → A. Binnen klassificatie alfabetisch op file. (Voor klasse A — verreweg de grootste groep — zijn alleen de patroon-categorieën samengevat in plaats van elke link individueel; volledige opsomming staat in PASS 1 grep-output `tool-results/toolu_01HfjdyPPLFJ7FogwHo71cus.txt` voor hyperlink-opvolging.)

| Bron-file | Regel | Trigger | Target | Klasse | Opmerking |
|-----------|-------|---------|--------|--------|-----------|
| [hub.html](hub.html) | 1-45 | (page itself) | n.v.t. — placeholder body | **D** | "Stage Hub wordt morgen verder gebouwd". Pagina bestaat in root, wordt geladen door `requireMode('bol')` maar bevat alleen TODO-tekst. Nergens direct gelinkt vanuit productie-pagina's; BOL-route eindigt op `match-dashboard.html` of `discover.html`. Reachable via direct URL. |
| [discover.html:1403](discover.html#L1403) | 1403 | `window.location.replace('bbl-hub.html')` indien `sp?.bbl_mode === true` | bbl-hub.html | **E** | Conditioneel correct (BBL → BBL-hub). |
| [discover.html:1405](discover.html#L1405) | 1405 | `window.location.replace('student-profile.html')` indien `!sp || !sp.naam` | student-profile.html | **E** | Conditioneel — onboarding-redirect. |
| [matches.html:704](matches.html#L704) | 704 | `window.location.replace('bbl-hub.html')` | bbl-hub.html | **E** | Conditioneel correct. |
| [matches.html:705](matches.html#L705) | 705 | `window.location.replace('bol-profile.html')` indien `sp?.onderwijsniveau === 'MBO_BOL'` | bol-profile.html | **E** | **Bekend probleem** — eerder geaudit: stuurt MBO-BOL studenten weg bij elk bezoek, ook als ze al een profiel hebben. Zie `_archief/ex_2026-04-20-21/CODEBASE_AUDIT_2026-04-21.md:540`. |
| [mijn-sollicitaties.html:806](mijn-sollicitaties.html#L806) | 806 | `window.location.replace('bbl-hub.html')` | bbl-hub.html | **E** | Conditioneel correct (BBL). |
| [mijn-sollicitaties.html:807](mijn-sollicitaties.html#L807) | 807 | `window.location.replace('bol-profile.html')` indien `sp?.onderwijsniveau === 'MBO_BOL'` | bol-profile.html | **E** | Zelfde patroon als matches.html:705 — MBO-BOL kick-out. |
| [auth.html:849](auth.html#L849) | 849 | `window.location.href = targetPage \|\| 'match-dashboard.html'` | match-dashboard.html | **F** | Bij bestaand BOL-profiel: `resolveStudentDashboard()` retourneert `match-dashboard.html` (zie `js/roles.js:80,85`), maar `js/utils.js getRoleLanding()` zou `discover.html` retourneren. **Twee routers, twee bestemmingen, zelfde gebruiker**. CLAUDE.md zegt BOL-hub = `match-dashboard.html`; `js/utils.js:12,22,426` zeggen `discover.html`. Single source of truth ontbreekt — dit is een `F`-patroon: de fallback-keuze leidt naar de "verkeerde" pagina afhankelijk van welk router-mechanisme actief is. |
| [bbl-dashboard.html:549](bbl-dashboard.html#L549) | 549 | `<a href="">Opnieuw proberen</a>` | (lege href = reload current page) | **G** | Lege href reload de pagina. Bedoeld als "probeer opnieuw" link bij `student_profiles` query-fout. Werkt feitelijk (browser herlaadt) maar niet semantisch — moet `onclick="location.reload()"` zijn. |
| [company-dashboard.html:1012](company-dashboard.html#L1012) | 1012 | `<a id="cpv-website" href="#" target="_blank">` | (geen) | **G** | href="#" wordt later via JS gevuld met externe website van een bedrijf. Als JS faalt blijft `#` staan en opent de link niets nuttigs. Geen bound `onclick` tot vulling. |
| [company-dashboard.html:996](company-dashboard.html#L996) | 996 | `<a href="#" onclick="show('new');return false;">` | (in-page tab switch) | **G** | href="#" met onclick. Werkt — niet echt non-responsive, maar pattern is een bekende anti-pattern. Acceptabel. |
| [match-dashboard.html:1988](match-dashboard.html#L1988) | 1988 | `<a id="back-to-dash" href="#" class="role-switch-btn" style="display:none">` | (display:none) | **G** | Initieel verborgen knop, href="#" zonder handler in HTML. Vereist JS-binding later. Niet getoetst of die binding altijd komt. |
| [international-student-dashboard.html:1635, 1664, 1742](international-student-dashboard.html) | 1635/1664/1742 | `<a href="#" onclick="show(\'discover\')...">` | (in-page tab switch) | A (acceptabel) | href="#" met functionele onclick → werkt. Klasse A omdat tab-switching geen externe navigatie is. |
| [spelregels.html:422](spelregels.html#L422) | 422 | `<a class="t-back" href="#" onclick="history.back();return false;">` | history.back() | A | Werkt. Acceptabel patroon. |
| [Logo links — about/admin/bbl-profile/begeleider-dashboard/bol-profile/buddy-dashboard/company-dashboard/company-discover/faq/match-dashboard/pricing/school-dashboard/vacature-detail](.) | div. | `<a href="#" onclick="event.preventDefault();smartHomeRedirect();">` | smartHomeRedirect() → utils.js routes per rol | A | href="#" met functionele onclick → A. 13 hits, allemaal correct. |
| **Klasse A — bulk samenvatting** | — | `location.href = '<file>.html'` (51 hits in root .html, 13 hits in js/) | div. bestaande targets | A | Targets: `auth.html`, `index.html`, `discover.html`, `bbl-hub.html`, `bbl-profile.html`, `student-profile.html`, `bol-profile.html`, `match-dashboard.html`, `matches.html`, `mijn-sollicitaties.html`, `mijn-berichten.html`, `chat.html`, `pricing.html`, `company-discover.html`, `buddy-dashboard.html`, `international-school-dashboard.html`, `kennisbank.html`. Alle bestaan in werkdirectory. |
| **Klasse A — bulk** | — | `location.replace('<file>.html')` (~30 hits) | div. | A | Alle targets bestaan. Veel `auth.html?expired=1` patronen voor session-timeout. |
| **Klasse A — bulk** | — | `<a href="..html">` static links (~150 hits in root pages) | div. | A | Topbars, footers, breadcrumbs, tab-bars. Targets: about, discover, faq, pricing, stagebegeleiding, kennisbank, privacybeleid, spelregels, esg-rapportage, auth, index, matches, mijn-sollicitaties, match-dashboard, student-profile, bol-profile, bbl-profile, bbl-hub, bbl-dashboard, vacature-detail, review-form, chat, mijn-berichten, school-dashboard, company-dashboard, company-discover, buddy-dashboard, internly_simulator, kennisbank-artikel, la-sign. Alle bestaan. |
| **Klasse A — bulk** | — | `onclick="window.location.href='..html'"` (~25 hits in root) | div. | A | Tab-buttons (mt-tab in matches.html), nav-buttons (school-dashboard, company-dashboard), upgrade-CTAs naar pricing.html. Alle targets bestaan. |
| **Klasse A** | — | routing helpers: `smartHomeRedirect()` (13 logo-links), `goBack(...)` (4 hits), `requireRole()` (chat.html:1417), `requireMode()` (hub.html:40, mijn-berichten implicit), `routeStudentByMode()` (bol-profile.html:1247, utils.js), `getRoleLanding()` (chat.html:1442, utils.js, index.html), `resolveStudentDashboard()` (auth.html:847, roles.js) | div. | A | Functioneel — alle helpers bestaan en routeren naar bestaande pagina's. **Maar**: parallelle systemen, zie tabel 3 + eindvraag 3. |

---

## TABEL 2 — Dood-eind concentratie

Sortering: aflopend op aantal bron-files. Een dood-eind dat 7 keer aangeroepen wordt staat bovenaan. **In root staan geen echte 404's.** Het BACKUP/ en _revamp_2026-04-29/ subboomen worden NIET geserveerd in productie en zijn buiten scope.

| Missend target | Aantal verschillende bron-files | Bron-files | Opmerking |
|----------------|--------------------------------|------------|-----------|
| `wachtwoord-vergeten.html` | 1 (alleen in `_revamp_2026-04-29/example_auth.html` — buiten scope) | example file | OUT-OF-SCOPE — wel een waarschuwing voor toekomstige refactor: het revamp-template verwijst al naar wachtwoord-vergeten.html dat nog niet bestaat. |
| `stage-hub.html` | 0 in productie root | — | CLAUDE.md noemt dit expliciet als dood bestand. Verificatie: 0 referenties in root .html en js/. Goed opgeruimd. |
| (verder geen) | — | — | Geen enkel target uit productie-files (.html in root, js/) levert een 404 op. |

**Conclusie tabel 2**: het platform heeft GEEN echte dood-eindes in productie. De grootste navigatie-risico's zijn niet B (404), maar F (verkeerde routing-fallback) en E (over-aggressieve conditionele redirects).

---

## TABEL 3 — Routing-mechanisme inventaris

| Mechanisme | Aantal voorkomens (productie) | Files | Gaat door routeStudent / resolveStudentDashboard? |
|------------|-------------------------------|-------|---------------------------------------------------|
| `window.location.href = 'literal.html'` | ~50 (incl. JS) | admin, auth, bbl-dashboard, bbl-hub, bbl-profile, begeleider-dashboard, bol-profile, buddy-dashboard, chat, company-dashboard, company-discover, discover, index, international-school-dashboard, international-student-dashboard, match-dashboard, matches, mijn-berichten, mijn-sollicitaties, pricing, school-dashboard, student-profile, vacature-detail, js/account.js, js/matchpool.js, js/utils.js | Nee — bypassen alle routers |
| `window.location.replace('literal.html')` | ~30 | admin, auth, bbl-dashboard, bbl-hub, bbl-profile, begeleider-dashboard, bol-profile, buddy-dashboard, chat, company-dashboard, company-discover, discover, index, international-school-dashboard, international-student-dashboard, kennisbank-artikel, match-dashboard, matches, mijn-berichten, mijn-sollicitaties, review-form, school-dashboard, student-profile, vacature-detail, js/supabase.js, js/utils.js | Nee — bypass |
| `<a href="literal.html">` (static) | ~150 in root | bijna elk bestand met topbar/footer/tabs | Nee — directe links |
| `<button onclick="window.location.href='..'">` | ~25 in root | begeleider-dashboard, company-dashboard, matches, school-dashboard, plus inline upgrade-buttons | Nee — bypass |
| `smartHomeRedirect()` (utils.js) | 13 logo-links + 1 helper-call | about, admin, bbl-profile, begeleider-dashboard, bol-profile, buddy-dashboard, company-dashboard, company-discover, faq, match-dashboard, pricing, school-dashboard, vacature-detail | Ja — `smartHomeRedirect` zelf gebruikt `getRoleLanding` (intern utils.js). |
| `getRoleLanding(role, bblMode)` (utils.js) | 4 calls (utils.js:48, utils.js:101, chat.html:1442, index.html:1851) | utils.js, chat.html, index.html | Ja — utils.js's eigen ROLE_LANDING-mapping. **Voor BOL-student → `discover.html`**. |
| `routeStudent(profile, sp)` (utils.js:386) | 0 directe calls in scope | — | **Niet meer aangeroepen!** CLAUDE.md noemt `routeStudent()` als "enige routing-beslisser (7/11)" maar er is geen call site. Dood/onbereikbaar pad. |
| `routeStudentByMode(sp)` (utils.js:416) | 1 directe call (bol-profile.html:1247 via track-switch) + indirect via `routeStudent` (dood) en `requireMode` (utils.js:195) | bol-profile.html, utils.js | Ja — eigen logica: BOL → `discover.html`, BBL → `bbl-hub.html`. |
| `resolveStudentDashboard(profile, sp)` (roles.js:78) | 1 directe call (auth.html:847) | roles.js, auth.html | **Concurrent router** — voor BOL-student met profiel retourneert deze `'match-dashboard.html'`, niet `'discover.html'`. Conflicteert met utils.js. |
| `routeForRole(roleKey)` (roles.js:48) | 0 in scope (gedefinieerd, niet aangeroepen) | roles.js | Dood — gedefinieerd op `window.Internly.routeForRole` maar nergens aangeroepen in root .html of js/. |
| `requireRole(...allowedRoles)` (utils.js:93) | 1 directe call (chat.html:1417) | utils.js, chat.html | Auth-guard, niet post-login routing. Op fail: `replace('auth.html')` of `replace(getRoleLanding(role))`. |
| `requireMode(...allowedModes)` (utils.js:170) | 1 directe call (hub.html:40) | utils.js, hub.html | Auth-guard. Bypasst routeStudent. |
| `auth.html ROUTES` constant (auth.html:647) | 2 read-sites (auth.html:858, auth.html:1128) | auth.html | **Vierde concurrent router**. Hardcoded mapping `student → discover.html`, etc. Wordt overruled door BBL-check op regel 1136. |
| `goBack(fallbackHref)` (utils.js:213) | 4 calls (begeleider-dashboard:475, buddy-dashboard:278, company-dashboard:671, school-dashboard:680) | utils.js + 4 dashboards | Geen post-login routing — `history.back()`-wrapper. |
| `<form action="...">` | 0 hits | — | Geen HTML form-based navigation. |

---

## Security-flag (Bedward) — open redirect check

Gezochte patronen:
- `location.href = '?next=' + ...`
- `location.href = ... + searchParams.get(...)`
- `URLSearchParams(...).get('redirect')` gevolgd door direct `location.href = result`
- `location.href|replace(...)` met directe stringconcat van een `.get('redirect'|'next')` resultaat
- `?next=`, `?redirect=` in literals waar de waarde ongetypecheckt naar `location` gaat

**Resultaat: 0 gevonden in productie root.**

Wel relevant maar niet exploitable:
- `auth.html?redirect=` wordt aangemaakt op 4 plekken (`match-dashboard.html:2689`, `pricing.html:669`, `review-form.html:342`, `js/utils.js` indirect via `auth.html` flow). De `?redirect=` value bevat `encodeURIComponent(window.location.href)` — eigen origin, niet user-controlled in een gevaarlijke vorm.
- `auth.html` zelf **leest de `?redirect=` parameter NIET terug** (Grep op `auth.html` voor `redirect` levert alleen comment-strings en de redirect= als URL-parameter naar `auth.html?expired=1` op — geen `.get('redirect')` of vergelijkbaar). Dus de redirect= parameter is functioneel dood: het wordt geschreven maar nooit teruggelezen. Geen open-redirect risico, maar wel een **dead UX feature** (gebruiker komt na login niet terug op de pagina waar hij vandaan kwam — wordt naar standaard rol-landing gestuurd).
- `URLSearchParams(window.location.search).get('niveau'|'filter'|'slug'|'match'|'for'|'token')` worden alleen gebruikt voor in-page filtering of DB-query, **niet** voor `location.href` toewijzing.

---

## Antwoorden op de drie eindvragen

### 1. Top-3 dood-eind van het platform (klassificatie B)

**Geen B-klasse dood-eindes in productie root.** Het platform is in dit opzicht schoon. De dichtsbijzijnde "dood-eindes" zijn:

1. **`hub.html`** — bestaat maar is een placeholder-stub (klasse D). BOL-studenten met `requireMode('bol')` komen hier alleen via directe URL — er is geen knop in productie die hier naartoe linkt. Bereikbaar maar verlaten.
2. **`routeStudent()` in `js/utils.js:386`** — gedefinieerde functie, 0 callsites in scope. Klasse D voor functies (placeholder-implementatie of historisch gebruik). CLAUDE.md zegt expliciet "enige routing-beslisser (7/11)" — onjuist; functie is dood.
3. **`window.Internly.routeForRole`** in `js/roles.js:48` — gedefinieerd, 0 callsites. Idem dood.

### 2. Welk navigatie-point ervaren gebruikers het meest waarschijnlijk als "stuurt me niet naar de juiste pagina"

**De BOL-student post-login flow.** Een ingelogde BOL-student die `auth.html` opent (via "ben al ingelogd" panel) of een verlopen sessie heeft, kan:

- Via `auth.html:849` (`resolveStudentDashboard` of fallback) → **`match-dashboard.html`**
- Via `auth.html:858` (rol heeft geen sp-data) → **`discover.html`** (uit ROUTES)
- Via `auth.html:1142` (`alreadyDashBtn`) → **`discover.html`** (uit ROUTES)
- Via `js/utils.js getRoleLanding` (gebruikt door `smartHomeRedirect` op elke logo-klik) → **`discover.html`**
- Via `js/utils.js routeStudentByMode` (gebruikt na profiel-save) → **`discover.html`**
- Via `js/roles.js routeForRole` (dood) → **`discover.html`** (zou)
- Via `matches.html:705` of `mijn-sollicitaties.html:807` als ze MBO-BOL zijn → **gekickt naar `bol-profile.html`** zelfs met compleet profiel (klasse E, bekend bug)

Een MBO-BOL student die op `discover.html` zit en op de `Matches` tab klikt, wordt onderbroken en doorgestuurd naar `bol-profile.html`. Een student die op de logo klikt op `match-dashboard.html` komt op `discover.html` (via smartHomeRedirect) — niet terug op match-dashboard. **Dit is de hoogst-waarschijnlijke "verkeerde pagina"-ervaring.**

Hoog-traffic ondersteunend bewijs: 7 verschillende files redirecten naar `discover.html` na auth-success, terwijl `auth.html:849` alleen voor BOL met profiel naar `match-dashboard.html` gaat. De inkonsistentie is structureel.

### 3. Hoeveel verschillende routing-mechanismen draaien parallel, en welke is canoniek volgens de codebase zelf

**Tien parallelle mechanismen** (uit tabel 3, exclusief auth-guards en goBack):

1. Directe `location.href = 'literal'` (~50)
2. Directe `location.replace('literal')` (~30)
3. Static `<a href>` (~150)
4. `onclick="window.location.href='..'"` (~25)
5. `smartHomeRedirect()` — utils.js
6. `getRoleLanding(role, bblMode)` — utils.js
7. `routeStudent(profile, sp)` — utils.js (DOOD, 0 callsites)
8. `routeStudentByMode(sp)` — utils.js
9. `resolveStudentDashboard(profile, sp)` — roles.js (CONCURRENT: andere bestemming dan utils.js)
10. `routeForRole(roleKey)` — roles.js (DOOD)
11. `auth.html ROUTES` constant (4e router, hardcoded mapping)

**Canoniek volgens de codebase zelf**:
- CLAUDE.md regels 18-22 zeggen: **`routeStudent()` in utils.js is "enige routing-beslisser (7/11)"**.
- Code-realiteit: `routeStudent()` heeft **0 callsites** in productie. Dood pad.
- De feitelijk meest-gebruikte router is **`smartHomeRedirect()` + `getRoleLanding()`** in utils.js (13 logo-links + interne calls), gevolgd door `routeStudentByMode()`.
- `auth.html` gebruikt nóg een eigen `ROUTES` constante én `resolveStudentDashboard()` uit `roles.js`. Beide retourneren niet hetzelfde bestand voor dezelfde input.

**Conclusie**: er is geen werkende canonical router. CLAUDE.md beschrijft de bedoelde architectuur, niet de daadwerkelijke. De Sprint-5 hub-stuk uit CLAUDE.md "K3 (7/11 principe): OPGELOST" is voor `hasActivePlan()` — niet voor routing. Routing-consolidatie is nog open werk.

---

## Methodologie-noten

### Welke patronen zijn niet doorzocht / waarom

- **`<form action=...>`**: 0 hits in scope — geen form-navigatie in het platform.
- **`window.location =` (without `.href`)**: 0 hits — patroon wordt niet gebruikt.
- **`location.assign(...)`**: 0 hits — niet gebruikt.
- **CSS `:hover` states / `cursor:pointer`**: expliciet uit scope per instructie.
- **`mailto:`, `tel:`, externe `https://` links**: expliciet uit scope per instructie. Wel aangetroffen: `mailto:hallo@internly.pro` (pricing.html:519), `https://internly.pro/privacybeleid.html` (privacybeleid.html:719 — self-reference, OK).
- **Markdown-bestanden in `_archief/`, `BACKUP/`, `_revamp_2026-04-29/`**: niet als productie-bron geteld. Wel als referentie-bewijs gebruikt voor known-issues.
- **`supabase/functions/*.ts`**: bevatten 1 hit (`mollie-webhook/index.ts`) — server-side, geen browser-navigation. Buiten scope.

### Onzekerheden / borderline klassificaties

- **`href=""` op bbl-dashboard.html:549** kan strict gezien als "werkend" worden bestempeld (browser herlaadt dezelfde URL). Klasse G gekozen omdat de intentie ("Opnieuw proberen") niet overeenkomt met het feitelijke gedrag (volledige reload, verlies van context). Borderline G/A.
- **`hub.html`** is geclassificeerd als D (placeholder). Maar het bestaat in de root en wordt door geen enkele andere pagina gelinkt — dus eerder een verlaten/dood bestand dan een productieve placeholder. Borderline D/dead-file.
- **`auth.html:849` `match-dashboard.html` fallback** is geclassificeerd als F omdat de "verkeerde" bestemming subjectief is (twee routers oneens). Strict gezien is het geen 404 of placeholder — het is een routing-conflict. Klasse F is hier de juiste keuze want de fallback-tak (`'match-dashboard.html'`) hoort niet bij de utils.js-canon (`'discover.html'`).
- **In-page tab-links** (`<a href="#" onclick="show('tab')">`) zijn als A geteld omdat ze tab-switching binnen één pagina zijn, geen externe navigatie. Dat is een conventie-keuze.

### Discrepantie 26 vs 39 HTML files

De auditinstructie noemt "26 HTML files". Werkelijk aantal in `c:\Projects\Internly\` (root, niet recursief): **39**. Vermoedelijke oorzaak van discrepantie:

- Het getal 26 sluit waarschijnlijk publieke marketing-pagina's uit (404, about, faq, index, pricing, privacybeleid, spelregels, stagebegeleiding, kennisbank, kennisbank-artikel, esg-rapportage, esg-export, internly_simulator, preview = 14 publieke). Of het sluit nieuwere bestanden uit (international-school-dashboard, international-student-dashboard, la-sign, hub, bbl-dashboard, matchpool, mijn-berichten, esg-export, esg-rapportage, admin = ~10 recent toegevoegd).
- 39 - 13 ≈ 26: aannemelijk dat 13 nieuwer-toegevoegde of marketing-pagina's destijds ongeteld waren. **Geen actie nodig** — de audit is uitgevoerd op alle 39.

Volledige bestandslijst (39):
404, about, admin, auth, bbl-dashboard, bbl-hub, bbl-profile, begeleider-dashboard, bol-profile, buddy-dashboard, chat, company-dashboard, company-discover, discover, esg-export, esg-rapportage, faq, hub, index, international-school-dashboard, international-student-dashboard, internly_simulator, kennisbank, kennisbank-artikel, la-sign, match-dashboard, matches, matchpool, mijn-berichten, mijn-sollicitaties, preview, pricing, privacybeleid, review-form, school-dashboard, spelregels, stagebegeleiding, student-profile, vacature-detail.

---

## ADDENDUM — 29 april 2026 (post-sign-off errata)

Een aanvullende sweep na sign-off bracht vier patronen aan het licht die de eerste pass niet expliciet had doorzocht. Geen van vieren wijzigt de top-3 conclusies of de canon-besluiten, maar Tabel 3 en de security-flag krijgen een correctie.

### Errata bij Tabel 3 — Routing-mechanisme inventaris

Twee mechanismen ontbraken. Bijgewerkt totaal: **12 mechanismen** (was 10), waarvan 2 server-side.

| Mechanisme | Aantal voorkomens | Files | Door routeStudent/resolveStudentDashboard? |
|------------|-------------------|-------|---------------------------------------------|
| Apache `RewriteRule` (HTTPS-force, 301) | 1 | [.htaccess:10](.htaccess#L10) | Server-side, n.v.t. |
| Apache `ErrorDocument` (404 → /404.html) | 1 | [.htaccess:5](.htaccess#L5) | Server-side, n.v.t. |
| `window.open()` | 1 | [js/esg-export.js:217](js/esg-export.js#L217) → `/esg-export.html` (`_blank`) | Nee — directe target |
| Service Worker `client.navigate()` | 1 | [sw.js:44](sw.js#L44) | Nee — gebruikt `data.url` uit push payload |
| Service Worker `clients.openWindow()` | 1 | [sw.js:48](sw.js#L48) | Nee — gebruikt `data.url` uit push payload |

**`history.replaceState` (3 hits)** — [auth.html:628](auth.html#L628), [company-dashboard.html:2724](company-dashboard.html#L2724), [school-dashboard.html:2341](school-dashboard.html#L2341) — bewust **buiten scope**: ruimt alleen URL-params op (`window.location.pathname`) na auth callback, geen page navigation. Vermeld voor volledigheid; geen klassificatie.

### Errata bij Tabel 1 — gemiste nav-point

| Bron-file | Regel | Trigger | Target | Klasse | Opmerking |
|-----------|-------|---------|--------|--------|-----------|
| [js/esg-export.js:217](js/esg-export.js#L217) | 217 | `window.open('/esg-export.html', '_blank')` | esg-export.html | **A** | Target bestaat; opent in nieuwe tab vanuit ESG-dashboard. Geen routing-helper, directe string. |

### Errata bij security-flag (Bedward) — sw.js push-payload navigatie

De oorspronkelijke open-redirect-check zocht naar `?next=` / `?redirect=` patronen in user-input → location. Resultaat 0 was correct voor dat patroon. **Maar** `sw.js` heeft een aparte navigatie-vector die niet onderzocht is:

```js
// sw.js:38-50 (notificationclick handler)
const url = event.notification.data?.url || '/';
// ...
if (client.url.includes('internly.pro') && 'focus' in client) {
  return client.navigate(url).then(c => c.focus());  // regel 44
}
if (clients.openWindow) return clients.openWindow(url);  // regel 48
```

**Bevinding:** `data.url` komt uit de push-notification payload (geproduceerd door Edge Function `send-push-notification` op een `notifications` INSERT-webhook — zie sw.js:97-98 implementation note). De `client.url.includes('internly.pro')` check op regel 44 valideert de **bestaande tab**, niet de **target-URL** van `client.navigate(url)`. Als het `notifications.url`-veld ooit user-controlled input bevat (chat-bericht, profielveld, een vacature-deeplink uit company input), kan een aanvaller een gebruiker met een open Internly-tab naar een willekeurige URL navigeren via een geprepareerde notificatie.

**Status:** geen bewijs van exploit zonder RLS- en data-flow-analyse op `notifications.url`. Markering: **REVIEW — open-redirect-adjacent**, geen confirmed vuln. Aparte security-sweep nodig op de write-paden naar `notifications.url`. Niet vermengen met deze navigatie-audit.

**Aanbeveling (informatief, geen fix in fase 2):** een same-origin guard in sw.js — bv. `const target = new URL(url, self.location.origin); if (target.origin !== self.location.origin) return clients.openWindow('/');`

### Errata bij methodologie-noten

Toe te voegen aan de "patronen niet doorzocht" lijst van de oorspronkelijke methodologie:
- `<meta http-equiv="refresh">` — gecontroleerd in addendum-sweep, **0 hits**, schoon.
- `window.open(` — alleen `js/esg-export.js:217` (zie boven).
- Service worker `client.navigate` / `clients.openWindow` — alleen `sw.js` (zie boven).
- Apache mod_rewrite — alleen `.htaccess` (zie boven).
- `history.pushState/replaceState` — out-of-scope, 3 benigne hits gedocumenteerd.

### Impact op kernconclusies

- **Top-3 dood-eindes:** ongewijzigd.
- **Eindvraag 2 (UX-pijn):** ongewijzigd — auth.html:849 mismatch blijft het meest voelbare punt (door fase 2 als canon-correct vastgelegd).
- **Eindvraag 3 (mechanismen):** **12 mechanismen, niet 10**. Canoniek mechanisme blijft `getRoleLanding` in utils.js (na fase 2 fix).
- **Bedward open-redirect:** van "0 found" naar "0 found in user-input → location.href, plus 1 REVIEW-item in service worker push-payload navigatie". De expliciete nul blijft overeind voor het oorspronkelijke patroon; het extra item is een aparte categorie.
