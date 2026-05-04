# BUDDY SWIPE DECK AUDIT — 1 mei 2026

Read-only research. Geen bestanden gewijzigd.

---

## js/buddy.js

### A) All functions defined

| Naam | Regel | Beschrijving |
|---|---|---|
| `buddyInit` | 72 | Initialiseert BuddyModule met userId/role/db, abonneert realtime |
| `_buddySubscribeRealtime` | 89 | Realtime subscription op `buddy_requests` (INSERT receiver_id, UPDATE requester_id) en `buddy_pairs` |
| `buddyLoadPairs` | 140 | Laadt actieve buddy_pairs voor user |
| `buddyLoadPendingRequests` | 176 | Laadt pending requests waar user receiver is |
| `buddyFindCandidates` | 213 | Zoekt buddy-kandidaten op basis van type + context |
| `buddySendRequest` | 267 | INSERT buddy_request + notify receiver |
| `buddyAcceptRequest` | 322 | UPDATE request status='accepted' + maak buddy_pair |
| `buddyDeclineRequest` | 408 | UPDATE request status='declined' + reason |
| `buddyEndPair` | 434 | Beëindigt actieve buddy_pair |
| `_buddyNotify` | 458 | Directe `db.from('notifications').insert` (in audit gemarkeerd HOOG, omzeilt createNotification) |
| `buddyRenderPairCard` | 482 | Renders `.buddy-card` voor een actief pair |
| `buddyRenderIncomingRequests` | 515 | Renders incoming requests panel |
| `buddyRenderRequestWidget` | 547 | Renders request-widget per type/context |
| `buddyOpenChat` | 572 | Navigatie → `chat.html?buddy_pair_id=...` |
| `buddyHandleRequestFromWidget` | 579 | Click handler voor widget-knop |
| `buddyHandleRequest` | 597 | Generieke request-handler |
| `buddyShowToast` | 634 | Toast helper |
| `loadBuddyProfile` | 662 | Laadt buddy-eigen profielrij |
| `populateBuddyProfile` | 684 | Vult formulier uit profiel-data |
| `collectBuddyProfileData` | 709 | Verzamelt formulier-data → object |
| `showBuddyOverzicht` | 723 | Toon overview-card |
| `showBuddyForm` | 759 | Toon formulier (terug van overzicht) |
| `saveBuddyProfile` | 767 | Upsert buddy-profiel |
| **`fetchBuddySeekers`** | **793** | **SELECT student_profiles WHERE zoekt_buddy=true LIMIT 30, filter op already-requested** |
| **`renderBuddySeekerCard`** | **829** | **Renders één `.like-card` met inline styles, action buttons** |
| **`loadBuddySeekers`** | **958** | **Vult `#buddy-seekers-list` met gerenderde kaarten (lijst, geen deck)** |
| **`buddyRequestStudent`** | **991** | **INSERT buddy_request, fade-out card, notify** |
| **`buddySkipStudent`** | **1068** | **Lokale fade-out (geen DB-write, geen `swipes` insert)** |

### B) Window exports (regel 1086-1092)
```js
window.loadBuddySeekers    = loadBuddySeekers;
window.buddyRequestStudent = buddyRequestStudent;
window.buddySkipStudent    = buddySkipStudent;
window.showBuddyOverzicht  = showBuddyOverzicht;
window.showBuddyForm       = showBuddyForm;
```
Plus eerder in het bestand: `BuddyModule` (regel 45) en `buddyInit` (regel 72) — maar die zijn niet expliciet aan window gehangen (top-level `function` declaraties zijn impliciet beschikbaar in script-scope).

### C) `loadBuddySeekers()` — regel 958-989

**Wat:**
- Pakt 4 DOM-elementen: `#buddy-seekers-section`, `#buddy-seekers-list`, `#buddy-seekers-empty`, `#buddy-seekers-loading`
- Roept `db.auth.getUser()` aan
- Roept `fetchBuddySeekers(user.id)` aan
- Verbergt loading
- Als 0 studenten → toon `#buddy-seekers-empty`, sectie blijft zichtbaar
- Anders → `list.innerHTML = students.map(renderBuddySeekerCard).join('')` (LIJST-render, geen deck)

**Render-method**: simpele lijst (geen stack, geen positionering, geen z-index manipulatie).

**State variabelen**: geen — pure functie die per call DB-query doet en innerHTML zet.

### D) `renderBuddySeekerCard()` — regel 829-956

