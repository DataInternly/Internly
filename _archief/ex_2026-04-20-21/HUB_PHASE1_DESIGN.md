# HUB_PHASE1_DESIGN.md — hub.html Fase 1: Leerdoelen-invoer

> Design-only document. Geen codewijzigingen.
> Datum: 20 april 2026 | Status: CONCEPT

---

## 1. Samenvatting in 3 regels

Fase 1 geeft de student een werkruimte om maximaal 5 SMART-gestructureerde leerdoelen te formuleren vóórdat ze matchen met een bedrijf. Leerdoelen worden opgeslagen als JSONB-array in `student_profiles.leerdoelen`. De pagina heeft geen externe afhankelijkheden buiten de bestaande Supabase-client — geen nieuwe Edge Functions, geen nieuwe tabellen.

---

## 2. Data-model

### Kolom

| Tabel             | Kolom       | Type    | Default | Nullable |
|-------------------|-------------|---------|---------|----------|
| `student_profiles`| `leerdoelen`| `jsonb` | `'[]'`  | ja       |

De kolom bestaat nog niet. Vereiste SQL (eenmalig uitvoeren in Supabase SQL Editor):

```sql
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS leerdoelen jsonb NOT NULL DEFAULT '[]'::jsonb;
```

### Schema per leerdoel (één object in de array)

```json
{
  "id":          "uuid-string",
  "titel":       "string (max 120 tekens)",
  "specifiek":   "string (max 280 tekens, optioneel)",
  "meetbaar":    "string (max 280 tekens, optioneel)",
  "deadline":    "YYYY-MM-DD | null",
  "aangemaakt":  "ISO-8601 timestamp"
}
```

**Waarom JSONB in student_profiles?**
- Geen nieuwe tabel, geen nieuwe RLS-policies.
- De array is klein (max 5 items) en wordt altijd als geheel gelezen/geschreven.
- Past bij hoe `skills` ook als array-kolom werkt in dezelfde tabel.

**Grenzen**
- Maximum 5 leerdoelen per student.
- `titel` is verplicht; de rest optioneel.
- Maximale array-grootte in de DB is technisch ongelimiteerd — de limiet wordt client-side gehandhaafd.

---

## 3. SMART-sjabloon (vereenvoudigd)

Volledige SMART is te complex voor Fase 1. We gebruiken een afgeslankt model:

| Veld        | SMART-letter | Omschrijving                                       | Verplicht |
|-------------|-------------|---------------------------------------------------|-----------|
| `titel`     | S           | Één zin: wat wil je leren?                        | ja        |
| `specifiek` | S+M         | Hoe weet je dat je het bereikt hebt?              | nee       |
| `meetbaar`  | M+R         | Welk concreet resultaat of bewijs lever je op?    | nee       |
| `deadline`  | T           | Wanneer is dit leerdoel af?                       | nee       |

`Acceptabel` en `Realistisch` worden niet als aparte velden gevraagd — ze zitten impliciet in de titel + de vraag "hoe weet je dat je het bereikt hebt?". Dit houdt het formulier toegankelijk.

**Placeholder-teksten (NL)**

| Veld        | Placeholder                                                          |
|-------------|----------------------------------------------------------------------|
| `titel`     | Bijv. "Ik leer hoe ik klantonderzoek opzet en uitvoert"              |
| `specifiek` | Bijv. "Ik kan zelfstandig een vragenlijst maken en 5 interviews afnemen" |
| `meetbaar`  | Bijv. "Ik lever een onderzoeksrapport op met aanbevelingen"          |
| `deadline`  | (datumveld, geen placeholder nodig)                                  |

---

## 4. Formulier-layout (ASCII)

```
┌─────────────────────────────────────────────────────┐
│  Mijn Stage Hub                                     │
│  Plan je leerdoelen vóór je matcht.                 │
│                                                     │
│  ── Mijn leerdoelen (3/5) ─────────────────────── │
│                                                     │
│  ┌─ Leerdoel 1 ──────────────────────────────── ─┐ │
│  │  [titel als heading]                           │ │
│  │  Specifiek: ...                                │ │
│  │  Meetbaar: ...                                 │ │
│  │  Deadline: 01-06-2026                          │ │
│  │  [Bewerk]  [Verwijder]                         │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ Leerdoel 2 ───────────────────────────────── ─┐ │
│  │  ...                                           │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ Nieuw leerdoel toevoegen ─────────────────── ─┐ │
│  │  Titel *  [________________________________]   │ │
│  │  Hoe weet je dat je het bereikt hebt?          │ │
│  │           [________________________________]   │ │
│  │  Concreet resultaat of bewijs                  │ │
│  │           [________________________________]   │ │
│  │  Deadline  [datum]                             │ │
│  │                                                │ │
│  │  [Annuleer]              [Leerdoel opslaan]    │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  [+ Leerdoel toevoegen]  (verborgen als 5/5)       │
│                                                     │
│  [Leerdoelen opslaan]                              │
└─────────────────────────────────────────────────────┘
```

