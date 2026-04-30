# Unsub Knob — Attacker Walkthrough
**Datum**: 22 april 2026
**Rol**: Unsub Knob — Reformed hacker. Ik denk als een aanvaller. Ik stop bij één PoC.
**Scope**: Vijf attack paths, stap voor stap. Alleen test-accounts.
**Instructie**: READ-ONLY codebase, write-only naar test-accounts als PoC vereist.

---

## Disclaimer

Live DB queries vanuit deze omgeving zijn niet mogelijk (sandbox — geen uitgaand netwerk). Alle bevindingen zijn gebaseerd op code-analyse. Stappen zijn beschreven als "wat een aanvaller zou doen" met de verwachte uitkomst gegeven de code-structuur.

**Test-accounts voor referentie**:
- Student:  65ed548f-a7da-4a9b-96c3-e64ccb9ca7d7 (student@internly.pro)
- Bedrijf:  a5d25384-3828-4c13-ae3b-0b73d9d54a57 (bedrijf@internly.pro)
- School:   520f9b1a-2dab-44ee-9fbe-df46c7da418c (school@internly.pro)
- Daan BBL: 7fede7f1-2e7f-4f69-a5ba-b31a7f741813

---

## Attack Path 1 — Admin Pretender

**Doel**: Trust Score van test-bedrijf (a5d25384) verlagen naar 0 zonder admin-rechten.

### Stappen

**Stap 1 — Credentials ophalen via browser devtools**
Open https://internly.pro/discover.html in browser → DevTools Console:
```javascript
> window.__SUPABASE_ANON_KEY
// Output: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
> window.__SUPABASE_URL  // of: from supabase.js source
// Niet direct als window-prop beschikbaar, maar zichtbaar in Network tab
// of via: document.querySelector('script[src*="supabase"]') → source inspect
```
→ Anon-key is beschikbaar zonder inloggen.

**Stap 2 — Supabase client opzetten in Console**
```javascript
const db = window.supabase.createClient(
  'https://qoxgbkbnjsycodcqqmft.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // anon key
);
```
(supabase is al geladen op de pagina als globale variabele)

**Stap 3 — Inloggen als eigen account**
```javascript
await db.auth.signInWithPassword({ email: 'eigen@gmail.com', password: '...' });
```

**Stap 4 — Trust Score write poging**
```javascript
const result = await db.from('company_profiles')
  .update({ trust_score: 0, trust_grade: 'C' })
  .eq('profile_id', 'a5d25384-3828-4c13-ae3b-0b73d9d54a57'); // test-bedrijf
console.log(result);
```

### Verwachte uitkomsten

**Als RLS correct geconfigureerd (UPDATE beperkt tot eigen profiel)**:
```
{ data: null, error: { code: '42501', message: 'new row violates row-level security policy' } }
```
→ GEBLOKKEERD ✅

**Als RLS afwezig of te breed**:
```
{ data: [{ profile_id: 'a5d25384...', trust_score: 0 }], error: null }
```
→ EXPLOITEERBAAR ❌

### Aanvullende observatie — admin.html toegang
Admin.html laadt zonder server-side auth-check. Een aanvaller die de URL weet:
1. Navigeert naar `https://internly.pro/admin.html`
2. Als de pagina een client-side auth-check heeft: redirect naar auth.html
3. Logt in als gewone gebruiker → wordt teruggestuurd naar admin.html (of niet, afhankelijk van redirect-logica)
4. Als admin.html geen rol-check heeft na login: volle admin-UI zichtbaar

**Verificatie vereist**: Heeft admin.html een rolcheck die schoolgebruikers/studenten blokkeert na authenticatie?

**Urgentie**: P1

---

## Attack Path 2 — Review Manipulator

**Doel**: Een positieve review plaatsen voor test-bedrijf die niet gekoppeld is aan een echte match van de aanvaller.

### Stappen

**Stap 1 — Review-formaat begrijpen via code inspect**
mijn-sollicitaties.html:220 toont het INSERT-format:
```javascript
db.from('reviews').insert({
  reviewer_id: currentUserId,
  reviewee_id: revieweeId,    // ← bedrijfsprofiel-id
  match_id:    matchId,       // ← match UUID
  rating,                     // ← 1-5
  body,
});
```

**Stap 2 — Via devtools UI-values overschrijven**
Op mijn-sollicitaties.html: zoek een review-knop in de DOM:
```html
<button data-match-id="EIGEN_MATCH" data-reviewee-id="EIGEN_BEDRIJF" ...>Review plaatsen</button>
```
Wijzig via DevTools Elements:
- `data-match-id` → UUID van een match die niet van de aanvaller is
- `data-reviewee-id` → UUID van een bedrijf dat de aanvaller wil targeten

