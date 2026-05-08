# BEDRIJF-FLOW DIAGNOSE
**Datum** 2026-05-04 · **Modus** READ-ONLY · **Scope** Items 7, 8, 9, 10, 11, 12

Geen patches. Geen wijzigingen aan productie-files. Alleen mapping en root-cause-analyse. De volgende sessie bouwt het fix-plan hierop.

Reviewers: Hal (geen silent diagnoses), TQ (Item 8 mental-model check), Garcia2 (Item 11 7/11), Blara (Item 12 first-time UX).

---

## Item 7 — Wit-op-wit header

**Bron gevonden** Ja — gevonden in inline `<style>` van company-dashboard.html, niet in `js/utils.js` of `css/style.css`. Vorige sessie zocht alleen in de gedeelde files; dit item zit lokaal in de pagina.

**Locatie** [company-dashboard.html:574](company-dashboard.html#L574) (de hit) in combinatie met [company-dashboard.html:97-117](company-dashboard.html#L97-L117) (de context).

**Snippet — de hit (regel 572-575)**
```html
<div class="topbar-right">
  <a href="company-discover.html" class="topbar-link">Zoek stagiairs</a>
  <a href="company-dashboard.html" class="topbar-link" style="color:#fff">Dashboard</a>
  <a href="auth.html" class="topbar-link">Inloggen</a>
```

**Snippet — de context (regel 97-117)**
```css
.topbar {
  position: sticky; top: 0; z-index: 100;
  background: rgba(244,243,239,.92);          /* cream-warm, bijna wit */
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
  height: 56px; padding: 0 24px;
  display: flex; align-items: center; justify-content: space-between;
}
.topbar-link {
  color: var(--ink2); text-decoration: none;       /* default = donker */
  font-size: .85rem; font-weight: 500; transition: color .15s;
}
.topbar-link:hover { color: var(--ink); }
```

**Context** company-dashboard.html overschrijft `.topbar` lokaal naar een cream-warm/bijna-witte achtergrond (`rgba(244,243,239,.92)`). De algemene `.topbar` in css/style.css gebruikt een groen-gradient — die regel wordt hier niet gebruikt. De `.topbar-link` default is donker (`var(--ink2)` ≈ #4b5563-achtig). De **inline** `style="color:#fff"` op regel 574 forceert echter wit op de "Dashboard"-link. Resultaat: witte tekst op crème achtergrond.

Andere `.topbar-link`-elementen ("Zoek stagiairs", "Inloggen") zijn wèl leesbaar, want zij hebben geen inline override en erven `var(--ink2)`.

**Hypothese over fix** (geen patch toepassen)
Verwijder `style="color:#fff"` op regel 574 — of vervang door een actieve-state styling (bv. `style="color:var(--ink);font-weight:600"`) zodat de huidige pagina visueel "actief" oogt. Geen impact op andere pagina's: `.topbar-link` is uniek voor deze pagina-styling. css/style.css en utils.js niet aanraken — bron is ontegenzeggelijk lokaal.

**Cross-check tegen header-render-templates**
- `_renderStudentHeaderLoggedIn` en `renderRoleHeader` in `js/utils.js` zijn niet relevant: company-dashboard rendert zijn topbar als statische HTML in de body (regel 569-597), niet via een utils-helper. Geen header-render-template raakt company-dashboard.

---

## Item 9 — Account-tab routing

**Redirect-regels gevonden in caller-keten van Account-tab**

| Bestand | Regel | Code | Trigger |
|---|---|---|---|
| js/account.js | 138 | `setTimeout(() => { window.location.href = 'index.html'; }, 2500);` | Alleen na succesvolle account-deletion. NIET de bron van FTP-05. |
| js/account.js | overige | (geen) | `renderAccountScreen()` en `handleSaveContact()` bevatten geen redirect-logica. Phase A.1 had dit reeds bevestigd. |
| company-dashboard.html | 571 | `onclick="event.preventDefault();smartHomeRedirect();"` | Logo-klik. `smartHomeRedirect()` voor `bedrijf`-rol → `company-dashboard.html` (correct, geen bug). |
| company-dashboard.html | 1540-1543 | `if (id === 'account') { … AccountModule.renderAccountScreen('account-container', 'nl'); }` | DOM-render in `#account-container`. Geen URL-wijziging, geen redirect. |
| company-dashboard.html | 3401 | `window.location.href = 'auth.html'` | No-user guard. Niet rol-relevant. |
| company-dashboard.html | 3408-3410 | `window.location.replace(getRoleLanding(userRole))` | Wrong-role guard. Schiet alleen vuur als `userRole !== 'bedrijf'` — kán in theorie naar student-pagina sturen, maar voorwaarde is incorrecte rol op de pagina; niet een bug van de account-tab zelf. |
| **company-dashboard.html** | **726** | `<button class="btn-back" onclick="goBack('discover.html')" title="Vorige pagina">` | **Hit.** "Vorige pagina"-knop in de sidebar — altijd zichtbaar, óók terwijl bedrijf op de Account-tab staat. Fallback `discover.html` is de **student** discover-pagina. |
| js/utils.js | 377-385 | `function goBack(fallbackHref)` | Ga eerst `history.back()`, anders `window.location.href = fallbackHref \|\| 'index.html'`. |

**Welke wordt getriggerd vanuit `AccountModule.renderAccountScreen()`** GEEN. AccountModule rendert alleen DOM en verandert geen URL. De FTP-05-symptomen ontstaan door interactie met externe controls die rond Account-tab nog actief zijn — met name de sidebar-back-knop.

**Hypothese root cause**
Bedrijf logt in (referrer = `auth.html` of leeg), opent Account-tab, klikt "Vorige pagina" links onderin de sidebar. `goBack('discover.html')` evalueert `hasMeaningfulHistory`:
- `document.referrer` is `auth.html` of leeg → de eerste check faalt.
- `window.history.length > 1` is meestal waar (browser bewaart recente pagina's), dus `history.back()` wordt gekozen — wat hen terugstuurt naar de pagina vóór company-dashboard. Als die pagina ook `auth.html` was → Account-tab-redirect-loop kan ontstaan.
- Als `history.length === 1` (incognito, frisse tab) → fallback `discover.html` (student-pagina) wordt geladen.

In beide gevallen: een bedrijf eindigt op een pagina die niet rol-aware is. Het is geen bug ín AccountModule, maar een hardcoded **student-fallback** in een sidebar-knop die voor álle screens van company-dashboard zichtbaar is.

**Of er een rol-guard ontbreekt waar wel zou moeten** Ja — twee niveaus:
1. **Per call-site** — de inline `goBack('discover.html')`-aanroep in [company-dashboard.html:726](company-dashboard.html#L726) hoort de bedrijf-landing als fallback te krijgen, niet de student-discover.
2. **Systemisch** — dezelfde patroon-fout bestaat in andere non-student dashboards:
   - [school-dashboard.html:708](school-dashboard.html#L708) — `goBack('discover.html')` (school is geen student)
   - [begeleider-dashboard.html:513](begeleider-dashboard.html#L513) — `goBack('discover.html')` (begeleider is geen student)
   Buddy-dashboard gebruikt `goBack('index.html')` — neutraal, prima.

**Hypothese over fix** (geen patch toepassen)
Vervang in [company-dashboard.html:726](company-dashboard.html#L726) `goBack('discover.html')` door `goBack('company-dashboard.html')` (zelfde-pagina = effectief no-op + geen leak naar student-pagina). Of: refactor `goBack()` zodat de fallback rol-aware is — `goBack(getRoleLanding(role))`. Volume: drie bestanden. Bonus-fix: doe dezelfde correctie in school- en begeleider-dashboard om de patroon-fout uit het systeem te trekken (geen fix nu, maar log voor de fix-sessie).

---

## Item 10 — Matches → chat → terug

**Pad-stappen** (bedrijf op company-dashboard, klikt door naar chat en terug)

| Stap | Bestand:regel | Wat gebeurt er |
|---|---|---|
| 1. Bedrijf op company-dashboard, klikt Matches | company-dashboard.html:654 | `show('matches')` → in-page screen-switch naar `#screen-matches`. Geen URL-wijziging. |
| 2. Lijst rendert match-cards met "Open chat"-link | company-dashboard.html:1838, 1980, 2208 | `<a href="chat.html?match=${m.id}">` — drie verschillende renderpaden, alle drie linken naar chat.html. URL wijzigt naar chat.html. |
| 3. Op chat.html — klik "← Terug" | **chat.html:482** | `<a href="matches.html" class="back-btn">← Terug</a>` — **HARDCODED student-pagina**. Bedrijf belandt op `matches.html`. |
| 3-alt. Klik op mobile-tab Ontdek/Matches | chat.html:507, 511 | `<a href="discover.html">` resp. `<a href="matches.html">` — óók hardcoded student-pagina's. Even erg op mobiel. |

Voor volledigheid: bedrijf kan ook via match-dashboard (Stage Hub) hier komen. match-dashboard heeft een rol-aware back-knop — [match-dashboard.html:2965-2968](match-dashboard.html#L2965-L2968) kiest correct `company-dashboard.html` voor `role === 'bedrijf'`. Die kant is dus al goed. De buggy stap zit uitsluitend in `chat.html`.

**Stap waar het misgaat** [chat.html:482](chat.html#L482)
```html
<a href="matches.html" class="back-btn">← Terug</a>
```
Verklaring: `chat.html` is geschreven vanuit het student-mental-model. De "Terug"-link en de mobile-tabs (regel 505-518) zijn statische `<a>`-elementen zonder rol-resolutie.

**Hypothese root cause** Apart van Item 9. Item 9 is een hardcoded student-pad in een rol-spécifieke pagina (company-dashboard). Item 10 is een hardcoded student-pad in een **gedeelde** pagina (chat.html — alle rollen openen deze). Beide zijn instantiaties van dezelfde anti-pattern ("student-pad als default voor iedereen"), maar de plek en de fix zijn verschillend.

**Afhankelijkheid van Item 9** Nee. Verschillende files, verschillende fixes. Wel logisch om in één fix-run te bundelen, want het is dezelfde mental-model-bug op systeem-niveau.

**Hypothese over fix** (geen patch toepassen)
Op chat.html:482 — vervang de statische `<a href="matches.html">` door een rol-aware terug-knop, vergelijkbaar met match-dashboard.html:2965-2968. Pseudo: lees `currentUser.role` (al bekend uit chat.html init op regel 1604+), kies bestemming via `getRoleLanding(role)`. Twijfelpunt voor de fix-sessie: bedrijf "matches" leeft als in-page tab in company-dashboard (niet als eigen `matches.html`-pagina), dus na terug-klik wil bedrijf waarschijnlijk landen op `company-dashboard.html#matches` of de matches-screen direct openen. Vraagt eigen klein contract.

Mobile-tabs op chat.html:507/511 — zelfde patroon, zelfde fix. Of de mobile-tabs voor non-students helemaal verbergen (CSS via `body[data-role]`).

---

## Item 11 — Bedrijf viewer-perspectief in match-dashboard

match-dashboard.html heeft al een rol-bewuste capability-map: `CAN[hubState.role]` op [match-dashboard.html:2541-2576](match-dashboard.html#L2541-L2576). Bedrijf-rij staat op regel 2550-2557.

**Bedrijf-permissies (huidig)**
```js
bedrijf: {
  addTask: true, editTask: true, deleteTask: true, checkTask: true,
  addDeadline: true, editDeadline: true,
  addReflectie: false, editReflectie: false,
  updateLeerdoel: true, editStageplan: true,
  inviteSchool: true,
  viewLog: true, viewScores: true
}
```

### Matrix — UI-elementen die bedrijf nu ziet

| Element | Regel | Actie | Role-check aanwezig | Mag bedrijf zien (mental model) | Verdict |
|---|---|---|---|---|---|
| "+ Taak"-knop (overzicht) | 3284 | `can('addTask')` → openTaakModal → INSERT stage_tasks | Ja (`can('addTask')`) | Twijfelgeval (stage_tasks niet expliciet genoemd) | ⚠ Open vraag |
| "+ Deadline"-knop (overzicht) | 3285 | `can('addDeadline')` → openDeadlineModal → INSERT stage_deadlines | Ja (`can('addDeadline')`) | **NEE** (mental-model: schrijven stage_deadlines = nee) | ✗ Onterecht |
| Edit-deadline-knop (planning-tab) | 3417 | `can('editDeadline')` → UPDATE stage_deadlines | Ja | **NEE** | ✗ Onterecht |
| "+ Deadline" (planning-tab herhaald) | 3436, 5075 | idem | Ja | **NEE** | ✗ Onterecht |
| Add-task-knop (taken-tab) | 3524 | `can('addTask')` → INSERT stage_tasks | Ja | Twijfelgeval | ⚠ Open vraag |
| Check-task (taakcheckbox) | 3560, 3601 | `can('checkTask')` → UPDATE stage_tasks.status | Ja | Status-mutatie — instructie: "in twijfel" | ⚠ Open vraag |
| Edit-task-knop | 3564 | `can('editTask')` → UPDATE stage_tasks | Ja | Twijfelgeval | ⚠ Open vraag |
| Delete-task-knop | 3569, 3621 | `can('deleteTask')` → DELETE stage_tasks | Ja | Twijfelgeval | ⚠ Open vraag |
| Leerdoel progress-buttons | 3765, 4192, 4202, 4207 | `can('updateLeerdoel')` → UPDATE stage_leerdoelen.progress | Ja | **NEE** (mental-model: schrijven stage_leerdoelen = nee) | ✗ Onterecht |
| Stageplan-edit (overal in plan-view) | 4716, 4890, 4937 | `can('editStageplan')` → UPDATE stage_plans.\* | Ja (`editable = can('editStageplan')`) | **NEE** (stageplan = leerdoelen-context, hoort bij student/school) | ✗ Onterecht |
| Inviter-knop "Uitnodigen" (school) | 3227 | `can('inviteSchool')` → flow naar school-koppeling | Ja | Mag bedrijf doen — partij in match | ✓ OK |
| Scores-paneel | 3255 | `can('viewScores')` → render | Ja | Mag bedrijf zien (own perf) | ✓ OK |
| Log-paneel | 3959 | `can('viewLog')` → render | Ja | Mag bedrijf zien | ✓ OK |
| Reflectie-add-knop | 3846, 3372 | `can('addReflectie')` → INSERT stage_reflecties | Ja (FALSE) | Mental-model: "Eigen begeleidings-feedback toevoegen: ja" — bedrijf zou wèl moeten kunnen | ⚠ **Omgekeerd onterecht** |
| Reflectie-edit (eigen) | 3825 | `can('editReflectie') && r.editAllowed` | Ja (FALSE) | Eigen feedback editen: ja | ⚠ **Omgekeerd onterecht** |
| "Markeer stage als afgerond" | 3286 | `role === 'bedrijf'` → markMatchCompleted (UPDATE matches.completionStatus) | Ja (rol-direct) | Eindbeslissing — debatable; nu: bedrijf alleen | ⚠ Bewust ontwerp, behouden |
| Milestone-Afronden (confirms_by='bedrijf') | 3682 | `role === 'bedrijf'` → handleSubmitMilestone | Ja | Mag bedrijf doen — confirm rol | ✓ OK |

**Aantal elementen waar bedrijf nu ten onrechte schrijft** Minimaal **6** (deadline-add, deadline-edit, leerdoel-progress, leerdoel-notes, stageplan-edit, stageplan-schoolnoot). Plus **5 twijfelgevallen** rond stage_tasks (add/edit/delete/check).

**Aantal elementen waar role-check al correct is** Alle UI-elementen worden gegated door `can(...)` of een directe `role===`-check. Het probleem zit niet in ontbrekende guards — het zit in de **CAN-tabel-waardes**: bedrijf staat op TRUE waar het FALSE moet zijn (en vice versa voor reflecties).

**Volume-inschatting fix**
- **Atomic** (1-fase): herschrijf `CAN.bedrijf` op regel 2550-2557 (één blok, ~7 regels). Geen UI-aanrakingen nodig — alle gates volgen automatisch.
- Bonus-volgwerk: ergens een uitleg-string toevoegen ("alleen-lezen voor bedrijf, jouw rol is ondersteunend") in tabs die nu interactieve knoppen tonen die straks weg zijn — anders ontstaat lege visuele staat. Volume-inschatting: ~30-50 regels conditional-render. Apart van CAN-fix.
- 7/11-check (Garcia2): `school` en `begeleider` hebben dezelfde structuur (regels 2558-2575). Geen overlap-gevaar; verschillen zijn bewust.

**Mogelijke nieuwe twijfelgevallen voor product-beslissing**
1. **stage_tasks** — niet in mental-model genoemd. Bedrijf kan nu add/edit/delete/check. Als bedrijf wel taken aan student mag opdragen (realistisch: stage-onboarding-list), dan TRUE laten. Maar dan claim moet wel gerelateerd worden aan iets ("opdracht-taken" vs "student-eigen taken"). Vraag voor TQ.
2. **inviteSchool** — bedrijf nodigt school uit. Hoort dat? Of komt school via student? Vraag voor procesmodel.
3. **addReflectie/editReflectie** — instructie zegt expliciet "Eigen begeleidings-feedback toevoegen: ja" voor bedrijf. Huidige CAN heeft dit op FALSE. Omgekeerde fout. Confirm voor TQ.
4. **markMatchCompleted** — alleen bedrijf nu. Mag school dat ook (school heeft zelfgevoel over geslaagde stage)? Buiten scope deze sessie.

---

## Item 12 — Upgrade-knop bedrijf

**Huidige bestemming(en)** — bedrijf-pagina heeft meerdere upgrade-CTAs, álle naar `pricing.html` (zonder anchor):

| Regel | Element | Onclick / href |
|---|---|---|
| 714 | "Abonnement" sidebar-knop | `window.location.href='pricing.html'` |
| 1556 | "Bekijk abonnementen" upgradeCard | `window.location.href='pricing.html'` |
| 1665 | "Upgraden →" (verify-banner) | `window.location.href='pricing.html'` |
| 1681 | "Upgraden →" (matches gating) | `window.location.href='pricing.html'` |
| 1786 | "Upgraden →" (sollicitatie-quota) | `window.location.href='pricing.html'` |
| 3185 | "Upgraden naar Pro →" | `<a href="pricing.html">` |
| 3226 | "Upgraden naar Business →" | `<a href="pricing.html">` |
| 3631 | "Upgrade naar Business →" (CTA-card) | `<a href="pricing.html">` |

**Voordelen-pagina bestaat** Nee — geen `voordelen.html`, `features.html`, `upgrade.html`, of `plans.html` aanwezig.

**Pricing.html dekt voordelen** Ja — zeer compleet:
- Bedrijf-sectie heeft anchor `#section-bedrijf` op [pricing.html:481](pricing.html#L481).
- Drie tiers (Starter €0, Pro €59/mnd, Business €169/mnd), per tier `<ul class="plan-features">` met expliciete checks/crosses (regels 494-541).
- Future-features gemarkeerd met "🔜" (ATS, whitelabel).

**Aanbevolen bestemming** (geen fix toepassen, alleen beschrijven)
- **Korte termijn** (atomic): vervang alle `pricing.html` door `pricing.html#section-bedrijf` op de bedrijf-CTAs zodat de gebruiker direct in zijn eigen sectie landt zonder eerst over de student/school/buddy-blokken te scrollen. 8 regels te wijzigen.
- **Caveat**: `startCheckout()` is volgens CLAUDE.md een stub (Mollie niet actief). Klik op "Kies Pro →" doet effectief niets functioneels. De upgrade-knop linkt dus naar een pagina die zélf nog geen werkende conversie heeft. Niet te fixen in Item 12; relevant context.

**Twijfel** Geen voordelen-pagina nodig — pricing.html is contentrijk genoeg om als "voordelen" te dienen. Anchor-fragment is sufficient. Géén feature-bouw vereist; geen Plan-sessie nodig. Atomic patch volstaat.

---

## Item 8 — Welkomsdrempel bedrijf

**Tabel — welkomsdrempel per rol-dashboard**

| Element | student-home.html | bbl-hub.html | company-dashboard.html |
|---|---|---|---|
| Persistent greeting hero | ✓ `.sh-hero` regel 159-163 | ✗ alleen 1-time `welcome-overlay.js` op login | ✗ |
| Daypart-greeting ("Goedemorgen 👋") | ✓ regel 242-243 | (via overlay, niet persistent) | ✗ |
| Naam-display in hero | ✓ `#sh-name` regel 161, 244 | (via overlay) | ✗ |
| Meta-display (opleiding, school) | ✓ `#sh-meta` regel 162, 245-246 | (via overlay) | ✗ |
| Profielcompleetheid-bar + suggesties | ✓ `#sh-progress-wrap` regel 165-171 | ✗ | ✗ (Trust Score-stat is geen profiel-completeness) |
| Volgende-stap actie-cards | ✓ `.sh-cards` regel 173-202 (Ontdek/Profiel/Sollicitaties) | (eigen hub-card lay-out) | ✗ — start direct met `<div class="page-title">Dashboard</div>` regel 740 + stats-row regel 781 |
| Welkom-overlay (1-time) | – (n.v.t.) | ✓ via `welcome-overlay.js` | ✓ via `welcome-overlay.js` regel 3416-3421 |

Company-dashboard begint op regel 738-741 met:
```html
<div class="screen active" id="screen-dashboard">
  <div class="page-title">Dashboard</div>
  <p class="page-sub">Eenvoudig voor jou. Eerlijk voor de student.</p>
```
Daarna direct een referral-banner (regel 743-779) en een stats-row (regel 781-808). Geen naam, geen daypart-greeting, geen profiel-completeness-bar, geen "volgende stap"-card.

**Welk shared contract zou nodig zijn**
Een functie `renderGreetingHero({container, naam, meta, completenessPct, suggestions, ctas})` in `js/utils.js` die:
- Greeting kiest op `getDaypartGreeting()` (al bestaat in utils.js regel 365-373).
- DOM rendert in de meegegeven container.
- Optionele profiel-completeness-bar met suggesties (zoals student-home).
- CTAs accepteert (per rol verschillend: student → "Ontdek/Profiel/Sollicitaties", bedrijf → "Nieuwe vacature/Profiel/Matches", buddy → eigen set).

**Of dit hoort bij Fase C uit CC_FIX_PLAN** (renderGreetingHero) — Ja, dit is een kandidaat-feature voor Fase C. Niet-urgent (geen bug, geen breekvlak), wel laag-hangend voor mental-model-coherentie tussen rol-dashboards. Niet voor deze atomic-run; eigen sessie waardig.

**7/11-finding** (Garcia2-perspectief): student-home heeft het volledige patroon, bbl-hub heeft een afgeleide via 1-time overlay (niet persistent), company-dashboard heeft het patroon helemaal niet. Drie verschillende implementaties met geen shared contract. Klassieke 7/11-vinding. Bevestigt sprint 5-prioriteit voor een gedeeld `renderGreetingHero()`-helper.

**TQ aanname-check** "Bedrijf wil dezelfde hub-shape als student" — **bevestigd voor de bovenste-helft**. Bedrijf wil:
- Persoonlijke groet ("Goedemorgen, [bedrijfsnaam]") — geeft warmte, lage entry-drempel
- Verificatie-status / profielcompleetheid — wat student "profiel %" is, is bedrijf "verificatie + KvK + logo + omschrijving" %
- "Volgende stap" — voor bedrijf logischerwijs "Plaats vacature" of "Verifieer profiel" als die nog niet af zijn

Voor de **onderste helft** (CTAs, doorlinks) wil bedrijf andere targets dan student. Het contract moet dus rol-aware CTAs accepteren, niet hardcoded.

---

## Synthese — afhankelijkheden tussen items

| Item | Afhankelijk van | Type | Volgorde |
|---|---|---|---|
| 7 | Geen — code-bron lokaal in [company-dashboard.html:574](company-dashboard.html#L574) gevonden | Atomic patch | First — kleinste, veiligste edit (1 regel) |
| 8 | renderGreetingHero shared contract (nieuwe utils.js helper) | Feature | Eigen sessie — niet bundelen met atomic-fixes |
| 9 | Niets externs — kies tussen call-site fix óf systemische refactor | Atomic patch | Met Item 10 (zelfde anti-pattern, beide hardcoded student-paden in non-student contexts) |
| 10 | Mogelijk gedeeld helper "rolAwareBackHref(role)" | Atomic patch | Met Item 9 |
| 11 | Niets externs (RLS-laag staat los, regelt write-rechten op DB-niveau) — alleen CAN-tabel herschrijven | Volume-werk (klein als CAN-only, groot als ook empty-state-render) | Eigen sessie — vereist TQ-product-beslissing op de twijfelgevallen vóór patch |
| 12 | Geen — atomic vervang `pricing.html` → `pricing.html#section-bedrijf` op 8 plekken | Atomic patch | Met Item 7 (beide single-file, single-pattern, kleinste blast-radius) |

### Eindconclusie — bundeling

**Run 1 — atomic single-file fixes** (kleinste risico, snelste win):
- Item 7 (1 regel in company-dashboard.html)
- Item 12 (8 regels in company-dashboard.html, anchor toevoegen)

→ Beide raken alleen `company-dashboard.html`, geen utils/css. Eén bestand open, zes minuten werk, geen risico voor andere pagina's.

**Run 2 — multi-file atomic fixes (anti-pattern: hardcoded student-paden in non-student contexts)**:
- Item 9 ([company-dashboard.html:726](company-dashboard.html#L726) plus optioneel [school-dashboard.html:708](school-dashboard.html#L708) en [begeleider-dashboard.html:513](begeleider-dashboard.html#L513) als systemische clean-up)
- Item 10 ([chat.html:482](chat.html#L482) plus mobile-tabs op 507-518)

→ Eén thematisch fix-blok. Vereist mini-keuze: per-call-site patch óf rol-aware helper. Aanbeveling: per-call-site nu (laag risico), helper-refactor in volgsessie als technical-debt.

**Run 3 — Item 11 (CAN-tabel herzien)**:
- Vereist eerst TQ-akkoord op de mental-model-vragen (stage_tasks-status, addReflectie omkering, inviteSchool).
- Daarna één edit op `CAN.bedrijf` regel 2550-2557.
- Gevolg: lege visuele staten in tabs waar bedrijf geen knoppen meer ziet — apart conditional-render-werk om "alleen-lezen voor bedrijf"-uitleg toe te voegen.

**Run 4 — Item 8 (welkomsdrempel-feature)**:
- Eigen sessie. Vereist Plan-fase. Bouw `renderGreetingHero()` in utils.js, refactor student-home om het te gebruiken, voeg toe aan company-dashboard en bbl-hub.
- Niet blokkerend voor andere items; los werk.

**Geen items zijn op iets externs geblokkeerd.** Items 7, 9, 10, 12 kunnen vandaag — zonder verdere product-vragen. Items 8 en 11 vereisen eerst korte TQ/Blara-bevestiging op specifieke product-vragen (Item 8 ≈ "willen we deze patroon-uniformering überhaupt", Item 11 ≈ "welke twijfelgevallen besluiten we hoe").

---

## Build-regel checks (sessie-eindcontrole)

- **Geen wijzigingen aan productie-files** — uitsluitend lezen via Read/Grep. Geen str_replace, geen create_file op productie-paden.
- **js/telemetry.js niet aangeraakt** — niet eens gelezen.
- **Geen SQL** — geen migraties, geen DB-edits. Build-regel 5 gerespecteerd.
- **TodoWrite gebruikt** voor sessie-tracking; één in-progress per stap.
- **Stop-condities**: Item 11 had 17 te documenteren elementen — onder de drempel van 50. Geen vroegtijdige stop nodig. js/account.js bestond. Geen onverwachte productie-edits.

---

**Einde diagnose.** De volgende sessie kan dit rapport gebruiken als input voor een Plan-fase per item-bundel.
