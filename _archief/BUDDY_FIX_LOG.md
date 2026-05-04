# BUDDY DASHBOARD FIX LOG — 1 mei 2026

Twee bugs uit de read-only diagnose verholpen.

## FIX 1 — `buddy-seekers-section` altijd zichtbaar

### Bug
Sectie "Studenten die een buddy zoeken" verscheen **alleen** als
`fetchBuddySeekers()` minstens 1 student terugbracht. Bij een lege
result-set bleef de sectie verborgen — buddies wisten niet dat de
match-functie überhaupt bestond.

### Fix 1A — js/buddy.js — `loadBuddySeekers`

**Voor** ([js/buddy.js:929-933](js/buddy.js#L929-L933) vóór wijziging):
```js
if (students.length === 0) {
  if (empty) empty.style.display = '';
  // Keep section hidden if empty
  return;
}
```

**Na** ([js/buddy.js:977-982](js/buddy.js#L977-L982)):
```js
if (students.length === 0) {
  if (empty) empty.style.display = '';
  section.style.display = '';
  // Toon altijd — buddy weet dat studenten hier verschijnen
  return;
}
```

Eén regel toegevoegd — sectie wordt nu zichtbaar gemaakt vóór de
early return bij lege list. Empty-state UI staat al klaar in HTML
(`#buddy-seekers-empty`).

### Fix 1B — buddy-dashboard.html — empty-state copy

**Voor** ([buddy-dashboard.html:334-342](buddy-dashboard.html#L334-L342) vóór wijziging):
```
🎓
Geen studenten zoeken op dit moment een buddy.
Kom later terug.
```

**Na** ([buddy-dashboard.html:334-343](buddy-dashboard.html#L334-L343)):
```
🎓
Op dit moment zoeken er nog geen studenten een buddy.
Zodra een student zich aanmeldt verschijnt die hier
automatisch — kom later terug of houd je profiel actief.
```

Copy is uitnodigender — geeft uitleg over de feature en context
ipv een dead-end melding. De buddy ziet meteen waar deze sectie
voor dient, óók wanneer er nog geen studenten zijn.

---

## FIX 2 — Profiel opslaan → overzichtsweergave

### Bug
`saveBuddyProfile()` toonde alleen een toast (`'Profiel bijgewerkt!'`)
en liet het bewerk-formulier ingevuld staan. Geen visuele bevestiging
dat het profiel als read-only "gepubliceerd" was. Andere dashboards
(company / school / begeleider) hebben wél een overzicht-pattern.

### Fix 2A — Structuur ingelezen
- [js/buddy.js:660-740](js/buddy.js#L660-L740) — loadBuddyProfile, populateBuddyProfile, collectBuddyProfileData, saveBuddyProfile
- [buddy-dashboard.html:357-464](buddy-dashboard.html#L357-L464) — `<div class="card">` met `<form id="buddy-profile-form">`
- [buddy-dashboard.html:1041](buddy-dashboard.html#L1041) — `await loadBuddyProfile();` in init

### Fix 2B — js/buddy.js — toggle functies toegevoegd

**Nieuw** ([js/buddy.js:721-766](js/buddy.js#L721-L766)) — vóór `saveBuddyProfile`:
```js
function showBuddyOverzicht(data) {
  const formCard      = document.getElementById('buddy-profile-form-card');
  const overzichtCard = document.getElementById('buddy-profile-overzicht');
  const body          = document.getElementById('buddy-overzicht-body');
  if (!formCard || !overzichtCard || !body) return;

  const kgArr = Array.isArray(data?.kennis_gebieden) ? data.kennis_gebieden : [];
  const spArr = Array.isArray(data?.specialiteiten)  ? data.specialiteiten  : [];
  const kg    = kgArr.length ? kgArr.map(escapeHtml).join(', ') : '—';
  const sp    = spArr.length ? spArr.map(escapeHtml).join(', ') : '—';
  const gbd   = data?.grove_beschikbaarheid || '—';
  const stad  = data?.stad || '—';
  const pc    = data?.postcode || '';
  const leef  = data?.leeftijd != null ? String(data.leeftijd) : '—';
  const act   = data?.active === false
    ? 'Niet zichtbaar voor studenten'
    : 'Zichtbaar voor studenten';

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;
      gap:10px;font-size:.88rem;line-height:1.55">
      <div><strong>Kennisgebieden:</strong> ${kg}</div>
      <div><strong>Specialiteiten:</strong> ${sp}</div>
      <div><strong>Beschikbaarheid:</strong>
        ${escapeHtml(gbd)}</div>
      <div><strong>Woonplaats:</strong>
        ${escapeHtml(stad)}${pc ? ' (' + escapeHtml(pc) + ')' : ''}</div>
      <div><strong>Leeftijd:</strong>
        ${escapeHtml(leef)}</div>
      <div><strong>Status:</strong> ${act}</div>
    </div>`;

  formCard.style.display      = 'none';
  overzichtCard.style.display = '';
}

function showBuddyForm() {
  const formCard      = document.getElementById('buddy-profile-form-card');
  const overzichtCard = document.getElementById('buddy-profile-overzicht');
  if (!formCard || !overzichtCard) return;
  overzichtCard.style.display = 'none';
  formCard.style.display      = '';
}
```

Alle user-content (`stad`, `gbd`, `kg`, `sp`, …) gaat door
`escapeHtml()` — geen XSS-vector op het overzicht.

### Fix 2C — js/buddy.js — `saveBuddyProfile` aangepast

**Voor**:
```js
notify('Profiel bijgewerkt!', true);
}
```

**Na** ([js/buddy.js:787-789](js/buddy.js#L787-L789)):
```js
notify('Profiel bijgewerkt!', true);
showBuddyOverzicht(formData);
}
```

Eén regel toegevoegd. `formData` bevat exact het object dat
`collectBuddyProfileData()` net heeft samengesteld — dus de
zojuist opgeslagen state.

### Fix 2D — buddy-dashboard.html — overzicht-card + init-call

**Toegevoegd vóór de form-card** ([buddy-dashboard.html:357-365](buddy-dashboard.html#L357-L365)):
```html
<!-- ── Mijn profiel — overzicht (na opslaan) ── -->
<div class="card" id="buddy-profile-overzicht" style="display:none">
  <div class="card-label">Mijn profiel</div>
  <div id="buddy-overzicht-body"></div>
  <button type="button" class="profile-save-btn"
    onclick="showBuddyForm()" style="margin-top:18px;">
    Profiel bewerken
  </button>
</div>
```

**Form-card heeft `id` gekregen** ([buddy-dashboard.html:368](buddy-dashboard.html#L368)):
```html
<div class="card" id="buddy-profile-form-card">
```

**Init-flow** ([buddy-dashboard.html:1051-1060](buddy-dashboard.html#L1051-L1060)):

**Voor**:
```js
// 5. Buddy-profiel laden (buddy_profiles tabel) + naam zichtbaar maken
await loadBuddyProfile();
```

**Na**:
```js
// 5. Buddy-profiel laden (buddy_profiles tabel) + naam zichtbaar maken
const bpRow = await loadBuddyProfile();
const bpFilled = !!bpRow && (
  (Array.isArray(bpRow.kennis_gebieden) && bpRow.kennis_gebieden.length > 0) ||
  (Array.isArray(bpRow.specialiteiten)  && bpRow.specialiteiten.length  > 0) ||
  !!bpRow.grove_beschikbaarheid
);
if (bpFilled && typeof showBuddyOverzicht === 'function') {
  showBuddyOverzicht(bpRow);
}
```

`loadBuddyProfile()` retourneert nu de `bp` rij (zie kleine
aanpassing hieronder). Een profiel telt als "ingevuld" zodra
**één** van kennis_gebieden / specialiteiten / grove_beschikbaarheid
gezet is — andere velden (postcode, stad, leeftijd) zijn optioneel
en triggeren niet vanzelf de overzicht-modus.

### Fix 2E — js/buddy.js — `loadBuddyProfile` retourneert nu bp

**Voor**:
```js
async function loadBuddyProfile() {
  const form = document.getElementById('buddy-profile-form');
  if (!form) return;
  …
  if (bp) populateBuddyProfile(form, bp);
}
```

**Na** ([js/buddy.js:662-682](js/buddy.js#L662-L682)):
```js
async function loadBuddyProfile() {
  const form = document.getElementById('buddy-profile-form');
  if (!form) return null;
  …
  if (bp) populateBuddyProfile(form, bp);
  return bp;
}
```

Drie `return null` toegevoegd op error/early-return paden + `return bp`
aan het eind. Geen breaking change voor bestaande callers — die
negeerden de return value (die was `undefined`).

### Window exports

**Toegevoegd onderaan js/buddy.js** ([js/buddy.js:1109-1111](js/buddy.js#L1109-L1111)):
```js
// ── Window exports — profiel toggle ────────────────────
window.showBuddyOverzicht = showBuddyOverzicht;
window.showBuddyForm      = showBuddyForm;
```

`showBuddyForm` wordt aangeroepen vanuit een inline `onclick` op de
"Profiel bewerken" knop, dus móet op `window`. `showBuddyOverzicht`
wordt aangeroepen vanuit het inline init-script in
buddy-dashboard.html, idem.

---

## Loop-shield grep verificatie

```
grep "function notify("       js/*.js  → 1 match (utils.js)        ✓
grep "function escapeHtml("   js/*.js  → 1 match (utils.js)        ✓
grep "const SUPABASE_URL"     js/*.js  → 1 match (supabase.js)     ✓
```

Geen nieuwe duplicaten geïntroduceerd.

---

## Wat de buddy nu ziet

**Eerste bezoek (leeg profiel):**
1. Match-sectie zichtbaar met empty-state copy
2. Profiel-formulier zichtbaar
3. Overzicht-card hidden

**Na opslaan:**
1. Toast `'Profiel bijgewerkt!'`
2. Form-card hidden
3. Overzicht-card zichtbaar met read-only weergave + "Profiel bewerken" knop

**Volgend bezoek (profiel al ingevuld):**
1. `loadBuddyProfile()` haalt bp op + vult formulier
2. Init detecteert `bpFilled === true`
3. `showBuddyOverzicht(bpRow)` schakelt direct naar overzicht-mode

**Profiel bewerken:**
1. Klik "Profiel bewerken" → `showBuddyForm()`
2. Form-card zichtbaar met al ingevulde waarden (uit populate)
3. Wijzig → opslaan → terug naar overzicht

---

## Schema-aanname (geen wijziging vereist)

`buddy_profiles` tabel kolommen die we lezen/schrijven:
`profile_id, kennis_gebieden, specialiteiten, grove_beschikbaarheid,
postcode, stad, leeftijd, active, avatar_key`.

`avatar_key` op `buddy_profiles` is in de oorspronkelijke
AVATAR_MIGRATION schema-drift kwestie — wordt geschreven via
`saveBuddyProfile()` maar zit niet in de SELECT van
`loadBuddyProfile()`. Dat is een aparte open kwestie (zie
backlog) en valt buiten deze twee fixes.
