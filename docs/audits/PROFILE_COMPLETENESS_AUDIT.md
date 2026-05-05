# Profile Completeness Audit — 6 mei 2026

## Crew
- Lead: 7/11 (cross-file shared contract) + Bedward (data integrity)
- Pre-implementation: TQ ("wat is de unspoken assumption?")

## Bekende baseline
- DB-kolom `profile_completeness` bestaat NIET in student_profiles, company_profiles, school_profiles (bevestigd Run 3.B Fase A)
- 3 dashboards lazen uit DB → SELECTs verwijderd (Run 3.B Fase A + A.2)
- [js/utils.js:877-885](js/utils.js#L877) `renderRoleLanding` rendert graceful undefined (`typeof === 'number'` guard)
- Memory: opdracht_domein = 30 punten — **bevestigd** uit code (zie hoofdvondst hieronder)

## Hoofdvondst — bestaande implementatie

**student-home.html:252-288 — gewogen completeness al volledig geïmplementeerd**

Onbekend bij start audit, gevonden in code. De 7 weighted fields uit memory matchen 1-op-1:

| # | Field | Punten | Verplicht | Impact-tekst (bij ontbreken) |
|---|-------|--------|-----------|------------------------------|
| 1 | naam | 10 | ✓ | (geen suggestie) |
| 2 | opleiding | 10 | ✓ | (geen suggestie) |
| 3 | school | 10 | ✓ | (geen suggestie) |
| 4 | opdracht_domein | **30** | ✗ | "Bepaalt jouw matches" |
| 5 | postcode | 15 | ✗ | "Schakelt reistijd-filter in" |
| 6 | motivatie | 15 | ✗ | "Bedrijven lezen dit als eerste" |
| 7 | skills | 10 | ✗ | "Toont jouw vaardigheden" |
| **Totaal** | | **100** | | |

**Karakteristieken**:
- Pure frontend berekening (geen DB-write)
- `_heeftWaarde()` helper handelt arrays + strings (whitespace-trim) gracieus af
- Toont % alleen bij <100 (regel 271)
- Bovenste 2 niet-verplichte velden gerendered als suggestie-CTAs

## Inventaris hits

### READ-hits (na Run 3.B Fase A cleanup)
- Geen — `profile_completeness` is uit alle SELECTs gestript ✓

### WRITE-hits
- Geen — kolom bestaat niet, niemand schrijft ernaar ✓

### DISPLAY-hits
- [js/utils.js:879-885](js/utils.js#L879) — `rl-completeness` block in `renderRoleLanding` (alle 3 dashboards via helper)
- [student-home.html:272-274](student-home.html#L272) — `sh-pct` + `sh-progress-fill` + `sh-progress-wrap`
- [company-dashboard.html:2828-2836](company-dashboard.html#L2828) — `profileCompleteHint` (count-based, geen weighting, formuleert "X/5 compleet")

### CALC-hits (bestaande berekening)
- ✅ **student-home.html:254-269** — gewogen 7-fields, **canonical**
- ⚠️ **company-dashboard.html:2814-2836** `updateProfileCompleteness()` — count-based 5/5, geen weighting, vertoont alleen hint-tekst
- ❌ school-dashboard — geen berekening aanwezig

### PROP-hits (helper-input)
- 3 welkomstblok-IIFE's lezen niet meer `profile_completeness` (Run 3.B). Helper accepteert `profileData.profile_completeness` maar krijgt undefined.

### Memory/spec hits (.md scan)
- `docs/journal/2026-05-05.md:38` — bevestigt verwijdering uit SELECTs
- `docs/audits/SECURITY_AUDIT_5MEI.md:13` — "kolom bevestigd absent"
- `docs/runs/RUN_4_BRIEF.md:16-17` — Optie C scope-omschrijving
- `_docs/BACKLOG_AUDIT_2026-05-03.md:27` — student_profiles veldenlijst (referentie voor weging)
- Geen specs voor company / school weighting gevonden

## Per-rol veld-overzicht

### Student (student_profiles tabel)
**Beschikbaar in tabel** (uit BACKLOG_AUDIT 2026-05-03):
profile_id, opleiding, niveau, sector, beschikbaar_van, beschikbaar_tot, skills, bio, avatar_url, bbl_mode, naam, school, schooldag, postcode, opdracht_domein, motivatie, pb_naam, contract_start, contract_end, jaar, skills_progress, skills_toelichting, buddy_opt_in, zoekt_buddy, avatar_key

**Canonical 7-veld weging** (uit student-home.html, ongewijzigd overnemen):
naam(10), opleiding(10), school(10), opdracht_domein(30), postcode(15), motivatie(15), skills(10) = 100

### Company (company_profiles tabel)
**Profielform-velden** (uit company-dashboard.html:3035-3047 upsert):
bedrijfsnaam, sector, size, website, beschrijving, avatar_key, company_type, country, vat_number, tax_id, remote_possible

**Bestaande hint** (5 velden, count-based zonder weging):
bedrijfsnaam, sector, size, website, beschrijving

**Voorgestelde 7-veld weging** (open vraag → Barry):
| # | Field | Punten | Verplicht | Impact |
|---|-------|--------|-----------|--------|
| 1 | bedrijfsnaam | 10 | ✓ | (geen) |
| 2 | sector | 15 | ✓ | "Bepaalt match-domein" |
| 3 | size | 5 | ✗ | "Studenten zien jouw schaal" |
| 4 | website | 10 | ✗ | "Vergroot vertrouwen" |
| 5 | beschrijving | 30 | ✗ | "Studenten lezen dit als eerste" |
| 6 | avatar_key | 10 | ✗ | "Logo verhoogt herkenbaarheid" |
| 7 | remote_possible | 5 | ✗ | "Filtert op werkomgeving" |
| (impliciet) verification_status='verified' | (15) | ✓ | (eigen kolom — Trust Score gerelateerd) |
| **Totaal** | | **100** | | |

**Open vraag**: hoort `verification_status` (Trust Score-territorium) bij completeness, of houden we het strikt op profielvelden?

### School (school_profiles tabel)
**Profielform-velden** (uit school-dashboard.html:2191-2197 upsert):
schoolnaam, locatie, contactpersoon, opleidingen, avatar_key

**Voorgestelde 5-veld weging** (geen 7 — beperkte velden):
| # | Field | Punten | Verplicht | Impact |
|---|-------|--------|-----------|--------|
| 1 | schoolnaam | 25 | ✓ | (geen) |
| 2 | contactpersoon | 25 | ✓ | (geen) |
| 3 | locatie | 15 | ✗ | "Studenten zien regio" |
| 4 | opleidingen | 25 | ✗ | "Bepaalt welke studenten matchen" |
| 5 | avatar_key | 10 | ✗ | "Logo verhoogt herkenbaarheid" |
| **Totaal** | | **100** | | |

**Open vraag**: 5 velden ipv 7 voor school. Akkoord, of veld toevoegen (bv. `website`, `kvk` als die in tabel zitten)?

## Helper-locatie en exposure

`js/utils.js` heeft 21 `window.X` exposures (regel 55-1120). Voorgesteld nieuw:
- `window.calculateProfileCompleteness` — central function, accepteert `(role, profileData)` → number 0-100

**Niet toevoegen aan window**: rol-specifieke configs (intern in module).

## Render-locaties identificeren

`renderRoleLanding` helper (js/utils.js:877-885) heeft de UI al klaar:
```html
<div class="rl-completeness">
  <div class="rl-completeness-label">Profiel ${completeness}% compleet</div>
  <div class="rl-completeness-bar">
    <div class="rl-completeness-fill" style="width:${completeness}%"></div>
  </div>
</div>
```

Activatie vereist: caller moet `profile_completeness: <number>` in `profileData` zetten. 3 callers:
- bbl-hub.html:731 — student-data object
- company-dashboard.html:770 — bedrijf-data object
- school-dashboard.html:740 — school-data object

**student-home.html** heeft eigen UI (sh-pct + sh-progress-fill) — NIET via renderRoleLanding. Behouden of migreren? Open vraag.

## Voorgestelde implementatie-strategie

### Optie A — universele helper, rol-specifieke configs
```js
const COMPLETENESS_CONFIG = {
  student: [
    { key: 'naam',            gewicht: 10, impact: null },
    { key: 'opleiding',       gewicht: 10, impact: null },
    { key: 'school',          gewicht: 10, impact: null },
    { key: 'opdracht_domein', gewicht: 30, impact: 'Bepaalt jouw matches' },
    { key: 'postcode',        gewicht: 15, impact: 'Schakelt reistijd-filter in' },
    { key: 'motivatie',       gewicht: 15, impact: 'Bedrijven lezen dit als eerste' },
    { key: 'skills',          gewicht: 10, impact: 'Toont jouw vaardigheden' },
  ],
  bedrijf: [...],
  school:  [...],
};

function calculateProfileCompleteness(role, profileData) {
  const config = COMPLETENESS_CONFIG[role];
  if (!config || !profileData) return 0;
  const totaal  = config.reduce((s, v) => s + v.gewicht, 0);
  const behaald = config
    .filter(v => _heeftWaarde(profileData[v.key]))
    .reduce((s, v) => s + v.gewicht, 0);
  return Math.round((behaald / totaal) * 100);
}
```

### Optie B — drie aparte functions
```js
function calculateStudentCompleteness(p)  { ... }
function calculateCompanyCompleteness(p)  { ... }
function calculateSchoolCompleteness(p)   { ... }
```

### Aanbeveling: **Optie A**
- Eén `_heeftWaarde()` helper, één formule
- Configs zijn data, niet code — eenvoudig aan te passen zonder logica te raken
- Ondersteunt suggestie-rendering uniform (impact-tekst per niet-ingevulde veld)
- Migreert student-home.html bij toekomstige opportunity zonder duplicate logic
- Past bij bestaande `HEADER_NAV_BY_ROLE` config-pattern

## 7 weighted fields — bevestiging student

Memory zegt `opdracht_domein = 30 punten` — **bevestigd** door [student-home.html:258](student-home.html#L258). De andere 6 staan in dezelfde block:

| # | Field | Punten | Bron |
|---|-------|--------|------|
| 1 | naam | 10 | student-home.html:255 |
| 2 | opleiding | 10 | :256 |
| 3 | school | 10 | :257 |
| 4 | opdracht_domein | 30 | :258 (matches memory) |
| 5 | postcode | 15 | :259 |
| 6 | motivatie | 15 | :260 |
| 7 | skills | 10 | :261 |

**VRAAG VOOR BARRY**: bevestiging student-weging onveranderd overnemen?

## Open vragen voor Barry vóór implementatie

1. **Student-weging**: bevestig 1-op-1 overname uit student-home.html (zie tabel hierboven). Akkoord?
2. **Company-weging**: voorstel hierboven (7 velden, 100 punten, beschrijving=30 als grootste driver). Akkoord, of andere weging?
3. **Verification_status**: hoort dit bij company-completeness, of strikt apart in Trust Score?
4. **School-weging**: 5 velden ipv 7 (beperkte profielvelden). Akkoord met 5, of veld toevoegen?
5. **student-home.html migratie**: laten staan met eigen UI, of migreren naar `calculateProfileCompleteness('student', sp)` met behoud van `sh-pct` rendering?
6. **rendering in renderRoleLanding**: tonen bij <100% (zoals student-home), of altijd tonen?
7. **Suggestie-tekst**: ook tonen in renderRoleLanding (zoals student-home doet met `sh-suggesties`), of alleen bar?

## Implementatie-volgorde (Fase 2 — pas na go)

1. **STAP A**: voeg `_heeftWaarde()` helper toe aan js/utils.js (regel ~512)
2. **STAP B**: voeg `COMPLETENESS_CONFIG` constant toe (rolespecific configs)
3. **STAP C**: voeg `calculateProfileCompleteness(role, profileData)` toe + window-export
4. **STAP D**: update 3 welkomstblok-IIFE's:
   - bbl-hub.html: bereken na studentProfile fetch, zet in data-object
   - company-dashboard.html: idem voor companyProfile
   - school-dashboard.html: idem voor schoolProfile
5. **STAP E** (optioneel): migreer student-home.html naar centrale helper (preserveert eigen UI)
6. **STAP F**: smoke-test 3 dashboards in browser per rol

## Risico-classificatie pre-implementatie

| Niveau | Aantal | Items |
|---|---|---|
| KRITIEK | 0 | — |
| HOOG | 0 | — |
| MEDIUM | 1 | Beslissing weging company/school zonder bestaande UI-precedent — open vragen 2-4 |
| LAAG | 1 | student-home.html migratie — Optie E (skip-able zonder regressie) |

## STOP — wacht op Barry

**Geef Barry**:
- Pad: `docs/audits/PROFILE_COMPLETENESS_AUDIT.md`
- Hits in code: 17 (3 in utils.js, 7 in student-home, 4 in company-dashboard, 3 in match-dashboard reflectie-only)
- Open vragen: 7
- Aanbeveling: **Optie A** (universele helper, rol-specifieke configs)

**Wacht op**:
- Confirmatie/correctie van 7 weighted fields voor student
- Beslissing weging company (7 velden voorstel)
- Beslissing weging school (5 velden voorstel)
- Beslissing student-home migratie (Optie E ja/nee)
- Go/no-go voor Fase 2 implementatie
