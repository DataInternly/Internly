# Run 4 — Buddy Overzicht redesign
Datum: 1 mei 2026
Voorwaarden: Run 1 (`renderRoleHeader`/`renderProfileView`/`withSaveLock`) + Run 2 (section-overzicht/showSection) — beide gevalideerd vóór start.

## Resultaat

| Stap | Status | Bestand(en) |
|---|---|---|
| 1 — `getDaypartGreeting` helper | APPLIED | [js/utils.js:152-167](js/utils.js#L152-L167) |
| 2 — Greeting + identity HTML | APPLIED | [buddy-dashboard.html:312-323](buddy-dashboard.html#L312-L323) |
| 3 — `renderBuddyIdentityCard` | APPLIED | [buddy-dashboard.html:731-795](buddy-dashboard.html#L731-L795) |
| 4 — Init flow update | APPLIED | [buddy-dashboard.html:1399-1419](buddy-dashboard.html#L1399-L1419) |
| 5 — Setting-card wrapping (4 cards) | APPLIED | [buddy-dashboard.html:613-690](buddy-dashboard.html#L613-L690) |
| 6 — CSS toegevoegd (~155 regels) | APPLIED | [css/style.css:1917-2070](css/style.css#L1917-L2070) |
| 7 — Section-overzicht consolidatie | APPLIED | Beschikbaarheid van 3e fragment naar 2e fragment verplaatst |

### Per-stap detail

**STAP 1**: `getDaypartGreeting(naam)` toegevoegd na `getDisplayName` in utils.js. Drie tijdzones (06-12 / 12-18 / 18-23) + `Welkom terug` voor laat/nacht. Window export.

**STAP 2**: Greeting hero (`.overz-greeting`) + identity-card placeholder (`.overz-identity`) + section-divider (`.overz-section-label "Instellingen"`) toegevoegd direct na `<section id="section-overzicht">` opener. Oude `welcome-head` + `welcome-sub` zijn `hidden` gemaakt (legacy `init` op regel 1223 zet er nog `textContent` op — onschadelijk).

**STAP 3**: `renderBuddyIdentityCard(buddyProfile, profile)`:
- Avatar via `getAvatarSvg(key, naam, 'lg')` (110px met fallback initialen)
- Naam, meta (`Buddy · leeftijd · stad · beschikbaarheid`)
- Pitch (italic quote) en eerste 3 kennis_gebieden tags
- "Stickerkeuze wijzigen" link + ✏ avatar-edit knop → beide goToEdit() callbacks die naar profiel-tab navigeren en form-card tonen
- "Bekijk volledig profiel →" link → `showSection('profiel')`
- Window export

**STAP 4**: Init-flow uitbreidingen direct na `showBuddyOverzicht`-trigger. Bepaalt `_greetingNaam` (uit bpRow.naam → profile.naam → leeg), zet `overz-greeting-text` via `getDaypartGreeting`, zet `overz-greeting-sub` als NL long-date, roept `renderBuddyIdentityCard(bpRow, profile)` aan met fallback-naam-toewijzing.

**STAP 5**: Vier `.card` → `.setting-card` met `.setting-card-head` → `.setting-card-icon` + `.setting-card-text` → `.setting-card-title` + `.setting-card-desc`:
- Internly Worldwide (🌍) — bestaande intl toggle + langs-input ongewijzigd
- Privacy & instellingen (🔒) — bestaande anon + pause toggles ongewijzigd
- Account (⚙️) — `#account-container` ongewijzigd
- Beschikbaarheid (📅) — `setting-card-full` variant + `#ical-container` ongewijzigd

**STAP 6**: ~155 regels CSS:
- `.overz-greeting` + `.overz-greeting-text` (clamp font 1.5-1.9rem) + `.overz-greeting-sub`
- `.overz-identity-card` 2-kolom grid (auto + 1fr) met avatar-block links + summary-block rechts; mobile (≤720px) collapse naar 1-kolom centered
- `.overz-avatar-circle` 110px paars-gradient achtergrond met edit-knop floating
- `.overz-summary-name/meta/pitch/tags/link` typografie matched de profileView esthetiek
- `.overz-section-label` divider styling (Bricolage 1.1rem)
- `.setting-card` met hover-tint border + animation fade-up cascade (.05/.12/.15/.18/.21/.24s delays)
- Mobile breakpoint 720px voor identity-card collapse

**STAP 7**: De drie overzicht-fragmenten teruggebracht tot **twee**:
- Fragment 1 (regels 310-332): greeting + identity + label + pauze-banner
- Fragment 2 (regels 610-692): worldwide + privacy + account + beschikbaarheid (Beschikbaarheid verplaatst van buiten .shell naar binnen)
- Het oude derde fragment (Beschikbaarheid kalender buiten .shell, regels 1322-1331 in oude versie) is volledig verwijderd ([buddy-dashboard.html:1450](buddy-dashboard.html#L1450) heeft enkel comment marker)
- Volledige consolidatie tot ÉÉN fragment niet mogelijk omdat matches/profiel sections er tussen staan in DOM-orde — twee fragmenten met `data-section="overzicht"` is functioneel identiek (showSection toggelt op data-attribute, niet op aantal tags)

## Functionaliteits-behoud check

Code-niveau verificatie via grep — alle bestaande IDs/handlers ongewijzigd:

| Feature | ID/handler | Status |
|---|---|---|
| Pauze-banner | `#pauseBanner` + `togglePause()` | ✅ ongewijzigd, in fragment 1 |
| Internly Worldwide toggle | `#intlToggle` + `toggleIntl()` | ✅ in `.setting-card #card-worldwide` |
| Worldwide langs-input | `#buddy-lang-input` + `#buddy-lang-tags` | ✅ ongewijzigd |
| Anoniem toggle | `#anonToggle` + `toggleAnon()` | ✅ in `.setting-card #card-privacy` |
| Pauze toggle (binnen privacy) | `#pauseToggle` + `togglePause()` | ✅ ongewijzigd |
| Account-container render | `#account-container` + `AccountModule.renderAccountScreen` | ✅ in `.setting-card #card-account` |
| Beschikbaarheid kalender | `#ical-container` + `InternlyCalendar.render('ical-container', ...)` | ✅ verplaatst maar zelfde id, init-call op [:1443](buddy-dashboard.html#L1443) vindt het nog |
| Section-switching | `showSection()` + `.dashboard-section[data-section]` | ✅ 4 sections, 4 closures gebalanceerd |
| Saved-view via renderProfileView (RUN2) | `showBuddyOverzicht` → `renderProfileView` | ✅ ongewijzigd in js/buddy.js |
| Form submit met withSaveLock (RUN2) | `handleBuddyProfileSubmit` | ✅ ongewijzigd |
| Section-profiel inhoud | saved-view + form-card | ✅ ongewijzigd, in fragment tussen overzicht-1 en overzicht-2 |

## Onverwachte vondsten

1. **`welcome-head` + `welcome-sub` legacy**: oude divs die op [:306-307](buddy-dashboard.html#L306-L307) stonden zijn `hidden` gemaakt ipv verwijderd. Reden: bestaande init-code op regel 1223 (uit Run 2) zet er nog `textContent` op (`document.getElementById('welcomeMsg').textContent = ...`). Door `hidden` te zetten in plaats van te verwijderen, breekt geen oude code en heeft de nieuwe greeting voorrang. Code-cleanup later mogelijk.
2. **3-fragment-consolidatie niet 100% mogelijk**: matches en profiel sections zitten in DOM-orde tussen pauze-banner en de andere instellingen. Een echte 1-section-consolidatie zou moeten herschikken naar `[overzicht-volledig, matches, profiel]` ipv `[overzicht-1, matches, profiel, overzicht-2]`. Functioneel identiek (showSection toggelt op data-attr), dus ik liet het op 2 fragmenten staan. Beschikbaarheid moved van fragment 3 naar fragment 2 — dat is wat realistisch consolideerbaar was.
3. **`setting-card:nth-of-type` animation-delay** rekent vanaf het EERSTE setting-card binnen z'n parent (fragment 2 heeft 4 setting-cards, fragment 1 heeft 0). Werkt correct binnen fragment 2.
4. **`getAvatarSvg` size param `'lg'` gebruikt voor identity-avatar**: 72px volgens js/avatar.js. Maar `.overz-avatar-circle` is 110px — de SVG schaalt naar 100% van parent (`.overz-avatar-circle svg { width: 100%; height: 100% }`). De `'lg'` keuze maakt dus geen visueel verschil maar voorkomt dat een toekomstige size-strict variant breekt.
5. **Beschikbaarheid `setting-card-full` class** is in CSS niet apart gedefinieerd — dat is intentional, het is een hook voor toekomstige full-width-grid layouts. Voor nu rendert het identiek aan andere setting-cards.

## Klaar voor Run 5

**Ja** — alle 7 stappen APPLIED, geen blockers, alle bestaande functionaliteit code-niveau gepreserveerd via behouden IDs en handlers. Browser-test door Barry verstandig vóór Run 5 omdat de Overzicht-tab nu visueel grondig anders is.

**Te valideren door Barry**:
1. Login als buddy → Overzicht toont greeting + identity-card + 4 setting-cards
2. Greeting toont juiste daypart + naam + datum
3. Identity avatar = sticker (als `avatar_key` gezet) of paars-gradient initialen
4. ✏ knop op avatar → naar profiel-tab edit-mode
5. "Bekijk volledig profiel →" → naar profiel-tab saved-view
6. Pauze-knop in pauze-banner werkt
7. Worldwide intl-toggle + talen-input werkt
8. Anoniem + Pauze toggles werken
9. Account-card rendert via AccountModule
10. Beschikbaarheid kalender rendert in nieuwe locatie binnen .shell
11. Section-switch (Overzicht ↔ Mijn matches ↔ Mijn profiel) werkt nog
12. Mobile (≤720px): identity-card collapse naar 1-kolom centered
13. Console clean
