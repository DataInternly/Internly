# INTERNLY HEADER SPECIFICATIE

**Versie** 1.0 — 5 mei 2026
**Status** Platform-law — alle pagina's MOETEN hier aan voldoen
**Eigenaar** Barry / Bedward
**Toepassing** Run 4 header-spec enforcement + alle nieuwe pagina's

---

## DOEL

Eén canonieke header-implementatie voor alle 5 rollen. Geen ad-hoc inline markup. Geen role-detectie scattered door het project. Eén bron van waarheid: `js/utils.js` HEADER_NAV_BY_ROLE + helper-functies.

---

## VIJF HEADER-TYPES

### Type A — Publiek (uitgelogd)

**Wanneer** — alle publieke pagina's (about, pricing, faq, kennisbank, hoe-het-werkt, privacybeleid, spelregels, cookiebeleid, algemene-voorwaarden, esg-rapportage, esg-export, internly-worldwide, la-sign, internly_simulator, 404, preview)

**Visueel**
- Background: wit (var(--bg))
- Logo links: "intern**ly**" zwart, geen onclick-handler, `href="index.html"`
- Nav rechts: alleen public-links (Hoe het werkt, Prijzen, FAQ, Inloggen)
- Hoogte: 64px desktop, 56px mobile

**Markup-template**
```html
<header class="public-header">
  <a href="index.html" class="topbar-logo">intern<span>ly</span></a>
  <nav class="public-nav">
    <a href="hoe-het-werkt.html">Hoe het werkt</a>
    <a href="pricing.html">Prijzen</a>
    <a href="faq.html">FAQ</a>
    <a href="auth.html" class="btn-login">Inloggen</a>
  </nav>
</header>
```

**Verboden** — `smartHomeRedirect()` op het logo (Bedward P2). Alleen `href="index.html"`.

---

### Type B — Student BOL/BBL (groen gradient)

**Wanneer** — alle ingelogde student-pagina's (bbl-hub, bbl-dashboard, bbl-profile, bol-profile, student-profile, student-home, matches, matchpool, mijn-sollicitaties, mijn-berichten, mijn-notities, vacature-detail, discover, kennisbank, chat — als student-rol)

**Visueel**
- Background: lineair gradient `#1a7a48 → #2d9d63`
- Logo links: "intern**ly**" wit, klikbaar (smartHomeRedirect toegestaan)
- Nav rechts: rol-specifieke tabs uit `HEADER_NAV_BY_ROLE`
  - **BOL** (`student`): 7 tabs — Home, Matchpool, Vacatures, Sollicitaties, Berichten, Kennisbank, Buddy
  - **BBL** (`student_bbl`): 5 tabs — BBL Traject, Matchpool, Berichten, Kennisbank, Buddy
- Hamburger op mobile (<768px)
- Bell-icon notifications + Account-dropdown rechts

**Helper** — `renderStudentHeader({ activeTab: '<tabkey>' })` in js/utils.js

**Detectie BOL vs BBL** — `student_profiles.bbl_mode === true` → `student_bbl`, anders → `student`

**Verboden** — direct `renderRoleHeader('student', ...)` zonder bbl-detectie. Voorbeeld correct patroon:
```javascript
const _isBBL = profile?.bbl_mode === true;
const headerRole = (userRole === 'student' && _isBBL) ? 'student_bbl' : userRole;
await renderRoleHeader(headerRole, '<tabkey>', { ... });
```

---

### Type C — Bedrijf (sidebar)

**Wanneer** — alle bedrijf-pagina's (company-dashboard, company-discover, match-dashboard, vacature-detail bij bedrijf-context, mijn-berichten bij bedrijf-rol)