**HTML-structuur** (per kaart):
```
<div class="like-card" id="bsc-<profile_id>" style="...">
  <div> <!-- header row -->
    <div> <!-- avatar 44×44, gradient #1a7a48→#0f5c36, witte initialen -->
    <div> <!-- naam + opleiding · jaar · school -->
    <span> <!-- "Zoekt buddy" badge, paars #ede9fe/#7c3aed -->
  </div>
  <p> <!-- motivatie, 2-line clamp (optioneel) -->
  <div> <!-- chips: opdracht_domein, sector, beschikbaar -->
  <div> <!-- skills chips (max 4), oranje #fdf0e8/#b84910 -->
  <div> <!-- buttons: "💜 Buddy worden" (paars gradient), "Overslaan" (wit) -->
</div>
```

**Inline transition**: `transition:opacity .25s,transform .25s` (regel 853).

### E) `buddyRequestStudent(studentId, btn)` — regel 991-1066

**Parameters**: `studentId` (UUID string), `btn` (DOM element of de button die werd geklikt).

**Wat het doet**:
1. Disable knop, tekst "Versturen..."
2. INSERT in `buddy_requests` (requester_id, receiver_id, type='gepensioneerd', status='pending')
3. Returnt geselecteerd `id`
4. Fetch profiel-naam → roept `createNotification()` aan voor de student
5. Card-element `#bsc-<studentId>` → opacity 0, translateX(60px), na 250ms `.remove()`
6. Check op lege lijst → toon empty-state
7. `notify(...)` toast

### F) `buddySkipStudent(studentId)` — regel 1068-1083

**Wat**:
- Pakt `#bsc-<studentId>`
- opacity 0, translateX(-40px) (linksaf swipe-feeling)
- 220ms timeout → `.remove()`
- Check leegte → empty-state
- **Geen DB-write** — alleen UI-fade. Geen state persistentie tussen sessies.

### G) `fetchBuddySeekers(userId)` — regel 793-827

**SELECT-string** (regel 797-801):
```
'profile_id, naam, opleiding, school, jaar, '
+ 'beschikbaar_vanaf, opdracht_domein, motivatie, '
+ 'skills, avatar_key, avatar_url, sector, niveau'
```

**Filter chain** (regel 802-803):
```js
.eq('zoekt_buddy', true)
.limit(30)
```

**Already-requested filter** (regel 814-822):
```js
db.from('buddy_requests')
  .select('receiver_id')
  .eq('requester_id', userId)
  .in('receiver_id', students.map(s => s.profile_id));
// → Set, then students.filter(s => !alreadyRequested.has(s.profile_id))
```

### H) Drag/touch/swipe gestures in buddy.js?
**NEE** — geen `pointerdown`, `mousedown`, `touchstart`, `drag`, `pan` handlers gevonden. De huidige UX is **klikken op buttons**, niet swipen.

### I) Deck-related variables?
**NEE** — geen `_deckStudents`, `_deckIndex`, `_currentCard`, `_stack` variabelen. Pure list-render.

### J) js/swipes.js — bruikbaar voor deck?
Zie sectie hieronder ("js/swipes.js"). Korte versie: **NEE — niet bruikbaar als swipe-deck**. Het is een inbox-rendering voor "Interesse in jou" likes (Tinder-achtige notificaties), niet een gesture-deck.

---

## buddy-dashboard.html

### A) `#buddy-seekers-section` HTML (regel 325-350)
```html
<!-- Studenten die een buddy zoeken — 1 mei 2026 -->
<div class="card" id="buddy-seekers-section"
  style="display:none">
  <div class="card-label">Studenten die een buddy zoeken</div>
  <p style="font-size:.82rem;color:#6b7280;
    margin-bottom:12px;line-height:1.55">
    Deze studenten hebben aangegeven open te staan
    voor een buddy. Stuur een aanvraag om te koppelen.
  </p>
  <div id="buddy-seekers-list"></div>
  <div id="buddy-seekers-empty"
    style="display:none;text-align:center;
    padding:1.5rem 0;color:#9ca3af;font-size:.85rem">
    <div style="font-size:1.5rem;margin-bottom:.5rem">
      🎓
    </div>
    Op dit moment zoeken er nog geen studenten een buddy.
    Zodra een student zich aanmeldt verschijnt die hier
    automatisch — kom later terug of houd je profiel actief.
  </div>
  <div id="buddy-seekers-loading"
    style="text-align:center;padding:1rem 0;
    color:#9ca3af;font-size:.85rem">
    Laden...
  </div>
</div>
```

