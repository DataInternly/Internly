# VANMIDDAG RESEARCH — 30 april 2026

Read-only onderzoeksrapport. Geen bestanden gewijzigd.

---

## ITEM 1 — BUDDY CHAT

### 1A — conversations.buddy_pair_id
**EXISTS** — internly_migration.sql regel 177-182:
```sql
CREATE TABLE IF NOT EXISTS conversations (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id      uuid REFERENCES matches(id),
  buddy_pair_id uuid REFERENCES buddy_pairs(id),  -- chat.html line 800
  created_at    timestamptz DEFAULT now()
);
```

Kolommen: `id` (uuid), `match_id` (uuid → matches), `buddy_pair_id` (uuid → buddy_pairs), `created_at` (timestamptz).

### 1B — Buddy chat open mechanism (buddy-dashboard.html)

| Regel | Code |
|---|---|
| 503 | `.from('buddy_pairs')` (data load) |
| 506-507 | `req:profiles!buddy_pairs_requester_id_fkey(id, naam), rec:profiles!buddy_pairs_receiver_id_fkey(id, naam)` |
| 585 | `<button class="btn-sm btn-primary" onclick="openChat('${pairId}')">Stuur bericht</button>` |
| 592-594 | `function openChat(pairId) { window.location.href = \`chat.html?buddy_pair_id=${encodeURIComponent(pairId)}\`; }` |
| 610 | `.from('buddy_pairs')` |
| 681 | `.from('buddy_pairs')` |
| 906 | realtime: `event: 'UPDATE', schema: 'public', table: 'buddy_pairs'` |
| 910 | realtime: `event: 'UPDATE', schema: 'public', table: 'buddy_pairs'` |

**Mechanism:** URL navigation — `window.location.href = chat.html?buddy_pair_id=<pairId>` (regel 593).

### 1C — chat.html URL params (regels 970-1060 + omliggend)

| URL-param | Geparsed op regel | Gebruik |
|---|---|---|
| `match` | 1440 — `matchId = params.get('match');` | regel 1444-1465 — match-conversatie laden |
| `buddy_pair_id` | 1441 — `const buddyPairId = params.get('buddy_pair_id');` | regel 1462-1463 — `loadBuddyConversation(buddyPairId)` |

Volgorde-logica (regel 1462-1473):
1. Als `buddy_pair_id` aanwezig → `loadBuddyConversation(buddyPairId)`
2. Anders als `match` aanwezig → `loadConversation(matchId)`
3. Anders → lijst-view (`loadAllConversations(user.id)`)

### 1D — Supabase channels in js/buddy.js

| Regel | Channel-naam | Triggers |
|---|---|---|
| 94 | `'buddy-' + uid` | INSERT `buddy_requests` (filter receiver_id=eq.uid), UPDATE `buddy_requests` (filter requester_id=eq.uid) |

Slechts één channel-call op regel 94. Geen channel voor `messages` of `conversations` in buddy.js — dat zit in chat.html zelf.

### 1E — Buddy role guard (buddy-dashboard.html regel 935-975)

```js
// regel 950-965
const { data: profile } = await db
  .from('profiles')
  .select('role, naam')
  .eq('id', user.id)
  .maybeSingle();

if (!profile || profile.role !== 'gepensioneerd') {
  window.location.replace(
    typeof getRoleLanding === 'function'
      ? getRoleLanding(profile?.role || 'gepensioneerd')
      : 'auth.html'
  );
  return;
}
```

**Status: GEBRUIKT `getRoleLanding()`** — al gemigreerd naar canonieke routing met defensive `typeof === 'function'` check.

---

## ITEM 2 — EXPERTISE CHECKBOXES

### 2A — Locatie
**STATIC HTML** — buddy-dashboard.html regels 321-385.
- Kennisgebieden: regels 321-355 (10 checkboxes, attribute `data-kg`)
- Specialiteiten: regels 357-385 (8 checkboxes, attribute `data-sp`)

### Exact HTML van één checkbox+label-paar (regel 324-326)
```html
<label style="display:flex;align-items:center;gap:6px;font-size:.86rem;font-weight:400;">
  <input type="checkbox" data-kg value="IT &amp; Software"> IT &amp; Software
</label>
```

Container-div (regel 321-323):
```html
<div class="profile-field">
  <label>Kennisgebieden</label>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;">
    ... 10× <label> ...
  </div>
</div>
```

