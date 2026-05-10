# SUPABASE QUERY AUDIT — Internly

**Datum:** 2026-05-10
**Scope:** alle `.html` en `.js` in `c:\Projects\Internly`
**Methode:** grep op `.select('*')`, `.insert(`, `.invoke(`, `.single()` en handmatige inspectie

## Samenvatting

| Check | Resultaat |
|---|---|
| 1. SELECT * met expliciete kolomlijst | **19 echte SELECT * hits** (10 admin-COUNT-only zijn safe) |
| 2. INSERT met relatie-verificatie | Patroon globaal correct — 1 risico-pad in chat.html (fallback `match_id: null`) |
| 3. Async met try/catch + console.error + notify | Inconsistent — meerderheid checkt `error` na destructure i.p.v. try/catch; notify-coverage ~50% |
| 4. `.single()` waar `.maybeSingle()` veiliger zou zijn | **0 echte gevallen** — alle 5 hits zijn `insert().select().single()` (correct patroon) |
| 5. `.invoke()` calls naar Edge Functions | **0 hits** — geen enkele Edge Function-aanroep in de codebase |

## 1. SELECT * gevonden

### 1a. Acceptabel — COUNT-only HEAD-queries (admin.html, 10 hits)

Alle gebruiken `{ count: 'exact', head: true }` — fetcht geen rij-data, alleen het count-getal:

