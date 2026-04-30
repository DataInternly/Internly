# Morgan2 — Behavioral Gap Analysis
**Datum**: 22 april 2026
**Rol**: Morgan2 — Ik kijk niet naar wat het systeem kan doen, maar naar wat het doet als gebruikers zich anders gedragen dan verwacht.
**Scope**: Vijf kernflows × verwacht vs. werkelijk gedrag bij afwijkende gebruikersinput.
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Methode

Voor elke flow: het happy path, de verwachte edge cases, en wat het systeem werkelijk doet als het gedrag afwijkt.

Bronnen: vacature-detail.html, mijn-sollicitaties.html, company-dashboard.html, bbl-hub.html, js/buddy.js, js/calendar.js.

---

## Flow 1 — Sollicitatie-cyclus

### Happy path
Student klikt "Solliciteer" op vacature-detail.html → applications INSERT → bedrijf ziet sollicitatie in company-dashboard.html → bedrijf accepteert of weigert → student ontvangt in-app notificatie.

### Afwijkend gedrag

**1a — Dubbele sollicitatie**
- Vacature-detail.html:678 controleert of er al een applicatie bestaat vóór INSERT (`.maybeSingle()` check op bestaande application).
- Als student snel twee keer klikt: de button-disable check ontbreekt. Er is geen `isSubmitting` guard op de submit-knop.
- **Resultaat**: Twee identieke applicaties mogelijk bij snelle dubbelklik. Geen uniqueness constraint gedetecteerd op (student_id, posting_id) in de client-code.
- **Ernst**: MIDDEL — duplicaat-applicaties verwarren het bedrijf en de student.

**1b — Sollicitatie intrekken + opnieuw solliciteren**
- mijn-sollicitaties.html:456–462: delete → re-insert flow voor het "terugnemen" + opnieuw solliciteren scenario.
- Bij mislukte delete maar geslaagde insert: student heeft twee applicaties.
- **Resultaat**: Race condition — delete en insert zijn sequentieel, niet atomair.
- **Ernst**: LAAG — tijdvenster klein, maar niet onmogelijk op slechte verbinding.

**1c — Bedrijf weigert zonder reden**
- company-dashboard.html:1586: INSERT van 'application_rejected' notificatie aan student.
- De notificatietekst (getNotifText, utils.js:441) geeft: een standaard "X heeft de match helaas afgewezen" bericht.
- **Resultaat**: Student krijgt géén reden mee. Er is geen vrij-tekstveld voor afwijzingsreden in het UI of de DB.
- **Ernst**: MIDDEL — Blara's Yara-simulatie toont dat dit tot frustratie en inactiviteit leidt.

**1d — Bedrijf reageert nooit**
- Na het plaatsen van een sollicitatie: geen cron-job, geen edge function, geen timer die het bedrijf herinnert.
- **Resultaat**: De responsgarantie is een UI-label, geen gedragsafgedwongen contract. Het platform kan zijn kernbelofte niet technisch handhaven.
- **Ernst**: HOOG — dit is de meest prominente marketingbelofte.

---

## Flow 2 — BBL-evaluatie (driedelige ondertekening)

### Happy path
Student tekent signOff('student') → DB update + notificatie aan bedrijf → bedrijf tekent → notificatie aan school → school tekent → eval_completed.

### Afwijkend gedrag

**2a — Tekenvolgorde afwijkend**
- signOff() in bbl-hub.html:2262 controleert de huidige status (`signedBy`-object) maar legt geen volgorde af.
- Technisch kan een school tekenen vóór de student of het bedrijf.
- **Resultaat**: Geen juridisch-geldige handtekeningvolgorde. Alle drie kunnen theoretisch gelijktijdig tekenen.
- **Ernst**: LAAG voor MVP, MIDDEL bij schaalvergroting (juridische geldigheid evaluatiedocument).

