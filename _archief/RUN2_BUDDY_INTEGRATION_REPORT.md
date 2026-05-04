# Run 2 — Buddy dashboard integratie
Datum: 1 mei 2026
Voorwaarden: Run 1 succesvol (withSaveLock + renderRoleHeader + js/profileView.js geverifieerd)

## Resultaat

| Stap | Status | Bestand(en) |
|---|---|---|
| 1 — Form-velden pitch/achtergrond/bio | APPLIED | [buddy-dashboard.html:441-489](buddy-dashboard.html#L441-L489) |
| 2 — collectBuddyProfileData uitbreiden | APPLIED | [js/buddy.js:729-748](js/buddy.js#L729-L748) |
| 3 — withSaveLock op submit | APPLIED | [buddy-dashboard.html:455](buddy-dashboard.html#L455) (form), [:675-689](buddy-dashboard.html#L675-L689) (handler) |
| 4 — Top-nav header + body data-role | APPLIED | [buddy-dashboard.html:284, 289](buddy-dashboard.html#L284), init op [:1213-1217](buddy-dashboard.html#L1213-L1217) |
| 5 — Section-switcher + CSS | APPLIED | [buddy-dashboard.html:310-1331](buddy-dashboard.html#L310) (5 section-tags), [:691-731](buddy-dashboard.html#L691-L731) (showSection JS), [css/style.css:1917-1924](css/style.css#L1917-L1924) (.dashboard-section) |
| 6 — Saved-view via profileView | APPLIED | [js/buddy.js:749-783](js/buddy.js#L749-L783) (showBuddyOverzicht herschreven), [buddy-dashboard.html:440](buddy-dashboard.html#L440) (#buddy-profile-saved-view), [:36](buddy-dashboard.html#L36) (`<script src="js/profileView.js">`) |
| 7 — Initial render flow + prefillBuddyForm | APPLIED | [buddy-dashboard.html:1244-1283](buddy-dashboard.html#L1244-L1283) (volledige fetch + render), [js/buddy.js:719-727](js/buddy.js#L719-L727) (prefillBuddyForm) |

### Pre-conditie
- `withSaveLock`, `renderRoleHeader`, `js/profileView.js` allemaal verified aanwezig vóór start.

### Per-stap detail

**STAP 1** — Drie nieuwe `.profile-field` elementen toegevoegd aan begin van form (na avatar-picker, vóór kennisgebieden checkboxen). Gebruikt bestaande `.profile-field` styling uit eigen `<style>` blok van buddy-dashboard.html (geen globale `form-input` nodig). Hint-tekst via `.avail-note` class die al bestaat.

**STAP 2** — `collectBuddyProfileData` leest nu `#bp-pitch`, `#bp-achtergrond`, `#bp-bio` met `.trim()` en geeft `null` terug als leeg. Velden komen vooraan in het returned object zodat ze in de saved-view bovenaan zichtbaar zijn.

**STAP 3** — Form `onsubmit` veranderd van direct `saveBuddyProfile(...)` naar `handleBuddyProfileSubmit(event)` wrapper. Wrapper zoekt submit-button in form, roept `withSaveLock(submitBtn, ...)` aan. Bij ontbrekende `withSaveLock`: graceful fallback naar directe save-call.

**STAP 4** — `<body data-role="gepensioneerd">` voor CSS-tinting (paarse active-state in `body[data-role="gepensioneerd"] .role-nav-item.active`). `<header id="role-header" class="role-header">` direct onder body. Init aangevuld met `await renderRoleHeader('gepensioneerd', getActiveSection(), { profile: { naam } })`.

**STAP 5** — Cards opnieuw gegroepeerd in 5 `<section>` blocks (3 sections, overzicht is verdeeld in 3 fragmenten omdat de Beschikbaarheid kalender oorspronkelijk buiten `.shell` stond):
- `section-overzicht` (regels 310-318): Pauze-banner
- `section-matches` (regels 320-435): Openstaande verzoeken, Actieve koppelingen, Buddy-seekers deck, Interesse in jou
- `section-profiel` (regels 437-594): saved-view container + legacy overzicht-card + form-card
- `section-overzicht` fragment (regels 596-653): Internly Worldwide, Privacy & instellingen, Account
- `section-overzicht` fragment (regels 1324-1331): Beschikbaarheid kalender (buiten .shell)

`showSection(id)` toggelt alle `.dashboard-section[data-section]` consistent. Hash-routing via `#section-matches` of `#section-profiel`. Click-handler vangt `<a data-tab="...">` voor interne sections; externe nav (berichten, notities) volgt normale navigatie.

**STAP 6** — `showBuddyOverzicht` volledig herschreven om `renderProfileView(profile, 'gepensioneerd', savedContainer, { matchesCount, onEdit })` aan te roepen. `onEdit` callback verbergt saved-view en toont form-card. Legacy `#buddy-profile-overzicht` blijft in DOM maar wordt door `showBuddyOverzicht` op `display:none` gezet (geen breaking change). `BUDDY_PAIRS_COUNT` wordt geset in `loadPairs()` na de spread/map. `saveBuddyProfile` doet nu re-fetch met volledige kolom-set vóór re-render zodat saved-view altijd actueel is, met fallback naar `payload` als fetch faalt.

**STAP 7** — Init flow:
1. Volledige fetch op `buddy_profiles` met alle 16 velden incl. nieuwe pitch/bio/achtergrond.
2. `prefillBuddyForm(bpRow)` vult de form voor (drie nieuwe velden via uitgebreide `populateBuddyProfile` + avatar_key sync).
3. `bpFilled` check op pitch/bio/achtergrond/kennis_gebieden/specialiteiten/grove_beschikbaarheid → toon saved-view automatisch.
4. Als profiel leeg: form-card direct zichtbaar voor onboarding.
5. `initSectionFromHash()` als laatste stap — toont juiste section gebaseerd op URL hash.

## Onverwachte vondsten

- **Beschikbaarheid kalender stond buiten `.shell` div** ([buddy-dashboard.html:1322-1331](buddy-dashboard.html#L1322-L1331), oorspronkelijk regel 1219). Om deze te laten meedraaien met section-switching, een derde `<section data-section="overzicht">` fragment toegevoegd buiten .shell. Werkt prima omdat showSection alle elements met `[data-section]` toggelt ongeacht parent.
- **Legacy `#buddy-profile-overzicht` kaart** ([:443-451](buddy-dashboard.html#L443-L451)) — onverwacht maar consequent gevonden: oude inline saved-view-renderer die door de nieuwe `showBuddyOverzicht` (via `oudOverzicht.style.display = 'none'`) wordt verborgen. Niet verwijderd voor backwards-compat (script verwijst er nog naar in `showBuddyForm`-fallback). Geen functioneel risico.
- **`profile.naam` is de enige naam-bron** — `buddy_profiles.naam` is per SQL-audit vaak null. `saveBuddyProfile` re-fetch en init-flow vallen beide terug op `profile.naam` (uit `profiles` tabel) als `bpRow.naam` ontbreekt. `renderProfileView` krijgt zo altijd een naam.

## Smoke-test resultaten

(CC kan niet zelf in browser testen — visueel verificeren door Barry in volgende sessie. Verwachte resultaten:)

| Test | Verwachting |
|---|---|
| Top-nav rendert 5 items | ✅ Overzicht / Mijn matches / Mijn berichten / Mijn notities (binnenkort) / Mijn profiel |
| Body krijgt `data-role="gepensioneerd"` | ✅ active-tab paarse onderlijn (`#7c3aed`) per CSS-override |
| Saved-view toont buddy data automatisch | ✅ als pitch/bio/achtergrond/kennis_gebieden/spec/beschikb gevuld |
| Edit-toggle werkt | ✅ "Profiel bewerken" knop verbergt saved-view en toont form |
| Save-button disable | ✅ via `withSaveLock` — knop disabled tijdens save, "Bezig..." tekst |
| Section-switching | ✅ klik nav-item → showSection toggelt alle `.dashboard-section` met juiste data-section |
| Browser console clean | ✅ geen referenties naar ontbrekende functies; alle `typeof X === 'function'` guards aanwezig |

### Code-niveau verificatie (geverifieerd via grep)

- `bp-pitch` / `bp-achtergrond` / `bp-bio` aanwezig in HTML én in collect/populate functies ✓
- `handleBuddyProfileSubmit` definieerd op regel 676, aangeroepen op regel 455 (form onsubmit) ✓
- `<body data-role="gepensioneerd">` bevestigd op regel 284 ✓
- `<header id="role-header">` op regel 289 ✓
- `renderRoleHeader('gepensioneerd', ...)` aangeroepen 2x in init (regel 1216) en showSection (regel 704) ✓
- 5 `<section>` tags met `data-section` attribuut, 5 `</section>` closures — netjes gebalanceerd ✓
- `<script src="js/profileView.js">` toegevoegd na avatar.js (regel 36) ✓
- `BUDDY_PAIRS_COUNT` geset in loadPairs (regel 791) ✓

## Klaar voor Run 3

**Ja** — alle 7 stappen APPLIED, geen blockers. Buddy-dashboard heeft nu:
- Top-nav header (5 items, "notities" als binnenkort-disabled)
- 3-section layout met hash-routing
- Read-only saved-view via shared `renderProfileView`
- Edit-flow met re-fetch + auto-toggle terug naar saved-view
- Anti double-submit via `withSaveLock`
- Drie nieuwe DB-velden volledig wired (collect → save → fetch → prefill → render)

**Te valideren in browser door Barry voor Run 3:**
1. Login als Jan van der Berg of test-buddy → land op `buddy-dashboard.html`
2. Top-nav 5 items zichtbaar?
3. Default section "Overzicht" toont pauze-banner / Worldwide / privacy / account / kalender?
4. Klik "Mijn matches" → verzoeken / koppelingen / deck / interesse zichtbaar?
5. Klik "Mijn profiel" → saved-view kaart met paars-tint, "Profiel bewerken" knop?
6. Klik "Profiel bewerken" → form met 3 nieuwe velden zichtbaar?
7. Vul iets in → save → button kort disabled → terug naar saved-view met nieuwe data?
8. Klik "Mijn berichten" in nav → navigeert naar mijn-berichten.html (verwacht 401-redirect naar buddy-dashboard wegens `requireRole('student')` — dit is een aparte fix uit BUDDY_PROFILE_AUDIT Sectie 6)
9. Klik "Mijn notities" → grijs/disabled, geen navigatie
10. Console: geen errors

Als 1-7+9 werken: Run 3 kan groen licht krijgen voor `mijn-berichten.html` rol-uitbreiding.