**Geen CSS-class op het inner-label** — alle styling inline. Container heeft class `.profile-field`.

### 2B — Bestaande CSS in `<style>` blok (buddy-dashboard.html regel 145-160)
```css
.profile-field { margin-bottom: 12px; }
.profile-field label { display: block; font-size: .8rem; font-weight: 600; color: #374151; margin-bottom: 5px; }
.profile-field input,
.profile-field select,
.profile-field textarea {
  width: 100%; padding: 9px 12px;
  border: 1.5px solid #e2e8f0; border-radius: 8px;
  font-family: 'Outfit', sans-serif; font-size: .88rem; color: #0d1520;
  background: #fff; outline: none; transition: border-color .15s; box-sizing: border-box;
}
.profile-field input:focus,
.profile-field select:focus,
.profile-field textarea:focus { border-color: var(--c-buddy-purple); }
.profile-field textarea { resize: vertical; min-height: 72px; }
```

⚠️ **Mogelijk visueel probleem**: regel 149-156 (`.profile-field input { width: 100%; padding: 9px 12px; ... }`) wordt ook toegepast op `<input type="checkbox">` — dat maakt checkboxes 100% breed met padding. Inline `display:flex` op de wrapping label compenseert mogelijk, maar checkbox-styling is niet expliciet ge-reset.

**Geen specifieke CSS voor checkbox-labels of de kennisgebieden-/specialiteiten-secties.**

---

## ITEM 3 — PROFILE SAVE FUNCTIONS

| Bestand | Save-functie | Profile-var | Form container | Post-save behavior | First input ID | DB-tabel |
|---|---|---|---|---|---|---|
| student-profile.html | `submitProfile()` (1463) | `existing` (1599) | wizard `<div class="form-section" id="section-0">` (763) — **geen `<form>`** | edit: `toonOverzicht(payload)` + `notify('Profiel bijgewerkt')` (1543-1544); new/track-switch: `triggerStudentMatching` + `getRoleLanding('student', newBblMode)` redirect (1551) | `naam` (770) | student_profiles |
| bol-profile.html | `submitProfile()` (1160) | `existing` (1303) | wizard `.form-section` divs — **geen `<form>`** | edit: `toonOverzicht(payload)` + notify (1240-1241); new: `triggerStudentMatching` + redirect (1248) | `naam` (491) | student_profiles |
| bbl-profile.html | `saveProfile()` (537) | `sp` (635, select \*) | `<div id="view-form">` (303) | `showOverview(overviewData)` + notify (616, 624) — blijft op pagina | `naam` (316) | student_profiles |
| company-dashboard.html | `saveProfile()` (2414) | `cp` (2909, select \*) | inputs in card (geen `<form>`-tag, button id=`saveProfileBtn`) | `toonBedrijfOverzicht({...})` + notify + `herberekeningTrustScore()` (2430-2439) — blijft op pagina | `p-naam` (1037) | company_profiles |
| school-dashboard.html | `saveProfiel()` (2049) | `sp` (2515, select \*) | `<div id="school-view-form">` (2044) | `toonSchoolOverzicht({...})` + notify (2069-2075) — blijft op pagina | `p-naam` (935) | school_profiles |
| begeleider-dashboard.html | `saveProfiel()` (886) | `profile` (1145) | inputs in card (geen `<form>`) | notify + UI update (avatar, topbarUser, welcome) (904-908) — blijft op pagina | `p-naam` (617) | **profiles** (NIET begeleider_profiles) |
| international-student-dashboard.html | `saveProfile()` (1211) | `studentProfile` (1046) | inputs in tabs (geen `<form>`) | notify + `populateDocHub` + `updateCompletionBar` + `renderTimeline` + `applyDiscoverGate` (1247-1258) — blijft op pagina | `p-naam` (851) | student_profiles |

### DB-kolommen per upsert payload

**student-profile.html (regel 1487-1512):**
profile_id, naam, geslacht, opleiding, school, jaar, onderwijsniveau, skills, motivatie, beschikbaar_vanaf, postcode, duur, opdracht_domein, opdracht_aard, opdracht_aanleiding, opdracht_eerder_onderzoek, onderzoeksvraag, onderzoeksvraag_type, onderzoeksvraag_context, resultaat_type, resultaat_doelgroep, methode_type, methode_beschrijving, bbl_mode