**2b — Twee partijen tekenen tegelijk**
- `_isSigningOff` guard (bbl-hub.html:2262) voorkomt dubbelklik door één gebruiker.
- Maar: twee verschillende gebruikers (student + bedrijf) op twee devices kunnen tegelijk de `signedBy`-check lezen als `false` voor hun partij en beiden schrijven.
- **Resultaat**: Beide schrijven succesvol (elk hun eigen party). Niet echt een probleem — maar status-logica die `eval_completed` triggert kan op een race condition stuiten als beide tegelijk schrijven en `Object.keys(signedBy).length === 3` pas wordt geëvalueerd na schrijven.
- **Ernst**: LAAG — timing vereist milliseconde-precisie.

**2c — Partij is niet aangemeld tijdens notificatie**
- Na signOff schrijft de code een notificatie naar de ontvangende partij via createNotification().
- Als de ontvanger op dat moment niet actief is: notificatie gaat de DB in en verschijnt bij volgende login via loadNotifications().
- **Resultaat**: Werkt correct. Geen gap.

**2d — School-notificatie bij eval_completed ontbreekt**
- Bij eval_completed (alle drie getekend): createNotification() wordt aangeroepen voor student en bedrijf.
- School ontvangt géén afzonderlijke eval_completed notificatie (JJ2 audit, P5).
- **Resultaat**: De school weet niet dat de evaluatie definitief is tenzij ze actief inlogt en de status controleert.
- **Ernst**: MIDDEL — school-dashboard.html heeft geen handler voor dit event.

---

## Flow 3 — BBL-verlengingsflow

### Happy path
Student kiest "Verleng" of "Stop" → keuze wordt opgeslagen als `renewal_status.student` → bedrijf doet hetzelfde → school doet hetzelfde → systeem toont consensus.

### Afwijkend gedrag

**3a — Read-modify-write race condition**
- bbl-hub.html:2385–2395: lees renewal_status → merge lokale keuze → schrijf terug.
- Als student en bedrijf tegelijk hun keuze opslaan:
  - Beide lezen `renewal_status = {}`
  - Student schrijft `{ student: 'verlengd' }`
  - Bedrijf schrijft `{ bedrijf: 'verlengd' }` (overschrijft vorige write)
  - **Resultaat**: Eén keuze gaat verloren. De merge die nodig is, vindt niet plaats.
- **Ernst**: HOOG voor de verlengingsflow — dit is een dataverlies-scenario zonder zichtbare fout.

**3b — Partij wijzigt keuze na anderen**
- Geen lock of wijzigingshistorie op renewal_status.
- Als het bedrijf na drie dagen van mening verandert: de vorige keuze wordt stilzwijgend overschreven.
- **Resultaat**: Andere partijen zien de gewijzigde keuze zonder notificatie. Geen "keuze gewijzigd"-alert.
- **Ernst**: MIDDEL — verwarring bij consensus-moment.

**3c — Verlengingsflow zonder contract**
- bbl-hub.html laadt ook voor BBL-studenten die nog geen formeel contract hebben ingevoerd (bbl_mode=true bij registratie, maar geen meetings of leerdoelen).
- De verlenging-view toont "Wettelijke termijn: 90 dagen" met lege deadline-waarden.
- **Resultaat**: Gebruiker ziet verlengingsknop zonder dat er iets te verlengen valt. Geen guard.
- **Ernst**: LAAG — verwarrend maar niet destructief.

---

## Flow 4 — Buddy-koppeling

### Happy path
Student stuurt verzoek → buddyAcceptRequest() → 4 stappen: (1) request.update('accepted'), (2) buddy_pairs.insert, (3) conversations.insert, (4) createNotification(buddy_accepted).

### Afwijkend gedrag

**4a — Gedeeltelijke rollback werkt alleen voor stap 2**
- js/buddy.js:483–486: als buddy_pairs.insert mislukt, wordt request teruggezet naar 'pending'.
- Als conversations.insert (stap 3) mislukt: **geen rollback**. buddy_pairs record bestaat, maar geen gesprek. Buddy-koppeling is actief maar onbruikbaar (kan niet chatten).
- Als createNotification (stap 4) mislukt: **geen rollback**. Koppeling bestaat, aanvrager ontvangt geen bevestiging.
- **Resultaat**: Zombie-buddy-pairs mogelijk (pair record zonder conversation thread). Aanvrager wacht oneindig op bevestiging die nooit komt.
- **Ernst**: MIDDEL — buddy is "actief" maar chat werkt niet.

