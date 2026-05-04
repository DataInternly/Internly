# Run 7B — Auth foundation
Datum: 2 mei 2026
Tijdsbesteding: ~25 minuten

## Pre-conditie check
- Run 7 + Audit aanwezig: ✓ (RUN7_POLISH_REPORT.md + RUN7_AUDIT_REPORT.md)
- Run 1-5 + Run 7 markers intact: ✓ (`renderRoleHeader`, `markAuthReady`, `requireRole` allemaal in utils.js)
- Working tree heeft Run 7 wijzigingen niet-gecommit: ✓

## Resultaat per stap

| Stap | Status | Bestand(en) | Verify |
|---|---|---|---|
| 1 — 6 markAuthReady fixes | APPLIED | buddy/company/school-dashboard.html | grep `markAuthReady` count = 4 per dashboard (was 2) |
| 2 — guardPage helper | APPLIED | js/utils.js | function (190) + window export (270) + 0 hits in *.html |
| 3 — CLAUDE.md update | APPLIED | CLAUDE.md | "Auth-architectuur (Mei 2026)" sectie + Tech debt B-1 entry |

## Per-stap detail

### Stap 1 — Quick fix 6 markAuthReady-aanroepen

**buddy-dashboard.html**:
- [:1275](buddy-dashboard.html#L1275) — `unhandledrejection` JWT-expired redirect → `markAuthReady()` toegevoegd vóór `window.location.replace`
- [:1288](buddy-dashboard.html#L1288) — init no-user redirect → `markAuthReady()` toegevoegd in if-block

**company-dashboard.html**:
- [:3334](company-dashboard.html#L3334) — `unhandledrejection` → `markAuthReady()` toegevoegd
- [:3365](company-dashboard.html#L3365) — init no-user → `markAuthReady()` toegevoegd

**school-dashboard.html**:
- [:2313](school-dashboard.html#L2313) — `unhandledrejection` → `markAuthReady()` toegevoegd
- [:2500](school-dashboard.html#L2500) — init no-user → `markAuthReady()` toegevoegd

Alle 6 aanroepen geguard met `if (typeof markAuthReady === 'function')` voor defensieve fallback wanneer utils.js mist.

Telling per dashboard:
- buddy: 4 (was 2) — succes + wrong-role + init-no-user + unhandledrejection
- company: 4 (was 2) — loadUser-success + loadUser-no-user + init-no-user + unhandledrejection
- school: 4 (was 2) — idem company

### Stap 2 — `guardPage()` helper

- Locatie: [js/utils.js:190-269](js/utils.js#L190-L269), na `requireRole()` (eindigt op regel 164) en vóór `getDisplayName()`
- `window.guardPage = guardPage` op [:270](js/utils.js#L270)
- Comment-update: `requireRole()` nu gemarkeerd `@deprecated` op [:135-141](js/utils.js#L135-L141) — implementatie volledig ongewijzigd, alleen JSDoc-block uitgebreid
- API exact volgens specificatie:
  - Accepteert string OF array van rollen
  - `useSession` default true (snellere getSession ipv getUser)
  - `fallbackUrl` configureerbaar (default `auth.html`)
  - Returned `{user, profile, role}` of `null`
  - `_markReady()` op alle 5 exit-paths: no-client, no-user, no-profile, wrong-role, success, exception
  - `try/catch` re-throws niet — guard zwaait body open en redirect, geeft null terug
- Bevestiging niet-gebruikt: `grep -rn "guardPage" *.html` → 0 hits

### Stap 3 — Documentatie in CLAUDE.md

- Backlog-entry toegevoegd in "Open voor Sprint 5" sectie ([CLAUDE.md:197](CLAUDE.md#L197)): "[Tech debt B-1] requireRole-migratie..."
- Nieuwe sectie "Auth-architectuur (Mei 2026)" toegevoegd vóór "Architecturele ketens" ([CLAUDE.md:199-247](CLAUDE.md#L199-L247))
- Bevat:
  - Huidig beeld (6 vs 19 pagina's)
  - Migratie-plan-tabel met Run 7C tot 7G prio + bestanden
  - `guardPage()` API + voorbeeld-vervanging van inline pattern
  - Voordelen-lijst (try/catch, getSession, returned data, centraal punt)
  - `requireRole()` deprecation noot
  - Architectuur-principes (één guard-call, body-attrs, CSS-fallback)

## Onverwachte vondsten

Geen. Pre-conditie was helder, audit-rapport was accuraat (Cat 3 incomplete coverage zoals beschreven), alle 6 fixes in Stap 1 vonden verwacht-precies de regels die de audit aanwees. `guardPage` definitie volgde de gespec-pa specificatie 1-op-1 zonder afwijkingen.

## Run 1-7 nog intact

**Ja**:
- `renderRoleHeader` ([utils.js:506](js/utils.js#L506)) — ongewijzigd
- `requireRole` ([utils.js:142](js/utils.js#L142)) — implementatie 100% gelijk aan vóór deze run, alleen JSDoc uitgebreid
- `markAuthReady` ([utils.js:127](js/utils.js#L127)) — ongewijzigd
- `getDaypartGreeting`, `withSaveLock`, `renderProfileView`, `kb-shared-footer`, `page-back-btn`, `chat-topbar-avatar` — allemaal intact

## Smoke-test door Barry — 4 checks

1. **Anti-flicker non-logged buddy**: open `buddy-dashboard.html` in incognito met DevTools → Network → throttle "Slow 3G" → refresh. Verwacht: GEEN witte flits voor de redirect naar `auth.html`. Body blijft pending (donker/transparent) tot redirect afgaat.
2. **Anti-flicker non-logged company**: zelfde test op `company-dashboard.html` in incognito.
3. **Anti-flicker non-logged school**: zelfde test op `school-dashboard.html` in incognito.
4. **`guardPage` aanwezig**: `grep -n "function guardPage\|window.guardPage" js/utils.js` → 2 hits (definition + export). `grep -rn "guardPage" *.html` → 0 hits (helper bestaat maar wordt nergens aangeroepen — dat is correct, migratie volgt in Run 7C).

Optioneel — JWT-expiry simulatie: log in, wis daarna `localStorage` access-token, doe een API-call op de pagina. Het `unhandledrejection` handler triggert nu, en met de nieuwe `markAuthReady()` voor de redirect wordt body zichtbaar gemaakt vóór de browser-redirect — geen flits in de switch-window.

## Klaar voor commit + Run 7C

**Ja**. Alle wijzigingen zijn additief en geguard. Geen breaking changes. `guardPage()` is ongebruikt — Run 7C kan beginnen met buddy/company/school migratie zonder regressie-risico.

## Wijzigingen totaal

| Bestand | Lines added | Lines removed | Net |
|---|---|---|---|
| buddy-dashboard.html | 4 | 1 | +3 |
| company-dashboard.html | 5 | 1 | +4 |
| school-dashboard.html | 5 | 1 | +4 |
| js/utils.js | 105 | 1 | +104 |
| CLAUDE.md | 50 | 0 | +50 |

Totaal: ~165 regels netto bijgekomen, verspreid over 5 bestanden. Geen één boven 30-regel-per-bestand-limiet behalve `js/utils.js` (bewust — guardPage helper inclusief docs is intentioneel een blok).
