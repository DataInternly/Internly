# HUB ACCESS FIX LOG — 30 april 2026

## FIXES TOEGEPAST

| Fix | File | Lines | Status | Notes |
|---|---|---|---|---|
| 1A | [company-dashboard.html](company-dashboard.html) | ~919-927 | DONE | `screen-studenten` div toegevoegd direct na `screen-matches` |
| 1B | [company-dashboard.html](company-dashboard.html) | ~632-634 | DONE | `nav-studenten` button toegevoegd vóór `nav-stagehub` |
| 1C | [company-dashboard.html:635-637](company-dashboard.html#L635) | 635 | DONE | `nav-stagehub` onclick: `window.location.href='match-dashboard.html'` → `show('studenten')` |
| 1D | [company-dashboard.html:1320](company-dashboard.html#L1320) en ~1650-1750 | 1320 + nieuw blok | DONE | `show()` uitgebreid met `if (id === 'studenten') loadCompanyStudenten()`; nieuwe async functie `loadCompanyStudenten()` toegevoegd vóór `acceptMatch()` |
| 2 | [school-dashboard.html:660](school-dashboard.html#L660) | 660 | DONE | `nav-stagehub` onclick + label aangepast |
| 3 | [begeleider-dashboard.html:782](begeleider-dashboard.html#L782) | 782-895 (loadStudents body) | DONE | Query gerouteerd via `matches.praktijkbegeleider_profile_id` + Stage Hub-link per row |
| 4 | [match-dashboard.html:2495](match-dashboard.html#L2495) | 2495-2503 | DONE | `CAN['begeleider']` mapping toegevoegd, gespiegeld op `school` (read-only) |
| 5a | [match-dashboard.html:2839](match-dashboard.html#L2839) | 2839 | DONE | matches SELECT uitgebreid met `praktijkbegeleider_profile_id` |
| 5b | [match-dashboard.html:2858](match-dashboard.html#L2858) | 2858 | DONE | Auth role detection: begeleider opgepikt mits `praktijkbegeleider_profile_id === user.id` |
| 5c | [match-dashboard.html:2872-2876](match-dashboard.html#L2872) | 2876 | DONE | Back-button voor begeleider → `begeleider-dashboard.html` |
| 5d | [match-dashboard.html:3756](match-dashboard.html#L3756) | 3756-3759 | DONE | Read-only banner extended naar `begeleider`; tekst dynamisch ("praktijkbegeleider" vs "schoolbegeleider") |
| 5e | [match-dashboard.html:4621](match-dashboard.html#L4621) | 4621-4626 | DONE | `renderStageplan` readonly + banner extended naar begeleider |

---

## BEGELEIDER QUERY

**Before** ([begeleider-dashboard.html:786-789](begeleider-dashboard.html#L786) — vorige versie):
```js
const { data: students, error } = await db
  .from('student_profiles')
  .select('profile_id, naam, opleiding, sector')
  .eq('begeleider_profile_id', userId);
```
Filter op `student_profiles.begeleider_profile_id` — kolom **bestaat niet** in [internly_migration.sql:27-54](internly_migration.sql#L27). Returnde altijd 0 studenten.

**After** ([begeleider-dashboard.html:783-815](begeleider-dashboard.html#L783) — huidige versie):
```js
const { data: matchRows, error: matchErr } = await db
  .from('matches')
  .select('id, party_a, status, created_at,internship_postings(title, company_name)')
  .eq('praktijkbegeleider_profile_id', userId)
  .in('status', ['accepted', 'active']);

const studentIds = (matchRows || []).map(m => m.party_a).filter(Boolean);
// Then enrich with student_profiles and combine into 'enriched' array
```

**SQL needed: NO** — `matches.praktijkbegeleider_profile_id` bestaat al in [internly_migration.sql:138](internly_migration.sql#L138) en [:448](internly_migration.sql#L448) (ALTER TABLE) + RLS policy `matches_select_party` ([:629-631](internly_migration.sql#L629)) staat lezen door deze rol al toe.

Per-student row toont nu ook `📊 Stage Hub →` link naar `match-dashboard.html?match=<m.matchId>`.

---

## NAV SIDEBAR KNOPPEN

**company-dashboard nav-stagehub:**
- Before: `<button id="nav-stagehub" onclick="window.location.href='match-dashboard.html'">📊 Stage Hub</button>` ([:633](company-dashboard.html#L633))
- After: `<button id="nav-stagehub" onclick="show('studenten')">📊 Stage Hub</button>` (+ nieuwe `nav-studenten` knop daarboven)

**school-dashboard nav-stagehub:**
- Before: `<button id="nav-stagehub" onclick="window.location.href='match-dashboard.html'">📊 Stage Hub</button>` ([:659](school-dashboard.html#L659))
- After: `<button id="nav-stagehub" onclick="show('studenten')">📊 Mijn studenten</button>`

Beide knoppen leiden nu naar de bestaande, echte studenten-overzichtsschermen in de eigen dashboards in plaats van naar match-dashboard demo-modus.

---

## CAN MAPPING

**begeleider permissions added** (mirror van school, read-only preset):
```js
begeleider: {
  addTask: false, editTask: false, deleteTask: false, checkTask: false,
  addDeadline: false, editDeadline: false,
  addReflectie: false, editReflectie: false,
  updateLeerdoel: false, editStageplan: false,
  inviteSchool: false,
  viewLog: true, viewScores: true
}
```

Based on: school entry ([match-dashboard.html:2486-2493](match-dashboard.html#L2486)) — identieke read-only configuratie. Begeleider kan stage-data bekijken (viewLog/viewScores) maar niets bewerken, taken aanmaken, deadlines plannen, reflecties schrijven of leerdoelen wijzigen.

Note: instructie noemde keys als `addNote`/`editLeerdoel`/`addLog`/`planMeeting`/`signStageplan` die NIET in de bestaande `CAN` tabel zitten. Ik heb de werkelijke keys uit de student/bedrijf/school entries gespiegeld om een consistente structuur te behouden — toevoegen van niet-gebruikte keys zou dood code zijn.

---

## READ-ONLY BANNER

Locations updated:
- [match-dashboard.html:3756](match-dashboard.html#L3756) — `schoolReadOnly` banner in `renderVoortgang()`. Conditie uitgebreid; banner-tekst dynamisch ("praktijkbegeleider" vs "schoolbegeleider")
- [match-dashboard.html:4621](match-dashboard.html#L4621) — `readonly` flag in `renderStageplan()`. Banner-tekst zelfde dynamische conditioneel

Locations NIET geüpdatet (en waarom):
- [match-dashboard.html:2876](match-dashboard.html#L2876) `if (role === 'school') buildSchoolSwitcher(...)` — school-switcher zoekt via `school_profiles.schoolnaam`. Begeleider-switcher zou een aparte query nodig hebben (`matches.praktijkbegeleider_profile_id`). Buiten Phase 1 scope; begeleider navigeert per match-id zonder switcher
- [match-dashboard.html:2903](match-dashboard.html#L2903) `if (role === 'school') { ... load school name }` — laadt `school_profiles` record. Niet relevant voor begeleider
- [match-dashboard.html:2920](match-dashboard.html#L2920) `if (role === 'school') hubPartyIds.school = user.id` — state-ID slot. Begeleider zou eigen slot nodig hebben (bv. `hubPartyIds.begeleider`); buiten scope
- [match-dashboard.html:3412](match-dashboard.html#L3412) `${role==='school'?' active':''}` — topbar party-pillar active-state. Begeleider heeft geen eigen pillar
- [match-dashboard.html:3560](match-dashboard.html#L3560) `if (role === 'school')` — Plan driegesprek knop in `renderMilestoneAction`. Feature-gating: alleen school plant. Begeleider read-only mag dit terecht NIET
- [match-dashboard.html:3795](match-dashboard.html#L3795) `m.status === 'ingediend' && hubState.role === 'school'` — Bevestigen-knop op milestone-row. Feature-gating: alleen school bevestigt; begeleider mag dit terecht NIET

---

## RESTERENDE BACKLOG FASE 2

- match-dashboard `?view=overview` (lichte view voor school/bedrijf/begeleider — alleen Voortgang-tab + read-only milestones, zonder de zware Planning/Taken/Logboek tabs voor cognitieve schaalbaarheid bij >10 studenten)
- Bedrijf student-card: dezelfde compacte progress percentage tonen op de Hub-knop zelf (in plaats van apart bar)
- UX: Hub-knop label updaten naar "📊 Hub — X van 8 mijlpalen" voor betere context
- Begeleider switcher: implementeer `buildBegeleiderSwitcher(user.id, MATCH_ID)` analoog aan `buildSchoolSwitcher`, gebaseerd op `matches.praktijkbegeleider_profile_id = user.id`
- Begeleider hubPartyIds slot toevoegen (`hubPartyIds.begeleider = user.id`) zodat 4-party meeting flows mogelijk worden
- Topbar party-pillar voor begeleider toevoegen (4e pillar) — vereist redesign van match-indicator
- Begeleider RLS policy review op `stage_plans/leerdoelen/deadlines/tasks/reflecties/log` — huidige policies gebruiken `m.party_a OR m.party_b OR m.praktijkbegeleider_profile_id` ([internly_migration.sql:931](internly_migration.sql#L931) etc.) wat al werkt, maar verifiëren tijdens livetest met echte begeleider-account
- Bedrijf "Mijn studenten" badge in sidebar (count van active matches) net als school heeft
