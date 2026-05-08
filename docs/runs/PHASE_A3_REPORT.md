# PHASE A.3 REPORT — 7/11 completeness scan

**Datum** 2026-05-03
**Defect** FTP-04 — hub-pattern discrepantie tussen dashboards
**Stop-conditie** Geen patch. Alleen tabel.

---

## Methode

1. Inventarisatie alle dashboard-files via `ls *.html | grep -E "(school|buddy|international|begeleider)"`
2. Per dashboard targeted grep op:
   - `renderStudentHeader` / `renderRoleHeader` / `welcome-overlay`
   - `greeting` / `welkom` / `goedemorgen` / `hero` / `overz-greeting`
   - `page-title` / `<h1` / `topbar`
3. Per dashboard regio gelezen die de hero/welkom-zone bevat
4. Tabel ingevuld met canonical 7/11-vergelijking

---

## Compleete dashboard-inventaris

| Dashboard | Bestand | Regels |
|-----------|---------|--------|
| Student (BOL/HBO/WO landing) | student-home.html | 270 |
| BBL student | bbl-hub.html | ~3000 |
| Bedrijf | company-dashboard.html | ~3500 |
| School | school-dashboard.html | 2706 |
| Begeleider | begeleider-dashboard.html | 1394 |
| Buddy (gepensioneerd) | buddy-dashboard.html | 1480 |
| Internationaal student | international-student-dashboard.html | 2362 |
| Internationaal school | international-school-dashboard.html | 1010 |
| Match-dashboard (Stage Hub) | match-dashboard.html | ~6200 |

---

## Tabel — Hub-pattern element per dashboard