**bol-profile.html (regel 1184-1209):**
profile_id, naam, geslacht, opleiding, school, jaar, onderwijsniveau ('MBO_BOL'), skills, motivatie, beschikbaar_vanaf, postcode, duur, opdracht_domein, opdracht_aard, opdracht_aanleiding, opdracht_eerder_onderzoek, onderzoeksvraag, onderzoeksvraag_type, onderzoeksvraag_context, resultaat_type, resultaat_doelgroep, methode_type, methode_beschrijving, bbl_mode (false)

**bbl-profile.html (regel 573-588):**
profile_id, naam, opleiding, jaar, school, schooldag, postcode, opdracht_domein, motivatie, skills (=leerdoelen), bbl_mode (true), pb_naam, contract_start, contract_end

**company-dashboard.html (regel 2419-2426):**
profile_id, bedrijfsnaam, sector, size, website, beschrijving

**school-dashboard.html (regel 2059-2065):**
profile_id, schoolnaam, locatie, contactpersoon, opleidingen

**begeleider-dashboard.html (regel 895-898):**
naam, sector — `db.from('profiles').update({ naam, sector }).eq('id', user.id)` (geen aparte begeleider_profiles tabel; schrijft direct naar `profiles`)

**international-student-dashboard.html (regel 1223-1234):**
profile_id, naam, student_type ('international'), nationality, home_university, home_university_email, study_level, study_field, languages_spoken, work_auth_type

---

## ITEM 4 — CALENDAR

### 4A — Build method
**Build method: STRING** — js/calendar.js regel 152-186, `renderGrid()` zet `c.innerHTML = \`...\``.

### Legend HTML (regel 159-163)
```js
<div class="ical-legend">
  <span class="ical-leg-item"><span class="ical-leg-dot" style="background:#e8f5ee;border:1.5px solid #1a7a48"></span>Beschikbaar</span>
  <span class="ical-leg-item"><span class="ical-leg-dot" style="background:#fdf3e0;border:1.5px solid #a06010"></span>Voorkeur</span>
  <span class="ical-leg-item"><span class="ical-leg-dot" style="background:#fdeaea;border:1.5px solid #b82020"></span>Bezet</span>
</div>
```

### Outer wrapper
`<div class="ical-wrap">` (regel 156). De volledige structuur:
- `.ical-wrap` (156)
  - `.ical-head` (157) bevat `.ical-title` (158) en `.ical-legend` (159-163)
  - `.ical-grid` (165) bevat `.ical-table` (166)
  - `.ical-footer` (181) bevat `.ical-hint` (182) en `.ical-save` button (183)

### Bestaande help/hint-tekst
**JA** — regel 182:
```js
<span class="ical-hint">Klik om te wisselen: leeg → beschikbaar → voorkeur → bezet → leeg</span>
```
Dit is een korte hint in de footer, géén uitgebreide instructie.

### 4B — Insertion point voor uitgebreide helptext

Beste UX-keuze: **na regel 163** (na het sluiten van `.ical-legend`) en **vóór regel 165** (vóór `.ical-grid`). Ofwel: regel 164 is op dit moment leeg/whitespace en de nieuwe helptext kan daar als nieuw `<div class="ical-help">` element binnen `.ical-head` toegevoegd worden.

Alternatief: extending the existing `.ical-hint` text in the footer (regel 182), maar de footer-positie is minder zichtbaar — daarom heeft positie-na-legend de voorkeur.

---

## ITEM 5 — AVATAR INTEGRATION POINTS

### 5A — Profile files: profile var + name input ID

| Bestand | Profile-var (loaded data) | Name input ID | Regel form-section start |
|---|---|---|---|
| student-profile.html | `existing` | `naam` (770) | 763 |
| bol-profile.html | `existing` | `naam` (491) | wizard sections |
| bbl-profile.html | `sp` | `naam` (316) | view-form (303) |
| company-dashboard.html | `cp` | `p-naam` (1037) | n/a (inline form) |
| school-dashboard.html | `sp` | `p-naam` (935) | school-view-form (2044) |
| begeleider-dashboard.html | `profile` | `p-naam` (617) | n/a (inline form) |
| international-student-dashboard.html | `studentProfile` | `p-naam` (851) | n/a (tab content) |
| buddy-dashboard.html | (fetched as `wl` op regel 980) | n/a — buddy-form heeft geen `naam` input (waitlist-data) | buddy-profile-form (319) |

### 5B — Display locations (where to render avatars)

