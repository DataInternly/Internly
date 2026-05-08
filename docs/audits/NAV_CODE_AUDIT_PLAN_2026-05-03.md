# INTERNLY — NAVIGATIE CODE-AUDIT + IMPLEMENTATIEPLAN
**Datum:** 3 mei 2026
**Type:** Read-only code-audit (geen wijzigingen)
**Reviewer:** Claude Opus 4.7 (1M context)
**Scope:** Navigatiecode getoetst aan 13 research-bevindingen
**Output:** Drieluik — audit, inzichten, implementatieplan

---

## PRE-FLIGHT

| Metric | Waarde |
|---|---|
| HTML-bestanden in root | 43 |
| `js/utils.js` grootte | 41.512 bytes |
| Nav-relevante functies in utils.js | `renderRoleHeader`, `renderStudentHeader`, `_renderStudentHeaderLoggedIn`, `_renderStudentHeaderLoggedOut`, `getRoleLanding`, `goBack`, `getUnreadTotal` |
| Nav-config object | `HEADER_NAV_BY_ROLE` (regel 662) — bevat enkel `student` + `gepensioneerd` |

---

# DEEL 1 — CODE-AUDIT: 13 RESEARCH-BEVINDINGEN GETOETST

## CHECK-01 | Drie basisvragen: Waar ben ik / Wat kan ik / Waar kan ik naartoe

**Status: PARTIAL**