**Toelichtingen layout**
- De leerdoel-kaarten staan boven het "nieuw toevoegen"-formulier.
- Het formulier is standaard verborgen; `[+ Leerdoel toevoegen]` toont het.
- Bij "Bewerk" vult het formulier zich met de bestaande waarden (in-place edit).
- "Annuleer" sluit het formulier en reset de invoervelden.
- `[Leerdoelen opslaan]` is de enige DB-schrijfactie (geen auto-save).
- Teller `(3/5)` naast de kopsectie houdt de limiet zichtbaar.

---

## 5. UI-componenten (HTML-snippets)

### 5a. Leerdoel-kaart (weergave-modus)

```html
<div class="card leerdoel-card" data-id="{{id}}">
  <div class="card-head">
    <span class="leerdoel-nr">Leerdoel {{n}}</span>
    <div class="leerdoel-actions">
      <button class="btn btn-sm btn-ghost" onclick="editLeerdoel('{{id}}')">Bewerk</button>
      <button class="btn btn-sm btn-ghost btn-ghost--danger" onclick="deleteLeerdoel('{{id}}')">Verwijder</button>
    </div>
  </div>
  <p class="leerdoel-titel">{{titel}}</p>
  <div class="leerdoel-meta" id="ld-meta-{{id}}">
    <!-- alleen tonen als veld gevuld is -->
    <p class="leerdoel-meta-item"><span class="meta-label">Hoe bereik je het?</span> {{specifiek}}</p>
    <p class="leerdoel-meta-item"><span class="meta-label">Bewijs/resultaat</span> {{meetbaar}}</p>
    <p class="leerdoel-meta-item"><span class="meta-label">Deadline</span> {{deadline_nl}}</p>
  </div>
</div>
```

### 5b. Formulier (toevoegen / bewerken)

```html
<div class="card" id="ld-form-card" hidden>
  <h3 class="card-title" id="ld-form-title">Nieuw leerdoel</h3>

  <div class="field">
    <label for="ld-titel">Wat wil je leren? <span class="req">*</span></label>
    <input type="text" id="ld-titel" maxlength="120"
           placeholder="Bijv. 'Ik leer hoe ik klantonderzoek opzet en uitvoert'">
    <div class="char-count" id="ld-titel-count">0 / 120</div>
  </div>

  <div class="field">
    <label for="ld-specifiek">Hoe weet je dat je het bereikt hebt?
      <span class="hint">(optioneel)</span>
    </label>
    <textarea id="ld-specifiek" maxlength="280" rows="2"
              placeholder="Bijv. 'Ik kan zelfstandig een vragenlijst maken en 5 interviews afnemen'"></textarea>
  </div>

  <div class="field">
    <label for="ld-meetbaar">Concreet resultaat of bewijs
      <span class="hint">(optioneel)</span>
    </label>
    <textarea id="ld-meetbaar" maxlength="280" rows="2"
              placeholder="Bijv. 'Ik lever een onderzoeksrapport op met aanbevelingen'"></textarea>
  </div>

  <div class="field">
    <label for="ld-deadline">Deadline <span class="hint">(optioneel)</span></label>
    <input type="date" id="ld-deadline">
  </div>

  <div class="form-nav">
    <button class="btn btn-ghost" id="ld-cancel-btn" type="button">Annuleer</button>
    <button class="btn btn-primary" id="ld-save-btn" type="button">Leerdoel opslaan</button>
  </div>
</div>
```

### 5c. Actiebalk onderaan

```html
<div class="hub-actions">
  <button class="btn btn-ghost" id="ld-add-btn" type="button">
    + Leerdoel toevoegen
  </button>
  <button class="btn btn-primary btn-md" id="ld-persist-btn" type="button" disabled>
    Leerdoelen opslaan
  </button>
</div>
```

**Knop-staten `#ld-persist-btn`**

| State        | Attribuut         | Tekst                  |
|--------------|-------------------|------------------------|
| Geen wijziging | `disabled`      | "Leerdoelen opslaan"   |
| Onopgeslagen wijzigingen | —   | "Leerdoelen opslaan"   |
| Bezig met opslaan | `disabled` | "Opslaan…"             |
| Opgeslagen   | `disabled`        | "Opgeslagen ✓" (2 sec) |