| Bestand:Regel | Template (snippet) | Data-object | Heeft avatar_key?* | SELECT-kolommen |
|---|---|---|---|---|
| school-dashboard.html:1489 | `<div class="avatar">${escapeHtml(initials(s.naam))}</div>` | `s` (student in row) | NO | naam, opleiding, school, jaar, beschikbaar_vanaf, opdracht_domein, profile_id (regel 1301-1302) |
| company-dashboard.html:1972 | `<div class="review-avatar">${escapeHtml(initials)}</div>` | `r` (review) → `reviewerName` | NO | review-fields (geen profile fetch met avatar) |
| match-dashboard.html:3209 | `<div class="avatar" style="background:var(--blue-bg);color:var(--blue);">${match.student.avatar}</div>` | `match.student` (avatar = computed initials op regel 2878) | NO | naam, opleiding, jaar (regel 2870) |
| match-dashboard.html:6282 | `<div style="..."${escapeHtml(p.avatar)}</div>` (top-bar party avatars) | `p` (party-record) | NO | n/a — computed |
| chat.html:640, 681, 750 | `<div class="msg-avatar">${senderInit}</div>` | `senderInit` (computed van `_senderName`) | NO | naam, name, email (regel 982-985, 1245-1246) |
| mijn-berichten.html:372 | `<div class="conv-avatar type-${tc}">${init}</div>` | `conv` met `_otherName` | NO | id, naam, role (regel 552-553, 619-620, 701-702) |

*avatar_key**: Gegevens worden geladen ZONDER `avatar_key`/`avatar_url`. Data-objects hebben dus geen toegang tot avatar-data. Dit moet worden uitgebreid in alle SELECT-queries als avatars uit DB komen.

### 5C — Script load order in profile files (lijnnummers)

| Bestand | utils.js | roles.js | supabase.js | account.js |
|---|---|---|---|---|
| student-profile.html | 15 | 16 | 18 | NIET geladen |
| bol-profile.html | 15 | 16 | 18 | NIET geladen |
| bbl-profile.html | 21 | 22 | 24 | NIET geladen |
| company-dashboard.html | 15 | 16 | 18 | 19 |
| school-dashboard.html | 15 | 16 | 18 | 19 |
| begeleider-dashboard.html | 15 | 16 | 18 | NIET geladen |
| international-student-dashboard.html | 39 | NIET geladen | 41 | 42 |
| buddy-dashboard.html | 23 | 24 | 26 | 27 |

**Voor avatar.js insertion**: na `supabase.js`, vóór account.js (waar account.js geladen wordt) of vóór toast.js (waar account.js niet geladen wordt). Praktisch: avatar.js kan altijd direct na supabase.js worden ingevoegd.

### 5D — Migration status
- **avatar_key**: NIET aanwezig in internly_migration.sql (0 matches) — migration is **NIET uitgevoerd**.
- **avatar_url**: WEL aanwezig in `student_profiles` tabel (regel 37) — alleen op één tabel.
- Geen apart bestand `AVATAR_MIGRATION.sql` in project root.
- AVAILABLE migration files in root: `internly_migration.sql`, `STAGE_MILESTONES_MIGRATION.sql`. Geen avatar-specifieke migratie.

**Conclusie**: vóór fix CC moet er een nieuwe migratie draaien die `avatar_key` (bv. text/uuid) toevoegt aan alle profielen-tabellen, OF `avatar_url` op profiles/company_profiles/school_profiles toevoegt voor consistentie.

---

## SAMENVATTING — ACTIE-PUNTEN

| Item | Klaar voor fix? | Blokkers |
|---|---|---|
| 1. Buddy chat (URL via openChat → chat.html) | ✓ — werkt al | Geen — chat.html ondersteunt `buddy_pair_id` al (regel 1441, 1462-1463) |
| 2. Checkbox styling | ✓ | Inline-styles op label, bestaande `.profile-field input { width: 100% }` regel kan side-effects hebben — checkbox-reset CSS toevoegen |
| 3. Profile saves | ✓ | 7 verschillende patterns; begeleider schrijft naar `profiles` tabel, niet `begeleider_profiles` |
| 4. Calendar helptext | ✓ | String-template, insertion point regel 164 (binnen `.ical-head`) |
| 5. Avatar integration | ⚠️ | **Migratie ontbreekt** — `avatar_key` bestaat nergens; alle SELECT-queries moeten ook avatar-kolom toevoegen |

---

# Bestand opgeslagen: c:\Projects\Internly\VANMIDDAG_RESEARCH.md