### B) Card CSS pattern
Alle dashboard-blokken gebruiken `.card` (regel 95-99):
```css
.card {
  background: #fff;
  border: 1px solid rgba(15,17,23,.09);
  border-radius: 14px;
  padding: 16px 18px;
  margin-bottom: 12px;
}
```
Met optionele `.card-label` (kleine uppercase header):
```css
.card-label {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .07em; color: #9ca3af; margin-bottom: 12px;
}
```

### C) Relevante CSS in `<style>`-blok
- `.card` (regel 95-99)
- `.card-label` (regel 100-103)
- `.pair-card` (regel 105-109): kleinere variant `border-radius:12px; padding:12px 14px`
- `.pair-header`, `.pair-av`, `.pair-name`, `.pair-meta` (regel 110-117)
- `.btn-sm`, `.btn-primary`, `.btn-ghost-sm`, `.btn-danger` (regel 120-129)
- **Geen drag/touch CSS** — alleen `pointer-events: none` op `.notif` toast (regel 205)
- **Geen `@keyframes`** in de inline `<style>` — alle animaties via inline `transition`

### D) Script load order (regel 23-33)
```
23: js/utils.js
24: js/roles.js
25: cdn supabase
26: js/supabase.js
27: js/avatar.js
28: js/welcome-overlay.js
29: js/account.js
30: js/buddy.js
31: js/swipes.js
32: js/toast.js
33: js/telemetry.js
```

### E) External CSS
`<link rel="stylesheet" href="css/style.css">` op regel 34. Bron van `--c-buddy-purple`, `--c-cream-warm`, `--c-ink`, `--c-orange-deep`, `--c-green-bg`, `--c-green` etc.

### F) Total line count
**1106 regels** (`wc -l`).

### G) Bestaande CSS animations
**Geen `@keyframes`** definities in de inline `<style>`. Alle animaties zijn inline `transition` op elementen (bijv. `.notif`, `.toggle-sw`, `.btn-sm`, en de buddy-seeker card op regel 853 in JS).

### H) CSS-variabelen / `:root`
**Geen `:root` definitie** in buddy-dashboard.html. Variabelen worden gebruikt met fallback values: `var(--c-cream-warm, #f4f3ef)`, `var(--c-ink, #0d1520)`, etc. Definities zitten in `css/style.css` (extern). Specifieke buddy-vars: `--c-buddy-purple`, `--c-buddy-purple-bg`, `--c-buddy-purple-light`.

---

## js/swipes.js

### A) Total line count
**191 regels** (`wc -l`).

### B) Functies (met regelnummers)
| Naam | Regel | Beschrijving |
|---|---|---|
| `formatRelativeDate` | 10 | Lokale helper "vandaag/gisteren/N dagen geleden" |
| `fetchIncomingLikes` | 22 | SELECT swipes WHERE target_id=user, direction='like' |
| `renderIncomingLikeCard` | 40 | Renders inbox-card met Accepteren/Overslaan buttons |
| `removeCard` | 83 | Fade-out een card-element + verberg sectie als leeg |
| `swipesAcceptLike` (window) | 101 | INSERT counter-swipe `direction:'like'` (matches) |
| `swipesPassLike` (window) | 134 | Card removeCard + INSERT `direction:'pass'` |
| `reloadIncomingLikes` (window) | 158 | Public reloader voor sectie |

### C) Drag/touch/swipe gesture code?
**NEE** — geen pointerdown/touchstart/mousedown handlers. Alleen `onclick` op buttons.

### D) Card stacking/positioning?
**NEE** — pure lijst. `display:flex` op de horizontale row van avatar+naam+buttons. Geen z-index, geen `position:absolute` op cards.

### E) Element IDs
- `incoming-likes-list` (container voor cards)
- `incoming-likes-section` (wrapping section, voor show/hide)
- `ilc-<likeId>` (per kaart, voor remove)

### F) Bruikbaar voor swipe deck?
**PARTIAL — alleen het card-fade-pattern is herbruikbaar**, niet de gesture-laag.

| Onderdeel | Bruikbaar? | Waarvoor |
|---|---|---|
| `removeCard()` (regel 83-97) | JA | Fade-out na deck-actie |
| `formatRelativeDate()` (regel 10) | JA | Datum-display in deck |
| `renderIncomingLikeCard()` HTML | JA als template-startpunt | Niet 1-op-1 — deck heeft grotere card |
| Swipes-tabel insert (Accept/Pass) | NEE in deze flow | buddy-deck zou `buddy_requests` schrijven, niet `swipes` |
| Drag/swipe gestures | n/a — bestaan niet | Volledig nieuw te bouwen |
| Card-stack/positioning | n/a — bestaat niet | Volledig nieuw te bouwen |

