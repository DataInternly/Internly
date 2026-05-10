# BBL ROUTING AUDIT — Internly

**Datum:** 2026-05-10
**Scope:** alle `.html`-bestanden + `js/roles.js` + `js/utils.js`
**Methode:** grep op `bbl_mode`, `bbl-hub`, `bbl-profile`, `getRoleLanding`, `discover.html`-redirects

## Antwoorden op de vijf vragen

### 1. Welke pagina's checken op `bbl_mode === true`?

**24 bestanden** lezen `bbl_mode` uit `student_profiles`. Op te delen in drie categorieën:

| Categorie | Pagina's | Doel |
|---|---|---|
| **Routing-guard (redirect bij mismatch)** | bbl-dashboard, bbl-hub, bbl-profile, bol-profile, student-profile, discover, matches, mijn-sollicitaties, index | Hard redirect naar de juiste BBL/BOL-pagina |
| **Header-detect (geen redirect)** | mijn-berichten, about, algemene-voorwaarden, cookiebeleid, esg-rapportage, faq, hoe-het-werkt, internly-worldwide, kennisbank, pricing, privacybeleid, spelregels | Bepalen of `student_bbl`-headerconfig getoond wordt i.p.v. `student` |
| **Auth/canon-flow** | auth.html, [js/roles.js:67](js/roles.js#L67) `resolveStudentDashboard`, [js/utils.js:111](js/utils.js#L111) `smartHomeRedirect`, [js/utils.js:1287](js/utils.js#L1287) `renderStudentHeader` | Post-login en logo-klik routing |

### 2. Pagina's die naar `discover.html` doorsturen zonder BBL-check?

Vijf locaties sturen door naar `discover.html`:

| Bestand:regel | Soort | BBL-veilig? |
|---|---|---|
| [bbl-dashboard.html:601](bbl-dashboard.html#L601) | redirect bij `bbl_mode !== true` | ✓ — alleen non-BBL gaat naar discover (waar BBL ook wordt geweigerd, dus consistent) |
| [bbl-hub.html:2604](bbl-hub.html#L2604) | redirect bij `bbl_mode !== true` | ✓ — idem |
| [matches.html:110](matches.html#L110) | UI-knop in mobile-tabs `onclick="window.location.href='discover.html'"` | ⚠ BBL-student kan klikken — discover.html bounct hem terug naar bbl-hub. Werkt, maar onnodige roundtrip + flash-redirect. |
| [vacature-detail.html:1150](vacature-detail.html#L1150) | redirect na succesvolle sollicitatie (`setTimeout(…, 2000)`) | ⚠ BBL-student in deze flow zou via discover terug naar bbl-hub gaan. Solliciteren is bij BBL niet helemaal logisch — pagina heeft sowieso geen BBL-guard. |
| [company-dashboard.html:1658](company-dashboard.html#L1658) | naar `company-discover.html` | ✓ irrelevant — bedrijf-rol |

**Geen kritieke leak** — alle 4 student-routes naar `discover.html` worden door `discover.html:1468` opgevangen die BBL-students naar bbl-hub stuurt. Wel een **double-redirect** op de matches-knop en vacature-detail-flow.

### 3. Bbl_mode-check in `guardPage()` of `requireRole()`?

**Nee.** Beide helpers in [js/utils.js](js/utils.js) checken alleen op `profiles.role`, niet op `student_profiles.bbl_mode`.

- [js/utils.js:228-257](js/utils.js#L228) `requireRole()` — alleen role-string check
- [js/utils.js:287-369](js/utils.js#L287) `guardPage()` — alleen role-string check

**Architecturele consequentie:** een BBL-student passeert `requireRole('student')` of `guardPage('student')` op gelijke voet als een BOL-student. De BBL-guard is een **tweede laag** ná de auth-guard, met een eigen DB-fetch op `student_profiles.bbl_mode`. Dit betekent extra DB-roundtrips op alle BBL-afwijzende pagina's. Een toekomstige `guardPage('student', { bblMode: false })`-extensie zou dit kunnen consolideren.

### 4. Pagina's alleen toegankelijk voor BBL?

| Pagina | BBL-only-mechanisme |
|---|---|
| [bbl-dashboard.html:600](bbl-dashboard.html#L600) | `if (sp?.bbl_mode !== true) → discover.html` |
| [bbl-hub.html:2602](bbl-hub.html#L2602) | `if (sp?.bbl_mode !== true) → discover.html` |
| [bbl-profile.html:778](bbl-profile.html#L778) | `if (sp && sp.bbl_mode !== true) → student-profile.html` |

### 5. Pagina's die BBL-studenten expliciet blokkeren?

| Pagina | Mechanisme | Doelpagina |
|---|---|---|
| [discover.html:1468](discover.html#L1468) | `if (sp?.bbl_mode === true) → getRoleLanding('student', true)` | bbl-hub |
| [matches.html:760](matches.html#L760) | `if (sp?.bbl_mode === true) → getRoleLanding('student', true)` | bbl-hub |
| [mijn-sollicitaties.html:806](mijn-sollicitaties.html#L806) | `if (sp?.bbl_mode === true) → getRoleLanding('student', true)` | bbl-hub |
| [bol-profile.html:1427](bol-profile.html#L1427) | `if (existing?.bbl_mode === true) → bbl-profile.html` | bbl-profile |
| [student-profile.html:1660](student-profile.html#L1660) | `if (existing?.bbl_mode === true) → bbl-profile.html` | bbl-profile |
| [index.html:1874-1879](index.html#L1874) | post-login dispatcher gebruikt `bbl_mode` om naar `getRoleLanding(role, bblMode)` te routen | bbl-hub |

## Toegangsmatrix

Legenda: ✓ toegestaan · 🚫 geblokkeerd (redirect) · ⚪ geen guard (BBL kan binnen, geen redirect) · — niet relevant voor student-rol

| Pagina | Toegang BOL | Toegang BBL | Check aanwezig? |
|---|---|---|---|
| **Student-rol pagina's** | | | |
| [bbl-dashboard.html](bbl-dashboard.html#L600) | 🚫 → discover | ✓ | bbl_mode !== true → redirect |
| [bbl-hub.html](bbl-hub.html#L2602) | 🚫 → discover | ✓ | bbl_mode !== true → redirect |
| [bbl-profile.html](bbl-profile.html#L778) | 🚫 → student-profile | ✓ | bbl_mode !== true → redirect |
| [bol-profile.html](bol-profile.html#L1427) | ✓ | 🚫 → bbl-profile | bbl_mode === true → redirect |
| [student-profile.html](student-profile.html#L1660) | ✓ | 🚫 → bbl-profile | bbl_mode === true → redirect |
| [discover.html](discover.html#L1468) | ✓ | 🚫 → bbl-hub | bbl_mode === true → redirect |
| [matches.html](matches.html#L760) | ✓ | 🚫 → bbl-hub | bbl_mode === true → redirect |
| [mijn-sollicitaties.html](mijn-sollicitaties.html#L806) | ✓ | 🚫 → bbl-hub | bbl_mode === true → redirect |
| [student-home.html](student-home.html#L240) | ✓ | ⚪ ✓ (geen redirect) | **fetcht bbl_mode maar gebruikt niet voor redirect** |
| [matchpool.html](matchpool.html) | ✓ | ✓ | geen BBL-check (bewust gedeeld — beide rollen hebben matchpool in HEADER_NAV_BY_ROLE) |
| [chat.html](chat.html) | ✓ | ✓ | geen BBL-check (gedeeld) |
| [mijn-berichten.html](mijn-berichten.html#L862) | ✓ | ✓ | bbl_mode alleen voor header-tint, geen redirect |
| [mijn-notities.html](mijn-notities.html) | — | — | gepensioneerd-rol, niet student |
| [vacature-detail.html](vacature-detail.html) | ✓ | ⚪ ✓ (geen redirect) | semi-publiek, geen BBL-check |
| [kennisbank.html](kennisbank.html#L1917) | ✓ | ✓ | bbl_mode alleen voor header-tint |
| **Auth/canon** | | | |
| [auth.html](auth.html#L996) | ✓ | ✓ | bbl_mode → kiest doel-URL (bbl-hub vs bol-profile) |
| [index.html](index.html#L1876) | ✓ | ✓ | bbl_mode → getRoleLanding-redirect bij ingelogd |
| **Publieke info** | | | |
| about, pricing, faq, hoe-het-werkt, kennisbank, internly-worldwide, esg-rapportage, privacybeleid, spelregels, cookiebeleid, algemene-voorwaarden | ✓ | ✓ | bbl_mode alleen voor header-styling |

## Risicoanalyse

### 🟡 Risico 1 — student-home.html geen BBL-redirect

[student-home.html:225-243](student-home.html#L225) doet `requireRole('student')` en fetcht `bbl_mode`, maar redirect alleen als `naam` ontbreekt. **Een BBL-student die deze URL handmatig bezoekt of via een stale link (bv. e-mailnotificatie van vóór BBL-switch) kan op deze pagina belanden.**

De pagina toont BOL-georiënteerde content (sollicitatie-teller, kennisbank-tegels). Per CLAUDE.md routing-canon hoort een BBL-student op bbl-hub.html.

[js/roles.js:64-82](js/roles.js#L64) `resolveStudentDashboard()` zou hier autoritair voor moeten zijn. Eén-regel-fix in student-home.html:240:

```js
if (sp?.bbl_mode === true) { window.location.replace('bbl-hub.html'); return; }
if (!sp?.naam) { window.location.replace('bol-profile.html'); return; }
```

Of generieker via [getRoleLanding('student', true)](js/utils.js#L61).

### 🟡 Risico 2 — `chat.html` en `vacature-detail.html` geen BBL-guard

Beide pagina's zijn bereikbaar voor BBL-studenten. Voor chat is dat acceptabel — BBL heeft ook chat-relaties (met begeleider, buddy). Voor vacature-detail is het twijfelachtig: BBL-studenten solliciteren niet op losse vacatures (ze hebben al een leerbedrijf). De pagina laat ze door en stuurt na sollicitatie naar discover.html → die bounct naar bbl-hub.

**Niet kapot, wel rommelig.** Vacature-detail zou kunnen overwegen BBL-students vooraf naar bbl-hub te sturen, of de sollicitatie-knop te verbergen.

### 🟡 Risico 3 — Dubbele DB-roundtrip per BBL-pagina

Vrijwel elke student-pagina doet een eigen `student_profiles.select('bbl_mode')`-fetch ná de auth-guard. Dat zijn **8+ aparte queries** (bbl-dashboard, bbl-hub, bbl-profile, bol-profile, student-profile, discover, matches, mijn-sollicitaties, mijn-berichten, student-home, en alle 11 publieke pagina's). Bij elke pagina-load betaalt de student dus 1 extra round-trip.

**Aanbeveling:** `guardPage('student', { detectBBL: true })` zou de fetch combineren met de profile-load die guardPage zelf al doet. Schat: ~1 sessie werk om alle inline-fetches te verwijderen na het uitbreiden van guardPage.

### 🟢 Geen kritieke leak

Geen enkele student-only pagina laat een BBL-student onbedoeld werken aan BOL-only-data of vice versa op een manier die data corrumpeert. De redirects zijn defensief en symmetrisch toegepast.

### ⚠ Matrix-inconsistentie spec ↔ canon

[CLAUDE.md §Rollen en routing](CLAUDE.md) noemt `resolveStudentDashboard()` in [js/roles.js](js/roles.js) als single source of truth. Maar:

- 8 student-pagina's hebben hun **eigen inline bbl_mode-redirect** in plaats van de canon-helper aan te roepen
- Elke fix in `resolveStudentDashboard()` propageert niet automatisch naar deze inline-checks
- 4 van die 8 pagina's gebruiken `getRoleLanding('student', true)` (gemigreerd) — andere 4 gebruiken hardcoded URL's (bbl-dashboard, bbl-hub, bbl-profile, bol-profile, student-profile)

## Aanbevelingen sprint 5

🟡 **P1 — student-home BBL-fix.** 1-regel-edit in [student-home.html:240](student-home.html#L240). Voorkomt dat BBL-studenten op BOL-georiënteerde landing belanden via stale links.

🟡 **P2 — vacature-detail BBL-aware redirect.** Optioneel: `setTimeout(…, 2000)` op regel 1150 vervangen door `getRoleLanding(role, bblMode)` zodat BBL niet via discover hoeft te bouncen.

🟡 **P2 — inline redirects migreren naar `getRoleLanding('student', true)`.** Vier hardcoded targets (bbl-hub, student-profile, bbl-profile, discover) vervangen door de helper. Maakt toekomstige BBL-routing-wijzigingen één-plek.

🟢 **P3 — `guardPage`-uitbreiding `detectBBL`.** Architecturele opschoning. Lage urgentie zolang de inline-checks correct zijn.

## Bestanden zonder BBL-routing die er één zouden moeten hebben

| Bestand | Reden |
|---|---|
| [student-home.html](student-home.html) | Canonieke BOL-landing — BBL-student moet weg |
| [vacature-detail.html](vacature-detail.html) | BBL solliciteert niet op losse vacatures |

Geen andere ingelogde student-pagina mist een BBL-routing-check waar er één zou moeten zijn. De gedeelde pagina's (matchpool, chat, mijn-berichten, kennisbank) zijn bewust gedeeld per HEADER_NAV_BY_ROLE.
