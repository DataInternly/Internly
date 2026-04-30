# Internly — Prijsstrategie & Financieel Model 2026
**Sasubo Holding B.V.** | Opgesteld: April 2026 | Vertrouwelijk

---

## 1. Samenvatting

Internly is een driezijdig digitaal stageplatform dat studenten, bedrijven en onderwijsinstellingen verbindt via een gestructureerde matching-, begeleiding- en rapportageinfrastructuur. Het platform adresseert een aantoonbaar marktfalen: uit sector-onderzoek blijkt dat 77% van de stageplekken wordt gekenmerkt door ghosting — bedrijven die niet reageren op aanvragen, of studenten die afhaken zonder kennisgeving. Internly lost dit op door transparantie en verantwoording in te bouwen in het stageproces via een Stage Hub, een Trust Score-systeem en een driegesprek-workflow. Het platform is eigendom van en wordt geëxploiteerd door Sasubo Holding B.V., ingeschreven in het Nederlandse Handelsregister.

Het verdienmodel is asymmetrisch van opzet: studenten gebruiken het platform kosteloos, waarmee de netwerkeffecten op gang komen die voor betalende partijen waarde creëren. Bedrijven en scholen starten op een gratis tier met functionele beperkingen die bij groei organisch upgradedruk genereren. Individuele stagebegeleiders — een segment dat werd geïntroduceerd na ondertekening van het Stagepact in december 2025 — betalen een maandabonnement vanaf €49 per maand. De prijsstrategie is ontworpen om product-market fit te bewijzen tijdens een gestructureerde livetest in week 6, voordat significante marketinginvestering plaatsvindt. De verwachte maandelijkse terugkerende omzet (MRR) na twaalf maanden bedraagt €3.500 tot €6.000 bij een conservatief groeipad.

---

## 2. Kostenstructuur (maandelijks)

De operationele kosten van Internly zijn bewust laag gehouden tijdens de pre-revenue fase. De stack bestaat uit statische HTML/CSS/JS, Supabase als backend-as-a-service, en Mollie voor betalingsverwerking. Alle infrastructuurkosten schalen mee met gebruik.

| Kostenpost | Pre-livetest (week 6) | Early traction (3 mnd post-launch) | Sustainable (12 mnd) |
|---|---|---|---|
| **Supabase** (database, auth, storage, Edge Functions) | €0 (Free tier) | €23/mnd (Pro tier) | €23–€115/mnd (Pro–Team) |
| **Antagonist hosting** (statische site, domein internly.pro) | ~€8/mnd | ~€8/mnd | ~€15/mnd |
| **Mollie transactiekosten** (est. op basis van verwacht volume) | €0 | ~€15–€30/mnd | ~€60–€120/mnd |
| **123 Go e-mail & mailinglist** | ~€10/mnd | ~€10/mnd | ~€20/mnd |
| **Overig** (tools, domeinen, certificaten, kantoorkosten) | ~€15/mnd | ~€20/mnd | ~€40/mnd |
| **Totaal (geschat)** | **~€33/mnd** | **~€76–€91/mnd** | **~€158–€310/mnd** |

> **Toelichting Mollie:** Mollie rekent €0,29 per iDEAL-transactie en €0,29 + 1,2% voor creditcard. Bij maandelijks terugkerende abonnementen via Mollie Subscriptions gelden afwijkende tarieven afhankelijk van contractvorm. De bovenstaande schattingen zijn gebaseerd op respectievelijk 0, 40–80 en 150–300 actieve transacties per maand.

---

## 3. Huidig prijsschema vs. aanbevolen schema

| Plan | Huidig | Aanbevolen | Reden voor wijziging |
|---|---|---|---|
| **Student** | Gratis | Gratis | Geen wijziging — netwerkeffect vereist gratis toegang |
| **Bedrijf Starter** | €0 (1 vacature) | €0 (1 vacature) | Geen wijziging — free tier is acquisitiestrategie |
| **Bedrijf Pro** | €49/mnd | €59/mnd | Huidige prijs laat marge liggen; ESG-rapportage rechtvaardigt opwaartse correctie |
| **Bedrijf Business** | €149/mnd | €169/mnd | ATS-integratie en whitelabel zijn enterprise-functies; prijssignaal moet dit weerspiegelen |
| **School Freemium** | €0 (1 begeleider) | €0 (25 studenten) | Limiet per begeleider is minder intuïtief dan limiet per studentvolume; 25-studentengrens creëert schaalbare upgradedruk |
| **School Premium** | €299/jaar per opleiding | €29/mnd of €249/jaar per opleiding | Jaarprijs vertraagt procurement; maandoptie verlaagt drempel en trekt MBO/HBO pilots aan |
| **Begeleider Proef** | Niet beschikbaar | 30 dagen gratis | Betaalmuur voor eerste waarde remt adoptie in conservatief segment |
| **Begeleider Starter** | €49/mnd (max 30) | €49/mnd (max 30) | Prijs correct voor segment; geen wijziging |
| **Begeleider Pro** | €79/mnd (max 100) | €79/mnd (max 100) | Prijs correct voor segment; geen wijziging |

