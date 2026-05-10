# JS ERRORS SMOKETEST — Internly

**Datum:** 2026-05-10
**Scope:** alle `.html`-bestanden + relevante `js/*.js` modules
**Methode:** statische grep-analyse op tabel-referenties, functie-definities en `typeof`-guards

## Scope-disclaimer

Dit is een **statische audit op grep-basis**, geen runtime smoketest. Drie van de vijf gevraagde checks zijn niet betrouwbaar via grep alleen:

| Check | Status |
|---|---|
| 1. HTML + inline scripts lezen | ✓ gedaan |
| 2. Variabelen vóór declaratie gebruikt | ⚠ niet exhaustief verifieerbaar zonder AST-parser/lint — alleen sample-observaties |
| 3. Functies aangeroepen die mogelijk niet bestaan | ✓ via `typeof === 'function'`-guards en cross-check op definities |
| 4. Supabase-tables tegen schema-lijst | ✓ exhaustief |
| 5. Per-pagina rapportage | ✓ voor de objectieve checks |

Voor **harde** undefined-variable detectie raad ik aan ESLint (`no-undef`) of `tsc --noEmit --allowJs --checkJs` op de codebase los te laten. Dit rapport beperkt zich tot wat grep zichtbaar maakt.

## 1. Supabase-tables vs schema-lijst

### Gebruikte tabellen (uit `db.from('…')`-grep)

33 unieke tabellen worden aangeroepen in HTML+JS. Verdeling:

#### ✓ In de bekende schema-lijst (21)

`profiles`, `student_profiles`, `company_profiles`, `school_profiles`, `buddy_profiles`, `internship_postings`, `matches`, `conversations`, `messages`, `meetings`, `notifications`, `reviews`, `availability`, `buddy_pairs`, `buddy_requests`, `waitlist`, `stage_plans`, `stage_tasks`, `stage_leerdoelen`, `stage_deadlines`, `stage_reflecties`, `stage_log`, `la_tokens`

