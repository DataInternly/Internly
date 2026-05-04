# VANMIDDAG BUILD LOG — 30 april 2026

Sessie: afternoon fixes (5 items).
Geen wijzigingen in BACKUP/ of _revamp_2026-04-29/.

---

## ITEM 1 — BUDDY CHAT
**Result: PASS — geen wijzigingen nodig**

Verificatie van de end-to-end flow:
1. [buddy-dashboard.html:593](buddy-dashboard.html#L593) — `openChat(pairId)` navigeert correct naar `chat.html?buddy_pair_id=...`
2. [chat.html:1441](chat.html#L1441) — `buddyPairId = params.get('buddy_pair_id')` parst de param
3. [chat.html:1462-1463](chat.html#L1462-L1463) — als param aanwezig: `loadBuddyConversation(buddyPairId)`
4. [chat.html:1319-1401](chat.html#L1319-L1401) — `loadBuddyConversation()`:
   - SELECT bestaande conversation by `buddy_pair_id` (regel 1361-1365)
   - INSERT met `buddy_pair_id: pairId` als nog niet aanwezig (regel 1373) ✓
   - Heeft fallback (regel 1376-1387) als kolom ontbreekt — robuust

"Stuur bericht" knop op [buddy-dashboard.html:585](buddy-dashboard.html#L585) verschijnt voor BEIDE partijen (`!isAnon` check; gepensioneerd is `anonymous: false` per js/buddy.js:36).

---

## ITEM 2 — CHECKBOX ALIGNMENT

CSS toegevoegd in [buddy-dashboard.html](buddy-dashboard.html):

**Regel 156-166 (NIEUW)** — checkbox-reset rule direct na bestaande `.profile-field input` rule:

```css
.profile-field input[type="checkbox"] {
  width: 16px;
  height: 16px;
  min-width: 16px;
  padding: 0;
  margin: 0;
  flex-shrink: 0;
  accent-color: #1a7a48;
  cursor: pointer;
  border-radius: 3px;
}
```

**Before:** Geen checkbox-reset; checkboxes erfden 100% width + 9px padding van algemene `.profile-field input` regel.
**After:** Vaste 16×16, brand-groene `accent-color`, geen padding, niet-shrinkbaar in flex layout.

Geen extra label-CSS toegevoegd — bestaande inline `display:flex;align-items:center` op de wrapping label is voldoende.

---

## ITEM 3 — PROFIEL OVERZICHTSWEERGAVE

| Bestand | Functies toegevoegd | Regelbereik | Status |
|---|---|---|---|
| begeleider-dashboard.html | `showBegeleiderOverzicht()`, `showBegeleiderForm()` | 887-941 (functies); 942 (saveProfiel toegevoegd `showBegeleiderOverzicht({naam, sector})`); 1213-1215 (init call) | DONE |
| international-student-dashboard.html | `showInternationalOverzicht()`, `showInternationalForm()` | 1212-1268 (functies); 1280-1287 (saveProfile call); 1213-1215 (init in loadProfile) | DONE |

**5 andere bestanden hadden al een overview** (toonOverzicht / showOverview / toonBedrijfOverzicht / toonSchoolOverzicht — niet aangepast).

---

## ITEM 4 — CALENDAR HELPTEXT

**Insertion: [js/calendar.js:165-172](js/calendar.js#L165-L172)** — direct na `</div>` van `.ical-head` (regel 164), vóór `.ical-grid` (regel 173).

**Toegevoegd HTML in renderGrid string template (regel 165-172):**
```html
<p class="ical-instruction">
  💡 Klik op een tijdslot om te wisselen:
  <strong>leeg</strong> →
  <strong style="color:#1a7a48">beschikbaar</strong> →
  <strong style="color:#a06010">voorkeur</strong> →
  <strong style="color:#b82020">bezet</strong>.
  Sla op als je klaar bent.
</p>
```

**CSS-method: STYLE BLOCK** — toegevoegd aan bestaande `injectCSS()` template string in [js/calendar.js:71-72](js/calendar.js#L71-L72):
```css
.ical-instruction{font-size:.75rem;color:#7a8799;margin:.35rem 0 .6rem;line-height:1.5;padding:0 2px;}
.ical-instruction strong{font-style:normal;font-weight:500;color:#3a4455;}
```

Bestaande `.ical-hint` op regel 70 (footer) ongewijzigd.

---

## ITEM 5 — AVATAR SELECTOR

### js/avatar.js
**WRITTEN — 109 regels** (`c:\Projects\Internly\js\avatar.js`)
- `INTERNLY_AVATARS` — array van 14 avatar-definities (brand-palette: groen/oranje/beige/inkt)
- `getAvatarSvg(key, fallbackName, size)` — SVG-output voor display
- `renderAvatarPicker(containerId, currentKey, onChange)` — picker UI
- `window._internlyAvatarKey` — runtime state

### AVATAR_MIGRATION.sql
**WRITTEN — 30 regels** (`c:\Projects\Internly\AVATAR_MIGRATION.sql`)
- Voegt `avatar_key` + `avatar_url` toe aan: student_profiles, company_profiles, school_profiles, buddy_queue
- Conditionele `bbl_student_profiles` (als tabel bestaat)

### Script tags toegevoegd

| Bestand | Toegevoegd op regel | Na | Status |
|---|---|---|---|
| student-profile.html | 19 | supabase.js (18) | DONE |
| bol-profile.html | 19 | supabase.js (18) | DONE |
| bbl-profile.html | 25 | supabase.js (24) | DONE |
| company-dashboard.html | 19 | supabase.js (18) | DONE |
| school-dashboard.html | 19 | supabase.js (18) | DONE |
| begeleider-dashboard.html | 19 | supabase.js (18) | DONE |
| buddy-dashboard.html | 27 | supabase.js (26) | DONE |
| international-student-dashboard.html | 43 | supabase.js (42) | DONE (toegevoegd buiten 5C-lijst — picker init bestaat in 5D) |

⚠️ **Inconsistentie tussen 5C en 5D**: international-student-dashboard.html stond niet in de 5C-lijst maar wel in 5D. Toegevoegd op regel 43 zodat picker-init op regel ~1208 functioneert. Build log bijgewerkt.

### Picker init + container toegevoegd

| Bestand | Container ingevoegd | Init in load function | avatar_key in payload |
|---|---|---|---|
| student-profile.html | regel 768 (vóór "Naam" field) | regel ~1620 (na load existing) | regel 1514 (DONE) |
| bol-profile.html | regel 490 (vóór "Naam" field) | regel ~1322 (na load existing) | regel 1210 (DONE) |
| bbl-profile.html | regel 314 (vóór "Naam" field) | regel ~676 (na role check) | regel 588 (DONE) |
| company-dashboard.html | regel 1035 (in form-card, vóór field-row) | regel ~2933 (na load cp) | regel 2435 (DONE) |
| school-dashboard.html | regel 932 (in form-card, vóór field-row) | regel ~2547 (na load sp) | regel 2073 (DONE) |
| begeleider-dashboard.html | regel 615 (vóór "Naam" field) | regel ~1222 (na profile load) | **PENDING MIGRATION** (profiles tabel heeft avatar_key niet — niet toegevoegd aan UPDATE) |
| international-student-dashboard.html | regel 851 (in form-card, vóór "Full name") | regel ~1208 (na renderTimeline) | regel 1238 (DONE) |
| buddy-dashboard.html | regel 333 (in form, vóór Kennisgebieden) | regel ~1003 (na waitlist load) | **PENDING MIGRATION** (buddy schrijft naar buddy_queue/waitlist; save niet aangepast) |

### Display update — school-dashboard.html
**DONE** met fallback — [school-dashboard.html:1499-1504](school-dashboard.html#L1499-L1504):
```js
<div class="avatar-wrap" style="flex-shrink:0">
  ${typeof getAvatarSvg === 'function' && s.avatar_key
    ? `<div style="...">${getAvatarSvg(s.avatar_key, s.naam || '', 'sm')}</div>`
    : `<div class="avatar">${escapeHtml(initials(s.naam || ''))}</div>`
  }
</div>
```

**SELECT query**: NIET uitgebreid met `avatar_key`. TODO-comment toegevoegd op regel 1303 (`// TODO 30 apr 2026 — voeg avatar_key toe aan SELECT na AVATAR_MIGRATION.sql`). Tot dan: `s.avatar_key` is undefined → fallback naar initials. Geen DB-error, gracefully degrades.

---

## SQL ACTIES VOOR BARRY (volgorde verplicht)

1. **Voer AVATAR_MIGRATION.sql uit in Supabase SQL Editor**
   ```sql
   -- Verificatie:
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'student_profiles'
   AND column_name IN ('avatar_key', 'avatar_url');
   -- Verwacht: 2 rijen
   ```

2. **Na migratie: avatar_key save werkt automatisch**
   `window._internlyAvatarKey` → upsert payload op:
   - student-profile.html, bol-profile.html, bbl-profile.html
   - company-dashboard.html, school-dashboard.html
   - international-student-dashboard.html

3. **Na migratie: SELECT queries uitbreiden met `avatar_key`**
   Aanbevolen volgorde:
   - school-dashboard.html regel 1306 + 1311 (loadStudenten queries — TODO comment aanwezig)
   - match-dashboard.html regel 2870 (student SELECT in loadMatch)
   - chat.html regel 983 + 1246 (profile SELECTs)
   - mijn-berichten.html regel 553, 620, 702 (profile SELECTs voor avatars)

4. **Optioneel: avatar_key toevoegen aan profiles-tabel** voor begeleider-dashboard
   Als begeleider-dashboard ook avatar_key moet opslaan, voeg toe:
   ```sql
   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_key text;
   ```
   Dan kan in [begeleider-dashboard.html:945-949](begeleider-dashboard.html#L945-L949) `avatar_key` toegevoegd worden aan de update payload.

5. ~~Optioneel: avatar.js laden in international-student-dashboard.html~~ — toegevoegd op regel 43.

---

## GEWIJZIGDE BESTANDEN

1. `c:\Projects\Internly\buddy-dashboard.html` — checkbox CSS, avatar script + picker
2. `c:\Projects\Internly\begeleider-dashboard.html` — overview functions + avatar script + picker (geen DB save)
3. `c:\Projects\Internly\international-student-dashboard.html` — overview functions + avatar script + picker init + payload
4. `c:\Projects\Internly\js\calendar.js` — instruction text + CSS
5. `c:\Projects\Internly\js\avatar.js` — NIEUW (109 regels)
6. `c:\Projects\Internly\AVATAR_MIGRATION.sql` — NIEUW (30 regels)
7. `c:\Projects\Internly\student-profile.html` — avatar script + container + picker init + payload
8. `c:\Projects\Internly\bol-profile.html` — avatar script + container + picker init + payload
9. `c:\Projects\Internly\bbl-profile.html` — avatar script + container + picker init + payload
10. `c:\Projects\Internly\company-dashboard.html` — avatar script + container + picker init + payload
11. `c:\Projects\Internly\school-dashboard.html` — avatar script + container + picker init + payload + display update + TODO

**Niet gewijzigd**: BACKUP/, _revamp_2026-04-29/.

---

## VOLGENDE STAPPEN

- [ ] Run AVATAR_MIGRATION.sql in Supabase
- [ ] Breid SELECT-queries uit met `avatar_key` (school/match/chat/mijn-berichten)
- [ ] Beslissing: ook avatar voor begeleider/buddy? → migratie van `profiles`/`buddy_queue` uitbreiden
- [ ] UI-test: selecteer avatar, save, refresh → blijft geselecteerd?
