# DUPLICATE CODE AUDIT — Internly

**Datum:** 2026-05-10
**Scope:** alle `.html` en `.js` in `c:\Projects\Internly`
**Methode:** grep op functie-definities + inline-patronen die dezelfde verantwoordelijkheid dekken
**Kader:** CLAUDE.md Bouwregel 3 + K3 ("7/11-principe" — geen lokale kopieën van gedeelde concepten)

## Samenvatting-tabel

| Concept | Aantal implementaties | Gedeeld contract in utils.js? | 7/11-flag? |
|---|---:|---|---|
| Daypart-greeting (Goedemorgen/-middag/-avond) | **4** (1 canon + 3 inline) | ✓ `getDaypartGreeting()` | 🔴 ja — 1 caller, 3 die hem negeren |
| `signOut()` logout-trigger | **14 wrappers + 2 forks + 1 canon** | ✓ `performLogout()` | 🟡 14 OK (1-line delegators), **2 forks missen push-cleanup** |
| Toast / notificatie | **9** (1 canon + 1 lokaal + 1 nieuwe module + 6 inline) | ✓ `notify()` | 🔴 6 inline `showToast()`-kopieën |
| Naam-extractie (display name) | **1 canon + 22+ inline call-sites** | ✓ `getDisplayName(user)` | 🔴 ja — kanonniek niet gebruikt door enige caller |
| Header-render | **5 helpers + 5+ inline `<div class="topbar">`** | ✓ deels (geen sidebar-helper) | 🟡 mix — zie [HEADER_CONSISTENCY_AUDIT.md](HEADER_CONSISTENCY_AUDIT.md) |

## 1. Greeting-functies (`Goedemorgen` / `Goedemiddag` / `Goedenavond`)