| Pagina | Greeting-hero | renderStudentHeader | renderRoleHeader | Action-cards | Hub-card | Welcome-overlay | Verdict |
|--------|---------------|---------------------|------------------|--------------|----------|------------------|---------|
| **student-home.html** | ✓ inline `.sh-hero` (regel 159-163) | ✓ regel 289 | — | ✓ `.sh-cards` (regel 173-201) | ✓ `.sh-hub-card` (regel 204-213) | n/a (init) | **CANON** |
| **bbl-hub.html** | — (legacy `.topbar`) | — | — | — | — | n/a | LEGACY topbar-only |
| **company-dashboard.html** | ✗ — direct `<div class="page-title">Dashboard</div>` (regel 740) | — | — | ✗ | — | n/a | **MISSING** |
| **school-dashboard.html** | ✗ — `<div class="page-title">Schooldashboard</div>` (regel 717) | — | — | ✗ | — | ✓ js/welcome-overlay.js geladen (regel 20) | **MISSING permanent**, alleen overlay-modal |
| **begeleider-dashboard.html** | ✗ — `<span class="role-pill">📋 Begeleider</span>` (regel 452) | — | — | ✗ | — | ✗ | **MISSING** |
| **buddy-dashboard.html** | ✓ `.overz-greeting` (regel 332-336) | — | ✓ regel 829, 1349 (`renderRoleHeader('gepensioneerd', sectionId, ...)`) | partial — section-based nav | — | n/a | **EIGEN PATTERN** (renderRoleHeader, niet sh-) |
| **international-student-dashboard.html** | ✗ — `<div class="page-title">Your journey</div>` (regel 865) | — | — | ✗ | — | ✓ regel 44 (welcome-overlay.js) + regel 1147 (overlay call) | **EIGEN PATTERN** (English, eigen sidebar) |
| **international-school-dashboard.html** | ✗ — `<div class="page-title">My students</div>` (regel 514) | — | — | ✗ | — | ✗ | **EIGEN PATTERN** (English, minimaal) |
| **match-dashboard.html** | ✗ — eigen `#hub-topbar` + sidebar | ✓ via Sessie 3 ([regel 2086](match-dashboard.html#L2086)) | — | n/a (lifecycle-tabs) | n/a | ✓ via maybeShowWelcomeOverlay | **EIGEN PATTERN** (multi-role Stage Hub) |

---

## Patroon-bevindingen

### 1. CANON (1 pagina): student-home.html
- Gebouwd als "thuis"-pagina voor BOL/HBO/WO student
- Inline `.sh-*` CSS, niet shared
- Roept `renderStudentHeader()` aan (gemeenschappelijke nav-header)
- Greeting-hero is **inline HTML+CSS, geen reusable component**

### 2. EIGEN PATTERN (3 pagina's): buddy-dashboard, international-* dashboards
- Buddy gebruikt `renderRoleHeader('gepensioneerd', ...)` met eigen `.overz-greeting` styling
- International-* gebruiken eigen sidebar zonder shared header
- match-dashboard heeft eigen `#hub-topbar` + sidebar architectuur

### 3. MISSING (3 pagina's): company-dashboard, school-dashboard, begeleider-dashboard
- Geen permanent greeting-hero
- Beginnen direct met `<div class="page-title">[label]</div>`
- school-dashboard heeft alleen welcome-overlay.js geladen — modal, niet permanent

### 4. LEGACY (1 pagina): bbl-hub.html
- Eigen legacy `.topbar` met gradient
- Geen integratie met student-header-pattern uit Sessie 3 spec

---

## 7/11-overtreding analyse

**HEADER_NAV_BY_ROLE** in [js/utils.js:662-692](js/utils.js#L662-L692) is wel gedefinieerd voor `student`, `student_bbl`, `gepensioneerd`. Voor `bedrijf`, `school`, `begeleider` zijn nav-items niet gedefinieerd in deze tabel — die rollen gebruiken eigen sidebar-architectuur.

**Greeting-hero pattern** is **NIET** gedefinieerd in shared lib. Drie aparte implementaties:
- student-home: inline `.sh-hero` HTML+CSS
- buddy-dashboard: inline `.overz-greeting` HTML+CSS
- match-dashboard: eigen `.hub-context-strip` (uit Sessie 3)

**Conclusie**: 7/11-overtreding is bevestigd voor greeting-hero. Geen shared contract bestaat.

---

## TQ-vraag — past hub-shape voor school-rol?

**Aanname**: "Alle dashboards moeten dezelfde hub-shape hebben"
**Antwoord**: **NEE — niet voor alle rollen identiek.**

Reasoning:
- **School-begeleider** heeft een fundamenteel **monitoring** mental model: "welke studenten lopen vast, welke bedrijven zijn risico". Een student-stijl greeting-hero (Goedemorgen + actie-cards naar Ontdek/Profiel) past niet.
- **Bedrijf** heeft een **management** mental model: "wie heeft op mijn vacature gereageerd, wat is mijn Trust Score". Hub-card naar Stage Hub past wel (zoals student), maar action-cards moeten anders zijn.
- **Buddy** heeft al een eigen pattern (renderRoleHeader + overz-greeting) dat past bij het mentor-mental-model.

**Aanbeveling**:
- `renderGreetingHero()` (Fase C.1) moet **slot-based** zijn (zoals plan voorschrijft) zodat elke rol zijn eigen `metaSlot` + `actionSlot` + `hubCardSlot` kan injecteren
- **Fase C.5 condiționeel** is correct — niet blind alle dashboards naar dezelfde hub-shape duwen
- **School + begeleider** hebben mogelijk een sibling-contract nodig: `renderMonitoringHero()` met andere slots (signal-list, risk-counter)
- **International-* dashboards** hebben een document-checklist-pattern (visa, work-auth, housing) dat wezenlijk anders is

---

## Voorgestelde scope voor Fase C migratie

**Aanbevolen migratie naar `renderGreetingHero()` (Fase C):**
- ✓ student-home.html (canonical, no-op visueel)
- ✓ bbl-hub.html (legacy → shared)
- ✓ company-dashboard.html (toevoeging hero, lost FTP-02 op)
- ⚠ buddy-dashboard.html — **niet migreren in deze sessie**, eigen pattern werkt al goed (renderRoleHeader + overz-greeting). Migreren als optionele follow-up.

**Aanbevolen NIET migreren in Fase C:**
- school-dashboard.html — wacht op `renderMonitoringHero()` design
- begeleider-dashboard.html — idem
- international-student-dashboard.html — andere taal + andere mental model
- international-school-dashboard.html — idem
- match-dashboard.html — heeft al eigen Stage Hub-pattern, zou refactor zijn

---

## Build-regel checks

- **7/11**: Same concept (hub-pattern) zit in 3 plekken — overtreding bevestigd. Fase C.1 lost dit op met shared contract.
- **TQ**: Aanname "alle dashboards = zelfde hub-shape" gefalsifieerd. School/begeleider/international hebben fundamenteel ander mental model. Slot-based contract is daarom correct ontwerp; geen forced uniformity.

---

**Einde A.3 rapport.** Geen wijzigingen aangebracht.