**Conclusie**: js/swipes.js is een **inbox-renderer**, geen swipe-deck. Voor een deck moet je drag/release/threshold-detectie volledig nieuw schrijven. Eventueel het fade-pattern hergebruiken bij dismiss.

---

## Style reference (buddy-pair card — regel 624-643 in buddy-dashboard.html)

```html
<div class="pair-card">
  <div class="pair-header">
    <div class="pair-av">${init}</div>
    <div>
      <div class="pair-name">${escapeHtml(p.name)}</div>
      <div class="pair-meta">Buddy-koppeling · ${escapeHtml(p.type)}</div>
    </div>
  </div>
  ${!isAnon ? `
  <div class="buddy-context">
    <div class="bc-name">${escapeHtml(p.name)}</div>
    <div class="bc-meta">${opleiding} · ${bedrijf}</div>
    <div class="bc-date">Gekoppeld sinds ${datum}</div>
  </div>` : ''}
  <div class="pair-actions">
    ${!isAnon ? `<button class="btn-sm btn-primary" onclick="openChat('${pairId}')">Stuur bericht</button>` : ''}
    <button class="btn-sm btn-danger" onclick="endPair('${pairId}')">Beëindigen</button>
  </div>
</div>
```

**Style-tokens** (uit CSS, regel 105-118):
- bg `#fff`, border `1px solid rgba(15,17,23,.09)`, border-radius `12px`, padding `12px 14px`, margin-bottom `8px`
- avatar 36×36, border-radius 50%, paarse bg `--c-buddy-purple-bg`, paarse fg `--c-buddy-purple`, font-size 13px, font-weight 600
- naam 13px / 500 / `#0d1520`
- meta 11px / `#9ca3af`
- gap 10px tussen avatar en tekst
- knop-row gap 6px, flex-wrap

**De huidige seeker-card (regel 848-955 in buddy.js) is grotere variant**: padding 16-18px, border-radius 14px, avatar 44×44 met groene gradient (`#1a7a48 → #0f5c36`), buttons paars gradient `#7c3aed → #6d28d9`. Voor consistentie kan een deck-card de pair-card-stijl volgen, met grotere padding.

---

## Data available for swipe card

### Columns fetched (uit `fetchBuddySeekers`)
```
profile_id, naam, opleiding, school, jaar,
beschikbaar_vanaf, opdracht_domein, motivatie,
skills, avatar_key, avatar_url, sector, niveau
```

### Skills type
**JSONB** (per migration `internly_migration.sql:35` — kolom `skills jsonb`). In de huidige render (regel 838-840) wordt het behandeld als array:
```js
const skills = Array.isArray(student.skills)
  ? student.skills.slice(0, 4)
  : [];
```
Per skill een check op string vs object: `typeof s === 'string' ? s : s?.naam || s?.name || String(s)` (regel 926-927).

### avatar_key fetched
**JA** — `avatar_key, avatar_url` zitten in de SELECT (regel 800).

⚠️ Maar: per AVATAR_MIGRATION audit was de migratie nog niet uitgevoerd. Als `avatar_key` kolom in DB ontbreekt → SELECT fout. Status: kolom bestaat OF `fetchBuddySeekers` kan een 400-error geven.

### motivatie fetched
**JA** — staat in SELECT (regel 799) en wordt gerenderd met 2-line clamp (regel 888-894).

### Filter chain
```js
.eq('zoekt_buddy', true)   // alleen studenten die opt-in hebben
.limit(30)                 // max 30 candidates per fetch
// post-fetch JS-filter: exclude already-requested students
```

### Max limit
**`.limit(30)`** op regel 803.

---

## Mobile context

### A) `touch-action` anywhere?
**NEE** — niet expliciet gezet in HTML, niet in `<style>`-blok van buddy-dashboard. Body kan dus standaard touch-actions doen. Voor een swipe deck is het verstandig `touch-action: pan-y` op de body en `touch-action: none` op de swipe-card te zetten om verticaal scrollen te behouden maar horizontaal swipen volledig te claimen.

### B) Viewport meta
**JA** — regel 14:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

