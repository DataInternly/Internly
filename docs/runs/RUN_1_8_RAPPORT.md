# RUN 1.8 — Hybrid headers publieke pagina's

**Datum** 5 mei 2026
**Trigger** Productie-smoke Test 1 — kennisbank toonde publieke header voor ingelogde BBL Daan
**Diagnose** Sessie was nooit verloren (db.auth.getUser returnt user); UI rendert publieke versie voor iedereen
**Status** GEÏMPLEMENTEERD — wacht op Barry's smoke

---

## Files gewijzigd: 11

| File | Hybrid script | Scripts toegevoegd |
|---|---|---|
| about.html | ✓ | (alle al aanwezig) |
| pricing.html | ✓ | (alle al aanwezig) |
| kennisbank.html | ✓ | (alle al aanwezig) |
| faq.html | ✓ | utils + supabase + cdn (Run 1 strip teruggedraaid) |
| hoe-het-werkt.html | ✓ | utils + supabase + cdn |
| spelregels.html | ✓ | supabase + cdn |
| privacybeleid.html | ✓ | utils + supabase + cdn |
| cookiebeleid.html | ✓ | supabase + cdn |
| algemene-voorwaarden.html | ✓ | supabase + cdn |
| esg-rapportage.html | ✓ | utils + supabase + cdn |
| internly-worldwide.html | ✓ | utils (cdn + supabase stonden al boven) |

---

## Bestaande renderRoleHeader helper gebruikt: ja

