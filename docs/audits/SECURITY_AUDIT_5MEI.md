# Security Audit pre-push 5 mei 2026

## Crew
- Lead: Bedward (security/privacy/OWASP)
- Review: Unsub Knob (attacker mindset), The Worm (entry-point risks), Hal (AI integrity), Bismarck (strategic risk)

## Scope
Wijzigingen van vandaag (Run 2 + 2.1 + 2.2 + 3 + 3.B + 3.C):
- js/buddy.js, js/utils.js (renderRoleLanding helper + label rename)
- buddy-dashboard.html, bbl-hub.html, chat.html (chat-link rename)
- bbl-hub.html, company-dashboard.html, school-dashboard.html (welkomstblok)
- css/style.css (rl-* classes)
- DB: 6 ALTER TABLE schema-fixes; profile_completeness bevestigd absent

Niet in scope: volledige codebase; vat-verify Edge Function.

---

## AUDIT 1 — SELECT * detection

**Resultaat**: WARNING (pre-existing, niet door Run 3 geintroduceerd)

11 hits in vandaag-aangeraakte files, allemaal **buiten** welkomstblok-scope (regels 1395+ company, 1483+ bbl-hub, 1112+ school, 814+ chat). Welkomstblok-queries zelf (Run 3) gebruiken expliciete kolomlijsten:
- bbl-hub:710-727 → `'naam, role'` + `'opleiding, jaar, school, opdracht_domein, motivatie, skills, bbl_mode'`
- company-dashboard:744-768 → `'naam, role'` + `'bedrijfsnaam, sector, size, trust_score, trust_grade'` + `'id'` (count head)
- school-dashboard:720-738 → `'naam, role'` + `'schoolnaam, contactpersoon, locatie, opleidingen'`

**Verdict**: Run 3 introduceert geen nieuwe SELECT *. Bestaande SELECT * is backlog (P1 audit 2026-04-15).

## AUDIT 2 — Welkomstblok-scripts alleen op ingelogde pagina's

**Resultaat**: PASS

`renderRoleLanding` / `*-welcome-anchor` voorkomen alléén in 3 dashboard-bestanden (bbl-hub, company-dashboard, school-dashboard). Geen lekkage naar publieke pagina's.

## AUDIT 3 — Silent failures in welkomstblok

**Resultaat**: WARNING — geen try/catch

Alle 3 IIFE's gebruiken early-return guards (`if (!user) return`, `if (!profile) return`), géén try/catch. Bij netwerk-error of DB-fout faalt welkomstblok stil zonder console.error of notify.

**Risico**: laag (UX-degradatie zonder leak). Welkomstblok rendert dan niet — pagina blijft functioneel.

**Aanbeveling backlog**: voeg `.catch(err => console.error('Welkomstblok render error:', err))` toe aan IIFE-wrapper.

## AUDIT 4 — RLS dependence (client-side guards vs server-side RLS)

**Resultaat**: REQUIRES SQL VERIFY (Audit 8)

Tabellen gequeried door welkomstblok:
- bbl-hub: `profiles`, `student_profiles`
- company-dashboard: `profiles`, `company_profiles`, `matches` (count)
- school-dashboard: `profiles`, `school_profiles`

Client gebruikt `db.auth.getUser()` (JWT-validated) en `eq('profile_id', user.id)` / `eq('party_b', user.id)`. Defense-in-depth vereist RLS-policies die hetzelfde afdwingen server-side. **Niet client-side te verifiëren** — Audit 8 SQL nodig.

## AUDIT 5 — XSS via escapeHtml

**Resultaat**: PASS voor user-controlled velden, WARNING voor server-controlled

