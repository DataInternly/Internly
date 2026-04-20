# Internly — Role Matrix
Gegenereerd door Fase 1 observatie-sessie. Geen code gewijzigd.

---

## 1. Bestandsinventaris

### auth.html
- **Doel:** Login + registratie voor alle rollen.
- **Verwachte rollen:** Alle.
- **Tabellen gelezen:** `profiles` (SELECT role), `student_profiles` (SELECT bbl_mode, naam), `subscriptions` (upsert).
- **Tabellen geschreven:** `profiles` (INSERT), `student_profiles` (upsert: profile_id, bbl_mode), `subscriptions` (upsert), `waitlist` (INSERT gepensioneerd).
- **Rol-detectie kolommen:** `profiles.role`, `student_profiles.bbl_mode`.

### student-profile.html
- **Doel:** Profielpagina + formulier voor niet-BBL studenten.
- **Verwachte rollen:** `role=student` + `bbl_mode=false`.
- **Tabellen gelezen:** `profiles` (SELECT role), `student_profiles` (SELECT alle profielkolommen incl. bbl_mode, onderwijsniveau).
- **Tabellen geschreven:** `student_profiles` (upsert payload incl. bbl_mode, onderwijsniveau), `matches` (INSERT via triggerStudentMatching), `notifications` (INSERT via createNotification).
- **Rol-detectie kolommen:** `profiles.role` (guard voor niet-student), `student_profiles.bbl_mode` (BBL-guard lijn 1327 → redirect naar `bbl-profile.html`).
- **Let op:** Bevat een BBL-omschakeling in het formulier (radio BOL/BBL). Bij BBL-selectie wordt `bbl_mode=true` opgeslagen en roept `routeStudentByMode` aan.

### discover.html
- **Doel:** Vacature-zoekpagina voor BOL-studenten.
- **Verwachte rollen:** `role=student` + `bbl_mode=false`.
- **Tabellen gelezen:** `student_profiles` (SELECT profile_id, opleiding, sector, opdracht_domein, bbl_mode), `internship_postings` (SELECT vacatures), `matches` (SELECT matches voor highlight).
- **Tabellen geschreven:** `waitlist` (INSERT e-mail capture bij niet-ingelogd).
- **Rol-detectie kolommen:** `requireRole('student')` (lijn 1194), `student_profiles.bbl_mode` (lijn 1230 → redirect naar `bbl-profile.html` als true).

### matches.html
- **Doel:** Matches-overzicht voor studenten.
- **Verwachte rollen:** `role=student` + `bbl_mode=false`.
- **Tabellen gelezen:** `matches` (SELECT met match_type, party_a, party_b), `student_profiles` (SELECT bbl_mode).
- **Tabellen geschreven:** — (geen directe writes).
- **Rol-detectie kolommen:** `requireRole('student')` (lijn 838), `student_profiles.bbl_mode` (lijn 847 → redirect naar `bbl-hub.html` als true).

### mijn-sollicitaties.html
- **Doel:** Sollicitatie-overzicht voor studenten.
- **Verwachte rollen:** `role=student` + `bbl_mode=false`.
- **Tabellen gelezen:** `applications` (SELECT), `student_profiles` (SELECT bbl_mode).
- **Tabellen geschreven:** `applications` (intrekken sollicitatie).
- **Rol-detectie kolommen:** `requireRole('student')` (lijn 703), `student_profiles.bbl_mode` (lijn 712 → redirect naar `bbl-hub.html` als true).

### match-dashboard.html
- **Doel:** Stage Hub — tri-party samenwerking (student + bedrijf + school + begeleider).
- **Verwachte rollen:** student, bedrijf, school, begeleider.
- **Tabellen gelezen:** `matches` (SELECT id, party_a, party_b, roc_profile_id, completion_status), `internship_postings` (SELECT title), `profiles` (SELECT role).
- **Tabellen geschreven:** `meetings` (INSERT/UPDATE), `notifications` (INSERT).
- **Rol-detectie kolommen:** `profiles.role` (lijn 2671), `matches.party_a/party_b` voor rol-bepaling binnen match.
- **Let op:** Redirects `gepensioneerd`/`buddy` → `buddy-dashboard.html`. Rol `student` doet geen BBL-check hier.

