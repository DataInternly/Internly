# Witty — Language Precision Audit
**Datum**: 22 april 2026
**Rol**: Witty — Elk woord telt. Vage taal is een belofte die je niet kunt houden.
**Scope**: Alle publieke pagina's — index.html, pricing.html, about.html. Marketing copy vs. technische realiteit.
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Methode
Ik zoek naar termen die:
- Absolute zekerheid impliceren ("altijd", "nooit", "geen uitzonderingen")
- Mechanisme impliceren dat niet bestaat ("automatisch", "registreert", "houdt bij")
- Juridische status opeisen ("wettelijk recht", "AVG-compliant")
- Statistieken presenteren zonder adequate sourcing

Voor elk item: de exacte tekst, locatie, en het precisie-probleem.

---

## Gevonden precisie-problemen

### P1 — "Geen uitzonderingen" (absoluut)
**Locatie**: index.html:916
**Tekst**: "Geen reactie = lagere Trust Score. Geen uitzonderingen."

**Probleem**: "Geen uitzonderingen" is een absolute belofte. In de praktijk:
- Trust Score is niet automatisch berekend (stub)
- Geen handhavingsmechanisme (geen cron, geen Edge Function)
- Een bedrijf dat nooit reageert ondervíndt geen consequentie

**Correctie**: "Geen reactie = lagere Trust Score" → "Geen reactie = lagere Trust Score zodra Trust Score live is" of verwijder de absolute claim totdat het mechanisme bestaat.

---

### P2 — "Altijd" (absoluut)
**Locatie**: index.html:914
**Tekst**: "Zij reageren — altijd."

**Probleem**: "Altijd" is een garantie, geen ambitie. Het platform heeft geen middel om "altijd" af te dwingen. Studenten die dit lezen, verwachten 100% responsrate.

**Correctie**: "Zij reageren — of hun score daalt." (conditioneel i.p.v. absoluut)

---

### P3 — "Internly houdt die deadline bij" (mechanisme)
**Locatie**: index.html:942
**Tekst**: "Je leerbedrijf moet 90 dagen vóór het einde beslissen over verlenging. Internly houdt die deadline bij."

**Probleem**: "Houdt bij" impliceert actieve monitoring met notificatie. De implementatie:
- UI toont de termijn (bbl-hub.html:960) ✓
- Actieve notificatie bij nadering van 90-dagengrens: niet bevestigd aanwezig
- Renewal state opgeslagen in localStorage, niet DB → verlies bij device-switch

**Precisiegraad**: 6/10 — de UI is aanwezig maar "houdt bij" overstijgt wat de implementatie biedt

---

### P4 — "Internly registreert automatisch" (mechanisme)
**Locatie**: index.html:892
**Tekst**: "Internly registreert automatisch wat je nodig hebt om te laten zien dat je je beloften nakomt."

**Probleem**: "Automatisch" en "registreert" impliceren een expliciete Stagepact-registratie. Geen dergelijke functie aangetroffen. Normale DB-writes zijn niet hetzelfde als "Stagepact-registratie".

**Correctie**: "Internly legt de data vast die je nodig hebt voor je Stagepact-verantwoording."

---

### P5 — "ESG-data die stand houdt"
**Locatie**: index.html:963, pricing.html:329
**Tekst**: "Internly levert traceerbare data over investering in jong talent — bruikbaar als onderbouwing in het ESG-verslag."

**Probleem**: ESG-export is een bekende stub. "Levert" is een presens-tense claim. De exportfunctie bestaat niet. esg-rapportage.html:727 admitteert dit met "[LIVE-DATUM]" placeholder — maar de marketing-copy doet dat niet.

**Correctie**: "Internly verzamelt de data voor je ESG-verslag. Export beschikbaar binnenkort." OF: zet ESG uit marketing totdat de export live is.

---

### P6 — "Wettelijk recht" (juridische kwalificatie)
**Locatie**: index.html:943 (badge op BBL 02-card)
**Tekst**: Badge "Wettelijk recht"

**Probleem**: De 90-dagenregel voor BBL-contracten is inderdaad wettelijk vastgelegd (WEB/BPV-regelgeving). Dit is correct. Maar de badge "Wettelijk recht" koppelt aan een UI die de tracking doet via localStorage — als de student van device wisselt, is de deadline-staat weg. De juridische status van het recht is correct; de robuustheid van de tracking is dat niet.

