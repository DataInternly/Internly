# Buddy profiel integratie — audit
Datum: 1 mei 2026
Auditor: Claude (read-only filesystem audit)
Bron-context: SQL-audit (KNOWN CONTEXT in instructie) + 8 secties filesystem-onderzoek

---

## Sectie 1 — buddy-dashboard.html structuur

- **Totale regels**: 1171
- **Topbar** ([buddy-dashboard.html:287-298](buddy-dashboard.html#L287-L298)): logo (smartHomeRedirect), `topbar-tag "Buddy-dashboard"`, user-name, Privacy + Spelregels links, Terug + Uit knoppen.
- **Bestaande nav**: GEEN sub-navigatie / nav-header / sidebar. Pagina is een **single-scroll** opzet — alle cards zichtbaar tegelijk vanaf load.
- **Pauze-banner**: regels 305-309
- **Openstaande verzoeken card**: regels 311-315 (`#requestsCard`, hidden by default)
- **Actieve koppelingen card**: regels 317-323 (`#pairsList`)
- **Swipe deck card** (`#buddy-seekers-section`): regels 325-415
  - Tinder-style deck (`deck-engine` met `_deckStudents`, `_deckIndex`, `_deckActive` in [js/buddy.js:982-996](js/buddy.js#L982-L996))
  - Loading / Empty / Done states + actions (✕ pass / 💜 like) + counter
- **Interesse in jou card**: regels 417-422 (`#incoming-likes-section`)
- **Profiel-overzicht card** (read-only na save): regels 424-432 (`#buddy-profile-overzicht`, hidden by default)
- **Profielformulier card**: regels 434-541 (`#buddy-profile-form-card`)
  - Velden + ID's:
    - `#avatar-picker-container` (regel 439) — gerenderd door `renderAvatarPicker()`
    - `[data-kg]` checkboxes (10 kennisgebieden) — regels 441-475
    - `[data-sp]` checkboxes (8 specialiteiten) — regels 477-505
    - `#bp-grove-beschikbaarheid` select (5 opties) — regels 507-516
    - `#bp-postcode` + `#bp-stad` — regels 518-527
    - `#bp-leeftijd` — regels 529-532
    - `#bp-actief` checkbox — regels 534-537
  - **Save-trigger**: regel 437 `<form … onsubmit="event.preventDefault(); saveBuddyProfile(collectBuddyProfileData(this))">`
  - Submit knop: regel 539 `<button type="submit" class="profile-save-btn">Profiel opslaan</button>` — **knop niet disabled tijdens save** (zie sectie 3 Hal-vlag)
- **Internly Worldwide card** (intl toggle + talen-tags): regels 543-567 — eigen save-pad via `saveIntlSettings`
- **Privacy & instellingen** (anoniem/pauze toggles): regels 569-590
- **Account card** (AccountModule render-target): regels 592-596 (`#account-container`)
- **Script blok**: 600-1158 — state, helpers, pairs, requests, likes, prefs, intl, init
- **Beschikbaarheid kalender** (`InternlyCalendar.render`): regels 1160-1166 (`#ical-container`)
- **Footer**: regel 1169
- **Default landing-sectie**: alle cards zichtbaar, scroll-positie top. Geen tab/screen-switcher.

---

## Sectie 2 — Auth + redirect logic

### Login → buddy-dashboard
- **Login redirect handler**: [auth.html:974-996](auth.html#L974-L996) — `setTimeout(() => …, 1000)` na succesvolle auth
- **Role-switch logica**: [auth.html:990-994](auth.html#L990-L994). Voor `role === 'gepensioneerd'` valt door naar de `else` branch op regel 994: `window.location.replace(getRoleLanding(role, false))`
- **Hoe wordt buddy/gepensioneerd herkend**: via DB-kolom `profiles.role === 'gepensioneerd'`. ROLE_LANDING ([js/utils.js:23](js/utils.js#L23)) mapt dit naar `'buddy-dashboard.html'`.

### Page-level role guard
- [buddy-dashboard.html:1079-1086](buddy-dashboard.html#L1079-L1086) — check `profile.role !== 'gepensioneerd'` → redirect via `getRoleLanding`. Correct.

### Hardcoded 'buddy' strings (potentiële bugs gescreend)
| Locatie | Type | Verdict |
|---|---|---|
| [js/roles.js:20](js/roles.js#L20) `BUDDY: 'buddy'` | Interne enum-waarde, geen DB-rol | OK — symbool, mapping op regel 30 |
| [js/roles.js:30](js/roles.js#L30) `if (role === 'gepensioneerd') return INTERNLY_ROLES.BUDDY` | DB → enum mapping | OK — correcte vertaling |
| [match-dashboard.html:2783](match-dashboard.html#L2783) `if (dbRole === 'gepensioneerd' \|\| dbRole === 'buddy')` | Defensive accept | DEAD BRANCH — `'buddy'` is geen DB-rol; `\|\| 'buddy'` is veilig maar overbodig |
| [mijn-berichten.html:242, 314, 320, 467, 581, 639](mijn-berichten.html#L242) | UI filter-pills + animation type-strings | OK — UI labels, niet DB-rol |
| [chat.html:1491](chat.html#L1491) `pair.type \|\| 'gepensioneerd'` | Fallback voor pair.type | OK — defensive |
| [matchpool.html:343](matchpool.html#L343) | UI button label | OK |
| [js/animations/match-celebrate.js:272, 280, 336](js/animations/match-celebrate.js) | Animation enum | OK |

Geen ECHTE bugs — alle 'buddy' strings zijn UI labels of correct gemapt naar `'gepensioneerd'`. Alleen [match-dashboard.html:2783](match-dashboard.html#L2783) heeft een dode `\|\| 'buddy'` branch (cosmetisch).

### Andere callsites die buddy-dashboard.html linken
- [bbl-profile.html:243](bbl-profile.html#L243) — sidebar nav link
- [mijn-berichten.html:400](mijn-berichten.html#L400) — empty-state CTA "Vind een buddy"
- [index.html:1501](index.html#L1501) — homepage role-tile CTA "Ga naar Buddy →"
- [js/welcome-overlay.js:202, 206, 210, 214, 218, 220](js/welcome-overlay.js) — onboarding CTA buttons (6 hits)
- [js/kb.js:330](js/kb.js#L330) — kennisbank role-routing
- [js/utils.js:23](js/utils.js#L23) — ROLE_LANDING canon
- [match-dashboard.html:2784](match-dashboard.html#L2784) — wrong-role redirect (`window.location.href = 'buddy-dashboard.html'`)

---

## Sectie 3 — saveBuddyProfile vs schema

### Locatie + flow
- **Function**: [js/buddy.js:767-788](js/buddy.js#L767-L788) `saveBuddyProfile(formData)`
- **Collect-helper**: [js/buddy.js:709-718](js/buddy.js#L709-L718) `collectBuddyProfileData(form)`
- **Update-target**: `buddy_profiles` upsert met `onConflict: 'profile_id'`

### Veld-mapping tabel

| Schema-kolom | Form-veld | Gemapt? |
|---|---|---|
| `profile_id` | (auto: `user.id`) | ja |
| `naam` | — (komt uit `profiles` tabel via `topbarUser`) | **nee** |
| `pitch` | — | **nee** |
| `bio` | — | **nee** |
| `achtergrond` | — | **nee** |
| `kennis_gebieden` | `[data-kg]:checked` | ja |
| `specialiteiten` | `[data-sp]:checked` | ja |
| `grove_beschikbaarheid` | `#bp-grove-beschikbaarheid` | ja |
| `postcode` | `#bp-postcode` (met `.trim()`) | ja |
| `stad` | `#bp-stad` (met `.trim()`) | ja |
| `leeftijd` | `#bp-leeftijd` (parseInt) | ja |
| `talen` | — (geen aparte talen-input voor buddy_profiles; `buddy_languages` is aparte tabel via `addBuddyLang`) | **nee** |
| `foto_url` | — | **nee** |
| `avatar_key` | `window._internlyAvatarKey` | ja |
| `active` | `#bp-actief` | ja |
| `open_to_international` | aparte `#intlToggle` → `saveIntlSettings()` (ander pad) | nee (apart pad) |
| `created_at` / `updated_at` | (DB defaults / triggers) | n.v.t. |

### Ontbrekende mockup-velden in form
Per de mockup-mapping uit KNOWN CONTEXT:
- `pitch` (tagline onder naam in avatar-strip) — **niet in form**
- `achtergrond` (sectie "Loopbaan") — **niet in form**
- `bio` (sectie "Wat ik te bieden heb") — **niet in form**
- Stat-row: `grove_beschikbaarheid` ✓ aanwezig + actieve matches count → komt uit `loadPairs()` count, niet uit een form-veld

Drie nieuwe velden (`pitch`, `achtergrond`, `bio`) zijn dus toe te voegen voordat de mockup gerealiseerd kan worden.

### Hal-vlaggen
- ✅ **Save error wordt opgevangen met notify** ([js/buddy.js:781-784](js/buddy.js#L781-L784)) — geen silent catch
- ❌ **Save-button NIET disabled tijdens save** — double-submit risico. Functie ontvangt `formData` en heeft geen referentie naar de submit-button. Reeds gevlagd in MILLION_THINGS_AUDIT E5.8 (HOOG)
- ✅ **INSERT-relaties** alleen `profile_id` (gegarandeerd via `auth.getUser()`) — bouwregel 2 niet van toepassing (geen FK behalve profiles)

---

## Sectie 4 — Avatar sticker-systeem

### Mapping en assets
- **Mapping-locatie**: [js/avatar.js:23-38](js/avatar.js#L23-L38) `INTERNLY_AVATARS` array — 14 avatars: `a01` t/m `a14`. Jan's `'a02'` mapt naar "Diepgroen ster" (bg `#0f5c36`, fg `#e8f5ee`, shape `star`).
- **Asset-pad**: GEEN losse asset-bestanden. SVG-shapes inline gegenereerd via [js/avatar.js:43-62](js/avatar.js#L43-L62) `_shapePath()` op een 32×32 viewBox. Geen `assets/`, `img/`, of `avatars/` directory in projectroot.

### Render-locaties (renderAvatarPicker — edit-mode)
| Locatie | Doel |
|---|---|
| [bol-profile.html:1351-1354](bol-profile.html#L1351-L1354) | student profielform |
| [student-profile.html:1660-1663](student-profile.html#L1660-L1663) | student profielform |
| [bbl-profile.html:715-718](bbl-profile.html#L715-L718) | BBL profielform |
| [buddy-dashboard.html:1116-1120](buddy-dashboard.html#L1116-L1120) | buddy profielform |
| [school-dashboard.html:2571-2574](school-dashboard.html#L2571-L2574) | school profielform |
| [company-dashboard.html:3503-3506](company-dashboard.html#L3503-L3506) | company profielform |
| [begeleider-dashboard.html:1279-1282](begeleider-dashboard.html#L1279-L1282) | begeleider profielform |
| [international-student-dashboard.html:1218-1221](international-student-dashboard.html#L1218-L1221) | intl student profielform |

### Render-locaties (getAvatarSvg — display-mode)
| Locatie | Doel | Verdict |
|---|---|---|
| [school-dashboard.html:1511-1512](school-dashboard.html#L1511-L1512) | student-list avatar in student-card | gebruikt shared helper ✓ |
| [chat.html:1002, 1379](chat.html#L1002) | SELECT `avatar_key` | maar render-pad onbekend — moet check |
| [mijn-berichten.html:555, 622, 704](mijn-berichten.html#L555) | SELECT `avatar_key` voor 3 conv-bronnen | render gebruikt **`avatarInitials()`** ([:308-311](mijn-berichten.html#L308-L311)), NIET `getAvatarSvg` — 7/11-vlag |
| [match-dashboard.html:2897](match-dashboard.html#L2897) | SELECT `avatar_key` voor party_a | render-pad niet geverifieerd |

### Inline implementaties + 7/11-metric
- **Shared module bestaat**: `js/avatar.js` definieert `INTERNLY_AVATARS`, `getAvatarSvg()`, `renderAvatarPicker()`.
- **Picker (edit-mode)**: gebruikers consistent. 8 callsites, allemaal via `renderAvatarPicker()`. Geen 7/11-issue.
- **Display-mode**: **inconsistent**. School-dashboard gebruikt `getAvatarSvg`, mijn-berichten gebruikt eigen `avatarInitials()` ondanks dat `avatar_key` wel SELECT-ed wordt. Chat en match-dashboard render-paden onbekend zonder verdere read.
- **7/11-verdict**: shared helper aanwezig, edit-mode consistent. Display-mode heeft minstens 1 onbenutte SELECT (mijn-berichten) + 2 onverifieerde paden — kleine sweep nodig om het systeem volledig benut te krijgen, niet een nieuwe helper.

---

## Sectie 5 — Navigatie patroon op andere rol-dashboards

### student-profile.html
- **Geen sidebar**. Header gerendered door `renderStudentHeader()` ([js/utils.js:467-513](js/utils.js#L467-L513)) in container `#student-header`.
- Header is een **horizontale top-nav** met links Mijn Stage Hub / Matchpool / Vacatures / Sollicitaties / Berichten / Kennisbank + Buddy-tab + notif-bell + profile-chip + back/logout.
- Active-state: class `active` op `<a>` element, gestuurd door `activeTab` parameter.
- Class-namen: `.student-header`, `.student-nav`, `.student-header-actions`, `.notif-bell`, `.profile-chip`.

### company-dashboard.html
- **Volledige sidebar** ([:599-700+](company-dashboard.html#L599)). Structure: `<aside class="sidebar">` → `.sidebar-user` (avatar+name+email) + `.sidebar-inner` met meerdere `.sidebar-section`.
- Sections: "Beheer" (Dashboard, Mijn vacatures, Nieuwe vacature), "Matching" (Matches, Berichten, Mijn studenten, Zoek stagiairs), "Reputatie" (Reviews, ESG, Vestigingen, Internationaal), "Account" (Bedrijfsprofiel, ...).
- Buttons: `<button class="nav-btn" id="nav-X" onclick="show('X')">` met `<span class="nav-icon">` + label + optionele `<span class="nav-badge">`.
- Active-state: class `active` op `.nav-btn`, gestuurd door `show()` JS.

### school-dashboard.html
- **Identieke sidebar pattern** als company. Sections: "Overzicht" (Dashboard, Studenten, Signalen), "Matching" (Mijn oproepen, Nieuwe oproep, Bedrijven bekijken, Berichten), "Account" (Schoolprofiel, ...).
- Zelfde class-namen.

### Gemeenschappelijke CSS-classes (company + school)
`.layout`, `.sidebar`, `.sidebar-user`, `.sidebar-inner`, `.sidebar-section`, `.sidebar-label`, `.nav-btn`, `.nav-btn.active`, `.nav-icon`, `.nav-badge`.

### Aanbevolen patroon voor buddy-nav
**Twee opties — beslissing voor Barry:**

- **Optie A — sidebar-pattern (zoals company/school)**: visueel + structureel consistent met andere niet-student rollen. Bouwwerk: 1 `<aside class="sidebar">`-blok in buddy-dashboard.html, plus een `show()`-functie voor section-switching, plus reorganiseren van de huidige cards in losse sections. Past bij "professional" rolperceptie van gepensioneerde buddy.
- **Optie B — student-header style top-nav**: lichter, één balk bovenaan. Vraagt nieuwe `renderBuddyHeader()` in utils.js (of param-uitbreiding van `renderStudentHeader`). Past beter bij eenvoudige info-architectuur.

Voor de mockup met "5 nav items" lijkt Optie B passender (mockup is horizontaal). Optie A is gangbaarder voor non-student rollen. Mockup zelf moet keuze drijven.

---

## Sectie 6 — mijn-berichten.html role-guard

- **Linked vanaf**:
  - `renderStudentHeader` ([js/utils.js:419, 425](js/utils.js#L419)) — als nav-tab "Berichten"
  - Geen directe link vanuit buddy-dashboard.html — buddies openen chat per pair via `openChat(pairId)` → chat.html
- **Role-guard**: [mijn-berichten.html:784](mijn-berichten.html#L784)
  ```
  const hasRole = await requireRole('student');
  if (!hasRole) return;
  ```
- `'gepensioneerd'` in toegestane lijst: **NEE** — alleen `'student'`. Een buddy die `mijn-berichten.html` direct opent wordt door `requireRole` doorgestuurd via `getRoleLanding('gepensioneerd')` → terug naar buddy-dashboard.html.
- **Aanpassing nodig**:
  - Regel 784 zou `await requireRole('student', 'gepensioneerd')` worden om buddies toe te laten.
  - Maar pagina zelf rendert `renderStudentHeader()` ([:796](mijn-berichten.html#L796)) — student-header werkt niet voor buddies (geen Stage Hub, geen Vacatures, geen sollicitaties). Die call zou rolspecifiek moeten worden of vervangen.
  - **Verdict**: niet alleen guard aanpassen — hele page-shell moet rol-aware worden. Significant werk. Een `mijn-berichten.html` voor buddies vraagt mogelijk eigen kleine variant of een rol-bewuste `renderHeader(role, activeTab)` in utils.js.

---

## Sectie 7 — mijn-notities.html non-existence

- **Bestand bestaat**: `c:\Projects\Internly\mijn-notities.html` → NEE
- **Bestand alternatief**: `c:\Projects\Internly\notities.html` → NEE
- **`buddy_notes` tabel bestaat** (uit SQL-audit): nee
- **Geplande locatie**: `c:\Projects\Internly\mijn-notities.html`
- **Buiten scope deze sprint**: ja (backlog #6)

---

## Sectie 8 — Shared modules + 7/11 vlaggen

### js/buddy.js exports
- `BuddyModule` (object, intern via global) + `buddyInit(userId, role, db, name)` — module-init
- `loadBuddySeekers`, `buddyRequestStudent`, `buddySkipStudent`, `deckAction`, `reloadBuddyDeck`, `showBuddyOverzicht`, `showBuddyForm` (regels 1341-1349)
- Top-level objects: `BUDDY_TYPES = ['gepensioneerd']`, `BUDDY_CONFIG`, deck-state vars

### js/utils.js exports
- Routing: `isValidRole`, `smartHomeRedirect`, `getRoleLanding`, `goBack`
- Auth/role: `requireRole`, `getDisplayName`, `performLogout`
- Verification: `VERIFICATION_STATES`, `VERIFICATION_LABELS_NL`
- UI: `renderStudentHeader`, `getUnreadTotal`, `Internly.getUnreadTotal`
- Validators: `validatePassword`, `validateEmail`, `sanitizeNaam`, `validatePostcode`
- Plus utility: `notify`, `escapeHtml`, `formatNLDate`, `getNotifText`, `createNotification`, `TOAST_TIMEOUT_MS` (uit CLAUDE.md, niet gegrep'd in deze audit)

### js/supabase.js exports
- `__SUPABASE_ANON_KEY`, `db`

### js/avatar.js exports
- `INTERNLY_AVATARS`, `getAvatarSvg`, `renderAvatarPicker`, `_internlyAvatarKey`

### 7/11-vlaggen op basis van mockup

#### Avatar-render
- **Vlag**: NEE — al goed gedeeld
- **Reden**: `js/avatar.js` is al de gedeelde helper. Edit-mode (picker) volledig consistent. Display-mode kan beter benut worden in mijn-berichten + chat + match-dashboard, maar dat is sweep-werk, geen nieuwe abstractie.

#### Profile-view-render (read-only saved view)
- **Vlag**: JA — 7/11 risico
- **Reden**: huidige `showBuddyOverzicht` ([js/buddy.js:723-757](js/buddy.js#L723-L757)) is buddy-specifiek. Mockup vraagt avatar-strip + tagline + Loopbaan + Bio + stat-row — exact het pattern dat student-profile en company-profile saved-view ook nodig hebben (mockup-consistency = brand-consistency). Als we buddy-versie nu hardcoded bouwen, schrijven we 'm later 2x opnieuw voor student/company.
- **Aanbeveling**: nieuwe `js/profileView.js` met `renderProfileView(profile, role, mappingConfig)` waar mappingConfig per rol declareert welke kolommen welke sectie vullen. Buddy = eerste consumer. Stub kan ook in `js/utils.js` als bouw-overhead te groot is.

#### Profile-edit-form-render
- **Vlag**: NEE — niet nu
- **Reden**: bestaande edit-forms (bol-profile, bbl-profile, student-profile, buddy-dashboard inline, school, company, begeleider) verschillen significant in veld-set + validatie + flow (wizard vs single-page). Abstractie zou ofwel zwak (lots of conditional branches) ofwel verlies-aan-flexibiliteit zijn. Beter per pagina laten.

### Aanbeveling — waar concept landt
| Concept | Locatie | Status |
|---|---|---|
| Avatar render (edit + display) | `js/avatar.js` | bestaande shared helper, sweep voor display-consistency |
| Profile-view (read-only) | nieuwe `js/profileView.js` | bouwen vóór buddy mockup-implementatie zodat student/company hergebruik mogelijk is |
| Profile-edit-form | per-pagina | per-rol genoeg verschillend om geen abstractie te rechtvaardigen |
| `mijn-berichten.html` rol-uitbreiding | utils.js: nieuwe `renderHeader(role, activeTab)` óf rol-aware variant van `renderStudentHeader` | wachten tot Barry beslist of buddies "Berichten" als top-nav nodig hebben |

---

## Open vragen voor Barry

1. **Mockup nav-keuze (Optie A vs B uit Sectie 5)**: krijgt buddy-dashboard een sidebar (zoals company/school) of een horizontale top-nav (zoals student-pagina's)? Mockup-vorm bepaalt dit, en de keuze drijft het werk in zowel buddy-dashboard.html als utils.js.

2. **Drie ontbrekende DB-velden in form (uit Sectie 3)**: zijn `pitch`, `achtergrond`, en `bio` in de huidige sprint-scope om aan het buddy-profielformulier toe te voegen, of komen die in een latere stap? Schema heeft ze al; alleen UI ontbreekt.

3. **`mijn-berichten.html` voor buddies (uit Sectie 6)**: krijgt de buddy "Berichten" als nav-item? Zo ja: aanpassing is significant want hele page-shell rendert via `renderStudentHeader` — hetzij we maken `renderHeader(role)` rol-aware, hetzij we splitsen naar een buddy-variant. Niet "even één regel veranderen".

4. **`renderProfileView` shared module — bouwen vóór buddy-mockup of erna?** Shared helper bouwen voor alleen buddy is overkill, maar als we het later doen schrijven we de buddy-versie 2x. Beslissing: vooraan in deze sprint of als dedicated refactor-sprint na buddy-launch?

5. **Avatar display-mode sweep**: er is minstens 1 plek (`mijn-berichten.html`) waar `avatar_key` wel wordt SELECT-ed maar `avatarInitials()` wordt gebruikt voor render. Sweep-PR los van deze sprint, of meenemen?

---

## Aanbevolen integratie-route

**Eerst de drie schema-velden (`pitch`, `achtergrond`, `bio`) aan het bestaande buddy-profielformulier toevoegen** zodat `saveBuddyProfile` ze persistent maakt. Daarna de `showBuddyOverzicht`-render-functie ([js/buddy.js:723](js/buddy.js#L723)) ofwel uitbouwen tot een mockup-getrouwe weergave (avatar-strip + tagline + Loopbaan + Bio + stat-row), ofwel vooraf abstraheren naar `js/profileView.js` afhankelijk van vraag 4 hierboven. Nav-pattern (vraag 1) en `mijn-berichten` toegang (vraag 3) zijn aparte beslismomenten die niet in deze eerste integratie-stap hoeven mee. Het double-submit gat op de save-knop (Hal-vlag uit Sectie 3) hoort in deze sprint mee — kleine fix, voorkomt support-tickets.
