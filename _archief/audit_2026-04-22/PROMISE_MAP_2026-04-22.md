# Deanna2 — Promise Map Audit
**Datum**: 22 april 2026
**Rol**: Deanna2 — Wil je me matchen met de beloften die het platform maakt, dan wil ik ook weten of het platform ze kan houden.
**Scope**: index.html, pricing.html, about.html — alle publieke marketing-claims vs. code-realiteit.
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Methode
Elke belofte wordt geclassificeerd als:
- ✅ **HOUDBAAR** — code-implementatie aanwezig en functioneel
- ⚠️ **GEDEELTELIJK** — deels geïmplementeerd of UI aanwezig maar backend ontbreekt
- ❌ **NIET HOUDBAAR** — belofte staat in marketing, implementatie ontbreekt

---

## Promises geïdentificeerd

### 1. Responsgarantie ("Zij reageren — altijd.")
**Bron**: index.html:914–916
**Tekst**: "Bedrijven hebben een responsverplichting. Geen reactie = lagere Trust Score. Geen uitzonderingen."

**Code-realiteit**:
- Trust Score auto-algoritme = **niet geïmplementeerd** (CLAUDE.md: stub)
- Ghosting-bestraffing = **niet geïmplementeerd** (CLAUDE.md: expliciet)
- Er is geen Supabase cron-job of Edge Function die responsverplichting handhaaft
- company-dashboard.html heeft deadline-meter UI (CSS aanwezig: lines 477–485) maar dit telt responstijd per vacature, geen platform-brede sanctie

**Oordeel**: ❌ NIET HOUDBAAR — "Geen uitzonderingen" is een absolute belofte zonder handhavingsmechanisme

---

### 2. Trust Score zichtbaar vóór sollicitatie
**Bron**: index.html:907 — "Zie de publieke Trust Score van elk bedrijf vóórdat je solliciteert."

**Code-realiteit**:
- Trust Score auto-algoritme = niet geïmplementeerd
- Geen herberekening bij nieuwe reviews (Edge Function ontbreekt per CLAUDE.md)
- Kolom `trust_score` bestaat waarschijnlijk in DB, maar de waarde is statisch/handmatig

**Oordeel**: ❌ NIET HOUDBAAR — Score bestaat als veld, maar de dynamische berekening die "publieke betrouwbaarheid" constitueert werkt niet automatisch

---

### 3. "Geen ghosting, geen vage beloftes"
**Bron**: index.html:735 (tagline)
**Tekst**: "Weet vooraf hoe betrouwbaar een bedrijf is. Geen ghosting, geen vage beloftes — gewoon stages die kloppen."

**Code-realiteit**:
- Ghosting-bestraffing = niet geïmplementeerd
- Trust Score auto-algoritme = niet geïmplementeerd
- Tagline is centrale waardepropositie maar beide mechanismen die het waarmaken ontbreken

**Oordeel**: ❌ NIET HOUDBAAR in huidige staat — platform máákt de belofte maar handhaaft hem niet

---

### 4. BBL 90-dagen deadline tracking
**Bron**: index.html:941–942
**Tekst**: "Je leerbedrijf moet 90 dagen vóór het einde beslissen over verlenging. Internly houdt die deadline bij."

**Code-realiteit**:
- bbl-hub.html:960: UI aanwezig — "Wettelijke termijn: 90 dagen" weergegeven in verlengingsview
- bbl-dashboard.html:263 en :344: links naar `bblView=verlenging`
- bbl-hub.html:2368–2389: renewal state geladen vanuit localStorage (niet DB)

**Oordeel**: ⚠️ GEDEELTELIJK — UI en weergave aanwezig; *actieve* tracking (notificatie bij nadering van deadline) niet bevestigd aanwezig; state via localStorage kwetsbaar bij device-switch

---

### 5. BBL anonieme review tot na contract
**Bron**: index.html:947–949
**Tekst**: "Je beoordeling van je leerbedrijf blijft anoniem tot na je contract. Zodat jij eerlijk kunt zijn."

**Code-realiteit**:
- Anonimiseringslogica niet geverifieerd in reviews-tabel of RLS-policies
- CLAUDE.md meldt geen specifieke implementatie van deze feature
- Admin RLS = client-side only → admin kan reviews in Supabase Console zien

**Oordeel**: ⚠️ GEDEELTELIJK — anonimiteit-UI bestaat waarschijnlijk, maar bescherming via RLS is niet verifieerbaar zonder Supabase Console-toegang

---

### 6. ESG/CSRD "harde data die stand houdt"
**Bron**: index.html:964–965, pricing.html:329
**Tekst**: "Internly levert traceerbare data over investering in jong talent — bruikbaar als onderbouwing in het ESG-verslag."

**Code-realiteit**:
- ESG-export = **stub** (CLAUDE.md: company-dashboard.html lines 2302–2303: "beschikbaar vanaf week 9")
- esg-rapportage.html:727: "De volledige exportfunctie is gepland voor **[LIVE-DATUM]**"
- company Pro feature "S1-stagedata voor CSRD-onderbouwing" (pricing.html:329) → stub

**Oordeel**: ❌ NIET HOUDBAAR — ESG-export is een expliciet bekende stub. "Harde data" als verkoopargument voor Pro-plan terwijl functie niet actief is, is misleidend