### vacature-detail.html
- **Doel:** Detail-pagina van een vacature.
- **Verwachte rollen:** Openbaar + ingelogde student.
- **Tabellen gelezen:** `internship_postings` (SELECT), `profiles` (SELECT naam).
- **Tabellen geschreven:** `applications` (INSERT sollicitatie).
- **Rol-detectie kolommen:** `db.auth.getUser()` (lijn 595 — check aanwezig, geen rol-differentiatie).

### company-dashboard.html
- **Doel:** Dashboard voor bedrijven.
- **Verwachte rollen:** `role=bedrijf`.
- **Tabellen gelezen:** `applications`, `internship_postings`, `student_profiles`, `reviews`, `subscriptions`.
- **Tabellen geschreven:** `internship_postings` (INSERT/UPDATE), `applications` (UPDATE status), `reviews` (INSERT).
- **Rol-detectie kolommen:** `profiles.role` (lijn 2445 → guard `role !== 'bedrijf'`).

### company-discover.html
- **Doel:** Kandidaten-zoekpagina voor bedrijven.
- **Verwachte rollen:** `role=bedrijf`.
- **Tabellen gelezen:** `student_profiles` (SELECT kandidaten), `profiles` (SELECT role).
- **Tabellen geschreven:** — (contact() is stub).
- **Rol-detectie kolommen:** `profiles.role` (lijn 514 → guard).

### school-dashboard.html
- **Doel:** Dashboard voor scholen.
- **Verwachte rollen:** `role=school`.
- **Tabellen gelezen:** `student_profiles`, `applications`, `matches`, `reviews`.
- **Tabellen geschreven:** `matches` (INSERT school_referral), `notifications` (INSERT).
- **Rol-detectie kolommen:** `profiles.role` (lijn 2076 → guard `role !== 'school'`).

### chat.html
- **Doel:** Berichten-pagina.
- **Verwachte rollen:** student, bedrijf, school.
- **Tabellen gelezen:** `matches`, `messages`.
- **Tabellen geschreven:** `messages` (INSERT).
- **Rol-detectie kolommen:** `requireRole('student', 'bedrijf', 'school')` (lijn 1146).

### bbl-hub.html *(read-only — niet wijzigen)*
- **Doel:** BBL-hub voor traject, chat, kalender, evaluatie.
- **Verwachte rollen:** `role=student` + `bbl_mode=true`.
- **Tabellen gelezen:** `student_profiles` (SELECT incl. bbl_mode), `internship_postings`, `matches`, `meetings`.
- **Tabellen geschreven:** `meetings` (UPDATE status evaluatie), `notifications` (INSERT).
- **Rol-detectie kolommen:** `student_profiles.bbl_mode` (lijn 2506 → redirect naar discover.html als niet true).

### bbl-dashboard.html *(read-only — niet wijzigen)*
- **Doel:** BBL-overzicht (bereikbaar via navigatie vanuit bbl-hub).
- **Verwachte rollen:** `role=student` + `bbl_mode=true`.
- **Tabellen gelezen:** `student_profiles` (SELECT incl. bbl_mode, schooldag, skills).
- **Tabellen geschreven:** —
- **Rol-detectie kolommen:** `student_profiles.bbl_mode` (lijn 556 → redirect als niet true).
- **Let op:** Commentaar zegt "laadt na login als bbl_mode=true" maar dit klopt NIET. Post-login routing gaat naar `bbl-hub.html`. `bbl-dashboard.html` is alleen bereikbaar via navigatie.

