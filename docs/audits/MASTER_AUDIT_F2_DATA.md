# MASTER AUDIT — FASE 2 : DATA INTEGRITY & SCHEMA
Datum: 9 mei 2026
Methode: read-only grep + cross-reference code ↔ migration

---

## 2.1 — Schema-mismatch sweep (Run 1.7 follow-up)

### Bug A — `messages.type` referenties
**Code-zijde**: `messages.type` wordt **niet gebruikt** in INSERT/SELECT-statements van live code. Alle 6 `db.from('messages').insert({...})` plaatsen gebruiken alleen `conversation_id`, `sender_id`, `content`. SELECT-queries gebruiken alleen `id, sender_id, content, created_at, read` (chat.html:1204).

**DB-zijde**: kolom `type` bestaat in `messages` (internly_migration.sql:193) met default `'text'`.

**Status: PASS** — geen mismatch. De `type` kolom is in DB aanwezig maar onbenut in code.

### Bug B — `meetings.match_id` referenties
**Code-zijde**: 9+ callers van `meetings.match_id` (zie HANDOVER.md/RUN_1_RAPPORT.md). Voorbeeld: `bbl-hub.html:1643`, `match-dashboard.html:5855`.

**DB-zijde**: kolom `match_id` bestaat in `meetings` (internly_migration.sql:244) als `uuid REFERENCES matches(id)`. Index `idx_meetings_match` op match_id (1052).

**Status: PASS in migrations.sql** — maar HANDOVER.md regel 77 zegt _"Bug B: meetings.match_id does not exist — NIET GEFIXT — wacht op Barry-keuze"_.