[js/utils.js:723](../../js/utils.js#L723) — `async function renderRoleHeader(role, activeTab, opts = {})`. Helper accepteert `opts.containerId` (default `'role-header'`) en overschrijft `container.innerHTML`. Hybrid-script zet `publicHeader.id = 'role-header'` zodat helper de bestaande publieke header-element vult met rol-aware content.

---

## Hybrid-script patroon

Op elke publieke pagina, vlak vóór `</body>`:

```js
(async () => {
  try {
    if (typeof db === 'undefined') return;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;
    const { data: profile } = await db
      .from('profiles').select('role, naam').eq('id', user.id).maybeSingle();
    if (!profile?.role) return;
    let role = profile.role;
    if (role === 'student') {
      const { data: sp } = await db
        .from('student_profiles').select('bbl_mode').eq('profile_id', user.id).maybeSingle();
      if (sp?.bbl_mode === true) role = 'student_bbl';
    }
    const publicHeader = document.querySelector('header, nav.topbar, .public-header');
    if (!publicHeader) return;
    if (typeof renderRoleHeader === 'function') {
      publicHeader.id = 'role-header';
      publicHeader.className = 'role-header';
      await renderRoleHeader(role, null, { profile: { naam: profile.naam || '' } });
    }
  } catch (err) {
    console.warn('[hybrid-header] fallback to public:', err?.message);
  }
})();
```

**Stille fallback** bij elke error → publieke header blijft staan. Geen breaking changes voor uitgelogde flows (waitlist, free-signup, kb-content rendering blijven werken).

---

## BBL-detectie

Voor `role === 'student'` doet het script een tweede query op `student_profiles.bbl_mode`. Indien `true` → `role = 'student_bbl'` zodat `HEADER_NAV_BY_ROLE.student_bbl` (5 BBL-tabs) wordt gebruikt. Identiek patroon als de fix in `mijn-berichten.html` van Run 1.5 v2 Issue 3.

---

## Verificatie

```
=== Run 1.8 hybrid script per pagina ===
all 11 pages: hybrid=1, utils=1, sup=1, cdn=1                 PASS

=== Script tag balance ===
opens == closes per file                                      PASS

=== Render-flow ===
1. Pagina laadt → publieke header zichtbaar (snelheid)
2. supabase.js + utils.js geladen → window.db + renderRoleHeader klaar
3. Hybrid script draait → getUser() → bij user: renderRoleHeader vult publicHeader
4. Bij geen user: stille return → publieke header blijft
```

---

## Smoke-test voor Barry (op localhost)

### Test 1 — Ingelogd op kennisbank
1. Login als BBL Daan
2. Klik kennisbank
3. **Verwacht:** groene header met BBL tabs (BBL Traject, Matchpool, Berichten, Kennisbank actief, Buddy)

### Test 2 — Uitgelogd op kennisbank
1. Logout (of incognito)
2. Open kennisbank.html direct
3. **Verwacht:** publieke header (Hoe het werkt, Prijzen, FAQ, Inloggen)

### Test 3 — Bedrijf op about
1. Login als bedrijf
2. Open about.html
3. **Verwacht:** bedrijf-header (Type C — sidebar of zwarte top-bar) met bedrijf-tabs

### Test 4 — Console schoon
1. Op kennisbank ingelogd
2. DevTools Console
3. **Verwacht:** geen errors. Mogelijk een `[hybrid-header]` warn als fallback triggert (acceptabel) maar geen breaking errors.

### Test 5 — BOL student variant
1. Login als BOL student
2. Klik faq
3. **Verwacht:** 7 BOL tabs (Home, Matchpool, Vacatures, Sollicitaties, Berichten, Kennisbank, Buddy actief)

### Test 6 — Buddy variant
1. Login als buddy Jan
2. Klik privacybeleid
3. **Verwacht:** Type E paars (Overzicht, Mijn matches, Mijn berichten, Mijn notities, Mijn profiel)

---

## Bekende beperkingen / open punten

1. **CSS voor `role-header` klasse op publieke pagina's.** renderRoleHeader injecteert standaard markup met className `role-header-inner`. Visuele consistentie hangt af van bestaande CSS in `css/style.css`. Mogelijk fine-tuning nodig na visuele inspectie.

2. **`internly-worldwide.html`** — heeft eigen header-styling. Verifieer dat `<header>` selector werkt; zo niet, fallback naar publieke header (acceptabel).

3. **`.public-header` selector** — het hybrid-script zoekt naar `header, nav.topbar, .public-header`. Per spec INTERNLY_HEADER_SPEC.md zou Type A pagina's `<header class="public-header">` moeten zijn. Niet alle pagina's volgen die spec — Run 4 gaat dit harmoniseren.

4. **Run 1.5 v2 Issue 1 (autoRefreshToken=false) BEHOUDEN.** Niet teruggedraaid. Was niet de oorzaak van deze UI-bug, maar voorkomt nog steeds onnodige refresh-pogingen op publieke pagina's.

---

## Niet aangeraakt

- `js/supabase.js` — geen logica-wijziging
- `js/utils.js` — renderRoleHeader helper hergebruikt, geen wijziging
- `js/telemetry.js` — no-go zone
- 14 ingelogde-pagina's — al rol-aware via renderStudentHeader/renderRoleHeader

---

**Run 1.8 status: GEÏMPLEMENTEERD — wacht op Barry's smoke-test op localhost en daarna FTP.**

---

## RUN 1.8-bis — Minibar voor sidebar-rollen (5 mei 2026)

**Trigger:** Reid2 ontdekte dat `HEADER_NAV_BY_ROLE` (js/utils.js:678) alleen `student`, `student_bbl`, `gepensioneerd` kent. Voor `bedrijf`/`school`/`begeleider`/`admin` crashte `renderRoleHeader` met `unknown role` warn → fallback naar publieke header → ingelogde user zag "uitgelogd" UI.

**Picard2-beslissing:** Optie B (mini-bar pattern) — sidebar-architectuur op eigen dashboards (Type C/D per spec) blijft intact, op publieke pagina's krijgen sidebar-rollen een minimale strip met logo + naam + rol-pill + Dashboard-link + Logout-knop.

### Implementatie

Hybrid-script in alle 11 publieke pagina's vervangen met versie die rol-splitst:

```js
const ROLES_WITH_TOPBAR  = ['student', 'student_bbl', 'gepensioneerd'];
const ROLES_WITH_MINIBAR = ['bedrijf', 'school', 'begeleider', 'admin'];

if (ROLES_WITH_TOPBAR.includes(role)) {
  // bestaande renderRoleHeader pad
} else if (ROLES_WITH_MINIBAR.includes(role)) {
  // mini-bar HTML met logo + naam + rol-pill + Dashboard-link + Logout
}
```

**Mini-bar HTML** (inline-styled, donker thema #0d1520, logo links + actie-cluster rechts):
- Logo intern·ly (klikbaar, linkt naar role-dashboard)
- Tekst "Ingelogd als [naam]"
- Rol-pill (Bedrijf / School / Begeleider / Admin)
- "→ Dashboard" knop (linkt naar role-dashboard)
- "Uitloggen" button (gebruikt `window.clearUserState()` indien aanwezig)

### Afwijking van plan-spec

Plan-spec topbar-pad gebruikte `{ container: publicHeader }` — werkt niet, `renderRoleHeader` leest `opts.containerId` (string-id), geen DOM-element. Ik gebruik werkende `publicHeader.id = 'role-header'` + default-container-pad zoals in eerste Run 1.8 versie. Geen wijziging aan plan-spec minibar-pad.

### Verificatie

```
=== ROLES_WITH_TOPBAR + ROLES_WITH_MINIBAR per pagina ===
all 11 pages: minibar=3 (constant + 2 referenties), topbar=2 (constant + 1 ref)   PASS

=== Script-tag balance ===
opens == closes per file                                                          PASS
```

### Files gewijzigd: 11 (identiek aan Run 1.8)

about, pricing, faq, kennisbank, hoe-het-werkt, spelregels, privacybeleid, cookiebeleid, algemene-voorwaarden, esg-rapportage, internly-worldwide.

### Smoke-test toevoeging voor Barry

#### Test 7 — Bedrijf op publieke pagina (Run 1.8-bis specifiek)
1. Login als bedrijf (bedrijf@internly.pro)
2. Klik in nav → about.html
3. **Verwacht:** mini-bar bovenaan met "intern·ly" logo + "Ingelogd als [naam]" + "BEDRIJF" pill + "→ Dashboard" + "Uitloggen"
4. NIET de publieke header met "Inloggen" knop

#### Test 8 — School op faq
1. Login als school
2. Klik faq
3. **Verwacht:** zelfde mini-bar maar pill = "SCHOOL", Dashboard-link = school-dashboard.html

#### Test 9 — Logout-knop in mini-bar
1. Klik "Uitloggen" in mini-bar
2. **Verwacht:** clearUserState() wordt aangeroepen + signOut + redirect naar index.html
3. localStorage check: internly_*-keys gewist (PROTECTED_KEYS blijven)

### Backlog-toevoegingen (Hotch2-flag, NIET nu fixen)

Buddy-dashboard 400-errors uit productie-smoke:
- waitlist GET 400 (selectkolommen mismatch?)
- student_profiles.zoekt_buddy 400
- profiles.open_to_international kolom bestaat niet
- student_profiles.niveau kolom bestaat niet

→ Schema-audit nodig op buddy-dashboard.html en js/buddy.js — Run 2 of separate.

**Run 1.8-bis status: GEÏMPLEMENTEERD — wacht op smoke-test 7-9.**
