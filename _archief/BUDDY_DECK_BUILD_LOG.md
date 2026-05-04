# BUDDY SWIPE DECK — BUILD LOG
Datum: 1 mei 2026
Team-reviewed: BUDDY_DECK_AUDIT.md

Geen wijzigingen aan js/utils.js, js/roles.js, auth.html.
Geen wijzigingen aan BACKUP/ of _revamp_2026-04-29/.

---

## PRE-CHECK

| Check | Resultaat |
|---|---|
| `id="buddy-seekers-section"` aanwezig | ✓ regels 326-350 (oud) |
| `loadBuddySeekers()` referenties: `buddy-seekers-list`, `buddy-seekers-empty`, `buddy-seekers-loading` | ✓ CONFIRMED — alle drie aanwezig op regels 962, 964, 966 (oud) |

Beide pre-checks geslaagd. Bouw kan doorgaan.

---

## STAP 1 — HTML

| | Regels |
|---|---|
| **Oude sectie verwijderd** | buddy-dashboard.html:326-350 (25 regels) |
| **Nieuwe sectie toegevoegd** | buddy-dashboard.html:325-415 (91 regels) |

Nieuwe IDs:
- `buddy-seekers-section` (kept)
- `buddy-deck-loading` (regel 336)
- `buddy-deck-empty` (regel 342)
- `buddy-deck-done` (regel 357)
- `buddy-deck-wrap` (regel 378) — `touch-action:none`, height 300px
- `buddy-deck-actions` (regel 383) — pass + like buttons
- `buddy-deck-counter` (regel 410)

⚠️ De oude `style="display:none"` op `#buddy-seekers-section` is verwijderd; sectie is nu standaard zichtbaar (loading-state toont meteen).

---

## STAP 2 — Deck engine

**Inserted in js/buddy.js**: regels 1102-1474, direct na `buddySkipStudent` (eindigt op regel 1100) en vóór de nieuwe window exports.

### Nieuwe state-variabelen
```js
let _deckStudents   = [];        // 1117
let _deckIndex      = 0;         // 1118
let _deckActive     = false;     // 1124
let _deckSwiping    = false;     // 1127
let _deckAnimating  = false;     // 1131
let _deckController = null;      // 1134
let _deckDragStartX = 0;         // 1135
let _deckDragCurX   = 0;         // 1136
let _deckIsDragging = false;     // 1137
```

### Nieuwe functies
| Functie | Regel | Doel |
|---|---|---|
| `_deckCleanup` | 1139 | abort + null op _deckController |
| `_deckSetupListeners` | 1146 | document-level move/end listeners met AbortController |
| `_buildDeckCard` | 1161 | bouwt één card-element met stackPos 0/1/2 |
| `_deckOnMove` | 1336 | drag-translate + indicator-opacity |
| `_deckOnEnd` | 1361 | release-resolve: like/pass/snap-back |
| `_renderDeck` | 1378 | top-3 cards positioneren + listeners (re)setup |
| `deckAction` | 1428 | commit like (`buddyRequestStudent`) of pass (`buddySkipStudent`) |
| `reloadBuddyDeck` | 1453 | reset state + roept `loadBuddySeekers()` aan |

### Race-condition protectie (team decisions)
| Bescherming | Regels | Werking |
|---|---|---|
| `_deckAnimating` | 1131 | Voorkomt dat een nieuwe drag start tijdens 210ms fly-out animation (mousedown/touchstart guard regel 1316/1324) |
| `_deckSwiping` mutex | 1127 | `deckAction()` early-return als al bezig — geen dubbele INSERT bij rapid clicks (regel 1429-1430) |
| `AbortController` listener cleanup | 1134, 1141, 1153 | Document-level listeners worden bij elke render via `controller.abort()` opgeruimd — geen accumulation |
| `_deckActive` realtime cascade | 1124 | Vlag staat true tijdens browsen; reset op exhaustion. Geen actuele realtime-callback roept `loadBuddySeekers` aan (zie Stap 4), dus puur preventief |

### avatar_key SELECT met fallback
Per audit-risico: try met `avatar_key`, catch zonder. Zie Stap 5.

---

## STAP 3 — loadBuddySeekers updated

**Regels gewijzigd**: js/buddy.js:978-1006 (was 958-989, 32 regels → 29 regels).

### Voor
```js
async function loadBuddySeekers() {
  const section = document.getElementById('buddy-seekers-section');
  const list    = document.getElementById('buddy-seekers-list');
  const empty   = document.getElementById('buddy-seekers-empty');
  const loading = document.getElementById('buddy-seekers-loading');

  if (!section || !list) return;
  ...
  if (students.length === 0) {
    if (empty) empty.style.display = '';
    section.style.display = '';
    return;
  }

  list.innerHTML = students.map(s => renderBuddySeekerCard(s)).join('');
  section.style.display = '';
}
```

### Na
```js
async function loadBuddySeekers() {
  const section = document.getElementById('buddy-seekers-section');
  const loading = document.getElementById('buddy-deck-loading');

  if (!section) return;
  ...
  if (students.length === 0) {
    const emptyEl = document.getElementById('buddy-deck-empty');
    if (emptyEl) emptyEl.style.display = '';
    section.style.display = '';
    return;
  }

  _deckStudents = students;
  _deckIndex    = 0;
  _deckActive   = true;
  section.style.display = '';
  _renderDeck();
}
```