**Stap 3 — Submit**
De JS-handler leest `dataset.matchId` en `dataset.revieweeId` → stuurt INSERT met gemanipuleerde waarden.

### Verwachte uitkomsten

**Scenario A: UNIQUE-constraint werkt, maar niet per match**
Als de constraint alleen `(reviewer_id, match_id)` is: de aanvaller kan één review per match_id insturen. Als hij een geldige match_id kent (bijv. van een andere student die gesolliciteerd heeft en de match_id via URL-parameter zichtbaar is), kan hij een review plaatsen voor die match alsof hij de student is — maar zijn eigen reviewer_id staat erbij, dus het is niet volledig anoniem.

**Scenario B: RLS valideert dat match_id bij reviewer hoort**
INSERT mislukt met RLS-fout. ✅

**Scenario C: Zelf-review (bedrijf plaatst positieve review voor zichzelf)**
```javascript
// Ingelogd als bedrijf@internly.pro
await db.from('reviews').insert({
  reviewer_id: 'a5d25384-...', // bedrijf als reviewer
  reviewee_id: 'a5d25384-...', // bedrijf als reviewee (zichzelf)
  match_id: 'VALID_MATCH_UUID',
  rating: 5,
  body: 'Uitstekend bedrijf!'
});
```
Als geen CHECK constraint `reviewer_id != reviewee_id` bestaat: **zelf-review slaagt**.

### Aanvullende bevinding — flagged=false default
Nieuwe reviews zijn direct zichtbaar (geen `flagged=false`-check op display). Als een review-manipulatie slaagt, is ze direct publiek.

**Urgentie**: P2

---

## Attack Path 3 — party_a/party_b Identiteitsverwarring

**Doel**: Via een school_referral-match in match-dashboard.html de student-view laden met school-identiteit als "student".

### Stappen

**Stap 1 — Code analyse (geen live DB vereist)**
match-dashboard.html:2737:
```javascript
if (user.id === matchRow.party_a) {
  // user is student in deze match
} else if (user.id === matchRow.party_b) {
  // user is bedrijf
}
hubPartyIds.student = matchRow.party_a;  // altijd — ook bij school_referral
hubPartyIds.bedrijf = matchRow.party_b;
```

Bij `match_type = 'school_referral'`:
- party_a = school UUID
- party_b = bedrijf UUID
- Geen student betrokken in de matches-rij

**Stap 2 — Effect**
Als school-gebruiker (520f9b1a) een school_referral-match opent:
- `user.id === matchRow.party_a` → waar (school is party_a)
- Code concludeert: school IS de "student" in deze match
- `hubPartyIds.student = '520f9b1a-...'` (school UUID)
- Alle student-gerelateerde queries draaien met school UUID

**Stap 3 — Student-data-toegang?**
Code probeert:
```javascript
db.from('student_profiles').select('naam, opleiding, jaar').eq('profile_id', '520f9b1a-...')
```
School heeft geen `student_profiles`-rij → leeg resultaat → geen student-data gelekt. ✅

**Maar**: Als toekomstige code rechtstreeks messages of evaluaties ophaalt via `hubPartyIds.student`, en de RLS op die tabellen `student_id = auth.uid()` gebruikt, dan logt school in als zichzelf (520f9b1a) en auth.uid() = 520f9b1a. Als messages-RLS `user_id IN (party_a, party_b)` gebruikt voor de match, zou de school alle messages kunnen lezen die voor de student bedoeld zijn.

**Conclusie**: Nu niet exploiteerbaar — school ziet lege profielen. MAAR: het identity-paradox is een tijdbom zodra match-dashboard.html meer data via hubPartyIds laadt.

**Urgentie**: P3 (nu onschadelijk, sprint 5+ risico)

---

## Attack Path 4 — Buddy Insider Anonimiteit Breken

**Doel**: De identiteit achterhalen van een anonieme BBL-insider buddy vóór contracteinde.

### Stappen

**Stap 1 — reveal_after is altijd null**
buddy.js (buddyAcceptRequest):
```javascript
.insert({
  requester_id: req.requester_id,
  receiver_id:  req.receiver_id,
  type:         req.type,
  status:       'active',
  reveal_after: null,  // ← altijd null, nooit gezet
})
```

**Stap 2 — Gevolg**
Er is geen reveal-trigger. `reveal_after = null` betekent: er is geen datum waarop de anonymiteit automatisch wordt opgeheven. Maar ook: er is geen code die de identiteit actief verbergt op basis van `reveal_after`.