---

## 6. JavaScript-flow (pseudo-code)

```js
// --- State ---
let _leerdoelen = [];       // in-memory array (kopie van DB)
let _editingId  = null;     // null = nieuw, anders UUID van te bewerken leerdoel
let _dirty      = false;    // true als _leerdoelen afwijkt van DB

// --- Boot ---
async function initHub() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) { window.location.replace('/auth.html'); return; }

  const { data: sp } = await db
    .from('student_profiles')
    .select('bbl_mode, leerdoelen')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (sp?.bbl_mode === true) { window.location.replace('/bbl-hub.html'); return; }

  _leerdoelen = Array.isArray(sp?.leerdoelen) ? sp.leerdoelen : [];
  await renderStudentHeader({ activeTab: 'hub' });
  renderLeerdoelen();
}

// --- Render ---
function renderLeerdoelen() {
  const list = document.getElementById('ld-list');
  list.innerHTML = '';

  if (_leerdoelen.length === 0) {
    list.innerHTML = '<p class="empty-state">Je hebt nog geen leerdoelen. Voeg er hieronder een toe.</p>';
  } else {
    _leerdoelen.forEach((ld, i) => {
      list.insertAdjacentHTML('beforeend', buildLeerdoelCard(ld, i + 1));
    });
  }

  // teller bijwerken
  document.getElementById('ld-count').textContent = `(${_leerdoelen.length}/5)`;

  // "+ toevoegen" verbergen als limiet bereikt
  document.getElementById('ld-add-btn').hidden = (_leerdoelen.length >= 5);
}

// --- Formulier openen (nieuw of bewerken) ---
function openForm(id = null) {
  _editingId = id;
  const card = document.getElementById('ld-form-card');
  const titel = document.getElementById('ld-form-title');

  if (id) {
    const ld = _leerdoelen.find(x => x.id === id);
    document.getElementById('ld-titel').value     = ld.titel;
    document.getElementById('ld-specifiek').value = ld.specifiek || '';
    document.getElementById('ld-meetbaar').value  = ld.meetbaar  || '';
    document.getElementById('ld-deadline').value  = ld.deadline  || '';
    titel.textContent = 'Leerdoel bewerken';
  } else {
    document.getElementById('ld-titel').value     = '';
    document.getElementById('ld-specifiek').value = '';
    document.getElementById('ld-meetbaar').value  = '';
    document.getElementById('ld-deadline').value  = '';
    titel.textContent = 'Nieuw leerdoel';
  }

  card.hidden = false;
  document.getElementById('ld-titel').focus();
}

function closeForm() {
  document.getElementById('ld-form-card').hidden = true;
  _editingId = null;
}

// --- Leerdoel toevoegen/bijwerken in memory ---
function saveLeerdoelLocal() {
  const titel = document.getElementById('ld-titel').value.trim();
  if (!titel) {
    notify('Geef je leerdoel een titel.', false);
    document.getElementById('ld-titel').focus();
    return;
  }

  if (_editingId) {
    const idx = _leerdoelen.findIndex(x => x.id === _editingId);
    _leerdoelen[idx] = {
      ..._leerdoelen[idx],
      titel,
      specifiek:  document.getElementById('ld-specifiek').value.trim() || null,
      meetbaar:   document.getElementById('ld-meetbaar').value.trim()  || null,
      deadline:   document.getElementById('ld-deadline').value         || null,
    };
  } else {
    _leerdoelen.push({
      id:         crypto.randomUUID(),
      titel,
      specifiek:  document.getElementById('ld-specifiek').value.trim() || null,
      meetbaar:   document.getElementById('ld-meetbaar').value.trim()  || null,
      deadline:   document.getElementById('ld-deadline').value         || null,
      aangemaakt: new Date().toISOString(),
    });
  }

  _dirty = true;
  closeForm();
  renderLeerdoelen();
  document.getElementById('ld-persist-btn').disabled = false;
}

// --- Verwijder leerdoel (memory only, nog niet naar DB) ---
function deleteLeerdoel(id) {
  if (!confirm('Dit leerdoel verwijderen?')) return;
  _leerdoelen = _leerdoelen.filter(x => x.id !== id);
  _dirty = true;
  renderLeerdoelen();
  document.getElementById('ld-persist-btn').disabled = false;
}

// --- Opslaan naar DB ---
async function persistLeerdoelen() {
  const btn = document.getElementById('ld-persist-btn');
  btn.disabled = true;
  btn.textContent = 'Opslaan…';

  const { data: { user } } = await db.auth.getUser();

  const { error } = await db
    .from('student_profiles')
    .update({ leerdoelen: _leerdoelen })
    .eq('profile_id', user.id);

  if (error) {
    console.error('[hub] leerdoelen update fout:', error);
    notify('Opslaan mislukt. Probeer opnieuw.', false);
    btn.disabled = false;
    btn.textContent = 'Leerdoelen opslaan';
    return;
  }

  _dirty = false;
  btn.textContent = 'Opgeslagen ✓';
  notify('Leerdoelen opgeslagen.');
  setTimeout(() => {
    btn.textContent = 'Leerdoelen opslaan';
    btn.disabled = true;
  }, 2000);
}
```

