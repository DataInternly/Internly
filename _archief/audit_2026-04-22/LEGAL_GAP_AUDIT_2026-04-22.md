# Guinan2 — Legal Gap Audit
**Datum**: 22 april 2026
**Rol**: Guinan2 — Ik zie de juridische risico's die anderen niet zien totdat het te laat is.
**Scope**: Alle juridisch relevante claims, functies en dataflows.
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Bevindingen

---

### L1 — AWGB-risico: filteropties als discriminatie-proxy
**Bron**: CLAUDE.md (Guinan2, 17 april 2026)
**Status**: Bekend, niet opgelost

**Context**: company-discover.html biedt filters waarmee bedrijven studenten kunnen selecteren. Domeinfilters kunnen impliciet niveau of herkomst signaleren. AWGB (Wet Gelijke Behandeling) verbiedt indirecte discriminatie.

**Specifiek risico**:
- Filter op "sector" of "opleiding" kan proxy zijn voor etniciteit of afkomst (bijv. selectief filteren op sectoren met bepaalde demografische profielen)
- Filter op "niveau" (BBL/MBO/HBO/WO) is op zichzelf legitiem, maar combinaties kunnen discriminatoire uitkomsten produceren
- CLAUDE.md: "Beoordeling door juridische adviseur nodig vóór schaalvergroting"

**Urgentie**: HOOG bij schaalvergroting. Nu het platform nog klein is, is het risico beperkt. Maar: zodra een bedrijf aantoonbaar stuurt op demografische proxy's via de filters, is Internly mogelijk medeplichtig.

**Aanbeveling**: Juridisch advies inwinnen over welke filter-combinaties toegestaan zijn. Overweeg audit-trail per bedrijfsfiltergebruik.

---

### L2 — "AVG-compliant" als marketing-claim
**Bron**: pricing.html:407 + Bedward-rapport

**Context**: "AVG-compliant dataverwerking" staat als ✓-feature op het school Premium-abonnement. Dit is een juridische status, geen product-feature.

**Risico**:
- Een school die op basis van deze claim tekent, heeft een contractuele verwachting van AVG-compliance
- Bij een datalek of AVG-klacht kan de school aanvoeren dat Internly nalatig was terwijl het compliance beloofde
- DPA ontbreekt → elke verwerking is al in strijd met AVG art. 28, ongeacht de marketing-claim

**Urgentie**: HOOG — directe aansprakelijkheid bij eerste betalende school.

---

### L3 — Mollie-stub: transactie-UI zonder werkende betaling
**Bron**: CLAUDE.md (startCheckout() stub), pricing.html:506

**Context**: pricing.html toont prijzen en "Kies Pro"-knoppen die een checkout starten. startCheckout() roept een Edge Function aan (`create-checkout`) die niet bestaat of niet actief is.

**Risico**:
- Gebruiker klikt "Kies Pro →", er geen bevestiging, geen factuur, geen overeenkomst → juridisch gezien is er geen contract gesloten
- Als iemand per ongeluk denkt betaald te hebben (bijv. via een oud Mollie-testflow) terwijl de DB een 'active' subscription aanmaakt: onterechte servicelevering
- company_starter en school_freemium doen een directe DB-upsert zonder betaling — dit is correct voor gratis plans, maar onderscheid is niet altijd duidelijk in de UI

**Urgentie**: MIDDEL nu, HOOG zodra er betalende klanten zijn.

---

### L4 — CSRD-claim: "harde data die stand houdt"
**Bron**: index.html:964–965, pricing.html:329

**Context**: Pro-plan verkoopt "S1-stagedata voor je CSRD-onderbouwing." ESG-export is een stub.

**Risico**:
- CSRD (Corporate Sustainability Reporting Directive) is EU-wetgeving. Bedrijven die op basis van Internly-data CSRD-rapportages opstellen, vertrouwen op data-integriteit.
- Als een bedrijf op basis van een stub-export een CSRD-rapport indient, kan de accountant of toezichthouder de data niet valideren.
- Internly claimt een compliance-functie te leveren die niet bestaat.

**Urgentie**: MIDDEL — zolang geen bedrijf daadwerkelijk een CSRD-rapport indient op basis van Internly-data. Maar de marketing-claim is al misleidend.