[js/utils.js:818-883](js/utils.js#L818) renderRoleLanding:
- `naam` → `escapeHtml(naam)` → `escapedNaam` ✓
- `opleiding` → `escapeHtml(profileData.opleiding)` ✓
- `sector`, `size` → `escapeHtml(...)` ✓
- `schoolnaam` → `escapeHtml(profileData.schoolnaam)` ✓
- `pill.label`, `pill.bg`, `pill.color` — uit hardcoded `rolePillMap`, niet user-controlled ✓
- `datum`, `greeting` — door JS opgebouwd, niet user-controlled ✓
- `completeness` — `typeof === 'number'` check, interpoleert int ✓

Caller-quick-actions:
- bbl-hub: hardcoded HTML strings ✓
- company-dashboard:783-786 — `pendingCount` (Supabase count → number), `trust_score` / `trust_grade` (DB string/int, niet user-input) — **acceptabel** maar kwetsbaar als trust-velden ooit user-editable worden
- school-dashboard: hardcoded ✓

**Verdict**: geen blocker. Trust-score-XSS-vector vereist DB-injectie of admin-compromise — niet client-vector.

## AUDIT 6 — Cross-account data leak

**Resultaat**: PASS

[js/supabase.js:93-115](js/supabase.js#L93) `clearUserState()`:
- Verwijdert alle `internly_*` en `buddy_*` localStorage keys (behoudt PROTECTED_KEYS)
- `sessionStorage.clear()` — schoont **ook** `bblView` deep-link key uit Run 2.1 ✓
- Reset `window.currentUser` + `window.currentProfile`

Aangeroepen in:
- [js/utils.js:397-418](js/utils.js#L397) `performLogout()` — na signOut ✓
- [js/supabase.js:147](js/supabase.js#L147) idle-timeout pad ✓
- auth.html doLogin pre-login (per CLAUDE.md, niet today's scope)

**Verdict**: Run 2.1 sessionStorage `bblView` wordt opgeschoond bij logout via bestaande `sessionStorage.clear()` — geen leak-risico.

## AUDIT 7 — Pending counter spoof-risico

**Resultaat**: PASS (afhankelijk van RLS)

[company-dashboard.html:764-768](company-dashboard.html#L764):
```js
.from('matches').select('id', { count: 'exact', head: true })
.eq('party_b', user.id).eq('status', 'pending');
```

`user.id` komt van JWT-validated `db.auth.getUser()`. Client-filter `eq('party_b', user.id)` plus RLS = double-defense. **Audit 8 SQL C** moet bevestigen dat matches RLS strict beperkt op party_a/party_b.

## AUDIT 8 — SQL voor Barry in Supabase Console

```sql
-- A. RLS enabled?
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles','student_profiles','company_profiles','school_profiles','matches','buddy_profiles','waitlist')
ORDER BY tablename;

-- B. Policies overview
SELECT tablename, policyname, cmd, permissive, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles','student_profiles','company_profiles','school_profiles','matches','buddy_profiles','waitlist')
ORDER BY tablename, cmd;

-- C. matches: party_a/party_b lock?
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname='public' AND tablename='matches';

-- D. profiles: cross-read check
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname='public' AND tablename='profiles';

-- E. buddy_profiles: post-Run-2 schema
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname='public' AND tablename='buddy_profiles';

-- F. PostgREST schema-cache refresh
NOTIFY pgrst, 'reload schema';
```

**Resultaten (Barry uitgevoerd 5 mei 2026):**

- **Query A**: 7/7 tabellen `rowsecurity = true` (profiles, student_profiles, company_profiles, school_profiles, matches, buddy_profiles, waitlist) ✓
- **Query B**: policies overview consistent — geen `qual = true` (no overly permissive)
- **Query C — matches**: strict policies op `party_a = auth.uid() OR party_b = auth.uid() OR praktijkbegeleider = auth.uid()` ✓
- **Query D — profiles**: UPDATE met role-lock (gebruiker kan eigen role niet wijzigen) ✓
- **Query E — buddy_profiles**: strict op `profile_id = auth.uid()` voor edits; public_read policy alleen voor `active = true` rijen ✓
- **Query F**: `NOTIFY pgrst, 'reload schema'` succesvol — PostgREST schema cache refreshed

**Verdict Audit 8**: PASS

## AUDIT 9 — Hal: AI integrity

1. **Niet-verifieerbaar zonder DB-toegang**: RLS-policies. Audit 8 SQL is daarvoor.
2. **ALTER TABLE RLS-impact**: nieuwe kolommen (anonymous, paused, naam) volgen automatisch tabel-RLS, MAAR: kolom-level grants kunnen nodig zijn als RLS column-specific is. Audit 8 B+E moet bevestigen dat geen overly-permissive policies de nieuwe kolommen openleggen voor andermans queries.
3. **Niet-getest in productie**: pending-counter (company-dashboard). Acceptabel risk per Bedward — count is intrinsiek RLS-protected.

## AUDIT 10 — The Worm: entry-point risks

**Resultaat**: PASS

Welkomstblok-IIFE's bevatten geen `fetch()`, geen `XMLHttpRequest`, geen `.invoke()`. Alleen Supabase JS SDK calls (`db.from`, `db.auth`). 

1 fetch in company-dashboard:2886 → vat-verify Edge Function — pre-existing, buiten today's scope.

---

## Risico-classificatie (final na Audit 8)

| Niveau | Aantal | Items |
|---|---|---|
| KRITIEK (push-blocking) | 0 | — |
| HOOG (fix vóór livetest) | 0 | Audit 8 PASS — geen RLS-gaps |
| MEDIUM (post-livetest) | 0 | Audit 3 try/catch verplaatst naar LAAG |
| LAAG (backlog) | 1 | `profiles_select_related` policy-breedte — defensieve scope-reductie, geen actief lek |

## Beslissing

- [x] **PUSH GOEDGEKEURD** — Audit 1-10 alle PASS of WARNING zonder blocker; RLS server-side defense bevestigd
- [ ] PUSH PROVISIONAL
- [ ] FIX NODIG vóór push
- [ ] FIX NODIG vóór livetest 11 mei

**Sign-off Bedward 5 mei 2026**: GO voor push. Server-side RLS dekt alle welkomstblok-queries; client-side filters zijn defense-in-depth, niet enige verdediging.

## Backlog post-livetest

- Audit 3: try/catch wrapper rond 3 welkomstblok-IIFE's voor structured logging
- Audit 1: SELECT * → kolom-whitelist voor 11 hits in 4 files
- Audit 5: trust_score / trust_grade door escapeHtml halen als verdedigingslaag
- Audit 8 LAAG: `profiles_select_related` policy-breedte beoordelen — scope-reductie waar mogelijk
- Audit 9: schema-migration template met RLS-impact-checklist