### Canon
[js/utils.js:388](js/utils.js#L388) `getDaypartGreeting(naam)` — exposed op `window.getDaypartGreeting`. Gebruikt 4 dagdelen (morgen/middag/avond/nacht), retourneert `"Goedemorgen, Jan"`.

### Implementaties

| Bestand:regel | Patroon | Gebruikt canon? |
|---|---|---|
| [js/utils.js:388](js/utils.js#L388) | canon | — |
| [buddy-dashboard.html:1446](buddy-dashboard.html#L1446) | `getDaypartGreeting(_greetingNaam)` met fallback | ✓ |
| [bbl-dashboard.html:538](bbl-dashboard.html#L538) | inline `setWelcome(naam)` met eigen ternary | 🔴 dupe |
| [student-home.html:246](student-home.html#L246) | inline `const groet = uur < 12 ? …` | 🔴 dupe |
| [js/utils.js:1090](js/utils.js#L1090) | inline ternary binnen `renderRoleLanding()` (zelfde bestand!) | 🔴 dupe |

**7/11-flag.** De canon roept zichzelf niet aan in [renderRoleLanding](js/utils.js#L1084) — de hulpfunctie staat 700 regels lager in hetzelfde bestand. bbl-dashboard en student-home hebben elk hun eigen 1-regel-ternary geschreven. Eén-regel-fix elk.

## 2. Logout / `signOut()`

### Canon
[js/utils.js:412](js/utils.js#L412) `performLogout()` — uitgebreide flow:
1. Push-subscription-cleanup (browser unsubscribe + DB-delete) — **F7.3.A cross-account-leak fix**
2. `db.auth.signOut()`
3. `clearUserState()`
4. `window.location.replace('/index.html')`

### Implementaties

| Soort | Aantal | Voorbeeld | Status |
|---|---:|---|---|
| 1-line delegators `function signOut() { performLogout(); }` | **14** | [bbl-hub.html:1171](bbl-hub.html#L1171), [company-dashboard.html:1546](company-dashboard.html#L1546), [school-dashboard.html:1263](school-dashboard.html#L1263), etc. | ✓ correct patroon — exposeert global voor inline `onclick` |
| Eigen async `signOut()` zonder `performLogout()` | **2** | [international-student-dashboard.html:2349](international-student-dashboard.html#L2349), [international-school-dashboard.html:996](international-school-dashboard.html#L996) | 🔴 fork |

### De twee forks

```js
// international-student-dashboard.html:2349 + international-school-dashboard.html:996
async function signOut() {
  try { await db.auth.signOut(); }
  catch (err) { console.error('[intl-…] signOut fout:', err?.message || err); }
  if (typeof clearUserState === 'function') clearUserState();
  window.location.href = 'auth.html';
}
```

**Wat ontbreekt t.o.v. canon:**
- Push-subscription cleanup (browser + DB) → cross-account push-notif-leak mogelijk bij international-pagina-logouts
- `window.location.replace` ipv `href` (laat geen browser-history-entry achter)
- Redirect naar `auth.html` ipv `index.html` (canon stuurt eerst naar marketing-landing)

🔴 **7/11-overtreding.** Beide files hebben een TODO-comment (`// notify() and escapeHtml() come from js/utils.js — do not redefine here.`) wat aantoont dat de auteur bewust was van de canon-regel — maar voor signOut is de fork toch geschreven. Fix: vervang door `function signOut() { performLogout(); }`.

## 3. Toast / notificatie-functies

### Canon
[js/utils.js:510](js/utils.js#L510) `notify(msg, ok = null)` — vult element `#notif`, ok=true → groen, ok=false → rood, null → neutraal.

### Variant-landschap

| Bestand:regel | Naam | Doel-element | Verschil |
|---|---|---|---|
| [js/utils.js:510](js/utils.js#L510) | `notify` | `#notif` | **canon — algemene melding** |
| [js/calendar.js:28](js/calendar.js#L28) | `calNotify` | `#cal-notif` | **bewust lokaal** — gedocumenteerd in CLAUDE.md (kalender-specifiek) |
| [js/toast.js:195-203](js/toast.js#L195) | `window.toast.{success/info/warning/error/successUndoable}` | dynamische `#_iToastStack` | **nieuwe module** — rijke API met undo/retry, alleen geladen door [matchpool.html](matchpool.html#L495) |
| [company-dashboard.html:1500](company-dashboard.html#L1500) | `showToast(message)` | `#notif-toast` (DIY) | 🔴 inline kopie |
| [school-dashboard.html:1215](school-dashboard.html#L1215) | `showToast(message)` | `#notif-toast` | 🔴 inline kopie (identieke CSS) |
| [matches.html:296](matches.html#L296) | `showToast(message)` | `#notif-toast` | 🔴 inline kopie (top:70px ipv 66px) |
| [mijn-sollicitaties.html:756](mijn-sollicitaties.html#L756) | `showToast(message)` | `#notif-toast` | 🔴 variant met bottom-positie |
| [discover.html:1282](discover.html#L1282) | `showToast()` | wrapt `notify()` met vaste tekst | ⚠ wrapper, geen kopie — verwarrende naam |
| [match-dashboard.html:4693](match-dashboard.html#L4693) | `toast(msg, type)` | `#toast` (statisch DOM) | 🔴 weer een variant met andere conventies |

🔴 **7/11-overtreding.** Vier inline `showToast`-functies dekken hetzelfde doel: tonen van een nieuwe-notificatie-toast bij realtime push. Code is bijna byte-voor-byte gelijk (CSS-positie verschilt 4px). Bovendien zijn er **drie concurrente toast-systemen** in de codebase: legacy `notify()`, inline `showToast()` op 4 pagina's, en de nieuwe `js/toast.js`-module. 

**Aanbeveling:** alleen `js/toast.js` is geschikt voor toekomstig gebruik (geaccepteerde API, ARIA-correct, undo/retry). Deze drie sporen consolideren op `toast.info()` / `toast.success()` is een sprint-taak.

## 4. `getDisplayName()` / naam-extractie

### Canon
[js/utils.js:374](js/utils.js#L374) `getDisplayName(user)` — extraheert: `user.user_metadata.naam || user.naam || user.full_name || email-prefix || 'Gebruiker'`.

### Implementaties

🔴 **22+ inline patronen, 0 callers van de canon.** Het patroon `user.user_metadata?.naam || user.email?.split('@')?.[0] || 'fallback'` is letterlijk uitgeschreven in:

| Bestand | Aantal occurrences |
|---|---:|
| [bbl-hub.html](bbl-hub.html) | **10** (regels 1326, 1382, 1456, 1656, 1671, 1756, 2036, 2376, 2386, 2497) |
| [mijn-berichten.html](mijn-berichten.html) | **3** (528, 551, 826) |
| [admin.html:478](admin.html#L478) | 1 |
| [auth.html:1352](auth.html#L1352) | 1 |
| [bbl-dashboard.html:611](bbl-dashboard.html#L611) | 1 |
| [bbl-profile.html:797](bbl-profile.html#L797) | 1 |
| [begeleider-dashboard.html:1347](begeleider-dashboard.html#L1347) | 1 |
| [buddy-dashboard.html:1377](buddy-dashboard.html#L1377) | 1 |
| [chat.html:789](chat.html#L789) | 1 |

**Variants in de fallback-string:** `'Student'`, `'Buddy'`, `'Begeleider'`, `'Praktijkbegeleider'`, `'BBL-student'`, `'Jij'`, `'J'`, `''`. Acht verschillende fallback-conventies.

🔴 **De duurste 7/11-overtreding van de codebase.** Geen enkele caller gebruikt `getDisplayName(user)`. Het canon-contract is dood. Refactor zou ~22 regels code raken; doel is simpel:

```js
const naam = getDisplayName(currentUser);
```

en de fallback-string als optionele tweede parameter:

```js
function getDisplayName(user, fallback = 'Gebruiker') { … }
```

Schat: 1 sessie, lage risk.

## 5. Header-render-functies

### Canon-set in `js/utils.js` + `js/kb.js`

| Functie | Locatie | Doel | Status |
|---|---|---|---|
| `renderRoleHeader(role, activeTab, opts)` | [js/utils.js:989](js/utils.js#L989) | generieke top-bar met HEADER_NAV_BY_ROLE | canon |
| `renderStudentHeader({ activeTab })` | [js/utils.js:1245](js/utils.js#L1245) | student/student_bbl met BBL-detect | canon |
| `_renderStudentHeaderLoggedOut()` | [js/utils.js:1167](js/utils.js#L1167) | private template | helper |
| `_renderStudentHeaderLoggedIn(...)` | [js/utils.js:1175](js/utils.js#L1175) | private template | helper |
| `renderRoleLanding(role, profileData)` | [js/utils.js:1084](js/utils.js#L1084) | landing-card voor uitgelogde routing-overlay | apart concept (geen header-render) |
| `renderKBHeader(containerId)` | [js/kb.js:309](js/kb.js#L309) | kennisbank-specifieke shared header | canon (eigen module) |

### Inline duplicaten (samengevat uit HEADER_CONSISTENCY_AUDIT.md)

5 ingelogde pagina's gebruiken eigen `<div class="topbar">`-markup i.p.v. de helpers: [bbl-profile](bbl-profile.html#L319), [bol-profile](bol-profile.html#L389), [chat](chat.html#L481), [vacature-detail](vacature-detail.html#L546), [company-discover](company-discover.html#L571).

Geen aparte JS-functie-implementaties hier — gewoon hardcoded HTML. Per pagina anders qua links + accent-kleur.

🟡 **Geen 7/11-functie-fork**, wel een markup-fork. Gedekt in [HEADER_CONSISTENCY_AUDIT.md](HEADER_CONSISTENCY_AUDIT.md). Aparte fix-batch.

### Sidebar-render — ontbrekende helper

Er is **geen `renderBedrijfSidebar()` of `renderSchoolSidebar()`**. Type C/D-pagina's hebben elk hun eigen `<aside class="sidebar">`-markup. Dit is een gat in de canon, niet een 7/11-overtreding (geen "tweede bestand met hetzelfde concept" — er is gewoon geen eerste).

## Bevindingen samengevat

🔴 **3 echte 7/11-overtredingen die actie verdienen:**

1. **`getDisplayName` is dood.** 22+ call-sites schrijven het patroon inline uit terwijl de canon klaar staat. Eén refactor-sessie. Veiligste plek om mee te beginnen — pure renaming, geen gedragsverandering.

2. **2 international-files met eigen `signOut()`-fork.** Functioneel verschil: missen push-cleanup (cross-account-leak risk per F7.3.A). 2-regel-fix per file: vervang door `function signOut() { performLogout(); }`.

3. **6 toast-implementaties (4 inline `showToast` + `match-dashboard.toast` + `discover.showToast`-wrapper).** Drie concurrente systemen actief tegelijk. Aanbeveling: stap door op `js/toast.js` en deprecate `notify()` op termijn. Sprint-taak (groter, 1-2 sessies).

🟡 **2 zachtere flags:**

4. **3 inline daypart-greetings** (bbl-dashboard, student-home, en utils.js zelf inside renderRoleLanding). Kost 5 minuten per file om naar `getDaypartGreeting()` te wijzen.

5. **5 inline `<div class="topbar">` op ingelogde pagina's** — gedekt in HEADER_CONSISTENCY_AUDIT, geen aparte fix-cyclus nodig.

🟢 **Geen 7/11 in:**
- 14 `function signOut() { performLogout(); }` 1-liners — bewust patroon (global voor inline onclick)
- `calNotify` in calendar.js — gedocumenteerde uitzondering (CLAUDE.md §Loop-shield)
- 4 private `_render*`-helpers in utils.js — interne factoring, niet gepubliceerd

## Volgorde van fixes

| Prio | Concept | Bestanden | Risk | Schat |
|---|---|---|---|---|
| 1 | `signOut()` fork (international) | 2 | laag — 4 regels | 5 min |
| 2 | `getDisplayName()` adoptie | 9 (22+ sites) | laag — pure refactor | 60-90 min |
| 3 | Daypart-greeting consolidatie | 3 | laag | 15 min |
| 4 | Toast-systeem unify naar `js/toast.js` | 5+ | middel — gedragsverandering, alle showToast-callers testen | 1-2 sessies |