**Visueel**
- Sidebar links (220px op desktop, hamburger-collapse op mobile)
- Background sidebar: zwart (#0d1520)
- Logo bovenaan + role-tag "BEDRIJF"
- Nav-items vertical (Dashboard, Vacatures, Discover, Matches, Berichten, Mijn profiel)
- Logout-button onderaan

**Helper** — `renderRoleHeader('bedrijf', '<tabkey>', { ... })` of dedicated `renderBedrijfSidebar()`

---

### Type D — School / Begeleider (sidebar)

**Wanneer** — school-dashboard, begeleider-dashboard, international-school-dashboard

**Visueel** — identiek aan Type C maar met andere accent-kleur (oranje #e05c1a)
- Tabs: Dashboard, Studenten, Bedrijven, Berichten, Mijn profiel
- Role-tag "SCHOOL" of "BEGELEIDER"

---

### Type E — Buddy (paars)

**Wanneer** — buddy-dashboard, mijn-berichten bij buddy-rol, mijn-notities bij buddy-rol

**Visueel**
- Background: paars (#7c3aed gradient)
- Logo wit
- 5 tabs: Overzicht, Mijn matches, Mijn berichten, Mijn notities, Mijn profiel
- Geen sidebar — top-bar zoals Type B

**Helper** — `renderRoleHeader('buddy', '<tabkey>', { ... })`

---

## HEADER_NAV_BY_ROLE — bron van waarheid

In `js/utils.js`:

```javascript
const HEADER_NAV_BY_ROLE = {
  student: [          // BOL — 7 tabs
    { key: 'home',         href: 'student-home.html',       label: 'Home' },
    { key: 'matchpool',    href: 'matchpool.html',          label: 'Matchpool' },
    { key: 'discover',     href: 'discover.html',           label: 'Vacatures' },
    { key: 'sollicitaties',href: 'mijn-sollicitaties.html', label: 'Sollicitaties' },
    { key: 'berichten',    href: 'mijn-berichten.html',     label: 'Berichten' },
    { key: 'kennisbank',   href: 'kennisbank.html',         label: 'Kennisbank' },
    { key: 'buddy',        href: 'buddy-aanvraag.html',     label: 'Buddy' },
  ],
  student_bbl: [      // BBL — 5 tabs
    { key: 'traject',      href: 'bbl-hub.html',            label: 'BBL Traject' },
    { key: 'matchpool',    href: 'matchpool.html',          label: 'Matchpool' },
    { key: 'berichten',    href: 'mijn-berichten.html',     label: 'Berichten' },
    { key: 'kennisbank',   href: 'kennisbank.html',         label: 'Kennisbank' },
    { key: 'buddy',        href: 'buddy-aanvraag.html',     label: 'Buddy' },
  ],
  bedrijf: [          // 6 tabs sidebar
    { key: 'dashboard',    href: 'company-dashboard.html',  label: 'Dashboard' },
    { key: 'vacatures',    href: 'mijn-vacatures.html',     label: 'Vacatures' },
    { key: 'discover',     href: 'company-discover.html',   label: 'Discover' },
    { key: 'matches',      href: 'match-dashboard.html',    label: 'Matches' },
    { key: 'berichten',    href: 'mijn-berichten.html',     label: 'Berichten' },
    { key: 'profiel',      href: 'company-profile.html',    label: 'Mijn profiel' },
  ],
  school: [           // 5 tabs sidebar
    { key: 'dashboard',    href: 'school-dashboard.html',   label: 'Dashboard' },
    { key: 'studenten',    href: 'school-studenten.html',   label: 'Studenten' },
    { key: 'bedrijven',    href: 'school-bedrijven.html',   label: 'Bedrijven' },
    { key: 'berichten',    href: 'mijn-berichten.html',     label: 'Berichten' },
    { key: 'profiel',      href: 'school-profile.html',     label: 'Mijn profiel' },
  ],
  begeleider: [       // identiek aan school
    // (zelfde 5 items, andere accent)
  ],
  buddy: [            // 5 tabs paars
    { key: 'overzicht',    href: 'buddy-dashboard.html',    label: 'Overzicht' },
    { key: 'matches',      href: 'buddy-matches.html',      label: 'Mijn matches' },
    { key: 'berichten',    href: 'mijn-berichten.html',     label: 'Mijn berichten' },
    { key: 'notities',     href: 'mijn-notities.html',      label: 'Mijn notities' },
    { key: 'profiel',      href: 'buddy-profile.html',      label: 'Mijn profiel' },
  ],
};
```

**Wijziging-regel** — verandert tab-volgorde, tab-naam of href? Pas hier aan, alle pagina's volgen automatisch.

---

## CONSISTENTIE-AUDIT

Pagina's MOETEN gebruik maken van helper-functies. Direct inline markup is verboden.

**Audit-query** — wie maakt eigen header buiten de helper?
```powershell
Select-String -Path "*.html" -Pattern "<header" -NotMatch |
  Where-Object { $_.Line -notmatch "renderRoleHeader|renderStudentHeader|kb-shared-header" }
```

**Verwacht** — 0 hits in alle ingelogde pagina's.

---

## RESPONSIVE GEDRAG

| Breedte | Type B (student) | Type C (bedrijf) |
|---|---|---|
| ≥1024px | Top-bar volledig zichtbaar | Sidebar uitgeklapt 220px |
| 768-1023px | Top-bar met hamburger | Sidebar collapsible naar 60px icon-only |
| <768px | Hamburger-menu | Hamburger toggle naar drawer |

Type A blijft top-bar over alle breedten.

---

## ACCESSIBILITY

- `<header>` element met `role="banner"`
- `<nav>` met `aria-label="Hoofdnavigatie"`
- Active tab krijgt `aria-current="page"`
- Logo heeft `aria-label="Internly home"`
- Hamburger heeft `aria-expanded` state-attribute

---

## VERSCHILLEN MET HUIDIGE STAAT

Per 5 mei 2026 — niet alle pagina's voldoen. Bekend deviation:

| Pagina | Probleem | Run |
|---|---|---|
| mijn-berichten.html | gebruikte `renderRoleHeader('student', ...)` zonder bbl-detect | Run 1.5 v2 — FIXED |
| 7+ andere student-pagina's | mogelijk zelfde drift | Run 4 |
| 8 pagina's met minimale footer | nog geen kb-shared-footer | Run 4 / separate run |
| public-pagina's met smartHomeRedirect | Bedward P2 overtreding | Run 1 — FIXED |

---

## GLOSSARIUM

| Term | Betekenis |
|---|---|
| Type A | Publieke header voor uitgelogde gebruikers |
| Type B | Groen gradient student top-bar |
| Type C | Zwart bedrijf sidebar |
| Type D | School/begeleider sidebar |
| Type E | Paars buddy top-bar |
| HEADER_NAV_BY_ROLE | Object in js/utils.js dat tabs per rol definieert |
| renderRoleHeader | Generieke helper |
| renderStudentHeader | Student-specifieke helper met bbl-detectie |
| kb-shared-footer | Rijke footer met brand + 10 links + tagline |

---

**Laatste herziening** 5 mei 2026 — Bedward sign-off voor publieke vs ingelogde smartHomeRedirect splitsing
**Volgende herziening** Na Run 4 (header-spec enforcement)
