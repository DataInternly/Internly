# Timmy — Atomic Operations Audit
**Datum**: 22 april 2026
**Rol**: Timmy — Elke multi-stap DB-operatie zonder transactie is een potentieel half-afgeronde toestand.
**Scope**: Alle multi-stap database-operaties in de codebase. Welke zijn atomair? Welke niet? Wat zijn de gevolgen?
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Methode

Bronnen: bbl-hub.html (signOff, renewalSign), js/buddy.js (buddyAcceptRequest), company-dashboard.html (match accepteren), vacature-detail.html (sollicitatie), admin.html (trust score update), js/calendar.js (meeting).

Grep op `.rpc(` → 0 resultaten in productie-code: er worden géén Postgres functies (stored procedures) aangeroepen. Alle multi-stap operaties zijn client-side sequentiële writes.

Definitie van "atomair" in deze context: ofwel alle stappen slagen, ofwel het systeem bevindt zich in een consistente bekende toestand. Rollback hoeft niet perfect te zijn, maar de fout moet zichtbaar zijn en de datastatus moet voorspelbaar blijven.

---

## Operatie 1 — signOff() (bbl-hub.html:2262–2328)

### Stappen
1. `db.from('meetings').update({ status: newStatus })` — DB write, schakel 1
2. `createNotification(recipientId, 'eval_signed', ...)` — DB write, schakel 2
3. `createNotification(otherRecipientId, 'eval_completed', ...)` — DB write, schakel 3 (conditioneel bij eval_completed)

### Atomiciteit
**NIET ATOMAIR.**

De meetings-update (stap 1) en de notificaties (stap 2-3) zijn onafhankelijke writes zonder Postgres-transactie.

### Faalscenario's

**Scenario A**: stap 1 slaagt, stap 2 mislukt.
- Status: meetings.status = 'student_signed' ✅
- Notificatie: niet aangemaakt ❌
- Gevolg: het bedrijf weet niet dat de student getekend heeft. De flow stopt zonder zichtbare reden voor de ontvanger.
- Recovery: bij volgende signOff-poging door student: `_isSigningOff`-guard blokkeert tweede poging. De student kan niet opnieuw proberen.
- **Ernst**: HOOG — de ondertekeningsketen is geblokkeerd na stap 1, onzichtbaar voor ontvangers.

**Scenario B**: stap 1 én stap 2 slagen, stap 3 (eval_completed) mislukt.
- Status: meetings.status = 'completed' ✅
- eval_signed-notificatie: aangemaakt ✅
- eval_completed-notificatie: niet aangemaakt ❌
- Gevolg: betrokkenen weten dat de laatste partij getekend heeft (eval_signed), maar de formele afronding (eval_completed) is niet gecommuniceerd.
- **Ernst**: MIDDEL — visueel onvolledig, maar geen data-corruptie.

### Bestaande mitigatie
try/catch rond notificaties (gefixt in april 2026): `console.error + notify('Evaluatie gedeeltelijk opgeslagen', false)`. Dit maakt faling zichtbaar voor de huidige gebruiker, maar niet voor de ontvanger.

---

## Operatie 2 — buddyAcceptRequest() (js/buddy.js:440–514)

### Stappen
1. `buddy_requests.update({ status: 'accepted' })` — schrijf acceptatie
2. `buddy_pairs.insert(...)` — maak koppeling
3. `conversations.insert({ buddy_pair_id })` — open gesprek (niet voor insider-type)
4. `createNotification(req.requester_id, 'buddy_accepted', ...)` — informeer aanvrager

### Atomiciteit
**NIET ATOMAIR, met partiële rollback op stap 2.**

Als stap 2 mislukt: rollback naar `buddy_requests.status = 'pending'`. ✅
Als stap 3 mislukt: buddy_pairs-record bestaat, maar geen conversation. Geen rollback. ❌
Als stap 4 mislukt: koppeling actief, aanvrager weet het niet. Geen rollback. ❌

### Faalscenario's

