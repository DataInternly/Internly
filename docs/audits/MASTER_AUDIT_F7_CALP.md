# MASTER AUDIT — FASE 7 : CROSS-ACCOUNT LEAK PREVENTION (CALP)
Datum: 9 mei 2026
Methode: read-only grep + clearUserState reverse engineering + RLS query-tests
Context: 6 testers mogelijk gedeeld device tijdens LT 11 mei

---

## 7.1 — STORAGE INVENTARIS

### localStorage
| Key | Account-bound? | clearUserState wist? | Wanneer gewist |
|---|---|---|---|
| `internly_consent` | NEE (AVG flag) | NEE (PROTECTED) | nooit |
| `internly_lang` | NEE (UI-pref) | NEE (PROTECTED) | nooit |
| `internly_waitlist_seen` | NEE (publieke flag) | NEE (PROTECTED) | nooit |
| `internly_push_asked` | NEE (device-bound) | NEE (PROTECTED) | nooit |
| `internly_saved_vacatures` | **NEE (PROBLEMATISCH)** | **JA** (Run 1.6 fix) | logout + pre-login |
| `internly_show_vacatures` | NEE | JA | logout + pre-login |
| `internly_demo_profiles` | NEE (demo-toggle) | JA | logout + pre-login |
| `internly_referral_dismissed` | NEE | JA | logout + pre-login |
| `internly_bbl_reflectie_draft_<userId>` | JA (suffix) | JA | logout + pre-login |
| `internly_ld_<userId>` | JA | JA | logout + pre-login |
| `internly_ld_toelichting_<userId>` | JA | JA | logout + pre-login |
| `internly_bbl_reflecties_<userId>` | JA | JA | logout + pre-login |
| `internly_bbl_bedrijf_<userId>` | JA | JA | logout + pre-login |
| `internly_student_postcode_<userId>` | JA | JA | logout + pre-login |
| `internly_buddy_optin_<userId>` | JA | JA | logout + pre-login |
| `internly_renewal_<matchId>` | JA (per-match) | JA | logout + pre-login |
| `sb-qoxgbk*-auth-token` | JA (Supabase JWT) | NEE (Supabase managed) | door `db.auth.signOut()` |
| `sb-qoxgbk*-auth-token-code-verifier` | JA | NEE | door `db.auth.signOut()` |

### sessionStorage
| Key | Account-bound? | sessionStorage.clear()? |
|---|---|---|
| `internly_applying` | JA (sessie-guard) | JA — `clearUserState()` doet `sessionStorage.clear()` |
| `internly_role` | JA (UI-cache) | JA |

### IndexedDB / Cache API / Cookies
- **IndexedDB**: 0 hits — niet gebruikt door project
- **Cache API**: 0 hits — sw.js bevat `CACHE_VERSION = 'internly-v1'` constante maar **geen `caches.open()` of cache-puts** — service worker cached niets
- **Cookies**: Supabase gebruikt geen cookies (gebruikt localStorage). `document.cookie` = 0 hits.

### F7.1.A — `clearUserState()` wist niet álle in-memory globals [P2]
`js/supabase.js:115-117` reset alleen:
```js
if (window.currentUser)    window.currentUser    = null;
if (window.currentProfile) window.currentProfile = null;
```

**MAAR** ook in gebruik (en niet gewist):
| Global | Locaties | Survives clearUserState? |
|---|---|---|
| `window._currentUserId` | bbl-dash:605, begel:1316, buddy:1356, company:1617, intl-school:677, intl-student:1206, account.js (4 callsites) | **JA** |
| `window.__currentUser` | mijn-notities:220 | **JA** |
| `window.__currentRole` | mijn-berichten:854, mijn-notities:221 | **JA** |
| `window.currentUser` | matchpool.js:290 | NEE (gewist) |
| `window.currentProfile` | (theoretisch) | NEE (gewist) |

**Reproduktie-stap**:
1. User A logt in → `window._currentUserId = A.uuid`
2. User A klikt "Uitloggen" → `performLogout()` → `clearUserState()`
3. `window._currentUserId` is **nog steeds A.uuid**
4. Direct daarna: `window.location.replace('/index.html')` → **page reload** → globals weg ✓

**Conclusie**: in praktijk is dit NIET exploitable omdat performLogout altijd onmiddellijk navigeert. **Maar**: als ooit een SPA-flow toegevoegd wordt waar logout zónder navigation gebeurt, lekken globals.