**4b — Buddy-type 'insider' heeft extra privacy-logica**
- BUDDY_CONFIG.insider: anonymous=true, revealStrategy='after_contract'.
- Stap 3 in buddyAcceptRequest(): `if (req.type !== 'insider') { create conversation }`.
- Voor insider-type: géén conversation wordt aangemaakt bij acceptatie. Reveal-logica (`reveal_after`) is `null` — wordt "externally set based on contract end date."
- **Resultaat**: Er is geen code die `reveal_after` automatisch zet. Insider-buddy is aangemaakt maar nooit automatisch geopenbaard. Handmatige interventie of ontbrekende functie.
- **Ernst**: HOOG voor insider-type — de privacy-belofte (anonimiteit tot na contract) is gedeeltelijk, maar de reveal-trigger is niet geïmplementeerd.

**4c — Dubbel buddy-verzoek**
- Geen check in buddySendRequest() of er al een pending verzoek bestaat van dezelfde requester aan dezelfde receiver.
- **Resultaat**: Meerdere identieke verzoeken mogelijk. De receiver ziet duplicaten in de inbox.
- **Ernst**: LAAG — UI-probleem, geen data-corruptie.

---

## Flow 5 — Meeting-planning (calendar.js)

### Happy path
Gebruiker kiest type + datum + tijd → submitMeeting() → meetings INSERT → createNotification('new_meeting') aan de andere partij.

### Afwijkend gedrag

**5a — Geen conflictdetectie**
- calendar.js submitMeeting() doet geen check op bestaande meetings voor dezelfde datum/tijd voor dezelfde partijen.
- **Resultaat**: Dubbele afspraken zijn mogelijk. Beide partijen ontvangen een notificatie voor elk dubbel.
- **Ernst**: LAAG — geen destructieve fout, maar slechte UX.

**5b — Geen bevestiging door de andere partij vereist**
- Na INSERT: de andere partij ontvangt een notificatie maar hoeft de afspraak niet te accepteren.
- bbl-hub.html:1319–1360 heeft meeting_accepted/meeting_rejected flows (accepteren en afwijzen), maar er is geen verplichte stap.
- **Resultaat**: Afspraken kunnen worden aangemaakt zonder wederzijdse instemming. De aanvrager behandelt de afspraak als "bevestigd" terwijl de ander misschien niet weet het ervan.
- **Ernst**: LAAG — huidige implementatie is bewust asynchroon.

**5c — Afspraak zonder actieve match**
- Er is geen check of de twee partijen een actieve match hebben vóór een meeting INSERT.
- **Resultaat**: Theoretisch kan een gebruiker een meeting aanmaken voor een match_id dat niet van hen is, als ze het match_id kennen.
- **Ernst**: MIDDEL — beveiligingsgat afhankelijk van RLS op meetings-tabel in Supabase.

---

## Patroonanalyse: terugkerende gedragsgaten

| Patroon | Flows | Ernst |
|---------|-------|-------|
| Sequentiële writes zonder atomic rollback | 1b, 2b, 4a | MIDDEL |
| Read-modify-write race condition | 3a | HOOG |
| Geen guard op dubbele submit | 1a, 4c, 5a | MIDDEL |
| Ontbrekende notificatie in kritisch pad | 1d, 2d | HOOG |
| Feature beloofd maar niet volledig geïmplementeerd | 4b (insider reveal), 1d (responsgarantie) | HOOG |

---

## Prioritering

| Prioriteit | Actie |
|-----------|-------|
| P1 | Fix renewal_status race condition (Timmy — lees atomic ops rapport) |
| P1 | Implementeer responsgarantie-herinnering (server-side trigger) |
| P2 | Buddy insider-reveal trigger implementeren |
| P2 | Zombie-pair voorkomen (rollback bij conversation-insert fout) |
| P3 | Dubbele sollicitatie guard (isSubmitting flag op knop) |
| P4 | Afwijzingsreden toevoegen aan rejected-flow |

---

*Morgan2 — 22 april 2026 — READ-ONLY*