### buddy-dashboard.html *(read-only — niet wijzigen)*
- **Doel:** Dashboard voor gepensioneerde buddies.
- **Verwachte rollen:** `role=gepensioneerd`.
- **Tabellen gelezen:** `profiles` (SELECT role, naam), `buddy_pairs`, `messages`.
- **Tabellen geschreven:** `profiles` (UPDATE beschikbaarheid/privacy).
- **Rol-detectie kolommen:** `profiles.role` (lijn 771 → guard `role !== 'gepensioneerd'`).

### begeleider-dashboard.html
- **Doel:** Dashboard voor stagebegeleiders.
- **Verwachte rollen:** `role=begeleider`.
- **Tabellen gelezen:** `profiles` (SELECT role, naam, email, sector), `subscriptions`.
- **Tabellen geschreven:** —
- **Rol-detectie kolommen:** `profiles.role` (lijn 869 → guard `role !== 'begeleider'`), `subscriptions` (plan-guard lijn 875).

### admin.html
- **Doel:** Admin-dashboard.
- **Verwachte rollen:** admin (client-side guard, geen RLS).
- **Tabellen gelezen:** `profiles` (COUNT per rol), `applications`, `internship_postings`.
- **Tabellen geschreven:** — (read-heavy).
- **Rol-detectie kolommen:** `profiles.role` (lijn 784 — client-side only).

### js/utils.js
- **Doel:** Centrale helpers en routing.
- **Rol-detectie:** `ROLE_LANDING`, `getRoleLanding()`, `routeStudent()`, `routeStudentByMode()`, `requireRole()`.
- **Routing:** `routeStudentByMode`: `bbl_mode=true` → `bbl-hub.html`, else → `match-dashboard.html`.

### js/supabase.js
- **Doel:** Supabase client, `hasActivePlan()`, `initSessionTimeout()`.
- **Geen rol-routing.**

### js/buddy.js *(read-only — niet wijzigen)*
- **Doel:** Buddy request/accept/decline flow.
- **Rol-referentie:** Beperkt (`availableFor: ['student']` in interne config, BBL via `profile.bbl_mode` check — regel 65).