---

## 4. Compleet aanbevolen prijsschema

| Plan | Doelgroep | Prijs | Billing | Limieten | Kernwaarde |
|---|---|---|---|---|---|
| **Student Gratis** | MBO/HBO-studenten | €0 | — | — | Toegang tot stagepool, Stage Hub, sollicitatiedossier |
| **Bedrijf Starter** | Kleine bedrijven, eerste stageplek | €0 | Gratis, altijd | 1 actieve vacature | Laagdrempelige instap; matchsysteem toegankelijk |
| **Bedrijf Pro** | Actief wervende bedrijven | €59/mnd | Maandelijks opzegbaar | Onbeperkt vacatures | ESG-rapportage, CSRD-exports, Trust Score analytics, zoekhierarchie |
| **Bedrijf Business** | Meerdere vestigingen, enterprise | €169/mnd | Maandelijks opzegbaar | Onbeperkt + multi-locatie | Alles van Pro + kwartaalrapportages, prioriteitssupport, custom criteria (ATS 2027) |
| **School Freemium** | ROC's, HBO-instellingen | €0 | Gratis, altijd | Max 25 studenten | Basisdashboard, Stage Hub inzage, voortgangsoverzicht |
| **School Premium** | Scholen met actieve cohorten | €29/mnd of €249/jaar | Maand of jaar, per opleiding | Onbeperkt studenten | Signalen, exportrapportages, cohortanalyse, BBL-ondersteuning, driegesprek-workflow |
| **Begeleider Proef** | Nieuwe begeleiders | €0 | 30 dagen gratis | Max 10 studenten | Volledige Starter-functionaliteit; geen creditcard vereist |
| **Begeleider Starter** | Freelance stagebegeleiders | €49/mnd | Maandelijks opzegbaar | Max 30 studenten | Dashboard, Stage Hub per student, signalen, gesprekken plannen |
| **Begeleider Pro** | Professionele begeleiders, teams | €79/mnd | Maandelijks opzegbaar | Max 100 studenten | Alles van Starter + exportrapportages (PDF/CSV), prioriteitssupport |

---

## 5. Omzetprognose — drie scenario's

| Scenario | Tijdlijn | Mix betalende klanten (geschat) | Geschatte MRR | Geschatte kosten | Netto |
|---|---|---|---|---|---|
| **Livetest** | Week 6 (huidig) | 0 betalende klanten — Mollie nog niet live | €0 | ~€33/mnd | −€33/mnd |
| **Early traction** | 3 maanden post-launch | 8–12× Bedrijf Pro, 2–3× School Premium (mnd), 4–6× Begeleider Starter, 2–3× Begeleider Pro | €600–€1.200/mnd | ~€85/mnd | €515–€1.115/mnd |
| **Sustainable** | 12 maanden post-launch | 35–50× Bedrijf Pro, 5–8× Bedrijf Business, 10–15× School Premium, 12–18× Begeleider Starter, 6–10× Begeleider Pro | €3.500–€6.000/mnd | ~€220/mnd | €3.280–€5.780/mnd |

Het duurzame scenario na twaalf maanden markeert het punt waarop een eerste structurele personeelsinvestering verantwoord is. Bij een netto MRR van €3.000 of hoger is een parttime operationele rol of extern ontwikkelaarscontract financieel haalbaar zonder externe financiering. De grens van €5.000 netto MRR vertegenwoordigt het herinvesteringsdrempelpunt: op dat niveau wordt actieve marketinguitgave voor de schoolmarkt en een uitgebreide begeleiderscampagne rendabel. Een ARPU (gemiddelde opbrengst per betalende gebruiker) van circa €65/mnd over alle segmenten heen impliceert dat het duurzame scenario bereikt wordt bij circa 70–90 actieve betalende accounts — een realistisch doel voor een platform dat bewezen stagefrustratieproblematiek oplost in een markt van meer dan 400.000 stageplekken per jaar in Nederland.