---

## 7. Opslag-strategie

| Keuze                        | Beslissing  | Reden                                                   |
|------------------------------|-------------|---------------------------------------------------------|
| Auto-save bij elke wijziging | Nee         | Geeft false sense of security bij netwerkfout           |
| Debounce-save                | Nee         | Leerdoelen zijn geen tekstvak — edit is discrete actie  |
| Expliciete sla-op-knop       | **Ja**      | Consistent met student-profile.html patroon             |
| Optimistic update in UI      | Nee         | Array is klein, latentie is acceptabel                  |
| `.upsert()` of `.update()`   | `.update()` | Row bestaat altijd (gecreëerd bij signup of profiel)    |

De knop is disabled zolang `_dirty === false` om dubbele DB-calls te voorkomen.

---

## 8. Edge cases

| Scenario                          | Gedrag                                                                                   |
|-----------------------------------|------------------------------------------------------------------------------------------|
| Lege titel bij opslaan            | `notify('Geef je leerdoel een titel.', false)`, focus op `#ld-titel`, write blocked     |
| Meer dan 5 leerdoelen             | `[+ toevoegen]`-knop verborgen; extra push() nooit mogelijk via UI                      |
| Netwerkfout bij persist           | `notify('Opslaan mislukt. Probeer opnieuw.', false)`, knop terug naar actief            |
| Gebruiker navigeert weg met dirty | `beforeunload` event: browser-native waarschuwing (`event.returnValue = ''`)            |
| `leerdoelen`-kolom nog NULL in DB | `Array.isArray(sp?.leerdoelen)` check, fallback naar `[]`                               |
| Student heeft geen row in tabel   | `.update()` raakt 0 rows — geen error, maar ook geen save; afvangen met rowCount check  |
| `hub_visibility`-veld ontbreekt   | Niet geblokt: zichtbaarheid per leerdoel is Fase 2, veld hoeft nu nog niet te bestaan  |
| Lege state (0 leerdoelen)         | Toon empty-state bericht: "Je hebt nog geen leerdoelen. Voeg er hieronder een toe."      |

**Speciaal: rowCount check na `.update()`**

```js
const { data, error, count } = await db
  .from('student_profiles')
  .update({ leerdoelen: _leerdoelen })
  .eq('profile_id', user.id)
  .select('profile_id');  // geeft rij terug als hij bestaat

if (!error && (!data || data.length === 0)) {
  // Row bestaat niet — stuur door naar profiel aanmaken
  notify('Maak eerst je profiel aan.', false);
  setTimeout(() => window.location.replace('/student-profile.html'), 2000);
  return;
}
```

---

## 9. Toegankelijkheid en mobiel

**Toegankelijkheid**
- Elke kaart heeft een unieke `data-id` — screenreaders kunnen de delete-actie koppelen.
- `aria-label="Verwijder leerdoel: {{titel}}"` op de verwijder-knop (dynamisch ingevuld in `buildLeerdoelCard`).
- Focus gaat naar `#ld-titel` bij openen formulier.
- Focus gaat terug naar `#ld-add-btn` na sluiten formulier (`closeForm()` roept `.focus()` aan).
- `:focus-visible` stijl al aanwezig in style.css (lijn ~200 in student-profile.html inline style — zit ook in style.css via `--green` outline).

**Mobiel**
- `.field-row` grid collapse al in student-profile.html op `max-width:520px`.
- Leerdoel-kaarten zijn `width:100%` — geen grid nodig.
- `[+ Leerdoel toevoegen]` en `[Leerdoelen opslaan]` staan in een flex-row die wrappen bij `<480px`.
- Datumveld `type="date"` toont native date-picker op iOS/Android.

---

