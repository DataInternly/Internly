# BEDRIJF-FLOW FIX LOG
**Datum** 2026-05-04 · **Diagnose-bron** BEDRIJF_FLOW_DIAGNOSE.md · **Standing order** Picard2 + Hotch2 + Tom Bomba

Per run: gedaan, niet gedaan, en waarom. Stop tussen runs op Barry's "ga door".

---

## Run 1 — Items 7 + 12

### Item 7 — Wit-op-wit header

- **Status** Gefixt
- **Bestand** [company-dashboard.html:574](company-dashboard.html#L574)
- **Regel 574 voor**
  ```html
  <a href="company-dashboard.html" class="topbar-link" style="color:#fff">Dashboard</a>
  ```
- **Regel 574 na**
  ```html
  <a href="company-dashboard.html" class="topbar-link" style="color:var(--ink);font-weight:600">Dashboard</a>
  ```
- **Reden** Behoudt de actieve-state suggestie (Dashboard is de huidige pagina) zonder onleesbare witte tekst op de cream achtergrond (`.topbar { background: rgba(244,243,239,.92); }` op regel 99). De `var(--ink)`-kleur is donker en consistent met de andere `.topbar-link`-elementen die `var(--ink2)` gebruiken; `font-weight:600` markeert hem visueel als actief.

### Item 12 — Pricing-anchors voor bedrijf-CTAs

- **Aantal regels gepatcht** 8 (alle in [company-dashboard.html](company-dashboard.html))
- **Methode** Twee `replace_all`-edits:
  - `'pricing.html'` → `'pricing.html#section-bedrijf'` (5 onclicks)
  - `href="pricing.html"` → `href="pricing.html#section-bedrijf"` (3 anchor-links)

| Regel | Element | Oude bestemming | Nieuwe bestemming |
|---|---|---|---|
| 714  | "Abonnement" sidebar-knop      | `'pricing.html'`     | `'pricing.html#section-bedrijf'` |
| 1556 | "Bekijk abonnementen" upgradeCard | `'pricing.html'`     | `'pricing.html#section-bedrijf'` |
| 1665 | "Upgraden →" verify-banner     | `'pricing.html'`     | `'pricing.html#section-bedrijf'` |
| 1681 | "Upgraden →" matches-gating    | `'pricing.html'`     | `'pricing.html#section-bedrijf'` |
| 1786 | "Upgraden →" sollicitatie-quota | `'pricing.html'`     | `'pricing.html#section-bedrijf'` |
| 3185 | "Upgraden naar Pro →"          | `href="pricing.html"` | `href="pricing.html#section-bedrijf"` |
| 3226 | "Upgraden naar Business →"     | `href="pricing.html"` | `href="pricing.html#section-bedrijf"` |
| 3631 | "Upgrade naar Business →" CTA-card | `href="pricing.html"` | `href="pricing.html#section-bedrijf"` |

- **Eind-grep `pricing\.html`** Alle 8 hits hebben nu `pricing.html#section-bedrijf`. Geen restanten zonder anchor. Geen onbekende regels (regelnummers exact identiek aan de diagnose-lijst).

### Build-regel checks (Run 1)

- `js/telemetry.js` niet aangeraakt — bevestigd
- Geen SQL — bevestigd
- Geen wijzigingen buiten `company-dashboard.html` — bevestigd
- Stop-condities (regel 574 mismatch, pricing-mismatch, onbekende grep-hits) niet getriggerd

### Stop

**STOP.** Wacht op Barry's "ga door" voordat Run 2 begint.

---

## Run 2 — Items 9 + 10

### TODO aangemaakt
- [TODO_ROL_AWARE_BACK_NAVIGATION.md](TODO_ROL_AWARE_BACK_NAVIGATION.md): ja. Logt drift voor school-dashboard.html:708 en begeleider-dashboard.html:513 (niet aangeraakt in deze run) en de chat-mobile-tabs-aanpak. Trigger om te bouwen: bij volgende router-state refactor, samen met TODO_ACCOUNT_REFACTOR.md.
- **Pad-correctie** Brief specificeerde `/home/internly/...`; bestaande TODO_*.md-bestanden in dit project staan in de project-root (`c:/Projects/Internly/`). TODO is daar geplaatst voor consistentie. Als unix-pad opzettelijk was: verplaatsen.

### Item 9
- **Status** Gefixt
- **Bestand** [company-dashboard.html:726](company-dashboard.html#L726)
- **Regel 726 voor**
  ```html
  <button class="btn-back" onclick="goBack('discover.html')" title="Vorige pagina">
  ```
- **Regel 726 na**
  ```html
  <button class="btn-back" onclick="goBack('company-dashboard.html')" title="Vorige pagina">
  ```
- **Reden** Fallback wordt nu zelfde-pagina (effectief no-op of refresh) wanneer er geen meaningful history is. Geen leak meer naar de student `discover.html`-pagina.

### Item 10

**Aanpak** Optie A uit de brief — id op back-btn + JS init.

**Patch 1 — back-btn (regel 482)**
- **Voor** `<a href="matches.html" class="back-btn">← Terug</a>`
- **Na**  `<a id="chat-back-btn" href="matches.html" class="back-btn">← Terug</a>`
- Default `matches.html` (student) blijft als HTML-fallback voor de stond-tussen-render-en-init-window.

**Patch 2 — init-script (regels 1622-1636, ingevoegd na bestaande `loadChatTemplates(_profRow?.role)` op regel 1620)**
- **Locatie-keuze** Het bestaande init-script (regel 1598-1657) gebruikt `_profRow?.role` als rol-bron, NIET `currentUser.role` zoals de brief pseudo-codeerde. `currentUser` is het Supabase user-object — heeft geen `role`-property. Aangepast naar `_userRole = _profRow?.role`. Andere semantiek identiek.
- **Branch** `bedrijf` → `company-dashboard.html#matches` · `school` → `school-dashboard.html` · `begeleider` → `begeleider-dashboard.html` (defensief; `requireRole()` op regel 1600 laat `begeleider` niet door, dus deze branch is unreachable maar matcht de spec) · student behoudt `matches.html`.
- **Snippet (na patch)**
  ```js
  // Rol-aware terug-knop + mobile-tabs (audit 2026-05-04 — Item 10)
  const _userRole = _profRow?.role;
  const _backBtn = document.getElementById('chat-back-btn');
  if (_backBtn) {
    if (_userRole === 'bedrijf') _backBtn.href = 'company-dashboard.html#matches';
    else if (_userRole === 'school') _backBtn.href = 'school-dashboard.html';
    else if (_userRole === 'begeleider') _backBtn.href = 'begeleider-dashboard.html';
  }
  const _mobileTabs = document.querySelector('.mobile-tabs');
  if (_mobileTabs && _userRole && _userRole !== 'student') {
    _mobileTabs.style.display = 'none';
  }
  ```

**Mobile-tabs (regels 507/511/515) — aanpak gekozen** Hide-via-display:none voor non-students. Reden: alle drie de tabs (Ontdek, Matches, Stages) zijn pure student-pagina's. Per-tab href-rewriting heeft geen zin (bedrijf heeft geen equivalent van "mijn-sollicitaties"). Hub-tab (regel 519, `mt-hub-link`) verdwijnt mee — niet ideaal voor non-students mét match, maar de topbar `match-hub-topbar-link` op regel 490 dekt die behoefte al. Acceptabele trade-off voor één-regel-fix.

### Niet aangeraakt in deze run
- [school-dashboard.html:708](school-dashboard.html#L708) — gelogd in TODO
- [begeleider-dashboard.html:513](begeleider-dashboard.html#L513) — gelogd in TODO
- Per-tab href-rewriting in chat.html mobile-tabs — gelogd in TODO als alternatieve refactor-optie

### Build-regel checks (Run 2)
- `js/telemetry.js` niet aangeraakt — bevestigd
- Geen SQL — bevestigd
- TODO-file aangemaakt voor systemische refactor — bevestigd
- Stop-condities (regel-mismatch, init-script-locatie) niet getriggerd

### Stop

**STOP.** Wacht op Barry's "ga door" voordat Run 3 begint.

---

## Tussen-run — TODO Lang-switcher

- [TODO_LANG_SWITCHER_CLEANUP.md](TODO_LANG_SWITCHER_CLEANUP.md) aangemaakt: ja
- Reden: bevinding tijdens run 1 visuele check, halve i18n-implementatie, hoort bij DeepL-sessie post-livetest
- **Pad-correctie** Brief specificeerde `/home/internly/...`; bestaande TODO_*.md staan in project-root, daar geplaatst (zelfde correctie als TODO_ROL_AWARE_BACK_NAVIGATION.md)
- Geen patches op productie-files in deze tussen-run

---

## Run 3 — Item 11

### CAN.bedrijf

- **Status** Gefixt
- **Bestand** [match-dashboard.html:2550-2560](match-dashboard.html#L2550-L2560)
- **Voor (regel 2550-2557)**
  ```js
  bedrijf: {
    addTask: true, editTask: true, deleteTask: true, checkTask: true,
    addDeadline: true, editDeadline: true,
    addReflectie: false, editReflectie: false,
    updateLeerdoel: true, editStageplan: true,
    inviteSchool: true,
    viewLog: true, viewScores: true
  },
  ```
- **Na (regel 2550-2560)**
  ```js
  bedrijf: {
    // Stage-content: bedrijf is observerend, niet schrijvend
    addTask: false, editTask: false, deleteTask: false, checkTask: false,
    addDeadline: false, editDeadline: false,
    addReflectie: false, editReflectie: false,
    updateLeerdoel: false,
    editStageplan: false,
    // Begeleidings-acties: bedrijf doet wel
    inviteSchool: true,
    viewLog: true, viewScores: true
  },
  ```

### CSS — `.bedrijf-empty-state`

- **Status** Toegevoegd inline in [match-dashboard.html:695-707](match-dashboard.html#L695-L707) — direct onder de bestaande `.empty-state`-regels.
- **Variabelen** `var(--green-bg)` (#e8f5ee, al gebruikt elders in deze pagina) als achtergrond, `var(--ink2)` voor tekst, `var(--r-sm)` voor radius. Border `#cde6d8` om de groene tint subtiel af te lijnen.
- Geen wijziging aan `css/style.css` — inline gehouden zodat de scope deze pagina is.

### Lege staten

| Tab | Status | Locatie | Copy |
|---|---|---|---|
| Taken | Geplaatst | [match-dashboard.html:3553-3567](match-dashboard.html#L3553-L3567) — `bedrijfEmptyState` const, ingevoegd na `page-head`, voor `partyCounts` | "Hier zie je de taken die de student voor zichzelf heeft opgesteld. Stel jouw verwachtingen via een meeting of de chat." |
| Planning (Deadlines) | Geplaatst | [match-dashboard.html:3461-3478](match-dashboard.html#L3461-L3478) — `bedrijfEmptyState` const, ingevoegd na `page-head`, voor `grid-2` | "Deadlines worden vastgesteld door de student en school. Bespreek deze samen tijdens kennismakings- of voortgangsgesprekken." |
| Voortgang — Leerdoelen | Geplaatst | [match-dashboard.html:3974](match-dashboard.html#L3974) — inline binnen Leerdoelen-card, na `card-head`, voor `avgBar` | "De leerdoelen zijn opgesteld door de student samen met school. Volg de progressie hier en geef tussentijds feedback via de chat." |
| Voortgang — Reflecties | Geplaatst | [match-dashboard.html:3990](match-dashboard.html#L3990) — inline binnen Reflecties-card, na `card-head`, voor `reflectiesHtml` | "Reflecties zijn de zelfreflectie van de student. Lees mee om de voortgang te volgen, en geef begeleiding via meetings of chat." |
| Stageplan | Geplaatst | [match-dashboard.html:4765-4846](match-dashboard.html#L4765-L4846) — `bedrijfBanner` const, ingevoegd direct na `readonlyBanner` in de return-statement | "Het stageplan wordt door student en school opgesteld. Lees het door en gebruik de inhoud bij begeleiding en evaluatie." |

### Side-effect-fix — `renderStageplan` `readonly`

Tijdens implementatie ontdekt: `field()` en `sel()`-helpers (regels 4732-4765) checken `if (readonly) {...}` om text-display vs. input te kiezen. Met de oude check (`role === 'school' || 'begeleider'`) zou bedrijf — die nu `editStageplan: false` heeft — wèl editable inputs zien zonder save-knop. Verwarrend.

- **Patch** `readonly` op regel 4720 uitgebreid: `... || hubState.role === 'bedrijf'`. Zo krijgt bedrijf de read-only weergave.
- **Side-side-effect** De `schoolNote`-block (regel 4827) keyde óók op `readonly` — zou bedrijf nu een "Notitie schoolbegeleider"-textarea + save-knop tonen (school-only feature, schrijft op `stage_plans.schoolnoot`). Tegen-gepatcht: `schoolNote` keyt nu expliciet op `hubState.role === 'school' || 'begeleider'` (regels 4825-4834). Comment toegevoegd om de reden te documenteren.
- `addDvBtn` keyt op `!readonly` — bedrijf krijgt geen "+ Deadline" en geen "+ Deelvraag toevoegen" knop. Correct gedrag, geen extra fix nodig.
- Stageplan `readonlyBanner` (de oude "🏫 Je bekijkt als ... — alleen lezen") behoudt zijn expliciete `school || begeleider`-check zodat bedrijf de school-banner niet ziet — bedrijf krijgt zijn eigen `bedrijfBanner` met passende copy.

### Voor Barry-review — copy zoals geplaatst (kopieerbaar blok)

```
Taken:
  Hier zie je de taken die de student voor zichzelf heeft opgesteld.
  Stel jouw verwachtingen via een meeting of de chat.

Planning (Deadlines):
  Deadlines worden vastgesteld door de student en school. Bespreek
  deze samen tijdens kennismakings- of voortgangsgesprekken.

Voortgang — Leerdoelen:
  De leerdoelen zijn opgesteld door de student samen met school.
  Volg de progressie hier en geef tussentijds feedback via de chat.

Voortgang — Reflecties:
  Reflecties zijn de zelfreflectie van de student. Lees mee om de
  voortgang te volgen, en geef begeleiding via meetings of chat.

Stageplan:
  Het stageplan wordt door student en school opgesteld. Lees het
  door en gebruik de inhoud bij begeleiding en evaluatie.
```

Allemaal letterlijk overgenomen uit de brief — geen woordwijzigingen.

### Volume-check

- CSS block: 12 regels
- Taken-banner: 5 regels (const + insert)
- Planning-banner: 5 regels
- Leerdoelen-banner: 4 regels (inline ternary)
- Reflecties-banner: 4 regels (inline ternary)
- Stageplan-patch: 9 regels (banner const + readonly extension + schoolNote tighten + insert + comments)

**Totaal ~39 regels** — onder de stop-conditie van 50.

### Build-regel checks (Run 3)

- `js/telemetry.js` niet aangeraakt — bevestigd
- Geen SQL — bevestigd
- Alleen `match-dashboard.html` geraakt — bevestigd. Geen wijzigingen aan `css/style.css` (CSS inline gehouden binnen match-dashboard).
- Stop-condities (CAN-structuur, knop-sectie-onduidelijkheid, volume >50) niet getriggerd

### Niet aangeraakt in deze run

- **Kalender-tab** ([match-dashboard.html:5078](match-dashboard.html#L5078)) heeft ook een `+ Deadline`-knop gegated op `can('addDeadline')`. Geen aparte bedrijf-empty-state geplaatst — Planning-tab dekt het Deadlines-onderwerp explicieter, en de Kalender is slechts een visualisatie van wat in Planning leeft. Bedrijf ziet hier zonder copy een normale agenda-view zonder de "+ Deadline"-knop. Acceptabel zonder uitleg.
- **`markMatchCompleted`** (rol-direct check op [match-dashboard.html:3286](match-dashboard.html#L3286)) — niet geraakt; staat los van CAN. Bedrijf behoudt deze knop (bewust ontwerp per diagnose).

---

## Eind-checklist sessie

- [x] [BEDRIJF_FLOW_FIX_LOG.md](BEDRIJF_FLOW_FIX_LOG.md) ingevuld voor alle drie runs + tussen-run
- [x] [TODO_ROL_AWARE_BACK_NAVIGATION.md](TODO_ROL_AWARE_BACK_NAVIGATION.md) aangemaakt
- [x] [TODO_LANG_SWITCHER_CLEANUP.md](TODO_LANG_SWITCHER_CLEANUP.md) aangemaakt
- [x] Geen wijzigingen aan `js/telemetry.js`
- [x] Geen SQL uitgevoerd
- [x] Gepatchte files: `company-dashboard.html` (Run 1 + Run 2), `chat.html` (Run 2), `match-dashboard.html` (Run 3). Geen andere productie-files geraakt.
