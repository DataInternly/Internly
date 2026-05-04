# BUDDY DISCOVERY BUILD LOG — 1 mei 2026

## STAP 1 — HTML sectie-card

**File:** [buddy-dashboard.html](buddy-dashboard.html)

**Insertion:** lines 324-349, directly after the "Actieve koppelingen" card (`</div>` op originele lijn 322, nu lijn 322).

**Section ID:** `buddy-seekers-section` (wrapper, default `display:none`)

**Sub-elements:**
- `#buddy-seekers-list` — container voor `renderBuddySeekerCard` HTML
- `#buddy-seekers-empty` — empty-state met 🎓 icon, default hidden
- `#buddy-seekers-loading` — initial loading state, default visible

**Insertion point:** between de gesloten "Actieve koppelingen" card div en de "Interesse in jou" card.

---

## STAP 2 — js/buddy.js functies

**File:** [js/buddy.js](js/buddy.js)

**Functions added** (lines 762-1027, na `saveBuddyProfile()`):
| Function | Type | Lines | Purpose |
|---|---|---|---|
| `fetchBuddySeekers(userId)` | async | 765-799 | Query `student_profiles WHERE zoekt_buddy=true`, filter al-aangevraagde studenten via `buddy_requests` left-anti-join |
| `renderBuddySeekerCard(student)` | sync | 801-928 | Per-student rich HTML card: avatar (initials, groene gradient), naam+opleiding+jaar+school header, paarse "Zoekt buddy" badge, motivatie-quote (line-clamped), opdracht_domein/sector/beschikbaar tags, skills chips (oranje), 💜 Buddy worden + Overslaan knoppen |
| `loadBuddySeekers()` | async | 930-961 | Init: getUser, fetchBuddySeekers, hide loading, show empty-state of populate list+show section |
| `buddyRequestStudent(studentId, btn)` | async | 963-1024 | INSERT in `buddy_requests` (type='gepensioneerd', status='pending'), `createNotification` naar student via type `buddy_request`, fade-out card translateX(+60px), toast |
| `buddySkipStudent(studentId)` | sync | 1026-1043 | Lokale fade-out card translateX(-40px), geen DB-write (geen pass-historie zoals swipes.js) |

**Window exports** ([js/buddy.js:1045-1047](js/buddy.js#L1045)):
```js
window.loadBuddySeekers    = loadBuddySeekers;
window.buddyRequestStudent = buddyRequestStudent;
window.buddySkipStudent    = buddySkipStudent;
```

`fetchBuddySeekers` en `renderBuddySeekerCard` zijn niet expliciet geëxporteerd — interne helpers, alleen aangeroepen vanuit `loadBuddySeekers`.

**Note:** js/buddy.js heeft geen IIFE-wrapper, dus alle top-level `function` declarations zijn al impliciet globaal. De expliciete `window.X = X` regels zijn extra defensief en consistent met andere modules in het project.

---

## STAP 3 — Init call

**File:** [buddy-dashboard.html:1046-1049](buddy-dashboard.html#L1046)

**Added directly after** `await Promise.all([loadPairs(), loadPendingRequests()]);` (op originele lijn 1044, nu lijn 1044):

```js
// Buddy seekers discovery — 1 mei 2026
if (typeof loadBuddySeekers === 'function') {
  loadBuddySeekers();
}
```

Niet `await`-ed — non-blocking parallel met `_loadPrefs()` en de rest van de init-flow. Als js/buddy.js op enige manier niet geladen is (cache-issue, network), faalt de check stil zonder de rest van de init te breken.

---

## STAP 4 — escapeHtml guard

**Status:** **PASS** — geen actie vereist.

**Verificatie:**
- [buddy-dashboard.html:23](buddy-dashboard.html#L23) — `<script src="js/utils.js"></script>` geladen voor js/buddy.js ([:29](buddy-dashboard.html#L29))
- [js/utils.js:263](js/utils.js#L263) — `function escapeHtml(str)` definitie (top-level, globaal)
- Geen lokale `escapeHtml` redefinitie in buddy.js — gebruikt de globale functie

`renderBuddySeekerCard` roept `escapeHtml(student.naam)`, `escapeHtml(student.opleiding)`, etc. aan — werkt direct via de globale functie.

---

## VEREISTE VOOR WERKING

[BACKLOG_MIGRATION.sql](BACKLOG_MIGRATION.sql) moet gedraaid zijn:
```sql
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS zoekt_buddy boolean
  DEFAULT false;
```

**Verificatie:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'student_profiles'
AND column_name = 'zoekt_buddy';
-- Verwacht: 1 rij
```

**Zonder deze migratie:** `fetchBuddySeekers` query faalt met `column "zoekt_buddy" does not exist`. De error wordt gelogd via `console.error('[buddy-seekers] student load fout:', spErr.message)` en de functie returnt `[]`. Section blijft hidden — buddy ziet niets en weet niet waarom. **Aanbevolen**: BACKLOG_MIGRATION.sql draaien vóór deze feature live gaat, of een DB-error indicator toevoegen aan de empty-state.

**Tweede vereiste:** zoekt_buddy toggle moet daadwerkelijk gebruikt worden door studenten. Toggle is al toegevoegd in [student-profile.html](student-profile.html), [bol-profile.html](bol-profile.html) en [bbl-profile.html](bbl-profile.html) (vorige sessie). Buddies zien alleen studenten die expliciet hebben opt-in via die toggle.

---

## GEWIJZIGDE BESTANDEN

1. [buddy-dashboard.html](buddy-dashboard.html) — STAP 1 (sectie-card HTML) + STAP 3 (init-call)
2. [js/buddy.js](js/buddy.js) — STAP 2 (5 functies + 3 window exports)

**Totaal: 2 bestanden, geen SKIPs.**

---

## VOLGENDE BACKLOG (geen onderdeel van deze sessie)

- **Realtime subscription**: nu refresh-only. Wanneer een student `zoekt_buddy` toggelt naar true, ziet de buddy dat pas bij volgende pagina-refresh. Voeg `db.channel('buddy-seekers').on('postgres_changes', ...)` toe als feature traction krijgt.
- **Pagination**: `.limit(30)` is hard cap. Als zoekt_buddy populair wordt, voeg "Laad meer" knop toe.
- **Sorteer-criteria**: huidige query heeft geen explicit `ORDER BY`. Overweeg sortering op `created_at DESC` (nieuwste eerst) of op match-score (skill-overlap met buddy expertise).
- **Pass-tracking**: `buddySkipStudent` heeft GEEN DB-write. Dezelfde student blijft verschijnen na page-refresh. Optioneel: schrijf pass naar `swipes` tabel met direction='pass' om hergebruik te voorkomen.
- **Modal upgrade naar Optie B**: als knop-discovery v1 traction krijgt, upgrade naar full-screen swipe-deck modal (touch gestures, z-stack rotation). Architectuur is al voorbereid — alleen renderer + gesture-handlers bouwen.
- **Skill-overlap badge**: toon "3 van jouw expertise-tags overlappen" badge per kaart om relevantie te benadrukken.
- **Undo-toast**: na skip, toon 5-second toast met "Ongedaan maken" zodat per ongeluk weggeklikte kaarten teruggehaald kunnen worden.