### C) Pointer-events CSS
- Alleen op `.notif` (toast) op regel 205: `pointer-events: none`. Géén globaal `pointer-events:none` op cards. Veilig voor deck.

### D) Mobile container width
- `.shell` regel 80: `max-width: 760px; margin: 0 auto; padding: 20px 16px 80px;`
- Op mobiel (< 760px): vult de viewport, padding 16px aan zijkanten = effectieve content-breedte ~ 343px op iPhone (375px - 32px).

### E) `.card` padding
`padding: 16px 18px` (regel 98).

---

## RISICO'S VOOR IMPLEMENTATIE

| Risico | Status | Toelichting |
|---|---|---|
| Event listener accumulation | **RISICO** | `loadBuddySeekers()` wordt op realtime UPDATE getriggerd (regel 965/969). Een swipe-deck moet vóór re-render zijn drag-listeners explicit verwijderen, anders stapelen ze op. Mitigatie: `controller = new AbortController()` per render, `signal: controller.signal` op alle addEventListener, `controller.abort()` voor de re-render. |
| CSS variabel-conflict | **GEEN** | Alle gebruikte variabelen (`--c-buddy-purple*`, `--c-ink*`) zijn pre-existing. Nieuwe deck-CSS kan brand-tokens hergebruiken. |
| Z-index conflicts | **MOGELIJK** | `.notif` toast = `z-index: 9999` (regel 203), welcome-overlay = `z-index: 9900` (welcome-overlay.js). Deck-cards moeten **lager** dan toast/overlay (bijv. `z-index: 10-100`). |
| Font loading dependency | **GEEN** | Bricolage Grotesque + Outfit zijn al via `<link>` regel 22 geladen. Wel: `rel="stylesheet"` zonder `font-display:swap` — bij eerste-render kan FOIT optreden. Niet specifiek voor deck. |
| Dubbele DB-INSERT bij snel swipen | **RISICO** | `buddyRequestStudent` heeft een `btn.disabled = true`-guard, maar bij gestures zonder button moet je een `_pending` flag bijhouden om dubbele clicks te voorkomen. |
| `avatar_key` SELECT-fout | **MOGELIJK** | Als AVATAR_MIGRATION.sql niet draait, faalt de hele `fetchBuddySeekers` SELECT met 400. Mitigatie: try/catch + fallback SELECT zonder avatar_key kolommen. |
| Realtime cascade | **MOGELIJK** | Realtime trigger op `buddy_requests` herlaadt seekers (`loadBuddySeekers`) elke INSERT. Een swipe → INSERT → reload → reset deck. Mitigatie: bij INSERT van eigen request niet reloaden, of de huidige deck-positie behouden. |
| Touch-action conflict | **GEEN** (initieel) | Geen globale `touch-action` op page. Deck kan vrij `touch-action: none` op zijn cards zetten. |
| Z-index van #buddy-seekers-section | n/a | Sectie zit in normale flow, geen positioning. Veilig voor stacking-context binnen de deck-container. |
| Input-events onder welcome-overlay | **POTENTIEEL** | Bij eerste login zit welcome-overlay over de pagina. Deck-init moet niet gebeuren als overlay open is, anders ontvangt de deck onbedoeld touch events na dismiss. Mitigatie: init in `requestAnimationFrame` na page-load én de overlay heeft `pointer-events: none` (alleen op klik buiten dialog wordt gedismist). |

---

## SAMENVATTING

- **Huidige UX is een lijst met buttons**, geen swipe-deck. 30 seekers worden ineens gerenderd, één voor één afhandelen via `Buddy worden` / `Overslaan` buttons.
- **Geen bestaande gesture-handlers** in buddy.js of swipes.js — een swipe-deck is een nieuwe laag bovenop het bestaande data-pad.
- **Bestaande data is rijk genoeg**: naam, opleiding, school, jaar, motivatie, skills, opdracht_domein, sector, beschikbaar_vanaf, niveau, avatar_key — voldoende voor een grote deck-card.
- **Bestaande actie-functies (`buddyRequestStudent`, `buddySkipStudent`) zijn herbruikbaar** als deck-end-callbacks; ze hoeven niet gewijzigd te worden.
- **Realtime-trigger op buddy_requests** moet gerespecteerd worden — niet onbedoeld de deck resetten bij elke INSERT.
- **Architecturele aanbeveling**: nieuwe `buddyDeck.init(students)` functie die een gestack'd kaartje rendert, gestures afhandelt, en bij commit `buddyRequestStudent` of `buddySkipStudent` aanroept (bestaande logica).