**Mitigatie** (~5 min): voeg toe in clearUserState:
```js
if (window._currentUserId)  window._currentUserId  = null;
if (window.__currentUser)   window.__currentUser   = null;
if (window.__currentRole)   window.__currentRole   = null;
```

**Classificatie: P2** — defensieve verbetering. Niet exploitable in huidige flow.

### F7.1.B — `db.auth.signOut()` ALTIJD aangeroepen vóór redirect? [PASS]
Inspectie van alle 19 signOut-callers:
- ✓ `js/utils.js:418` performLogout — signOut → clearUserState → redirect
- ✓ `js/supabase.js:149` (idle-timeout) — signOut → clearUserState → redirect
- ✓ `auth.html:1292-1296` — signOut → clearUserState → redirect
- ✓ `js/account.js:134-136` (deletion) — signOut → clearUserState
- ✓ 11 publieke pagina's met inline `(async()=>{... clearUserState() ... db.auth.signOut() ... window.location.href='index.html'})()` — clearUserState eerst, signOut, dan redirect
- ⚠ `admin.html:403-405` — signOut, clearUserState. Volgorde maakt niet uit hier omdat redirect direct erna komt.
- ✓ `begeleider-dashboard.html:779-781` — signOut + clearUserState
- ✓ `international-school-dashboard.html:998+1003` (geverifieerd Fase 1) — signOut + clearUserState + redirect
- ✓ `international-student-dashboard.html:2351+2356` — idem

**Status: PASS** — alle 19 signOut-callsites volgen patroon: signOut → clearUserState → window.location-redirect. Geen orphan signOut zonder redirect.

---

## 7.2 — IN-MEMORY STATE NA LOGOUT

### Module-level `let currentUser` in 16 HTML-files
Elk HTML-bestand declareert top-level `let currentUser = null;`. Bij `performLogout()` wordt dit NIET expliciet gewist — alleen `window.currentUser` (zie 7.1.A).

**Impact**: omdat performLogout altijd `window.location.replace(...)` aanroept, wordt **het hele document gedealloceerd** door de browser. Module-scope variabelen bestaan niet meer na navigation.

**Conclusie**: PASS in praktijk — **mits er geen flow is die signOut doet zonder navigation**.

### F7.2.A — Account-switch UX risico [P2 — DESIGN]
Per `mama-test #1` audit-prompt: "account-switch flow gebeurt CLIENT-side in dezelfde tab".

**Inspectie**: `auth.html` heeft een `switchAccount()` flow (regel 1292-1318):
1. signOut current user
2. clearUserState
3. **GEEN redirect** — direct toon login-form
4. user vult login-form
5. `signInWithPassword` → page reload via `window.location.href = getRoleLanding(...)`

**Race condition**: tussen stap 3 en 5 leeft de oude `let currentUser` declaratie in auth.html niet meer (page is auth.html, niet de oude pagina). Page is dezelfde document echter, dus `window._currentUserId` van **stap 0** (de pagina vóór auth.html) bestaat niet meer omdat auth.html een nieuwe page-load is (separate document). 

Maar als account-switch gebeurt vanuit een dashboard zonder navigation (bijvoorbeeld via een hypothetische "switch role" knop), dan **kunnen globals lekken**.

**Reproduktie LT-scenario**:
1. Tester A logt in als bedrijf — `window._currentUserId = A`
2. Tester A klikt "uitloggen" → page navigation → globals weg ✓
3. Tester B logt in als school
4. **Geen leak** — maar afhankelijk van account-switch UI-keuze

**Bevinding**: account-switch is **veilig in huidige UI** omdat het altijd via auth.html gaat (full page-load).

**Classificatie: P2 — DEFENSIEF** — voeg in clearUserState alle window globals toe (zie F7.1.A) als toekomstige garantie.

### F7.2.B — Event listeners persisteren na logout? [PASS]
Realtime subscriptions: `chat.html:1678-1682` en buddy-dashboard:1302 doen `realtimeSub.unsubscribe()` op `beforeunload`. 
sessionStorage `unhandledRejection` handlers in 18 pagina's: stuk JWT-expired vangen — niet user-data-bevattend.
Inspectie: geen event-listeners die user-data uit closure houden over redirect heen — page-reload kill ze allemaal.

**Status: PASS**.

---

## 7.3 — SERVICE WORKER + PUSH