**Scenario A**: stap 2 mislukt.
- buddy_requests teruggedraaid naar 'pending' — receiver kan opnieuw proberen.
- **Ernst**: LAAG — rollback werkt.

**Scenario B**: stap 3 mislukt.
- buddy_pairs record bestaat (status='active')
- conversations record ontbreekt
- Gevolg: buddy-koppeling is "actief" maar heeft geen chatkanaal. Chat-interface kan de conversation_id niet ophalen en toont een fout of lege staat.
- **Ernst**: HOOG — zombi-pair. Buddies denken gekoppeld te zijn maar kunnen niet communiceren.

**Scenario C**: stap 4 mislukt.
- Koppeling en conversation bestaan.
- Aanvrager ontvangt geen 'buddy_accepted' notificatie.
- Gevolg: aanvrager wacht oneindig op bevestiging, of ontdekt de koppeling pas bij de volgende page-load via loadBuddyPairs().
- **Ernst**: LAAG — herstelbaar via page-reload.

---

## Operatie 3 — renewalSign() (bbl-hub.html:2380–2398)

### Stappen
1. `db.from('meetings').select('renewal_status')` — lees huidige JSONB
2. `status = m?.renewal_status || {}` — merge lokaal
3. `status[party] = keuze` — voeg partij-keuze toe in geheugen
4. `db.from('meetings').update({ renewal_status: status })` — schrijf volledig object terug

### Atomiciteit
**RACE CONDITION — lees-modificeer-schrijf zonder optimistic locking.**

Als twee partijen gelijktijdig stap 1 uitvoeren, lezen ze allebei `{}`. Beide mergen hun eigen keuze en schrijven terug. De tweede write overschrijft de eerste volledig.

### Faalscenario's