---

## 6. Upgrade triggers per doelgroep

**Bedrijven** starten op de gratis Starter-tier met één actieve vacature. De upgradedruk treedt op zodra een bedrijf een tweede stageplek wil plaatsen voor een ander seizoen of een andere afdeling — een situatie die typisch optreedt na drie tot zes maanden gebruik wanneer de eerste stagiair succesvol is geplaatst. Het Pro-plan lost dit directe knelpunt op via onbeperkte vacatures, en biedt tegelijk de ESG-rapportage die voor bedrijven met meer dan 250 medewerkers per 2026 verplicht is onder de CSRD-richtlijn. Dit maakt de upgrade zakelijk verdedigbaar richting inkoop of management, niet slechts functioneel noodzakelijk.

**Scholen** ontvangen de Freemium-tier en stuiten op de 25-studentenlimiet zodra een cohort volledig actief is op het platform. Voor een gemiddeld MBO-opleidingsteam met 40 tot 80 studenten per jaar is deze grens realistisch bereikt binnen de eerste acht weken van het studiejaar. De Premium-tier lost de limiet op en voegt de Signalen-module toe — de functionaliteit die begeleiders proactief waarschuwt wanneer een student meer dan veertien dagen inactief is. Dit is juist de functie die schoolbegeleiders het meest waarderen, omdat het hun handmatige opvolgwerk elimineert. De jaarprijs van €249 is positioneel vergelijkbaar met een reguliere toollicentie en valt binnen standaard inkoopmandaten.

**Begeleiders** bereiken de upgradedruk via de studentcapaciteitslimiet: de Starter-tier is begrensd op 30 studenten, de Proef-tier op 10. Een zelfstandig begeleider die werkzaam is voor meerdere scholen of via een detacheringsconstructie, overstijgt de 30-studentengrens zodra het portfolio groeit. Het Pro-plan biedt naast de hogere capaciteit ook exportrapportages in PDF en CSV-formaat — een harde vereiste wanneer de begeleider verantwoording moet afleggen aan een opdrachtgever of onderwijsinstelling. De exportfunctie is daarmee niet slechts een premium feature, maar een professionele basiseis die de Starter-tier bewust buiten bereik houdt.

---

## 7. Risico's en mitigaties

| # | Risico | Ernst | Mitigatie |
|---|---|---|---|
| 1 | **Starter-to-Pro upgrade path onduidelijk** — gebruikers zien de limiet pas als ze er tegenaan lopen; er is geen proactief upgrademechanisme | Middel | Limietbanner in dashboard zodra 80% van de gratis quota is bereikt; upgrade-CTA direct in de banner met één klik naar Mollie-checkout |
| 2 | **School procurement traag door jaarprijs** — onderwijsinstellingen doorlopen formele inkoopprocessen die weken tot maanden duren bij uitgaven boven €250 | Hoog | Maandoptie (€29/mnd) toevoegen aan School Premium zodat pilotaankoop buiten formeel mandaat valt; instellingskorting beschikbaar via directe offerte voor meerdere opleidingen |
| 3 | **Begeleider betaalmuur voor eerste waarde** — het segment is grotendeels onbekend met Internly; een direct betaalvereiste remt adoptie in een voorzichtige beroepsgroep | Middel | 30-daagse proefperiode zonder creditcard invoeren (Begeleider Proef-tier); conversie meten aan het einde van de proefperiode voordat het plan wordt bijgesteld |
| 4 | **`hasActivePlan()` transitie bij Mollie go-live** — bestaande gratis gebruikers die Pro-functionaliteiten hebben gebruikt, kunnen worden buitengesloten bij activering van de betalingscheck | Hoog | Zie sectie 8 voor volledig overgangsplan; kritiek vóór FTP-upload van Mollie-integratie |
| 5 | **Marktpenetratie in een conservatieve HR-markt** — stagecoördinatie is in veel bedrijven informeel georganiseerd; betalingsbereidheid voor digitale tools is onbewezen in het MKB-segment | Hoog | Gratis tier als primair acquisitiemiddel; sociale bewijslast via Trust Score en reviews als conversiemotor; livetest-data week 6 als go/no-go beslismoment voor marketinginvestering |

---

## 8. Mollie implementatie — overgangsplan