**Bewijs — actieve tab styling (waar ben ik):**
- [css/style.css:1526](css/style.css#L1526) — `.student-nav a.active { color: #1a7a48; font-weight: 500; border-bottom-color: #1a7a48; }`
- [css/style.css:2131](css/style.css#L2131) — `.role-nav-item.active { ... }`
- [css/style.css:959](css/style.css#L959) — `.mt-tab.active { color: #FF7E42; ... }` (mobile bottom nav)
- [css/style.css:233](css/style.css#L233) — `.topbar .nav a.active { color: #fff; }`

**Bewijs — role-indicator (welke rol ben ik):**
- [company-dashboard.html:595](company-dashboard.html#L595) — `<span class="role-pill">🏢 Bedrijf</span>`
- [school-dashboard.html:617](school-dashboard.html#L617) — `<span class="role-pill">🎓 School</span>`
- [begeleider-dashboard.html:452](begeleider-dashboard.html#L452) — `<span class="role-pill">📋 Begeleider</span>`
- [buddy-dashboard.html:317](buddy-dashboard.html#L317) — `<span class="topbar-tag">Buddy-dashboard</span>`
- **Student-header [js/utils.js:813-840](js/utils.js#L813-L840) — GEEN role-pill**, geen "BOL" / "BBL" / "International" indicator. Header toont alleen logo + nav + avatar.

**Bewijs — contextuele suggesties / next-step hints:**
- Geen breadcrumbs of inline next-step-prompts gevonden buiten welcome-overlay
- [js/welcome-overlay.js](js/welcome-overlay.js) toont éénmalig overlay per user (localStorage flag), geen recurring contextual hints

**Conclusie:** Active-tab styling werkt op alle nav-systemen. Role-pill aanwezig op 4 dashboards (bedrijf/school/begeleider/buddy). **Ontbreekt op student-pagina's** — de grootste rol. Geen contextuele next-step hints buiten eenmalige welcome-overlay.

---

## CHECK-02 | Hick's Law: itemlimiet per rol

**Status: FAIL**

**Bewijs — `HEADER_NAV_BY_ROLE` [js/utils.js:662-681](js/utils.js#L662-L681):**

```js
const HEADER_NAV_BY_ROLE = {
  student: [...],        // 7 items (incl. buddy-tab)
  gepensioneerd: [...],  // 5 items
};
// company / school behouden hun bestaande sidebar-pattern.
```

**Tab-count per rol:**

| Rol | Locatie | Items | Telling |
|---|---|---|---|
| Student BOL | `_renderStudentHeaderLoggedIn` [js/utils.js:798-804](js/utils.js#L798-L804) + buddy [js/utils.js:817](js/utils.js#L817) | 7 | hub, matchpool, discover, sollicitaties, berichten, kennisbank, buddy |
| Student BBL | `_renderStudentHeaderLoggedIn` [js/utils.js:806-810](js/utils.js#L806-L810) + buddy | 5 | bbl-hub, bbl-dashboard, berichten, kennisbank, buddy |
| Gepensioneerd (buddy) | `HEADER_NAV_BY_ROLE.gepensioneerd` [js/utils.js:672-678](js/utils.js#L672-L678) | 5 | overzicht, matches, berichten, notities, profiel |
| Bedrijf | sidebar [company-dashboard.html:640-722](company-dashboard.html#L640-L722) | **14** | dashboard, postings, new, matches, berichten, studenten, discover-stagiairs, reviews, esg, vestigingen, international, profile, pricing, account |
| School | sidebar [school-dashboard.html:660-704](school-dashboard.html#L660-L704) | **12** | dashboard, studenten, signalen, oproepen, new-oproep, bedrijven, berichten, profiel, pricing, bundeling, account, (+ koppellink) |
| Begeleider | sidebar [begeleider-dashboard.html:490-510](begeleider-dashboard.html#L490-L510) | 6 | dashboard, studenten, profiel, account, pricing, kennisbank |

**Conclusie:** Geen contract gedocumenteerd. Bedrijf (14) en school (12) ver boven Hick's Law-richtlijn van 5–7. Student (7) is op de grens. Gepensioneerd (5) en begeleider (6) zijn binnen ratio. CLAUDE.md noemt geen max.

---

## CHECK-03 | Mentale modellen: labels en terminologie

**Status: PARTIAL**

**Student BOL [js/utils.js:798-804](js/utils.js#L798-L804) + [js/utils.js:663-671](js/utils.js#L663-L671):**
```
Mijn Stage Hub | Matchpool | Vacatures | Sollicitaties | Berichten | Kennisbank | Buddy
```

**Student BBL [js/utils.js:806-810](js/utils.js#L806-L810):**
```
BBL Traject | Dashboard | Berichten | Kennisbank | Buddy
```

**Gepensioneerd [js/utils.js:672-678](js/utils.js#L672-L678):**
```
Overzicht | Mijn matches | Mijn berichten | Mijn notities | Mijn profiel
```

**Bedrijf [company-dashboard.html:640-722](company-dashboard.html#L640-L722) (groep-secties):**
```
Beheer:    Dashboard | Mijn vacatures | Nieuwe vacature
Matching:  Matches | Berichten | Mijn studenten | Zoek stagiairs
Reputatie: Reviews | ESG & Rapportage | Vestigingen | Internationaal
Account:   Bedrijfsprofiel | Abonnement | Account
```

**School [school-dashboard.html:660-700](school-dashboard.html#L660-L700):**
```
Dashboard | Mijn studenten | Signalen | Oproepen | Nieuwe oproep |
Bedrijven | Berichten | Profiel | Abonnement | Bundeling | Account
```

**Beoordeling vs externe mentale modellen:**

| Label | Match met... |
|---|---|
| **Vacatures**, **Sollicitaties**, **Berichten** | ✅ Indeed/LinkedIn — herkenbaar |
| **Matchpool** | ⚠️ Internly-eigen term, doelgroep moet uitleg krijgen |
| **Mijn Stage Hub** | ⚠️ Internly-eigen, mengt taal Nederlands+Engels |
| **Trust Score** (in Reputatie) | ⚠️ Eigen term, uitleg vereist |
| **Signalen**, **Oproepen**, **Bundeling** (school) | ⚠️ Intern jargon, niet vanzelfsprekend |
| **Bedrijfsprofiel**, **Abonnement** | ✅ Standaard SaaS-vocabulaire |

**Conclusie:** Standaard labels (Berichten, Sollicitaties, Vacatures) matchen met mentale modellen. Internly-eigen termen (Matchpool, Mijn Stage Hub, Signalen, Bundeling) vereisen onboarding-uitleg. Geen tooltips of contextuele toelichting in code aanwezig.

---

## CHECK-04 | Navigatiepatroon: sidebar vs topnav vs bottom

**Status: PARTIAL — drie parallelle patronen**

**Bewijs — patroon per rol-type:**

| Pagina-type | Patroon | Bewijs |
|---|---|---|
| Student (alle) | **Topnav** via `renderStudentHeader` | [js/utils.js:813-840](js/utils.js#L813-L840) — `<header class="student-header"><nav class="student-nav">` |
| Buddy (gepensioneerd) | **Topnav** via `renderRoleHeader` | [buddy-dashboard.html:312](buddy-dashboard.html#L312) — `<header id="role-header">` |
| Bedrijf | **Sidebar** + topbar + mobile-tabs | [company-dashboard.html:626](company-dashboard.html#L626) — `<aside class="sidebar">` |
| School | **Sidebar** + topbar + mobile-tabs | [school-dashboard.html:660](school-dashboard.html#L660) |
| Begeleider | **Sidebar** + topbar + mobile-tabs | [begeleider-dashboard.html:490](begeleider-dashboard.html#L490) |

**Bewijs — mobile bottom nav:**
- [css/style.css:933-967](css/style.css#L933-L967) — `.mobile-tabs { position: fixed; bottom: 0; ... }`
- [css/style.css:973-979](css/style.css#L973-L979) — `@media (max-width: 768px) { .mobile-tabs { display: flex; } .sidebar { display: none !important; } }`
- Aanwezig in: company-dashboard.html, school-dashboard.html, buddy-dashboard.html, begeleider-dashboard.html
- **Niet aanwezig** in student-pagina's (discover, matchpool, mijn-sollicitaties, student-profile, match-dashboard, mijn-berichten) — search bevestigd: 0 treffers op `mobile-tabs|mt-tab` in student-HTML's

**Bewijs — breakpoint:**
- [css/style.css:973](css/style.css#L973) — `@media (max-width: 768px)`

**Conclusie:** Drie parallelle navigatiepatronen. Bedrijf/school/begeleider gebruiken sidebar + bottom-nav-fallback op mobiel. Student gebruikt alleen topnav, **geen bottom-nav-fallback** — header collapst zonder vervanging op 768px. Buddy is hybride: topnav-header + topbar + privacy-links.

---

## CHECK-05 | Rolsegregatie: renderHeader per rol

**Status: PARTIAL — gemengd: utils + inline**

**Bewijs — render-functies in utils.js:**
- [js/utils.js:696](js/utils.js#L696) — `async function renderRoleHeader(role, activeTab, opts)` — gedeelde implementatie voor `student` + `gepensioneerd`
- [js/utils.js:851](js/utils.js#L851) — `async function renderStudentHeader({...})` — student-specifiek (BOL/BBL split)
- [js/utils.js:783](js/utils.js#L783) — `_renderStudentHeaderLoggedOut()`
- [js/utils.js:791](js/utils.js#L791) — `_renderStudentHeaderLoggedIn({...})`

**Bewijs — wie gebruikt wat:**

| Pagina | Methode | Bewijs |
|---|---|---|
| discover.html | `renderStudentHeader({ activeTab: 'discover' })` | [discover.html:1428](discover.html#L1428) |
| bbl-hub.html | `renderStudentHeader({ activeTab: 'discover' })` | [bbl-hub.html:2563](bbl-hub.html#L2563) |
| matchpool.html | `renderStudentHeader` (zelfde patroon) | [matchpool.html:333](matchpool.html#L333) |
| mijn-berichten.html | beide — fallback `renderStudentHeader` | [mijn-berichten.html:874](mijn-berichten.html#L874) |
| mijn-sollicitaties.html | `renderStudentHeader({ activeTab: 'sollicitaties' })` | [mijn-sollicitaties.html:858](mijn-sollicitaties.html#L858) |
| student-profile.html | `renderStudentHeader({ activeTab: null })` | [student-profile.html:1654](student-profile.html#L1654) |
| buddy-dashboard.html | `renderRoleHeader('gepensioneerd', ...)` via `<header id="role-header">` | [buddy-dashboard.html:312](buddy-dashboard.html#L312) |
| company-dashboard.html | **inline** sidebar (regels 626-722, ~96 regels) | geen render-call |
| school-dashboard.html | **inline** sidebar (regels 660-704, ~44 regels) | geen render-call |
| begeleider-dashboard.html | **inline** sidebar (regels 490-510, ~20 regels) | geen render-call |

**Conclusie:** Twee gedeelde render-functies + drie inline implementaties. Refactor-richting `renderRoleHeader(role)` is gestart (gepensioneerd is gemigreerd, RUN2 1 mei 2026), maar bedrijf/school/begeleider niet. Architectuurdrift met 5 verschillende implementaties.

---

## CHECK-06 | Matchpool: positie in de navigatiehiërarchie

**Status: PARTIAL**

**Student — matchpool als top-level tab:**
- [js/utils.js:665](js/utils.js#L665) — `{ id: 'matchpool', label: 'Matchpool', href: 'matchpool.html', icon: '🌊' }` — **TWEEDE positie** in `HEADER_NAV_BY_ROLE.student`
- [js/utils.js:800](js/utils.js#L800) — `<a href="/matchpool.html" ...>Matchpool</a>` — **TWEEDE positie** in `_renderStudentHeaderLoggedIn` BOL nav
- ✅ **Top-level tab voor student BOL bevestigd**
- ⚠️ **Niet aanwezig in student BBL nav** [js/utils.js:806-810](js/utils.js#L806-L810) — BBL-students kunnen niet naar matchpool

**Bedrijf — "Interesse in jou":**
- [company-dashboard.html:810-815](company-dashboard.html#L810-L815) — sectie binnen "Mijn vacatures" of dashboard:
  ```html
  <!-- ── Interesse in jou (swipe-inbox) ── -->
  <div id="incoming-likes-section" style="display:none;...">
    <div ...>Interesse in jou</div>
    <p>Studenten en buddies die jouw bedrijf een like hebben gestuurd.</p>
  ```
- ⚠️ **Hidden by default** (`style="display:none"`) — sectie zichtbaar via JS-trigger, niet als top-level nav-tab
- ⚠️ Geen `nav-btn` in sidebar voor "Interesse in jou"

**Buddy — geen inbox-variant gevonden:**
- Geen tab "Interesse in jou" of swipe-inbox in `HEADER_NAV_BY_ROLE.gepensioneerd` [js/utils.js:672-678](js/utils.js#L672-L678)
- buddy-dashboard.html bevat tinder-style deck "Studenten die een buddy zoeken" [buddy-dashboard.html:371-379](buddy-dashboard.html#L371-L379) — equivalent functioneel maar geen aparte nav-tab

**Conclusie:** Matchpool is top-level tab voor student BOL (positie 2). **Niet voor BBL**. Bedrijf heeft een verborgen sectie zonder nav-entry. Buddy heeft een swipe-deck binnen "Mijn matches" zonder aparte tab.

---

## CHECK-07 | Role-indicator: persistente rolherkenning

**Status: PARTIAL**

**Bewijs:**

| Rol | Role-indicator | Locatie |
|---|---|---|
| Bedrijf | `<span class="role-pill">🏢 Bedrijf</span>` | [company-dashboard.html:595](company-dashboard.html#L595) |
| School | `<span class="role-pill">🎓 School</span>` | [school-dashboard.html:617](school-dashboard.html#L617) |
| Begeleider | `<span class="role-pill">📋 Begeleider</span>` | [begeleider-dashboard.html:452](begeleider-dashboard.html#L452) |
| Buddy (gepensioneerd) | `<span class="topbar-tag">Buddy-dashboard</span>` | [buddy-dashboard.html:317](buddy-dashboard.html#L317) |
| **Student BOL** | **GEEN** — alleen logo + nav + avatar-chip | [js/utils.js:813-840](js/utils.js#L813-L840) |
| **Student BBL** | **GEEN** | idem |
| **Student Internationaal** | **GEEN** | idem |

**Inconsistentie:**
- 4 dashboards gebruiken `.role-pill` of `.topbar-tag` (twee verschillende classes)
- CSS voor `.role-pill` is **3× gedupliceerd** in inline `<style>` per dashboard ([company-dashboard.html:118](company-dashboard.html#L118), [school-dashboard.html:115](school-dashboard.html#L115), [begeleider-dashboard.html:106](begeleider-dashboard.html#L106))
- Geen gedeelde class in `css/style.css`

**Conclusie:** Role-indicator bestaat voor 4 van de 7 rollen. **Ontbreekt voor de hoofddoelgroep (student)**. Geen onderscheid BOL/BBL/Internationaal in UI. Class is geduplicate in 3 dashboards.

---

## CHECK-08 | Notification-badges: contract en consistentie

**Status: PARTIAL — geen gedocumenteerd contract**

**Student — badge-mechanisme:**
- [js/utils.js:744](js/utils.js#L744) — `<button class="role-header-bell" id="role-notif-bell">...<span id="role-bell-count">0</span></button>`
- [js/utils.js:825](js/utils.js#L825) — `<span class="bell-count" id="bellCount" style="display:none">0</span>` (oude student-header)
- Globale unread-teller via [js/utils.js:902](js/utils.js#L902) `getUnreadTotal()` — telt over messages
- **Geen badges per nav-tab** (sollicitaties, berichten, matchpool zonder eigen tellers)

**Bedrijf — badges per tab:**
- [company-dashboard.html:645](company-dashboard.html#L645) — `badge-count` (Mijn vacatures: aantal vacatures)
- [company-dashboard.html:659](company-dashboard.html#L659) — `badge-unread` (Berichten: ongelezen)
- [company-dashboard.html:686](company-dashboard.html#L686) — `badge-studenten` (Mijn studenten: aantal)
- Trigger-functies: [company-dashboard.html:1628-1629](company-dashboard.html#L1628-L1629), [1864-1873](company-dashboard.html#L1864-L1873), [2153-2184](company-dashboard.html#L2153-L2184)

**School — badges per tab:**
- [school-dashboard.html:665](school-dashboard.html#L665) — `badge-studenten`
- [school-dashboard.html:669](school-dashboard.html#L669) — `badge-signalen` (signalen-tab — risico-studenten)
- Trigger: [school-dashboard.html:1435-1436](school-dashboard.html#L1435-L1436)

**Buddy/Begeleider:**
- Geen tab-badges gevonden in begeleider-dashboard.html
- Buddy gebruikt globale notif-bell uit `renderRoleHeader`

**Bewijs CLAUDE.md contract:**
- CLAUDE.md noemt 18 notification types maar **geen badge-contract per nav-tab**
- Geen documentatie welke tab badge ontvangt op welk event

**Conclusie:** Badges zijn ad hoc geïmplementeerd per dashboard. Bedrijf heeft drie verschillende badges, school heeft twee, student heeft één globale bell-count. Geen gedocumenteerd contract. Begeleider heeft geen badges.

---

## CHECK-09 | Lege states: navigeren ze?

**Status: PARTIAL — gemengd**

**Bewijs per pagina:**

| Pagina | Lege state | Navigeert? | Bewijs |
|---|---|---|---|
| matchpool.html | `<p>Je hebt alle vacatures gezien... kijk later weer!</p>` | **NEE** | [js/matchpool.js:174-181](js/matchpool.js#L174-L181) — geen CTA, geen link |
| matchpool.html (geen toggles) | `<p>Zet minstens één categorie aan...</p>` | **NEE** | [js/matchpool.js:170](js/matchpool.js#L170) |
| mijn-sollicitaties.html | `📭 Nog geen sollicitaties verstuurd. <a href="discover.html">Bekijk vacatures</a>` | **JA** | [mijn-sollicitaties.html:397-402](mijn-sollicitaties.html#L397-L402) |
| discover.html | `📭 Nog geen vacatures... Ververs of pas filters aan` | **NEE** | [discover.html:970](discover.html#L970) |
| school-dashboard.html | `👥 Nog geen studenten gekoppeld. Deel de Internly-link...` | **NEE** (alleen tekstinstructie) | [school-dashboard.html:793,807](school-dashboard.html#L793) |
| school-dashboard.html (signalen) | `✅ Geen actieve signalen.` | **NEE** | [school-dashboard.html:820](school-dashboard.html#L820) |
| school-dashboard.html (oproepen) | `📢 Nog geen oproepen geplaatst. Klik op Nieuwe oproep` | **PARTIAL** (instructie, geen knop) | [school-dashboard.html:1973](school-dashboard.html#L1973) |
| company-dashboard.html (aanmeldingen) | `🤝 Nog geen aanmeldingen... <button onclick="show('new')">Nieuwe vacature plaatsen</button>` | **JA** | [company-dashboard.html:1769](company-dashboard.html#L1769) |
| company-dashboard.html (berichten) | `💬 Nog geen berichten. Zodra een student je match accepteert...` | **NEE** | [company-dashboard.html:2152](company-dashboard.html#L2152) |

**Conclusie:** 2 van 9 lege states navigeren naar de volgende zinvolle actie (mijn-sollicitaties, company-aanmeldingen). De rest toont alleen een bericht. Matchpool — de primaire student-actie — heeft **geen navigatie-CTA in de lege state**.

---

## CHECK-10 | Breadcrumbs

**Status: FAIL**

**Bewijs:**
- [about.html:191-206, 658](about.html#L191-L206) — enkele breadcrumb-implementatie, alleen op publieke about-pagina (blueprint sectie)
- **0 treffers** voor `breadcrumb|crumb` in app-pagina's (vacature-detail, match-dashboard, student-profile, dashboards)
- Geen `renderBreadcrumb()` of breadcrumb-component in `js/utils.js`

**Bewijs — terug-knoppen als alternatief:**
- [vacature-detail.html:870](vacature-detail.html#L870) — `<a href="discover.html" class="btn-back-detail">← Terug naar overzicht</a>`
- [bbl-profile.html:282](bbl-profile.html#L282) — `← Terug naar dashboard`
- [bol-profile.html:649,680,719,747,806](bol-profile.html#L649) — wizard-stappen `← Terug` (intra-page)
- [js/utils.js:377](js/utils.js#L377) — `function goBack(fallbackHref)` — gedeelde helper, gebruikt door alle headers

**Conclusie:** Geen breadcrumbs op sub-pagina's. Alternatief: `goBack()` helper + losse `← Terug` knoppen. Werkt voor 1-laag-diep maar geeft geen context bij N-laagse navigatie ("Discover › Bedrijf › Vacature").

---

## CHECK-11 | Footer: renderFooter en consistentie

**Status: FAIL**

**Bewijs:**
- **`renderFooter()` bestaat NIET** in `js/utils.js` (grep 0 treffers)
- 41 `<footer>`-blokken verspreid over 43 HTML-bestanden (van de 47 totale matches)
- **Slechts 7 van 43 HTML-bestanden** linken naar alle drie juridische pagina's (privacybeleid + cookiebeleid + algemene-voorwaarden)
- 36 bestanden missen minimaal één juridische link

**Conclusie:** Geen gedeeld footer-contract. Massale duplicatie met inconsistente juridische dekking (16% volledig, 84% incompleet). Direct juridisch risico.

---

## CHECK-12 | Onboarding: first-run state

**Status: PARTIAL**

**Bewijs — welcome-overlay:**
- [js/welcome-overlay.js](js/welcome-overlay.js) (404 regels) — eenmalige overlay per user
- Per-rol configuratie [js/welcome-overlay.js:12-223](js/welcome-overlay.js#L12-L223) — student / student_bbl / student_international / bedrijf / school / begeleider / gepensioneerd
- Flag-mechanisme [js/welcome-overlay.js:284-285](js/welcome-overlay.js#L284-L285) — `localStorage.internly_welcomed_<userId>`
- Toont 3 quick-actions + 4 feature-pills bij eerste login
- Geladen op 10 pagina's (zie grep): international-student-dashboard, student-profile, school-dashboard, match-dashboard, discover, company-dashboard, buddy-dashboard, begeleider-dashboard, bbl-profile, bbl-hub

**Bewijs — profile-completeness check:**
- 0 treffers op `profiel.compleet|profile.complete|isComplete|completion|missing.field` in utils.js, matchpool.html, discover.html
- [auth.html:1008](auth.html#L1008) — comment-only: `// BBL + naam null/empty → bbl-profile.html (onboarding)`

**Bewijs — progressive disclosure:**
- Geen step-indicator op dashboards
- Geen "stap 1/2/3" UI op match-dashboard.html (`progress-stage` is voor stage-mijlpalen, niet onboarding)
- Geen DB-kolom `first_login_at` zichtbaar in routing-logica

**Conclusie:** Welcome-overlay is een goed begin (per-rol configuratie + dismiss-flag), maar éénmalig en weg na 1 klik. Geen recurring onboarding-strip op dashboards. Geen profile-completeness-check die nieuwe gebruikers stuurt naar profielinvulling. Geen step-indicator.

---

## CHECK-13 | Mobiel: bottom navigation voor studenten

**Status: FAIL**

**Bewijs — bottom-nav CSS aanwezig:**
- [css/style.css:933-967](css/style.css#L933-L967) — `.mobile-tabs` + `.mt-tab` componenten
- [css/style.css:976](css/style.css#L976) — `@media (max-width: 768px) { .mobile-tabs { display: flex; } }`
- [css/style.css:979](css/style.css#L979) — `.sidebar { display: none !important; }` op mobiel

**Bewijs — bottom-nav per pagina:**
- ✅ company-dashboard.html [regel 600](company-dashboard.html#L600)
- ✅ school-dashboard.html [regel 622](school-dashboard.html#L622)
- ✅ buddy-dashboard.html (genoemd in CSS)
- ✅ begeleider-dashboard.html [regel 457](begeleider-dashboard.html#L457)
- ❌ **discover.html** — geen `mobile-tabs`
- ❌ **matchpool.html** — geen `mobile-tabs`
- ❌ **mijn-sollicitaties.html** — geen `mobile-tabs`
- ❌ **student-profile.html** — geen `mobile-tabs`
- ❌ **match-dashboard.html** — geen `mobile-tabs`
- ❌ **mijn-berichten.html** — geen `mobile-tabs`

**Bewijs — student-header op mobiel:**
- `.student-nav` is geen onderdeel van het `@media (max-width:768px) { .topbar .nav { display: none } }` block
- Student gebruikt eigen `.student-header` class — geen documented mobile-collapse
- Geen hamburger-menu in student-header

**Conclusie:** Bottom navigation infrastructuur bestaat (CSS-classes + breakpoint), maar wordt **uitsluitend gebruikt op rol-dashboards (bedrijf/school/buddy/begeleider)**. **Student-pagina's hebben géén bottom-nav** — de hoofddoelgroep heeft geen mobiele primaire navigatie. Op 390px-viewport ziet een student de header collapsed zonder duidelijke vervanging.

---

# DEEL 2 — INZICHTEN RAPPORT

```
═══════════════════════════════════════════════════════════════════════
NAVIGATIE INZICHTEN — RESEARCH vs CODE
Datum: 3 mei 2026
═══════════════════════════════════════════════════════════════════════

01 Drie basisvragen:
   Research verwacht: active-tab styling + role-indicator + contextuele hints
   Code heeft:        active-tab styling op alle nav-systemen (PASS),
                      role-pill op 4/7 rollen (FAIL voor student),
                      éénmalige welcome-overlay (geen recurring hints)
   Kloof:             Student mist role-pill; geen recurring next-step hints

02 Hick's Law itemlimiet:
   Research verwacht: max 5 items per rol, gedocumenteerd contract
   Code heeft:        student=7, bbl=5, gepensioneerd=5, begeleider=6,
                      school=12, bedrijf=14
   Kloof:             Bedrijf en school ver boven richtlijn;
                      geen contract gedocumenteerd in CLAUDE.md

03 Mentale modellen:
   Research verwacht: labels matchen LinkedIn/Indeed/Recruitee
   Code heeft:        Standaard labels OK (Berichten/Sollicitaties/Vacatures);
                      eigen termen Matchpool/Stage Hub/Signalen/Bundeling
                      zonder tooltips of inline uitleg
   Kloof:             4 jargon-termen vereisen onboarding-uitleg die
                      buiten de eenmalige welcome-overlay ontbreekt

04 Navigatiepatroon:
   Research verwacht: topnav desktop + bottom nav voor mobiele studenten
   Code heeft:        Topnav voor student/buddy, sidebar voor 3 dashboards,
                      bottom-nav alleen op niet-student-dashboards
   Kloof:             Student mist bottom-nav op mobiel;
                      drie verschillende navigatiepatronen tegelijk

05 Rolsegregatie renderHeader:
   Research verwacht: één gedeelde renderHeader(role) functie
   Code heeft:        renderRoleHeader() (gepensioneerd) +
                      renderStudentHeader() (BOL/BBL split, helper-driven) +
                      3× inline sidebar (bedrijf/school/begeleider, ~160 regels)
   Kloof:             5 parallelle implementaties; refactor naar
                      renderRoleHeader is gestart maar incompleet

06 Matchpool hiërarchie:
   Research verwacht: top-level tab student + inbox-variant bedrijf/buddy
   Code heeft:        Matchpool = positie 2 in student BOL nav (PASS);
                      ontbreekt in student BBL nav (FAIL);
                      "Interesse in jou" hidden div bij bedrijf (geen tab);
                      buddy heeft swipe-deck binnen "Mijn matches"
   Kloof:             Discoverbaarheid voor BBL, bedrijf en buddy te laag

07 Role-indicator:
   Research verwacht: persistente rol-label naast logo
   Code heeft:        4 dashboards hebben role-pill of topbar-tag;
                      student-header heeft niets;
                      .role-pill class is 3× gedupliceerd in inline <style>
   Kloof:             Hoofddoelgroep (student) heeft geen rol-indicator;
                      geen onderscheid BOL/BBL/Internationaal in UI

08 Badge-contract:
   Research verwacht: gedocumenteerd contract per tab/rol/event
   Code heeft:        Bedrijf 3 badges, school 2 badges, student 1 globale
                      bell, begeleider/buddy 0 tab-badges;
                      geen contract in CLAUDE.md
   Kloof:             Inconsistent per rol; geen documentatie

09 Lege states navigeren:
   Research verwacht: elke lege state stuurt naar volgende actie
   Code heeft:        2 van 9 onderzochte lege states navigeren
                      (mijn-sollicitaties, company-aanmeldingen);
                      matchpool/discover/school/berichten missen CTA
   Kloof:             7 van 9 lege states zijn dood-eind voor de gebruiker

10 Breadcrumbs:
   Research verwacht: "Discover › Bedrijf › Vacature" op sub-pagina's
   Code heeft:        0 breadcrumb-implementaties op app-pagina's;
                      goBack() helper + losse ← Terug knoppen
   Kloof:             Geen context bij N-laagse navigatie

11 Footer renderFooter:
   Research verwacht: één renderFooter() functie, 100% dekking
   Code heeft:        renderFooter() bestaat niet;
                      41 footer-blokken in 43 HTML's;
                      7/43 (16%) hebben alle drie juridische links
   Kloof:             Massale duplicatie + 84% juridisch incompleet

12 Onboarding first-run:
   Research verwacht: progressive disclosure bij eerste inlog
   Code heeft:        Welcome-overlay (eenmalig, dismiss = weg);
                      geen profile-completeness check;
                      geen step-indicator op dashboards
   Kloof:             Geen recurring onboarding na eerste klik

13 Mobiel bottom nav:
   Research verwacht: bottom navigation voor studenten op mobiel
   Code heeft:        .mobile-tabs + .mt-tab componenten in CSS;
                      gebruikt op 4 niet-student-dashboards;
                      0 student-pagina's hebben bottom-nav
   Kloof:             Hoofddoelgroep heeft geen mobiele primaire nav

TOTAAL KLOVEN:
  Groot (KRITIEK):     5 — student role-indicator, footer-contract,
                          mobiel student bottom-nav, lege-state CTAs,
                          renderHeader-architectuurdrift
  Middel (SIGNIFICANT): 5 — Hick's Law overschrijding, badge-contract,
                          breadcrumbs, onboarding-recurring, BBL matchpool
  Klein (AANDACHT):    3 — terminologie-tooltips, role-pill duplicatie,
                          contextuele next-step hints

═══════════════════════════════════════════════════════════════════════
```

---

# DEEL 3 — IMPLEMENTATIEPLAN VIA CC

```
═══════════════════════════════════════════════════════════════════════
IMPLEMENTATIEPLAN NAVIGATIEVERBETERINGEN
Gerangschikt op: impact × uitvoerbaarheid × urgentie voor 11 mei
═══════════════════════════════════════════════════════════════════════

FASE 0 — VÓÓR 11 MEI (livetest-kritiek, max 1 sessie per item)
────────────────────────────────────────────────────────────────

NAV-00A | Role-indicator in student-header
Onderzoek-grond: bevinding 7 — context-verlies; student is enige rol zonder pill
Wat: voeg role-pill toe aan _renderStudentHeaderLoggedIn() in js/utils.js,
     leest bblMode + intl-flag uit student_profiles. Toont:
     "🎯 BOL" / "🔧 BBL" / "🌍 International".
     Plaats: tussen logo en nav, óf rechts naast avatar.
Scope: js/utils.js (regel 791-840, _renderStudentHeaderLoggedIn);
       css/style.css (.student-header-role-pill class toevoegen,
       reuse pattern uit company-dashboard.html:118)
Risico: laag — visueel additief, geen logica-wijziging
CC-type: surgical edit, één sessie (~30 min)
Bevestiging vereist: Barry — kleur/positie/iconen

NAV-00B | Matchpool-tab voor BBL student + verifieer BOL
Onderzoek-grond: bevinding 6 — BBL mist matchpool, primaire actie ondiscoverbaar
Wat: voeg matchpool-tab toe aan bblNav in _renderStudentHeaderLoggedIn()
     [js/utils.js:806-810]. Verifieer dat BOL nav matchpool als positie 2
     houdt. Update HEADER_NAV_BY_ROLE.student als ground-truth.
Scope: js/utils.js (regels 798-810)
Risico: laag — BBL-students krijgen extra tab; BOL ongewijzigd
CC-type: surgical edit, één sessie (~20 min)

NAV-00C | Lege states op matchpool, school-dashboard, discover
Onderzoek-grond: bevinding 9 — 7/9 lege states zijn dood-eind
Wat:
  - matchpool.html: bij lege pool → CTA "Vul je profiel aan"
    (route naar bol-profile.html / bbl-profile.html op basis van bblMode)
    [js/matchpool.js:174-181 — uitbreiden met _empty-link href]
  - school-dashboard.html: lege studentenlijst → CTA "Studenten uitnodigen"
    (mailto: of share-link prompt) [school-dashboard.html:793,807]
  - discover.html: lege vacaturelijst → CTA "Reset filters" (intra-page)
    [discover.html:970]
  - company-dashboard.html (berichten leeg): CTA "Ga naar matches"
    [company-dashboard.html:2152]
Scope: 4 bestanden, surgical edits
Risico: laag — additieve HTML/CSS
CC-type: surgical edit, één sessie (~45 min)

────────────────────────────────────────────────────────────────
FASE 1 — NA LIVETEST (architectuur, 1–2 sessies per item)
────────────────────────────────────────────────────────────────

NAV-01 | renderRoleHeader uitbreiden met bedrijf/school/begeleider
Onderzoek-grond: bevinding 5 — 5 parallelle implementaties, ~160 regels inline
Wat: breid HEADER_NAV_BY_ROLE uit met bedrijf, school, begeleider.
     Migreer inline sidebars naar gedeelde renderRoleHeader-call.
     Beslissing eerst: blijft sidebar-pattern of unified topnav?
     Aanbeveling: behoud sidebar-class maar render-source = utils.js.
     Documenteer max-items per rol (Hick's Law contract).
Scope: js/utils.js (uitbreiden HEADER_NAV_BY_ROLE),
       company/school/begeleider-dashboard.html (inline nav verwijderen)
Risico: middel-hoog — raakt 3 dashboards, regressie op show()-handlers
CC-type: architectuurrefactor, twee sessies
  Sessie 1: spec + nav-config + helper voor sidebar-variant
  Sessie 2: migratie per dashboard met click-test
Vereiste vóór start: Barry bevestigt nav-spec per rol (welke 5–7 items?)

NAV-02 | renderFooter(role) — gedeeld footer-contract
Onderzoek-grond: bevinding 11 — 41 duplicates, 84% juridisch incompleet
Wat: implementeer renderFooter(role) in js/utils.js.
     Standaard 3 juridische links + role-specifieke extra's.
     Voeg <footer id="role-footer"></footer> placeholder toe in
     alle 43 HTML's (PowerShell-bulk script). Verwijder oude
     inline footers stapsgewijs.
Scope: js/utils.js (+ ~50 regels), 43 HTML-bestanden (footer-block vervangen)
Risico: middel — mechanisch maar breed; juridische verificatie vereist
CC-type: refactor met PowerShell-bulk + Edits, één sessie (~60 min)
Vereiste: bevestig welke 3 juridische pagina's altijd verplicht zijn
          (CLAUDE.md noemt privacybeleid/cookiebeleid/algemene-voorwaarden)

NAV-03 | Badge-contract documenteren en uniformeren
Onderzoek-grond: bevinding 8 — inconsistente badge-implementaties
Wat: documenteer in CLAUDE.md welke tab per rol een badge krijgt en
     welk event triggert. Voeg ontbrekende badges toe:
     - student: badge op Sollicitaties (uitgenodigd-status)
     - student: badge op Berichten (al aanwezig via globale bell — splits)
     - school: badge op Berichten (ongelezen)
     - begeleider: badge op studenten (open verzoeken)
Scope: CLAUDE.md + 4 HTML-bestanden + js/utils.js helper
Risico: laag — additief
CC-type: documentatie + surgical edit, één sessie

NAV-04 | Breadcrumbs op sub-pagina's
Onderzoek-grond: bevinding 10 — geen context bij N-laagse navigatie
Wat: voeg breadcrumb-CSS toe in css/style.css (gebruik blueprint uit
     about.html:191-206 als basis). Implementeer renderBreadcrumb(items[])
     in js/utils.js. Pas toe op:
     - vacature-detail.html: "Vacatures › <Bedrijf> › <Titel>"
     - match-dashboard.html: "Stage Hub › <Match-titel>"
     - kennisbank-artikel.html: "Kennisbank › <Categorie> › <Artikel>"
Scope: css/style.css + js/utils.js + 3 sub-pagina's
Risico: laag — additieve component
CC-type: component bouwen + toepassen, één sessie

────────────────────────────────────────────────────────────────
FASE 2 — ROADMAP (grotere inspanning, na product-market fit)
────────────────────────────────────────────────────────────────

NAV-05 | Bottom navigation voor mobiele studenten
Onderzoek-grond: bevinding 13 — student mist mobiele primaire nav
Wat: voeg <nav class="mobile-tabs"> toe op 6 student-pagina's:
     discover, matchpool, mijn-sollicitaties, student-profile,
     match-dashboard, mijn-berichten. Render via renderStudentHeader()
     of nieuwe renderStudentMobileNav(). Items: Discover, Matchpool,
     Sollicitaties, Berichten, Profiel (5 items). CSS hergebruikt
     .mobile-tabs + .mt-tab uit style.css:933-967.
Scope: js/utils.js (nieuwe helper) + 6 student-HTML's (placeholder div)
Risico: middel — CSS-stack-order interactie met student-header,
        cross-device-test vereist (390px iPhone, 360px Android)
CC-type: design + implementatie, twee sessies
Vereiste vóór start: visueel ontwerp goedgekeurd (Dolly + Polly)

NAV-06 | Onboarding-strip met progressive disclosure
Onderzoek-grond: bevinding 12 — welcome-overlay is eenmalig
Wat: voeg <div class="onboard-strip"> bovenaan dashboards toe.
     Toont 3 stappen op basis van profile-completeness:
     stap 1: profiel compleet, stap 2: eerste match, stap 3: eerste sollicitatie.
     Verdwijnt bij completion. Helper in js/utils.js leest profile +
     applications + matches, retourneert step-state. Update Supabase met
     first_login_at kolom voor analytics.
Scope: js/utils.js + alle rol-dashboards + Supabase-migratie
Risico: middel — raakt auth-flow (timing) en alle dashboards
CC-type: feature-bouw, twee sessies
Vereiste: stappenlogica bevestigd door productowner

═══════════════════════════════════════════════════════════════════════

VOLGORDE SAMENVATTING:

Vóór 11 mei (3 sessies, ~2 uur totaal):
  NAV-00A → Role-indicator student-header (1 sessie, laag risico)
  NAV-00B → Matchpool-tab BBL toevoegen (1 sessie, laag risico)
  NAV-00C → Lege states navigeren (1 sessie, laag risico)

Na livetest (5–6 sessies, ~5 uur):
  NAV-01  → renderRoleHeader uitbreiden (2 sessies, hoog impact)
  NAV-02  → renderFooter contract (1 sessie, hoog impact, jur. risico opgelost)
  NAV-03  → Badge-contract (1 sessie, middel impact)
  NAV-04  → Breadcrumbs (1 sessie, middel impact)

Roadmap (4 sessies, ~4 uur):
  NAV-05  → Bottom nav mobiel student (2 sessies)
  NAV-06  → Onboarding-strip recurring (2 sessies)

TOTAAL GESCHATTE CC-SESSIES: 12
TOTAAL VÓÓR 11 MEI: 3 (elk max 1 uur)

═══════════════════════════════════════════════════════════════════════
```

---

## EINDOPMERKINGEN

**Sterke punten van de huidige codebase:**
- `renderRoleHeader` (regel 696) en `renderStudentHeader` (regel 851) zijn een goede start voor unified nav-architectuur
- `HEADER_NAV_BY_ROLE` (regel 662) is uitbreidbaar contract — alleen nu maar 2 rollen ingevuld
- `goBack()` helper (regel 377) garandeert minimaal terug-navigatie
- `welcome-overlay.js` is per-rol gepersonaliseerd en gebruikt correct localStorage flag
- `getUnreadTotal()` (regel 902) is performant geschreven (Promise.all + count-only queries)

**Belangrijkste risico's voor livetest 11 mei:**
1. **Student zonder mobiele primaire nav** (NAV-05) — 6 pagina's onbruikbaar op 390px-viewport
2. **84% juridisch incomplete footers** (NAV-02) — direct AVG/cookie-risico vóór scale-up
3. **7/9 lege states zijn dood-eind** (NAV-00C, NAV-04) — abandonment bij eerste inlog

**Aanbeveling sessie-architectuur (cf. CLAUDE.md "Tarlok"):**
- FASE 0 in 3 aparte sessies (~30–45 min elk), elk met PASS/FAIL grep-criteria
- FASE 1 NAV-01 in twee sessies (spec → implementatie) om regressie te beheersen
- Verifieer met test accounts (`student@internly.pro` / `bedrijf@internly.pro` / `school@internly.pro`) na elke sessie

**Geen wijzigingen aangebracht aan code.** Alleen lezen, analyseren, rapporteren.
