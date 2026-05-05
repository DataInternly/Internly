# Pre-FTP Safety Audit — profile_completeness Fase 2

**Datum**: 6 mei 2026
**Crew**: Bedward + Hal + Witty
**Doel**: bevestigen dat 6 files veilig naar productie kunnen vóór FTP + commit + push.

## CHECK 1 — Diff-discipline

**Resultaat**: ✅ PASS

Werktree exact volgens spec:
```
M  bbl-hub.html
M  company-dashboard.html
M  css/style.css
M  js/utils.js
M  school-dashboard.html
M  student-home.html
M  supabase/functions/vat-verify/index.ts   (PRE-EXISTING — niet vandaag)
?? docs/audits/LIVETEST_AUDIT_4MEI.md       (PRE-EXISTING — niet vandaag)
?? docs/audits/PROFILE_COMPLETENESS_AUDIT.md
?? docs/audits/PROFILE_COMPLETENESS_FIX_FASE2.md
?? docs/runs/RUN_2_DIAGNOSE.md              (PRE-EXISTING — niet vandaag)
```

Alle 6 verwachte modified files. Geen onverwachte M-states.

## CHECK 2 — XSS bescherming

**Resultaat**: ✅ PASS

- [js/utils.js:966](js/utils.js#L966) — `escapeHtml(s.impact)` in suggesties-render ✓
- Andere user-controlled velden in `renderRoleLanding` waren al ge-escapet vóór Run 4 (escapedNaam, opleiding, sector, schoolnaam) ✓
- `profileEditUrl` als `href` waarde — niet via escapeHtml; alle huidige callers passen hardcoded strings (`'bbl-profile.html'`, `'#'`). Veilig voor huidige callers; backlog: URL-encode bij user-input.

## CHECK 3 — Backwards compatibility renderRoleLanding

**Resultaat**: ✅ PASS

3 callers gevonden — exact volgens scope (3 welkomstblokken). Helper gebruikt:
- `profileData.profile_completeness` — `typeof === 'number' && < 100` guard, ontbrekend = geen render
- `profileData.completeness_suggestions || []` — fallback empty array
- `profileData.profile_edit_url || '#'` — fallback `'#'`

Oude callers zonder deze props blijven werken zonder crash.

## CHECK 4 — Error handling

**Resultaat**: ✅ PASS

- [js/utils.js:574](js/utils.js#L574) `calculateProfileCompleteness`: `if (!config || !profileData) return 0;` ✓
- [js/utils.js:590](js/utils.js#L590) `getCompletenessSuggestions`: `if (!config || !profileData) return [];` ✓
- Onbekende rol → return 0 / []. Geen throw.
- `student_bbl` → mapped naar `student` config (niet undefined).

## CHECK 5 — Geen PII in console-logs

**Resultaat**: ✅ PASS

5 console-statements gevonden, **alle pre-existing**:
- bbl-hub:2600, company-dashboard:3859, school-dashboard:1499 — error.message bij DB-fouten
- utils.js:1106, 1111 — renderStudentHeader fouten

Geen nieuwe console-statements met `data.naam`, `postcode`, `beschrijving`, etc.

## CHECK 6 — RLS-veilig: SELECT-whitelists

**Resultaat**: ✅ PASS

- **BBL** ([bbl-hub.html:725](bbl-hub.html#L725)): `'opleiding, jaar, school, opdracht_domein, motivatie, skills, bbl_mode, postcode'` — `postcode` toegevoegd ✓
- **Bedrijf** ([company-dashboard.html:759](company-dashboard.html#L759)): `'bedrijfsnaam, sector, size, trust_score, trust_grade, website, beschrijving, avatar_key, remote_possible'` — 4 nieuwe velden ✓
- **School** ([school-dashboard.html:736](school-dashboard.html#L736)): `'schoolnaam, contactpersoon, locatie, opleidingen, avatar_key'` — `avatar_key` toegevoegd ✓

**Anti-pattern check**: 9 pre-existing `select('*')` hits in dezelfde 4 files (gemeld in [SECURITY_AUDIT_5MEI.md](SECURITY_AUDIT_5MEI.md) Audit 1 als backlog). **Géén nieuwe** SELECT * door Run 4 geintroduceerd ✓

## CHECK 7 — student-home.html migratie schoon

**Resultaat**: ✅ PASS

- 0 hits voor lokale `_cVelden` / `_totaal` / `_behaald` / `_heeftWaarde` (alle verwijderd) ✓
- 2 hits voor centrale helper-aanroepen ([student-home.html:253](student-home.html#L253), [:261](student-home.html#L261)) ✓
- Eigen UI (`sh-pct`, `sh-progress-fill`, `sh-suggesties`) behouden ✓

## CHECK 8 — Time-box / scope-discipline

**Resultaat**: ✅ PASS

```
bbl-hub.html              +10  -?
company-dashboard.html    +10  -?
css/style.css             +23
js/utils.js               +91   ← biggest, expected (helpers + config + render update)
school-dashboard.html     +9
student-home.html         +24  -? (netto kleiner — vervanging)
─────────────────────────────────
Run 4 totaal:             ~167 insertions, ~17 deletions across 6 files
```

Diff omvang past bij spec-orde-grootte. Geen runaway scope. Witty's 75-min lock gerespecteerd.

**Note**: `vat-verify/index.ts +557 -303` is pre-existing (niet vandaag, niet onderdeel van Run 4 commit).

## SQL voor Barry (kolom-existentie)

Run in Supabase Console om te bevestigen dat alle nieuwe SELECT-kolommen bestaan:

```sql
-- Verifieer kolom-existentie voor 4 nieuwe SELECT-additions
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND (
    (table_name = 'student_profiles' AND column_name = 'postcode') OR
    (table_name = 'company_profiles' AND column_name IN ('website','beschrijving','avatar_key','remote_possible')) OR
    (table_name = 'school_profiles'  AND column_name = 'avatar_key')
  )
ORDER BY table_name, column_name;

-- Verwacht: 6 rijen
--   company_profiles | avatar_key
--   company_profiles | beschrijving
--   company_profiles | remote_possible
--   company_profiles | website
--   school_profiles  | avatar_key
--   student_profiles | postcode

-- Bij minder rijen: kolom ontbreekt → 400 error in welkomstblok bij dat scenario
-- (zelfde patroon als profile_completeness Run 3.B)
```

**Risico bij ontbrekende kolom**: 400 error in welkomstblok-IIFE. Pagina rendert wel verder (helper handelt graceful undefined af), maar completeness-bar verschijnt niet voor die rol.

## Risico-classificatie

| Niveau | Aantal | Items |
|---|---|---|
| KRITIEK (push-blocking) | 0 | — |
| HOOG (fix vóór livetest) | 0 | — |
| MEDIUM | 1 | SQL-kolom-verify openstaand (Audit 8 SECURITY_AUDIT_5MEI patroon — verifieerbaar zonder code-change) |
| LAAG | 2 | profileEditUrl URL-escape backlog; pre-existing SELECT * (al backlog) |

## Beslissing

- [x] **PUSH PROVISIONAL** — Audit 1-8 alle PASS; Audit 6-SQL openstaand bij Barry
- [ ] PUSH GOEDGEKEURD — na SQL-verify
- [ ] FIX NODIG vóór FTP

**Aanbeveling**:
1. Barry runt SQL in Supabase Console (1 min)
2. Bij 6/6 PASS → push GO
3. Bij ontbrekende kolom → 1 SELECT inkorten (zelfde fix als Run 3.B Fase A)

## Sign-off
- **Bedward**: geen kritieke security-issues, RLS-strategie ongewijzigd, escapeHtml correct toegepast
- **Hal**: profile_edit_url paths gevalideerd in Fase 2 implementatie (bbl-profile.html bestaat, '#' bewust placeholder)
- **Witty**: scope-lock gerespecteerd, 167 insertions in 6 files binnen spec-orde
