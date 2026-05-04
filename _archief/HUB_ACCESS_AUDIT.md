# HUB TOEGANG AUDIT — 30 april 2026

## COMPANY-DASHBOARD

### Hub-links gevonden

| Lijn | Code (samenvatting) | Trigger | Doel-URL |
|---|---|---|---|
| [company-dashboard.html:632-634](company-dashboard.html#L632) | `<button id="nav-stagehub" onclick="window.location.href='match-dashboard.html'">📊 Stage Hub</button>` | Sidebar-nav knop (top-level) | **`match-dashboard.html` ZONDER `?match=` param** |
| [company-dashboard.html:1621-1625](company-dashboard.html#L1621) | `<a href="match-dashboard.html?match=${m.id}">📊 Stage Hub →</a>` | Match-card actie-rij in `loadCompanyMatches()`, condition: `hasConv && hasBusiness` | `match-dashboard.html?match=<match-id>` |
| [company-dashboard.html:1855-1859](company-dashboard.html#L1855) | `<a href="match-dashboard.html?match=${m.id}">📊 Stage Hub →</a>` | Match-card in berichten-screen (`loadBerichten`), condition: `hasBusiness` | `match-dashboard.html?match=<match-id>` |

### A. Student-overview voordat hub opent? **NEE.**
De company gaat direct van match-card naar match-dashboard. Geen tussenscherm dat alle studenten/matches met één-klik-naar-hub overzicht toont. Wel een student-switcher binnen match-dashboard zelf (zie sectie MATCH-DASHBOARD ROLE VIEWS).

### B. Role-filtering bij match-dashboard load voor bedrijf? **PARTIAL.**
- URL bevat geen role-param.
- match-dashboard detecteert role via `auth.uid() === matchRow.party_b → 'bedrijf'` ([match-dashboard.html:2843-2844](match-dashboard.html#L2843)).
- UI past zich aan via `CAN['bedrijf']` permissions-tabel (zie hieronder), maar er is GEEN expliciete "bedrijf-view"-render. De bedrijf ziet dezelfde tabs als de student, met andere knop-zichtbaarheid.

### C. Match-card velden (loadCompanyMatches, [company-dashboard.html:1545-1633](company-dashboard.html#L1545)):
SELECT: `id, status, party_a, type, created_at, internship_postings(title, company_name, response_days)`

Weergegeven per card:
- Posting-titel
- Created_at (Nederlandse datum)
- Deadline-meter (alleen bij pending)
- Status-badge (pending/accepted/rejected/active)
- Action-rij: Accepteren/Afwijzen knoppen (pending), 💬 Open chat link (accepted/active), 📊 Stage Hub link (accepted/active + business plan), Stage afronden knop (accepted)

**Geen voortgangs-percentage of mijlpaal-indicator op de card.** De card toont status maar geen progress-bar.

---

## SCHOOL-DASHBOARD

### Hub-links gevonden

| Lijn | Code (samenvatting) | Trigger | Doel-URL |
|---|---|---|---|
| [school-dashboard.html:658-660](school-dashboard.html#L658) | `<button id="nav-stagehub" onclick="window.location.href='match-dashboard.html'">📊 Stage Hub</button>` | Sidebar-nav (top-level) | **`match-dashboard.html` ZONDER `?match=` param** |
| [school-dashboard.html:1507-1509](school-dashboard.html#L1507) | `<a href="match-dashboard.html?match=${s.matchId}">📊 Hub</a>` | Student-row in `renderStudentenRows`, condition: `_isPremiumSchool && s.matchId` | `match-dashboard.html?match=<match-id>` |
| [school-dashboard.html:1629-1632](school-dashboard.html#L1629) | `<a href="match-dashboard.html?match=${s.matchId}">📊 Stage Hub →</a>` | Signal-card (risico) in `renderSignalen`, condition: `s.matchId` aanwezig | `match-dashboard.html?match=<match-id>` |

### A. Student-overview voordat hub opent? **JA.**
De school-dashboard heeft een echte studentenlijst (sectie "Studenten") via `loadStudenten()` die alle studenten + status + Hub-link toont. Dit is het dichtst bij wat de wens beschrijft, maar het is een lijst, geen detail-view.

### B. In-dashboard detail-view? **NEE — GEEN klikbare expand.**
- Er is wel een **bevestigingsmodal** voor pending milestones ([school-dashboard.html:1517-1605](school-dashboard.html#L1517)) die binnen het school-dashboard opent zonder weg te navigeren — maar dit is alleen voor `status='ingediend'` milestones, geen volledig student-overzicht.
- Geen klik-op-student-row → expand-binnen-dashboard. Alle dieper-info gaat via "📊 Hub" link naar match-dashboard.

### C. Student-row velden ([school-dashboard.html:1487-1512](school-dashboard.html#L1487)):
SELECT (loadStudenten, [:1300-1308](school-dashboard.html#L1300)): `naam, opleiding, school, jaar, beschikbaar_vanaf, opdracht_domein, profile_id`

Weergegeven per row:
- Avatar (initialen uit naam)
- Naam
- Opleiding · Jaar · Bedrijfsnaam (bedrijf opgehaald via match → internship_postings.company_name)
- Bundle-tag (alleen bundled school)
- Fase-label ("Stage loopt"/"⚠ Let op"/"Zoekend")
- Progress-balk + percentage (alleen premium + niet-zoekend) — gemiddelde van `stage_leerdoelen.progress`
- Signal-badge (Actief/Risico/Zoekend)
- "📊 Hub" link (alleen premium + heeft matchId)
- "⏳ N bevestigingen vereist" knop (alleen bij pending milestones)

### D. Scope: **EIGEN STUDENTEN.**
[school-dashboard.html:1308](school-dashboard.html#L1308) — query gebruikt `.eq('school', _schoolNaamFilter)` of `.in('opleiding', subRow.bundled_opleidingen)` voor bundled-schools. Een school ziet alleen studenten waarvan `student_profiles.school` matcht met de eigen `schoolnaam`. Voor bundled-schools: studenten met `opleiding` in de toegestane lijst.

---

## MATCH-DASHBOARD ROLE VIEWS

### Bedrijf path
- Auth-modus ([match-dashboard.html:2840-2865](match-dashboard.html#L2840)): role auto-bepaald als `user.id === matchRow.party_b → 'bedrijf'`. Back-button gewired naar `company-dashboard.html`. `buildStudentSwitcher(user.id, MATCH_ID)` aangeroepen — laadt alle accepted matches voor party_b en vult `<select id="student-switcher">` met student-namen. Bij keuze: `switchStudent(matchId)` → `window.location.href = 'match-dashboard.html?match=' + matchId`.
- Demo-modus ([match-dashboard.html:2776-2802](match-dashboard.html#L2776)): bij `dbRole === 'bedrijf'` zonder MATCH_ID → `startHub('bedrijf')` met demo-data (geen echte student selectie).
- `startHub('bedrijf')` ([match-dashboard.html:2506-2516](match-dashboard.html#L2506)) is identiek aan `startHub('student')` qua side-effects: zet `hubState.role`, toont app-shell, switch naar overzicht-tab. Geen role-specifieke skip van tabs of secties.

### School path
- Auth-modus: school detecteert via `prof.role === 'school' → role = 'school'` ([match-dashboard.html:2846-2848](match-dashboard.html#L2846)). Back-button naar `school-dashboard.html`. `buildSchoolSwitcher` zoekt alle students met `student_profiles.school = schoolnaam` van begeleider, vult dropdown.
- school-naam wordt apart geladen ([match-dashboard.html:2893-2897](match-dashboard.html#L2893)).
- school read-only banner zichtbaar via `hubState.role === 'school'` check ([match-dashboard.html:3745-3748](match-dashboard.html#L3745)).

### Bestaande role-conditional renders
| Lijn | Conditie | Effect |
|---|---|---|
| [match-dashboard.html:2469-2494](match-dashboard.html#L2469) | `CAN[role][action]` permissions-tabel | Per-actie capability mapping (addTask/checkTask/viewScores etc.) per rol |
| [match-dashboard.html:3179](match-dashboard.html#L3179) | `role === 'bedrijf' && completionStatus !== 'completed'` | "✓ Markeer stage als afgerond" knop |
| [match-dashboard.html:3398-3402](match-dashboard.html#L3398) | `role === 'bedrijf'` / `role === 'school'` | Active-state van topbar party-pillars |
| [match-dashboard.html:3550](match-dashboard.html#L3550) | `role === 'school'` | renderMilestoneAction Plan driegesprek-knop |
| [match-dashboard.html:3575](match-dashboard.html#L3575) | `confirms_by === 'bedrijf' && role === 'bedrijf'` | renderMilestoneAction Afronden-knop |
| [match-dashboard.html:3745-3748](match-dashboard.html#L3745) | `hubState.role === 'school'` | Read-only banner in renderVoortgang |
| [match-dashboard.html:3784](match-dashboard.html#L3784) | `m.status === 'ingediend' && hubState.role === 'school'` | Bevestigen-knop op milestone-row |
| [match-dashboard.html:4610](match-dashboard.html#L4610) | `hubState.role === 'school'` | Availability-grid in read-only modus |

### Gap met gewenst gedrag
**De huidige `nav-stagehub` knoppen in beide dashboards ([company-dashboard.html:632](company-dashboard.html#L632), [school-dashboard.html:658](school-dashboard.html#L658)) sturen naar `match-dashboard.html` ZONDER match-id**. Dit triggert demo-modus die voor authenticated users de eerste-beste rol-match auto-start met DEMO-data, wat niet de echte stage van een student weergeeft.

Bedrijf en school krijgen wél een echte student-keuze via match-cards (bedrijf) en student-rows (school), maar:
- Geen vooraf-overzichtsscherm dat ALLE studenten met één tabel + status + één-klik-naar-hub toont voor het bedrijf.
- Match-dashboard heeft geen simplified bedrijf-view of school-view — alle drie de rollen krijgen dezelfde tab-structuur (Overzicht/Planning/Taken/Voortgang/Afspraken/Stageplan/Logboek), met alleen verschillen in actie-knoppen via `CAN[]` lookup.

---

## BEGELEIDER-DASHBOARD

### Hub-links gevonden

| Lijn | Code | Trigger | Doel |
|---|---|---|---|
| [begeleider-dashboard.html:541](begeleider-dashboard.html#L541) | `<div class="stat-note">via Stage Hub</div>` | Statisch tekst-label op stat-card (Mijn studenten via Stage Hub) | Geen link — alleen tekst |

### A. Student-overview voordat hub? **JA, maar zonder hub-link.**
`loadStudents(userId, maxStudents)` ([begeleider-dashboard.html:778-840](begeleider-dashboard.html#L778)) toont een eigen studentenlijst via `student_profiles.begeleider_profile_id = userId`. Per student: avatar (initialen), naam, opleiding · sector. **Geen "📊 Hub" knop, geen match-link, geen voortgangsindicator.**

### B. Verschil met school: **MINDER FUNCTIONEEL.**
- Geen sidebar-nav knop naar Stage Hub — alleen Dashboard, Mijn studenten, Profiel, Abonnement, Kennisbank.
- Studentenlijst toont GEEN matchId, GEEN hub-link, GEEN voortgang.
- Geen integratie met match-dashboard. Begeleider kan een student NIET vanaf zijn dashboard naar de Stage Hub openen.
- Begeleider-rol wordt wel herkend door match-dashboard via `roleMap = { ..., begeleider: 'begeleider' }` ([match-dashboard.html:2777](match-dashboard.html#L2777)) en in `allowedRoles` ([match-dashboard.html:2818](match-dashboard.html#L2818)), maar er is GEEN CAN-mapping voor `begeleider` in [match-dashboard.html:2469-2494](match-dashboard.html#L2469). `can()` retourneert dus altijd `false` voor een begeleider-rol → effectief read-only zonder expliciete read-only banner.

### C. Stille bug
[begeleider-dashboard.html:785](begeleider-dashboard.html#L785) — `student_profiles.begeleider_profile_id` kolom: graceful-fallback comment zegt "field may not exist yet". Geverifieerd in [internly_migration.sql:27-54](internly_migration.sql#L27): kolom **bestaat niet** in student_profiles schema. Begeleider-loadStudents zal altijd 0 studenten retourneren tenzij de kolom door later-migratie is toegevoegd.

---

## CONCLUSIE

### Huidige staat
Bedrijf en school zien hun studenten/matches in een lijst en kunnen via match-cards/student-rows naar match-dashboard navigeren met een `?match=` param. Match-dashboard auto-detecteert de rol via party_b/party_a/profiles.role en past UI aan via een `CAN[role][action]` permissions-tabel + 9 role-conditional renders. De top-level "Stage Hub" sidebar-knop in beide dashboards navigeert ECHTER zonder match-id, wat demo-modus triggert in plaats van een echte stage te openen.

### Gap
Er is geen tussen-overzichtsscherm dat een bedrijf of school al hun studenten in één klik-toegankelijk dashboard toont met progress-mijlpalen + één-klik hub-toegang per student — bedrijf moet via Matches-tab kaart-voor-kaart, school via Studenten-tab. Match-dashboard heeft daarnaast geen "lichte" rol-specifieke view: alle drie de rollen krijgen dezelfde 7 tabs en complete UI, met alleen action-knop verschillen via CAN-lookup. Begeleider-dashboard mist hub-integratie volledig en is afhankelijk van een DB-kolom die niet bestaat.

### Bestanden die zouden moeten veranderen
- [company-dashboard.html](company-dashboard.html) — top-level "Stage Hub" knop ([:632](company-dashboard.html#L632)) ofwel verwijderen ofwel naar een echte studenten-overzichtspagina sturen; eventueel een nieuw `studenten-screen` toevoegen
- [school-dashboard.html](school-dashboard.html) — top-level "Stage Hub" knop ([:658](school-dashboard.html#L658)) zelfde fix; existing studenten-lijst is al goed
- [match-dashboard.html](match-dashboard.html) — overweeg `?view=overview` modus voor bedrijf/school die alleen voortgang+mijlpalen toont (geen taak/deadline/reflectie tabs); `CAN['begeleider']` mapping toevoegen
- [begeleider-dashboard.html](begeleider-dashboard.html) — hub-link toevoegen aan studentenlijst; `begeleider_profile_id` kolom toevoegen aan `student_profiles` migration óf alternatieve koppeling implementeren
- [internly_migration.sql](internly_migration.sql) — `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS begeleider_profile_id uuid REFERENCES profiles(id)` (als begeleider-flow blijft)

### Aanbevolen aanpak
1. **Quick-win**: top-level "Stage Hub" sidebar knoppen in company- en school-dashboard ofwel verwijderen, ofwel switchen naar een eigen "Mijn studenten" screen binnen het dashboard (school heeft dat al; bedrijf zou een vergelijkbare loadStudenten-variant op `matches.party_b = currentUser` kunnen krijgen). De huidige knoppen geven gebruikers verkeerde verwachtingen door demo-data te tonen.
2. **Medium**: voeg een `?view=overview` URL-param aan match-dashboard toe die voor non-student rollen alleen Voortgang-tab + read-only milestone-tracker toont, zonder de zware Planning/Taken/Logboek tabs. Schaalt cognitief beter voor scholen met >10 studenten.
3. **Foundation**: `begeleider_profile_id` kolom + matchende RLS-policy migratie. Zonder dat blijft begeleider-flow stuk.
4. **Clean-up**: `CAN['begeleider']` mapping toevoegen aan [match-dashboard.html:2469-2494](match-dashboard.html#L2469) zodat een begeleider die naar match-dashboard navigeert een expliciete read-only ervaring krijgt in plaats van impliciete `false`-fallback.
5. **UX-verbetering**: in beide dashboards het `📊 Hub`-icoon vervangen door een button met meer context (bv. progress-percentage of "X van 8 mijlpalen") zodat gebruikers vooraf weten waar ze terechtkomen.