---

### L5 — Stagepact 2025: framing-risico
**Bron**: index.html:891–892

**Context**: "Internly registreert automatisch wat je nodig hebt om te laten zien dat je je beloften nakomt." Dit verwijst naar het Stagepact 2025.

**Risico**:
- Het Stagepact is een bestuurlijk akkoord (ministerie OCW + werkgevers + sociale partners), geen wet. Het heeft geen afdwingbare rapportageverplichting.
- Internly positioneert zich als Stagepact-compliance tool. Als dit onterecht is (de verplichting bestaat niet in de beoogde zin), is de marketing misleidend.
- Als het Stagepact wél afdwingbaar wordt, heeft Internly een compliance-verplichting aangenomen die het niet kan waarmaken (want de "automatische registratie" bestaat niet).

**Urgentie**: LAAG nu, maar vereist juridisch advies over de actuele status van het Stagepact.

---

### L6 — BBL "Wettelijk recht": correcte claim, kwetsbare implementatie
**Bron**: index.html:943 (badge), bbl-hub.html:960

**Context**: De 90-dagenregel voor BBL-contracten is gebaseerd op WEB (Wet Educatie en Beroepsonderwijs) / BPV-regelgeving. De juridische claim klopt.

**Risico**:
- De implementatie tracked via localStorage. Als een student een claim indient bij een geschil en verwijst naar "Internly hield de deadline bij", is localStorage-data geen juridisch bewijsstuk.
- De 90-dagendeadline-UI is een reminder, geen bewijs.

**Urgentie**: LAAG — geen directe aansprakelijkheid, wel een verwachtingsverschil.

---

### L7 — Ontbrekend postadres in privacybeleid
**Bron**: CLAUDE.md open items

**Context**: Art. 13 AVG vereist dat de verwerkingsverantwoordelijke zijn contactgegevens vermeldt, inclusief postadres. Het postadres van Sasubo Holding B.V. ontbreekt in privacybeleid.html.

**Risico**:
- Formele tekortkoming in AVG-naleving
- Een privacy-klacht bij de AP is ontvankelijker als basisverplichtingen ontbreken

**Urgentie**: LAAG — eenvoudig te fixen. Moet opgelost zijn vóór schaalvergroting.

---

### L8 — Geen zichtbare gebruiksvoorwaarden
**Observatie**: pricing.html en index.html verwijzen niet naar gebruiksvoorwaarden (Terms of Service). Er is geen ToS-link aangetroffen.

**Risico**:
- Zonder ToS zijn de rechten en plichten van gebruikers (bedrijven, studenten, scholen) niet vastgelegd
- Bij geschil over platform-gebruik is er geen juridische basis

**Urgentie**: MIDDEL — een ToS is verplicht vóór commerciële activiteit.

---

## Prioriteringsmatrix

| # | Risico | Urgentie | Impact | Actie |
|---|--------|----------|--------|-------|
| L2 | "AVG-compliant" in marketing | HOOG | Aansprakelijkheid | Verwijder of herformuleer |
| L1 | AWGB filterrisico | HOOG | Juridische klacht | Juridisch advies |
| L3 | Mollie stub + transactie UI | MIDDEL | Contractgeschil | Mollie activeren |
| L4 | CSRD claim zonder ESG export | MIDDEL | Misleidende reclame | Export of claim verwijderen |
| L8 | Geen ToS | MIDDEL | Geen juridische basis | ToS opstellen |
| L5 | Stagepact framing | LAAG | Reputatierisico | Juridisch advies |
| L7 | Postadres privacybeleid | LAAG | AVG-formeel | Adres toevoegen |
| L6 | BBL localStorage-bewijs | LAAG | Verwachtingsverschil | Communiceer duidelijk |

---

## Aanbeveling

**Vóór eerste betalende klant (school of bedrijf)**:
1. DPA Supabase activeren
2. "AVG-compliant" verwijderen uit pricing feature-lijst
3. ToS opstellen (minimale versie)
4. Postadres toevoegen aan privacybeleid

**Vóór schaalvergroting**:
5. Juridisch advies over AWGB-filterrisico
6. ESG-export activeren of CSRD-claim verwijderen

---

*Guinan2 — 22 april 2026 — READ-ONLY*
