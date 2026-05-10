# BBL + AUDIT FIX RUN — eindrapport

**Datum uitgevoerd:** 2026-05-10
**Voor livetest:** 2026-05-11
**Branch:** main
**Commits in deze run:** 8 (4e95330..b6c8fee)

## Statusoverzicht

| Fase | Status | Commit | Files | Diff |
|---|---|---|---|---|
| 0 — Diagnose | ✅ DONE | (geen — alleen rapport) | docs/audits/BBL_DIAGNOSE.md | nieuw |
| 1 — Kritieke bug fixes | ✅ DONE | `4e95330` | 11 files | +48/-39 |
| 2 — bbl-profile design polish | ✅ DONE | `87893ac` | 1 file | +242/-27 |
| 3 — mijn-berichten BBL-CTA | ✅ DONE | `e9b5396` | 1 file | +8/-4 |
| 4 — Leeragreement infra (4 commits) | ✅ DONE | `0931fcb` `4b8e9fa` `1fcf2cc` `671f555` | 6 files | +565/-2 |
| 5 — BroadcastChannel propagatie | ✅ DONE | `b6c8fee` | 3 files | +76 |

**Totaal:** 8 commits, ±930 regels nieuwe code, 12 unieke bestanden geraakt + 2 nieuwe scripts.

## Fase 1 — Kritieke bug fixes

### Status: DONE (commit 4e95330)

Acht discrete fixes in één commit zoals voorgeschreven:

