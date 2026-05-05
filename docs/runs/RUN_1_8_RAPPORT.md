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
