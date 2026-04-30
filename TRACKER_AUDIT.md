# INTERNLY — TRACKER AUDIT
Datum: 30 april 2026

## SCHEMA BEVINDINGEN

**Bron:** [internly_migration.sql](internly_migration.sql) — 1142 regels.

**Confirmed: stage_milestones tabel bestaat?** **NO.**

**Conflicterende tabellen:**
- `stage_plans` ([:312](internly_migration.sql#L312)) — 1 per match, plan-record
- `stage_leerdoelen` ([:332](internly_migration.sql#L332)) — leerdoelen met `progress` int 0-100
- `stage_deadlines` ([:344](internly_migration.sql#L344)) — bevat `type` met waarde-mogelijkheid `'milestone'` (als string-enum, niet aparte tabel)
- `stage_tasks` ([:356](internly_migration.sql#L356)) — taken met status todo/in-progress/done
- `stage_reflecties` ([:371](internly_migration.sql#L371))
- `stage_log` ([:384](internly_migration.sql#L384))

Geen naamconflict — `stage_milestones` is uniek beschikbaar. Wel inhoudelijke overlap met `stage_deadlines.type='milestone'` die genegeerd kan worden (huidige code gebruikt het niet als domeinconcept).

**matches.progress kolom:** **ABSENT.** matches heeft alleen `status enum (active|accepted|rejected|pending|ended)` — geen percentage of completion-veld.

**meetings.type kolom:** **EXISTS.** Waarden: `'evaluatie' | 'driegesprek' | 'afspraak'` (per [:245](internly_migration.sql#L245) commentaar). Status enum: `openstaand|bevestigd|afgewezen|geannuleerd|student_getekend|bedrijf_getekend|voltooid`.

**RLS-patroon voor stage_* tabellen:** allen gebruiken `EXISTS(SELECT 1 FROM matches m WHERE m.id = ... AND (party_a OR party_b OR praktijkbegeleider_profile_id) = auth.uid())`. **School heeft GEEN policy via schoolnaam-koppeling** — dit is een hiaat dat we voor stage_milestones expliciet wel toevoegen via `sm_select_school`.

---

## MATCH-DASHBOARD BEVINDINGEN

**Huidige progress berekening:** **TWEE ONAFHANKELIJKE MECHANISMEN MET VISUELE DISSONANTIE.**

1. Date-based `weekPct` ([match-dashboard.html:2486](match-dashboard.html#L2486), via [stageWeekNum() :4363](match-dashboard.html#L4363)): `weekPct = round(currentWeek/totalWeeks * 100)` — bepaalt **breedte** balk.
2. Leerdoel-average `avgPct` ([:2488](match-dashboard.html#L2488)): gemiddelde van `stage_leerdoelen.progress` rijen — bepaalt **kleur** balk.

Resultaat: balk kan 80% breed (ver in tijd) maar rood (lage leerdoel-progressie) zijn, of omgekeerd. Niet aanstuurbaar door echte acties.

**Progress bar locatie:** [match-dashboard.html:2522-2527](match-dashboard.html#L2522) (top match-indicator); plus per-leerdoel mini-bars in [renderVoortgang() :3489-3510](match-dashboard.html#L3489) en [renderOverzicht() :3056-3058](match-dashboard.html#L3056).

**Leerdoelen tracker locatie:** `renderVoortgang()` — [match-dashboard.html:3474](match-dashboard.html#L3474). Mini-versie in `renderOverzicht()` rond [:3023](match-dashboard.html#L3023).

**Match accept functie:** **NIET in match-dashboard.html.** Wordt afgehandeld in company-dashboard.html `acceptMatch()`. match-dashboard.html laadt alleen het bestaande match via `?match=` URL-param.

**Seed aanroep locatie (voorstel):** [company-dashboard.html:1645](company-dashboard.html#L1645) — direct na conversation-create, vóór `createNotification(studentId, 'application_accepted', ...)`.

HOW:
```js
// Seed milestone tracker — audit fix 30 apr 2026
try {
  const { data: studentSp } = await db.from('student_profiles')
    .select('naam').eq('profile_id', studentId).maybeSingle();
  const _profOk = !!(studentSp?.naam);
  await db.rpc('seed_stage_milestones', {
    p_match_id: matchId,
    p_profiel_compleet: _profOk
  });
} catch (e) {
  console.warn('[acceptMatch] milestone seed fout:', e?.message || e);
}
```

---

## SCHOOL-DASHBOARD BEVINDINGEN

**Studentenlijst functie:** `loadStudenten()` — [school-dashboard.html:1271-1426](school-dashboard.html#L1271). Renderer `renderStudentenRows(cid, data)` op [:1436-1473](school-dashboard.html#L1436).

**Student row HTML structuur (samenvatting [:1442-1472](school-dashboard.html#L1442)):**
- Avatar (initialen) + naam + opleiding · jaar · bedrijf
- Optionele bundle-tag, faseLabel ("Stage loopt"/"⚠ Let op"/"Zoekend")
- **Progress-balk** (alleen premium + niet-zoekend): `width:${progress}%; background:${progressColor(progress)}`
- Signal-badge ("Actief"/"⚠ Risico"/"Zoekend")
- "📊 Hub"-link naar match-dashboard.html?match=... (alleen premium + matchId)

Status-derivatie ([:1370-1380](school-dashboard.html#L1370)): `actief` als avg leerdoel-progress ≥ 20%, `risico` als < 20%, `zoekend` als geen accepted match.

**Confirmation paneel toevoegen op:** [school-dashboard.html:1456-1470](school-dashboard.html#L1456) — binnen `.sr-right` block, óf als click-to-expand uitbreiding van student-row. Concreet voorstel: voeg een nieuwe knop "Bevestig stappen (N)" toe waar N = aantal `status='ingediend'` milestones voor deze match. Open een modal met `getMilestones(matchId)` resultaat en confirmMilestone-knoppen.

---

## COMPANY-DASHBOARD BEVINDINGEN

**Match accept functie:** `acceptMatch(matchId, studentId)` — [company-dashboard.html:1634-1654](company-dashboard.html#L1634).

Stappen na DB-update:
1. `UPDATE matches.status='accepted'` met `.eq('party_b', currentUser.id)` safety
2. Conversation lookup/insert
3. `createNotification(studentId, 'application_accepted', matchId, 'match', ...)`
4. `sessionStorage.removeItem('internly_trust_calculated_*')`
5. Toast + `loadCompanyMatches()`

**Eindbeoordeling toevoegen op:** **Nieuwe modal vereist.** Geen bestaande "stage afronden"-functie. Voorstel: nieuwe knop in match row van [renderMatches() rond :1576-1595](company-dashboard.html#L1576) als `m.status === 'accepted'` én `getNextMilestone(milestones, 'bedrijf')` een resultaat heeft. Modal-flow:
- Toon eindbeoordeling-formulier (rating + tekst)
- Bij submit: `confirmMilestone(milestoneId, userId, studentId)` voor de seq-8 "Eindbeoordeling afgerond" milestone
- School ontvangt `milestone_submitted` notificatie via `submitMilestone()` → bevestigt in school-dashboard

---

## NOTIFICATION TYPES VEREIST

**Voeg toe aan [js/utils.js](js/utils.js) VALID_NOTIFICATION_TYPES:**
- `'milestone_submitted'`
- `'milestone_confirmed'`

**Voeg toe aan [getNotifText()](js/utils.js):**
- `milestone_submitted`: `'Nieuwe stap ingediend — bevestig in je dashboard.'`
- `milestone_confirmed`: `'Een mijlpaal in je stagevoortgang is bevestigd.'`

---

## SEED AANROEP PLAN

**Locatie:** [company-dashboard.html:1645](company-dashboard.html#L1645) (na conv-create, vóór notification).

**Code toevoegen:**
```js
const { data: studentSp } = await db.from('student_profiles')
  .select('naam').eq('profile_id', studentId).maybeSingle();
const _profOk = !!(studentSp?.naam);
await db.rpc('seed_stage_milestones', {
  p_match_id: matchId,
  p_profiel_compleet: _profOk
}).catch(e => console.warn('[acceptMatch] milestone seed fout:', e?.message));
```

**Idempotency:** de SQL-functie heeft een `IF EXISTS … RETURN` guard, dus dubbele acceptance-clicks (race-condition) creëren niet 16 milestones. Veilig.

---

## VOLGENDE CC SESSIE

Instructie 2 targets:
1. **[js/utils.js](js/utils.js)**: voeg `milestone_submitted` en `milestone_confirmed` toe aan `VALID_NOTIFICATION_TYPES` (rond lijn waar andere types zijn) + bijbehorende strings in `getNotifText()` ([:334](js/utils.js#L334)).
2. **[match-dashboard.html:2522-2527](match-dashboard.html#L2522)** — vervang de date-based `progress-stage-fill` balk door milestone-based: `calcProgress(milestones)` gebruiken voor zowel breedte als kleur. Laad milestones via `getMilestones(MATCH_ID)` in `loadHubFromDB()` rond [:2537](match-dashboard.html#L2537).
3. **[match-dashboard.html:3474](match-dashboard.html#L3474)** — `renderVoortgang()`: voeg een nieuw blok bovenaan toe dat de 8 milestones rendert met status-iconen (open/ingediend/bevestigd) en — voor de huidige rol — een actie-knop ("Indienen" / "Bevestigen") via `getNextMilestone(milestones, hubState.role)`.
4. **[company-dashboard.html:1645](company-dashboard.html#L1645)** — voeg de `db.rpc('seed_stage_milestones', ...)` aanroep toe binnen `acceptMatch()` na de conversation-create.
5. **[school-dashboard.html:1456](school-dashboard.html#L1456)** — binnen `renderStudentenRows()` `.sr-right`: voeg "Bevestig stappen"-knop toe als `getNextMilestone(ms, 'school')` een resultaat heeft. Maak een nieuwe modal-functie die `getMilestones(matchId)` toont met confirmMilestone-knoppen per `status='ingediend'` rij.
6. **[company-dashboard.html:~1595](company-dashboard.html#L1595)** — voeg "Stage afronden"-modal toe voor matches met `status='accepted'` waar de seq-8 milestone open staat. Modal vraagt rating + tekst, roept `confirmMilestone(seq8Id, currentUser.id, studentId)`.

**Pre-conditions vóór instructie 2:**
- `STAGE_MILESTONES_MIGRATION.sql` uitgevoerd in Supabase SQL Editor.
- `js/milestones.js` toegevoegd aan §Laadvolgorde in [CLAUDE.md](CLAUDE.md) als optionele module (direct na utils.js, vóór telemetry.js).
- `<script src="js/milestones.js"></script>` toegevoegd aan match-dashboard.html, school-dashboard.html, company-dashboard.html.