## 10. Wat NIET in Fase 1 zit

| Feature                               | Reden uitstel                                               |
|---------------------------------------|-------------------------------------------------------------|
| `hub_visibility` per leerdoel         | Kolom bestaat niet; schema nog niet ontworpen               |
| Onderzoeksvraag-blok                  | Aparte Fase 2 — heeft eigen velden en eigen UI              |
| Export (PDF, CSV)                     | Stub in company-dashboard, niet relevant voor student-kant  |
| Delen met bedrijf of school           | Wacht op `hub_visibility` + permissie-model                 |
| Koppeling met `stage_leerdoelen`-tabel | Tabel bestaat nog niet; dit is post-match koppeling        |
| Realtime sync                         | Niet nodig — enkelvoudige gebruiker                         |
| Leerdoelen sorteren (drag-and-drop)   | Over-engineering voor max 5 items                           |
| Voortgang per leerdoel (%)            | Hoort bij evaluatie-flow (sprint 6+)                        |

---

## 11. Tijdschatting per sub-taak

| Sub-taak                                                        | Uur  |
|-----------------------------------------------------------------|------|
| SQL-migratie uitvoeren (1 ALTER TABLE commando)                 | 0.1  |
| hub.html: placeholder vervangen door echte layout (HTML+CSS)    | 1.0  |
| JavaScript: state, renderLeerdoelen, openForm, closeForm         | 1.0  |
| JavaScript: saveLeerdoelLocal, deleteLeerdoel, persistLeerdoelen | 0.75 |
| JavaScript: char-count listener op `#ld-titel`                  | 0.25 |
| JavaScript: beforeunload guard                                  | 0.25 |
| JavaScript: rowCount edge case afvangen                         | 0.25 |
| Toegankelijkheid: aria-labels, focus-management                 | 0.5  |
| Smoke-test in browser (zie sectie 12)                           | 0.5  |
| **Totaal**                                                      | **4.6 uur** |

---

## 12. Smoke-test scenarios

Alle scenario's draaien als ingelogde BOL-student (`student@internly.pro`, ID `65ed548f`).

| #  | Stap                                                       | Verwacht resultaat                                       |
|----|------------------------------------------------------------|----------------------------------------------------------|
| 1  | Open `/hub.html` terwijl uitgelogd                         | Redirect naar `/auth.html`                               |
| 2  | Open `/hub.html` als BBL-student                           | Redirect naar `/bbl-hub.html`                            |
| 3  | Open `/hub.html` als BOL-student                           | Header getoond, "Mijn Stage Hub" tab actief, 0 leerdoelen → empty state |
| 4  | Klik `[+ Leerdoel toevoegen]`                              | Formulier verschijnt, focus op titel-veld               |
| 5  | Klik `[Leerdoel opslaan]` met leeg titel-veld              | Toast "Geef je leerdoel een titel.", veld krijgt focus   |
| 6  | Vul titel in, klik `[Leerdoel opslaan]`                    | Formulier sluit, kaart verschijnt in lijst, teller 1/5  |
| 7  | Klik `[Leerdoelen opslaan]`                                | DB-update succesvol, toast "Leerdoelen opgeslagen.", knop toont ✓ |
| 8  | Voeg 5 leerdoelen toe                                      | `[+ Leerdoel toevoegen]` verdwijnt na 5e leerdoel       |
| 9  | Klik `[Bewerk]` op leerdoel 1                              | Formulier opent met bestaande waarden ingevuld           |
| 10 | Pas titel aan, klik `[Leerdoel opslaan]`                   | Kaart in lijst toont nieuwe titel                        |
| 11 | Klik `[Leerdoelen opslaan]`                                | DB bijgewerkt, toast zichtbaar                           |
| 12 | Klik `[Verwijder]` op een leerdoel, bevestig               | Kaart verdwijnt, teller daalt                            |
| 13 | Verwijder alle leerdoelen, sla op                          | Empty state zichtbaar, DB heeft `[]`                     |
| 14 | Voeg leerdoel toe, navigeer weg zónder op te slaan         | Browser toont native "Wijzigingen gaan verloren" dialoog |
| 15 | Navigeer weg ná opslaan                                    | Geen browser-waarschuwing                                |
| 16 | Herlaad pagina na opslaan                                  | Opgeslagen leerdoelen laden correct uit DB               |
| 17 | Simuleer netwerkfout (DevTools offline)                    | Toast "Opslaan mislukt. Probeer opnieuw.", knop actief   |

---

*Document klaar. Geen bestanden gewijzigd.*