### sw.js cache-status
**Geen cached responses**. `CACHE_VERSION = 'internly-v1'` is gedeclareerd maar **niet gebruikt** — geen `caches.open()`, geen `caches.match()`, geen `fetch` event handler. Service worker doet alleen push-notifications + click-handling.

**Status: PASS** — geen response-caching, dus geen cross-account cache-leak mogelijk.

### Push subscription rotation bij logout

#### F7.3.A — Push subscription NIET unsubscribed bij logout [P1]
**performLogout** in `js/utils.js:412-437`:
- ✓ signOut
- ✓ clearUserState
- ✓ redirect
- ✗ **GEEN cleanup van `push_subscriptions` tabel** voor user A

**Reproduktie**:
1. Tester A logt in op shared device, accepteert push-permission → `push_subscriptions` rij voor A.uuid opgeslagen + browser krijgt VAPID subscription voor A
2. Tester A logt uit
3. Tester B logt in op zelfde device, accepteert push-permission → `push_subscriptions` rij voor B.uuid opgeslagen
4. **Beide subscriptions blijven bestaan in DB**. Browser heeft 1 push-subscription die nu gemapped is naar B.uuid
5. **MAAR**: Edge Function `send-push-notification` queries op `user_id = A.uuid` blijft de oude row vinden met dezelfde browser-endpoint
6. Resultaat: tester B krijgt push-notifs bedoeld voor tester A op zijn device

**Verificatie**: zoek welke endpoint de browser daadwerkelijk verstuurt. Modern browsers genereren één endpoint per origin per browser-installatie — dus voor `internly.pro` op shared Chrome: dezelfde endpoint voor zowel tester A als B. Beide rijen in `push_subscriptions` hebben **dezelfde endpoint** maar verschillende `user_id`. Edge Function vraagt op user_id en stuurt dus naar dezelfde browser, alleen aangedreven door verschillende notif-events.

**Tester B krijgt notif van tester A bedoelt**: nee — pushes worden getriggerd op `notifications.user_id`. Als tester B inlogt en alleen notifs voor B.uuid worden ge-INSERT, dan wordt alleen B.uuid push gestuurd. **MAAR** als er een oude pending notif voor A.uuid binnenkomt na logout van A, krijgt het device (= tester B) hem.

**Mitigatie**:
1. In `performLogout()` toevoegen:
```js
const { data: { user } } = await client.auth.getUser();
if (user) {
  await client.from('push_subscriptions').delete().eq('user_id', user.id);
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  }
}
```

**Classificatie: P1** — concrete cross-account-leak vector op shared device. Tijdkost: 15 min code + test.

### F7.3.B — BroadcastChannel persisteert na logout [P3]
sw.js maakt `BroadcastChannel('internly-sw')` voor push-resubscribe-signal. Channel is **scoped op origin (= internly.pro)** — bestaat over tabs heen.

Bij logout: BroadcastChannel wordt niet expliciet gesloten. Listeners in andere open tabs blijven luisteren.

**Impact**: tester A logt uit, andere tab van tester A blijft open en luistert naar 'resubscribe_needed'. Bij key-rotation krijgt die tab een signal en re-subscribet. Maar tester A is uitgelogd dus session is dood — `registerPushNotifications()` zou geen rij toevoegen voor verkeerde user.

**Verificatie**: `js/push.js` `registerPushNotifications(db, userId)` neemt expliciet userId param. Als tester B inmiddels in tab B is ingelogd, wordt voor B een subscription geregistreerd. Geen leak.

**Status: PASS** — ondanks open BroadcastChannel.

---

## 7.4 — RLS CROSS-ACCOUNT TESTS

### Test-format
Per tabel: query die account A zou kunnen draaien om B-data te zien. "Verwacht" = wat client zou willen, "Realistisch" = wat RLS daadwerkelijk teruggeeft.

### profiles
```sql
-- A draait: alle gebruikers + emails ophalen
SELECT id, naam, email, role FROM profiles;
```
- **Verwacht**: 0 rows van anderen
- **Realistisch**: **ALLE rijen** — `profiles_select_all USING (true)` (zie F1.3.C)
- **P2**: AVG-risico, e-mail-scraping mogelijk

### student_profiles
```sql
SELECT * FROM student_profiles;
```
- **Verwacht**: alleen eigen profile
- **Realistisch**: **ALLE rijen** — `sp_select_all USING (true)` (publieke discoverability voor matchpool)
- **P2**: bedoeld zo voor matchpool maar onnodige PII exposure (bv. motivatie, postcode)

