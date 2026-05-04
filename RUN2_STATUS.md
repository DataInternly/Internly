# RUN2 STATUS — Read-only audit
**Datum** 2026-05-04 · **Modus** READ-ONLY · **Geen patches**

Status-check op de RUN2 buddy-profile feature: HTML-zijde, JS-zijde, en SQL-zijde. Doel: classificeren of RUN2 deploybaar is of half-werk.

---

## Sectie 1 — buddy-dashboard.html DOM-check

**Grep:** `buddy-profile-saved-view | buddy-profile-form-card | profile-section-buddyprofiel | profile-top-nav`

| Element | Aanwezig? | Locatie |
|---|---|---|
| `buddy-profile-saved-view` container | ✓ JA | [buddy-dashboard.html:474](buddy-dashboard.html#L474) `<div id="buddy-profile-saved-view" class="dashboard-card-wrap">` |
| `buddy-profile-form-card` container | ✓ JA | [buddy-dashboard.html:487](buddy-dashboard.html#L487) `<div class="card" id="buddy-profile-form-card" hidden>` |
| `profile-section-buddyprofiel` | ✗ NEE | geen hits |
| `profile-top-nav` / section-switcher | ✗ NEE | geen hits |

**Conclusie sectie 1:** de twee belangrijkste containers (`buddy-profile-saved-view` + `buddy-profile-form-card`) zijn aanwezig. JS in `showBuddyOverzicht` ([js/buddy.js:749-781](js/buddy.js#L749-L781)) refereert beide en zal ze vinden. De andere twee verwachte elementen (`profile-section-buddyprofiel`, `profile-top-nav`) ontbreken — of zijn niet vereist, of de naming-conventie is anders. Niet blocker omdat buddy.js ze niet aanroept.

**HTML-zijde Run 2: doorgevoerd voor de essentiële containers.**

---

## Sectie 2 — js/buddy.js dependency check

**Grep js/buddy.js voor function-calls:**

| Functie | Aangeroepen? | Locatie |
|---|---|---|
| `renderProfileView` | ✓ JA, 4 hits | [js/buddy.js:749, 761, 762, 781](js/buddy.js#L749) |
| `getAvatarSvg` | ✗ NEE | 0 hits — buddy.js gebruikt het niet direct (mogelijk via `window._internlyAvatarKey`) |
| `withSaveLock` | ✗ NEE | 0 hits — niet aanwezig in deze file |

**Grep buddy-dashboard.html voor script-tags:**

| Script | Geladen? | Locatie |
|---|---|---|
| `js/avatar.js` | ✓ JA | [buddy-dashboard.html:27](buddy-dashboard.html#L27) |
| `js/profileView.js` | ✓ JA | [buddy-dashboard.html:28](buddy-dashboard.html#L28) |
| `js/welcome-overlay.js` | ✓ JA | [buddy-dashboard.html:29](buddy-dashboard.html#L29) |

**Welcome-overlay invocation:** [buddy-dashboard.html:1357-1359](buddy-dashboard.html#L1357-L1359) roept `maybeShowWelcomeOverlay(user.id, 'gepensioneerd', profile.naam, null)` aan met defensive `typeof === 'function'` check.

**Conclusie sectie 2:** alle drie de RUN2-modules zijn in HTML included. buddy.js roept `renderProfileView` aan met fallback (console.warn als module ontbreekt). HTML wired op JS — geen ontbrekende script-tags.

**JS-zijde Run 2: gewired en consistent.**

---

## Sectie 3 — DB-kolommen check

**Grep `pitch | achtergrond | bio | avatar_key | zoekt_buddy` in SQL-files:**

| Kolom | Tabel | SQL-bestand | Regel |
|---|---|---|---|
| `avatar_key` | student_profiles | AVATAR_MIGRATION.sql | 7 |
| `avatar_url` | student_profiles | AVATAR_MIGRATION.sql | 7-8 |
| `avatar_key` | company_profiles | AVATAR_MIGRATION.sql | 11 |
| `avatar_key` | school_profiles | AVATAR_MIGRATION.sql | 15 |
| `avatar_key` | buddy_queue | AVATAR_MIGRATION.sql | 19 |
| `avatar_key` | bbl_student_profiles | AVATAR_MIGRATION.sql | 27 |
| `zoekt_buddy` | student_profiles | BACKLOG_MIGRATION.sql | 6 |
| `avatar_key` | profiles | BACKLOG_MIGRATION.sql | 11 |

**Kritieke ontbrekers:** geen ALTER op `buddy_profiles` table in beide SQL-bestanden. Maar js/buddy.js `saveBuddyProfile` schrijft naar `buddy_profiles` met velden `pitch`, `achtergrond`, `bio`, `avatar_key`:

```js
// js/buddy.js saveBuddyProfile / collectBuddyProfileData
db.from('buddy_profiles').upsert({
  profile_id: user.id,
  pitch:         pitch       || null,
  achtergrond:   achtergrond || null,
  bio:           bio         || null,
  avatar_key:    window._internlyAvatarKey || null,
  ...
});
```

En de re-fetch select-clause na save:
```js
.from('buddy_profiles')
.select('profile_id, naam, pitch, bio, achtergrond, ..., avatar_key')
```

**Vier kolommen op buddy_profiles zonder gevonden ALTER-statement:** `pitch`, `achtergrond`, `bio`, `avatar_key`. Twee mogelijkheden:

1. Deze kolommen bestaan al in productie-DB vanuit een eerdere (niet in working tree zichtbare) migratie
2. Deze kolommen bestaan niet — writes en re-fetch zullen falen met "column does not exist" error

**Niet zelf in DB te checken zonder Supabase Console.**

**Vraag aan Barry — beslis-vraag:**

> 1. Zijn `AVATAR_MIGRATION.sql` en `BACKLOG_MIGRATION.sql` al uitgevoerd in Supabase?
>    - Ja / Nee / Weet ik niet
> 2. Bestaat de tabel `buddy_profiles` met kolommen `pitch`, `achtergrond`, `bio`, en `avatar_key`?
>    - Ja / Nee / Weet ik niet
>
> Als antwoord op (1) of (2) "Nee" of "Weet ik niet" is: RUN2 saveBuddyProfile flow zal in productie 400-errors gooien.

---

## Sectie 4 — Conclusie

**Classificatie: tussen A en C, leunt richting C.**

| Component | Status |
|---|---|
| HTML containers | ✓ aanwezig (saved-view + form-card) |
| HTML script-tags | ✓ alle 3 modules geladen (avatar/profileView/welcome-overlay) |
| HTML invocation | ✓ welcome-overlay defensief aangeroepen, buddy.js fallback ingebouwd |
| JS module-calls | ✓ renderProfileView correct gewired met fallback |
| SQL — avatar_key/avatar_url/zoekt_buddy | ✓ in migraties aanwezig (5 tabellen) |
| SQL — pitch/achtergrond/bio op buddy_profiles | ❓ **niet in beide SQL-files te vinden** |
| SQL uitgevoerd? | ❓ Barry-vraag |

**Verdict:** geen schone A, geen volle C — een **A-prime met een SQL-vraagteken**.

- Als Barry bevestigt dat `buddy_profiles` al pitch/achtergrond/bio/avatar_key kolommen heeft (van eerdere migratie), én dat `AVATAR_MIGRATION.sql` + `BACKLOG_MIGRATION.sql` zijn uitgevoerd: **A. KLAAR VOOR DEPLOY**.
- Als één van beide "nee/weet ik niet" is: **C. HALF-WERK BACKEND** — buddy-profile-save zal 400-errors gooien op de ontbrekende kolommen, gebruiker ziet `notify('Profiel opslaan mislukt — probeer opnieuw', false)` zonder root cause.

**Niet B (HALF-WERK FRONTEND):** de HTML is correct gewired, geen DOM-refs in buddy.js die zullen falen op missing elements. `showBuddyOverzicht` valt netjes terug op form-only weergave als `renderProfileView` ontbreekt, en de saved-view containers bestaan.

---

## Aanbeveling voor jou

**Eén stap voordat RUN2 naar FTP kan:**

1. Open Supabase SQL Editor
2. Run query: `SELECT column_name FROM information_schema.columns WHERE table_name = 'buddy_profiles';`
3. Vergelijk met verwachte set: `profile_id, naam, pitch, achtergrond, bio, kennis_gebieden, specialiteiten, grove_beschikbaarheid, postcode, stad, leeftijd, talen, foto_url, active, open_to_international, avatar_key`
4. Als kolommen ontbreken: schrijf een aanvullende `BUDDY_PROFILE_RUN2_MIGRATION.sql` met de ontbrekende ALTER's, of voeg ze toe aan `BACKLOG_MIGRATION.sql`
5. Run `AVATAR_MIGRATION.sql` + `BACKLOG_MIGRATION.sql` (+ eventueel buddy_profiles aanvulling) als nog niet gedraaid
6. Pas dan: deploy de JS coupled set (`js/buddy.js`, `js/avatar.js`, `js/profileView.js`, `js/welcome-overlay.js`) plus `buddy-dashboard.html`

**5 minuten Supabase-werk + commit aanvullings-SQL als nodig + coupled FTP-upload — dan is RUN2 livetest-klaar.**

Tot bevestiging: niet uploaden van de RUN2-set.
