# Garcia2 — Data Forensics
**Datum**: 22 april 2026
**Rol**: Garcia2 — Technisch diep. Welke data kan wie zien? Ik wil queries, geen aannames.
**Scope**: Live DB RLS audit — welke operaties slagen voor een geanuthentiseerde of anonieme gebruiker op data die niet van hen is?
**Instructie**: READ-ONLY analyse.

---

## Methodologie en disclaimer

### Geprobeerd: live Supabase REST API queries via curl

Alle queries retourneerden `HTTP 000` (geen verbinding). De sandbox-omgeving heeft geen uitgaand netwerk. Curl naar `https://supabase.com` en `https://google.com` gaven identiek HTTP 000.

**Consequentie**: Live DB is niet bereikbaar vanuit deze omgeving. Garcia2 werkt op basis van:
1. Code-grep op alle client-side DB-calls
2. Inferentie van RLS-gedrag op basis van query-patronen
3. Expliciete vermelding van "ONVERIFIEERBAAR" waar code-grep de RLS-toestand niet kan bepalen

Dit is consistent met Regel 2: "Als iets 'ontbreekt' lijkt, verifieer eerst." De RLS-status is hier niet bevestigd, alleen geïnfereerd.

**Aanbeveling voor Barry**: Voer de pg_policies query uit in Supabase Console SQL-editor:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```
Dit geeft de volledige RLS-staat in één overzicht.

---

## Tabel-voor-tabel analyse

### profiles

**Code-patroon**: queries filteren vrijwel altijd op `auth.uid()` via `.eq('id', userId)` of via een joined foreign key.

**Anon SELECT**: code laadt nooit profielen zonder auth check. Geen patroon gevonden van publieke profiel-SELECT zonder filter.

**Cross-user SELECT**: admin.html:481 leest `company_profiles` zonder user-filter — maar admin.html heeft een auth-check bij load (Barry's privé-pagina). Of er ook een server-side RLS-check is die admin-access valideert: **ONVERIFIEERBAAR**.

**Risico**: Als `profiles` geen RLS heeft op SELECT, kan elk ingelogd account alle profielen lezen. Implicatie: alle namen, rollen, en contactinfo zijn scrapebaar met de anon-key + een geldig sessietoken.

**Ernst**: HOOG als SELECT niet beperkt is.

---

### applications

**Code-patroon**:
- student-kant (mijn-sollicitaties.html:494): `.from('applications').eq('student_id', currentUserId)` — filtered
- bedrijf-kant (company-dashboard.html): `.from('applications').eq('posting_id', postingId)` — filtered op eigen vacature
- admin.html:369: `.from('applications').select('*', { count: 'exact', head: true })` — ongefiltered COUNT

**Cross-user scenario**: Als RLS alleen de `WHERE student_id = auth.uid()` filter op SELECT afdwingt, kan een bedrijfsgebruiker tóch sollicitaties lezen via de `posting_id`-query — maar alleen voor eigen vacatures. Dit is bedoeld gedrag.

**Attacker scenario**: Een student die de POST-body van een sollicitatie-insert manipuleert om `student_id` van een andere student in te vullen. Dit werkt alleen als RLS INSERT niet afdwingt dat `student_id = auth.uid()`.

**Ernst**: MIDDEL — afhankelijk van INSERT-policy op applications.

---

### notifications

**Code-patroon (utils.js:358)**:
```javascript
const { error } = await client.from('notifications').insert({
  user_id: userId,
  type, ref_id, ref_type, message
});
```

`userId` is een parameter. De caller (bijv. createNotification(victimId, ...)) bepaalt de target. De `client` is de authenticated db-client van de aanroeper.

**Kritisch scenario: notificatie-spoofing**

Als de `notifications`-tabel een INSERT-policy heeft van de vorm:
```sql
-- Zwakke policy:
FOR INSERT TO authenticated USING (true);
```

Dan kan elke ingelogde gebruiker een notificatie INSERT doen voor willekeurige `user_id`. Via de browser-console:
```javascript
const db = window.supabase.createClient(window.__SUPABASE_URL, window.__SUPABASE_ANON_KEY);
await db.auth.signInWithPassword({ email: 'eigen@email.nl', password: '...' });
await db.from('notifications').insert({
  user_id: 'TARGET_UUID',
  type: 'new_match',
  ref_id: 'fake-uuid',
  ref_type: 'match',
  message: 'Je hebt een match! Klik hier: http://phishing.example'
});
```

Het resultaat: het slachtoffer ziet in hun notificatiebalk een bericht dat lijkt alsof het van Internly komt, met een phishing-link in de message-string.

**Mitigatie die MOGELIJK al aanwezig is**: Een policy als `FOR INSERT WITH CHECK (user_id = auth.uid())` zou dit blokkeren. Maar createNotification() werkt nu niet als een gebruiker een notificatie stuurt naar iemand anders (wat het juist moet doen bij matchacceptatie). Dus de INSERT-policy moet cross-user inserts toestaan voor geauthenticeerde aanroepen.

Dit is het meest complexe RLS-dilemma in de codebase: de notificaties-tabel moet zowel (a) cross-user inserts toestaan (platform stuurt notificaties namens events) als (b) voorkomen dat willekeurige gebruikers andermans inbox manipuleren.

**Ernst**: HOOG als geen beperkende INSERT-policy aanwezig is.

**ONVERIFIEERBAAR**: RLS-policy op notifications INSERT niet te bepalen via code-grep.

---

### reviews

**Code-patroon (mijn-sollicitaties.html:220)**:
```javascript
await db.from('reviews').insert({
  reviewer_id: currentUserId,
  reviewee_id: revieweeId,
  match_id:    matchId,
  rating,
  body,
});
```

`revieweeId` en `matchId` komen uit de UI (dataset op button of select-element). Als een aanvaller de dataset-waarden manipuleert via devtools, kan hij een andere `revieweeId` of `matchId` insturen.

**Duplicate-constraint**: error.code `23505` bij duplicate insert. Er is blijkbaar een UNIQUE-constraint op (`reviewer_id`, `match_id`) — dit beperkt spam-reviews per match.

**Scenario — review voor niet-eigen match**:
1. Open browser devtools op mijn-sollicitaties.html
2. Vind een review-button met `data-match-id="EIGEN"`, wijzig naar `data-match-id="ANDER"`
3. Submit review → gaat naar een match die niet van de student is

**Beperking**: De match_id die de student invoert is niet de match van henzelf. Als RLS op reviews INSERT vereist dat de reviewer partij is bij de match (via een JOIN-check), is dit geblokkeerd. Als RLS alleen `reviewer_id = auth.uid()` checkt: de insert slaagt, de reviewee_id kan willekeurig zijn.

**Ernst**: MIDDEL — afhankelijk van RLS WITH CHECK op reviews INSERT.

**ONVERIFIEERBAAR**: RLS-policy op reviews INSERT niet te bepalen via code-grep.

---

### company_profiles (trust_score)

**Code-patroon (admin.html:528–533)**:
```javascript
db.from('company_profiles').update({ trust_score: val, trust_grade: grade }).eq('profile_id', id)
db.from('internship_postings').update({ trust_score: val }).eq('company_profile_id', id)
```

Geen `auth.uid()`-filter op de aanroeper. Dit is de admin-functie — de beveiliging hangt volledig af van:
1. De URL van admin.html niet kennen (security by obscurity) — LAAG
2. Een RLS UPDATE-policy op company_profiles die alleen admins toestaat — ONVERIFIEERBAAR

**Scenario — trust_score manipulatie als niet-admin**:
Een ingelogde niet-admin stuurt via devtools:
```javascript
const db = window.supabase.createClient(window.__SUPABASE_URL, window.__SUPABASE_ANON_KEY);
// Al ingelogd als student
await db.from('company_profiles').update({ trust_score: 10 }).eq('profile_id', 'COMPETITOR_UUID');
```

Als RLS niet toestaat dat een student company_profiles UPDATE, krijgt hij een RLS-fout. Als RLS niet geconfigureerd is of alleen `profile_id = auth.uid()` checkt (eigenaar kan eigen profiel updaten), is de score van een concurrent aanpasbaar als eigen profiel_id ≠ target profiel_id.

**Ernst**: P1 — dit is de meest kritieke query-vector in de codebase.

**ONVERIFIEERBAAR**: RLS-policy op company_profiles UPDATE niet te bepalen via code-grep.

---

### buddy_requests

**Code-patroon (buddy.js:449)**: `buddyAcceptRequest()` filtert `.eq('receiver_id', uid)` — application-level security.

**Cross-user scenario**: Kan een bedrijf buddy_requests van anderen accepteren? De client-side code heeft het filter, maar als RLS op UPDATE niet `receiver_id = auth.uid()` afdwingt, kan een aanvaller via directe API call een verzoek accepteren voor een ander.

**Ernst**: LAAG als de application-level check consistent gebruikt wordt, MIDDEL als niet.

---

## Overzichtstabel

| Tabel | Anon SELECT | Auth SELECT (cross-user) | Auth INSERT (cross-user) | Auth UPDATE (cross-user) | Verifieerd? |
|-------|-------------|--------------------------|--------------------------|--------------------------|-------------|
| profiles | Geblokkeerd (vermoedelijk) | ONBEKEND | n.v.t. | n.v.t. | ❌ |
| applications | Geblokkeerd (vermoedelijk) | LAAG risico (eigen filter) | MIDDEL | LAAG | ❌ |
| notifications | Geblokkeerd (vermoedelijk) | Alleen eigen | **HOOG** (spoofing) | n.v.t. | ❌ |
| reviews | Geblokkeerd (vermoedelijk) | LAAG (bedrijf ziet eigen) | **MIDDEL** (match_id swap) | n.v.t. | ❌ |
| company_profiles | Vermoedelijk publiek voor trust_score | Vermoedelijk beperkt | n.v.t. | **HOOG** (trust_score) | ❌ |
| buddy_requests | Geblokkeerd | Eigen requests | LAAG | **MIDDEL** (accept-bypass) | ❌ |
| messages | Geblokkeerd | Vermoedelijk beperkt | LAAG | n.v.t. | ❌ |
| matches | Geblokkeerd | Vermoedelijk beperkt | n.v.t. | n.v.t. | ❌ |

---

## Aanbevelingen voor Barry (vereist Supabase Console)

**Prioriteit 1**: Voer de pg_policies query uit (zie boven). Rapporteer terug aan het team.

**Prioriteit 2**: Verificeer specifiek:
```sql
-- Kan iedereen notifications inserten voor willekeurige user_id?
SELECT * FROM pg_policies WHERE tablename = 'notifications' AND cmd = 'INSERT';

-- Kan iedereen company_profiles updaten?
SELECT * FROM pg_policies WHERE tablename = 'company_profiles' AND cmd = 'UPDATE';

-- Is er een WITH CHECK op reviews INSERT?
SELECT * FROM pg_policies WHERE tablename = 'reviews' AND cmd = 'INSERT';
```

**Prioriteit 3**: Test scenario 1 (trust_score update) handmatig via Supabase Console:
```sql
-- Als student@internly.pro ingelogd:
SET request.jwt.claim.sub = '65ed548f-...'; -- student UUID
UPDATE company_profiles SET trust_score = 10 WHERE profile_id = 'a5d25384-...';
-- Als RLS correct: ERROR: new row violates row-level security policy
-- Als RLS onjuist: UPDATE 1
```

---

*Garcia2 — 22 april 2026 — Live DB onbereikbaar (sandbox beperking) — Bevindingen zijn inferenties uit code-grep — ONVERIFIEERBAAR gemarkeerd waar relevant*
