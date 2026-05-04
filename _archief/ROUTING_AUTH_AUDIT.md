# INTERNLY — ROUTING & AUTH AUDIT
Datum: 2026-04-30
Auditor: Claude (general-purpose agent, read-only)
Scope: routing canon + auth guards op alle protected & public pages
Exclusies: BACKUP/, _revamp_2026-04-29/

## 1. Samenvatting

Getoetst: **23 protected pages** + **8 public pages**. Auth guard status: **6 pages PASS** (gebruiken `requireRole`), **15 pages PARTIAL** (gebruiken eigen `getUser` + role-check via lokale dict), **2 pages MISSING** (matchpool/intl-student doen alleen auth, geen rol-controle uit profiles), **0 WRONG**.

Topzorgen:
1. **Canon B2 niet doorgevoerd**: 15 pagina's hanteren nog hardgecodeerde `routes = { ... }` lookup-tabellen i.p.v. `getRoleLanding()`. Bij rol-mismatch sturen ze naar inconsistente bestemmingen — vier verschillende dialecten (zie §6).
2. **BBL routing conflict in auth.html** (open vraag, gemarkeerd in code op regels 979 en 1277): post-login flow stuurt BBL zonder naam naar `bbl-hub.html`; al-ingelogd-panel stuurt zelfde state naar `bbl-profile.html`. Twee gedragingen voor identieke user-state.
3. **`internly-worldwide.html` ladet inline Supabase client met hardcoded SUPABASE_URL + ANON_KEY** ([internly-worldwide.html:1661-1662](internly-worldwide.html#L1661)) — known pattern volgens audit-comment, maar nog steeds publiek leesbaar via view-source.

## 2. ROUTING CANON (utils.js)

### getRoleLanding(role, bblMode)

[js/utils.js:28-45](js/utils.js#L28)

```js
function getRoleLanding(role, bblMode = false) {
  if (role === 'student') {
    return resolveStudentDashboard(
      { role: role },
      bblMode ? { bbl_mode: true } : null
    );
  }
  return ROLE_LANDING[role] || 'index.html';
}
```

| Rol | Landing | Bron |
|-----|---------|------|
| student | (delegated to resolveStudentDashboard) | [js/roles.js:64-72](js/roles.js#L64) |
| bedrijf | company-dashboard.html | [js/utils.js:21](js/utils.js#L21) ROLE_LANDING |
| school | school-dashboard.html | [js/utils.js:22](js/utils.js#L22) ROLE_LANDING |
| gepensioneerd | buddy-dashboard.html | [js/utils.js:23](js/utils.js#L23) ROLE_LANDING |
| begeleider | begeleider-dashboard.html | [js/utils.js:24](js/utils.js#L24) ROLE_LANDING |
| admin | admin.html | [js/utils.js:25](js/utils.js#L25) ROLE_LANDING |
| (vangnet) student | discover.html | [js/utils.js:20](js/utils.js#L20) ROLE_LANDING — ongebruikt door wrapper, behouden voor directe ROLE_LANDING-callers |
| onbekend | index.html | [js/utils.js:44](js/utils.js#L44) `||` fallback |

Student delegatie via `resolveStudentDashboard` ([js/roles.js:64-72](js/roles.js#L64)):
- geen studentProfile → `match-dashboard.html`
- bbl_mode === true → `bbl-hub.html`
- student_type === 'international' → `international-student-dashboard.html`
- BOL/HBO/WO standaard → `match-dashboard.html`

### requireRole(...allowedRoles)

[js/utils.js:125-137](js/utils.js#L125)

```js
async function requireRole(...allowedRoles) {
  const validRoles = ['student', 'bedrijf', 'school'];
  const invalid = allowedRoles.filter(r => !validRoles.includes(r));
  if (invalid.length > 0) { console.error('[requireRole] onbekende rol(len):', invalid); return false; }
  const role = await fetchUserRole();
  if (!role) { window.location.replace('auth.html'); return false; }
  if (!allowedRoles.includes(role)) {
    console.warn('[requireRole] user rol', role, 'niet in toegestane', allowedRoles);
    window.location.replace(getRoleLanding(role));
    return false;
  }
  return true;
}
```

Gedrag:
- Geen ingelogde user → `replace('auth.html')`, returns false.
- Ingelogde user maar wrong role → `replace(getRoleLanding(role))`, returns false.
- Geldige rol → returns true.

**Beperking:** validRoles = alleen `['student','bedrijf','school']`. Pagina's voor `gepensioneerd`, `begeleider`, `admin` kunnen `requireRole` NIET aanroepen — een aanroep met die roles logt console-error en returns false zonder redirect. Daarom hanteren admin/buddy/begeleider/intl-school nog hun eigen guard-patroon.

### smartHomeRedirect()

[js/utils.js:55-85](js/utils.js#L55)

```js
async function smartHomeRedirect() {
  // 1. db client check  → href='index.html' op fail
  // 2. getUser()         → href='index.html' als geen user
  // 3. profiles.role     → href='index.html' als geen role
  // 4. Voor student: student_profiles.bbl_mode lookup
  //    - geen sp rij    → href='student-profile.html' (onboarding-guard)
  //    - bbl_mode bool  → opgeslagen in bblMode var
  // 5. href = getRoleLanding(prof.role, bblMode)
}
```

Flow: 5 sequentiele DB-aanroepen, met `href='index.html'` als veilige terugval bij ALLE faalmodes (geen client / geen user / geen role / exception). Voor studenten extra onboarding-guard (geen sp rij → student-profile.html). Aangeroepen vanuit logo-onclick op pagina's die de gemeenschappelijke header laden.

### Hardcoded HTML filenames in utils.js

| Regel | Filename | Context |
|-------|----------|---------|
| [js/utils.js:20](js/utils.js#L20) | `discover.html` | ROLE_LANDING student vangnet |
| [js/utils.js:21](js/utils.js#L21) | `company-dashboard.html` | ROLE_LANDING bedrijf |
| [js/utils.js:22](js/utils.js#L22) | `school-dashboard.html` | ROLE_LANDING school |
| [js/utils.js:23](js/utils.js#L23) | `buddy-dashboard.html` | ROLE_LANDING gepensioneerd |
| [js/utils.js:24](js/utils.js#L24) | `begeleider-dashboard.html` | ROLE_LANDING begeleider |
| [js/utils.js:25](js/utils.js#L25) | `admin.html` | ROLE_LANDING admin |
| [js/utils.js:44](js/utils.js#L44) | `index.html` | getRoleLanding fallback |
| [js/utils.js:60](js/utils.js#L60) | `index.html` | smartHomeRedirect — geen client |
| [js/utils.js:63](js/utils.js#L63) | `index.html` | smartHomeRedirect — geen user |
| [js/utils.js:67](js/utils.js#L67) | `index.html` | smartHomeRedirect — geen role |
| [js/utils.js:77](js/utils.js#L77) | `student-profile.html` | smartHomeRedirect — geen sp rij |
| [js/utils.js:83](js/utils.js#L83) | `index.html` | smartHomeRedirect — exception |
| [js/utils.js:130](js/utils.js#L130) | `auth.html` | requireRole — geen role |
| [js/utils.js:174](js/utils.js#L174) | `/index.html` | performLogout (note: leading slash anders dan rest) |
| [js/utils.js:373](js/utils.js#L373) | `/index.html` | _renderStudentHeaderLoggedOut logo |
| [js/utils.js:374](js/utils.js#L374) | `/auth.html?mode=signup` | _renderStudentHeaderLoggedOut CTA |
| [js/utils.js:381](js/utils.js#L381) | `/matches.html?filter=buddy` | header buddy-link |
| [js/utils.js:381](js/utils.js#L381) | `/discover.html?filter=buddy` | header buddy-link (no buddies) |
| [js/utils.js:382](js/utils.js#L382) | `/bbl-profile.html` of `/student-profile.html` | header profileHref |
| [js/utils.js:383](js/utils.js#L383) | `/bbl-hub.html` of `/discover.html` | header logoHref |
| [js/utils.js:386-391](js/utils.js#L386) | `/match-dashboard.html`, `/matchpool.html`, `/discover.html`, `/mijn-sollicitaties.html`, `/mijn-berichten.html`, `/kennisbank.html` | bolNav (let op leading slash) |
| [js/utils.js:394-397](js/utils.js#L394) | `/bbl-hub.html`, `/bbl-dashboard.html`, `/mijn-berichten.html`, `/kennisbank.html` | bblNav |

**Inconsistentie:** sommige href's beginnen met `/` (header-block), andere niet (ROLE_LANDING / smartHomeRedirect). Geen functioneel risico (relatieve link werkt vanaf root), maar inconsistent stijl.

## 3. AUTH.HTML ROUTING

### Post-login redirect per role

| Role | Target URL | Hardcoded of via getRoleLanding? | File:line |
|------|------------|----------------------------------|-----------|
| student (sp aanwezig) | `resolveStudentDashboard(...)` | via canon (resolveStudentDashboard direct) | [auth.html:983](auth.html#L983) |
| student (geen sp) | `student-profile.html` | hardcoded | [auth.html:988](auth.html#L988) |
| school + intl | `international-school-dashboard.html` | hardcoded | [auth.html:992](auth.html#L992) |
| bedrijf · school · begeleider · gepensioneerd · admin | `getRoleLanding(role, false)` | via canon | [auth.html:994](auth.html#L994) |
| Wachtwoord-reset succes | `auth.html` (zelfde pagina) | hardcoded | [auth.html:875](auth.html#L875) |
| JWT verlopen (unhandledrejection) | `auth.html?expired=1` | hardcoded | [auth.html:1248](auth.html#L1248) |
| Al-ingelogd panel BBL met naam | `bbl-hub.html` | hardcoded | [auth.html:1281](auth.html#L1281) |
| Al-ingelogd panel BBL zonder naam | `bbl-profile.html` | hardcoded | [auth.html:1281](auth.html#L1281) |
| Al-ingelogd panel student zonder naam | `student-profile.html` | hardcoded | [auth.html:1282](auth.html#L1282) |
| Al-ingelogd panel overige | `getRoleLanding(role, false)` | via canon | [auth.html:1269](auth.html#L1269) |

### BBL routing conflict (lijnen ~983 en ~1281)

Niet exact regels 877 en 1175 zoals genoemd in de scope-instructie; de werkelijke conflict-locaties zijn **[auth.html:983](auth.html#L983)** (doLogin post-login redirect) en **[auth.html:1281](auth.html#L1281)** (DOMContentLoaded al-ingelogd panel). Beide locaties dragen `OPEN VRAAG (30 apr 2026)` comments die expliciet naar elkaar verwijzen.

**Locatie 1 — doLogin (post-login redirect):**
```js
// auth.html:976-989
if (_sp && typeof _sp.bbl_mode === 'boolean') {
  // OPEN VRAAG (30 apr 2026): BBL student zonder naam wordt
  // hier naar bbl-hub gestuurd, maar het al-ingelogd panel
  // (rond regel 1129) stuurt naar bbl-profile.
  window.location.href = resolveStudentDashboard({ role: 'student' }, _sp);
} else {
  // Onboarding-guard: student zonder profiel → profiel-form
  window.location.href = 'student-profile.html';
}
```

`resolveStudentDashboard` met `bbl_mode === true` retourneert `bbl-hub.html` ongeacht of `naam` is gevuld ([js/roles.js:67](js/roles.js#L67)). Een BBL student zonder naam komt dus na login op bbl-hub.html.

**Locatie 2 — DOMContentLoaded al-ingelogd panel:**
```js
// auth.html:1271-1283
if (role === 'student') {
  const { data: sp } = await db.from('student_profiles')
    .select('bbl_mode, naam, onderwijsniveau')...
  // OPEN VRAAG (30 apr 2026): BBL student zonder naam gaat hier
  // naar bbl-profile, maar post-login flow (rond regel 837)
  // stuurt naar bbl-hub. Twee gedragingen voor zelfde user-state.
  if (sp?.bbl_mode === true) { dest = sp?.naam ? 'bbl-hub.html' : 'bbl-profile.html'; ... }
  else if (!sp?.naam) { dest = 'student-profile.html'; }
}
```

Hier wordt expliciet `naam` gecheckt en BBL-zonder-naam naar `bbl-profile.html` gestuurd.

**Interpretatie:** dezelfde gebruiker (BBL student, bbl_mode=true, naam=null) krijgt afhankelijk van entry-path twee verschillende landings. CLAUDE.md noemt deze post-11-mei UX-keuze. Nog niet opgelost; conflict is alleen gedocumenteerd. Bovendien staat in `resolveStudentDashboard` zelf geen naam-check — dus locatie 2 implementeert een onboarding-guard die canon NIET kent.

### Recovery handler (?type=recovery)

**Status: aanwezig en correct.** [auth.html:693-726](auth.html#L693)

Flow:
1. URL-parameter `type=recovery` getrigger via `_initParams.get('type')` op [auth.html:694](auth.html#L694)
2. Reads access_token uit URL-fragment (`window.location.hash`) op [auth.html:695](auth.html#L695)
3. Bij DOMContentLoaded: rendert reset-password formulier in `.card-body` container
4. Verbergt bestaande tabs/forms/role-picker
5. Submit roept `doSetNewPassword()` op [auth.html:861-877](auth.html#L861) → `db.auth.updateUser({ password })` → bij succes `setTimeout(() => replace('auth.html'), 2000)`

Reset-link constructie: `db.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/auth.html?type=recovery' })` op [auth.html:851](auth.html#L851).

Geen issues gevonden. Wel: na succes wordt naar `auth.html` (zonder query) gestuurd — gebruiker moet opnieuw inloggen, geen auto-login, dat is correct/veilig.

### Routing naar non-existent of renamed pages

| Target genoemd | Bestaat? | Locaties | Notes |
|---|---|---|---|
| `stage-hub.html` | NEE | 0 in productie | Alleen referenties in `_archief/` en `BACKUP/` (uitgesloten). Productie schoon. |
| `bbl-hub.html` | JA | div. | OK. |
| `match-dashboard.html` | JA | div. | OK. |
| `international-student-dashboard.html` | JA | auth.html, roles.js | OK. |
| `international-school-dashboard.html` | JA | auth.html:992 | OK. |
| `bol-profile.html` | JA | div. | OK. |

## 4. PROTECTED PAGES — GUARD STATUS

| File | requireRole? | Allowed roles | Script order OK? | Status | Notes |
|------|--------------|----------------|-------------------|--------|-------|
| [admin.html](admin.html#L788) | nee | (admin, eigen check) | OK (utils:15, roles:16, supabase:18) | PARTIAL | eigen `if (prof?.role !== 'admin')` op regel 794; wrong-role → `auth.html` (geen `getRoleLanding`) |
| [bbl-dashboard.html](bbl-dashboard.html#L528) | nee | (student bbl, eigen check) | OK (utils:21, supabase:23 — **roles.js NIET geladen**) | PARTIAL | guard via `sp.bbl_mode !== true → discover.html`; geen rol-controle |
| [bbl-hub.html](bbl-hub.html#L2477) | nee | (student bbl, eigen check) | OK (utils:59, supabase:61 — **roles.js NIET geladen**) | PARTIAL | zelfde patroon als bbl-dashboard |
| [bbl-profile.html](bbl-profile.html#L629) | nee | (student bbl, eigen check) | OK (utils:21, roles:22, supabase:24) | PARTIAL | dual guard (role check + bbl_mode); wrong-role uses lokale `routes = { ... }` dict op regel 651 |
| [begeleider-dashboard.html](begeleider-dashboard.html#L1116) | nee | (begeleider, eigen check) | OK (utils:15, roles:16, supabase:18) | PARTIAL | wrong-role → `auth.html` (geen canon); plan-guard via `hasActivePlan` toegevoegd |
| [bol-profile.html](bol-profile.html#L1273) | nee | (student bol, eigen check) | OK (utils:15, roles:16, supabase:18) | PARTIAL | wrong-role → lokale routes dict |
| [buddy-dashboard.html](buddy-dashboard.html#L940) | nee | (gepensioneerd, eigen check) | OK (utils:23, roles:24, supabase:26) | PARTIAL | wrong-role → lokale `redirect = { ... }` dict op regel 959 |
| [chat.html](chat.html#L1418) | **JA** | student, bedrijf, school | OK (utils:14, roles:15, supabase:17) | PASS | `requireRole('student','bedrijf','school')` regel 1420; ook profile-guard + match partij guard |
| [company-dashboard.html](company-dashboard.html#L2833) | nee | (bedrijf, eigen check) | OK (utils:15, roles:16, supabase:18) | PARTIAL | wrong-role → lokale routes dict op regel 2841 |
| [company-discover.html](company-discover.html#L705) | nee | (bedrijf, eigen check) | OK (utils:15, roles:16, supabase:18) | PARTIAL | wrong-role → lokale routes dict op regel 714 |
| [discover.html](discover.html#L1395) | **JA** | student | OK (utils:16, roles:17, supabase:19) | PASS | `requireRole('student')` regel 1395; daarna BBL-redirect via canon |
| [esg-export.html](esg-export.html) | nee | (geen) | n.v.t. | INTENTIONAL | geen scripts, statisch |
| [esg-rapportage.html](esg-rapportage.html) | nee | (geen) | n.v.t. | INTENTIONAL | publieke marketing-pagina |
| [international-school-dashboard.html](international-school-dashboard.html#L563) | nee | (school + intl profiel, eigen check) | OK (utils:34, supabase:36 — **roles.js NIET geladen**) | PARTIAL | wrong-role → `replace('auth.html')` (geen canon); intl-check via tweede tabel |
| [international-student-dashboard.html](international-student-dashboard.html#L1069) | nee | **GEEN rol-controle** | OK (utils:39, supabase:41 — **roles.js NIET geladen**, intentioneel per comment regel 7) | MISSING | alleen `if (!user) replace('auth.html')`. Een ingelogde bedrijfs-/school-/admin-gebruiker kan dit dashboard openen. |
| [match-dashboard.html](match-dashboard.html#L2753) | nee | (student/bedrijf/school in MATCH_ID modus) | OK (utils:16, roles:17, supabase:22) | PARTIAL | bij MATCH_ID: alleen auth-check; rol-guard staat in `loadMatchFromDB` op regel 2814 (`allowedRoles = ['student','begeleider']`) wat **gepensioneerd, school, bedrijf** uitsluit (terwijl demo-mode `bedrijf` en `school` wel toelaat). Inconsistent. |
| [matches.html](matches.html#L691) | **JA** | student | OK (utils:15, roles:16, supabase:18) | PASS | `requireRole('student')` regel 695; daarna BBL-redirect via canon |
| [matchpool.html](matchpool.html) (init in [js/matchpool.js:282](js/matchpool.js#L282)) | **JA** | student | utils:16, supabase:18 — **roles.js NIET geladen** | PARTIAL | requireRole gebruikt — maar `getRoleLanding` faalt voor student-redirect omdat `resolveStudentDashboard` ontbreekt (roles.js niet geladen). Zwakke degraded fallback via `ROLE_LANDING['student']` = `discover.html`. Zie §6. |
| [mijn-berichten.html](mijn-berichten.html#L781) | **JA** | student | OK (utils:14, roles:15, supabase:17) | PASS | `requireRole('student')` regel 782 |
| [mijn-sollicitaties.html](mijn-sollicitaties.html#L795) | **JA** | student | OK (utils:13, roles:14, supabase:16) | PASS | `requireRole('student')` regel 798 |
| [review-form.html](review-form.html#L340) | nee | (alle ingelogde users, business-eligibility check) | OK (utils:15, supabase:17 — **roles.js NIET geladen**) | PARTIAL | alleen `if (!user) replace('auth.html')`; rol niet gecontroleerd, maar `canWriteReview` doet zakelijke filtering |
| [school-dashboard.html](school-dashboard.html#L2466) | nee | (school, eigen check) | OK (utils:15, roles:16, supabase:18) | PARTIAL | wrong-role → lokale routes dict regel 2474 |
| [student-profile.html](student-profile.html#L1576) | nee | (student, eigen check) | OK (utils:15, roles:16, supabase:18) | PARTIAL | wrong-role → lokale routes dict regel 1588; ook BBL/BOL forwarding |
| [vacature-detail.html](vacature-detail.html#L987) | nee | (publiek shareable, soft check) | OK (utils:15, roles:16, supabase:18) | INTENTIONAL | `if (!user)` toont banner i.p.v. redirect — bewust geen guard |

## 5. CROSS-ROLE LINK VIOLATIONS

Onderzoek: cross-role hardcoded links in dashboard-pagina's. Beoordeling:

| Source file:line | Target | Source role | Target role | Severity |
|------------------|--------|--------------|--------------|----------|
| [bbl-profile.html:241](bbl-profile.html#L241) | buddy-dashboard.html | student (BBL) | gepensioneerd | LOW (alleen toegankelijk voor BBL-students; klik leidt tot rol-mismatch redirect bij destination) |
| [school-dashboard.html:658](school-dashboard.html#L658) | match-dashboard.html | school | (multi-role) | LOW (match-dashboard accepteert school in demo-mode én in MATCH_ID-mode niet — conflict, zie §4 match-dashboard) |
| [company-dashboard.html:632](company-dashboard.html#L632) | match-dashboard.html | bedrijf | (multi-role) | LOW (zelfde inconsistentie) |
| [company-dashboard.html:1347](company-dashboard.html#L1347) | mijn-berichten.html | bedrijf | student | **MEDIUM** — `mijn-berichten.html` heeft `requireRole('student')` — bedrijf wordt direct doorgestuurd weg |
| [company-dashboard.html:1365](company-dashboard.html#L1365) | company-discover.html | bedrijf | bedrijf | OK |
| [school-dashboard.html:655](school-dashboard.html#L655) | chat.html | school | multi (incl. school) | OK — chat.html accepteert school |

Geen CRITICAL cross-role links gevonden. Alle dashboard-cross-links worden door de target-page guards opgevangen — wel UX-confusion want klik naar bedoelde feature redirect zichtbaar terug.

## 6. ROUTING SPLIT ANALYSIS

Geteld in productie root (excl. BACKUP/, _revamp/, .md, _archief): redirect-statements (`window.location.href=`, `replace(`, `assign(`, `location.href=`).

- **Totaal redirect-statements (productie):** ~120
- **Geguarded (achter `await requireRole(...)` of `if (!user)` check):** ~32 (auth-redirects: `if (!user) → auth.html` patroon)
- **Ongeguarded (vrije redirects, deeplinks, button-onclicks):** ~88

Meeste ongeguarde redirects zijn legitime navigatie (button onclicks naar `chat.html?match=X`, `pricing.html`, tab-switchers). De problematische set:

### Lijst van ongeguarde redirects die routing-canon negeren

| File:line | Target | Reden ongegaurd | Risico |
|-----------|--------|-----------------|--------|
| [admin.html:794](admin.html#L794) | `auth.html` (wrong role) | hardcoded i.p.v. `getRoleLanding` | UX: admin's verkeerde rol-user wordt naar login gestuurd, niet naar eigen dashboard |
| [admin.html:790](admin.html#L790) | `auth.html` (no user) | hardcoded; OK |OK — auth fallback |
| [bbl-dashboard.html:555](bbl-dashboard.html#L555) | `discover.html` (niet-BBL) | hardcoded i.p.v. canon | Niet-BBL student gaat altijd naar discover, ook als bedrijf/school |
| [bbl-hub.html:2495](bbl-hub.html#L2495) | `discover.html` (niet-BBL) | zelfde | Zelfde |
| [bbl-profile.html:651-652](bbl-profile.html#L651) | lokale `routes` dict | hardcoded inline mapping | Mist `begeleider`, `admin` mappings |
| [bbl-profile.html:658](bbl-profile.html#L658) | `student-profile.html` | hardcoded forwarding | OK (BOL → BOL profile) |
| [bol-profile.html:1286](bol-profile.html#L1286) | lokale `routes` dict | hardcoded; mist `gepensioneerd`, `begeleider`, `admin` | Wrong-role gebruiker valt door naar `auth.html` fallback |
| [bol-profile.html:1308](bol-profile.html#L1308) | `bbl-profile.html` | hardcoded forwarding | OK |
| [bol-profile.html:1313](bol-profile.html#L1313) | `student-profile.html` | hardcoded forwarding | OK |
| [buddy-dashboard.html:960](buddy-dashboard.html#L960) | lokale `redirect` dict | hardcoded; mist `begeleider`, `admin` | UX confusion |
| [company-dashboard.html:2842](company-dashboard.html#L2842) | lokale `routes` dict | hardcoded; mist `begeleider`, `admin` | UX confusion |
| [company-discover.html:715](company-discover.html#L715) | lokale `routes` dict | hardcoded; mist `gepensioneerd`, `begeleider`, `admin` | UX confusion |
| [school-dashboard.html:2475](school-dashboard.html#L2475) | lokale `routes` dict | hardcoded; mist `begeleider`, `admin` | UX confusion |
| [student-profile.html:1589](student-profile.html#L1589) | lokale `routes` dict | hardcoded; mist `gepensioneerd`, `begeleider`, `admin` | UX confusion |
| [international-school-dashboard.html:591](international-school-dashboard.html#L591) | `auth.html` (wrong role) | hardcoded | Een ingelogde student wordt uit-redirected naar login, niet naar discover |
| [match-dashboard.html:2773](match-dashboard.html#L2773) | `buddy-dashboard.html` | hardcoded | OK (buddy redirect) |
| [match-dashboard.html:2820](match-dashboard.html#L2820) | `getRoleLanding(_prof.role, false)` | **gebruikt canon** | OK |
| [chat.html:1457](chat.html#L1457) | `getRoleLanding(__cachedUserRole \|\| 'student')` | **gebruikt canon** | OK |
| [bol-profile.html:1248](bol-profile.html#L1248) | `getRoleLanding('student', newBblMode === true)` | **gebruikt canon** | OK |
| [student-profile.html:1551](student-profile.html#L1551) | `getRoleLanding('student', newBblMode === true)` | **gebruikt canon** | OK |
| [discover.html:1427](discover.html#L1427) | `getRoleLanding('student', true)` | **gebruikt canon** | OK |
| [matches.html:705](matches.html#L705) | `getRoleLanding('student', true)` | **gebruikt canon** | OK |
| [mijn-sollicitaties.html:807](mijn-sollicitaties.html#L807) | `getRoleLanding('student', true)` | **gebruikt canon** | OK |
| [index.html:1855](index.html#L1855) | `getRoleLanding(prof.role, bblMode)` | **gebruikt canon** | OK |

**Patroon:** 4 verschillende routing-dialects bestaan parallel:
1. Canon: `getRoleLanding(role, bblMode)` — pages 6
2. Lokale dict: `const routes = { student: 'discover.html', ... }` — pages 9
3. Hardcoded auth redirect: `replace('auth.html')` — pages 3
4. Hardcoded relatieve target: `discover.html`, `student-profile.html` — pages 4

## 7. PUBLIC PAGE VIOLATIONS

| File | Loads supabase.js? | Loads utils.js? | Loads roles.js? | Should? | Status |
|------|---------------------|------------------|------------------|---------|--------|
| [index.html](index.html#L1817) | JA (1820) | JA (1817) | JA (1818) | JA — bevat auth gate (1840) | OK |
| [auth.html](auth.html#L19) | JA (19) | JA (16) | JA (17) | JA — hele login-flow | OK |
| [about.html](about.html#L948) | JA (950) | JA (948) | JA (949) | Marginaal — voor smartHomeRedirect logo | INTENTIONAL (per CLAUDE.md OK voor logo) |
| [faq.html](faq.html#L997) | JA (999) | JA (997) | JA (998) | Marginaal — zelfde reden | INTENTIONAL |
| [pricing.html](pricing.html#L405) | JA (408) | JA (405) | JA (406) | JA — login-checks via `auth.html` redirect (regel 670, 720) | OK |
| [privacybeleid.html](privacybeleid.html) | NEE | NEE | NEE | NEE — pure marketing | OK |
| [spelregels.html](spelregels.html) | NEE | NEE | NEE | NEE | OK |
| [hoe-het-werkt.html](hoe-het-werkt.html) | NEE | NEE | NEE | NEE | OK |
| [internly-worldwide.html](internly-worldwide.html#L11) | INLINE (regels 1661-1666) | NEE | NEE | NEE — leakt SUPABASE_URL+ANON_KEY in source | **VIOLATION** — known per comment, fase 2 cleanup pending |
| [stagebegeleiding.html](stagebegeleiding.html) | NEE | NEE | NEE | NEE | OK |
| [404.html](404.html) | NEE | NEE | NEE | NEE | OK |
| [preview.html](preview.html) | NEE | NEE | NEE | NEE | OK |
| [internly_simulator.html](internly_simulator.html) | NEE | NEE | NEE | NEE | OK |
| [kennisbank.html](kennisbank.html#L18) | JA (18) | JA (16) | NEE | Onbekend (educatieve pagina, geen guard) | OK |
| [kennisbank-artikel.html](kennisbank-artikel.html#L18) | JA (18) | JA (16) | NEE | Onbekend | OK |
| [esg-rapportage.html](esg-rapportage.html#L1108) | NEE — alleen `/js/esg-inject.js` | NEE | NEE | NEE | OK |
| [esg-export.html](esg-export.html) | NEE | NEE | NEE | NEE | OK |
| [la-sign.html](la-sign.html#L40) | JA (40) | NEE | NEE | JA — public no-auth page met token-flow, intentional per comment regel 9 | INTENTIONAL |

## 8. PRIORITY FIX LIST

### CRITICAL (direct unauthorized access)

Geen CRITICAL issues gevonden. Alle protected pages hebben minimaal een `if (!user)` guard.

### HIGH (wrong role kan toegang krijgen)

- [international-student-dashboard.html:1069-1086](international-student-dashboard.html#L1069) — heeft alleen auth-check, geen rol-check. Een ingelogd bedrijf, school, gepensioneerd of admin kan deze pagina openen en zien (UI loadt en toont ander dashboard). Fix: na `getUser` ook role-check via profiles + `replace(getRoleLanding(role))` voor non-students. Of: roles.js opnemen + `requireRole('student')` (zou werken maar pagina-targeting blijft alleen NL → moet international-student check toevoegen via student_profiles.student_type).
- [match-dashboard.html:2814-2822](match-dashboard.html#L2814) — `loadMatchFromDB` definieert `allowedRoles = ['student','begeleider']` terwijl demo-mode-pad (regel 2777) `bedrijf` en `school` wel toelaat. Inconsistentie: een bedrijf-/school-gebruiker met geldige `?match=X` URL wordt geredirect via `getRoleLanding`. Verifieer of dit bedoeld is; CLAUDE.md zegt `school` mag eval bekijken. Fix: voeg `'school','bedrijf'` toe aan `allowedRoles` op regel 2817, of corrigeer de demo-mode whitelist.

### MEDIUM (inconsistent routing, UX confusion)

- [bbl-dashboard.html:528](bbl-dashboard.html#L528) en [bbl-hub.html:2477](bbl-hub.html#L2477) — laden `js/utils.js` + `js/supabase.js` maar **niet** `js/roles.js`. Geen huidige bug omdat beide pages geen `getRoleLanding`/`resolveStudentDashboard` aanroepen, maar volgens CLAUDE.md §Laadvolgorde is `roles.js` verplicht na `utils.js`. Fix: voeg `<script src="js/roles.js"></script>` toe na utils.js.
- [matchpool.html:18](matchpool.html#L18) — laadt utils.js + supabase.js maar **niet** roles.js. `js/matchpool.js:287` roept `requireRole('student')` aan. Bij wrong-role: `requireRole` doet `replace(getRoleLanding(role))` wat in `getRoleLanding` voor `role==='student'` `resolveStudentDashboard` aanroept. Voor non-student rollen werkt het via ROLE_LANDING. Maar een `student` met BBL-mode komt nu uit op `discover.html` (vangnet) i.p.v. `bbl-hub.html`, want `resolveStudentDashboard` is undefined. Fix: voeg roles.js toe.
- [international-school-dashboard.html:36](international-school-dashboard.html#L36) — alleen utils.js + supabase.js, geen roles.js. Wrong-role redirect (regel 591) gaat naar `auth.html` i.p.v. eigen dashboard. Fix: laad roles.js + vervang regel 591 door `replace(getRoleLanding(role))`.
- 9 pages met lokale `routes = { ... }` dict — vervangen door `getRoleLanding(role)` (zie §9 tabel).
- BBL routing conflict ([auth.html:983](auth.html#L983) vs [auth.html:1281](auth.html#L1281)) — kies één bron-van-waarheid voor "BBL student zonder naam". Aanbevolen: `resolveStudentDashboard` aanvullen met naam-check, dan beide call-sites identiek gedrag.
- [chat.html:1420](chat.html#L1420) — `requireRole('student','bedrijf','school')` accepteert school, maar voor school-eigen gesprekken bestaat geen filter; school kan via deeplink `?match=X` proberen. Match-partij guard op regels 1444-1459 vangt dat op (school is niet party_a/party_b van student-bedrijf match) → `getRoleLanding(__cachedUserRole)` redirect. Acceptabel.

### LOW (cosmetic / minor)

- [js/utils.js:174](js/utils.js#L174) `replace('/index.html')` — leading slash inconsistent met rest van utils.js (overige refs zijn `'index.html'`). Geen functioneel effect.
- [js/utils.js:373-397](js/utils.js#L373) header-block gebruikt leading slashes (`/discover.html`), elders niet. Cosmetisch.
- `internly-worldwide.html` inline credentials — geen veiligheidsrisico (anon-key is publiek bedoeld) maar inconsistent met rest van codebase die `js/supabase.js` gebruikt. Fix per fase 2.

## 9. CANON B2 RESOLUTION (proposal)

### Source of truth

**`getRoleLanding(role, bblMode)`** in [js/utils.js:28](js/utils.js#L28) is de canon-wrapper. Voor students delegeert het naar `resolveStudentDashboard` in [js/roles.js:64](js/roles.js#L64). Beide moeten in elke app-pagina geladen zijn (laadvolgorde: utils.js → roles.js → supabase.js).

**`requireRole(...allowedRoles)`** in [js/utils.js:125](js/utils.js#L125) is de canon-guard voor pages waar role ∈ {student, bedrijf, school}. Voor admin/begeleider/gepensioneerd/intl moet een uitbreiding van `validRoles` overwogen worden, of pages blijven hun eigen guard houden (huidig).

### Role → landing → allowed → blocked tabel

| Role | Landing | Allowed pages | Blocked pages |
|------|---------|----------------|----------------|
| student (BOL/HBO/WO) | match-dashboard.html | discover, matches, matchpool, mijn-sollicitaties, mijn-berichten, chat (als party), match-dashboard, student-profile, bol-profile, vacature-detail (publiek), kennisbank, review-form (als eligible), pricing | bbl-*, company-*, school-*, buddy-*, begeleider-*, admin, intl-* |
| student (BBL) | bbl-hub.html | bbl-hub, bbl-dashboard, bbl-profile, mijn-berichten, kennisbank, chat (als party) | discover (huidig: redirect naar bbl-hub), match-dashboard, BOL-pages, all non-student dashboards |
| student (international) | international-student-dashboard.html | intl-student-dashboard, kennisbank, chat | alle NL student-pages, alle non-student dashboards |
| bedrijf | company-dashboard.html | company-dashboard, company-discover, match-dashboard (huidig conflict), chat, mijn-berichten (CONFLICT — guard blokkeert), pricing, vacature-detail | student-, school-, buddy-, begeleider-, admin, bbl-, intl-* |
| school | school-dashboard.html | school-dashboard, match-dashboard (eval), chat, pricing | student-, company-, buddy-, begeleider-, admin, bbl-, intl-student |
| school (international) | international-school-dashboard.html | intl-school-dashboard, la-sign | alle NL school-pages, alle non-school |
| begeleider | begeleider-dashboard.html | begeleider-dashboard, match-dashboard (eval), pricing | student-, company-, school-, buddy-, admin, bbl-, intl-* |
| gepensioneerd (buddy) | buddy-dashboard.html | buddy-dashboard, chat (buddy_pair), mijn-berichten? | alle student-, company-, school-, begeleider-, admin, bbl-* |
| admin | admin.html | admin | alles overig (admin moet door eigen rol gaan) |

### Files die requireRole() nog missen

- `admin.html` — niet mogelijk via huidige requireRole (rol 'admin' niet in validRoles); behoud eigen guard óf breid validRoles uit.
- `bbl-dashboard.html` — guard is nu via `sp.bbl_mode`. Voorgestelde uitbreiding: `requireRole('student')` + bbl_mode check.
- `bbl-hub.html` — idem.
- `bbl-profile.html` — idem.
- `bol-profile.html` — idem (`requireRole('student')` + onderwijsniveau check).
- `buddy-dashboard.html` — niet mogelijk via requireRole (rol 'gepensioneerd' niet in validRoles); behoud eigen guard óf breid uit.
- `begeleider-dashboard.html` — niet mogelijk; behoud óf breid uit.
- `company-dashboard.html` — `requireRole('bedrijf')` toepasbaar.
- `company-discover.html` — `requireRole('bedrijf')` toepasbaar.
- `international-school-dashboard.html` — `requireRole('school')` + intl-profile check.
- `international-student-dashboard.html` — `requireRole('student')` + student_type check (HIGH PRIORITY — zie §8).
- `school-dashboard.html` — `requireRole('school')` toepasbaar.
- `student-profile.html` — `requireRole('student')` toepasbaar.
- `match-dashboard.html` — `requireRole('student','bedrijf','school','begeleider')` (na uitbreiding validRoles voor begeleider).
- `review-form.html` — `requireRole('student')` + canWriteReview-check.

### Files waar hardcoded redirects vervangen moeten worden door getRoleLanding()

- [admin.html:794](admin.html#L794) — `'auth.html'` → `getRoleLanding(prof.role)` (na auth-check, dus role bestaat).
- [bbl-dashboard.html:555](bbl-dashboard.html#L555) — `'discover.html'` → `getRoleLanding('student', false)` (sp.bbl_mode === false impliceert NL non-BBL student).
- [bbl-hub.html:2495](bbl-hub.html#L2495) — `'discover.html'` → `getRoleLanding('student', false)`.
- [bbl-profile.html:651-652](bbl-profile.html#L651) — `routes[role] || 'auth.html'` → `getRoleLanding(role)`.
- [bol-profile.html:1286](bol-profile.html#L1286) — `routes[userRole] || 'auth.html'` → `getRoleLanding(userRole)`.
- [buddy-dashboard.html:960](buddy-dashboard.html#L960) — `redirect[profile?.role] || 'auth.html'` → `getRoleLanding(profile.role)`.
- [company-dashboard.html:2842](company-dashboard.html#L2842) — `routes[userRole] || 'auth.html'` → `getRoleLanding(userRole)`.
- [company-discover.html:715](company-discover.html#L715) — `routes[userRole] || 'auth.html'` → `getRoleLanding(userRole)`.
- [international-school-dashboard.html:591](international-school-dashboard.html#L591) — `'auth.html'` → `getRoleLanding(role)`.
- [school-dashboard.html:2475](school-dashboard.html#L2475) — `routes[userRole] || 'auth.html'` → `getRoleLanding(userRole)`.
- [student-profile.html:1589](student-profile.html#L1589) — `routes[userRole] || 'auth.html'` → `getRoleLanding(userRole)`.

Na deze 11 vervangingen verdwijnt de "lokale dict"-dialect uit de codebase en blijft één canon-bron over.