### js/info.js
- **Doel:** Aanwezig maar niet gebruikt in rol-routing (niet geladen op app-pagina's per CLAUDE.md).

### js/translate.js
- **Doel:** Meertalige UI. Niet gerelateerd aan rol-routing.

---

## 2. Post-login routing

**Bestanden:** `auth.html` (regels 468–634) + `js/utils.js` (regels 21–23, 301–313)

### Routing-logica zoals die in de code staat:

```
// auth.html — ROUTES object (regels 468-474)
student       → 'match-dashboard.html'   [fallback, zelden gebruikt]
bedrijf       → 'company-dashboard.html'
school        → 'school-dashboard.html'
begeleider    → 'begeleider-dashboard.html'
gepensioneerd → 'buddy-dashboard.html'

// auth.html — doLogin() stap voor student (regels 607-634)
IF role === 'student':
  IF _sp EXISTS EN _sp.bbl_mode is boolean:
    routeStudentByMode(_sp)          ← centrale beslisser
  ELSE (geen student_profiles rij):
    window.location.href = 'student-profile.html'
ELSE:
  window.location.href = ROUTES[role] || 'match-dashboard.html'

// js/utils.js — routeStudentByMode() (regels 301-313)
IF studentProfile.bbl_mode === true:
  window.location.href = 'bbl-hub.html'
ELSE:
  window.location.href = 'match-dashboard.html'
```

### Samenvatting post-login:

| Conditie | Bestemming |
|---|---|
| role=student + bbl_mode=true (bestaand profiel) | bbl-hub.html |
| role=student + bbl_mode=false (bestaand profiel) | match-dashboard.html |
| role=student + geen student_profiles rij | student-profile.html |
| role=bedrijf | company-dashboard.html |
| role=school | school-dashboard.html |
| role=begeleider | begeleider-dashboard.html |
| role=gepensioneerd | buddy-dashboard.html |

### Extra routing in "al ingelogd" panel (auth.html regels 830-844):
- `bbl_mode=true` + naam ingevuld → `bbl-hub.html`
- `bbl_mode=true` + naam leeg → `bbl-profile.html`

---

## 3. Rol-matrix tabel

| Rol | Profiel-pagina | Hub/Dashboard | Board/Discovery | DB-differentiator |
|---|---|---|---|---|
| Student regulier (HBO/WO) | student-profile.html | match-dashboard.html | discover.html | role=student + bbl_mode=false + onderwijsniveau∈(HBO,WO,onbekend) |
| BBL-student | bbl-profile.html | bbl-hub.html | — (geen eigen discovery) | role=student + bbl_mode=true |
| BOL-student (MBO-BOL) | **ONTBREEKT** (student-profile.html deelt) | match-dashboard.html | discover.html | role=student + bbl_mode=false — **IDENTIEK aan regulier in DB** |
| Bedrijf | — | company-dashboard.html | company-discover.html | role=bedrijf |
| School | — | school-dashboard.html | — | role=school |
| Begeleider | — | begeleider-dashboard.html | match-dashboard.html (als deelnemer) | role=begeleider |
| Buddy (gepensioneerd) | — | buddy-dashboard.html | — | role=gepensioneerd |

**Gedeelde pagina's:**
- `match-dashboard.html` is gedeeld door student, bedrijf, school, begeleider — intentioneel (tri-party hub).
- `student-profile.html` bedient nu zowel "Student regulier" als "BOL-student" — **niet intentioneel**, dit is het gat dat fase 2 dicht.

---

## 4. Bevindingen

### Bevinding 1: BOL-student heeft geen eigen profielpagina — ONTBREEKT
`student-profile.html` dient alle niet-BBL studenten zonder onderscheid. Een MBO-BOL student ziet precies hetzelfde formulier als een HBO-student. De `onderwijsniveau` dropdown heeft de waarden `MBO`, `HBO`, `WO`, `BBL`, `onbekend` maar het onderscheid MBO-BOL vs MBO-BBL bestaat niet. Routing op basis van `onderwijsniveau` bestaat niet — alleen `bbl_mode` beslist.

**Impact:** Een BOL-student die `onderwijsniveau=MBO` kiest is na opslaan in DB identiek aan een HBO-student qua routing. `bol-profile.html` ontbreekt volledig.

### Bevinding 2: BBL-guard is inconsistent over vier bestanden
Vier pagina's redirecten BBL-studenten bij detectie van `bbl_mode=true`, maar niet naar dezelfde bestemming:

| Bestand | Lijn | BBL-redirect naar |
|---|---|---|
| `discover.html` | 1230 | `bbl-profile.html` |
| `student-profile.html` | 1327 | `bbl-profile.html` |
| `mijn-sollicitaties.html` | 712 | `bbl-hub.html` |
| `matches.html` | 847 | `bbl-hub.html` |
| `utils.js` `routeStudentByMode` | 309 | `bbl-hub.html` ← canoniek |

`discover.html` en `student-profile.html` sturen naar `bbl-profile.html` (profielinvulpagina); `mijn-sollicitaties.html` en `matches.html` sturen naar `bbl-hub.html` (werkende hub). De canonieke functie `routeStudentByMode` stuurt naar `bbl-hub.html`. Dit is een bestaande inconsistentie — geen nieuw probleem van fase 2, maar relevant voor fase 2 als we nieuwe BOL-guards toevoegen.

### Bevinding 3: Rol-routing staat op negen plekken — divergentierisico
Elke plek waar routing-beslissingen worden genomen:

1. `js/utils.js` lijn 11-23: `ROLE_LANDING` + `getRoleLanding()`
2. `js/utils.js` lijn 271-313: `routeStudent()` + `routeStudentByMode()`
3. `auth.html` lijn 468-474: `ROUTES` object
4. `auth.html` lijn 607-634: `doLogin()` student-routing
5. `auth.html` lijn 830-844: "al ingelogd" panel routing
6. `student-profile.html` lijn 1327: BBL-guard
7. `discover.html` lijn 1230: BBL-guard
8. `mijn-sollicitaties.html` lijn 712: BBL-guard
9. `matches.html` lijn 847: BBL-guard

Negen plekken. `js/roles.js` (fase 2) centraliseert detectie en routing-tabel, maar de negen guards op individuele pagina's blijven bestaan (ze zijn verdedigingslagen, geen duplicaten van de centrale routing).

### Bevinding 4: `bbl_mode` en `onderwijsniveau` zijn niet gesynchroniseerd
- `bbl_mode=true` registreert als BBL bij aanmaak in `auth.html`.
- `onderwijsniveau` heeft waarde `BBL` als aparte optie in de dropdown, maar routing gebruikt `bbl_mode`, niet `onderwijsniveau`.
- Als een student `onderwijsniveau=BBL` kiest maar `bbl_mode=false` blijft, is er een inconsistentie in de data maar geen routing-effect.
- Fase 2 maakt de waarden `MBO_BOL` en `MBO_BBL` (nieuwe constraint) om dit te verduidelijken.

### Bevinding 5: `stage-hub.html` bestaat niet
Bestandssysteem bevestigt: geen `stage-hub.html`. Dood bestand in HANDOVER.md. Niet uploaden. Vervangen door `match-dashboard.html`.

### Bevinding 6: `bbl-dashboard.html` is geen post-login landing
Het commentaar boven het bestand ("Laadt na login als bbl_mode = true") klopt niet. Post-login routing (`routeStudentByMode`) gaat naar `bbl-hub.html`. `bbl-dashboard.html` is bereikbaar via de BBL navigatiebalk vanuit `bbl-hub.html`, niet als landing.

### Bevinding 7: Geen profiel-pagina voor bedrijf, school, buddy, begeleider
Deze rollen hebben geen eigen profiel-aanmaakpagina. Hun profieldata wordt bij registratie aangemaakt (naam, email in `profiles`). Aanvullende velden (voor buddy: sector/expertise via `waitlist`) worden ook bij registratie ingevuld. Dit lijkt intentioneel — geen gat.

---

## 5. BBL-checks lokalisatie (voor fase 2)

Elke plek in de code waar een BBL-check bestaat en dus ook een BOL-check zou kunnen komen:

| Bestand | Lijn | Huidige check | Actie in fase 2 |
|---|---|---|---|
| `auth.html` | 611-626 | `sp.bbl_mode === true` → routeStudentByMode | Vervangen door `Internly.detectRole()` + `Internly.routeForRole()` |
| `auth.html` | 836-839 | `sp.bbl_mode === true` → bbl-hub of bbl-profile | Uitbreiden met BOL-pad |
| `student-profile.html` | 1327 | `existing?.bbl_mode === true` → bbl-profile.html | Blijft (defensieve guard voor BBL op BOL-pagina) |
| `discover.html` | 1225-1230 | `sp.bbl_mode === true` → bbl-profile.html | Geen wijziging in fase 2 |
| `mijn-sollicitaties.html` | 711-712 | `sp.bbl_mode === true` → bbl-hub.html | Geen wijziging in fase 2 |
| `matches.html` | 846-847 | `sp.bbl_mode === true` → bbl-hub.html | Geen wijziging in fase 2 |
| `js/utils.js` | 301-313 | `routeStudentByMode` → bbl-hub of match-dashboard | Blijft ongewijzigd (BBL-pad ongewijzigd) |

---

*Fase 1 afgerond. Geen bestanden gewijzigd.*
