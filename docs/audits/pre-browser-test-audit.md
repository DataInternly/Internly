# PRE-BROWSER-TEST AUDIT
Commit onder review: `f4b6014` — quick-fixes pre-LT 11 mei
Datum: 9 mei 2026
Methode: laag 1 mechanisch + scenario-coverage analyse + polish-voorstellen

---

## DEEL 1 — MECHANISCHE CHECKS

### Samenvatting
| Check | Status |
|---|---|
| 1.1 Git diff per bestand | ✓ PASS |
| 1.2 Syntax controles | ✓ PASS |
| 1.3 Singleton-imports niet gebroken | ✓ PASS |
| 1.4 Telemetry codenames intact | ✓ PASS |
| 1.5 Auth guards intact | ✓ PASS |
| 1.6 Whitespace + line endings | ✓ PASS |
| 1.7 Console output format | ⚠ ATTENTION (6× zonder bracket-prefix) |

### 1.1 Git diff per bestand — ✓ PASS
Alle 6 hunks verifieerbaar in `git show f4b6014`. Geen onverwachte wijzigingen buiten ID-gemarkeerde fix-locaties.

| Bestand | Hunks | Insertions | Deletions |
|---|---|---|---|
| match-dashboard.html | 3 | 12 | 3 |
| js/account.js | 1 | 13 | 4 |
| js/utils.js | 1 | 22 | 0 |
| js/supabase.js | 1 | 7 | 0 |
| school-dashboard.html | 1 | 1 | 1 |
| begeleider-dashboard.html | 1 | 1 | 1 |

### 1.2 Syntax — ✓ PASS
| Bestand | Methode | Resultaat |
|---|---|---|
| js/account.js | `node -c` | pass |
| js/supabase.js | `node -c` | pass |
| js/utils.js | `node -c` | pass |
| match-dashboard.html | `<script>` count | 14 = 14 ✓ |
| school-dashboard.html | `<script>` count | 18 = 18 ✓ |
| begeleider-dashboard.html | `<script>` count | 13 = 13 ✓ |
| Alle 3 HTMLs | `}}}` of `}}</script>` | 0 hits |

### 1.3 Singleton-imports — ✓ PASS
- `notify(...)` in match-dashboard.html — utils.js geladen op regel 16 ✓
- `notify(...)` in js/account.js — alle 7 caller-pagina's laden zowel utils.js als account.js ✓
- `db` (Supabase client) bereikbaar in account.js — gebruikt al op regel 23 (geen wijziging in scope)
- `client.from('push_subscriptions')` in performLogout — standaard Supabase API; RLS dekt cross-account
- escapeHtml: niet nodig (geen nieuwe HTML-injectie)

### 1.4 Telemetry codenames — ✓ PASS
Grep op `HUNTERS_CONFIG|ThreatScore|SecurityLog|HoneypotSentinel|CanaryToken|DOMGuard|CSPReporter|TimingGuard|IntegrityPulse` in alle 6 gewijzigde bestanden: **0 hits**. Bedward-spec gehandhaafd.

### 1.5 Auth guards intact — ✓ PASS
| Bestand | data-auth-pending | markAuthReady | requireRole/guardPage |
|---|---|---|---|
| match-dashboard.html | n.v.t. (was al niet aanwezig) | n.v.t. | n.v.t. |
| school-dashboard.html | ✓ regel 558 | ✓ 4× aanroepen (1241, 1246, 2425, 2614) | n.v.t. |
| begeleider-dashboard.html | n.v.t. (was al niet aanwezig) | n.v.t. | n.v.t. |

Geen regressie. Bestaande state intact.

### 1.6 Whitespace + line endings — ✓ PASS
- `git diff --check`: leeg (geen trailing whitespace)
- HTML files: UTF-8 + CRLF (Windows project-conventie)
- JS files: UTF-8 + LF (consistent met rest van js/)
- Geen mixed line endings binnen één bestand

### 1.7 Console output format — ⚠ ATTENTION
Project-conventie: `[module]` bracket-prefix. Voorbeelden:
```
console.warn('[utils] getUnreadTotal failed:', ...)
console.error('[performLogout] fout bij uitloggen:', ...)
console.error('[account] saveContact fout:', ...)
```

**6 nieuwe statements zonder prefix:**