**Scenario A**: student en bedrijf slaan gelijktijdig op.
- Student leest `{}`, schrijft `{ student: 'verlengd' }`
- Bedrijf leest `{}` (vóór student's write is verwerkt), schrijft `{ bedrijf: 'verlengd' }`
- Resultaat: `{ bedrijf: 'verlengd' }` — student's keuze is kwijt.
- **Ernst**: HOOG — dataverlies zonder foutmelding.

**Scenario B**: één partij wijzigt keuze na initieel opslaan.
- Stap 1 leest `{ student: 'verlengd', bedrijf: 'gestopt' }`, schrijft `{ student: 'verlengd', bedrijf: 'verlengd' }`.
- Andere partijen zien gewijzigde keuze zonder notificatie.
- **Ernst**: MIDDEL — geen vergrendeling, geen auditspoor van wijzigingen.

### Oplossingsrichting (observatie, niet implementatie)
Postgres JSONB kan atomair bijgewerkt worden via `jsonb_set()` in een .rpc() call. Alternatief: één rij per partij per meeting, in plaats van één JSONB-object.

---

## Operatie 4 — Match accepteren (company-dashboard.html:1573)

### Stappen
1. `db.from('applications').update({ status: 'accepted' })` — schrijf acceptatie
2. `db.from('matches').insert(...)` — maak match aan
3. `createNotification(studentId, 'application_accepted', ...)` — informeer student

### Atomiciteit
**NIET ATOMAIR.**

### Faalscenario's

**Scenario A**: stap 1 slaagt, stap 2 mislukt.
- Application status = 'accepted', maar geen match record.
- Student en bedrijf denken dat er een match is (application_accepted notificatie nooit verstuurd), maar de match-hub heeft geen data.
- **Ernst**: HOOG — inconsistente staat. Student verwacht een match die niet bestaat.

**Scenario B**: stap 2 slaagt, stap 3 mislukt.
- Match bestaat, student weet het niet (geen notificatie).
- Student ontdekt match pas bij volgende page-load van matches.html.
- **Ernst**: MIDDEL — herstelbaar, maar vertraagde ontdekking.

---

## Operatie 5 — Sollicitatie indienen (vacature-detail.html:669–710)

### Stappen
1. Check bestaande applicatie (`.maybeSingle()`) — lees
2. `db.from('applications').insert(...)` — maak applicatie aan
3. `createNotification(bedrijfId, ..., 'new_match')` — informeer bedrijf

### Atomiciteit
**NIET ATOMAIR, maar low-risk.**

Als stap 2 slaagt maar stap 3 mislukt: bedrijf krijgt geen notificatie, maar de applicatie bestaat wel. Herstelbaar via bedrijfsdashboard dat actief laadt.

### Check-then-act race
Stap 1 (check) en stap 2 (insert) zijn niet atomair. Bij simultaan klikken door student (twee tabs): beide checks zien geen bestaande applicatie, beide inserten slagen. Duplicaat-applicatie.
- **Ernst**: LAAG — onwaarschijnlijk scenario, maar geen DB-constraint beschermt ertegen.

---

## Operatie 6 — Trust Score update (admin.html:528–533)

### Stappen
1. `db.from('company_profiles').update({ trust_score: score })` — schrijf naar profiel
2. `db.from('internship_postings').update({ trust_score: score })` — schrijf naar vacatures

### Atomiciteit
**NIET ATOMAIR — dual-write naar twee tabellen.**

Als stap 2 mislukt: company_profiles heeft nieuwe score, internship_postings heeft oude score. De Trust Badge op vacature-kaarten (discover.html) leest van internship_postings.

**Ernst**: MIDDEL — zichtbare inconsistentie: bedrijfsprofiel toont A, vacaturekaart toont B.

Company-dashboard.html heeft dezelfde dual-write op lijnen 1949–1955 (upsert + update).

---

## Operatie 7 — Meeting aanmaken (js/calendar.js)

### Stappen
1. `db.from('meetings').insert(...)` — schrijf meeting
2. `createNotification(otherPartyId, 'new_meeting', ...)` — informeer andere partij

### Atomiciteit
**NIET ATOMAIR, maar low-risk.**

Als notificatie mislukt: de meeting bestaat, de andere partij weet het niet totdat ze inlogt en de kalender laadt.
- **Ernst**: LAAG — herstelbaar bij volgende login.

---

## Overzichtstabel

| Operatie | Stappen | Atomair | Rollback | Ernst |
|---------|---------|---------|----------|-------|
| signOff() | 3 | ❌ | Gedeeltelijk (try/catch + melding) | HOOG (stap 1 blokkeert bij stap 2-fout) |
| buddyAcceptRequest() | 4 | ❌ | Stap 2 ✅ · Stap 3-4 ❌ | HOOG (zombi-pair) |
| renewalSign() | 4 (RMW) | ❌ | Geen | HOOG (silent dataverlies) |
| Match accepteren | 3 | ❌ | Geen | HOOG (match zonder record) |
| Sollicitatie indienen | 3 | ❌ | Geen | LAAG |
| Trust Score update | 2 | ❌ | Geen | MIDDEL (visuele inconsistentie) |
| Meeting aanmaken | 2 | ❌ | Geen | LAAG |

---

## Structurele bevinding

**Er worden géén Postgres stored procedures (.rpc()) gebruikt in de productie-code.** Alle multi-stap operaties zijn client-side sequentiële writes. Dit is een architecturele keuze met consequenties:

1. Transactiegaranties vereisen een rewrite naar `.rpc()` + Postgres-functie per operatie.
2. Foutafhandeling is verspreid over alle aanroepende bestanden in plaats van gecentraliseerd in de DB.
3. Rollback-logica (zoals in buddyAcceptRequest) moet handmatig geschreven en onderhouden worden per operatie.

De drie P1-kandidaten voor een eerste `.rpc()` migratie:
- `renewal_status` (race condition is reproduceerbaar bij gelijktijdig gebruik)
- `signOff()` (blocking failure bij notificatie-fout)
- `match accepteren` (inconsistente staat tussen applications en matches)

---

*Timmy — 22 april 2026 — READ-ONLY*