| # | Bestand:regel | Fix | Type |
|---|---|---|---|
| 1 | [bbl-hub.html:2480](../bbl-hub.html#L2480) | renewal_status read-modify-write — silent SELECT-fail wist partner's keuze. Nu console.error + notify + early return vóór UPDATE. | P0 data-loss |
| 2 | [company-dashboard.html:3154](../company-dashboard.html#L3154) | acceptPush() silent registratie-fail. Nu console.warn + notify zodat user weet dat retry nodig is. | P0 silent UI |
| 3a | [bbl-dashboard.html:514](../bbl-dashboard.html#L514) | console.warn op skills-fetch | P1 |
| 3b | [bbl-hub.html:1812](../bbl-hub.html#L1812) | console.warn op skills_progress fetch | P1 |
| 3c | [bbl-hub.html:1933](../bbl-hub.html#L1933) | console.warn op STARR JSON corrupt | P1 |
| 3d | [bbl-hub.html:2459](../bbl-hub.html#L2459) | console.warn op renewal_status read (render-pad) | P1 |
| 3e | [bbl-hub.html:1257](../bbl-hub.html#L1257) | console.warn op JSON.parse msg.metadata | P1 |
| 3f | [buddy-dashboard.html:1126](../buddy-dashboard.html#L1126) | console.warn op waitlist toggle-fetch | P1 |
| 3g | [buddy-dashboard.html:1327](../buddy-dashboard.html#L1327) | console.error op buddyInit() — kritischer dan warn want module-init-falen | P1 |
| 4 | [international-student-dashboard.html:2349](../international-student-dashboard.html#L2349) | signOut fork → 1-line delegator naar performLogout(). Herstelt push-cleanup (F7.3.A cross-account-leak). | refactor |
| 5 | [international-school-dashboard.html:996](../international-school-dashboard.html#L996) | idem | refactor |
| 6 | [student-home.html:240](../student-home.html#L240) | BBL-redirect toegevoegd vóór naam-check via getRoleLanding('student', true). | routing |
| 7 | [bbl-dashboard.html:612](../bbl-dashboard.html#L612) | activeTab `'matches'` (ongeldige student_bbl-key) → `null` | nav-config |
| 8 | [js/utils.js:374](../js/utils.js#L374) + 5 callsites | getDisplayName uitgebreid met fallback-param + parity user_metadata.name. Adoptie in bbl-dashboard, bbl-profile, buddy-dashboard, chat, auth. | refactor |

**Openstaande risico's:** geen.

**Niet gemigreerd in deze run** (bewust uitgesteld tot na livetest): bbl-hub.html (10 inline getDisplayName-patronen) + mijn-berichten.html (3 patronen). Te veel context-bytes vlak voor livetest.

## Fase 2 — bbl-profile design polish

### Status: DONE (commit 87893ac)

Zes sub-fixes A1-A6 in één commit:

- **A1** — empty-field action-hints op 6 velden (schooldag, postcode, bedrijfsnaam, contract bij niet-beide, uren, pb). `_emptyHint()` genereert clickable span die showForm() opent.
- **A2** — contract-display: bij beide datums ingevuld toont gecombineerde "X maanden — start Y, eind Z" string in cel met grid-column 1/-1. End-cell wordt verborgen. Reset-logica voor re-render.
- **A3** — leerbedrijf-velden gewrapt in card-in-card met paarse 3px left-border + zachte paarse achtergrond + uppercase label "MIJN LEERBEDRIJF".
- **A4** — leerdoelen quick-add inline form als skills==[]. Submit (Enter of klik) schrijft naar `student_profiles.skills` (jsonb array, **niet** een aparte leerdoelen-kolom — consistent met saveProfile-payload). Dedup-check + max 5. **Bonus:** chips kregen ✓ + ×-verwijder-knop met removeLeerdoel() voor in-place verwijderen.
- **A5** — beschikbaarheid-grid kreeg legenda (groen/oranje/rood-dots) + tip "dubbelklik voor hele dag".
- **A6** — BBL-badge van groen-getint naar paars (#7c3aed wit, padding 6px 14px) + title-attribute.

**Behouden:** alle bestaande IDs, schema, form-field names. Drie nieuwe IDs voor cleaner JS-targeting in A2 (`ov-contract-start-cell`, `ov-contract-end-cell`, `ov-contract-start-label`).

**Openstaande risico's:** geen.

## Fase 3 — mijn-berichten BBL-aware CTA

### Status: DONE (commit e9b5396)

Conditional rendering in `_emptyStateHtml()`:

| Rol | Primary | Secondary | Tertiary |
|---|---|---|---|
| BBL-student | "Bekijk leeragreement" → `bbl-profile.html#leeragreement` | "Vind een buddy" → `/buddy-dashboard.html` | — |
| BOL-student | "Vind een stage" → `/discover.html` (ongewijzigd) | "Vind een buddy" (ongewijzigd) | "+ Voeg begeleider toe" (al `!_isBBL`-guarded) |
| Buddy/gepensioneerd | "Terug naar dashboard" (ongewijzigd) | — | — |

Geen extra DB-fetch — `_isBBL` is al module-scope variabele uit DOMContentLoaded.

**Openstaande risico's:** geen.

## Fase 4 — Leeragreement infra

### Status: DONE (4 sub-commits zoals voorgeschreven)

#### C1+C2 (commit 0931fcb) — scripts

- [scripts/generate-bbl-placeholder.py](../scripts/generate-bbl-placeholder.py) — reportlab-gebaseerde PDF-generator voor 5 BBL-studenten. Hardcoded student-data (geen DB-connectie).
- [scripts/seed-leeragreementen.js](../scripts/seed-leeragreementen.js) — Node-script (NIET uitgevoerd) dat PDFs uploadt naar Supabase Storage + UPDATE student_profiles. 4 profile_ids hardcoded uit SQL-audit; Daan H. opgelost runtime via `auth.admin.listUsers()`.
- `.gitignore` uitgebreid: `scripts/output/` + `.env` + `node_modules/`.

#### C3 (commit 4b8e9fa) — bbl-profile.html

- Nieuwe `<section id="leeragreement">` tussen leerbedrijf-card (Fase 2 A3) en leerdoelen (Fase 2 A4) — anchor matcht mijn-berichten BBL-CTA uit Fase 3.
- Twee toggle-states: `la-aanwezig` / `la-leeg` met Bekijk/Vervang/Upload-knoppen.
- JS-functies: `loadLeeragreement()` / `triggerLaUpload()` / `handleLaUpload()` met PDF-validatie (10MB max), upload met `upsert: true`, signed URL 7 dagen TTL, DB-update.

#### C4 (commit 1fcf2cc) — bbl-dashboard.html

- Full-width `.dash-card` tussen grid-rij 1 en grid-rij 2.
- Status: "✓ Geüpload (D MMM YYYY)" of "Nog niet geüpload" + dynamische pill-link.
- SELECT uitgebreid van 6 → 8 kolommen.
- Nieuwe `renderLeeragreementCard(sp)` helper.

#### C5 (commit 671f555) — bbl-hub.html

- `.hub-la-banner` tussen contract-strip en view-tabs (zichtbaar op alle 4 views).
- Bij geüpload: Download-knop opent signed URL `target="_blank"`. Bij leeg: Upload-knop linkt naar `bbl-profile.html#leeragreement`.
- SELECT uitgebreid van 13 → 15 kolommen.
- Nieuwe `renderHubLeeragreement(sp)` helper.

**Openstaande risico's:**

🟡 **Signed URL TTL-verloop.** Seeded URLs zijn 7 dagen geldig. Voor livetest 11 mei voldoende. **Post-livetest:** overweeg Supabase Storage public-bucket of refresh-cron voor langere geldigheid, of switch naar `getPublicUrl()` als bucket public mag worden.

🟡 **Upload-pad RLS-afhankelijk.** De C3 upload-flow vanuit bbl-profile gebruikt user-token (anon-key + bearer). Werkt alleen als RLS-policy correct is — zie handmatige actie hieronder.

## Fase 5 — BroadcastChannel propagatie

### Status: DONE (commit b6c8fee)

- bbl-profile broadcast `'internly-profile-update'` kanaal na succesvolle upsert.
- bbl-dashboard kreeg module-scope `currentUser` + `refreshProfileData(userId)` (re-fetcht 8-kolommen-SELECT, herrendert leerdoelen + leeragreement-card). Niet de auth-guard, match-fetch, meetings-fetch of begeleiders-fetch — Optie B uit diagnose.
- bbl-hub gebruikt bestaande module-scope `currentUser` + `currentStudentProfile`. Nieuwe `refreshHubProfile(userId)` (re-fetcht 15-kolommen-SELECT, update cache, herrender leeragreement-banner + contract-strip met bestaande activeMatch).

**Openstaande risico's:**

🟢 **BroadcastChannel-API support:** Chrome ≥54, Firefox ≥38, Safari ≥15.4, Edge ≥79. Test-doelgroep livetest is dekkend. Try/catch op alle drie de plekken zodat oudere Safari niet kapot gaat.

🟡 **Multi-tab fluttering.** Als gebruiker bbl-profile + bbl-dashboard + bbl-hub tegelijk open heeft, kan een snelle reeks saves drie re-fetches triggeren. Geen race-conditie verwacht (idempotent renders), wel meer DB-load. Geen actie nodig voor MVP.

## Handmatige acties voor Barry

### 🔴 Vóór livetest

1. **Genereer placeholder PDFs:**
   ```bash
   pip install reportlab
   python scripts/generate-bbl-placeholder.py
   ```
   Output in `scripts/output/`. Verwacht: 5 PDFs (~3KB elk).

2. **Configureer .env voor seed-script:**
   ```
   SUPABASE_URL=https://qoxgbkbnjsycodcqqmft.supabase.co
   SUPABASE_SERVICE_KEY=<service-role key uit Supabase dashboard>
   ```
   ⚠ **Service-role-key, NIET anon-key.** Service-role bypasst RLS — nodig voor cross-user updates.

3. **Run seed-script:**
   ```bash
   npm install @supabase/supabase-js dotenv
   node scripts/seed-leeragreementen.js
   ```
   Verwacht output: "Klaar: 5 succes / 0 mislukt". Bij failure: check error-output regel-per-regel.

4. **RLS-policy op storage.objects voor leeragreementen-bucket** (kritiek — anders kan student vanuit bbl-profile upload-knop niet werken):
   ```sql
   CREATE POLICY "student_eigen_leeragreement" ON storage.objects
   FOR ALL TO authenticated
   USING (bucket_id = 'leeragreementen'
     AND (storage.foldername(name))[1] = auth.uid()::text)
   WITH CHECK (bucket_id = 'leeragreementen'
     AND (storage.foldername(name))[1] = auth.uid()::text);
   ```
   Draai dit in Supabase Console → SQL Editor. Test daarna door als test-student in te loggen en handmatig een PDF te uploaden via bbl-profile.html → "Upload leeragreement (PDF)".

5. **FTP-upload van gewijzigde files:** zie commit-log via `git log main~9..main --name-only` voor de complete lijst. Korte samenvatting:
   - HTML: `auth.html`, `bbl-dashboard.html`, `bbl-hub.html`, `bbl-profile.html`, `buddy-dashboard.html`, `chat.html`, `company-dashboard.html`, `international-school-dashboard.html`, `international-student-dashboard.html`, `mijn-berichten.html`, `student-home.html`
   - JS: `js/utils.js`
   - Geen scripts FTP'en (dev-only — die staan in .gitignore-output ofwel buiten public_html).

### 🟡 Na livetest (tech-debt)

6. **17 resterende getDisplayName-sites migreren:**
   - bbl-hub.html: 10 inline patronen op regels 1326, 1382, 1456, 1656, 1671, 1756, 2036, 2376, 2386, 2497
   - mijn-berichten.html: 3 patronen op regels 528, 551, 826
   - admin.html, begeleider-dashboard.html, bbl-profile.html (line ~? 2nd hit), bol-profile.html (line ~? 2nd hit) — eventueel nog 4 losse hits
   - Geschat: 60 min refactor sessie.

7. **ESLint setup voor `no-undef`** (post-livetest opruim):
   - Maak `.eslintrc.json` met globals voor `db`, `supabase`, `notify`, `escapeHtml`, `formatDate`, `getDisplayName`, etc.
   - `npm install --save-dev eslint`
   - `npx eslint *.html --rule no-undef:error` (vereist eslint-plugin-html)
   - Levert harde detectie op undefined-variables en onbeschikbare functie-calls die deze run niet kon vinden.

8. **bbl-dashboard vs bbl-hub overlap evalueren:** beide pagina's hebben begeleiders + leerdoelen + meetings. CLAUDE.md routing-canon noemt alleen bbl-hub. bbl-dashboard staat niet in `resolveStudentDashboard()`. Kandidaat voor deprecation, maar buiten scope van deze run.

9. **Schema-lijst documenteren in CLAUDE.md:** uit JS_ERRORS_SMOKETEST.md bleek dat 7 tabellen (`applications`, `subscriptions`, `learning_agreements`, `school_postings`, `vestigingen`, `buddy_notes`, `international_school_profiles`) niet in de prompt-lijst stonden maar wel bestaan en gebruikt worden. Toevoegen aan een nieuwe `## Database schema (canonical)`-sectie.

10. **Twee verdachte tabel-referenties verifiëren:** `internships` (parallel aan `internship_postings` in discover.html + matches.html) en `stage_milestones` (single callsite in company-dashboard.html). Open Supabase Console en check existeren — als phantom: stub-code verwijderen.

### 🟢 Geen actie nodig

- Push-subscription cleanup is al hersteld voor international-flows via Fix 4+5.
- BroadcastChannel werkt cross-browser voor de livetest-doelgroep.
- Alle helpers (`getDisplayName`, `getDaypartGreeting`, `notify`, `escapeHtml`, `formatDate`) zijn op `window.*` geëxposeerd vanuit `js/utils.js` — beschikbaar op alle pagina's die utils.js laden.

## Bekende beperkingen die uit deze run komen

🟡 **Seed-script is niet idempotent op het signed-URL-niveau.** Bij elke run wordt een nieuwe URL gegenereerd. Oude URLs blijven werken tot hun TTL verloopt. Voor livetest acceptabel, voor productie: overweeg conditional update (alleen URL vernieuwen bij overschrijven).

🟡 **bbl-profile leeragreement-upload werkt alleen voor de eigenaar.** Service-role-key wordt niet in browser gebruikt (terecht — security). Als de RLS-policy ontbreekt, faalt de upload silent met "policy violation". Test-flow voor Barry: log in als student, ga naar bbl-profile, klik upload — verwacht success-toast OF zichtbare error in console.

🟡 **Fase 2 A4 leerdoelen quick-add gebruikt `student_profiles.skills`-kolom (jsonb).** Dit is consistent met saveProfile, maar verwart wellicht: er zijn geen aparte "leerdoelen"-kolom. CLAUDE.md kan een opmerking gebruiken: "BBL-leerdoelen worden opgeslagen als `student_profiles.skills` (jsonb array van strings) — niet aparte kolom."

## Commit-keten (volledig)

```
b6c8fee fix: profile-save → BroadcastChannel propagatie bbl-dashboard + bbl-hub
671f555 feat: bbl-hub leeragreement-banner (C5)
1fcf2cc feat: bbl-dashboard leeragreement-card (C4)
4b8e9fa feat: bbl-profile leeragreement-sectie (C3)
0931fcb feat: leeragreement infra — placeholder PDF script + seed-script
e9b5396 feat: BBL-aware CTAs in mijn-berichten empty-state
87893ac ux: bbl-profile design polish — A1 empty-hints, A2 contract, A3 leerbedrijf-card, A4 leerdoelen, A5 legenda, A6 badge
4e95330 fix: BBL+audit Fase 1 — P0 data-loss + P0 push + P1 warns + signOut forks + tab-key + getDisplayName
```

Voor pushen naar remote: `git push origin main`. Niet automatisch gedaan (CLAUDE.md regel — geen push zonder expliciete instructie).