| Wijziging | Detail |
|---|---|
| Verwijderd | `buddy-seekers-list`, `buddy-seekers-empty`, `buddy-seekers-loading` IDs |
| Toegevoegd | `buddy-deck-loading`, `buddy-deck-empty` IDs |
| Render-mode | List-render → deck-render (`_deckStudents` + `_renderDeck()`) |

⚠️ De oude functie `renderBuddySeekerCard` (regels 829-956) is **niet verwijderd** — niet meer aangeroepen, kan in een latere cleanup-pass weg.

---

## STAP 4 — Realtime guard

**Result: PASS — geen wijziging nodig**

`loadBuddySeekers()` wordt nergens aangeroepen vanuit `_buddySubscribeRealtime` (regels 89-136). Realtime-callbacks roepen alleen `buddyLoadPendingRequests`, `buddyLoadPairs` en `BuddyModule.onUpdate?.()` aan.

Audit-rapport noemde regels 965/969 (`loadPairs()` calls binnen subscribe op `buddy_pairs`) — dat zijn andere functies, niet seekers. De _deckActive flag blijft als preventief mechanisme staan voor toekomstige uitbreiding.

Callsites van `loadBuddySeekers`:
- buddy-dashboard.html:1138 (initial mount)
- js/buddy.js:1466 (binnen `reloadBuddyDeck`)

Geen realtime-trigger.

---

## STAP 5 — avatar_key fallback

**Regels gewijzigd**: js/buddy.js:793-849.

### Voor
```js
const { data: students, error: spErr } = await db
  .from('student_profiles')
  .select(
    'profile_id, naam, opleiding, school, jaar, ' +
    'beschikbaar_vanaf, opdracht_domein, motivatie, ' +
    'skills, avatar_key, avatar_url, sector, niveau'
  )
  .eq('zoekt_buddy', true)
  .limit(30);

if (spErr) {
  console.error(...); return [];
}
if (!students || students.length === 0) return [];
```

### Na
```js
const _baseSelect =
  'profile_id, naam, opleiding, school, jaar, ' +
  'beschikbaar_vanaf, opdracht_domein, motivatie, ' +
  'skills, avatar_url, sector, niveau';

let spData, spErr;

try {
  const res = await db
    .from('student_profiles')
    .select(_baseSelect + ', avatar_key')
    .eq('zoekt_buddy', true)
    .limit(30);
  spData = res.data;
  spErr  = res.error;
  if (spErr) throw spErr;
} catch {
  // Fallback: avatar_key kolom bestaat mogelijk
  // nog niet (AVATAR_MIGRATION.sql niet gedraaid)
  const res = await db
    .from('student_profiles')
    .select(_baseSelect)
    .eq('zoekt_buddy', true)
    .limit(30);
  spData = res.data;
  spErr  = res.error;
}

if (spErr) {
  console.error(...); return [];
}
const students = spData || [];
if (!students || students.length === 0) return [];
```

Pad 1 (try): met `avatar_key` — werkt als migratie gedraaid is.
Pad 2 (catch): zonder `avatar_key` — werkt als kolom nog niet bestaat.

---

## Window exports

| Export | Regel |
|---|---|
| `window.loadBuddySeekers` | 1470 |
| `window.buddyRequestStudent` | 1471 |
| `window.buddySkipStudent` | 1472 |
| `window.deckAction` | **1473 (NIEUW)** |
| `window.reloadBuddyDeck` | **1474 (NIEUW)** |

(Daarnaast nog `window.showBuddyOverzicht` en `window.showBuddyForm` op regel 1477-1478, ongewijzigd.)

---

## GEWIJZIGDE BESTANDEN

1. `c:\Projects\Internly\buddy-dashboard.html` — sectie #buddy-seekers-section vervangen (1106 → 1171 regels)
2. `c:\Projects\Internly\js\buddy.js` — fetchBuddySeekers fallback, loadBuddySeekers nieuwe IDs, deck engine ingevoegd (1092 → 1478 regels)

---

## TEST-CHECKLIST

- [ ] Buddy-dashboard openen → sectie toont loading → studenten of empty/done
- [ ] Klik 💜 → buddyRequestStudent draait, kaart verdwijnt, volgende komt op
- [ ] Klik ✕ → buddySkipStudent fade, volgende komt op
- [ ] Drag rechts > 75px → BUDDY! indicator + auto-like
- [ ] Drag links > 75px → SKIP indicator + auto-pass
- [ ] Drag < 75px (links of rechts) → snap terug naar center
- [ ] Drag tijdens 210ms animation → genegeerd (geen tweede drag)
- [ ] Rapid klikken op 💜 → één INSERT, niet twee (mutex `_deckSwiping`)
- [ ] Counter updates: "1 van N", "2 van N", ...
- [ ] Deck leeg → "Dat waren alle studenten" + "Opnieuw laden" button
- [ ] "Opnieuw laden" knop → fetch + render (skipped studenten verschijnen weer — by design)
- [ ] Geen `avatar_key` kolom in DB → fallback SELECT werkt zonder errors
- [ ] Mobile (iOS Safari): verticaal scrollen werkt; horizontale swipe op kaart claimt gesture
- [ ] Cleanup: bij re-render geen accumulating listeners (DevTools → Memory)