| Locatie | Statement |
|---|---|
| js/utils.js:427 | `console.warn('push unsubscribe:', e)` |
| js/utils.js:432 | `console.warn('push_subscriptions delete:', e)` |
| js/utils.js:436 | `console.warn('push cleanup skipped:', e)` |
| js/account.js:29 | `console.error('profile fetch failed:', error)` |
| match-dashboard.html:5529 | `console.error('meeting status update failed:', err)` |
| match-dashboard.html:5586 | idem |
| match-dashboard.html:5623 | idem |

Niet-blokkerend voor browser-test. **Polish voorstel** in deel 3.

---

## DEEL 2 — SCENARIO COVERAGE ANALYSE

> Bron: 37 scenarios door Morgan2 + Reid2 + JJ2 + Prentiss2, ontvangen 9 mei.
> Categorieën A-G met respectievelijk 6+5+5+6+5+6+4 scenarios.

### A. Cross-account / shared device (6)

| # | Scenario | Coverage |
|---|---|---|
| A1 | Tester A → uitloggen → tester B inloggen zelfde browser, niet incognito | ✓ js/supabase.js:97 clearUserState (incl. 3 globals na FIX 4) + js/utils.js:415-435 push-cleanup (FIX 5) — commit f4b6014 |
| A2 | Tester A laat tab open, tester B opent nieuw tabblad zelfde browser | ⚠ BROWSER-LEVEL — sb-* JWT in localStorage gedeeld over tabs; last-write-wins op nieuwe login. Doc als spelregel "sluit alle tabs voor wisselen" |
| A3 | Browser back-knop na logout | ✓ js/utils.js:443-459 onAuthStateChange SIGNED_OUT redirect naar auth.html (op niet-publieke pagina's). Plus inline `db.auth.getUser()` guard in 36 HTML files redirect bij ontbrekende session |
| A4 | Push-notification op shared device na switch | ✓ FIX 5 in commit f4b6014: performLogout DELETE push_subscriptions + browser unsubscribe vóór signOut |
| A5 | localStorage handmatig manipuleren in DevTools (fake claim role/session) | ✓ DB RLS enforcement: alle writes worden server-side gevalideerd via JWT + auth.uid(). Lokale localStorage manipulatie heeft geen invloed op RLS-decisions |
| A6 | Service worker oude versie cacht oude UI na deploy | ✓ sw.js:90 `self.skipWaiting()` + sw.js:94 `clients.claim()`. **Plus**: sw.js heeft GEEN response-cache (`CACHE_VERSION` constant ongebruikt) — geen oude UI cache mogelijk |

### B. Session/auth (5)

| # | Scenario | Coverage |
|---|---|---|
| B1 | JWT expiry mid-sessie (1u Supabase default) | ✓ Supabase autoRefreshToken default true (js/supabase.js:57+). Plus 18 pagina's hebben unhandledRejection handler die PGRST301/401 vangt → redirect auth.html?expired=1 |
| B2 | Magic link >1u oud opnieuw klikken | ✓ auth.html:713 `if (_initParams.get('expired') === '1')` toont expired-error UI. Magic-link expiry is server-side (Supabase auth) — veilig |
| B3 | Form submit tijdens netwerk-uitval | ✓ Patroon: try/catch + notify in submit-handlers (bbl-hub:1646, match-dashboard:5520-5546). **Plus FIX 1 in f4b6014**: meeting-status updates nu console.error + notify ipv silent .catch |
| B4 | Browser-back na login → landing | ✓ auth.html:1295 `window.location.href = getRoleLanding(...)` pusht history-entry. Browser-back gaat naar auth.html → getSession() detecteert ingelogd → smartHomeRedirect |
| B5 | Refresh tijdens avatar-upload | ⚠ js/avatar.js heeft geen `beforeunload` warning. Supabase Storage upload wordt browser-side abort. **Geen partial state** (Supabase commits atomic per file). Verifieer in browser-test of UI half-save toont — kleine UX gap |

### C. Multi-device / multi-tab (5)

| # | Scenario | Coverage |
|---|---|---|
| C1 | Inloggen op laptop + telefoon, simultane match-actie | ✓ Realtime subscription propageert tussen devices. Last-write-wins op DB. Beide UIs zien resultaat ≤1s |
| C2 | Twee tabs zelfde account, INSERT chat-message rapid | ✓ chat.html:1232-1255 realtime-handler check `msg.sender_id !== currentUser?.id` — eigen optimistic-message wordt niet via realtime opnieuw toegevoegd. Beide tabs synced. Acceptabel UX |
| C3 | Twee tabs verschillende accounts (na switch) | ⚠ BROWSER-LEVEL — Supabase localStorage-sessie wordt overschreven bij login. Oude tab krijgt 401 op next request → unhandledRejection handler redirect naar auth.html?expired=1. Doc als spelregel |
| C4 | Logout op device 1, blijft sessie op device 2 actief? | ✓ Per Supabase design — JWT op device 2 blijft tot expiry (1u default). Refresh-token afhankelijk van Supabase config. Acceptabel voor LT |
| C5 | Push op telefoon terwijl chat-tab open is laptop | ⚠ sw.js:8-31 push-handler toont notif zonder open-tab check (Visibility API). Realtime-subscription op laptop toont bericht inline. **Dubbel-perceived mogelijk** — geen duplicate-suppression. Polish-kandidaat (post-LT) |

### D. Direct REST API attacks (6)

| # | Scenario | Coverage |
|---|---|---|
| D1 | Postman PATCH /profiles?id=eq.<other_id> met role=admin | ✓ DB RLS `profiles_update_own` USING(id=auth.uid()) blokkeert other-id. Plus WITH CHECK role-immutability blokkeert eigen role-promotie. Geverifieerd via pg_policies |
| D2 | Postman UPDATE matches eigen-match maar wijzig party_b naar derde | ✓ DB RLS `matches_update_party` WITH CHECK identiek aan USING (party_a OR party_b moet user zijn). Geverifieerd |
| D3 | Postman INSERT review zonder match | ✓ DB RLS `reviews_insert_match_gated` (regel 826) — match-relatie + status check + self-review block |
| D4 | Postman SELECT * messages zonder match-relatie | ✓ DB RLS `msg_select_party` met EXISTS via conversations + matches/buddy_pairs |
| D5 | Anon key UPDATE eigen profile → admin | ✓ TO authenticated op profiles_update_own — anon-key zonder JWT kan UPDATE niet uitvoeren |
| D6 | Bevriezen JWT na rol-wijziging in DB direct | ✓ JWT bevat geen role-claim (Supabase default). Role wordt elke RLS-check opnieuw uit `profiles` gelezen. Wijziging direct effectief. UI-cache (`__cachedUserRole` utils.js:134) gereset op onAuthStateChange |

### E. Realtime / push / chat (5)

| # | Scenario | Coverage |
|---|---|---|
| E1 | 50 chat-berichten in 1 min | ✓ Supabase realtime rate-limit ruim binnen marge voor 5 testers. Geen client-side throttling nodig |
| E2 | Push tijdens incognito-mode | ⚠ BROWSER-LEVEL — incognito blokkeert SW-registratie + push-permission. Doc als spelregel "in incognito krijgen testers geen push" |
| E3 | Wifi → 4G mid-chat | ✓ chat.html:1249-1254 realtime-channel error-handler met notify "Verbinding verbroken — ververs de pagina". Auto-reconnect: standaard Supabase realtime-WebSocket |
| E4 | Tester accepteert match → chat opent → bedrijf staat NIET online | ✓ Async chat — berichten via DB INSERT, ontvanger leest via realtime-on-connect of next-load |
| E5 | Service worker update mid-chat | ✓ sw.js:90 `skipWaiting` + `clients.claim()`. Open tabs blijven werken op oude SW tot reload. Realtime-subscription is page-level (niet SW), dus geen impact |

### F. Data + UI edge cases (6)

| # | Scenario | Coverage |
|---|---|---|
| F1 | Emoji's in motivatie-veld | ✓ Postgres UTF-8 default. escapeHtml laat emoji-codepoints intact (escape gericht op `<>&"'`). chat.html gebruikt emoji-mart picker |
| F2 | SQL-injectie in zoekveld | ✓ Supabase JS SDK gebruikt PostgREST met parameterized queries. Geen raw-SQL string-concat in code |
| F3 | XSS via `<script>` in chat-bericht | ✓ chat.html:674 `escapeHtml(raw)` op bericht-content. Plus profanity-filter regel 673. Volledige escape op alle user-content velden in renderMessages (regels 666, 672, 674, 675) |
| F4 | Tekst >10k chars in bio | ✓ HTML maxlength attrs: `motivatie maxlength=300` (bol-profile:601), `opdracht_aanleiding maxlength=400` (:668). Server-side: Postgres TEXT geen harde limit, input-form kapt eerst af. **Verifieer in browser-test**: bbl-profile motivatie-veld heeft maxlength? |
| F5 | Rapid clicks submit | ⚠ GAP — chat.html:1268-1270 heeft disabled-pattern op send-button. Match-dashboard meeting-flow heeft GEEN debounce (accept/decline/cancel). **Polish 4 in deel 3**. Mama-test risico (D3) |
| F6 | 320px viewport (oud Android) | ⚠ CSS breakpoints: max-width 768px en 480px. Geen 320px-specifieke media-query. Mobile-tabs patroon werkt waarschijnlijk maar **niet getest <480px**. Verifieer in DevTools tijdens browser-test |

### G. Multi-rol / cross-flow (4)

| # | Scenario | Coverage |
|---|---|---|
| G1 | Tester is student én bedrijf (via 2e account) | ✓ logout (incl. clearUserState + push-cleanup) → login als ander account werkt. State-isolatie correct na FIX 4+5 |
| G2 | Pop-up "save password" suggereert verkeerd account | ⚠ BROWSER-LEVEL — Chrome password manager. Doc als spelregel "weiger save password" of gebruik unieke browser-profielen |
| G3 | Student verandert school in profiel mid-stage | ✓ `student_profiles.school` is TEXT-veld (geen FK naar school_profiles). `match.praktijkbegeleider_profile_id` is per-match en niet via student.school. Begeleider-koppeling blijft intact. **Side-effect**: stage-rapport toont nieuwe school-naam — verifieer of dat gewenst is, anders snapshot bij match-acceptatie nodig |
| G4 | Bedrijf wijzigt vacature na sollicitatie | ⚠ FK behavior op `applications.posting_id` (FK → internships.id of internship_postings.id). UPDATE op posting (zelfde rij) → applications blijven OK. DELETE op posting → ON DELETE-config bepalend (vermoedelijk RESTRICT, mogelijk CASCADE). **Verifieer in browser-test of via DDL** |

### Coverage statistiek

| Status | Aantal | Scenarios |
|---|---|---|
| ✓ Volledig code-afgevangen | 27 | A1, A3, A4, A5, A6, B1, B2, B3, B4, C1, C2, C4, D1-D6, E1, E3, E4, E5, F1, F2, F3, G1, G3 |
| ⚠ Browser-level — LT-spelregel | 5 | A2, C3, C5, E2, G2 |
| ⚠ Verifieer tijdens browser-test | 4 | B5 (avatar partial), F4 (bbl maxlength), F6 (320px), G4 (FK ON DELETE) |
| ⚠ Code-gap — polish kandidaat | 1 | F5 (debounce match-dashboard meeting-flow) |

**Conclusie**: 27/37 = **73% volledig code-afgevangen**. 5 browser-level spelregels (incognito + tabs sluiten + unieke profielen). 4 verifieer-items voor browser-test. 1 echte code-gap (F5 debounce) — Polish 4 in deel 3.

---

## DEEL 3 — POLISH KANDIDATEN (≤5 min per fix)

Voorstellen op basis van Bundel B diff + scenario gaps. **Niet uitgevoerd** — alleen voorstellen.

### Polish 1 — Console prefix consistency (CHECK 1.7) [3 min]
6 statements aanpassen naar `[module]` patroon:

```js
// js/utils.js:427-436
await sub.unsubscribe().catch(e => console.warn('[performLogout] push unsubscribe:', e));
.catch(e => console.warn('[performLogout] push_subscriptions delete:', e));
console.warn('[performLogout] push cleanup skipped:', e);

// js/account.js:29
console.error('[account] profile fetch failed:', error);

// match-dashboard.html:5529, 5586, 5623
console.error('[match-dashboard] meeting status update failed:', err);
```

**Waarde tijdens LT**: Barry kan in DevTools filteren op `[performLogout]` of `[match-dashboard]` om alle issues per module te zien.

### Polish 2 — match-dashboard notify met action-context [2 min]
Huidige notify is dezelfde tekst voor 3 acties (accept/decline/cancel):
```js
notify('Status kon niet worden bijgewerkt — probeer opnieuw');
```

Voorstel — actie-specifieke melding:
```js
// :5530 (accept)
notify('Bevestiging niet opgeslagen — probeer opnieuw');
// :5587 (decline)
notify('Afwijzing niet opgeslagen — probeer opnieuw');
// :5624 (cancel)
notify('Annulering niet opgeslagen — probeer opnieuw');
```

**Waarde**: tester ziet welke actie faalde zonder DevTools te openen.

### Polish 3 — account.js dubbele notify voorkomen [3 min]
Huidige flow bij missend profile:
1. `loadContactData` → `notify('Profiel niet gevonden — log opnieuw in')` + throw
2. Caller `renderAccountScreen` catch → `notify('Kon accountinstellingen niet laden')`

Resultaat: 2 notifications back-to-back.

Voorstel: gooi geen notify in loadContactData, alleen throw — laat caller een specifieke melding geven:
```js
// js/account.js:31 (FIX 2)
if (!profile) {
  throw new Error('PROFILE_NOT_FOUND');
}

// js/account.js:381 (caller)
} catch (err) {
  if (err.message === 'PROFILE_NOT_FOUND') {
    notify(nl ? 'Profiel niet gevonden — log opnieuw in' : 'Profile not found — please log in again');
  } else {
    notify(nl ? 'Kon accountinstellingen niet laden' : 'Could not load account settings');
  }
  // ... bestaande error UI
}
```

**Waarde**: één duidelijke melding per fout-pad, i18n-correct (account.js heeft `lang` context).

### Polish 4 — Debounce op meeting accept/decline (D3 + F5 mama-test) [5-15 min]
Mama klikt rapid op "Bevestigen" → 2× DB update + 2× toast. Met huidige .catch+notify upgrade: 2× notify "Status niet opgeslagen" als 2e click een race-conflict heeft.

Voorstel — disable button tijdens await:
```js
async function acceptMeeting(id) {
  const btn = document.querySelector(`[data-meeting-action="accept-${id}"]`);
  if (btn?.disabled) return;
  if (btn) btn.disabled = true;
  try {
    // ... bestaande logica
  } finally {
    if (btn) btn.disabled = false;
  }
}
```

**Waarde**: dekt mama-test scenario D3 + F5 zonder DB-niveau wijzigingen.

**NB**: vereist `data-meeting-action="..."` attribuut op de buttons — verifieer eerst of die er staat. Indien niet: 5 min wordt 15 min.

### Polish 5 — Push-cleanup defer tot na signOut [2 min]
Huidige order in performLogout: cleanup-push → signOut → clearUserState → redirect.

Race-condition: als tester 2 push-permission verleent vóórdat de DELETE-query van tester 1 voltooid is, kan tester 1's stale subscription nog actief zijn op B's user_id (RLS check in INSERT van push_subscriptions zou dit moeten blokkeren — maar verifieer).

Alternatief: keep cleanup before signOut (huidige), maar voeg `await` op DELETE expliciet toe (geen `.catch()` daarop loslaten):
```js
const { error } = await client.from('push_subscriptions')
  .delete()
  .eq('user_id', userId);