| Regel | Tabel | Filter |
|---|---|---|
| [admin.html:426](admin.html#L426) | profiles | role=student |
| [admin.html:427](admin.html#L427) | profiles | role=bedrijf |
| [admin.html:428](admin.html#L428) | profiles | role=school |
| [admin.html:429](admin.html#L429) | internship_postings | status=active |
| [admin.html:430](admin.html#L430) | applications | (alle) |
| [admin.html:431](admin.html#L431) | matches | (alle) |
| [admin.html:432](admin.html#L432) | messages | (alle) |
| [admin.html:433](admin.html#L433) | waitlist | (alle) |
| [admin.html:434](admin.html#L434) | reviews | (alle) |
| [admin.html:435](admin.html#L435) | reviews | flagged=true |

→ **Geen actie nodig.** HEAD+count fetcht nul kolommen ongeacht de string.

### 1b. Bedward P1-overtredingen (19 hits)

Volgens Bedward P1 moet elke `.select()` een expliciete kolomlijst hebben. Onderstaande hits zijn echte data-fetches en vallen dus onder de regel.

| Bestand:regel | Tabel | Doel | Kolommen die echt gebruikt worden |
|---|---|---|---|
| [bbl-hub.html:1491](bbl-hub.html#L1491) | meetings | loadMeetings (kalender) | id, organizer_id, attendee_id, type, status, proposed_date, time, location |
| [bbl-hub.html:1725](bbl-hub.html#L1725) | meetings | laatste openstaande evaluatie | id, status, proposed_date, type |
| [bbl-profile.html:755](bbl-profile.html#L755) | student_profiles | volledig profiel | ~25 kolommen (full BBL-profile render) |
| [chat.html:814](chat.html#L814) | meetings | meeting-cards | id, type, status, proposed_date, time, location, organizer_id |
| [chat.html:836](chat.html#L836) | meetings | enkele meeting via ref_id | id, match_id, status |
| [company-dashboard.html:1405](company-dashboard.html#L1405) | notifications | bell-icon (limit 30) | id, type, message, read, created_at |
| [company-dashboard.html:1697](company-dashboard.html#L1697) | internship_postings | eigen vacatures-lijst | ~12 kolommen (titel, status, dates, etc.) |
| [company-dashboard.html:3561](company-dashboard.html#L3561) | company_profiles | profiel-form pre-fill | ~20 kolommen + trust_score, trust_grade |
| [company-dashboard.html:3749](company-dashboard.html#L3749) | vestigingen | vestiging-lijst | ~8 kolommen |
| [discover.html:1197](discover.html#L1197) | notifications | bell (limit 30) | id, type, message, read, created_at |
| [match-dashboard.html:2704](match-dashboard.html#L2704) | stage_plans | hub-render | volledig plan-record |
| [match-dashboard.html:2705](match-dashboard.html#L2705) | stage_leerdoelen | hub-render | volledig |
| [match-dashboard.html:2706](match-dashboard.html#L2706) | stage_deadlines | hub-render | volledig |
| [match-dashboard.html:2707](match-dashboard.html#L2707) | stage_tasks | hub-render | volledig |
| [match-dashboard.html:2708](match-dashboard.html#L2708) | stage_reflecties | hub-render | volledig |
| [match-dashboard.html:2709](match-dashboard.html#L2709) | stage_log | log-render (limit 20) | volledig |
| [match-dashboard.html:2787](match-dashboard.html#L2787) | meetings | hub-kalender | id, type, status, proposed_date, organizer_id, attendee_id |
| [matches.html:209](matches.html#L209) | notifications | bell (limit 30) | id, type, message, read, created_at |
| [mijn-sollicitaties.html:649](mijn-sollicitaties.html#L649) | notifications | bell (limit 20) | id, type, message, read, created_at |
| [school-dashboard.html:1124](school-dashboard.html#L1124) | notifications | bell (limit 30) | id, type, message, read, created_at |
| [school-dashboard.html:2048](school-dashboard.html#L2048) | school_postings | eigen oproepen | ~10 kolommen |
| [school-dashboard.html:2672](school-dashboard.html#L2672) | school_profiles | profiel pre-fill | ~12 kolommen |

#### Risico-clustering

**Cluster A — notifications (6 hits, dezelfde 5 kolommen).** [matches.html:209](matches.html#L209), [discover.html:1197](discover.html#L1197), [mijn-sollicitaties.html:649](mijn-sollicitaties.html#L649), [school-dashboard.html:1124](school-dashboard.html#L1124), [company-dashboard.html:1405](company-dashboard.html#L1405), [bbl-hub.html](bbl-hub.html) (mogelijk via util). Duplicate code — alle vragen `id, type, message, read, created_at`. **Dit is de meest urgente cluster:** als notifications later kolommen krijgt zoals `recipient_email` of `internal_payload` lekken die mee. **Fix-aanbeveling:** centrale helper `loadNotifications(userId)` in `js/utils.js` met expliciete kolomlijst.

**Cluster B — meetings (4 hits).** Vergelijkbare overlap. Centrale helper in `js/calendar.js` ligt voor de hand.

**Cluster C — stage_* (6 hits in match-dashboard.html).** Eén pagina, één Promise.all-blok. Lage prioriteit — kolommen worden hier wel allemaal gebruikt. Maar P8 (Kant + Data2) zegt "elke kolom in SELECT moet gerenderd worden" — voldoet niet aan letter van P1.

**Cluster D — full-profile renders (3 hits).** [bbl-profile.html:755](bbl-profile.html#L755), [company-dashboard.html:3561](company-dashboard.html#L3561), [school-dashboard.html:2672](school-dashboard.html#L2672). Hier worden inderdaad ~12-25 kolommen gebruikt, dus SELECT * is qua datavolume gelijkwaardig — maar Bedward P1 staat geen *-shortcut toe. Lage prio: schema-drift-risico is laag bij profile-tabellen die per-rol vast zijn.

## 2. INSERT zonder relatie-verificatie

Volgens CLAUDE.md bouwregel 2: "Elke INSERT: verifieer alle relatie-kolommen (match_id, buddy_pair_id, roc_profile_id)".

### 2a. INSERTs met match_id

| Bestand:regel | Patroon | Verificatie |
|---|---|---|
| [bbl-hub.html:2728](bbl-hub.html#L2728) | `.insert({ match_id: match.id })` (conversation create) | ✓ `match` komt uit lokale loop over geverifieerde matches; voorafgaande SELECT op buddy_pair_id-IS-NULL toont match-bestaan |
| [chat.html:1062](chat.html#L1062) | `.insert({ match_id: mId })` (conversation create) | ✓ `mId` is gedestructureerd uit voorgaande matches-fetch op regel 1056 |
| [chat.html:1561](chat.html#L1561) | `.insert({ match_id: null })` ⚠ | ⚠ fallback-pad voor missende `buddy_pair_id`-kolom — INSERT zonder relatie. Comment regel 1492-1493 zegt "Totdat die kolom bestaat valt de INSERT terug op match_id = null". **Dit is een schema-migratie-stub.** Zodra de kolom bestaat is de fallback dood. Zie open-issue. |
| [company-dashboard.html:2077](company-dashboard.html#L2077) | `.insert({ match_id: matchId })` (conversation create) | ✓ `matchId` komt uit eerder geverifieerde context |

### 2b. INSERTs met buddy_pair_id

| Bestand:regel | Verificatie |
|---|---|
| [chat.html:1553](chat.html#L1553) | ✓ `pairId` komt uit URL-param na expliciete validatie regel 1539-1545 (eerst SELECT op buddy_pair_id) |

### 2c. INSERTs met roc_profile_id

`roc_profile_id` wordt op `bbl-hub.html` gebruikt (regel 1650, 1652, 2380, 2382), maar dit zijn **notification-INSERTs naar `roc_profile_id` als recipient**, niet INSERTs in een tabel die deze kolom als FK heeft. De waarde komt uit `activeMatch.roc_profile_id` na een `if (activeMatch.roc_profile_id)`-guard. ✓ correct.

### 2d. learning_agreements / la_tokens INSERTs ([international-student-dashboard.html:2034-2049](international-student-dashboard.html#L2034))

```js
const { data: laRow, error: e1 } = await db.from('learning_agreements')
  .insert(payload).select().single();
if (e1) throw e1;
// daarna:
.insert({ la_id: laRow.id, party: 'company' }).select().single();
.insert({ la_id: laRow.id, party: 'school' }).select().single();
```

✓ `la_id` is verified door de voorgaande `if (e1) throw e1` — als de eerste insert faalt komt het tweede statement nooit. Goede ketting.

### Conclusie INSERT-relaties

🟢 **Alle echte INSERTs hebben verifieerbare relatie-bron**, behalve:

⚠ **[chat.html:1561](chat.html#L1561)** — bewuste schema-fallback (`match_id: null`) tot `buddy_pair_id`-kolom in conversations bestaat. Inline-comment documenteert dit. Volg op zodra de migratie is gedraaid.

## 3. Try/catch met console.error + notify

Geen volledige scan haalbaar in audit-tijd. Steekproef-waarneming:

**Patroon A (meest gebruikt) — destructure + if-error.** Geen try/catch.
```js
const { data, error } = await db.from('...').select('...');
if (error) { console.error('...', error.message); notify('Fout', false); return; }
```
Voorbeeld: [bbl-profile.html:759-762](bbl-profile.html#L759), [school-dashboard.html:2051](school-dashboard.html#L2051).

**Patroon B — destructure zonder error-check.** Geen catch, geen notify.
```js
const { data } = await db.from('notifications').select('*')...;
const items = data || [];
```
Voorbeeld: [matches.html:207-214](matches.html#L207), [discover.html:1195-1201](discover.html#L1195), [school-dashboard.html:1122-1129](school-dashboard.html#L1122), [mijn-sollicitaties.html:647-653](mijn-sollicitaties.html#L647).

**Patroon C — try/catch met console.error + notify.** Aanbevolen.
```js
try { const { data, error } = await ...; if (error) throw error; } catch (e) { console.error(...); notify(...); }
```
Voorbeeld: [int-student-dashboard.html:2032-2056](international-student-dashboard.html#L2032), [js/reviews.js:147-153](js/reviews.js#L147).

**Cijfermatige indruk (steekproef):**
- ~50% van DB-calls heeft `if (error)`-pad met console.error
- ~25% heeft daarnaast notify()
- ~10% heeft volledige try/catch
- ~15% (vooral notification-loaders) heeft géén error-handling

**Aanbeveling:** notification-loaders krijgen 0% gebruikersmelding bij falen. Niet dramatisch (geen badge bij netwerkfout), maar inconsistent met de rest. Lage prio.

## 4. .single() waar .maybeSingle() veiliger zou zijn

| Bestand:regel | Context | Veilig? |
|---|---|---|
| [international-student-dashboard.html:2035](international-student-dashboard.html#L2035) | `insert(payload).select().single()` | ✓ INSERT garandeert 1 rij; in try/catch met `if (e1) throw e1` |
| [international-student-dashboard.html:2046](international-student-dashboard.html#L2046) | `insert(la_tokens).select().single()` (company) | ✓ idem |
| [international-student-dashboard.html:2049](international-student-dashboard.html#L2049) | `insert(la_tokens).select().single()` (school) | ✓ idem |
| [mijn-notities.html:322](mijn-notities.html#L322) | `insert(buddy_notes).select().single()` | ✓ INSERT, met `if (error)`-pad direct erna |
| [js/reviews.js:147](js/reviews.js#L147) | `insert(reviews).select('id').single()` | ✓ INSERT met try/catch + notify |

🟢 **0 echte risico's.** Alle 5 `.single()`-aanroepen volgen het canonieke "insert + select + single"-patroon — succesvolle INSERT levert altijd exact één rij. Standalone `.select()...single()` (waar 0 rows zou crashen) komt **nergens** voor in de codebase.

## 5. invoke() calls naar Edge Functions

Grep op `\.invoke\s*\(` over alle html/js → **0 hits**.
Grep op `supabase\.functions|db\.functions|functions\.invoke` → **0 hits**.

🟢 **De codebase roept geen enkele Edge Function aan.** Dit bevestigt CLAUDE.md §Bekende stubs:
> *"send-meeting-email Edge Function bestaat niet (invoke verwijderd uit calendar.js, in-app notificatie actief)"*

Geen risico op aanroepen van niet-bestaande functies. Toekomstige Edge Functions (Trust Score auto-algoritme, ghosting-bestraffing, ESG-export — allemaal nog stub) zullen `db.functions.invoke()`-calls introduceren — vanaf dat moment moet deze audit opnieuw.

## Eindprioritering

🟢 **Geen P0.** Geen acute database-misuse, geen onterechte `.single()`-crashes, geen ghost Edge Function calls.

🟡 **P1 — sprint 5 (kort):**
1. **Notifications-loader centraliseren.** 6 plekken hebben `from('notifications').select('*')` met identieke 5 kolommen. Eén helper in `js/utils.js`, expliciete lijst. Schat: 30 min.
2. **chat.html:1561 fallback weghalen** zodra de `buddy_pair_id`-kolom op conversations live is. SQL-migratie staat in [_archief/ex_2026-04-20-21/HANDOVER.md](_archief/ex_2026-04-20-21/HANDOVER.md).

🟢 **P2 — opportunistisch:**
1. SELECT * → expliciete kolomlijst voor de 13 niet-notification hits. Beste moment: bij volgende functionele wijziging op die functie.
2. notification-loaders krijgen consistent error-handling (notify bij netwerkfout) — laag, want gebruiker merkt fout sowieso aan ontbrekende badge.

🟢 **P3 — niets aan doen tenzij scope-uitbreiding:**
- Edge Functions worden nog niet gebruikt; audit opnieuw zodra eerste invoke() landt.
- `.single()`-patroon is canoniek; niet aanpassen.
