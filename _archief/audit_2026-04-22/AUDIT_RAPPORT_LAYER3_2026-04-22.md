# Layer 3 V2 Audit Rapport — Hardening Scan
**Datum:** 22 april 2026
**Auditor:** Claude Code (claude-sonnet-4-6)
**Input:** Risk Catalogue 2026-04-22, Layer 1 rapport (`AUDIT_RAPPORT_SPRINT3_2026-04-22.md`), Layer 2 crew-review

---

## 0. CRITICAL FLAGS

**Geen CRITICAL flags.** Geen `service_role` key aangetroffen in frontend-code. Geen JWT met `"role":"anon"` die per ongeluk een service_role token is. Alle 35 public tabellen hebben RLS ingeschakeld.

---

## 1. Auto-fixes uitgevoerd

**Geen auto-fixes op code of database.** Motivatie per categorie:

**RLS enable (§1.1):** Alle 35 public tabellen hebben `rowsecurity = true`. Er is geen tabel die auto-fix vereist.

**Empty catch-blocks (§5.1):** Alle gevonden lege catch-blokken in niet-recent-aangeraakte bestanden zijn intentionele "best-effort cleanup" patronen (removeChannel op page-unload, JSON.parse met fallback). Het toevoegen van `console.error` aan deze blokken voegt alleen ruis toe. Gerapporteerd, niet gefixed. Details in §4 / Risico #9.

---

## 2. Requires Barry's approval

### 2.1 SECURITY DEFINER schema-verplaatsing (HIGH — Bedward)

**Bevinding:** Beide trigger-functies `check_mutual_swipe_match` en `notify_on_mutual_match` staan in het `public` schema en hebben EXECUTE-grants voor zowel `anon` als `authenticated`.

**Mitigatie (gedeeltelijk):** Beide functies retourneren `trigger` type zonder argumenten. PostgREST kan trigger-functies niet via REST aanroepen — ze zijn dus *feitelijk* niet bereikbaar via `/rest/v1/rpc/`. Het theoretische risico is nihil zolang Supabase's PostgREST-gedrag stabiel blijft.

**Aanbeveling:** Verplaats beide functies naar een `internal` schema dat PostgREST niet exposed. Dit verhoogt defense-in-depth.

```sql
-- VEREIST APPROVAL — niet uitvoeren zonder Barry's goedkeuring
CREATE SCHEMA IF NOT EXISTS internal;
ALTER FUNCTION public.check_mutual_swipe_match() SET SCHEMA internal;
ALTER FUNCTION public.notify_on_mutual_match() SET SCHEMA internal;
-- Triggers hoeven niet aangepast: Postgres triggers zoeken functies via schema-pad
```

**Optionele live-test voor Barry** (vul eigen waarden in):
```bash
curl -X POST "https://qoxgbkbnjsycodcqqmft.supabase.co/rest/v1/rpc/check_mutual_swipe_match" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'
# Verwacht: 404 of 400 — als 200: urgent verplaatsen
```

### 2.2 UPDATE policies zonder WITH CHECK (MEDIUM)

**Bevinding:** 17+ UPDATE-policies missen een WITH CHECK clause. Zonder WITH CHECK kan een geauthentificeerde gebruiker een rij in-scope van USING updaten naar een staat die buiten zijn rechten valt. Meest risicovolle gevallen:

| Tabel | Policy | Risico |
|-------|--------|--------|
| `profiles` | `own update profile` + `profiles_update_own` | Gebruiker kan eigen `role`-veld aanpassen (bijv. `'admin'`) |
| `matches` | `matches_update_party` + `own update matches` | Party kan match.status of party_b aanpassen |
| `meetings` | `meet_update_party` + `meeting parties` | Organizer kan attendee_id omzetten |
| `messages` | `own update messages` + `msg_update_read` | Zender kan berichtinhoud of sender_id overschrijven |

**Aanbeveling per tabel (ter goedkeuring):**

```sql
-- profiles: blokkeer role-wijziging
ALTER POLICY profiles_update_own ON profiles
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- matches: blokkeer party_a/party_b wijziging
ALTER POLICY matches_update_party ON matches
  USING ((party_a = auth.uid()) OR (party_b = auth.uid()))
  WITH CHECK ((party_a = auth.uid()) OR (party_b = auth.uid()));
```

