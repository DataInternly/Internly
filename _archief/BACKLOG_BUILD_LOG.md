# BACKLOG FIX LOG — 30 april 2026

## SQL

[BACKLOG_MIGRATION.sql](BACKLOG_MIGRATION.sql) written. **Run in Supabase before avatar + buddy features work.**

Twee `ALTER TABLE` statements:
- `student_profiles.zoekt_buddy boolean DEFAULT false`
- `profiles.avatar_key text`

---

## ITEM 3 — avatar_key SELECT queries

| File | Lines updated | Status |
|---|---|---|
| [school-dashboard.html:1306](school-dashboard.html#L1306) | bundle-active query | **ALREADY DONE** (vorige sessie) |
| [school-dashboard.html:1312](school-dashboard.html#L1312) | school-name query | **ALREADY DONE** |
| [match-dashboard.html:2882](match-dashboard.html#L2882) | loadMatchFromDB student_profiles select | **ALREADY DONE** |
| [chat.html:1002](chat.html#L1002) | otherParty resolve | **ALREADY DONE** |
| [chat.html:1379](chat.html#L1379) | renderConversationList | **ALREADY DONE** |
| [mijn-berichten.html:553](mijn-berichten.html#L553) | pending fromProfiles | **ALREADY DONE** |
| [mijn-berichten.html:620](mijn-berichten.html#L620) | otherProfiles batch | **ALREADY DONE** |
| [mijn-berichten.html:702](mijn-berichten.html#L702) | zoek modal | **ALREADY DONE** |

Alle 8 SELECT queries waren al bijgewerkt in de vorige sessie (gedocumenteerd in [BOL_FLOW_BUILD_LOG.md](BOL_FLOW_BUILD_LOG.md) onder Bundel A1). Skip — geen actie vereist.

---

## ITEM 4 — Begeleider avatar save

**Script tag:** `<script src="js/avatar.js"></script>` was reeds aanwezig op [begeleider-dashboard.html:19](begeleider-dashboard.html#L19) — geen wijziging nodig.

**Payload change** in `saveProfiel()` op [begeleider-dashboard.html:997-1003](begeleider-dashboard.html#L997):

Before:
```js
const { error } = await db
  .from('profiles')
  .update({ naam, sector })
  .eq('id', user.id);
```

After:
```js
const { error } = await db
  .from('profiles')
  .update({
    naam,
    sector,
    avatar_key: window._internlyAvatarKey || null
  })
  .eq('id', user.id);
```

**SQL vereiste:** `profiles.avatar_key` kolom toevoegen via [BACKLOG_MIGRATION.sql](BACKLOG_MIGRATION.sql).

---

## ITEM 5 — Buddy avatar save

**Function:** `saveBuddyProfile(formData)` in [js/buddy.js:717-733](js/buddy.js#L717).

Schrijft naar `buddy_profiles` (via `.upsert(payload, { onConflict: 'profile_id' })`).

Before:
```js
const { error } = await db
  .from('buddy_profiles')
  .upsert({ profile_id: user.id, ...formData }, { onConflict: 'profile_id' });
```

After:
```js
const payload = {
  profile_id: user.id,
  ...formData,
  avatar_key: window._internlyAvatarKey || null
};

const { error } = await db
  .from('buddy_profiles')
  .upsert(payload, { onConflict: 'profile_id' });
```

**Schema-noot:** `buddy_profiles.avatar_key` kolom bestaat nog NIET. AVATAR_MIGRATION.sql voegt avatar_key toe aan `buddy_queue` (een andere tabel). Buddy-dashboard leest `wl.avatar_key` van `waitlist` (waar de kolom ook NIET bestaat). Backlog-item: kolom toevoegen aan `buddy_profiles` via vervolg-migratie, óf de save herzien naar `buddy_queue` — buiten scope deze sessie.

---

## ITEM 1 — zoekt_buddy toggle

| File | Toggle line | Load line | Save line |
|---|---|---|---|
| [student-profile.html](student-profile.html) | [:1059-1080](student-profile.html#L1059) (HTML) | [:1438-1440](student-profile.html#L1438) (`populateForm`) | [:1538](student-profile.html#L1538) (in payload) |
| [bol-profile.html](bol-profile.html) | [:756-777](bol-profile.html#L756) (HTML) | [:1140-1142](bol-profile.html#L1140) (`populateForm`) | [:1234](bol-profile.html#L1234) (in payload) |
| [bbl-profile.html](bbl-profile.html) | [:413-433](bbl-profile.html#L413) (HTML) | [:540-542](bbl-profile.html#L540) (`setVal`-block) | [:620](bbl-profile.html#L620) (in payload) |

**HTML toegevoegd** (alle 3 bestanden, identieke styling):
```html
<div class="form-field" style="margin-top:1rem">
  <label style="display:flex;align-items:center;gap:.75rem;cursor:pointer;
    padding:.85rem 1rem;background:#faf7f3;border:1px solid rgba(13,21,32,.09);
    border-radius:10px">
    <input type="checkbox" id="zoekt-buddy"
      style="width:18px;height:18px;flex-shrink:0;
      accent-color:#7c3aed;cursor:pointer;margin:0">
    <div>
      <div style="font-size:.9rem;font-weight:500;color:#0d1520">
        Ik zoek een buddy
      </div>
      <div style="font-size:.78rem;color:#7a8799;margin-top:2px">
        Gepensioneerde professionals kunnen jou dan vinden om mee te
        sparren over je stage.
      </div>
    </div>
  </label>
</div>
```

**Load:** in elk bestand wordt na het invullen van velden:
```js
const _zb = document.getElementById('zoekt-buddy');
if (_zb) _zb.checked = !!(data?.zoekt_buddy); // student-profile + bol-profile gebruiken `data`
                                              // bbl-profile gebruikt ook `data` (parameter naam in setVal-block)
```

**Save:** payload uitgebreid met:
```js
zoekt_buddy: document.getElementById('zoekt-buddy')?.checked || false,
```

**SQL vereiste:** `student_profiles.zoekt_buddy` kolom toevoegen via [BACKLOG_MIGRATION.sql](BACKLOG_MIGRATION.sql).

---

## ITEM 2 — Buddy kleurcodering

| File | Location | What changed |
|---|---|---|
| [matches.html:756-768](matches.html#L756) | Buddy-pairs render in `loadBuddyPairs()` | Toegevoegd: `border-left:3px solid #7c3aed`, `background:#faf7ff`, avatar-bg `#ede9fe`/color `#7c3aed`, "Buddy" badge in name-row |
| [mijn-berichten.html:96](mijn-berichten.html#L96) | CSS `.conv-card.type-buddy` | Nieuwe regel: `border-left: 3px solid #7c3aed` |
| [mijn-berichten.html:102](mijn-berichten.html#L102) | CSS `.conv-avatar.type-buddy` | Kleur gewijzigd van `#eff6ff/#1e40af` (blauw) → `#ede9fe/#7c3aed` (paars) |
| [mijn-berichten.html:115](mijn-berichten.html#L115) | CSS `.conv-badge.type-buddy` | Zelfde paars-kleurwijziging |
| [mijn-berichten.html:374](mijn-berichten.html#L374) | conv-card render | `class="conv-card${...}"` → `class="conv-card type-${tc}${...}"` zodat `.type-buddy` left-border wordt geactiveerd |
| [discover.html:463-478](discover.html#L463) | CSS `.buddy-card` + `.buddy-card__avatar` | Toegevoegd `border-left:3px solid #7c3aed`; avatar-bg gewijzigd van `var(--c-green)` (groen) → `#ede9fe` (paars) en color `#fff` → `#7c3aed` |
| [js/buddy.js:497-500](js/buddy.js#L497) | `renderBuddyCard()` template | Naam-block inline-flex met "Buddy" badge (paars #7c3aed/#ede9fe) toegevoegd |
| [buddy-dashboard.html:218-225](buddy-dashboard.html#L218) | CSS `.req-card` | Border-left geüpdatet: was paars-tinged, nu groen `#1a7a48` (student kleur in buddy-interface). Background van `#faf8ff` → `#f7fbf8` |
| [buddy-dashboard.html:670-677](buddy-dashboard.html#L670) | `renderRequests()` template | "Student" badge toegevoegd (groen #1a7a48/#e8f5ee) in de req-badge-row |
| [chat.html:1494-1498](chat.html#L1494) | Buddy-chat topbar | `.textContent` → `.innerHTML` met "Buddy" badge inline na naam (paars #7c3aed/#ede9fe) |

**Kleurfilosofie:**
- Buddy in **student-interface**: paars (`#7c3aed` / `#ede9fe`) — buddy is "anders/gast", paars accent maakt onderscheid van groene student/oranje bedrijf
- Student in **buddy-interface**: groen (`#1a7a48` / `#e8f5ee`) — student is "ontvangstpartij", groen-link naar Internly's primaire kleur
- Chat-header: dynamische badge per ander-partij rol — momenteel alleen buddy-pad gebadged (match-pad gebruikt `posting.title`, niet een persoon)

---

## SQL VOOR BARRY

Run [BACKLOG_MIGRATION.sql](BACKLOG_MIGRATION.sql) in Supabase SQL Editor.

Verificatie:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'student_profiles'
AND column_name = 'zoekt_buddy';
-- Verwacht: 1 rij

SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name = 'avatar_key';
-- Verwacht: 1 rij
```

**Noot:** voor item 5 (buddy avatar save) is een aparte migratie nodig om `buddy_profiles.avatar_key` toe te voegen. Niet in BACKLOG_MIGRATION.sql opgenomen omdat de instructie alleen `student_profiles.zoekt_buddy` en `profiles.avatar_key` voorschreef.

---

## GEWIJZIGDE BESTANDEN

1. [BACKLOG_MIGRATION.sql](BACKLOG_MIGRATION.sql) — NEW
2. [begeleider-dashboard.html](begeleider-dashboard.html) — Item 4
3. [js/buddy.js](js/buddy.js) — Item 5 + Item 2A buddy-card badge
4. [student-profile.html](student-profile.html) — Item 1 (toggle + load + save)
5. [bol-profile.html](bol-profile.html) — Item 1
6. [bbl-profile.html](bbl-profile.html) — Item 1
7. [matches.html](matches.html) — Item 2A buddy-pair render
8. [mijn-berichten.html](mijn-berichten.html) — Item 2A CSS + render class
9. [discover.html](discover.html) — Item 2A buddy-card CSS
10. [buddy-dashboard.html](buddy-dashboard.html) — Item 2B req-card + Student badge
11. [chat.html](chat.html) — Item 2C buddy-chat topbar

**Totaal: 11 bestanden gewijzigd, geen SKIPs (Item 3 was al klaar — niet als skip geteld).**

---

## OPEN BACKLOG (vervolgsessie)

- `buddy_profiles.avatar_key` kolom toevoegen via vervolg-migratie (anders blijft Item 5 effectief no-op)
- `waitlist.avatar_key` kolom toevoegen óf [buddy-dashboard.html:1003](buddy-dashboard.html#L1003) avatar-picker preselect aanpassen om uit `buddy_profiles` te lezen i.p.v. `waitlist`
- Chat-header student-pad: voeg "Student" badge toe wanneer een bedrijf-gebruiker chat opent met student (vereist role-detect bij match-chat, vergelijkbaar met buddy-pad)
- Filter "buddies" in matches.html: ook de tab-pill een paarse accent geven voor consistentie