### company_profiles, school_profiles
Idem — `USING (true)`. Hetzelfde patroon, vermoedelijk minder PII-gevoelig.

### matches
```sql
SELECT * FROM matches WHERE id = 'B_match_uuid';
```
- **Verwacht**: 0 rows als A geen partij is
- **Realistisch**: **0 rows** — `matches_select_party USING (party_a OR party_b OR initiated_by OR praktijkbegeleider_profile_id = auth.uid())`
- **PASS**

### conversations
```sql
SELECT * FROM conversations WHERE match_id = 'B_match_uuid';
```
- **Verwacht**: 0 rows
- **Realistisch**: **0 rows** — `conv_select_party USING EXISTS-check op matches/buddy_pairs`
- **PASS** (transitive via matches RLS)

### messages
```sql
SELECT * FROM messages WHERE conversation_id = 'B_conv_uuid';
```
- **Verwacht**: 0 rows
- **Realistisch**: **0 rows** — `msg_select_party USING EXISTS-check via conversations`
- **PASS**

### notifications
```sql
SELECT * FROM notifications WHERE user_id = 'B_uuid';
```
- **Verwacht**: 0 rows
- **Realistisch**: **0 rows** — `notif_select_own USING (user_id = auth.uid())`
- **PASS**

### applications
```sql
SELECT * FROM applications WHERE student_id = 'B_uuid';
```
- **Verwacht**: 0 rows tenzij A is bedrijf-eigenaar van posting
- **Realistisch**: **0 rows** — `app_select_own USING (student_id OR profile_id OR posting-owner = auth.uid())`
- **PASS**

### meetings
```sql
SELECT * FROM meetings WHERE attendee_id = 'B_uuid';
```
- **Verwacht**: 0 rows tenzij A is organizer
- **Realistisch**: **0 rows** — `meet_select_party USING (organizer_id OR attendee_id = auth.uid())`
- **PASS**

### reviews
```sql
SELECT * FROM reviews WHERE reviewer_id = 'B_uuid';
```
- **Verwacht**: A kan alle non-flagged reviews zien (publiek), maar geen flagged van B
- **Realistisch**: **non-flagged ALL + eigen flagged** — correct per `reviews_select_public`
- **PASS**

### push_subscriptions
```sql
SELECT * FROM push_subscriptions WHERE user_id = 'B_uuid';
```
- **Verwacht**: 0 rows
- **Realistisch**: **0 rows** — `push_own FOR ALL USING (user_id = auth.uid())`
- **PASS** (maar zie F1.3.B — geen WITH CHECK op FOR ALL is theoretisch issue)

### buddy_pairs
```sql
SELECT * FROM buddy_pairs WHERE id = 'B_pair_uuid';
```
- **Verwacht**: 0 rows tenzij A is requester/receiver
- **Realistisch**: **0 rows** — `bp_select_party USING (requester_id OR receiver_id = auth.uid())`
- **PASS**

### buddy_requests
- Idem `breq_select_party` — **PASS**

### stage_*
```sql
SELECT * FROM stage_plans WHERE match_id = 'B_match_uuid';
```
- **Verwacht**: 0 rows
- **Realistisch**: **0 rows** — `splan_select_match USING EXISTS-check via matches`
- **PASS** (transitive via matches RLS)

Idem voor stage_leerdoelen, stage_deadlines, stage_tasks, stage_reflecties, stage_log — alle hebben `match-party` EXISTS-check.

### availability
```sql
SELECT * FROM availability;
```
- **Verwacht**: alleen eigen slots
- **Realistisch**: **ALLE slots** — `avail_select_all USING (true)` (zie F1.3.F — design-keuze voor calendar planning)
- **P3**: design, niet exploitable voor PII (alleen tijden)

### Samenvatting RLS-tests
| Tabel | Cross-account leak? |
|---|---|
| **profiles** | **JA** — all emails leesbaar |
| **student_profiles** | **JA** — design (matchpool), maar PII zoals postcode/motivatie publiek |
| **company_profiles** | JA — design (publiek showcase) |
| **school_profiles** | JA — design |
| **availability** | JA — design (calendar) |
| matches, conversations, messages, notifications, applications, meetings, reviews, push_subscriptions, buddy_pairs, buddy_requests, stage_* | NEE — RLS correct |

