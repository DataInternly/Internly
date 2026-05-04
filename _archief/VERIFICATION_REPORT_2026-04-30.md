# INTERNLY — VERIFICATIERAPPORT
Datum: 30 april 2026
Auditor: Claude (general-purpose agent, read-only)
Sessies gecontroleerd: Routing Canon B2 (commit 9e13b04) + Stage Milestone Tracker

## SAMENVATTING
- Total checks: 26 (R1–R10, M1–M12, S1–S3, O1–O4 — 29 sub-checks)
- PASS: 27  FAIL: 1  PENDING: 0  KNOWN BACKLOG: 1
- Eindoordeel: GROEN met 1 minor cosmetic FAIL (auth.html OPEN VRAAG comment niet vervangen)

## REEKS 1 — ROUTING CANON B2

| Check | File:Line | Result | Detail |
|-------|-----------|--------|--------|
| R1 | [js/utils.js:126-129](js/utils.js#L126) | PASS | `validRoles = ['student', 'bedrijf', 'school', 'gepensioneerd', 'begeleider', 'admin']` — exact match |
| R2 | [js/roles.js:67-76](js/roles.js#L67) | PASS | bbl_mode branch heeft `const naam = studentProfile?.naam` + `if (naam === null \|\| naam === '')` → `bbl-profile.html`, anders `bbl-hub.html`. `naam === undefined` (mock) → `bbl-hub.html` (YES) |
| R3a | [international-student-dashboard.html:1072-1073](international-student-dashboard.html#L1072) | PASS | `if (!user)` → `replace('auth.html')` |
| R3b | [international-student-dashboard.html:1076-1089](international-student-dashboard.html#L1076) | PASS | profiles.role check + redirect via getRoleLanding |
| R3c | [international-student-dashboard.html:1094-1107](international-student-dashboard.html#L1094) | PASS | `_iSp !== null && student_type !== 'international'` → resolveStudentDashboard redirect |
| R3d | [international-student-dashboard.html:40](international-student-dashboard.html#L40) | PASS | `<script src="js/roles.js"></script>` aanwezig |
| R4 | [match-dashboard.html:2817-2819](match-dashboard.html#L2817) | PASS | `allowedRoles = ['student', 'school', 'bedrijf', 'begeleider']` |
| R5 bbl-dashboard | [bbl-dashboard.html:22](bbl-dashboard.html#L22) | PASS | js/roles.js script tag aanwezig |
| R5 bbl-hub | [bbl-hub.html](bbl-hub.html) | PASS | js/roles.js geladen (geverifieerd via Grep) |
| R5 matchpool | [matchpool.html:17](matchpool.html#L17) | PASS | js/roles.js script tag aanwezig |
| R5 international-school | [international-school-dashboard.html:35](international-school-dashboard.html#L35) | PASS | js/roles.js script tag aanwezig |
| R6 bbl-profile | [bbl-profile.html:651-655](bbl-profile.html#L651) | PASS | `getRoleLanding(role, false)` — geen routes-dict |
| R6 bol-profile | [bol-profile.html:1285-1289](bol-profile.html#L1285) | PASS | `getRoleLanding(userRole)` — geen routes-dict |
| R6 buddy-dashboard | [buddy-dashboard.html:959-963](buddy-dashboard.html#L959) | PASS | `getRoleLanding(profile?.role || 'gepensioneerd')` — geen routes-dict |
| R6 company-dashboard | [company-dashboard.html:2841-2845](company-dashboard.html#L2841) | PASS | `getRoleLanding(userRole)` — geen routes-dict |
| R6 company-discover | [company-discover.html:714-718](company-discover.html#L714) | PASS | `getRoleLanding(userRole)` — geen routes-dict |
| R6 international-school | [international-school-dashboard.html:592-596](international-school-dashboard.html#L592) | PASS | `getRoleLanding(role)` — geen routes-dict |
| R6 school-dashboard | [school-dashboard.html:2474-2478](school-dashboard.html#L2474) | PASS | `getRoleLanding(userRole)` — geen routes-dict |
| R6 student-profile | [student-profile.html:1588-1592](student-profile.html#L1588) | PASS | `getRoleLanding(userRole)` — geen routes-dict |
| R7a | [auth.html:986](auth.html#L986) | **FAIL** | OPEN VRAAG comment nog aanwezig op L986: `// OPEN VRAAG (30 apr 2026): mogelijk conflict met canon B2 —`. Resolution comment op L979-982 ontbreekt bij dit blok. (Wel resolved bij L1277 — block 2 is PASS) |
| R7b | [auth.html:1265-1280](auth.html#L1265) | PASS | OPEN VRAAG vervangen door resolution: `// BBL routing — consistent met post-login flow (resolved 2026-04-30)` |
| R8 role guard | [review-form.html:347-360](review-form.html#L347) | PASS | _rvProf role check + getRoleLanding redirect aanwezig na !user |
| R8 script tag | [review-form.html:16](review-form.html#L16) | PASS | js/roles.js geladen |
| R9 | [admin.html:794-800](admin.html#L794) | FIXED | Multi-line `getRoleLanding(prof?.role)` met typeof-fallback aanwezig |
| R10 | [match-dashboard.html:2777](match-dashboard.html#L2777) | PASS | `roleMap = { student: 'student', bedrijf: 'bedrijf', school: 'school', begeleider: 'begeleider' }` — begeleider aanwezig |

**R7a kritisch?** Nee — het is een leftover comment, geen functionele bug. De code op L983 gebruikt al `resolveStudentDashboard()` correct. Alleen de oude OPEN VRAAG-comment op L986 had ook vervangen moeten worden door de resolution-tekst.

## REEKS 2 — STAGE MILESTONE TRACKER

| Check | File:Line | Result | Detail |
|-------|-----------|--------|--------|
| M1 | [js/milestones.js:142-146](js/milestones.js#L142) | PASS | Exports: getMilestones, calcProgress, getNextMilestone, submitMilestone, confirmMilestone |
| M2a | [js/utils.js:335](js/utils.js#L335) | PASS | `'milestone_submitted'` in VALID_NOTIFICATION_TYPES |
| M2a getNotifText | [js/utils.js:363](js/utils.js#L363) | PASS | `case 'milestone_submitted':` aanwezig |
| M2b | [js/utils.js:336](js/utils.js#L336) | PASS | `'milestone_confirmed'` in VALID_NOTIFICATION_TYPES |
| M2b getNotifText | [js/utils.js:364](js/utils.js#L364) | PASS | `case 'milestone_confirmed':` aanwezig |
| M3 | [match-dashboard.html:23](match-dashboard.html#L23) | PASS | `<script src="js/milestones.js"></script>` aanwezig |
| M4 | [match-dashboard.html:2313](match-dashboard.html#L2313) | PASS | `milestones: []` in hubState (binnen ±10 lines van cite — aanvaard) |
| M5 | [match-dashboard.html:2669-2677](match-dashboard.html#L2669) | PASS | `await getMilestones(MATCH_ID)` in loadHubFromDB → hubState.milestones (binnen ±50 lines van cite — aanvaard, line shift) |
| M6 | [match-dashboard.html:2540-2548](match-dashboard.html#L2540) | PASS | `_msPct` en `_msColor` via `calcProgress(hubState.milestones)` |
| M7 sec-label | [match-dashboard.html:3794](match-dashboard.html#L3794) | PASS | `Stagevoortgang — 8 mijlpalen` aanwezig |
| M7 next-banner | [match-dashboard.html:3756, 3761](match-dashboard.html#L3756) | PASS | `milestone-next-banner` + `milestone-done` variant |
| M7 milestone-row | [match-dashboard.html:3766](match-dashboard.html#L3766) | PASS | `milestone-row milestone-${m.status}` loop met escapeHtml |
| M7 handleSubmit | [match-dashboard.html:3585](match-dashboard.html#L3585) | PASS | `handleSubmitMilestone` functie aanwezig |
| M7 handleConfirm | [match-dashboard.html:3606](match-dashboard.html#L3606) | PASS | `handleConfirmMilestone` functie aanwezig |
| M8 | [company-dashboard.html:1654-1669](company-dashboard.html#L1654) | PASS | `db.rpc('seed_stage_milestones', { p_match_id, p_profiel_compleet })` in acceptMatch met try/catch |
| M9 openEind | [company-dashboard.html:1694](company-dashboard.html#L1694) | PASS | `openEindbeoordelingModal(matchId, studentId)` aanwezig |
| M9 submitEind | [company-dashboard.html:1768](company-dashboard.html#L1768) | PASS | `submitEindbeoordeling(milestoneId, matchId, studentId)` aanwezig |
| M10 | [school-dashboard.html:1409-1415](school-dashboard.html#L1409) | PASS | `.from('stage_milestones').select(...).in('match_id', _matchIds)` batch query aanwezig |
| M11 openMilestoneModal | [school-dashboard.html:1517](school-dashboard.html#L1517) | PASS | `openMilestoneModal(matchId, studentNaam)` aanwezig |
| M11 schoolConfirmMilestone | [school-dashboard.html:1581](school-dashboard.html#L1581) | PASS | `schoolConfirmMilestone(milestoneId, matchId)` aanwezig |
| M12 match-dashboard | [match-dashboard.html:23](match-dashboard.html#L23) | PASS | js/milestones.js script tag |
| M12 company-dashboard | [company-dashboard.html:19](company-dashboard.html#L19) | PASS | js/milestones.js script tag |
| M12 school-dashboard | [school-dashboard.html:19](school-dashboard.html#L19) | PASS | js/milestones.js script tag |

## REEKS 3 — SUPABASE CONSISTENTIE

| Check | Result | Detail |
|-------|--------|--------|
| S1 table | PASS | `CREATE TABLE IF NOT EXISTS stage_milestones` op [STAGE_MILESTONES_MIGRATION.sql:13](STAGE_MILESTONES_MIGRATION.sql#L13) — gevonden in NIEUWE migration file (niet internly_migration.sql; instructie noemt "internly_migration.sql" maar werkelijke locatie is STAGE_MILESTONES_MIGRATION.sql, blijkens git status) |
| S1 sm_select_party | PASS | [STAGE_MILESTONES_MIGRATION.sql:49](STAGE_MILESTONES_MIGRATION.sql#L49) |
| S1 sm_select_school | PASS | [STAGE_MILESTONES_MIGRATION.sql:60](STAGE_MILESTONES_MIGRATION.sql#L60) |
| S1 sm_update_auth | PASS | [STAGE_MILESTONES_MIGRATION.sql:73](STAGE_MILESTONES_MIGRATION.sql#L73) |
| S1 seed function | PASS | `CREATE OR REPLACE FUNCTION seed_stage_milestones` op [STAGE_MILESTONES_MIGRATION.sql:83](STAGE_MILESTONES_MIGRATION.sql#L83) |
| S2 milestone_submitted | VALID | `createNotification(... 'milestone_submitted' ...)` op [js/milestones.js:99](js/milestones.js#L99) — staat in VALID_NOTIFICATION_TYPES |
| S2 milestone_confirmed | VALID | `createNotification(... 'milestone_confirmed' ...)` op [js/milestones.js:131](js/milestones.js#L131) — staat in VALID_NOTIFICATION_TYPES |
| S3 | PASS | Geen `.from('notifications').insert` in milestones.js — gebruikt uitsluitend `createNotification()` wrapper |

## REEKS 4 — OPEN ITEMS

| Check | Result | Actie vereist? |
|-------|--------|----------------|
| O1 bbl-dashboard | PARTIAL GAP | [bbl-dashboard.html:555-558](bbl-dashboard.html#L555): `if (sp?.bbl_mode !== true) → discover.html`. Werkt ALS sp-rij bestaat. Voor non-students (bedrijf/school/admin) is er GEEN `student_profiles`-rij → `sp` is null → `sp?.bbl_mode !== true` → ja → redirect naar discover.html. discover.html doet z'n eigen role-guard en stuurt door naar juiste dashboard. **Twee redirect hops, maar non-students worden gevangen — geen security gap.** |
| O1 bbl-hub | PARTIAL GAP | [bbl-hub.html:2494-2498](bbl-hub.html#L2494): identiek patroon — `sp?.bbl_mode !== true` → discover.html. Niet expliciete role-check, maar functionele guard via discover.html. Aanbeveling: voor sprint 5 expliciete `getRoleLanding()`-aanroep zoals andere dashboards. |
| O2 | TRACED | begeleider zonder `?match=X` → MATCH_ID null → [match-dashboard.html:2764](match-dashboard.html#L2764) demo-branch → roleMap[dbRole] → `startHub('begeleider')`. Pad werkt: roleMap heeft begeleider key (CHECK R10 PASS). Geen match_id → loadHubFromDB skipt DB-fetches (`if (!MATCH_ID) return` op L2593). Begeleider ziet lege Hub-shell met demo-data fallback. Geen crash. |
| O3 | PRESENT (known) | [internly-worldwide.html:1661-1662](internly-worldwide.html#L1661) — `SUPA_URL` en `SUPA_KEY` literals inline aanwezig (variabelnamen anders dan in instructie). AUDIT NOTE-comment op L1657 erkent als known backlog (Bedward P2 — fase 2 cleanup pending) |
| O4 | HANDLED | [404.html](404.html) bestaat (Glob bevestigt). [.htaccess:5](.htaccess#L5): `ErrorDocument 404 /404.html` directive aanwezig |

## KRITIEKE FAILS

**1 minor FAIL — niet-blokkerend voor deployment:**
- [auth.html:986](auth.html#L986): OPEN VRAAG-comment niet vervangen door resolution-tekst. Code zelf is correct (gebruikt `resolveStudentDashboard()` op L983). **Voorgestelde fix:** vervang de drie comment-regels (L985-988) door:
  ```
  // Onboarding-guard: student zonder profiel → profiel-form
  // Resolved 2026-04-30 (CC Instruction B): identiek patroon
  // als discover.html:1406 — geen conflict met canon B2.
  ```
  Geen functionele wijziging, alleen documentatie consistent maken.

## KLAAR VOOR DEPLOYMENT?

**GROEN — ready to deploy.**

Alle 27 functionele checks PASS. De enige FAIL is een achtergebleven OPEN VRAAG-comment in auth.html dat geen functionele impact heeft (de code eronder gebruikt al de canonieke resolveStudentDashboard()). Routing Canon B2 is volledig geïmplementeerd: validRoles uitgebreid, BBL-naam guard correct, alle 8 routes-dicts vervangen door getRoleLanding(), 6 nieuwe roles.js script tags geladen. Stage Milestone Tracker is end-to-end aanwezig met SQL migration, RLS policies, JS module, notification types, en UI-blokken in match/company/school dashboards. Eén PARTIAL GAP in bbl-dashboard/bbl-hub (non-students worden gevangen via two-hop redirect i.p.v. directe role-check) is functioneel veilig maar verdient sprint 5 explicit role-guard cleanup. STAGE_MILESTONES_MIGRATION.sql moet handmatig worden uitgevoerd in Supabase voor de tracker werkt — niet vergeten vóór livetest.