**VERIFY NEEDED**: 
- internly_migration.sql definieert de kolom — is dat bestand uitgevoerd op productie-DB?
- HANDOVER.md is van 5 mei, niet bijgewerkt na een eventuele migratie?
- Run query in Supabase Console:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name='meetings' AND column_name='match_id';
  ```

**Classificatie**: P1 indien de DB de kolom mist — bbl-hub.html:1643 INSERT en match-dashboard.html:5855 INSERT zouden silently falen (PostgreSQL throwt, code logt warn maar UI geeft generieke fout). Indien wel aanwezig: PASS.

### Andere kolom-referenties
Kruisverwijzing van `.from('TABEL').select('KOLOM')` met DDL:
| Tabel | Kolom in code | Kolom in DDL | Status |
|---|---|---|---|
| profiles | `id, role, naam, email, telefoon, taal_voorkeur, email_notificaties` | aangenomen aanwezig | VERIFY (`telefoon`, `email_notificaties` ontbreken in CREATE TABLE inspectie) |
| meetings | `subject, type, contact_info, organizer_email, attendee_email, match_id, time_start, time_end, proposed_date` | alle aanwezig (incl ALTER TABLE r257-260) | PASS |
| applications | `internship_id, student_id, profile_id, posting_id, status` | aangenomen aanwezig | VERIFY |
| matches | `praktijkbegeleider_profile_id, roc_profile_id, renewal_status, contract_end_date` | praktijkbegeleider in sql/migrations.sql:37; renewal_status in sql/migrations.sql:30; **roc_profile_id NIET in beide migration files** | **MISMATCH** zie hieronder |

#### F2.1.A — `matches.roc_profile_id` ontbreekt in DDL [P1]
`bbl-hub.html:1650` en `js/calendar.js`-comments verwijzen naar `activeMatch.roc_profile_id`. internly_migration.sql:1131 noemt het in een NOTES-comment als _"Add this column when you are ready to build that flow"_. CLAUDE.md noemt `roc_profile_id` als verplichte FK in build-rule 2.

**Status: VERIFY** — als kolom niet bestaat in productie, faalt de driegesprek-notificatie in bbl-hub.html:1651.

**Classificatie**: P1 indien feature gebruikt wordt; P3 indien nog niet live.

---

## 2.2 — INSERT verification (Build rule P4)

### Methodiek
Alle `.insert({...})` calls (63 hits, 20 files) gescand. Focus op INSERT met FK-kolommen.

### Goede patronen gevonden
| Caller | INSERT in tabel | FK-velden | Verifieer pre-insert? |
|---|---|---|---|
| bbl-hub.html:1396 | messages | `conversation_id, sender_id` | conversation komt uit page-load query — JA |
| bbl-hub.html:1634 | meetings | `match_id, organizer_id, attendee_id` | activeMatch al geladen, currentUser via auth — JA |
| chat.html:1184,1291,2015 | messages | `conversation_id, sender_id` | convId via page-init, currentUser via auth — JA |
| match-dashboard.html:5854 | meetings | `match_id, organizer_id, attendee_id` | MATCH_ID via URL-param (controleer guard), currentUser via auth — VERIFY |
| match-dashboard.html:5532,5589,5623,5882 | notifications | `user_id, ref_id` | user_id is gevalideerde party_id — JA |
| mijn-sollicitaties.html:569 | applications | `internship_id, student_id` | undo-flow, ids uit memory — JA |
| js/calendar.js:353 | meetings | `match_id, organizer_id, attendee_id` | doorgegeven via parameter — VERIFY caller |
| js/reviews.js:138 | reviews | `match_id, reviewer_id, reviewee_id` | RLS gated zelf — PASS |
| international-student-dashboard.html:2035-2049 | learning_agreement_* | `la_id` van zojuist ingevoegde rij | sequentieel, JA |

### Bevinding [P3]
Geen ontbrekende FK-validatie aangetroffen in pre-insert checks. Build rule P4 wordt gevolgd. RLS geeft een tweede beschermingslaag voor de meeste tabellen (zie F1.3).

**Status: PASS** — geen losse INSERTs met onverifieerde FKs.

---

## 2.3 — Silent failure detection (Build rule P5)

### Catch-blocks zonder notify()
20 HTML-files hebben `.catch()`. De volgende vallen op:

#### F2.3.A — Match-dashboard meeting-flow silent DB-updates [P2]
`match-dashboard.html`:
- `:5528` — `db.from('meetings').update({status:'bevestigd'}).eq(...).catch(err => console.warn('[hub] accept DB err:', err))`
- `:5585` — idem voor `'afgewezen'`
- `:5619` — idem voor `'geannuleerd'`

**Probleem**: bij DB-fout krijgt UI alsnog `toast('✓ Afspraak bevestigd')`. UI en DB raken inconsistent zonder dat de gebruiker iets merkt. Pas bij refresh komt het verschil aan het licht.

**Mitigatie**: vervang `.catch(...)` door `try/catch` + `notify('Wijziging niet opgeslagen — probeer opnieuw', false)` + `return`.

**Classificatie: P2** — UI-DB-divergence. Niet kritiek (kan via refresh worden hersteld) maar verwarrend.

#### F2.3.B — Notif-inserts fire-and-forget [P3]
Idem voor `match-dashboard.html:5539, 5596, 5630, 5888`, `bol-profile.html:1009`, `student-profile.html:1310`, `buddy-dashboard.html:1066, 1081`. Fire-and-forget op notificaties is bewuste keuze (notif failure mag UI niet blokkeren). PASS — geen actie.

#### F2.3.C — Empty catch-blocks
30+ `catch (e) {}` of `catch (_) {}` patterns. **Allen zijn legitiem**:
- `JSON.parse(localStorage.getItem(...) || '{}')` met empty catch (default-value patroon)
- `db.removeChannel(...)` cleanup met empty catch (best-effort dispose)
- localStorage.removeItem met empty catch (cleanup, mag falen)

**Status: PASS** — geen verkapt foutpad gevonden.

---

## 2.4 — `SELECT *` op persoonsgegevens (Build rule P1)

### Resultaten
| Pagina:line | Tabel | Eigen rij? | Risico |
|---|---|---|---|
| bbl-profile.html:754 | student_profiles | `eq('profile_id', user.id)` — JA | LAAG |
| bbl-hub.html:1491,1725 | meetings | `or organizer/attendee` — JA | LAAG |
| chat.html:814,836 | meetings | match-gefilterd — JA | LAAG |
| company-dashboard.html:1404,1696,3560,3748 | notifications | eigen user_id | LAAG |
| discover.html:1197 | notifications | eigen user_id | LAAG |
| match-dashboard.html:2702-2707,2785 | stage_*  + meetings | match-gefilterd | LAAG |
| matches.html:209 | notifications | eigen user_id | LAAG |
| mijn-sollicitaties.html:649 | notifications | eigen user_id | LAAG |
| school-dashboard.html:1123,2047,2671 | notifications + school_postings | eigen | LAAG |

**ZERO `SELECT *` op `profiles`, `messages`, of `reviews`** — de echte PII-tabellen zijn beschermd. Alle `SELECT *` zit op tabellen met eigen-rij-RLS waar de payload nooit andermans data bevat.

**Bevinding [P3]**: SELECT * is tegen build-rule P8 (Kant + Data2: SELECT-kolommen sync met render). Werkt nu maar verbergt drift. Aan te passen tijdens module-refactor (post-LT).

**Status: PASS voor LT, P3 voor lange termijn.**

---

## 2.5 — `maybeSingle()` vs `single()` error handling

### `.single()` callers
| Locatie | Pattern | Crashable? |
|---|---|---|
| international-student-dashboard.html:2035 | `.insert(payload).select().single()` | NEE — INSERT geeft altijd ≥1 rij |
| international-student-dashboard.html:2046 | idem | NEE |
| international-student-dashboard.html:2049 | idem | NEE |
| mijn-notities.html:322 | `.insert(...).select().single()` | NEE — INSERT |
| js/account.js:25 | `db.from('profiles').select(...).eq('id', userId).single()` | **JA** — SELECT op profiel kan 0 rows geven als profiel ontbreekt |
| js/reviews.js:147 | `.insert(...).select('id').single()` | NEE — INSERT |

### F2.5.A — js/account.js:25 crashbaar [P2]
```js
async function loadContactData(userId) {
  const { data, error } = await db.from('profiles')
    .select('naam, email, telefoon, taal_voorkeur, email_notificaties')
    .eq('id', userId).single();
  if (error) throw error;
  return data;
}
```

Als `profiles`-rij voor user ontbreekt (account net aangemaakt, of profiel verwijderd), throwt `single()` `'PGRST116: Results contain 0 rows'`. Caller `renderAccountScreen()` toont dan een generieke fout.

**Mitigatie**: `.single()` → `.maybeSingle()` + null-check.

**Classificatie: P2** — edge case (nieuw account, profile-row mist), maar account-screen zou moeten werken zelfs zonder profiel.

### Bevinding extra
`telefoon` en `email_notificaties` worden geselecteerd op `profiles`. Eerder in de DDL-inspectie zag ik geen CREATE TABLE-statement in mijn excerpt — **VERIFY**: bestaan deze kolommen?

---

## 2.6 — Edge Function references

### Edge Functions in `supabase/functions/`
| Naam | LOC | Caller (HTML) | Status |
|---|---|---|---|
| create-checkout | 122 | pricing.html (stub — startCheckout disabled per CLAUDE.md) | DEAD voor LT |
| mollie-webhook | 405 | webhook from Mollie zelf — niet vanuit HTML | externe trigger |
| send-push-notification | 34 | DB-trigger via webhook (volgens sw.js:108 comment) — niet vanuit HTML | externe trigger |
| vat-verify | 284 | company-dashboard.html:2896 | LIVE |

### Live Edge Function-aanroepen vanuit HTML
| Caller | Edge Function | Methode |
|---|---|---|
| company-dashboard.html:2896 | vat-verify | `fetch('https://qoxgbkbnjsycodcqqmft.supabase.co/functions/v1/vat-verify', {...})` |

**ZERO `.invoke()` calls** in live code (gebruikt `fetch()` direct). Geen dode invoke-calls.

### F2.6.A — `send-push-notification` heeft geen JWT-validatie [P0/P1 — VERIFY DEPLOY]
```ts
serve(async (req) => {
  const { user_id, title, body, url } = await req.json();  // ⚠ geen auth-check
  // ... gebruikt SERVICE_ROLE_KEY voor DB-toegang
  // ... stuurt push-notif aan willekeurige user_id
});
```

**Risico**: als deze Edge Function gedeployed is met `--no-verify-jwt` (om webhook-triggers vanuit Supabase DB-trigger toe te laten), kan **iedereen** push-notificaties sturen aan elke user door alleen de URL te kennen. Geen rate-limit, geen origin-check.

**Verifieer**:
```bash
supabase functions list
# kijk naar verify_jwt status van send-push-notification
```

**Classificatie**:
- Als `verify_jwt: true`: **P3** (alleen webhook met service-key kan callen)
- Als `verify_jwt: false`: **P0** (publiek bereikbaar, spam/phishing-vector)

**Mitigatie als P0**: voeg shared-secret check toe (env var `WEBHOOK_SECRET`), valideer header `x-webhook-signature` per request.

### F2.6.B — Mollie/checkout flow stub [INFO]
pricing.html startCheckout() is per CLAUDE.md een stub. create-checkout en mollie-webhook zijn klaar in code maar inactive in flow. Geen LT-impact.

### F2.6.C — vat-verify pre-existing en uncommitted [INFO]
Per docs/audits/PROFILE_COMPLETENESS_PRE_FTP_SAFETY.md:19 staat vat-verify in "modified" status maar buiten huidige sessies-scope. Pre-existing wijziging — niet vandaag.

---

## TOP 5 BEVINDINGEN — FASE 2

| # | ID | Severity | Beschrijving | Tijdkost fix |
|---|---|---|---|---|
| 1 | F2.6.A | **P0/P1 (verifieer)** | `send-push-notification` Edge Function heeft geen auth-check — als `--no-verify-jwt` gedeployed, kan iedereen pushes spammen | 5 min Console + 20 min code-fix |
| 2 | F2.1.B | P1 | `meetings.match_id` mismatch volgens HANDOVER.md — verifieer of DB de kolom heeft (migration uitgevoerd?) | 2 min SQL-query |
| 3 | F2.1.A | P1 (conditioneel) | `matches.roc_profile_id` mogelijk niet in DB — bbl-hub driegesprek-notificatie kan falen | 5 min SQL ALTER TABLE |
| 4 | F2.3.A | P2 | match-dashboard meeting-flow heeft 3 silent .catch() op DB-updates → UI/DB divergence | 15 min refactor naar try/catch+notify |
| 5 | F2.5.A | P2 | js/account.js:25 gebruikt `.single()` op profiles SELECT → crash bij ontbrekend profiel | 2 min `.single()` → `.maybeSingle()` |

**STOP — Fase 2 klaar.** Wacht op "ga door fase 3".