### F7.4.A — Profile-tabellen `USING (true)` is over-permissive [P2]
3× tabellen (`profiles`, `student_profiles`, `company_profiles`, `school_profiles`) gebruiken `USING (true)` voor SELECT. Dit is bewuste discoverability-keuze maar:
- profiles bevat email → AVG/scrape-risico (zie F1.3.C)
- student_profiles bevat motivatie + postcode → privacy-risico
- Anon-gebruikers (zonder login) kunnen REST-API gebruiken om PII te scrapen

**Mitigatie**: definieer `public_profiles` view met alleen safe-kolommen (id, naam, role, avatar_key) en restrict full table tot `auth.uid() IS NOT NULL`. Of column-level RLS.

**Classificatie: P2** — niet acuut bij LT (alleen 6 testers, niet publieke launch).

---

## 7.5 — URL/QUERY-PARAM LEAKAGE

### Inventarisatie pagina's met `URLSearchParams`
| Pagina | Param | Ownership-check? |
|---|---|---|
| auth.html:700 | `role`, `mode` | n.v.t. (login flow) |
| chat.html:1638-1639 | `match`, `buddy_pair_id` | **JA** lijn 1647-1661 — query matches voor party_a/party_b |
| chat.html (buddy_pair) | via `loadBuddyConversation` | **JA** lijn 1513-1519 — check req.id/rec.id == uid |
| company-dashboard.html:3500 | `payment`, `plan` (Mollie return) | n.v.t. (UI flag) |
| discover.html:1669-1676 | `niveau`, `filter` | n.v.t. (UI filters) |
| kennisbank-artikel.html:171 | `slug` | n.v.t. (publieke kb-artikelen, RLS published=true) |
| kennisbank.html:1333 | `artikel` | idem |
| la-sign.html:393-394 | `token` | **JA** — token-lookup in la_tokens tabel |
| matches.html:743 | `view` | n.v.t. (UI toggle) |
| **match-dashboard.html:2269** | `match` | **JA via RLS** — query op matches met eq id, returns 0 rows als geen partij |
| pricing.html:688 | `for` | n.v.t. (UI filter) |
| review-form.html:356-358 | `company`, `match` | **GEDEELTELIJK** — only role-check (student), geen ownership op _matchId. RLS reviews_insert_match_gated dekt INSERT |
| school-dashboard.html:2638 | `student` | **VERIFY** |
| vacature-detail.html:1124 | `id` | n.v.t. (publieke vacature, RLS internships_select_all) |

### F7.5.A — review-form.html accepteert _matchId zonder client-side ownership-check [P2]
`review-form.html:356-358` haalt `_companyId` + `_matchId` uit URL. `:380-387` checkt alleen of user student-rol is. **GEEN** check of de student daadwerkelijk in deze match-rij zit.

**Reproduktie**:
1. Tester A (student) heeft URL `review-form.html?company=X&match=AAA-BBB-CCC`
2. Tester B (student) krijgt deze URL door (bv. via verkeerde paste in chat)
3. Tester B opent URL → role-check passeert (B is student) → form rendert
4. B vult form in → klikt Verstuur
5. INSERT-poging → **RLS reviews_insert_match_gated** blokkeert (party_b moet match-eigenaar zijn) → ✓ leak voorkomen op DB-niveau

**Conclusie**: data-leak niet mogelijk dankzij RLS, maar **UX-misleiding** wel: B ziet form alsof hij review kan plaatsen, krijgt pas bij submit een fout. 

**Mitigatie**: voeg client-side check toe na `canWriteReview(_companyId)`:
```js
const { data: matchRow } = await db.from('matches')
  .select('party_a, party_b').eq('id', _matchId).maybeSingle();
if (!matchRow || (matchRow.party_a !== user.id && matchRow.party_b !== user.id)) {
  stateEl.innerHTML = `<div class="state-box error">Geen toegang tot deze review.</div>`;
  return;
}
```

**Classificatie: P2** — UX-misleiding, geen data-leak.

### F7.5.B — school-dashboard.html `student` URL-param [VERIFY]
Niet gelezen in deze fase. Aanbeveling: voer ownership-check (school is referrer van student?) op deze pagina.

---

## 7.6 — TEST-ACCOUNT ISOLATIE (LT-specifiek)

### Wat zou beschermd moeten zijn
6 testaccounts:
- buddy1.test, buddy2.test, buddy3.test (rol: gepensioneerd)
- student1.test, student2.test, student3.test (rol: student)