Op het moment dat de Mollie-betalingsintegratie live gaat en `hasActivePlan()` actief abonnementsstatus gaat controleren, bevinden zich in het systeem gebruikers die zich hebben geregistreerd als bedrijf of school en die via de huidige gratis seed-flow een actieve subscription hebben ontvangen zonder betaling. Scholen en bedrijven met een `company_starter` of `school_freemium` plan worden hier niet door geraakt — die plans zijn kosteloos en blijven geldig. Het risico betreft gebruikers die tijdens de testfase toegang hebben gekregen tot functies die in de definitieve tiers achter een betaalscherm vallen.

**Aanbevolen overgangsprotocol:**

1. **Grootvaderperiode van 30 dagen** — bestaande gebruikers die Pro-functionaliteiten actief hebben gebruikt, ontvangen automatisch een 30-daagse verlenging van hun huidige toegangsniveau. Dit voorkomt abrupte functieverlies en geeft tijd voor geïnformeerde upgradebeslissing.

2. **E-mailnotificatie** — op dag 1 van de overgangsperiode ontvangt elke betrokken gebruiker een persoonlijke e-mail via 123 Go met uitleg over de wijziging, een directe link naar de juiste pricing.html-sectie, en de upgrade-instructie. Op dag 21 volgt een herinneringsmail.

3. **Soft paywall (banner) vóór hard block** — na 30 dagen verschijnt een niet-afsluitbare informatiebanner in het dashboard die de betalingsvereiste toelicht en een directe checkout-knop biedt. Volledige functieblokkering treedt pas in na 7 extra dagen (dag 37 totaal).

**Voorgestelde tijdlijn:**

| Fase | Actie | Timing |
|---|---|---|
| Voorbereiding | FTP-upload van alle pending bestanden; end-to-end test begeleider-checkout | Week 6 livetest |
| Go-live Mollie | `hasActivePlan()` activeert betalingscheck; grootvaderperiode start | Na succesvolle livetest |
| Dag 1 | E-mailnotificatie aan alle getroffen gebruikers | Dag 1 na go-live |
| Dag 21 | Herinneringsmail | Dag 21 |
| Dag 30 | Soft paywall (banner) zichtbaar in dashboard | Dag 30 |
| Dag 37 | Hard block actief — Pro-functies niet langer toegankelijk zonder actief betalend plan | Dag 37 |

---

## 9. Conclusie

Het aanbevolen prijsmodel voor Internly is correct voor deze markt om drie structurele redenen. Ten eerste dwingt de driezijdige platformlogica tot een asymmetrisch model: studenten mogen geen drempel ondervinden, want hun aanwezigheid is de belofte die bedrijven en scholen betalen om te bereiken. Ten tweede sluit de gratis-tier-met-limieten-strategie aan op bewezen SaaS-patronen in de HR-technologiesector, waarbij upgrade-triggers organisch ontstaan vanuit gebruik in plaats van verkoopdruk. Ten derde positioneert de introductie van het begeleiderssegment — mede gestimuleerd door het Stagepact van december 2025 — Internly als de enige partij die individuele begeleiders, scholen én bedrijven gelijktijdig bedient binnen één geïntegreerde omgeving. Dat gegeven rechtvaardigt de separate tariefstructuur per doelgroep.

De eerste twaalf maanden zien er als volgt uit bij een succesvol verloop van livetest week 6: maanden één tot drie zijn gericht op het bewijzen van conversie vanuit de gratis tier naar betaalde plannen, met een doelstelling van €600 tot €1.200 MRR. Maanden vier tot acht verschuiven de focus naar schoolkanalen — waarbij de maandoptie van €29 de primaire instapvorm is — en naar groei van het begeleiderssegment via de proefperiode-to-Starter-funnel. Maanden negen tot twaalf zijn gericht op consolidatie, het behalen van de herinvesteringsdrempel van €3.000 netto MRR, en de voorbereiding van een gerichte campagne richting grotere onderwijsinstellingen met instellingskortingen als conversiemechanisme.

Een prijsherziening is gerechtvaardigd onder drie specifieke condities: (1) de Starter-to-Pro-conversieratio bij bedrijven blijft na zes maanden structureel onder de 8%, wat duidt op onvoldoende upgradedruk vanuit de free tier en een aanpassing van de vacaturelimiet of feature-gating vereist; (2) schooladoptie stagneert door de jaarprijsperceptie ondanks de maandoptie, wat een verdere prijsreductie of een instellingsbreed model vereist; (3) het begeleiderssegment converteert significant beter dan verwacht uit de proefperiode, wat ruimte geeft voor een opwaartse prijscorrectie bij Starter of Pro bij de jaarlijkse evaluatie in Q1 2027.

---

*Opgesteld door Sasubo Holding B.V. — vertrouwelijk intern document*
