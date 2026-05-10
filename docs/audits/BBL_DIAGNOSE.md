# BBL DIAGNOSE — pre-livetest 11 mei 2026

**Datum:** 2026-05-10 (Fase 0 van BBL+AUDIT FIX RUN)
**Status:** alleen lezen + bevindingen, geen wijzigingen
**Volgende stap:** wachten op GO voor Fase 1

---

## 1. bbl-profile.html

### 1a. Input-velden voor contract_start / contract_end / leerdoelen

| Veld | Element-id | Type | Regel |
|---|---|---|---|
| Contract start | `#contract_start` | `<input type="date">` | [462](bbl-profile.html#L462) |
| Contract einde | `#contract_end` | `<input type="date">` | [466](bbl-profile.html#L466) |
| Leerdoel 1-5 | `#ld1` t/m `#ld5` | 5 × `<input type="text">` | [489-493](bbl-profile.html#L489) |

Validatie: einddatum mag niet vóór startdatum liggen ([680-683](bbl-profile.html#L680)). Geen validatie op start ≤ vandaag.

### 1b. Save-functie (Supabase-upsert)

**Functie:** `saveProfile()` op [653-743](bbl-profile.html#L653).

```js
const payload = {
  profile_id, naam, opleiding, jaar, school, schooldag, postcode,
  opdracht_domein, motivatie, skills, bbl_mode: true, pb_naam,
  contract_start, contract_end, avatar_key, zoekt_buddy
};
await db.from('student_profiles').upsert(payload, { onConflict: 'profile_id' });
```

- `skills` is een JS-array van non-empty leerdoelen → wordt direct als JSONB array opgeslagen.
- `contract_start` / `contract_end` worden 1-op-1 doorgegeven (string `'YYYY-MM-DD'` of `null`).
- `leeragreement_url` en `leeragreement_uploaded_at` zitten **niet** in de payload — feature ontbreekt nog.

⚠ **Belangrijke observatie:** `bedrijfsnaam` en `uren_per_week` staan in `localStorage` ([727-730](bbl-profile.html#L727)), niet in Supabase. Sleutel: `internly_bbl_bedrijf_<user.id>`. Dit verklaart waarom bbl-dashboard regel 700 op localStorage terugvalt voor de bedrijfsnaam.

### 1c. Sectie voor leeragreement_url

**Geen.** Grep op `leeragreement` in bbl-profile.html: 0 hits. De sectie moet in Fase 4 C3 worden toegevoegd.

### 1d. Na opslaan: reload of in-place?

**In-place.** Na succesvolle upsert ([721-742](bbl-profile.html#L721)):
1. `isEditMode = true`
2. localStorage cache schrijven (bedrijfsnaam + uren)
3. `notify(...)`
4. `showOverview(overviewData)` → toggle DIVs visible/hidden, geen page-reload

**Implicatie voor Fase 5 (BroadcastChannel):** broadcast moet ná `db.upsert(...)` succes komen, vóór de `showOverview()`-call — anders zien open tabs van bbl-dashboard niet de nieuwe data.

---

## 2. bbl-dashboard.html

### 2a. Profiel-bron: Supabase of localStorage?

**Supabase fresh elke load.** Geen client-side cache van het profiel zelf.

- Auth + role guard: [561-578](bbl-dashboard.html#L561)
- Student profiel SELECT: [581-585](bbl-dashboard.html#L581) — kolommen: `profile_id, opleiding, schooldag, skills, bbl_mode, school`
- Match SELECT: [616-627](bbl-dashboard.html#L616)

⚠ De `student_profiles`-SELECT op regel 583 fetcht **NIET**: `naam`, `pb_naam`, `contract_start`, `contract_end`, `motivatie`, `opdracht_domein`, `jaar`, `postcode`, `leeragreement_url`, `leeragreement_uploaded_at`.

**Wel localStorage-fallback voor leerdoelen-progress** ([517](bbl-dashboard.html#L517)): sleutel `internly_ld_<userId>`. Dit is alleen voor checkbox-state (gedaan/niet-gedaan), niet voor de leerdoelen zelf — die komen uit `sp.skills`.

**Wel localStorage-fallback voor bedrijfsnaam in bbl-hub** ([2700-2701](bbl-hub.html#L2700)): sleutel `internly_bbl_bedrijf_<user.id>`.

### 2b. Profiel-afhankelijke elementen

| Element | Bron | Regel |
|---|---|---|
| `#welcomeMsg` (groet + naam) | `setWelcome(naam)` — naam uit `user.user_metadata.naam` (NIET uit profiles.naam) | [536-541](bbl-dashboard.html#L536), [613](bbl-dashboard.html#L613) |
| `#contractStrip` (indien `match.contract_end_date`) | match-tabel | [424-439](bbl-dashboard.html#L424) |
| `#statBedrijf`, `#statUren` (Mijn traject card) | `match.internship_postings.company_name` / `hours_per_week` | [443-449](bbl-dashboard.html#L443) |
| `#statStart`, `#statEinde` | `match.internship_postings.contract_start/end` (NIET `student_profiles`) | [447-448](bbl-dashboard.html#L447) |
| `#begeleidersContent` | `pbNaam` uit `profiles.naam` via `match.praktijkbegeleider_profile_id` + `rocNaam` via ilike op school | [453-466](bbl-dashboard.html#L453), [644-666](bbl-dashboard.html#L644) |
| `#meetingsList` | meetings tabel ([676-686](bbl-dashboard.html#L676)) | [470-495](bbl-dashboard.html#L470) |
| `#leerdoelenContent` | `sp.skills` (max 5) + progress uit `sp.skills` JSONB of localStorage | [499-532](bbl-dashboard.html#L499) |
| `#account-container` | `AccountModule.renderAccountScreen` | [608](bbl-dashboard.html#L608) |

🟡 **Voor Fase 4 C4 (leeragreement-card op dashboard):** SELECT op regel 583 moet `leeragreement_url, leeragreement_uploaded_at` toevoegen.

🟡 **Voor Fix 7 (tab-key fix):** `renderStudentHeader({ activeTab: 'matches' })` op [612](bbl-dashboard.html#L612) gebruikt key `'matches'` — die staat **niet** in `HEADER_NAV_BY_ROLE.student_bbl`. Zie sectie 5.

🟡 **Voor Fix 8 (getDisplayName-adoptie):** [611](bbl-dashboard.html#L611) heeft het inline-patroon `user.user_metadata?.naam || user.user_metadata?.name || user.email?.split('@')?.[0] || 'Student'` met fallback `'Student'`.

### 2c. Page-init functie-naam (voor Fase 5)

**Geen genoemde wrapper-functie.** Alle init-logica zit inline in `window.addEventListener('DOMContentLoaded', async () => { … })` op [558-694](bbl-dashboard.html#L558). 

**Implicatie voor Fase 5:** er is geen aanroepbare `loadDashboard()` om in een BroadcastChannel-handler aan te roepen. Twee opties:
- Optie A: hele init-handler hernoemen naar `async function initDashboard()` en aanroepen bij beide DOMContentLoaded én bij broadcast-message.
- Optie B: alleen de visueel relevante delen (renderTraject, renderLeerdoelen, renderBegeleiders) extraheren in een `refreshFromProfile()`-helper en die aanroepen op broadcast.

Optie B is veiliger (niet de hele auth-guard opnieuw draaien), maar vereist het uittrekken van de match-fetch en sp-fetch.

---

## 3. bbl-hub.html

### 3a. Bestaat er al een leeragreement-sectie?

**Nee.** Grep op `leeragreement` in bbl-hub.html: 0 hits.

### 3b. Welke kolommen worden gefetcht uit student_profiles?

[bbl-hub.html:2594-2598](bbl-hub.html#L2594):
```sql
profile_id, naam, opleiding, sector, opdracht_domein, schooldag,
skills, bbl_mode, school, pb_naam, contract_start, contract_end, jaar
```

**13 kolommen.** Mist nog: `leeragreement_url`, `leeragreement_uploaded_at` (komen pas in Fase 4 C5).

### 3c. Stage-overzicht / contract-sectie locatie

Voor Fase 4 C5 ("voeg leeragreement toe als primair document boven de stage-kaart") moet handmatig de juiste plek bepaald worden. Bevindingen:

- `contract_start` / `contract_end` worden gebruikt op [2652](bbl-hub.html#L2652) voor `updateContractStrip()` en op [2658](bbl-hub.html#L2658) voor `anonDateEl`.
- Er is een `#renew*`-blok ([2693-2711](bbl-hub.html#L2693)) voor renewal-status.
- bbl-hub.html is 8000+ regels — de visuele indeling van "stage-overzicht" / "contract-strip" is verspreid. Concrete plek-bepaling vereist run-time inspectie of nadere lectuur.

🟡 **Aanbeveling Fase 4 C5:** plaats de leeragreement-sectie binnen het "Overzicht"-tab-content-blok (de eerste view die zichtbaar is bij `activeTab: 'discover'`). Exacte regel pas in Fase 4 vaststellen.

---

## 4. mijn-berichten.html

### 4a. Empty-state sectie

**Functie:** `_emptyStateHtml()` op [428-452](mijn-berichten.html#L428).

Huidige code:
```js
const _isStudent = _role === 'student';
const begBtnHtml = (_isStudent && !_isBBL && !_hasBegeleider)
  ? `<button class="empty-cta-btn tertiary" onclick="openBegeleiderModal()">+ Voeg begeleider toe</button>`
  : '';
const ctaHtml = _isStudent
  ? `<a href="/discover.html" class="empty-cta-btn primary">Vind een stage</a>
     <a href="/buddy-dashboard.html" class="empty-cta-btn secondary">Vind een buddy</a>
     ${begBtnHtml}`
  : `<a href="/buddy-dashboard.html" class="empty-cta-btn primary">Terug naar dashboard</a>`;
```

### 4b. Huidige CTA-tekst en hrefs

| CTA | Tekst | Href | Klasse | Conditie |
|---|---|---|---|---|
| Primary | "Vind een stage" | `/discover.html` | `empty-cta-btn primary` | student (BOL én BBL) |
| Secondary | "Vind een buddy" | `/buddy-dashboard.html` | `empty-cta-btn secondary` | student (BOL én BBL) |
| Tertiary | "+ Voeg begeleider toe" | `openBegeleiderModal()` (geen href) | `empty-cta-btn tertiary` | student én **niet-BBL** én geen begeleider |
| Buddy-only | "Terug naar dashboard" | `/buddy-dashboard.html` | `empty-cta-btn primary` | gepensioneerd-rol |

⚠ Voor BBL-studenten is "Vind een stage" misleidend — BBL-student heeft al een leerbedrijf. En "Vind een buddy" is wel passend gegeven CLAUDE.md HEADER_NAV_BY_ROLE.student_bbl ook 'buddy' bevat.

### 4c. Is bbl_mode beschikbaar in `_emptyStateHtml()`?

✅ **Ja.** Module-scope variabele `let _isBBL = false` op [325](mijn-berichten.html#L325). Gezet vóór de eerste render in de DOMContentLoaded-handler op [858-865](mijn-berichten.html#L858):

```js
if (userRole === 'student') {
  const { data: sp } = await db.from('student_profiles')
    .select('bbl_mode').eq('profile_id', user.id).maybeSingle();
  _isBBL = sp?.bbl_mode === true;
} else {
  _isBBL = false;
}
```

**Implicatie voor Fase 3:** geen extra DB-fetch nodig. Conditional rendering kan direct `_isBBL` lezen.

Merk op: de `_emptyStateHtml()`-functie gebruikt `_isBBL` al in de begBtnHtml-conditie ([431](mijn-berichten.html#L431)), dus hij is daadwerkelijk in scope.

---

## 5. js/utils.js — student_bbl nav-config

### 5a. Exacte tab-keys in `HEADER_NAV_BY_ROLE.student_bbl`

[js/utils.js:958-964](js/utils.js#L958):
```js
student_bbl: [
  { id: 'discover',     label: 'Overzicht',       href: 'bbl-hub.html',             icon: '🔧' },
  { id: 'matchpool',    label: 'Matchpool',       href: 'matchpool.html',           icon: '🌊' },
  { id: 'berichten',    label: 'Berichten',       href: 'mijn-berichten.html',      icon: '💬' },
  { id: 'profiel',      label: 'Profiel',         href: 'bbl-profile.html',         icon: '👤' },
  { id: 'buddy',        label: 'Buddy',           href: 'matches.html?view=buddy',  icon: '🤝' },
],
```

5 keys: `'discover'`, `'matchpool'`, `'berichten'`, `'profiel'`, `'buddy'`.

### 5b. Welke key staat het dichtst bij "dashboard/overzicht"?

**`'discover'`** — label: `'Overzicht'`, href: `bbl-hub.html`. Deze key heeft expliciet de "Overzicht"-betekenis voor BBL-studenten.

⚠ **Implicatie voor Fix 7 (bbl-dashboard tab-key):**
- Huidig: `renderStudentHeader({ activeTab: 'matches' })` → `'matches'` is geen key, dus geen tab gemarkeerd.
- Door instructie voorgeschreven: `renderStudentHeader({ activeTab: null })` → expliciet geen actieve tab.
- Alternatief: `'discover'` zou de Overzicht-tab markeren — maar daar wijst `discover` naar `bbl-hub.html`, wat een **andere** pagina is dan bbl-dashboard.html. Dus `null` is de juiste keuze, conform de instructie.

🟡 **Architecturele overweging (geen Fase 1 actie):** bbl-dashboard.html lijkt deels overlap te hebben met bbl-hub.html. Per CLAUDE.md routing-canon is bbl-hub.html de canon voor BBL-studenten (`bbl_mode === true → bbl-hub.html`). bbl-dashboard.html staat **niet** in de routing-canon. Mogelijk is bbl-dashboard een legacy-pagina die wegmoet — maar dat is buiten scope van deze fix-run.

### 5c. renderStudentHeader-implementatie

[js/utils.js:1245-1291](js/utils.js#L1245). De helper:
1. Fetcht `profiles.naam, role, is_buddy_eligible`
2. Fetcht `student_profiles.bbl_mode, buddy_opt_in`
3. Fetcht buddy_pairs count
4. Roept `_renderStudentHeaderLoggedIn({ profile, bblMode, buddyCount, activeTab })` aan

`bblMode` wordt **intern** gedetecteerd binnen renderStudentHeader. Pagina hoeft niets door te geven.

---

## 6. Aanvullende observaties (voor latere fasen)

### 6a. Schema-velden status

Volgens prompt: `leeragreement_url` (text) + `leeragreement_uploaded_at` (timestamptz) zijn **al toegevoegd** aan `student_profiles`. Geen actie in Fase 4 C0 nodig.

Storage bucket `'leeragreementen'` bestaat al (private). 🟡 RLS-policy is een handmatige actie (genoteerd in Fase 6 eindrapport-checklist).

### 6b. Plekken die SELECT moeten uitbreiden in Fase 4

| Bestand | Huidige SELECT | Toevoegen |
|---|---|---|
| [bbl-profile.html:755](bbl-profile.html#L755) | `select('*')` (P1-Bedward-overtreding maar fetcht alles) | ✅ al beschikbaar |
| [bbl-dashboard.html:583](bbl-dashboard.html#L583) | `'profile_id, opleiding, schooldag, skills, bbl_mode, school'` | + `leeragreement_url, leeragreement_uploaded_at` |
| [bbl-hub.html:2596](bbl-hub.html#L2596) | 13-kolommen-lijst zonder leeragreement | + `leeragreement_url, leeragreement_uploaded_at` |

### 6c. Bestaande silent catches in bbl-dashboard / bbl-hub die Fase 1 raakt

| Locatie | Status | Fase 1 Fix-id |
|---|---|---|
| [bbl-dashboard.html:514](bbl-dashboard.html#L514) | catch na student_profiles.skills SELECT | Fix 3a |
| [bbl-hub.html:1257](bbl-hub.html#L1257) | catch na JSON.parse msg.metadata | Fix 3e |
| [bbl-hub.html:1812](bbl-hub.html#L1812) | catch na student_profiles.skills_progress | Fix 3b |
| [bbl-hub.html:1933](bbl-hub.html#L1933) | catch na JSON.parse STARR | Fix 3c |
| [bbl-hub.html:2459](bbl-hub.html#L2459) | catch na renewal_status read | Fix 3d |
| [bbl-hub.html:2480](bbl-hub.html#L2480) | catch na renewal_status read **vóór UPDATE** (P0 data-loss) | Fix 1 |

### 6d. signOut-implementaties bevestigd

| Bestand:regel | Soort |
|---|---|
| [bbl-dashboard.html:419](bbl-dashboard.html#L419) | 1-line delegator → `performLogout()` ✓ |
| [bbl-profile.html:560](bbl-profile.html#L560) | 1-line delegator → `performLogout()` ✓ |
| [international-student-dashboard.html:2349](international-student-dashboard.html#L2349) | eigen async signOut zonder push-cleanup → **Fix 4** |
| [international-school-dashboard.html:996](international-school-dashboard.html#L996) | eigen async signOut zonder push-cleanup → **Fix 5** |

---

## 7. Open vragen / risico's voor Fase 1+

🟡 **R1 — bbl-dashboard init-functie heeft geen naam.** Voor Fase 5 (BroadcastChannel) moet ik óf de hele DOMContentLoaded-handler in een named function trekken, óf alleen de profiel-afhankelijke render-functies aanroepen op broadcast. Voorkeur: **Optie B** — `async function refreshProfileData(userId)` extraheren met alleen de match-fetch + render-traject + render-leerdoelen + (Fase 4) leeragreement-card. Dit maakt Fase 5 robuust en raakt geen auth-guard.

🟡 **R2 — bbl-hub overlap met bbl-dashboard.** bbl-hub.html is volgens CLAUDE.md de canon-bestemming. bbl-dashboard.html lijkt parallelle functionaliteit te hebben (welkom + traject + leerdoelen + meetings + begeleiders). Voor deze run: **niet aanraken** behalve de specifieke fixes. Mogelijke deprecation post-livetest.

🟡 **R3 — bbl-hub C5 plek onduidelijk.** Het 8000-regel-bestand heeft meerdere "view"-tabs. De prompt-instructie zegt "boven de stage-kaart" — die plek moet in Fase 4 zelf gevonden worden (extra grep nodig). Geen blocker.

🟢 **R4 — geen schema-blockers.** Alle benodigde kolommen (`leeragreement_url`, `leeragreement_uploaded_at`, `skills`, `bbl_mode`, `contract_start`, `contract_end`) bestaan in `student_profiles`. Alle benodigde tabellen bestaan.

🟢 **R5 — `_isBBL` is in scope op het juiste moment in mijn-berichten.** Fase 3 kan rechtstreeks de bestaande variabele lezen, geen herfetch nodig.

---

## STOP — wachten op GO voor Fase 1

Geen wijzigingen aangebracht. Bovenstaand rapport is volledig op de 5 gevraagde files + cross-referenties met fix-instructies. Geef GO om met Fase 1 te starten (8 fixes + commit).