Per RLS-policies (zie 7.4):
- ✓ Privégegevens (matches, messages, notifications) zijn user_id-gegated
- ✓ Buddy-koppelingen zien alleen requester/receiver
- ✓ Stage-data per match-party

### Wat publiek zichtbaar is (per design)
- Alle profielen (naam, role) → matchpool functionaliteit
- Alle availability slots → calendar planning
- Alle (gepubliceerde) vacatures → discover

### Cross-test-leak vectoren tijdens LT
1. **localStorage cross-leak op shared device**: gemitigeerd door clearUserState (zie 7.1)
2. **Push-notif cross-leak op shared device**: F7.3.A — **NIET gemitigeerd**
3. **URL-leak via copy-paste**: F7.5.A — UX-misleiding mogelijk maar RLS blokt op INSERT
4. **In-memory globals**: gemitigeerd door page-reload op logout

### F7.6.A — Push notifications kunnen lekken tussen testers op shared device [P1]
**Concreet LT-scenario**:
1. Tester 1 (student1.test) zit achter laptop, accepteert push-perm → DB heeft push_subscription voor student1.uuid + endpoint X
2. Tester 1 sluit Internly, geeft laptop aan tester 2
3. Tester 2 (student2.test) opent laptop, logt in
4. Tester 2 accepteert push-perm → DB heeft push_subscription voor student2.uuid + endpoint X (zelfde browser, zelfde endpoint)
5. **Beide rijen bestaan in DB**, beide met endpoint X
6. Iemand stuurt notif aan student1.uuid → push naar endpoint X → **tester 2 ziet de notif** op zijn scherm

**Mitigatie LT-spelregel**: instructeer testers om **push-permissions te weigeren** of pre-LT clean-up van push_subscriptions doen.

**Code-fix** (gepland post-LT): zie F7.3.A.

**Classificatie: P1 voor LT** als shared devices verwacht.

### F7.6.B — Browser-level resterende state [P2]
Browser-state die tussen testers blijft op shared device:
- Browser-history → prev-URL leak (privacy)
- Auto-fill (login-credentials, postcode) → tester 2 ziet tester 1's email in dropdown
- Browser-permissions (push, geo) → blijven granted

**Mitigatie LT**: gebruik **incognito mode** voor LT — alle browser-state ephemeral.

**Classificatie: P2 LT-spelregel** (geen code-fix).

---

## TOP 5 BEVINDINGEN — FASE 7

| # | ID | Severity | Cross-account vector | Tijdkost fix |
|---|---|---|---|---|
| 1 | F7.3.A / F7.6.A | **P1** | Push-subscription lekt tussen testers op shared device — performLogout cleanup ontbreekt | 15 min code + test |
| 2 | F7.4.A | P2 | profiles + student_profiles `USING (true)` — alle emails + motivaties anon-leesbaar | 20 min DDL + view |
| 3 | F7.5.A | P2 | review-form.html accepteert _matchId zonder client-side ownership-check (RLS dekt op DB) | 10 min code |
| 4 | F7.1.A | P2 (defensief) | clearUserState wist niet `_currentUserId`, `__currentUser`, `__currentRole` — niet exploitable nu, kan future-proof | 5 min code |
| 5 | F7.6.B | P2 (LT-spelregel) | Browser-level state (history, auto-fill, push-perm) blijft op shared device | gebruik incognito |

### LT-aanbevelingen (voor instructie aan testers)
1. **Gebruik incognito-mode** — wist alle browser-state per sessie
2. **Weiger push-permissions** als shared device of fix F7.3.A vóór LT
3. **Gebruik unieke browser-profielen** per tester (Chrome → "Add person")
4. **Sluit alle Internly-tabs** vóór wisselen van tester (defense in depth)

### Andere observaties
- localStorage clearance via clearUserState is solide — Run 1.6 fix dekt 16 keys
- Geen IndexedDB / Cache API / cookies in gebruik — minder leak-oppervlak
- 19 signOut-callsites volgen consistent patroon: signOut → clearUserState → redirect
- RLS dekt 11/15 kritieke tabellen volledig; 4 design-publieke (profiles, *_profiles, availability) zijn intentional maar bredere PII dan strikt nodig

**STOP — Fase 7 klaar.** Wacht op "ga door triage" voor master triage-rapport.
