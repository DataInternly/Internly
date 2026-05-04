# INTERNLY SECURITY AUDIT — 1 mei 2026
**Auditor:** Claude (read-only)
**Scope:** volledige codebase na dag-1 van sprint-week
**Excludes:** BACKUP/, _revamp_2026-04-29/

---

## EXECUTIVE SUMMARY

Total checks: **53** verdeeld over 10 reeksen
- **KRITIEK: 4**
- **HOOG: 8**
- **MIDDEL: 11**
- **LAAG/INFO: 8**
- **PASS: 22**

**Deployment blocker: JA.** 4 kritieke bevindingen blokkeren go-live: role-escalation via `profiles_update_own`, ontbrekende trust_score RESTRICTIVE policies, ontbrekende self-verify guard, en mollie-webhook zonder signature-validatie.

---

## BEVINDINGEN PER REEKS

### REEKS 1 — CREDENTIALS

| Check | File:Line | Severity | Finding |
|---|---|---|---|
| C1 | [about.html:957](about.html#L957), [:995](about.html#L995), [:1046](about.html#L1046) | **HOOG** | Anon key 3× hardcoded inline (Bedward P2 schending) |
| C1 | [index.html:1963](index.html#L1963), [:2034](index.html#L2034) | **HOOG** | Anon key 2× hardcoded in waitlist fetch headers |
| C1 | [js/supabase.js:7](js/supabase.js#L7) | INFO | Anon key (legitiem als single source of truth) |
| C1 | service_role check | PASS | Geen `service_role` keyword in HTML/frontend JS |
| C2.A | [js/supabase.js:6-7](js/supabase.js#L6) | INFO | Hardcoded SUPABASE_URL + SUPABASE_ANON_KEY (publiek per design) |
| C2.B | [js/supabase.js:10](js/supabase.js#L10) | INFO | `window.__SUPABASE_ANON_KEY` exposed (gewenst voor telemetry.js fallback) |
| C2.C | service_role | PASS | NIET gerefereerd in supabase.js |
| C2.D | window.__SUPABASE_ANON_KEY | INFO | Wel exposed, gebruikt door [internly-worldwide.html:1664](internly-worldwide.html#L1664) als fallback |
| C3.A | [supabase/functions/vat-verify/index.ts:23-24](supabase/functions/vat-verify/index.ts#L23) | PASS | `Deno.env.get('SUPABASE_URL')` + `SUPABASE_SERVICE_ROLE_KEY` correct |
| C3.B | vat-verify hardcoded | PASS | Geen hardcoded keys |
| C3.C | service_role exposure | PASS | Service-role key blijft server-side, geen response-leak |
| C4 | [.gitignore](.gitignore) | **MIDDEL** | Mist `.env`, `.env.local`, `*.key`, `secrets/`, `supabase/.branches`, `supabase/.temp` |

### REEKS 2 — RLS POLICIES

| Check | Table/Policy | Severity | Finding |
|---|---|---|---|
| R1 | profiles · `profiles_select_all USING(true)` | INFO | Intentioneel publiek (namen+rollen voor matching) |
| R1 | student_profiles · `sp_select_all USING(true)` | **MIDDEL** | Alle authenticated users kunnen ALLE student-profielen lezen incl. motivatie/postcode/skills. Per design (Trust Score), maar AVG-vraag |
| R1 | company_profiles · `cp_select_all USING(true)` | INFO | Trust Score requires public read |
| R1 | school_profiles · `school_p_select_all USING(true)` | INFO | Public read voor matching |
| R1 | internships · `internships_select_all USING(true)` | INFO | Public browse |
| R1 | availability · `avail_select_all USING(true)` | INFO | Calendar.js leest andermans slots — by design |
| R1 | reviews · `reviews_update_flag USING(true)` op [:861-862](internly_migration.sql#L861) | **HOOG** | Iedereen kan elke review flaggen. Spam vector tegen Trust Score |
| R1 | company_doorstroom · `cdoor_select_all USING(true)` | INFO | Aggregaat-data, intentioneel |
| R2 | waitlist · `wl_insert_public WITH CHECK(true)` | INFO | Public signup endpoint, by design |
| R2 | matches · `matches_insert_auth WITH CHECK(auth.uid() IS NOT NULL)` | **MIDDEL** | Elke ingelogde user kan matches inserten — applicatie-laag gates dit, maar geen DB-borging |
| R2 | conversations · `conv_insert_auth WITH CHECK(auth.uid() IS NOT NULL)` | MIDDEL | Idem |
| R2 | buddy_pairs · `bp_insert_auth WITH CHECK(auth.uid() IS NOT NULL)` | MIDDEL | Idem |
| R2 | notifications · `notif_insert_auth WITH CHECK(auth.uid() IS NOT NULL)` | INFO | Mitigatie: `createNotification` gebruikt RPC `create_notification` SECURITY DEFINER |
| R3 | cp_no_trust_score_write / ip_no_trust_score_write | **KRITIEK** | **Beide RESTRICTIVE policies BESTAAN NIET** in [internly_migration.sql](internly_migration.sql). Genoemd in FIX_SESSION als aanbeveling, niet uitgevoerd. Company kan trust_score=100 zelf zetten via `UPDATE company_profiles SET trust_score=99 WHERE profile_id=auth.uid()` (cp_update_own toelaat dit) |
| R4 | cp_no_self_verify | **KRITIEK** | RESTRICTIVE policy BESTAAT NIET. Company kan zelf `UPDATE company_profiles SET verification_status='verified' WHERE profile_id=auth.uid()` doen — RLS blokkeert niet |
| R5 | profiles role escalation | **KRITIEK** | `profiles_update_own USING(id = auth.uid())` heeft GEEN kolom-restrictie. Een student kan via DevTools `UPDATE profiles SET role='admin' WHERE id=auth.uid()` doen. **MITS** de CHECK constraint `role IN (...)` 'admin' includeert in productie. Migration op [:20](internly_migration.sql#L20) staat alleen `student/bedrijf/school/buddy` toe — maar gepensioneerd/begeleider/admin worden in praktijk gebruikt, dus de CHECK is in productie waarschijnlijk uitgebreid. **Verifieer in productie** |
| R6 | admin policies | INFO | Admin-checks gaan via email='hallo@internly.pro' op reviews/waitlist — gegrond in WHERE-clause. Geen policy laat 'admin' breed mutaties doen op andere tabellen |
| R7 | Missing RLS | PASS | Alle 28 tabellen in migration hebben RLS enabled (regels 507-533, 814, 1106) |
| R7 | Schema drift | **HOOG** | `subscriptions`, `payments`, `swipes`, `verification_log`, `learning_agreements`, `vestigingen` worden door code gequeried maar **bestaan NIET in [internly_migration.sql](internly_migration.sql)**. Hun RLS-status onverifieerbaar uit version control. Productie-only schema |
| R8 | breq_insert_own | PASS | `WITH CHECK (requester_id = auth.uid())` blokkeert impersonation. User A kan geen request maken namens user B |

### REEKS 3 — XSS EN INPUT

| Check | File:Line | Severity | Finding |
|---|---|---|---|
| X1 | [js/utils.js:266-274](js/utils.js#L266) | PASS | escapeHtml correct: escapes `& < > " '` |
| X1 | admin.html loadVerificaties | PASS | Alle `${c.X}` interpolaties via escapeHtml |
| X1 | [admin.html:862](admin.html#L862) | **HOOG** | `onclick="loadVerifyDoc('${c.verification_doc}')"` — verification_doc komt uit Storage path met `file.name` deel. file.name kan `'` bevatten (XSS via uploaded filename). Signed-URL fetch zelf is veilig, maar de inline-onclick is kwetsbaar |
| X1 | school-dashboard renderStudentenRows | PASS | escapeHtml op naam/opleiding/bedrijf |
| X1 | match-dashboard.html | PASS | escapeHtml op match.student.name etc. |
| X1 | chat.html appendMessage | PASS | content via escapeHtml, daarna gecontroleerde `<span>` injectie voor 'bobba' |
| X1 | buddy-dashboard.html renderRequests | PASS | escapeHtml op sender naam + message |
| X1 | js/buddy.js renderBuddySeekerCard | PASS | escapeHtml op naam, opleiding, school, motivatie, skills |
| X2 | eval / new Function / document.write | PASS | Zero hits in productie code |
| X2 | setTimeout met string | PASS | Geen string-form setTimeout/setInterval |
| X3 | maxlength check | PASS | Alle textareas geverifieerd met maxlength (motivatie 300, beschrijving 2000, vacature 2000) |

### REEKS 4 — AUTH EN AUTORISATIE

| File | Role guard | Status |
|---|---|---|
| [student-profile.html](student-profile.html) | requireRole('student') | PASS |
| [bol-profile.html](bol-profile.html) | requireRole('student') + bbl_mode redirect | PASS |
| [bbl-profile.html](bbl-profile.html) | requireRole('student') + bbl_mode check | PASS |
| [bbl-dashboard.html](bbl-dashboard.html) | role guard via profiles + bbl_mode (Bundel A 30 apr) | PASS |
| [bbl-hub.html](bbl-hub.html) | role guard via profiles + bbl_mode (Bundel A 30 apr) | PASS |
| [company-dashboard.html](company-dashboard.html) | server-side role check | PASS |
| [company-discover.html](company-discover.html) | requireRole('bedrijf') + plan check | PASS |
| [school-dashboard.html](school-dashboard.html) | requireRole('school') | PASS |
| [begeleider-dashboard.html](begeleider-dashboard.html) | requireRole('begeleider') | PASS |
| [buddy-dashboard.html](buddy-dashboard.html) | role guard via profiles | PASS |
| [match-dashboard.html](match-dashboard.html) | server-side role + party check | PASS |
| [admin.html:1029-1037](admin.html#L1029) | server-side `prof.role !== 'admin'` redirect | PASS |
| [review-form.html](review-form.html) | requireRole('student') | PASS |
| [chat.html](chat.html) | requireRole('student','bedrijf','school') | PASS |
| [mijn-sollicitaties.html](mijn-sollicitaties.html) | requireRole('student') | PASS |
| [mijn-berichten.html](mijn-berichten.html) | requireRole | PASS |
| [vacature-detail.html](vacature-detail.html) | publiek (auth-banner als niet ingelogd) | PASS (intentioneel) |
| stage-hub.html | n.v.t. | PASS — bestaat niet meer (vervangen door match-dashboard) |
| A2 admin auth | server-side DB role check via profiles tabel | PASS |
| A3 mass assignment | Alle 4 saveProfile/saveProfiel functies gebruiken explicit column whitelist | PASS |
| A3 buddy.js saveBuddyProfile | [js/buddy.js:735-743](js/buddy.js#L735) — uses `...formData` spread | **MIDDEL** | `formData` komt uit `collectBuddyProfileData()` die ook expliciete keys bouwt — geen mass-assignment risk in praktijk, maar pattern is risicovoller dan whitelist. Documenteer of refactor |
| A4 logout | performLogout in [js/utils.js:165](js/utils.js#L165) | PASS — clear sessionStorage + db.auth.signOut |
| A4 logout localStorage | [js/utils.js](js/utils.js) | **MIDDEL** | `performLogout` clears alleen `sessionStorage`, niet `localStorage`. BBL-reflecties + chat-drafts blijven na logout |

### REEKS 5 — DATA LEAKAGE

| Check | File:Line | Severity | Finding |
|---|---|---|---|
| D1 | [bbl-profile.html:667-668](bbl-profile.html#L667) | **MIDDEL** | `student_profiles SELECT *` — Bedward P1 violation. Eigen profiel maar alle kolommen worden geretourneerd |
| D1 | [bbl-hub.html:1398-1399](bbl-hub.html#L1398), [:1632-1633](bbl-hub.html#L1632) | LAAG | `meetings SELECT *` — geen PII maar Bedward P1 |
| D1 | [chat.html:782-783](chat.html#L782), [:805](chat.html#L805) | LAAG | `meetings SELECT *` — own conversation only |
| D1 | [company-dashboard.html:1302-1303](company-dashboard.html#L1302) | LAAG | `notifications SELECT *` — own notifications |
| D1 | [company-dashboard.html:1589-1590](company-dashboard.html#L1589) | LAAG | `internship_postings SELECT *` — own postings |
| D1 | [company-dashboard.html:3436-3437](company-dashboard.html#L3436) | MIDDEL | `company_profiles SELECT *` — own profile, but selecting * grabs trust_score etc. |
| D1 | admin.html count queries | PASS | `SELECT * { count: 'exact', head: true }` — alleen counts, geen data |
| D2 | console.log PII grep | PASS | Geen `console.log(user)`/`console.log(profile)` patronen gevonden |
| D3 | [admin.html:902-906](admin.html#L902) loadVerifyDoc | PASS | Gebruikt `createSignedUrl(path, 3600)` — 1u expiry, geen raw path |
| D3 | [company-dashboard.html:2856-2862](company-dashboard.html#L2856) | PASS | Storage upload met userId-prefixed path; bucket vermoedelijk private (RLS storage policy te verifiëren) |
| D4 | createNotification | PASS | RPC `create_notification` (SECURITY DEFINER) gebruikt — server-side validatie blokkeert spoofing |

### REEKS 6 — HTTP HEADERS

| Header | Status | Severity |
|---|---|---|
| X-Frame-Options: SAMEORIGIN | SET | PASS |
| X-Content-Type-Options: nosniff | SET | PASS |
| X-XSS-Protection | NIET GESET | LAAG (deprecated header, CSP is moderne replacement) |
| Strict-Transport-Security: max-age=31536000; includeSubDomains | SET | PASS |
| Content-Security-Policy | SET — uitgebreid (default-src 'self' + allowlists) | PASS |
| Referrer-Policy: strict-origin-when-cross-origin | SET | PASS |
| Permissions-Policy: geolocation=(), camera=(), microphone=() | SET | PASS |
| H2 HTTPS redirect | [.htaccess:8-10](.htaccess#L8) `RewriteCond %{HTTPS} off → https://` | PASS |

### REEKS 7 — GHOST AUTH

| Check | Severity | Finding |
|---|---|---|
| G1 email confirmation | **MIDDEL** | Code in [auth.html:1039-1043](auth.html#L1039) doet `db.auth.signUp({email, password, options:{data:{role,naam}}})`. **Geen client-side check** dat email bevestigd is voordat dashboard-toegang wordt verleend. Hangt 100% af van Supabase Dashboard setting `Email Confirmation Required = ON`. **Verifieer in Supabase Dashboard** |
| G2 signup role injection | INFO | UI whitelist via `selectRole()`: alleen student/bbl/bedrijf/school/begeleider/gepensioneerd toegestaan. **MAAR**: een malicious client kan direct `db.auth.signUp({options:{data:{role:'admin'}}})` aanroepen. Gevolg hangt af van: (a) `profiles` CHECK constraint waardenlijst en (b) of er triggers bestaan die metadata.role naar profiles syncen. Migration CHECK op [:20](internly_migration.sql#L20) staat alleen 4 waarden toe — maar productie heeft de constraint mogelijk uitgebreid voor begeleider/gepensioneerd. Combineert met R5 voor escalation-vector |

### REEKS 8 — TELEMETRIE

| Check | Severity | Finding |
|---|---|---|
| T1.A | INFO | js/telemetry.js bestaat (25KB, 600+ regels) |
| T1.B | PASS | Codenamen `_cfg`, `_sess`, `_tel`, `_render`, `_state` consistent gebruikt — geen leak van real names |
| T1.C | INFO | `fetch()` in `_tel.report` op [js/telemetry.js:110-118](js/telemetry.js#L110) post naar `https://qoxgbkbnjsycodcqqmft.supabase.co/rest/v1/security_reports`. Eigen Supabase REST endpoint, geen externe leak. Apikey via `window.__SUPABASE_ANON_KEY`. Werkt alleen als RLS op `security_reports` correct is — niet in migration! Mogelijk bestaande tabel maar drift |

### REEKS 9 — EDGE FUNCTIONS

| Check | File | Severity | Finding |
|---|---|---|---|
| E1 | [vat-verify/index.ts:69-80](supabase/functions/vat-verify/index.ts#L69) | PASS | Rate limit via `vat_last_attempt_at`. DB read fail → cp=null → 404 (niet bypass). Eerste call (null) is toegestaan, by design |
| E2 | vat-verify input validation | INFO | `vat_number` type-checked als string via destructuring; `.toUpperCase().replace(/[\s.\-]/g,'')` normaliseert. Country regex `^[A-Z]{2}` valideert. `company_profile_id` niet expliciet UUID-gecheckt — Postgres rejecteert non-UUID als query-error → cp=null → 404. **Veilig in praktijk, geen UUID-validatie aan voorkant** |
| E2 | Auth check | PASS | Bearer token verified via `supabase.auth.getUser(token)` op [:35-37](supabase/functions/vat-verify/index.ts#L35). Forbidden 403 als user.id ≠ company_profile_id en niet admin |
| E3 | [create-checkout/index.ts:49-54](supabase/functions/create-checkout/index.ts#L49) | PASS | Auth check via Bearer token. SAFE |
| E3 | [mollie-webhook/index.ts](supabase/functions/mollie-webhook/index.ts) | **KRITIEK** | **GEEN signature validatie**. Webhook accepteert elke POST met `id=<paymentId>` zonder Mollie-signature te verifiëren. Aanvaller kan met willekeurig payment_id state-mutaties triggeren. Mitigatie: function herfetcht via `mollieGet(/payments/${id})` en alleen valide payments → status updates kloppen. Maar exploit: known-good payment_id replay = idempotent re-fire, en attacker kan misschien double-process voorkomen op andere user. Verify of Supabase IP-allowlist of `Mollie-Signature` header check ontbreekt |
| E3 | send-push-notification | INFO (niet diep gecheckt) | Service-role key via env, niet hardcoded |

### REEKS 10 — SPECIFIEKE RISICO'S

| Check | Severity | Finding | Verdict |
|---|---|---|---|
| S1 trust_score self-write | **KRITIEK** | `cp_update_own USING(profile_id = auth.uid())` heeft geen `WITH CHECK` en geen kolom-restrictie. Geen RESTRICTIVE policy `cp_no_trust_score_write`. Company kan zelf `trust_score=99, trust_grade='A'` zetten via DevTools | **JA, mogelijk** |
| S2 self-verify | **KRITIEK** | Geen `cp_no_self_verify` policy. `cp_update_own` laat alle kolomwijzigingen toe. Company kan `verification_status='verified'` zelf zetten | **JA, mogelijk** |
| S3 student-on-student read | INFO | `sp_select_all USING(true)` laat student A → student B's volledige profiel lezen. Documenteer in privacybeleid; Trust Score-mechanisme vereist het | **JA, by design** |
| S4 XSS via bedrijfsnaam | PASS | bedrijfsnaam wordt overal via escapeHtml gerendered: discover.html, mijn-sollicitaties, school-dashboard, company-dashboard verifications etc. | Geen XSS-vector |
| S5 buddy_request impersonation | PASS | `breq_insert_own WITH CHECK(requester_id = auth.uid())` blokkeert. Niet mogelijk om als andere user request te insteken | **NEE, geblokkeerd** |

---

## KRITIEKE BEVINDINGEN (actie vereist vóór livetest)

### K1 — trust_score self-write
- **Finding**: Company kan eigen Trust Score = 99 / grade A zetten via DevTools
- **Location**: [internly_migration.sql:579-580](internly_migration.sql#L579) — `cp_update_own` heeft geen kolom-restrictie
- **Attack scenario**: Bedrijf opent DevTools en runt `await db.from('company_profiles').update({trust_score:99,trust_grade:'A'}).eq('profile_id',user.id)` → studenten zien fake A-grade en accepteren matches op valse basis
- **Fix** (run in Supabase SQL Editor):
```sql
CREATE POLICY "cp_no_trust_score_write" ON company_profiles
AS RESTRICTIVE FOR UPDATE
USING (profile_id = auth.uid())
WITH CHECK (
  trust_score IS NOT DISTINCT FROM (SELECT trust_score FROM company_profiles WHERE profile_id = auth.uid())
  AND trust_grade IS NOT DISTINCT FROM (SELECT trust_grade FROM company_profiles WHERE profile_id = auth.uid())
);

CREATE POLICY "ip_no_trust_score_write" ON internship_postings
AS RESTRICTIVE FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (
  trust_score IS NOT DISTINCT FROM (SELECT trust_score FROM internship_postings WHERE id = internship_postings.id)
  AND trust_grade IS NOT DISTINCT FROM (SELECT trust_grade FROM internship_postings WHERE id = internship_postings.id)
);
```

### K2 — Self-verify
- **Finding**: Company kan eigen verification_status='verified' zetten zonder VIES-validatie of admin-goedkeuring
- **Location**: ontbrekende policy op company_profiles
- **Attack scenario**: Onbevestigd bedrijf doet via DevTools `update({verification_status:'verified'})` → vacatures verschijnen meteen voor studenten zonder echte verificatie. Ondermijnt het kernproduct van Internly Worldwide
- **Fix**:
```sql
CREATE POLICY "cp_no_self_verify" ON company_profiles
AS RESTRICTIVE FOR UPDATE
USING (profile_id = auth.uid())
WITH CHECK (
  verification_status IS NOT DISTINCT FROM (SELECT verification_status FROM company_profiles WHERE profile_id = auth.uid())
  AND verified_at IS NOT DISTINCT FROM (SELECT verified_at FROM company_profiles WHERE profile_id = auth.uid())
  AND verified_by IS NOT DISTINCT FROM (SELECT verified_by FROM company_profiles WHERE profile_id = auth.uid())
  AND vat_cache_name IS NOT DISTINCT FROM (SELECT vat_cache_name FROM company_profiles WHERE profile_id = auth.uid())
);
```
Service-role (Edge Function) bypasses RESTRICTIVE policies, dus vat-verify blijft werken.

### K3 — Role escalation via profiles_update_own
- **Finding**: `profiles_update_own USING(id = auth.uid())` heeft geen kolom-restrictie. Een student kan eigen role bijwerken
- **Location**: [internly_migration.sql:551-552](internly_migration.sql#L551)
- **Attack scenario**: ingelogde student opent DevTools en runt `await db.from('profiles').update({role:'admin'}).eq('id',user.id)`. Als productie-CHECK constraint 'admin' toelaat: student wordt admin met toegang tot admin.html + alle admin-functies
- **Pre-condition**: productie-CHECK constraint moet 'admin' includeren. Migration zegt alleen `student/bedrijf/school/buddy` (regel 20), maar in praktijk worden ook `gepensioneerd`/`begeleider` gebruikt — dus constraint is uitgebreid. **Verifieer en limiteer in productie**.
- **Fix** (combineer 2 SQL):
```sql
-- 1. Verifier huidige CHECK constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass AND contype = 'c';

-- 2. Vervang profiles_update_own met kolom-restrictie
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
FOR UPDATE USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid())
);
```
Met deze fix kan een user wel naam/email/avatar wijzigen, maar niet de eigen role. Role-wijzigingen moeten via service-role gaan (admin tooling, signup-flow via Edge Function).

### K4 — Mollie webhook zonder signature
- **Finding**: [supabase/functions/mollie-webhook/index.ts](supabase/functions/mollie-webhook/index.ts) heeft 0 hits voor `signature`/`verify`/`secret`/`hmac`. Iedereen kan de webhook URL POST'en met willekeurige payment_id
- **Attack scenario**: Aanvaller met kennis van een Mollie payment_id forceert herverwerking, kan double-activate van subscriptions of timing-attack op andere user-ids veroorzaken
- **Mitigatie aanwezig**: function herfetcht via `mollieGet('/payments/${id})` en alleen valid response wordt verwerkt — exploit is dus beperkt
- **Fix** opties:
  1. **Beste**: implementeer Mollie signature verification (vereist `MOLLIE_WEBHOOK_SECRET` env var + HMAC-check in handler)
  2. **Alternatief**: IP-allowlist voor Mollie webhook IPs (lijst publiek bekend)
  3. **Tussenoplossing**: verifieer `payment.metadata.profile_id` matcht een verwachte signup-flow context

---

## HOOG (actie vereist voor of kort na livetest)

### H1 — Anon key 5× hardcoded inline (Bedward P2)
- [about.html:957, 995, 1046](about.html#L957) + [index.html:1963, 2034](index.html#L1963)
- **Fix**: vervang inline keys met `window.__SUPABASE_ANON_KEY` of laad js/supabase.js. Niet kritiek (key is publiek per design) maar key-rotation wordt 5× pijnlijker

### H2 — reviews_update_flag USING(true)
- [internly_migration.sql:861-862](internly_migration.sql#L861)
- **Fix**: limiteer flag-INSERT/UPDATE tot 1× per (reviewer, review_id) via UNIQUE index op `flag_log` of rate-limit per dag

### H3 — Schema drift (subscriptions, payments, swipes, verification_log, learning_agreements, vestigingen)
- Tabellen worden door code gequeried maar bestaan niet in version-controlled migration
- **Fix**: documenteer alle productie-tabellen in `internly_migration.sql` zodat RLS audit reproduceerbaar wordt. Run dump van productie schema en commit

### H4 — XSS via verification_doc filename
- [admin.html:862](admin.html#L862) `onclick="loadVerifyDoc('${c.verification_doc}')"`
- **Fix**: gebruik `escapeHtml(c.verification_doc)` of vervang met `data-path` attribute + addEventListener

### H5 — supabase-js zonder SRI op ~30 pagina's
- (vorige PRE_DEPLOY audit, nog niet opgelost)
- **Fix**: pin versie + integrity hash via SRI_HASHES_TODO.md procedure

### H6 — jspdf SRI hash mogelijk placeholder
- **Status**: opgelost in [FIX_SESSION:15](FIX_SESSION_2026-04-30.md). Bevestig in productie

### H7 — wachtwoord-vergeten flow
- **Status**: opgelost in [FIX_SESSION:4](FIX_SESSION_2026-04-30.md)

### H8 — telemetry depends on `security_reports` table
- [js/telemetry.js:92-94](js/telemetry.js#L92) — endpoint `/rest/v1/security_reports` wordt aangeroepen, maar tabel bestaat NIET in version-controlled migration
- **Fix**: voeg tabel + RLS toe aan migration, óf documenteer dat telemetry-DB-logging in productie inactief is

---

## MIDDEL (sprint 5)

- M1: `student_profiles` volledig openbaar via `sp_select_all USING(true)` — privacybeleid bijwerken of veld-restricted view implementeren voor non-related queries
- M2: `matches/conversations/buddy_pairs INSERT auth.uid() IS NOT NULL` te breed — applicatie-laag gates, geen DB-borging
- M3: `.gitignore` mist `.env`, `*.key`, `secrets/`
- M4: Bedward P1 SELECT * violations: bbl-profile, bbl-hub, chat, company-dashboard
- M5: localStorage clear ontbreekt in `performLogout` — BBL-reflecties + chat-drafts persistent na logout
- M6: js/buddy.js `saveBuddyProfile` gebruikt `...formData` spread (tegenover whitelist-pattern in andere saveProfile-functies)
- M7: Email confirmation enforcement onverifieerbaar uit code — alleen via Supabase Dashboard
- M8: Admin notification spoofing-mitigatie via RPC `create_notification` — verifier dat de RPC daadwerkelijk in productie bestaat (niet in migration)
- M9: window.__SUPABASE_ANON_KEY exposure — design-keuze maar key-rotation impact
- M10: vat-verify input — geen expliciete UUID-validatie op company_profile_id (mitigatie: Postgres rejecteert)
- M11: signup `data.metadata.role` kan worden gespoofed via DevTools — combineer met R5 fix

---

## KLAAR VOOR LIVETEST?

**🔴 ROOD** — niet klaar.

**Motivering:** vier KRITIEKE bevindingen blokkeren go-live:
1. **K1+K2** ondermijnen het kernproduct (Trust Score + Verificatie zijn beide self-writable)
2. **K3** opent role-escalation pad waarmee elke gebruiker admin kan worden
3. **K4** maakt subscription-state vulnerabel voor replay/forgery via webhook

**De vier kritieke fixes zijn allemaal SQL-only** (3 RESTRICTIVE policies + 1 UPDATE policy met WITH CHECK) plus één Edge Function herziening. Geschatte effort: 30-60 minuten Supabase SQL Editor + Mollie signature implementatie 1-2 uur.

**Na deze 4 fixes**: status zou ORANJE worden (8 HOOG-items resterend, niet allemaal blocking) richting GROEN.

Aanbeveling: **schedule een 2-uurs SQL-fix sessie vandaag** met Barry, run de 4 SQL-statements + Mollie signature. Daarna her-audit met focus op die 4 specifieke vectors.
