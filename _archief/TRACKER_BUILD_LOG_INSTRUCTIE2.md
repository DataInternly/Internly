# CC Instructie 2 — Build Log
## Datum: 30 april 2026

## WIJZIGINGEN

### Pre-check — DONE
- [js/milestones.js:142-146](js/milestones.js#L142) bevat alle 5 window globals (`getMilestones`, `calcProgress`, `getNextMilestone`, `submitMilestone`, `confirmMilestone`). CONFIRMED.

### FIX 1 — js/utils.js notification types — DONE
- [js/utils.js:332-333](js/utils.js#L332): `'milestone_submitted', 'milestone_confirmed'` toegevoegd aan VALID_NOTIFICATION_TYPES (na `'bundeling_denied'`).
- [js/utils.js:358-359](js/utils.js#L358): twee `case` regels toegevoegd in `getNotifText()` switch (na `school_referral` case, vóór `default`).

### FIX 2 — match-dashboard.html script tag — DONE
- [match-dashboard.html:23](match-dashboard.html#L23): `<script src="js/milestones.js"></script>` toegevoegd direct na `<script src="js/supabase.js">` (lijn 22), vóór `<script src="js/account.js">`.

### FIX 3 — match-dashboard.html load milestones in hub — DONE
- [match-dashboard.html:2266](match-dashboard.html#L2266): `milestones: []` toegevoegd aan `hubState` initial state.
- [match-dashboard.html:~2614-2622](match-dashboard.html#L2614): try/catch block ingevoegd in `loadHubFromDB()` direct na `logRes`-block en vóór `if (currentUser)` meetings-load. Vult `hubState.milestones` via `getMilestones(MATCH_ID)`, valt terug op `[]` bij fout met `console.warn` log.

### FIX 4 — match-dashboard.html progress bar replace — DONE
- [match-dashboard.html:2493-2501](match-dashboard.html#L2493): `_msPct`/`_msColor` berekening toegevoegd in `renderMatchIndicator()` direct na bestaande `weekPct`/`avgPct`. Fallback intact: als `calcProgress` ontbreekt of `hubState.milestones` leeg → originele `weekPct` + `pctColor(avgPct)`.
- [match-dashboard.html:~2535-2537](match-dashboard.html#L2535): bar-element gebruikt nu `width:${_msPct}%; background:${_msColor}` en pct-label toont `${_msPct}%`. weekPct/pctColor calls intact gehouden voor fallback.

### FIX 5 — match-dashboard.html milestone tracker in renderVoortgang — DONE
- **Helpers** ingevoegd vóór `renderVoortgang()` op [match-dashboard.html:3543-3631](match-dashboard.html#L3543):
  - `renderMilestoneAction(milestone, role)` — sync helper, retourneert HTML voor actie-knop (Plan driegesprek / Rapport ingeleverd / Verslag ingeleverd / Gereed / Afronden) op basis van `confirms_by` × `category` × `role`.
  - `handleSubmitMilestone(milestoneId)` — async, roept `submitMilestone()` + reload milestones + re-render. Catch met `console.warn` + `notify('Kon stap niet indienen', false)`.
  - `handleConfirmMilestone(milestoneId)` — async, fetch `studentId` via `matches.party_a` lookup, roept `confirmMilestone()` + reload + re-render. Catch met `console.warn` + `notify('Kon niet bevestigen', false)`.
- **Tracker block** ingevoegd in `renderVoortgang()` rond [match-dashboard.html:3661-3713](match-dashboard.html#L3661) — bovenaan de return-template, vóór page-head. Bevat: sec-label "Stagevoortgang — 8 mijlpalen", `milestone-next-banner` met `getNextMilestone(...)` resultaat (of "✓ Je bent bij — wacht op de andere partij"), en 8 `.milestone-row` items met dot/title/meta/actie-knoppen.
- **Leerdoelen sliders [match-dashboard.html:3568-3590](match-dashboard.html#L3568) ONGEWIJZIGD** zoals voorgeschreven door RULE.
- **CSS** ingevoegd in style-block op [match-dashboard.html:1618-1666](match-dashboard.html#L1618) (direct na `.progress-stage-pct`): `.milestone-row`, `.milestone-dot`, `.milestone-bevestigd .milestone-dot`, `.milestone-ingediend .milestone-dot`, `.milestone-title`, `.milestone-meta`, `.milestone-next-banner`, `.milestone-next-banner.milestone-done`, `.milestone-next-label`, `.milestone-next-title`, `.btn-sm`.

**Mid-session syntax bug + fix:** initiele versie van `renderMilestoneAction` had nested template-literal escape-issue (`\\'planning\\'`). Resolved door inline-conditional te vervangen met `const meetClick = ... ? 'openMeetingModal()' : "switchTab('planning')";` op [match-dashboard.html:3549-3551](match-dashboard.html#L3549). IDE-diagnostics nu schoon.

### FIX 6 — company-dashboard.html script tag + seed call — DONE
- [company-dashboard.html:19](company-dashboard.html#L19): `<script src="js/milestones.js"></script>` toegevoegd na `js/supabase.js`, vóór `js/account.js`.
- [company-dashboard.html:1648-1664](company-dashboard.html#L1648): `try { ... db.rpc('seed_stage_milestones', { p_match_id, p_profiel_compleet: !!(_sp?.naam) }); } catch (_e) { console.warn(...) }` ingevoegd in `acceptMatch()` direct na conversation-create, vóór `createNotification(studentId, 'application_accepted', ...)`. Non-blocking — match accept gaat door bij seed-fout.

### FIX 7 — company-dashboard.html eindbeoordeling modal — DONE
- [company-dashboard.html:1626-1631](company-dashboard.html#L1626): "Stage afronden →" knop toegevoegd binnen match-card render (in `loadCompanyMatches`), conditioneel op `m.status === 'accepted'`. Triggert `openEindbeoordelingModal('${m.id}','${m.party_a}')`.
- [company-dashboard.html:1693-1789](company-dashboard.html#L1693): `openEindbeoordelingModal(matchId, studentId)` async functie toegevoegd na `rejectMatch()`. Laadt milestones via `getMilestones`, controleert seq-8 status (early-return bij bevestigd of ingediend), toont modal met rating-select en toelichting-textarea.
- Direct daarna `submitEindbeoordeling(milestoneId, matchId, studentId)` async functie. Roept `submitMilestone()` (notification naar school via `createNotification`-keten in milestones.js). Catch met `console.warn` + `notify('Kon eindbeoordeling niet versturen', false)`.

### FIX 8 — school-dashboard.html script tag + bevestig modal — DONE
- [school-dashboard.html:19](school-dashboard.html#L19): `<script src="js/milestones.js"></script>` toegevoegd na `js/supabase.js`, vóór `js/account.js`.
- [school-dashboard.html:1404-1426](school-dashboard.html#L1404): batch-load van `stage_milestones` in `loadStudenten()` na alle student-data verrijkt is, vóór `renderStudentenRows()`-aanroepen. Bouwt `_milestoneMap[match_id] = [milestones...]`. Try/catch met `console.warn`.
- [school-dashboard.html:1429](school-dashboard.html#L1429), [:1448](school-dashboard.html#L1448): beide `renderStudentenRows()` aanroepen passen nu `_milestoneMap` als 3e argument door.
- [school-dashboard.html:1460](school-dashboard.html#L1460): `renderStudentenRows(cid, data)` signature uitgebreid naar `(cid, data, milestoneMap = {})`.
- [school-dashboard.html:1474-1487](school-dashboard.html#L1474): `pendingBtn` toegevoegd binnen row-template. Toont "⏳ N bevestiging(en) vereist" knop in `.sr-right` als er pending milestones zijn voor deze match.
- [school-dashboard.html:~1521-1672](school-dashboard.html#L1521): `openMilestoneModal(matchId, studentNaam)` + `schoolConfirmMilestone(milestoneId, matchId)` async functies toegevoegd direct na `renderStudentenRows()`. Modal sluit auto wanneer alle bevestigingen binnen zijn. Beide catches gebruiken `console.warn` + `notify(..., false)`.

---

## OPEN ACTIES VOOR BARRY

1. **Voer [STAGE_MILESTONES_MIGRATION.sql](STAGE_MILESTONES_MIGRATION.sql) uit in Supabase SQL Editor** (als nog niet gedaan).
   Verificatie:
   ```sql
   SELECT policyname FROM pg_policies
   WHERE tablename = 'stage_milestones';
   ```
   Verwacht: 3 policies — `sm_select_party`, `sm_select_school`, `sm_update_auth`.

2. **Test seed functie op bestaande match:**
   ```sql
   SELECT seed_stage_milestones(
     '6684fa67-b78d-4179-a255-54e9140c2f3d', true);
   ```
   Verificatie:
   ```sql
   SELECT seq, title, status FROM stage_milestones
   WHERE match_id = '6684fa67-b78d-4179-a255-54e9140c2f3d'
   ORDER BY seq;
   ```
   Verwacht: 8 rijen, seq 1 bevestigd (vanwege `p_profiel_compleet = true`), rest open.

3. **Test de volledige flow handmatig:**
   a. Log in als bedrijf, accepteer een match → check dat 8 mijlpalen aangemaakt zijn (`SELECT count(*) FROM stage_milestones WHERE match_id = '<new>';` = 8)
   b. Log in als student, open match-dashboard → check dat milestone tracker zichtbaar is in Voortgang-tab; check dat top-balk een nieuw percentage toont (10% als profiel ingevuld, anders 0%)
   c. Student klikt "Rapport ingeleverd" / "Verslag ingeleverd" → check dat school-account een notificatie ontvangt (`milestone_submitted`)
   d. Log in als school, open school-dashboard → check dat "⏳ 1 bevestiging vereist" badge zichtbaar is bij betreffende student-row
   e. School klikt knop → modal opent → school bevestigt → check dat student-account `milestone_confirmed` notificatie ontvangt

## RESTERENDE BACKLOG (Instructie 3)

- `hoe-het-werkt.html` uitlegpagina bouwen
- `sm_update_auth` RLS policy aanscherpen (post-livetest, momenteel te open: `USING (true)` — moet rol-specifiek worden om injection te voorkomen)
- Milestone schema op kort vs lang stage aanpassen (TQ-bevinding: 1 maand vs 6 maanden vereist verschillende seq-templates)
- Realtime push op `milestone_confirmed` (student ziet bevestiging zonder pagina-refresh — Supabase channel subscribe op stage_milestones tabel met match_id filter)