---

### 7. Stagepact 2025 "registreert automatisch"
**Bron**: index.html:891–892
**Tekst**: "Internly registreert automatisch wat je nodig hebt om te laten zien dat je je beloften nakomt."

**Code-realiteit**:
- Geen specifieke Stagepact-registratiefunctie aangetroffen
- Waarschijnlijk verwijzing naar de algemene stage-data in DB
- "Automatisch" impliceert geen handmatige stap nodig — niet verifieerbaar

**Oordeel**: ⚠️ GEDEELTELIJK — data wordt bij elke actie opgeslagen, maar geen gerichte Stagepact-export of -registratiefunctie aanwezig

---

### 8. "Geen verborgen kosten" + "maandelijks opzegbaar"
**Bron**: pricing.html:275, pricing.html:325, :398
**Tekst**: "Geen verborgen kosten. Bedrijven en scholen starten gratis."

**Code-realiteit**:
- startCheckout() = **stub** (CLAUDE.md: "Mollie niet actief")
- pricing.html:506: commentaar bevestigt "Mollie-integratie volgt"
- Er is geen werkende betalingsflow → het is onmogelijk om "maandelijks opzegbaar" te testen of aan te bieden

**Oordeel**: ⚠️ GEDEELTELIJK — de belofte is correct als intentie, maar de uitvoering ontbreekt. Zolang er geen werkende betaling is, is de belofte niet verifieerbaar

---

### 9. "Altijd gratis voor studenten"
**Bron**: pricing.html:281–282
**Tekst**: "Student? Internly is voor jou altijd gratis"

**Code-realiteit**:
- hasActivePlan() gating niet actief op: discover.html, matches.html, mijn-sollicitaties.html, chat.html, student-profile.html, vacature-detail.html (CLAUDE.md Sprint 5 P1)
- De belofte is momenteel per ongeluk waar: er is geen gating, dus studenten kunnen alles gratis gebruiken

**Oordeel**: ✅ HOUDBAAR (formeel) — maar gating is een Sprint 5 P1, dus na implementatie kan dit per abuis fout gaan

---

### 10. "AVG-compliant dataverwerking"
**Bron**: pricing.html:407 (school Premium feature)

**Code-realiteit**:
- Admin RLS = client-side only (CLAUDE.md)
- DPA aangevraagd maar niet ontvangen (geheugen)
- Postadres Sasubo Holding ontbreekt in privacybeleid (CLAUDE.md open items)

**Oordeel**: ❌ NIET HOUDBAAR — "AVG-compliant" als verkoopargument terwijl DPA ontbreekt en Admin RLS niet op serverniveau is geborgd

---

### 11. "Driegesprek-workflow" (school Premium)
**Bron**: pricing.html:404

**Code-realiteit**:
- school-dashboard.html: "ontbreekt 'Plan driegesprek' per student" (CLAUDE.md open items Sprint 5)

**Oordeel**: ❌ NIET HOUDBAAR — feature staat als ✓ op de pricingpagina maar is niet geïmplementeerd

---

### 12. "Geen spam, beloofd" / max één mail per maand (nieuwsbrief)
**Bron**: index.html:1081
**Tekst**: "Geen spam, beloofd — maximaal één mail per maand"

**Code-realiteit**:
- Geen backend enforcement van mail-frequentie aangetroffen
- Belofte is afhankelijk van discipline in verzendlijstbeheer

**Oordeel**: ⚠️ GEDEELTELIJK — intentie goed, technische borging ontbreekt

---

## Samenvatting

| # | Belofte | Oordeel |
|---|---------|---------|
| 1 | Responsgarantie | ❌ |
| 2 | Trust Score vóór sollicitatie | ❌ |
| 3 | "Geen ghosting" tagline | ❌ |
| 4 | BBL 90-dagen tracking | ⚠️ |
| 5 | BBL anonieme review | ⚠️ |
| 6 | ESG "harde data" | ❌ |
| 7 | Stagepact registratie | ⚠️ |
| 8 | Geen verborgen kosten / opzegbaar | ⚠️ |
| 9 | Altijd gratis voor studenten | ✅ |
| 10 | AVG-compliant | ❌ |
| 11 | Driegesprek-workflow | ❌ |
| 12 | Geen spam / max 1 mail | ⚠️ |

**Totaal**: 1 ✅ · 5 ⚠️ · 6 ❌

---

## Prioritering voor actie

**Onmiddellijk (vóór schaalvergroting)**:
1. Trust Score algoritme implementeren — de responsgarantie rust hierop
2. Ghosting-bestraffing implementeren — het centrale betalingsargument aan studenten
3. ESG-export activeren of de claim verwijderen uit Pro-plan

**Voor eerste betalende klant**:
4. Mollie-integratie — "maandelijks opzegbaar" bestaat nu niet
5. DPA afronden — "AVG-compliant" op pricing is juridisch risicovol zonder DPA
6. Driegesprek-workflow bouwen — staat als ✓ in school Premium

**Bij gelegenheid**:
7. BBL 90-dagen: DB-backed tracking + notificatie (nu alleen localStorage)
8. Stagepact-export specifiek maken

---

*Deanna2 — 22 april 2026 — READ-ONLY*