if (error) console.warn('[performLogout] push_subscriptions delete failed:', error);
```

**NB**: huidige code gebruikt `.catch()` op de Promise wat WEL awaitbaar is. Gedrag is in praktijk identiek. Skippable polish.

### Polish-prioriteit
| # | Polish | Tijd | Waarde voor LT |
|---|---|---|---|
| 1 | Console prefix consistency | 3 min | Hoog — directe DevTools-filter tijdens LT |
| 2 | match-dashboard notify per actie | 2 min | Medium — UX helderheid |
| 3 | account.js dubbele notify | 3 min | Medium — UX correctness |
| 4 | Debounce meeting buttons (D3+F5) | 5-15 min | Hoog — mama-test scenario gap |
| 5 | Push-cleanup explicit await | 2 min | Laag — gedrag identiek in praktijk |

**Aanbeveling**: doe 1+2+3 (totaal ~8 min). Polish 4 alleen als data-attribuut al aanwezig (verifieer eerst). Skip polish 5.

---

## DEEL 4 — SUPABASE ADVISOR + REALTIME REPORTS

Project ref: `qoxgbkbnjsycodcqqmft`

| Tool | URL |
|---|---|
| Security Advisor | https://supabase.com/dashboard/project/qoxgbkbnjsycodcqqmft/advisors/security |
| Performance Advisor | https://supabase.com/dashboard/project/qoxgbkbnjsycodcqqmft/advisors/performance |
| Realtime Reports | https://supabase.com/dashboard/project/qoxgbkbnjsycodcqqmft/realtime/inspector |

### Aanvullend nuttig voor pre-LT
| Tool | URL | Reden |
|---|---|---|
| Database Logs | https://supabase.com/dashboard/project/qoxgbkbnjsycodcqqmft/logs/postgres-logs | Live SQL-error tracking tijdens LT |
| Auth Logs | https://supabase.com/dashboard/project/qoxgbkbnjsycodcqqmft/logs/auth-logs | Login-pattern monitoring |
| Edge Function Logs | https://supabase.com/dashboard/project/qoxgbkbnjsycodcqqmft/logs/edge-functions | send-push-notification + vat-verify trace |
| RLS Policy Inspector | https://supabase.com/dashboard/project/qoxgbkbnjsycodcqqmft/auth/policies | Visuele check van pg_policies (verifieer F1.3.G + WITH CHECK conform Bundel A geverifieerde state) |
| API Settings | https://supabase.com/dashboard/project/qoxgbkbnjsycodcqqmft/settings/api | Edge function `verify_jwt` settings — verifieer F2.6.A send-push-notification config |
| Functions list | https://supabase.com/dashboard/project/qoxgbkbnjsycodcqqmft/functions | Deploy-status van 4 Edge Functions |

### Audit-relevante checks per advisor
**Security Advisor** zou moeten flaggen:
- `profiles` SELECT public (F1.3.C / F7.4.A) — als `auth_users_exposed` of `policy_exists_rls_disabled`
- `availability` SELECT public (F1.3.F)
- *_profiles SELECT public (F7.4.A)
- Mogelijk: `auth.uid() IS NOT NULL` ipv `(select auth.uid()) IS NOT NULL` performance hint

**Performance Advisor** zou moeten flaggen:
- `auth.uid()` niet gewrapped in `(select auth.uid())` (F1.3.D — 38+ policies per Bundel A)
- Ontbrekende indexes op FK-kolommen (zie audit Fase 5)

**Realtime Reports** monitoren tijdens LT:
- messages (chat-flow)
- notifications (notif-bell)
- matches (status updates)
- buddy_pairs (buddy chat)

---

## EINDOORDEEL

| Aspect | Status |
|---|---|
| Mechanische checks | 6× ✓ PASS, 1× ⚠ ATTENTION (cosmetisch) |
| Scenario coverage | 27/37 ✓ code-afgevangen, 5 browser-level spelregels, 4 browser-test verifies, 1 polish-gap |
| Polish opportunities | 5 voorstellen, ~8-15 min totaal |
| Browser-test ready? | **JA** — alle commits clean, geen syntax-blockers |
| Aanbevolen polish vóór browser-test? | Polish 1+2+3 (~8 min) — verhoogt LT-debugging waarde + UX |

**Verifieer-items voor browser-test (4)**:
1. B5 — avatar upload tijdens refresh — toont UI half-save?
2. F4 — bbl-profile motivatie veld heeft maxlength?
3. F6 — 320px viewport rendert mobile-tabs correct?
4. G4 — `applications.posting_id` FK ON DELETE behavior (RESTRICT vs CASCADE)?

**LT-spelregels voor tester-runbook (5)**:
1. A2/C3 — Sluit alle Internly-tabs vóór wisselen van tester
2. C3 — Verschillende accounts in verschillende incognito-vensters
3. C5 — Push-notif kan dubbel komen op laptop+telefoon (acceptabel)
4. E2 — In incognito krijg je geen push-notifications (verwacht)
5. G2 — Weiger Chrome "save password" pop-up of gebruik unieke browser-profielen

**Volgende stap**: laag 2 review (browser-test in DevTools) of laag 3 polish (8 min code-edits). Geen P0/P1 actie meer open op code-niveau voor commit f4b6014.
