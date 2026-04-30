# ROUTING FIX LOG — CC Instruction B
Datum: 2026-04-30
Bron: ROUTING_AUTH_AUDIT.md (29-30 apr 2026)
Toegepast door: Claude (hoofdsessie, sequential edits met before/after rapportage per fix)

## FIXES TOEGEPAST

| Fix | File | Line | Status | Notes |
|-----|------|------|--------|-------|
| 1 | [js/utils.js](js/utils.js#L126) | 126 | ✓ DONE | validRoles uitgebreid van 3 naar 6 (gepensioneerd, begeleider, admin toegevoegd) |
| 2 | [js/roles.js](js/roles.js#L67) | 67 | ✓ DONE | bbl_mode branch: naam null/empty → bbl-profile.html, anders → bbl-hub.html. undefined (mock) blijft hub |
| 3 | [international-student-dashboard.html:1072](international-student-dashboard.html#L1072) | 1072+ | ✓ DONE | Role guard + student type guard ingevoegd na !user check. roles.js script tag toegevoegd |
| 4A | [match-dashboard.html:2817](match-dashboard.html#L2817) | 2817 | ✓ DONE | allowedRoles uitgebreid: ['student','school','bedrijf','begeleider'] |
| 4B | [match-dashboard.html:2777](match-dashboard.html#L2777) | 2777 | NO-CHANGE | roleMap heeft al student/bedrijf/school. Instructie was "extend to include 'school' and 'bedrijf'" — beide al aanwezig. Note: 'begeleider' ontbreekt nog in roleMap maar instructie zei niet om die toe te voegen |
| 5 | [bbl-dashboard.html:21-22](bbl-dashboard.html#L21) | 21+22 | ✓ ADDED | js/roles.js toegevoegd na js/utils.js |
| 5 | [bbl-hub.html:59-60](bbl-hub.html#L59) | 59+60 | ✓ ADDED | js/roles.js toegevoegd na js/utils.js |
| 5 | [matchpool.html:16-17](matchpool.html#L16) | 16+17 | ✓ ADDED | js/roles.js toegevoegd na js/utils.js |
| 5 | [international-school-dashboard.html:34-35](international-school-dashboard.html#L34) | 34+35 | ✓ ADDED | js/roles.js toegevoegd na js/utils.js |
| 5 (auto) | [international-student-dashboard.html:39-40](international-student-dashboard.html#L39) | 39+40 | ✓ ADDED | Pre-requisite voor FIX 3 (resolveStudentDashboard call) |
| 5 (auto) | [review-form.html:15-16](review-form.html#L15) | 15+16 | ✓ ADDED | Pre-requisite voor FIX 8 (getRoleLanding call op student-pad) |
| 6A | [admin.html:794](admin.html#L794) | 794 | ✗ MISMATCH | Werkelijke pattern: `window.location.href = 'auth.html'` (geen `replace('auth.html')`). Zie MISMATCH REPORT |
| 6B | [bbl-dashboard.html:555](bbl-dashboard.html#L555) | 555 | ✓ SKIP (per instructie) | Alleen-voor-student trigger: `if (sp?.bbl_mode !== true)`. Geen aparte non-student redirect in dit file |
| 6C | [bbl-hub.html:2495](bbl-hub.html#L2495) | 2495 | ✓ SKIP (per instructie) | Alleen-voor-student trigger: `if (sp?.bbl_mode !== true)`. Geen aparte non-student redirect in dit file |
| 6D | [bbl-profile.html:651-652](bbl-profile.html#L651) | 651-652 | ✓ DONE | Variable: `role`, geen bblMode in scope → `getRoleLanding(role, false)` |
| 6E | [bol-profile.html:1285-1286](bol-profile.html#L1285) | 1285-1286 | ✓ DONE | Variable: `userRole` |
| 6F | [buddy-dashboard.html:959-960](buddy-dashboard.html#L959) | 959-960 | ✓ DONE | Variable: `profile?.role`, fallback `'gepensioneerd'` |
| 6G | [company-dashboard.html:2841-2842](company-dashboard.html#L2841) | 2841-2842 | ✓ DONE | Variable: `userRole` |
| 6H | [company-discover.html:714-715](company-discover.html#L714) | 714-715 | ✓ DONE | Variable: `userRole` |
| 6I | [international-school-dashboard.html:591](international-school-dashboard.html#L591) | 591 | ✓ DONE | Variable: `role`. Pattern matched literal `replace('auth.html')` exactly |
| 6J | [school-dashboard.html:2474-2475](school-dashboard.html#L2474) | 2474-2475 | ✓ DONE | Variable: `userRole` |
| 6K | [student-profile.html:1588-1589](student-profile.html#L1588) | 1588-1589 | ✓ DONE | Variable: `userRole` |
| 7 verify | [auth.html:983](auth.html#L983) | 983 | ✓ PASS | `resolveStudentDashboard({ role: 'student' }, _sp)` — _sp is correct doorgegeven |
| 7 comment 1 | [auth.html:979-982 → 979-984](auth.html#L979) | 979-982 | ✓ DONE | OPEN VRAAG block vervangen door 3-regel resolutie-comment |
| 7 comment 2 | [auth.html:1277-1280](auth.html#L1277) | 1277-1280 | ✓ DONE | OPEN VRAAG block vervangen door 1-regel resolutie-comment |
| 8 | [review-form.html:340-344](review-form.html#L340) | 340+ | ✓ DONE | Role guard ingevoegd na !user check. Student-only access enforced |

**Totaal: 22 edits over 17 bestanden. 1 MISMATCH (6A admin.html). 2 expliciet SKIP (6B/6C, conform instructie).**

## BBL CONFLICT RESOLVED

De BBL-routing inconsistentie tussen [auth.html:983](auth.html#L983) (post-login flow) en [auth.html:1281](auth.html#L1281) (al-ingelogd panel) is opgelost via een centrale verandering in [js/roles.js:67-76](js/roles.js#L67) — `resolveStudentDashboard` controleert nu `studentProfile?.naam` met een **expliciet null/empty-string-only** check, waardoor mock-objecten (zonder naam-key, `naam === undefined`) gewoon naar `bbl-hub.html` blijven gaan terwijl echte DB-rows met onvoltooide naam (`naam === null` of `naam === ''`) naar `bbl-profile.html` gerouteerd worden voor onboarding. Het verschil tussen `null/''` (definitief leeg, expliciet uit DB) en `undefined` (key niet aanwezig in object, mock-context) is hierdoor de cruciale discriminator die de twee historische gedragingen verenigt zonder mocks te breken.

## CANON B2 STATUS

Aantal lokale routes-dicts in wrong-role redirect categorie:
- Vóór deze sessie: **8** (bbl-profile, bol-profile, buddy-dashboard, company-dashboard, company-discover, school-dashboard, student-profile, plus international-school met `replace('auth.html')` zonder dict).
- Na deze sessie: **0** in scope. Alle 8 vervangen door `getRoleLanding()`-calls met `typeof`-guard.

Andere routes-achtige patronen die buiten FIX 6 scope vallen en blijven bestaan:
- [match-dashboard.html:2777](match-dashboard.html#L2777) `roleMap` — role-name normalisatie, geen URL-routing.
- [match-dashboard.html:~2793](match-dashboard.html#L2793) `backTargets` — back-button URL setup voor demo-mode hub, geen guard-redirect.
- [admin.html:794](admin.html#L794) hardcoded `'auth.html'` — zie MISMATCH REPORT.

## MISMATCH REPORT

### FIX 6A — admin.html:794

**Instructie pattern:** `replace('auth.html')` in de wrong-role redirect branch.
**Werkelijke pattern:**
```js
793: const { data: prof } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
794: if (prof?.role !== 'admin') { window.location.href = 'auth.html'; return; }
```
De wrong-role redirect gebruikt `window.location.href = 'auth.html'`, NIET `window.location.replace('auth.html')`. Per regels niet improviseren — geen wijziging toegepast.

**Equivalent fix (ter handmatige goedkeuring):**
```js
if (prof?.role !== 'admin') {
  window.location.replace(
    typeof getRoleLanding === 'function'
      ? getRoleLanding(prof?.role)
      : 'auth.html'
  );
  return;
}
```
Notes:
- `prof?.role` kan een geldige niet-admin rol zijn (student/bedrijf/etc) → wordt naar correcte landing gestuurd.
- `prof?.role` kan undefined zijn (geen profiel-rij) → `getRoleLanding(undefined)` retourneert `'index.html'` via de `|| 'index.html'` fallback.
- Wel: `replace()` i.p.v. `.href` om history schoon te houden, consistent met overige fix-targets.
- `auth.html` op regel 809 (in unhandledrejection handler voor expired-JWT) is een aparte kwestie en NIET dezelfde branch — niet wijzigen.

## REMAINING BACKLOG

- **internly-worldwide.html** inline `SUPABASE_URL` + `ANON_KEY` (regels 1661-1662) — bekend fase 2 cleanup-pattern. Dezelfde issue als about.html en index.html per CLAUDE.md sprint 5 backlog.
- **requireRole() expliciet aanroepen** op de pages die nu een eigen role-check via `getRoleLanding`-redirect hebben (functioneel correct maar niet via het canonieke `requireRole(...allowedRoles)`-patroon):
  - company-dashboard.html
  - school-dashboard.html
  - company-discover.html
  - student-profile.html
  - bol-profile.html
  - bbl-profile.html
  - bbl-hub.html (heeft custom BBL-mode check — vraagt eigen design-keuze)
  - bbl-dashboard.html (idem)
  - international-school-dashboard.html
  - international-student-dashboard.html
  - admin.html (zodra MISMATCH 6A is opgelost)
  - buddy-dashboard.html
- **match-dashboard.html school view** — toont nu student UI ook bij `userRole === 'school'`/`'bedrijf'` (na FIX 4A passen die rollen door de allowedRoles-check), maar de UI-rendering is niet gefilterd voor die rollen. Filtered school view nodig — next sprint.
- **match-dashboard.html roleMap** — `'begeleider'` ontbreekt in [regel 2777](match-dashboard.html#L2777) demo-mode mapping. Begeleider passeert nu de allowedRoles-check (FIX 4A) maar niet de demo-mode init-flow → mappedRole undefined → val-door. Niet in FIX 4 scope; aparte fix nodig.
- **FIX 6A admin.html** — pending sign-off op de equivalent-fix hierboven.