**Stap 3 — Cross-reference via buddy_pairs**
Ingelogd als de student die een insider-buddy heeft:
```javascript
// Eigen buddy_pairs ophalen:
const { data } = await db.from('buddy_pairs')
  .select('id, requester_id, receiver_id, type')
  .or(`requester_id.eq.${myId},receiver_id.eq.${myId}`)
  .eq('type', 'insider');
// data[0].requester_id of receiver_id = de andere partij
```

De `requester_id` en `receiver_id` zijn in buddy_pairs beschikbaar. Als de aanvaller (student) dit veld kan lezen: de UUID van de insider-buddy is zichtbaar. Die UUID is cross-refereerbaar met `profiles` (naam) en `company_profiles` (bedrijf).

**Stap 4 — Effectiviteit**
Als buddy_pairs SELECT-RLS toestaat dat betrokkenen hun eigen pair-rijen lezen (wat voor functionaliteit vereist is): de student kan `receiver_id` = UUID van de insider zien. Er is geen mechanisme dat dit veld maskeert voor insider-type pairs.

**Conclusie**: De anonimiteit-belofte van het insider-buddy type is technisch niet houdbaar. De UUID is beschikbaar in buddy_pairs. Met een profielnaam-lookup is de identiteit te achterhalen door de student zelf.

**Dit is een architecturele keuze die expliciet gemaakt moet worden**: of de insider UUID nooit in de client-readable buddy_pairs staat (requires view/function), of de identiteit wordt niet echt anoniem bewaard.

**Urgentie**: P1 voor de privacy-belofte van het insider-type.

---

## Attack Path 5 — Notificatie-spoofing

**Doel**: Een valse notificatie injecteren in het account van test-bedrijf (a5d25384).

### Stappen

**Stap 1 — createNotification() code-pad**
utils.js:358:
```javascript
const { error } = await client.from('notifications').insert({
  user_id: userId,     // ← parameter, niet auth.uid()
  type, ref_id, ref_type, message
});
```

`userId` is de target-user. `client` is de authenticated db-client van de aanroeper.

**Stap 2 — Direct API call als ingelogde student**
```javascript
// Ingelogd als student@internly.pro
await db.from('notifications').insert({
  user_id: 'a5d25384-3828-4c13-ae3b-0b73d9d54a57', // test-bedrijf
  type: 'new_match',
  ref_id: 'fake-uuid-1234',
  ref_type: 'match',
  message: 'Internly: uw account vereist verificatie. Klik hier om uw gegevens te bevestigen.',
});
```

### Verwachte uitkomst

**Als RLS INSERT policy op notifications: `WITH CHECK (user_id = auth.uid())`**:
INSERT mislukt — de student kan geen notificatie voor een ander insturen. ✅

**Als RLS INSERT policy op notifications: `TO authenticated` (geen with_check)`**:
INSERT slaagt. Bedrijf ontvangt valse notificatie in hun notification-bell. De message-string kan een phishing-tekst bevatten. ❌

**Probleem met strikte RLS**:
`WITH CHECK (user_id = auth.uid())` zou ook alle LEGITIEME createNotification()-calls breken — want bij matchacceptatie stuurt het bedrijf een notificatie naar de student (user_id = student UUID, terwijl de aanroeper het bedrijf is).

Dit is het kerndilemma: de functie vereist cross-user write, maar een strikte RLS blokkeert phishing én legitiem gebruik tegelijk.

**Oplossing-richting (observatie)**:
Een Supabase Edge Function als trusted intermediary — alleen de Edge Function (met service role key) mag notifications inserten. De client-side createNotification() stuurt naar de Edge Function, die valideert en schrijft. Zo kan de notifications-tabel helemaal geblokkeerd worden voor directe client-side inserts.

**Urgentie**: P1 als huidige INSERT-policy permissive is; P3 als strikte policy aanwezig is.

---

## Samenvatting bevindingen

| Path | Naam | Exploiteerbaar? | Urgentie |
|------|------|-----------------|---------|
| 1 | Admin pretender | Conditioneel (RLS onbekend) | **P1** |
| 2 | Review manipulatie | Conditioneel (RLS + constraint) | **P2** |
| 3 | party_a/party_b | Nu onschadelijk, toekomstig risico | **P3** |
| 4 | Insider buddy reveal | **Waarschijnlijk exploiteerbaar** | **P1** |
| 5 | Notificatie-spoofing | Conditioneel (RLS onbekend) | **P1** |

**Drie P1's die Barry in Supabase Console moet verifiëren**:
1. company_profiles UPDATE-policy (admin pretender)
2. notifications INSERT-policy (spoofing)
3. buddy_pairs SELECT voor insider-type (privacy-belofte)

---

*Unsub Knob — 22 april 2026 — Test-accounts alleen — Eén PoC per path, niet escaleren*