Overige tabellen: individuele WITH CHECK per tabel beoordelen. Niet alle tables zijn even gevoelig (bijv. `buddy_queue` is laag-risico).

### 2.3 CSP — `'unsafe-inline'` (MEDIUM)

**Bevinding:** .htaccess regel 16 bevat een CSP maar met `'unsafe-inline'` in zowel `script-src` als `style-src`. Dit ondermijnt de XSS-bescherming grotendeels.

**Huidige CSP (compleet — aangetroffen in .htaccess):**
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://maps.googleapis.com https://translate.google.com https://www.gstatic.com https://js.mollie.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com;
font-src 'self' https://fonts.gstatic.com data:;
connect-src 'self' https://qoxgbkbnjsycodcqqmft.supabase.co wss://qoxgbkbnjsycodcqqmft.supabase.co https://api.mollie.com https://maps.googleapis.com https://maps.gstatic.com;
img-src 'self' data: https:;
frame-src 'self' https://translate.google.com;
object-src 'none';
base-uri 'self';
form-action 'self'
```

**Positief:** `connect-src` is goed ingesteld (Supabase + Mollie, geen `*`). `object-src 'none'` en `base-uri 'self'` zijn correct.

**Probleem:** `'unsafe-inline'` staat inline-scripts en inline-styles toe, wat XSS via DOM-injectie niet blokkeert. Verwijderen van `'unsafe-inline'` vereist dat alle inline `<script>`- en `<style>`-blokken (waarvan er honderden zijn in de HTML-bestanden) worden omgezet naar extern geladen bestanden of nonce-gebaseerde CSP.

**Aanbeveling:** Dit is een structurele sprint-omvang taak. Niet vóór sprint 5. Rapporteer als technische schuld.

### 2.4 Duplicate policies cleanup (7/11's aanbeveling)

**Layer 1 bevinding (herhaling voor Barry):**

**matches tabel** — drie duplicate paren:
```sql
-- DROP candidates (de "own" varianten — minder specifiek):
DROP POLICY "own insert matches" ON matches;
DROP POLICY "own read matches" ON matches;
DROP POLICY "own update matches" ON matches;
-- Behouden: matches_insert_party, matches_select_party, matches_update_party
```

**notifications tabel** — ALL policy overlapt specifieke CMD-policies:
```sql
-- DROP candidate (overlapt met notif_insert_auth + notif_select_own + notif_update_own):
DROP POLICY "Users manage own notifications" ON notifications;
-- Behouden: notif_insert_auth, notif_select_own, notif_update_own
```

**Niet uitvoeren zonder Barry's goedkeuring.** Testen in staging-omgeving als die beschikbaar is.

### 2.5 `match_type` bug in begeleider-dashboard.html + school-dashboard.html (HIGH)

**Bevinding:** De kolom op de `matches` tabel heet `type` (bevestigd Layer 1, CLAUDE.md). Maar in twee productiebestanden wordt `match_type` gebruikt:

| Bestand | Regel | Code |
|---------|-------|------|
| [begeleider-dashboard.html](begeleider-dashboard.html) | 1011 | `.eq('match_type', 'begeleider_link')` |
| [begeleider-dashboard.html](begeleider-dashboard.html) | 1023 | `match_type: 'begeleider_link'` (INSERT) |
| [begeleider-dashboard.html](begeleider-dashboard.html) | 1049 | `.eq('match_type', 'begeleider_link')` |
| [school-dashboard.html](school-dashboard.html) | 2221 | `.eq('match_type', 'begeleider_link')` |
| [school-dashboard.html](school-dashboard.html) | 2233 | `match_type: 'begeleider_link'` (INSERT) |
| [school-dashboard.html](school-dashboard.html) | 2259 | `.eq('match_type', 'begeleider_link')` |

**Impact:** Alle Supabase queries met `.eq('match_type', ...)` retourneren een lege resultatenset of een fout (Supabase filtert op een niet-bestaande kolom). Het begeleider-link aanmaken zou een INSERT inzetten met een onbekende kolom `match_type` — de insert zal waarschijnlijk mislukken met een Supabase schema-fout. **De begeleider-link feature werkt momenteel niet correct.**

**Fix (ter goedkeuring — 6 regels):** Vervang alle 6 instanties van `match_type` door `type` in beide bestanden.

---

## 3. Manual checks voor Barry

### 3.1 Supabase Dashboard — email confirmations

**Actie voor Barry:** Open Supabase Dashboard → Authentication → Settings. Check:
- "Enable email confirmations" = **ON**?
- "Allow new users to sign up" = ON/OFF naar wens?

Als confirmations **OFF**: Ghost Auth Exploitation-scenario uit de Risk Catalogue is mogelijk — nieuwe users kunnen direct inloggen zonder emailverificatie. Check dit vóór schaalvergroting.

### 3.2 Edge Functions — geen `invoke()` aangetroffen

Scan resultaat: **0 hits** voor `.invoke(` in alle JS-bestanden en HTML-bestanden. De `send-meeting-email` Edge Function die eerder in calendar.js stond is correct verwijderd (zie CLAUDE.md). Er zijn momenteel geen Edge Function-aanroepen in de frontend.

**Actie voor Barry:** Geen Edge Function inventory check vereist op dit moment.

### 3.3 Live anon-request tests (curl scenario's A–D — Unsub Knob)

Vervang `<SUPABASE_URL>` en `<ANON_KEY>` met de Internly public waarden uit supabase.js.

**Scenario A — Tabel-exposure via anon:**
```bash
curl "https://qoxgbkbnjsycodcqqmft.supabase.co/rest/v1/profiles?select=*&limit=5" \
  -H "apikey: <ANON_KEY>"
# Verwacht: [] (lege array). Als data terugkomt: KRITIEK
```

**Scenario B — Swipes als anon:**
```bash
curl "https://qoxgbkbnjsycodcqqmft.supabase.co/rest/v1/swipes?select=*&limit=5" \
  -H "apikey: <ANON_KEY>"
# Verwacht: [] (lege array)
```

**Scenario C — Fake user impersonation (INSERT zonder auth):**
```bash
curl -X POST "https://qoxgbkbnjsycodcqqmft.supabase.co/rest/v1/swipes" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"swiper_id":"00000000-0000-0000-0000-000000000000","target_id":"00000000-0000-0000-0000-000000000001","target_type":"bedrijf","direction":"like"}'
# Verwacht: 401/403 — niet geauthentificeerd
```

**Scenario D — Zelf-swipe blokkering:**
```bash
curl -X POST "https://qoxgbkbnjsycodcqqmft.supabase.co/rest/v1/swipes" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"swiper_id":"<own_uid>","target_id":"<own_uid>","target_type":"bedrijf","direction":"like"}'
# Verwacht: 403 — swipes_insert_own policy bevat swiper_id <> target_id check
```

### 3.4 Notification type vocabulary (Data2 + Jane Goodway)

Zie §4 / Risico #7 voor de volledige discrepantie-tabel. Beslissing over type-namen vereist vocabulaire-keuze door de crew.

---

## 4. Per-risico bevindingen

### Risico #1 — RLS enabled
**Status: ✅ PASS**
Alle 35 public tabellen: `rowsecurity = true`. Geen enkel lek via disabled RLS.

### Risico #2 — USING(true) antipattern
**Status: ⚠️ Twee permissieve policies — intentioneel maar gedocumenteerd**

| Tabel | Policy | Clause | Intentie |
|-------|--------|--------|----------|
| `waitlist` | `waitlist_insert_public` | `WITH CHECK = true` | Publieke pre-signup — waarschijnlijk intentioneel |
| `internships` | `internships_select_public` | `USING = true` | Publieke vacatureweergave — intentioneel |

**Aanvullend:** `conv_insert_auth` (conversations) en `notif_insert_auth` (notifications) gebruiken `auth.uid() IS NOT NULL` als WITH CHECK. Dit laat elke ingelogde gebruiker elke conversation of notification aanmaken, zonder koppeling aan hun eigen ID als deelnemer. Dit is een bestaand architectuurpatroon in Internly maar heeft een licht te brede poort.

**Aanbeveling:** Rapporteer. Geen auto-fix. `waitlist_insert_public` en `internships_select_public` zijn vermoedelijk bewust. `conv_insert_auth` en `notif_insert_auth` verdienen heroverweging in Sprint 5.

### Risico #3 — service_role key exposure
**Status: ✅ PASS**
- Geen `service_role` keyword in HTML, JS, of .htaccess.
- `eyJhbG` hits zijn allemaal de **anon key** (JWT payload bevat `"role":"anon"`). Dit is de publieke key die in supabase.js hoort te staan. Veilig.
- Inline anon keys in `about.html` (regels 783, 821, 872) en `index.html` (regels 1251, 1399) zijn bekend technische schuld (CLAUDE.md → Sprint 5 cleanup item).

### Risico #4 — Email confirmation (manual)
**Status: ❓ Manual check vereist** — zie §3.1.

### Risico #5 — Non-existent Edge Functions
**Status: ✅ PASS** — Geen `invoke()` calls aangetroffen in de codebase.

### Risico #6 — Policy completeness (INSERT zonder SELECT)
**Status: ✅ PASS** — Alle tabellen met INSERT-beleid hebben ook SELECT-beleid.

### Risico #7 — Notification type sync (Data2)
**Status: ⚠️ Discrepantie — vocabulaire-beslissing vereist**

**DB notification types** (Layer 1 — daadwerkelijk ingevoegd):
`new_message`, `new_match`, `meeting_request`, `meeting_invite`, `new_review`, `application_accepted`, `buddy_request`, `school_referral`

**utils.js VALID_NOTIFICATION_TYPES** (huidig):
`new_message`, `new_meeting`, `meeting_accepted`, `meeting_rejected`, `new_match`, `eval_signed`, `eval_completed`, `buddy_request`, `buddy_accepted`, `buddy_declined`, `subscription_activated`, `subscription_failed`, `new_review`, `application_accepted`, `application_rejected`, `school_referral`, `begeleider_invite`

**Analyse:**

| Type | In DB | In utils.js | Status |
|------|-------|-------------|--------|
| `new_message` | ✅ | ✅ | OK |
| `new_match` | ✅ | ✅ | OK |
| `new_review` | ✅ | ✅ | OK |
| `application_accepted` | ✅ | ✅ | OK |
| `buddy_request` | ✅ | ✅ | OK |
| `school_referral` | ✅ | ✅ | OK |
| `meeting_request` | ✅ DB | ❌ niet in utils | utils kent dit type niet → toast = "Nieuwe melding" fallback |
| `meeting_invite` | ✅ DB | ❌ niet in utils | idem |
| `new_meeting` | ❌ niet in DB | ✅ utils | Dead type in utils — nooit door DB aangemaakt |
| `meeting_accepted` | ❌ niet in DB | ✅ utils | Dead — tenzij code het rechtstreeks inserts |
| `meeting_rejected` | ❌ niet in DB | ✅ utils | Dead |
| `eval_signed` | ❌ niet in DB | ✅ utils | Ingevoegd door bbl-hub.html signOff() |
| `eval_completed` | ❌ niet in DB | ✅ utils | Idem |
| `buddy_accepted` | ❌ niet in DB | ✅ utils | Ingevoegd door buddy.js |
| `buddy_declined` | ❌ niet in DB | ✅ utils | Idem |
| `application_rejected` | ❌ niet in DB | ✅ utils | Ingevoegd door applicatie-flow |
| `begeleider_invite` | ❌ niet in DB | ✅ utils | Ingevoegd door begeleider-dashboard |
| `subscription_activated` | ❌ niet in DB | ✅ utils | Stub (Mollie) |
| `subscription_failed` | ❌ niet in DB | ✅ utils | Stub |

**Conclusie:** `meeting_request` en `meeting_invite` worden door de DB aangemaakt (via calendar of een trigger) maar zijn niet in utils.js geregistreerd → gebruikers zien "Nieuwe melding" als toast in plaats van correcte tekst. Vocabulaire-beslissing voor Jane Goodway vóór Sprint 3.

### Risico #8 — RPC reachability SECURITY DEFINER
**Status: ⚠️ Grants aanwezig, maar feitelijk niet bereikbaar**

Beide functies hebben EXECUTE voor `anon` + `authenticated`. Maar beide retourneren `trigger` zonder argumenten → PostgREST kan ze niet via REST aanroepen. **Technisch veilig**, maar niet volgens defense-in-depth. Zie §2.1 voor schema-verplaatsingsvoorstel.

### Risico #9 — Silent failures / empty catch-blocks
**Status: ⚠️ Meerdere lege catch-blokken — intentionele suppressie**

Gevonden in niet-recent-aangeraakte bestanden (rapporteer-only, niet auto-fixed omdat patronen intentioneel zijn):

| Bestand | Regel | Patroon | Analyse |
|---------|-------|---------|---------|
| [js/utils.js](js/utils.js) | 235 | `catch (_) {}` op `setApplying(false)` | Intentionele UI-cleanup suppressie |
| [discover.html](discover.html) | 1214 | `catch(e) {}` op `removeChannel` | Intentionele cleanup op signout |

Gevonden in recent-aangeraakte bestanden (rapporteer-only per instructie):

| Bestand | Regels | Patroon |
|---------|--------|---------|
| [js/buddy.js](js/buddy.js) | 187 | `catch(e) {}` op realtime cleanup |
| [bbl-hub.html](bbl-hub.html) | 1163, 1245, 1679, 1697, 1718, 1723, 1727, 1755, 1792, 1839, 1858, 2035, 2036, 2222, 2229, 2365, 2386, 2686 | Mix van JSON.parse-catches + cleanup-catches |
| [bbl-dashboard.html](bbl-dashboard.html) | 471, 474 | JSON.parse + catch |
| [buddy-dashboard.html](buddy-dashboard.html) | 650, 723, 743 | cleanup catches |
| [company-dashboard.html](company-dashboard.html) | 2284 | `catch(_) {}` op push-registratie |

**Opmerking:** JSON.parse-catches met lege body zijn correct (fallback naar `{}` staat vóór de try). removeChannel-catches zijn correct (cleanup mag falen). Prioriteit voor echte bugs is laag.

### Risico #10 — Optimistic UI
**Status: ℹ️ Telling — 58 DOM-mutaties in js/ bestanden**

Grep: `innerHTML =`, `textContent =`, `classList.add/remove` → **58 hits** in js/ (excl. HTML). Manual review bij Sprint 3 matchpool-bouw aanbevolen.

### Risico #11 — CHECK constraints
**Status: ✅ COVERED BY LAYER 1** — volledig geïnventariseerd.

### Risico #12 — SELECT * op persoonsgegevens
**Status: ⚠️ Één hit**

| Bestand | Regel | Context |
|---------|-------|---------|
| [js/calendar.js](js/calendar.js) | 357 | `.select().maybeSingle()` na meetings INSERT |

De lege `.select()` retourneert alle kolommen van de ingevoegde meeting. Voor meetings is dit laag-risico (alleen organizer/attendee data), maar P8-principe (Kant + Data2) zegt: SELECT-kolommen moeten gesynchroniseerd zijn met render-functies. **Aanbeveling:** vervang door `.select('id, type, date, time_start, time_end, status, note, organizer_email, attendee_email, match_id')`.

Geen `.select('*')` strings aangetroffen. ✅

### Risico #13 — swipes-rijen worden gedeleted (Guinan2)
**Status: ✅ PASS**

Enige `.delete()` hit in JS: `js/calendar.js:140` op `availability` tabel (niet swipes). Audit-trail van swipes blijft intact. ✅

### Risico #14-15 — COVERED BY LAYER 1
Niet nader uitgewerkt.

### Risico #16 — Dependencies
**Status: ⚠️ Zwevende versie + geen SRI**

- Alle 30+ HTML-bestanden laden `@supabase/supabase-js@2` (floating major). jsDelivr serveert de laatste 2.x — dit betekent automatische updates zonder code-review.
- `bbl-hub.html` en `match-dashboard.html`: `cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`
- `chat.html`: `npm/emoji-mart@5.5.2/dist/browser.js`
- **Geen enkel CDN-script heeft een `integrity=` (SRI) hash.** Dit is The Worm's concern: een CDN-compromis leidt tot code-injectie in alle Internly-pagina's.

**Aanbeveling:** Pin naar specifieke versies en voeg SRI toe. Voorbeeld voor supabase-js:
```html
<!-- Pin versie + SRI hash (genereer hash via https://www.srihash.org) -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js"
        integrity="sha384-<hash>"
        crossorigin="anonymous"></script>
```

Prioriteit: **MEDIUM** — CDN-compromis is theoretisch maar de impact is maximaal.

### Risico #17 — CSP
**Status: ⚠️ CSP aanwezig maar verzwakt door unsafe-inline**
Zie §2.3 voor details. De CSP in .htaccess is beter dan niets — connect-src is goed geconfigureerd. De `'unsafe-inline'` is het enige echte probleem, maar oplossen vereist sprint-omvang werk.

### Risico #18 — Browser storage
**Status: ⚠️ LocalStorage zonder TTL voor BBL-data**

| Sleutel | Bestand | Type data | TTL |
|---------|---------|-----------|-----|
| `internly_push_asked` | push.js | boolean flag | Op deny verwijderd ✅ |
| `internly_lang` | translate.js | taal-voorkeur | Geen TTL — ok (niet gevoelig) |
| `internly_applying` | utils.js | boolean flag | Verwijderd op logout ✅ |
| `internly_esg_export_data` | esg-export.js | ESG-rapportdata | sessionStorage → verwijderd na print ✅ |
| `internly_ld_<userId>` | bbl-hub + bbl-dashboard | BBL leerdoelen progress | **Geen TTL — blijft permanent** |
| `internly_ld_toelichting_<userId>` | bbl-hub | BBL toelichting draft | **Geen TTL — blijft permanent** |
| `internly_bbl_reflectie_draft_<userId>` | bbl-hub | Reflectie draft | **Geen TTL — blijft permanent** |
| `internly_renewal_<matchId>` | bbl-hub | Contract-verlenging state | **Geen TTL — blijft permanent** |

**Bevinding:** BBL-data (leerdoelen progress, reflectie drafts) wordt permanent opgeslagen in localStorage zonder TTL of versleuteling. Op gedeelde computers (school-bibliotheek, BBL-aula) is dit een privacyrisico. Geen persoonsidentificerende gegevens in de keys zelf (userId is UUID), maar de data zelf bevat voortgangsinformatie.

**Aanbeveling:** Voeg TTL toe via een timestamp-wrapper, of migreer naar sessionStorage. Sprint 5 werk.

### Risico #19 — Naming assumptions (cross-file)
**Status: ⚠️ MATCH_TYPE BUG aangetroffen — zie §2.5**

| Check | Resultaat |
|-------|-----------|
| `duration_weeks` in code | ✅ Geen hits in JS/HTML — alleen in audit-rapporten |
| `match_type` in JS | ✅ Geen hits in js/ |
| `match_type` in HTML | ❌ **6 hits in 2 bestanden** — zie §2.5 |
| `swipe_mutual` | ✅ Geen hits in code |
| `status='active'` op matches | ⚠️ 1 dead condition — zie hieronder |

**`status='active'` op matches — [company-dashboard.html](company-dashboard.html) regel 1517:**
```javascript
const hasConv = m.status === 'accepted' || m.status === 'active';
```
Als `m` een match-object is, is `'active'` geen geldige status (Layer 1: `'pending'/'accepted'/'rejected'`). De `||` zorgt dat de functie werkt via `'accepted'` — het is een **dode conditie** maar geen runtime-crash. Overige `status === 'active'` hits zijn op postings of subscriptions, waar 'active' wel geldig kan zijn.

### Risico #20 — Overige
**Status: ✅ COVERED BY LAYER 1** — geen nieuwe bevindingen.

---

## 5. Cross-file assumption vondsten

| Assumption | Verwacht | Aangetroffen | Ernst |
|------------|---------|--------------|-------|
| `duration_weeks` | Geen hits | Geen hits in code ✅ | — |
| `match_type` (col-naam) | Geen hits | **6 hits** in begeleider-dashboard + school-dashboard | HIGH |
| `swipe_mutual` (type-waarde) | Geen hits | Geen hits in code ✅ | — |
| `status='active'` op matches | Geen hits | 1 dode conditie in company-dashboard:1517 | LOW |

---

## 6. Dependencies & Security headers

### Supabase-versie
Alle bestanden: `@supabase/supabase-js@2` (floating). Aanbevolen: pin naar `@2.x.x` met SRI-hash. `pricing.html` gebruikt een afwijkend CDN-pad (`/dist/umd/supabase.min.js`) — normaliseer naar dezelfde URL als overige bestanden.

### CSP-status
✅ Aanwezig in .htaccess (regel 16). ⚠️ `'unsafe-inline'` in script-src en style-src verzwakt XSS-bescherming. Overige CSP-directives zijn solide (connect-src correct, object-src none, base-uri self).

### SRI hashes
❌ **Geen enkel CDN-script heeft een `integrity=` attribuut.** Betrokken libraries: supabase-js@2 (alle pagina's), jspdf@2.5.1 (bbl-hub, match-dashboard), emoji-mart@5.5.2 (chat). Supply-chain risico.

---

## 7. Recommendations voor process

### Garcia2 — Dry-run patroon voor SQL-migraties

Voor elke toekomstige migratie-bundel (vanaf Sprint 3):

```sql
BEGIN;

-- [Migratie SQL hier]

-- Verificatie queries
SELECT COUNT(*) FROM [tabel] WHERE [conditie];

ROLLBACK;  -- Eerst draaien. Als verificaties slagen: BEGIN + COMMIT voor echte run.
```

Dit patroon had de Sprint 2 migratie-bugs (verkeerde kolom-naam, duplicate triggers) vroegtijdig blootgelegd.

### Hal — Pre-migratie verificatie checklist

Voor elke INSERT/UPDATE/ALTER in een migratie:
1. `\d tablename` — verifieer kolom-naam bestaat en is van correct type
2. `SELECT constraint_name, check_clause FROM pg_check_constraints WHERE ...` — verifieer geldige waarden
3. `SELECT tgname FROM pg_trigger WHERE ...` — verifieer dat trigger nog niet bestaat

### 7/11 — Duplicate policy cleanup

Zie §2.4 voor de voorgestelde DROP POLICY commando's. Niet urgent voor Sprint 3, wel voor platformhardening.

---

## 8. Samenvatting

| Categorie | Aantal |
|-----------|--------|
| Auto-fixes uitgevoerd | **0** |
| Items vereisen approval | **6** (schema-move, WITH CHECK gap, CSP, dup-policies, `match_type` bug, optionele live-tests) |
| Manual checks voor Barry | **3** (email confirmations, anon curl tests, notif-vocab) |
| CRITICAL | **0** |
| HIGH | **2** (`match_type` bug in HTML, SECURITY DEFINER grants) |
| MEDIUM | **5** (UPDATE/WITH CHECK gap, SRI ontbreekt, notif type mismatch, CSP unsafe-inline, localStorage TTL) |
| LOW | **4** (floating versie, SELECT * in calendar, dode status conditie, inline anon keys) |

### Sprint 3 readiness: **CONDITIONAL GO**

Layer 3 brengt geen nieuwe blockers voor Sprint 3 aan, **met uitzondering van de `match_type` bug** (§2.5). Als de begeleider-link feature onderdeel is van Sprint 3 scope (of als Sprint 3 queries op `matches.type` uitvoert), **moet de bug in begeleider-dashboard.html en school-dashboard.html eerst gefixed worden**.

Alle andere bevindingen zijn achtergrond-verbeterpunten die na Sprint 3 kunnen worden opgepakt.

**Pre-Sprint 3 actie voor Barry:**
1. Bevestig `match_type` → `type` fix in begeleider-dashboard.html + school-dashboard.html (§2.5)
2. Bevestig Sprint 2 migratie-SQL correcties (Layer 1 §8)
3. Check email-confirmations in Supabase Dashboard (§3.1)

---

*Layer 3 V2 — Hardening Scan — 22 april 2026*
*Volgende stap: Barry + crew beoordelen §2.5 (match_type bug), beslissen Sprint 3 go/no-go scope.*