**Precisiegraad**: 8/10 — de claim klopt juridisch, de implementatie is kwetsbaar

---

### P7 — "AVG-compliant dataverwerking"
**Locatie**: pricing.html:407 (school Premium feature checkbox)

**Probleem**: "AVG-compliant" is een juridische kwalificatie, geen feature-beschrijving. AVG-compliance vereist o.a.:
- Verwerkersovereenkomst (DPA) → aangevraagd, niet ontvangen
- Postadres verwerkingsverantwoordelijke → ontbreekt in privacybeleid
- RLS op alle tabellen → Admin RLS is client-side only

Dit is geen feature die je kunt aankruisen. Het is een juridische status. Het als ✓-feature aanbieden schept verwachtingen die niet ingelost worden.

**Correctie**: Vervang "AVG-compliant dataverwerking" door "Data opgeslagen in EU-regio (Supabase Frankfurt)" — dat is wél verifieerbaar.

---

### P8 — Statistieken (sourcing)
**Locatie**: index.html:838–852
**Teksten**:
- "1 op 10 MBO-studenten ervaart discriminatie bij stage" — Bron: CBS, december 2025 ✓
- "77% van de sollicitanten wordt geghost" — "indicatief — op basis van marktonderzoek" ⚠️
- "40 mails / 0 reacties" — "gemiddeld beeld — JOB MBO Onderzoek" ✓

**Probleem**: "77%" heeft een slappe sourcing ("indicatief"). Het getal wordt gepresenteerd als statistiek maar heeft geen verifieerbare bron. De andere twee hebben betere attributie.

**Correctie**: Ofwel een primaire bron vinden voor de 77%, ofwel de formulering verzachten: "Uit eigen onderzoek: ~3 op 4 sollicitanten ervaart geen reactie."

---

### P9 — "Geen spam, beloofd"
**Locatie**: index.html:1081

**Probleem**: "Beloofd" is een persoonlijk commitment, geen technische garantie. De frequentiebeperking "maximaal één mail per maand" heeft geen technische handhaving.

**Precisiegraad**: 7/10 — de intentie is helder, maar "beloofd" zet een toon die je niet technisch kunt borgen

---

### P10 — "Prioriteit in zoekresultaten" (Pro-feature)
**Locatie**: pricing.html:331

**Probleem**: Bedrijven met Pro-abonnement krijgen "prioriteit in zoekresultaten." Is dit geïmplementeerd in discover.html? Zoekvolgorde-logica onbekend zonder diepere grep. Risico: een betaald feature dat niet actief is.

**Status**: Niet geverifieerd — vereist grep op discover.html sortering. Markeer als open item.

---

## Patroonanalyse

De taalkundige problemen vallen in drie categorieën:

**Categorie A — Absolute guarantees zonder handhaving** (P1, P2):
Woorden als "altijd", "nooit", "geen uitzonderingen" scheppen juridisch risico als het platform deze niet technisch afdwingt.

**Categorie B — Mechanisme-claims voor niet-bestaande features** (P3, P4, P5):
"Houdt bij", "registreert automatisch", "levert data" impliceren actieve systemen. Als de systemen er niet zijn, is de copy misleidend.

**Categorie C — Juridische kwalificaties als features** (P6, P7):
"Wettelijk recht" en "AVG-compliant" zijn statussen, geen features. Ze aanprijzen als product-feature schept verwachtingen die juridisch getoetst worden — niet door een product-review.

---

## Aanbevelingen

1. **Directe aanpassing**: verwijder "Geen uitzonderingen" totdat Trust Score live is
2. **Directe aanpassing**: verwijder ESG als Pro-feature of voeg "(binnenkort)" toe
3. **Directe aanpassing**: vervang "AVG-compliant" door "Data opgeslagen in EU-regio"
4. **Binnenkort**: verifieer of "Prioriteit in zoekresultaten" actief is in discover.html
5. **Binnenkort**: sourcing voor 77% claim versterken of verzachten

---

*Witty — 22 april 2026 — READ-ONLY*