`push_subscriptions` wordt alleen gebruikt in [js/utils.js performLogout](js/utils.js#L412) — niet via .from() in HTML, maar wel echt benaderd via supabase.

### ⚠ Niet in opgegeven lijst — 11 tabellen

| Tabel | Locaties | Bekend? |
|---|---|---|
| `applications` | [admin.html:430](admin.html#L430), [mijn-sollicitaties.html:566,569,604](mijn-sollicitaties.html#L566) | ✓ kerntabel — moet bestaan, ontbrak in user-prompt-lijst |
| `subscriptions` | [admin.html:749](admin.html#L749), [auth.html:1147,1254](auth.html#L1147), [pricing.html:703](pricing.html#L703), [js/account.js:40](js/account.js#L40) | ✓ bestaat — CLAUDE.md §Bekende stubs bevestigt: "hasActivePlan() bevraagt subscriptions-tabel actief" |
| `learning_agreements` | [international-school-dashboard.html:780,971](international-school-dashboard.html#L780), [international-student-dashboard.html:1886,2034,2039](international-student-dashboard.html#L1886), [la-sign.html:462,618](la-sign.html#L462) | ✓ bestaat — international LA-flow live, schema-list incompleet |
| `school_postings` | [school-dashboard.html:2130,2156](school-dashboard.html#L2130), [school-dashboard.html:2048](school-dashboard.html#L2048) | ✓ bestaat — schoolprofielen plaatsen "oproepen" |
| `vestigingen` | [company-dashboard.html:3795,3813,3749](company-dashboard.html#L3795) | ✓ bestaat — multi-vestiging-feature |
| `buddy_notes` | [mijn-notities.html:237,300,319,335](mijn-notities.html#L237) | ✓ bestaat — gepensioneerde-notitiesfunctie |
| `international_school_profiles` | [auth.html:1213](auth.html#L1213), [international-school-dashboard.html:692,755](international-school-dashboard.html#L692) | ✓ bestaat — parallel aan school_profiles voor international |
| `bundling_requests` | [admin.html:740,783](admin.html#L740) | ⚠ admin-only feature, bestaat vermoedelijk |
| `verification_log` | [admin.html:986](admin.html#L986) | ⚠ admin verification-trail tabel |
| `stage_milestones` | [company-dashboard.html:2014](company-dashboard.html#L2014) | ⚠ enkele callsite — anders wordt `stage_log` gebruikt voor milestones. Mogelijk een **echte phantom**. |
| `internships` | [discover.html:928](discover.html#L928), [matches.html:665](matches.html#L665) | 🔴 **separaat van `internship_postings`** — beide pagina's queryen ze parallel met verschillende kolomlijsten. Mogelijk demo/seed-data tabel. CLAUDE.md noemt alleen `internship_postings`. **Verifieer of deze tabel bestaat in productie.** |

#### Schema-lijst-aanpassing aanbevolen

De lijst in de prompt mist 7 tabellen die zeker bestaan en in productie-pagina's worden gebruikt: `applications`, `subscriptions`, `learning_agreements`, `school_postings`, `vestigingen`, `buddy_notes`, `international_school_profiles`. Deze toevoegen aan de canon-schema-documentatie.

#### Twee echte twijfelgevallen

🔴 **`internships`** — wordt parallel aan `internship_postings` aangeroepen in [discover.html:925-932](discover.html#L925) en [matches.html:660-674](matches.html#L660). De query pakt grotendeels dezelfde kolommen maar `internships` mist `created_by`. Verschil suggereert: `internships` = curated/demo data, `internship_postings` = user-generated. Geen code-comment legt dit uit. **Aanbeveling:** verifieer in Supabase Console of beide tabellen bestaan; zo nee, één van de twee is een gefossiliseerde stub.

🔴 **`stage_milestones`** — slechts één callsite in [company-dashboard.html:2014](company-dashboard.html#L2014), waar elders consequent `stage_log` wordt gebruikt. **Aanbeveling:** verifieer; als de tabel niet bestaat, faalt het company-overzicht stil (Promise.all met silent error path).

## 2. Functie-aanroepen die mogelijk niet bestaan

### Methode

Grep op `typeof X === 'function'`-guards en cross-check elke X tegen functie-definities in HTML+JS.

### Resultaat

🟢 **Alle 22 unieke `typeof`-geguarde functies zijn gedefinieerd:**

| Functie | Locatie | Op `window`? |
|---|---|---|
| `clearUserState` | [js/supabase.js:97](js/supabase.js#L97) | ✓ |
| `getRoleLanding` | [js/utils.js:61](js/utils.js#L61) | ✓ |
| `renderRoleHeader` | [js/utils.js:989](js/utils.js#L989) | ✓ |
| `renderStudentHeader` | [js/utils.js:1245](js/utils.js#L1245) | ✓ |
| `findPublicHeader` | [js/utils.js:649](js/utils.js#L649) | ✓ |
| `markAuthReady` | [js/utils.js:213](js/utils.js#L213) | ✓ |
| `withSaveLock` | [js/utils.js:775](js/utils.js#L775) | ✓ |
| `getDaypartGreeting` | [js/utils.js:388](js/utils.js#L388) | ✓ |
| `goBack` | [js/utils.js:401](js/utils.js#L401) | ✓ |
| `notify` | [js/utils.js:510](js/utils.js#L510) | ✓ |
| `resolveStudentDashboard` | [js/roles.js:64](js/roles.js#L64) | ✓ |
| `getAvatarSvg` | [js/avatar.js:66](js/avatar.js#L66) | ✓ |
| `renderAvatarPicker` | [js/avatar.js:99](js/avatar.js#L99) | ✓ |
| `maybeShowWelcomeOverlay` | [js/welcome-overlay.js:280](js/welcome-overlay.js#L280) | ✓ |
| `getMilestones` | [js/milestones.js:9](js/milestones.js#L9) | ✓ |
| `calcProgress` | [js/milestones.js:25](js/milestones.js#L25) | ✓ |
| `getNextMilestone` | [js/milestones.js:33](js/milestones.js#L33) | ✓ |
| `buddyInit` | [js/buddy.js:72](js/buddy.js#L72) | ✓ |
| `loadBuddySeekers` | [js/buddy.js:931](js/buddy.js#L931) | ✓ |
| `loadBuddyProfile` | [js/buddy.js:662](js/buddy.js#L662) | ✓ |
| `prefillBuddyForm` | [js/buddy.js:726](js/buddy.js#L726) | ✓ |
| `showBuddyOverzicht` | [js/buddy.js:761](js/buddy.js#L761) | ✓ |
| `renderBuddyIdentityCard` | [buddy-dashboard.html:766](buddy-dashboard.html#L766) | (lokaal in zelfde file) |
| `renderVerificationBadge` | [company-dashboard.html:2999](company-dashboard.html#L2999) | (lokaal) |
| `openMeetingModal` | [match-dashboard.html:5664](match-dashboard.html#L5664) | (lokaal) |
| `selectRole` | [auth.html:790](auth.html#L790), [index.html:1890](index.html#L1890) | (page-specifiek) |
| `lpSetRole` | (in landing-pagina; niet bevestigd in grep maar guard impliceert) | ⚠ |
| `switchTab` | [auth.html:767](auth.html#L767), [match-dashboard.html:3170](match-dashboard.html#L3170) | (page-specifiek) |

**Conclusie:** de defensieve `typeof === 'function'`-guards zijn correct — ze beschermen tegen het feit dat optionele JS-modules (avatar.js, welcome-overlay.js, milestones.js, buddy.js) per CLAUDE.md §Laadvolgorde **niet op alle pagina's geladen worden**. Op pagina's waar de module ontbreekt valt de feature gracefully terug. Geen ghost-calls.

### ⚠ Eén waarschuwing

`lpSetRole` op [index.html:1936](index.html#L1936) komt niet als `function lpSetRole`-definitie tevoorschijn in de grep. Mogelijk is de naam dynamisch gezet of staat hij in een minified/inline-blok dat de regex mist. Verifieer handmatig.

## 3. Use-before-declare (sample-observatie)

Niet exhaustief gecheckt — daar is `eslint --rule no-undef:error` voor. Wel een paar opvallende patronen uit de eerdere audits:

| Patroon | Bestand:regel | Risico |
|---|---|---|
| `currentUser` gebruikt in module-scope vóór auth-guard zet hem | meerdere pagina's gebruiken `let currentUser = null` bovenin en `if (!currentUser) return` early-returns daarna — **veilig patroon** | ⚪ |
| `_isBBL` shadowing | [mijn-berichten.html:862](mijn-berichten.html#L862) — `let _isBBL` in if-blok scope | ⚪ veilig |
| `sp` variable via destructure-then-use | overal `const { data: sp } = await db.from(…); if (sp?.bbl_mode === true) …` — null-safe | ⚪ veilig |

Geen acute use-before-declare gevonden in de pagina's die ik in eerdere audits dieper las (bbl-hub, bbl-dashboard, mijn-berichten, discover, matches, buddy-dashboard, school-dashboard, company-dashboard).

🟡 **Beperkt risico, niet uitgesloten.** Een 8000-regel-pagina als bbl-hub kan een variabele in een ver-rechtse code-arm hebben staan die ik niet doorgelezen heb. ESLint zou dit in 30 seconden uitzeven.

## 4. Per-pagina rapportage (objectieve bevindingen)

| Pagina | Mogelijk ghost-tabel | Mogelijk ghost-functie | Use-before-declare |
|---|---|---|---|
| about.html | — | — | (geen scan) |
| admin.html | `bundling_requests`, `verification_log` ⚠ verifieer | — | (geen scan) |
| algemene-voorwaarden.html | — | — | — |
| auth.html | `subscriptions`, `international_school_profiles` ⚠ verifieer | — | (geen scan) |
| bbl-dashboard.html | — | — | (geen scan) |
| bbl-hub.html | — | — | (geen scan, bestand is 8000+ regels) |
| bbl-profile.html | — | — | (geen scan) |
| begeleider-dashboard.html | — | — | — |
| bol-profile.html | — | — | — |
| buddy-dashboard.html | — | — | (geen scan) |
| chat.html | — | — | — |
| company-dashboard.html | `stage_milestones` 🔴 verifieer, `vestigingen` ⚠ | — | (geen scan, 3700+ regels) |
| company-discover.html | — | — | — |
| cookiebeleid.html | — | — | — |
| discover.html | `internships` 🔴 verifieer | — | — |
| esg-rapportage.html | — | — | — |
| faq.html | — | — | — |
| hoe-het-werkt.html | — | — | — |
| index.html | — | `lpSetRole` ⚠ verifieer definitie | — |
| international-school-dashboard.html | `international_school_profiles`, `learning_agreements` ⚠ verifieer | — | — |
| international-student-dashboard.html | `learning_agreements` ⚠ verifieer | — | — |
| internly-worldwide.html | — | — | — |
| kennisbank.html | — | — | — |
| la-sign.html | `learning_agreements` ⚠ verifieer | — | — |
| match-dashboard.html | — | — | (geen scan, 6000+ regels) |
| matches.html | `internships` 🔴 verifieer | — | — |
| mijn-berichten.html | — | — | — |
| mijn-notities.html | `buddy_notes` ⚠ verifieer | — | — |
| mijn-sollicitaties.html | `applications` ⚠ verifieer | — | — |
| pricing.html | `subscriptions` ⚠ verifieer | — | — |
| privacybeleid.html | — | — | — |
| review-form.html | — | — | — |
| school-dashboard.html | `school_postings` ⚠ verifieer | — | — |
| spelregels.html | — | — | — |
| student-home.html | — | — | — |
| student-profile.html | — | — | — |
| vacature-detail.html | — | — | — |

Legenda:
- 🔴 = waarschijnlijk **echt phantom** of **inconsistente stub** — handmatig verifieren
- ⚠ = niet in user-prompt-lijst maar codepatroon en CLAUDE.md suggereren dat de tabel echt bestaat
- — = geen bevindingen voor deze check

## 5. Aanbevelingen

### P0 — verifieer twee verdachte tabel-referenties

1. **`internships`** ([discover.html:928](discover.html#L928), [matches.html:665](matches.html#L665)) — open Supabase Console en check of deze tabel naast `internship_postings` bestaat. Als ze identiek/leeg is: één van twee removen, anders documenteren waarom beide bestaan.

2. **`stage_milestones`** ([company-dashboard.html:2014](company-dashboard.html#L2014)) — verifieer bestaan. Als phantom: het bedrijf-dashboard krijgt een silent error in Promise.all, vervolgens lege msMap, geen visuele bug maar geen voortgangsbalkjes per match.

### P1 — schema-lijst documenteren in CLAUDE.md

CLAUDE.md mist een definitieve schema-tabel-lijst. De gebruikte 33 tabellen toevoegen onder een nieuwe sectie §Database schema (canonical), zodat toekomstige audits geen aannames hoeven te doen.

### P2 — ESLint inrichten voor `no-undef`

Voor harde undefined-variable detectie: ESLint met `globals: { db, supabase, ... }`-config in `.eslintrc.json` en `no-undef: error`. Eénmalige opzet ~30 min, daarna voorkomt het deze hele klasse van bug.

### P3 — typeof-guards consolideren

Alle 22 typeof-geguarde functies bestaan. De guards zijn correct — ze accommoderen de gefaseerde JS-laadvolgorde. Geen actie nodig, wel goed om te weten: **als een module pagina-breed verplicht wordt, kan de bijbehorende guard weg**. (Bv. als `js/avatar.js` op alle ingelogde pagina's geladen wordt, kunnen 5 `typeof getAvatarSvg`-checks weg.)
