-- ============================================================
-- Internly Kennisbank — Seed 20 artikelen
-- Datum: 22 april 2026
-- Uitvoeren na internly_migration.sql
-- ============================================================

-- ── 1. Hoe schrijf je een goede motivatiebrief voor je stage ─────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'motivatiebrief-stage',
'Hoe schrijf je een goede motivatiebrief voor je stage',
'Een goede motivatiebrief vertelt een bedrijf in vijf zinnen waarom jij past en waarom je wilt leren. Zo zet je hem op.',
$md$## Wat maakt een motivatiebrief effectief?

Een motivatiebrief is geen samenvatting van je cv. Het is een verhaal: waarom dit bedrijf, waarom nu, en wat jij erbij zoekt. Bedrijven lezen tientallen brieven per week. De meeste beginnen met "Ik schrijf u om mijn interesse te tonen in…". Meteen weggooien.

Begin anders. Begin met wat je wilt leren of met een observatie over het bedrijf. Dat trekt aandacht.

## De structuur die werkt

Een effectieve brief heeft vijf onderdelen:

### 1. Opening — de haak
Vertel in één of twee zinnen waarom je schrijft. Niet "met grote interesse", maar iets concreets: "Na mijn project over duurzame verpakkingen wilde ik zien hoe dat er in de praktijk uitziet — en jullie werk met gerecyclede materialen spreekt me aan."

### 2. Wie ben jij?
Twee à drie zinnen over wie je bent als student. Geen lijst van vakken. Vertel iets persoonlijks: een project, een stage die je deed, een probleem dat je oploste.

### 3. Waarom dit bedrijf?
Laat zien dat je het bedrijf kent. Verwijs naar een product, project, of waarde die je aansprak. Zeg niet "jullie zijn marktleider" — dat zegt iedereen. Zeg: "Jullie aanpak van klantcontact via directe teams past bij wat ik wil leren."

### 4. Wat breng jij mee?
Één specifieke vaardigheid of eigenschap die relevant is voor de stage. Met een voorbeeld. "Ik ben gewend om zelfstandig te werken — afgelopen semester rondde ik een dataproject af zonder vaste deadlines van mijn docent."

### 5. Afsluiting
Kort en direct. Geen "ik hoop van u te horen" maar: "Ik vertel graag meer in een kennismaking."

## Veelgemaakte fouten

- Brief kopiëren en bedrijfsnaam aanpassen → bedrijven merken het direct
- Te lang: meer dan één pagina verliest aandacht
- Alleen over jezelf schrijven zonder bedrijf te noemen
- Beginnen met "Ik" — probeer een andere eerste zin
- Taalfouten: laat iemand meelezen

## Praktische tips

Schrijf de brief pas nadat je de website van het bedrijf hebt gelezen. Zoek naar nieuws, projecten, of waarden die je kunt noemen. Hoe specifieker, hoe beter je brief.

Gebruik actieve zinnen: "Ik analyseerde" in plaats van "Er werd door mij geanalyseerd." Dat leest sterker en toont zelfvertrouwen.

Hou de brief op één A4. Dat is een vereiste, geen aanbeveling.
$md$,
ARRAY['student_bol', 'student_bbl'],
ARRAY['motivatiebrief', 'sollicitatie', 'schrijven', 'stage zoeken'],
'[{"label":"Rijksoverheid — Tips voor je sollicitatie","url":"https://www.rijksoverheid.nl/onderwerpen/werk-zoeken"}]'::jsonb,
true, now()
);

-- ── 2. Wat moet er in een stagecontract staan ────────────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'stagecontract-inhoud',
'Wat moet er in een stagecontract staan',
'Een stageovereenkomst beschermt jou én het bedrijf. Weet wat erin moet staan voor je tekent.',
$md$## Waarom een stagecontract verplicht is

Een stage zonder contract is een risico. Als er iets misgaat — een ongeluk, een conflict over taken, of een vroegtijdig einde — heb je zonder schriftelijke afspraken weinig houvast. Zorg altijd dat er een getekende stageovereenkomst is voor je begint.

## Wat moet erin staan?

Een stagecontract bevat minimaal:

### Partijen
Naam en adres van de school, het bedrijf en de stagiair. Alle drie partijen tekenen.

### Stageduur en werktijden
Begin- en einddatum, het aantal uren per week en de werktijden. Let op: zijn de uren in lijn met wat je op school afspreekt?

### Stagevergoeding
Is er een vergoeding? Zo ja, hoe hoog, en wanneer wordt die uitbetaald? Een vergoeding is niet verplicht bij BOL-stages, maar veelgebruikelijk. Bij BBL heb je een arbeidsovereenkomst en geldt een minimumloon.

### Taken en leerdoelen
Een omschrijving van de werkzaamheden en de leerdoelen die je nastreeft. Dit voorkomt dat je werk doet dat niets met je opleiding te maken heeft.

### Begeleiding
Wie is je begeleider bij het bedrijf? Hoeveel contactmomenten zijn er? Is er ook een schoolbegeleider?

### Geheimhouding en IP
Mag je werkzaamheden in je portfolio opnemen? Wat zijn de afspraken over bedrijfsinformatie?

### Verzekering
Ben je verzekerd tijdens de stage? Wie is verantwoordelijk bij een bedrijfsongeval?

### Beëindiging
Wat zijn de afspraken als de stage eerder stopt — door jou of door het bedrijf?

## Valkuilen

- Tekenen zonder te lezen: neem de tijd en vraag uitleg als iets onduidelijk is
- Geen kopie bewaren: zorg dat je altijd een getekend exemplaar hebt
- Vage taakomschrijving: "overige werkzaamheden" is te breed — vraag om concretisering

## Wat als er geen contract is?

Vraag er proactief om. Als een bedrijf weigert een contract op te stellen, is dat een reden om kritisch te zijn. Je school heeft hier ook een verantwoordelijkheid — meld het aan je stagebegeleider.
$md$,
ARRAY['student_bol', 'student_bbl'],
ARRAY['stagecontract', 'rechten', 'juridisch', 'overeenkomst'],
'[{"label":"Rijksoverheid — Stageovereenkomst","url":"https://www.rijksoverheid.nl/onderwerpen/stages/vraag-en-antwoord/stageovereenkomst"}]'::jsonb,
true, now()
);

-- ── 3. Je rechten als stagiair volgens het Stagepact (2025) ─────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'stagepact-rechten-stagiair',
'Je rechten als stagiair volgens het Stagepact (2025)',
'Het Stagepact van december 2024 legt nieuwe verwachtingen vast voor bedrijven. Wat betekent dat voor jou als stagiair?',
$md$## Wat is het Stagepact?

In december 2024 sloten werkgeversorganisaties, scholen en de overheid het Stagepact. Doel: de stagemarkt eerlijker en toegankelijker maken. Het pact is geen wet — bedrijven ondertekenen het vrijwillig — maar het schept duidelijke verwachtingen.

## Wat het Stagepact voor jou betekent

### Geen vervanging van betaald werk
Bedrijven die het pact ondertekenen, committeren zich eraan dat stages echte leerplekken zijn. Jij mag geen taken uitvoeren die normaal door betaalde medewerkers worden gedaan, zonder dat daar begeleiding en leerdoelen tegenover staan.

### Reactieplicht
Bedrijven committeren zich aan een reactie op stageverzoeken. Ghosting — geen antwoord geven op een sollicitatie — hoort hier niet bij. Internly houdt dit bij via de Trust Score.

### Toegankelijkheid
Het pact bevat afspraken over gelijke kansen. Bedrijven mogen geen discriminerende voorwaarden stellen bij de selectie van stagiairs. Zie ook ons artikel over discriminatie op de stagemarkt.

### Begeleiding
Elke stagiair heeft recht op een vaste begeleider bij het bedrijf die bereikbaar is en regelmatig feedback geeft.

## Wat het Stagepact níet is

Het pact verplicht bedrijven niet tot een stagevergoeding (hoewel dit sterk aanbevolen wordt). Het is ook geen vervanging van een stagecontract of van de rechten die je hebt via je school.

## Hoe check je of een bedrijf het pact heeft ondertekend?

Op de website van het Stagepact staat een deelnemerslijst. Je kunt ook aan het bedrijf vragen of ze deelnemen. Op Internly is de Trust Score mede gebaseerd op hoe bedrijven omgaan met reacties en begeleiding.

## Als het fout gaat

Meld je situatie bij je school. Als er sprake is van structureel misbruik, kun je dit ook melden bij het ministerie van OCW of bij de brancheorganisatie van het bedrijf. Het Stagepact heeft een meldpunt voor misstanden.
$md$,
ARRAY['student_bol', 'student_bbl'],
ARRAY['stagepact', 'rechten', 'wetgeving', 'eerlijke stage'],
'[{"label":"Stagepact — Officiële website","url":"https://www.stagepact.nl"},{"label":"Rijksoverheid — Stages","url":"https://www.rijksoverheid.nl/onderwerpen/stages"}]'::jsonb,
true, now()
);

-- ── 4. Ghosting herkennen en wat je ermee kunt ──────────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'ghosting-stage',
'Ghosting herkennen en wat je ermee kunt',
'Geen reactie op je sollicitatie of bericht? Zo herken je ghosting en dit zijn je opties.',
$md$## Wat is ghosting op de stagemarkt?

Ghosting betekent dat een bedrijf stopt met reageren zonder uitleg. Dit kan op verschillende momenten gebeuren: na een eerste sollicitatie, na een gesprek, of zelfs nadat er een stageafspraak leek te zijn.

Ghosting is frustrerend en kost tijd. Je wacht op een antwoord dat niet komt, terwijl je ondertussen andere kansen misloopt.

## Hoe herken je het?

### Na je sollicitatie
- Meer dan twee weken geen reactie na een volledig ingevulde aanvraag
- Geen automatische bevestiging ontvangen

### Na een gesprek
- Afgesproken terugkoppeltijd is verstreken zonder bericht
- Berichten worden op "gelezen" gezet maar niet beantwoord

### Tijdens de stageperiode
- Begeleider reageert meerdere dagen niet op vragen
- Afspraken worden verzet of niet nagekomen zonder uitleg

## Wat kun je doen?

### Stap 1 — Één follow-up sturen
Wacht twee werkdagen na de beloofde reactiedatum. Stuur dan één kort, vriendelijk bericht: "Ik wilde even informeren of er al nieuws is over mijn sollicitatie."

### Stap 2 — Accepteren en verder
Als er na de follow-up geen reactie komt, is het antwoord waarschijnlijk nee. Je tijd is waardevol — zet je energie in andere kansen.

### Stap 3 — Melden via Internly
Op Internly kun je via de Trust Score aangeven dat een bedrijf niet heeft gereageerd. Dit helpt andere studenten en houdt bedrijven verantwoordelijk.

### Stap 4 — School inlichten
Als een bedrijf waarmee je school een overeenkomst heeft ghosted, informeer dan je stagebegeleider. De school kan het bedrijf aanspreken.

## Wat je niet moet doen

Stuur niet meerdere berichten achter elkaar. Dat maakt een gespannen indruk en helpt je niet. Eén follow-up is genoeg.
$md$,
ARRAY['student_bol', 'student_bbl'],
ARRAY['ghosting', 'sollicitatie', 'communicatie', 'bedrijven'],
'[{"label":"Stagepact — Aanpak ghosting","url":"https://www.stagepact.nl"}]'::jsonb,
true, now()
);

-- ── 5. Verschil tussen BOL en BBL ───────────────────────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'bol-bbl-verschil',
'Verschil tussen BOL en BBL — wat betekent het voor jou',
'BOL en BBL zijn twee leerroutes binnen het MBO. Ze bepalen hoe jij je stage ervaart, wat je verdient en wat je rechten zijn.',
$md$## Twee routes, één doel

Zowel BOL als BBL leiden tot een MBO-diploma. Het verschil zit in waar je het meeste tijd doorbrengt: op school (BOL) of bij een bedrijf (BBL).

## BOL — Beroepsopleidende Leerweg

Bij BOL breng je vier dagen per week door op school en één dag bij een stagebedrijf. De stage is een leerplek, geen baan. Je bent geen werknemer en hebt geen recht op minimumloon — al geven veel bedrijven wel een stagevergoeding.

**Kenmerken BOL:**
- School is leidend; stage is aanvullend
- Geen arbeidsovereenkomst
- Stagevergoeding is vrijwillig (gemiddeld €200–500 per maand)
- Je bent verzekerd via school tijdens de stage

## BBL — Beroepsbegeleidende Leerweg

Bij BBL werk je vier dagen per week bij een leerbedrijf en ga je één dag naar school. Je hebt een arbeidsovereenkomst met het bedrijf. Dat betekent: je hebt recht op minimumloon (voor jouw leeftijdsgroep), vakantiedagen en andere arbeidsrechten.

**Kenmerken BBL:**
- Bedrijf is leidend; school is aanvullend
- Arbeidsovereenkomst verplicht
- Recht op minimumloon
- Je valt onder de CAO van de sector

## Wat past bij jou?

**Kies BOL als:**
- Je nog aan het oriënteren bent op een sector
- Je meer structuur en theorie wilt via school
- Je flexibel wilt zijn in het wisselen van leerbedrijf

**Kies BBL als:**
- Je al weet in welke sector je wilt werken
- Je liever leert door te doen dan via schoolbanken
- Je inkomen wil verwerven tijdens je opleiding

## Wisselen tussen BOL en BBL

Het is mogelijk om te wisselen, maar dat gaat niet automatisch. Bespreek het met je schooldecaan. Wisselen betekent soms een jaar opnieuw starten.
$md$,
ARRAY['student_bol', 'student_bbl'],
ARRAY['BOL', 'BBL', 'MBO', 'leerroute', 'arbeidsrecht'],
'[{"label":"SBB — Verschil BOL en BBL","url":"https://www.s-bb.nl/voor-studenten/bol-of-bbl"}]'::jsonb,
true, now()
);

-- ── 6. Leerdoelen formuleren ─────────────────────────────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'leerdoelen-formuleren',
'Leerdoelen formuleren die bedrijven waarderen',
'Vage leerdoelen zorgen voor vage stages. Zo schrijf je doelen die meetbaar zijn én laten zien dat je serieus bent.',
$md$## Waarom leerdoelen ertoe doen

Een stage zonder leerdoelen is als een reis zonder bestemming. Je raakt er wel, maar je weet achteraf niet precies wat je hebt geleerd. En je begeleider weet niet wat hij of zij van jou mag verwachten.

Goede leerdoelen maken het gesprek met je stagebegeleider makkelijker. Ze geven richting aan je taken en maken je eindverslag schrijven een stuk eenvoudiger.

## De SMART-methode

Een beproefd hulpmiddel: SMART-doelen. Elk leerdoel is:

- **Specifiek** — wat precies wil je leren?
- **Meetbaar** — hoe weet je dat je het bereikt hebt?
- **Acceptabel** — past het bij de stage en je opleiding?
- **Realistisch** — kun je het halen in de stageduur?
- **Tijdgebonden** — wanneer wil je het bereikt hebben?

## Slecht vs. goed: voorbeelden

**Slecht:** "Ik wil meer leren over marketing."

**Goed:** "Aan het einde van mijn stage kan ik zelfstandig een social media contentkalender opstellen voor één maand, inclusief doelgroepanalyse."

---

**Slecht:** "Ik wil beter worden in communiceren."

**Goed:** "Na acht weken kan ik een klantgesprek voeren en de uitkomst schriftelijk samenvatten in een intern rapport."

## Hoeveel leerdoelen?

Richt je op drie tot vijf leerdoelen per stage. Meer wordt onbeheersbaar. Minder geeft te weinig richting.

## Afstemmen met het bedrijf

Bespreek je leerdoelen in het eerste gesprek met je stagebegeleider. Vraag of de taken in de stage het mogelijk maken om die doelen te bereiken. Als dat niet zo is, is dit het moment om bij te sturen — niet halverwege de stage.

## Leerdoelen koppelen aan je eindverslag

Vrijwel elk MBO-eindverslag vraagt om reflectie op je leerdoelen. Als je ze SMART hebt geformuleerd, heb je concrete voorbeelden om over te schrijven. Dat maakt je verslag sterker.
$md$,
ARRAY['student_bol', 'student_bbl'],
ARRAY['leerdoelen', 'SMART', 'stage plannen', 'eindverslag'],
'[{"label":"SBB — Leerdoelen stage","url":"https://www.s-bb.nl"}]'::jsonb,
true, now()
);

-- ── 7. Discriminatie op de stagemarkt ───────────────────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'discriminatie-stagemarkt',
'Discriminatie op de stagemarkt — wat te doen',
'CBS-onderzoek laat zien dat studenten met een migratieachtergrond vaker worden afgewezen op de stagemarkt. Dit zijn je rechten en opties.',
$md$## Het probleem is aangetoond

Onderzoek van het Centraal Bureau voor de Statistiek (CBS) toont aan dat studenten met een niet-westerse migratieachtergrond significant vaker worden afgewezen voor stages, ook bij gelijke kwalificaties. Dit is een structureel probleem in de Nederlandse stagemarkt, geen incident.

Internly zet zich in voor een eerlijke stagemarkt. Discriminatie is strijdig met de wet en met de waarden van ons platform.

## Wat is discriminatie bij stages?

Discriminatie betekent dat je anders wordt behandeld op basis van kenmerken die niets te maken hebben met je capaciteiten. Dit kan gaan om:

- Afkomst of nationaliteit
- Naam of uiterlijk
- Religie of levensovertuiging
- Geslacht of genderidentiteit
- Handicap of chronische ziekte
- Leeftijd

## Hoe herken je het?

Discriminatie is niet altijd expliciet. Soms uit het zich in:
- Vragen in een gesprek die niets met de stage te maken hebben ("Waar zijn je ouders geboren?")
- Automatisch afwijzen zonder motivatie, bij een sterk profiel
- Andere behandeling dan andere sollicitanten in dezelfde procedure

## Wat kun je doen?

### Documenteer
Bewaar e-mails, berichten en gespreksnotities. Als je een patroon vermoedt, is documentatie essentieel.

### Meld bij het College voor de Rechten van de Mens
Het College behandelt klachten over discriminatie en kan een oordeel geven — kosteloos. Een oordeel is geen rechtszaak, maar heeft wel gewicht.

### Meld bij Internly
Bedrijven die op ons platform discrimineren, schenden onze gedragscode. Meld het via de rapportageknop of via hallo@internly.pro.

### Schakel je school in
Je stagebegeleider kan bemiddelen. Scholen hebben ook de bevoegdheid om samenwerkingen met bedrijven te beëindigen.

## Wat Internly doet

Wij hanteren een nultolerantiebeleid voor discriminatie. Bedrijven die worden gemeld voor discriminerende praktijken, worden intern beoordeeld en kunnen worden verwijderd van het platform.
$md$,
ARRAY['student_bol', 'student_bbl'],
ARRAY['discriminatie', 'gelijke kansen', 'rechten', 'melding'],
'[{"label":"College voor de Rechten van de Mens","url":"https://www.mensenrechten.nl"},{"label":"CBS — Discriminatie op arbeidsmarkt","url":"https://www.cbs.nl/nl-nl/achtergrond/2023/37/discriminatie-op-de-arbeidsmarkt"}]'::jsonb,
true, now()
);

-- ── 8. Wanneer mag je betaald worden voor je stage ──────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'betaling-stage',
'Wanneer mag je betaald worden voor je stage',
'Stagevergoeding is niet altijd verplicht. Maar wanneer heb je wel recht op betaling? En wat is een redelijk bedrag?',
$md$## BOL-stage: geen wettelijk recht op vergoeding

Als BOL-student ben je geen werknemer. Je stagecontract is een leerovereenkomst, geen arbeidsovereenkomst. Dat betekent dat je wettelijk geen recht hebt op een stagevergoeding.

Toch geven veel bedrijven een vrijwillige vergoeding — gemiddeld tussen de €200 en €500 per maand, afhankelijk van de sector en het bedrijf. Je mag hier altijd naar vragen.

## BBL-stage: minimumloon is verplicht

Bij BBL is de situatie anders. Je hebt een arbeidsovereenkomst met het leerbedrijf. Dat betekent dat je recht hebt op het wettelijk minimumloon voor jouw leeftijdscategorie. Dit is wettelijk vastgesteld en niet onderhandelbaar.

Het minimumloon voor jongeren is lager dan voor volwassenen. Raadpleeg de actuele bedragen op de website van de Rijksoverheid.

## Onkostenvergoeding

Los van een stagevergoeding kun je altijd vragen om een onkostenvergoeding voor reiskosten of werkkleding. Dit is gebruikelijk en bedrijven verrekenen dit soms als er geen andere vergoeding is.

## Mag je werken zonder betaling?

Ja, als BOL-student kun je een onbetaalde stage doen. Maar let op: als je werkzaamheden uitvoert die normaal door een betaalde werknemer worden gedaan, en er is geen duidelijk leeraspect, dan kan de stage juridisch als arbeidsovereenkomst worden beschouwd — en heb je alsnog recht op loon.

Dit heet "schijnstage". Als je denkt dat dit het geval is, kun je advies inwinnen bij FNV Jong of de Rechtshulp.

## Stagevergoeding onderhandelen

- Vraag er vroeg naar: bij je eerste gesprek of voor je tekent
- Onderbouw je vraag: woon-werkverkeer, kosten voor werkkleding
- Weet de markt: vergelijk met andere stages in jouw sector

## Belasting

Een stagevergoeding is inkomen en kan invloed hebben op toeslagen. Raadpleeg de Belastingdienst als je twijfelt.
$md$,
ARRAY['student_bol', 'student_bbl'],
ARRAY['stagevergoeding', 'betaling', 'minimumloon', 'arbeidsrecht'],
'[{"label":"Rijksoverheid — Stagevergoeding","url":"https://www.rijksoverheid.nl/onderwerpen/stages/vraag-en-antwoord/stagevergoeding"},{"label":"Rijksoverheid — Minimumloon jeugd","url":"https://www.rijksoverheid.nl/onderwerpen/minimumloon"}]'::jsonb,
true, now()
);

-- ── 9. Hoe maak je een stageplek die stagiairs aantrekt ─────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'aantrekkelijke-stageplek',
'Hoe maak je een stageplek die stagiairs aantrekt',
'Studenten kiezen bewust. Een goede stageplek biedt meer dan een bureau. Dit is wat het verschil maakt.',
$md$## De markt is veranderd

Bedrijven denken soms dat elke stageplek automatisch wordt ingevuld. Dat klopt niet meer. MBO-studenten kiezen steeds bewuster en verwijzen elkaar door — via platforms, maar ook mond-tot-mond. Een slechte reputatie als stagebedrijf verspreidt zich snel.

## Wat studenten echt zoeken

Onderzoek onder MBO-studenten laat consistent dezelfde prioriteiten zien:

### 1. Echte taken
Studenten willen bijdragen aan iets wat telt. Kopiëren, koffiezetten en archiveren zijn geen leertaken. Als je geen zinvolle taken kunt bieden, bied je ook geen goede stageplek.

### 2. Een vaste begeleider
Niets is zo demotiverend als een begeleider die elke week anders is. Wijs één persoon aan als eerste aanspreekpunt. Die begeleider hoeft geen expert te zijn in alles — beschikbaarheid en interesse zijn al voldoende.

### 3. Feedback
Geef regelmatig terugkoppeling. Niet alleen aan het einde van de stage, maar tussentijds. Studenten leren van feedback, niet van stilte.

### 4. Een stagevergoeding
Het is niet wettelijk verplicht voor BOL-studenten, maar het maakt wel een verschil bij de keuze. Een vergoeding laat zien dat je de inzet van een stagiair waardeert.

### 5. Duidelijkheid over verwachtingen
Communiceer voor de start: wanneer beginnen ze, wat zijn de werktijden, wat zijn de eerste taken. Onzekerheid aan het begin zorgt voor een slechte start.

## Wat je advertentie moet bevatten

- Concrete taakomschrijving (geen "diverse werkzaamheden")
- Naam en rol van de begeleider
- Of er een vergoeding is en hoe hoog
- Wat een stagiair bij jullie kan leren
- Reactietermijn: wanneer hoor de student iets?

## Investering vs. opbrengst

Een goed begeleidde stagiair levert output. Bedrijven die structureel in begeleiding investeren, zien vaker dat stagiairs terugkomen als werknemer.
$md$,
ARRAY['bedrijf'],
ARRAY['stagebegeleiding', 'werving', 'stageplek', 'HR'],
'[{"label":"SBB — Erkend leerbedrijf worden","url":"https://www.s-bb.nl/voor-bedrijven/erkend-leerbedrijf-worden"}]'::jsonb,
true, now()
);

-- ── 10. De Stagepact in 4 punten voor werkgevers ────────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'stagepact-werkgevers',
'De Stagepact in 4 punten — wat verandert voor werkgevers',
'Het Stagepact van december 2024 vraagt concrete toezeggingen van bedrijven. Wat betekent dat in de praktijk?',
$md$## Wat is het Stagepact?

Het Stagepact is een vrijwillig akkoord dat in december 2024 werd ondertekend door werkgeversorganisaties, onderwijsinstellingen en de overheid. Het doel: de kwaliteit en toegankelijkheid van stages in Nederland verbeteren.

Het pact is geen wet. Maar als je het ondertekent, leg je jezelf vier kernverplichtingen op.

## De vier punten

### 1. Geen vervanging van betaald werk
Stages mogen niet worden gebruikt om bezuinigingen op personeel te compenseren. Een stagiair is een lerende, geen goedkope werknemer. Als de taken die een stagiair uitvoert, normaal door een betaalde medewerker worden gedaan, klopt er iets niet.

**Wat dit betekent in de praktijk:** Beschrijf in je stagecontract concrete leerdoelen en koppel taken daaraan. Wees eerlijk: als je de output van een medewerker verwacht, bied dan een arbeidsovereenkomst aan.

### 2. Reactieplicht
Bedrijven committeren zich aan een tijdige reactie op stageverzoeken. Ghosting — niet reageren — is in strijd met het pact.

**Wat dit betekent in de praktijk:** Stel intern een proces in voor stageaanvragen. Wie behandelt ze? Binnen welke termijn? Stel een automatische bevestiging in en communiceer de beslissing — ook als het een afwijzing is.

### 3. Gelijke kansen
Selectie van stagiairs mag niet discrimineren op grond van afkomst, geslacht, religie of andere beschermde kenmerken.

**Wat dit betekent in de praktijk:** Gebruik gestructureerde selectiecriteria. Laat meerdere mensen betrokken zijn bij de keuze. Documenteer waarom je iemand wel of niet hebt aangenomen.

### 4. Kwalitatieve begeleiding
Elke stagiair krijgt een vaste begeleider die bereikbaar is en regelmatig reflectiegesprekken voert.

**Wat dit betekent in de praktijk:** Wijs een begeleider aan voor de stage begint. Blokkeer tijd in de agenda voor begeleiding. Geef de begeleider training of ondersteuning als dat nodig is.

## Voordelen van deelname

Bedrijven die het Stagepact ondertekenen, worden opgenomen in een publieke lijst. Dit vergroot de zichtbaarheid voor studenten en scholen. Op Internly weegt deelname mee in de Trust Score.
$md$,
ARRAY['bedrijf'],
ARRAY['stagepact', 'werkgever', 'compliance', 'gelijke kansen'],
'[{"label":"Stagepact — Officiële website","url":"https://www.stagepact.nl"},{"label":"Rijksoverheid — Stagepact","url":"https://www.rijksoverheid.nl/onderwerpen/stages"}]'::jsonb,
true, now()
);

-- ── 11. Begeleiding 101 ──────────────────────────────────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'begeleiding-stagiair-101',
'Begeleiding 101 — wat een goede stagebegeleider doet',
'De kwaliteit van een stage staat of valt met de begeleider. Dit zijn de kenmerken van effectieve stagebegeleiding.',
$md$## Waarom begeleiding zo belangrijk is

Studenten leren niet vanzelf door aanwezig te zijn. Ze leren door te doen, te reflecteren en feedback te krijgen. Een stagebegeleider is de sleutel tot dat leerproces. Zonder goede begeleiding is een stage hoogstens werkervaring — maar geen echte leerervaring.

## Wat een goede begeleider doet

### Verwachtingen helder stellen
Voor de start van de stage: wat ga je doen, wanneer start je, wie is je vaste contactpersoon? Onduidelijkheid aan het begin zorgt voor frustratie halverwege.

### Regelmatig inplekken
Stel een wekelijks kort gesprek in — ook als het maar tien minuten is. Vraag: wat ging goed, wat was lastig, heb je ergens hulp bij nodig? Dit voorkomt dat kleine problemen groot worden.

### Constructieve feedback geven
Feedback geven is een vaardigheid. Gebruik concrete voorbeelden: niet "je communicatie kan beter", maar "in het klantgesprek van gisteren merkte ik dat je het antwoord op vraag drie niet wist — wil je daar samen naar kijken?"

### Taken koppelen aan leerdoelen
Weet wat de leerdoelen van de stagiair zijn en zorg dat de taken daarop aansluiten. Een student die logistiek studeert, leert weinig van een week receptiewerk.

### Ruimte geven voor fouten
Stagiairs mogen fouten maken — dat hoort bij leren. Een begeleider die elke fout bestraft, creëert angst in plaats van groei.

## Tijdinvestering

Goed begeleiden kost tijd. Reken op gemiddeld twee uur per week voor een actieve begeleider. Als je die tijd niet hebt, benoem dan iemand anders.

## Signalen dat het niet goed gaat

- Stagiair is stil of teruggetrokken
- Taken worden traag of met fouten uitgevoerd
- Stagiair vraagt nooit om hulp

Als je dit ziet: maak het bespreekbaar. Wacht niet tot het eindgesprek.
$md$,
ARRAY['bedrijf'],
ARRAY['begeleiding', 'stagebegeleider', 'HR', 'feedback'],
'[{"label":"SBB — Begeleiding van stagiairs","url":"https://www.s-bb.nl/voor-bedrijven/begeleiding"}]'::jsonb,
true, now()
);

-- ── 12. ESG en CSRD ──────────────────────────────────────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'esg-csrd-stages',
'ESG en CSRD — hoe stages meetellen in je rapportage',
'Grote bedrijven zijn verplicht te rapporteren over sociale impact. Stages zijn een onderdeel van die rapportage.',
$md$## Wat is CSRD?

De Corporate Sustainability Reporting Directive (CSRD) is een Europese richtlijn die grote bedrijven verplicht te rapporteren over hun impact op mens, milieu en maatschappij. In Nederland geldt de richtlijn stapsgewijs: grote beursgenoteerde ondernemingen rapporteren vanaf boekjaar 2024; middelgrote bedrijven volgen.

## Waarom stages relevant zijn voor CSRD

De rapportage is gebaseerd op ESG-criteria: Environmental (milieu), Social (sociaal) en Governance (bestuur). Het sociale onderdeel omvat onder meer:

- Werkgelegenheidspraktijken
- Diversiteit en inclusie
- Onderwijs en talentontwikkeling

Stages vallen onder het thema **talentontwikkeling en inclusie**. Bedrijven die actief investeren in stagiairs — met name uit ondervertegenwoordigde groepen — kunnen dit meenemen in hun sociale rapportage.

## Wat je kunt opnemen

In je CSRD-rapportage kun je de volgende stage-gerelateerde gegevens opnemen:

- Aantal stagiairs per jaar, uitgesplitst naar onderwijsniveau (BOL/BBL)
- Percentage stagiairs met een afstand tot de arbeidsmarkt
- Conversieratio: hoeveel stagiairs stroomden door naar een (tijdelijk) dienstverband?
- Tevredenheidsscores van stagiairs (enquête aan het einde van de stage)

## Hoe Internly helpt

Internly biedt bedrijven een stagerapportage-export (in ontwikkeling) die data aanlevert die bruikbaar is voor CSRD-verantwoording. Dit omvat geanonimiseerde gegevens over stages die via het platform zijn verlopen.

## Wat je nu al kunt doen

- Registreer structureel hoeveel stagiairs je per jaar begeleidt
- Voer een exitgesprek en sla tevredenheidsdata op
- Documenteer of de stagiair na de stage bij je is gebleven

Dit zijn de basics die je later nodig hebt als de rapportageplicht voor jouw bedrijfsgrootte ingaat.
$md$,
ARRAY['bedrijf'],
ARRAY['CSRD', 'ESG', 'duurzaamheid', 'rapportage', 'sociaal'],
'[{"label":"Europese Commissie — CSRD","url":"https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en"},{"label":"CSR Nederland","url":"https://www.csrned.nl"}]'::jsonb,
true, now()
);

-- ── 13. Van stage naar vaste aanstelling ────────────────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'stage-naar-vast',
'Van stage naar vaste aanstelling — retentie-tips voor bedrijven',
'Een goede stagiair is een potentiële medewerker. Zo vergroot je de kans dat ze terugkomen na hun diploma.',
$md$## De beste kandidaten ken je al

Werving is duur en tijdrovend. Een voormalige stagiair heeft al bewezen hoe hij of zij werkt, kent de cultuur en is ingewerkt. Bedrijven die systematisch investeren in stages als wervingskanaal, plukken daar de vruchten van.

## Wat de kans vergroot dat een stagiair terugkomt

### 1. Een eerlijke ervaring bieden
Klinkt simpel, maar wordt vaak gemist. Als een stagiair zich gebruikt heeft gevoeld, komt die niet terug. Zorg dat de stage echt leerzaam is.

### 2. Vroeg het gesprek aangaan
Je hoeft niet te wachten tot de laatste week. Halverwege de stage kun je al vragen: "Zie jij jezelf hier werken als je klaar bent met school?" Dat plant een zaad.

### 3. Een concreet perspectief bieden
"We zien mogelijkheden" is vaag. Beter: "Als je in juni je diploma haalt, willen we graag praten over een parttime functie in team X." Concreet is motiverend.

### 4. Verbonden houden na de stage
Stuur af en toe een bericht als er nieuws is in het bedrijf. Nodig ex-stagiairs uit voor een teamborrel. Die band is waardevol.

### 5. Alumni-netwerk opbouwen
Sommige bedrijven houden actief contact met voormalige stagiairs via een LinkedIn-groep of nieuwsbrief. Dit werkt als langetermijnwerving.

## Wat niet werkt

- Beloftes doen die je niet kunt waarmaken
- De stagiair verrassingen geven aan het einde ("we hebben eigenlijk geen plek")
- Geen terugkoppeling geven na de stage

## De cijfers

Bedrijven die structurele stagetrajecten hebben, rapporteren gemiddeld een conversieratio van 20–35%: één op de drie tot vijf stagiairs keert terug als werknemer. Dat is aanzienlijk goedkoper dan externe werving.
$md$,
ARRAY['bedrijf'],
ARRAY['retentie', 'werving', 'HR', 'talent', 'alumni'],
'[{"label":"SBB — Stage als wervingskanaal","url":"https://www.s-bb.nl/voor-bedrijven"}]'::jsonb,
true, now()
);

-- ── 14. Stagebegeleiding als docent ─────────────────────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'docent-stagebegeleiding',
'Stagebegeleiding als docent — je rol en tools',
'Als docent-begeleider sta je tussen student en bedrijf. Wat is jouw rol, wanneer grijp je in, en welke tools helpen daarbij?',
$md$## De drie rollen van een schoolbegeleider

Als docent-begeleider vervul je drie rollen tegelijk:

**1. Pedagogisch begeleider** — je bewaakt het leerproces en helpt de student reflecteren op zijn of haar ervaringen.

**2. Kwaliteitsbewaker** — je beoordeelt of de stage voldoet aan de eisen van de opleiding en of het bedrijf zijn afspraken nakomt.

**3. Tussenpersoon** — je bemiddelt als er spanning is tussen student en bedrijf.

## Wat de begeleiding inhoudt

### Voorbereiding
Zorg dat je weet wat de leerdoelen van de student zijn voor de stage begint. Check of het stagebedrijf erkend is als leerbedrijf (SBB-erkenning).

### Bezoeken
Een minimaal één bezoek per stageperiode is gebruikelijk, maar twee geeft je een beter beeld. Bezoek niet alleen om de student te beoordelen, maar ook om de stagebegeleider van het bedrijf te spreken.

### Reflectiegesprekken
Plan regelmatige gesprekken met de student — ook op afstand, via video. Stel open vragen: "Wat leer je het meest?" en "Waar loop je tegenaan?"

## Wanneer grijp je in?

Grijp in als:
- De student aangeeft dat de taken niets met de opleiding te maken hebben
- Er signalen zijn van ongepast gedrag (pesten, intimidatie)
- De stage de student zichtbaar schaadt (stress, uitputting, demotivatie)

Wacht niet af. Een vroege interventie voorkomt vroegtijdige afbreking.

## Tools via Internly

Op Internly kun je als schoolbegeleider de voortgang van studenten volgen. Je ziet matches, geplande gesprekken en evaluaties. Gebruik dit als aanvulling op, niet als vervanging van, persoonlijk contact.
$md$,
ARRAY['school'],
ARRAY['docent', 'schoolbegeleiding', 'begeleiding', 'SBB'],
'[{"label":"SBB — Erkend leerbedrijf","url":"https://www.s-bb.nl/voor-scholen"}]'::jsonb,
true, now()
);

-- ── 15. Signalen dat een stage faalt ────────────────────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'signalen-stage-faalt',
'Wanneer grijpen — signalen dat een stage faalt',
'Een stage die misloopt, kondigt zich aan. Dit zijn de vroege signalen en wat je als school kunt doen.',
$md$## Vroeg ingrijpen is altijd beter

Een stage die vroegtijdig wordt afgebroken, kost iedereen tijd en energie: de student, het bedrijf en de school. Vroeg signaleren en ingrijpen voorkomt escalatie.

## Vroege signalen bij de student

- Student verzuimt vaker dan gebruikelijk
- Student spreekt niet over stageervaringen of is ontwijkend
- Plotselinge daling in motivatie of studieresultaten
- Student meldt dat taken "niets met de opleiding te maken hebben"
- Student vertelt over conflicten of een negatieve sfeer op de werkplek

## Vroege signalen bij het bedrijf

- Stagebegeleider is moeilijk bereikbaar
- Beloofde taken zijn niet gestart
- Bedrijf reageert niet op berichten van de school
- Evaluatiegesprekken worden uitgesteld of afgelast

## Wat je kunt doen als school

### 1. Direct contact opnemen
Bel de student — niet mailen. Een telefoongesprek geeft meer informatie dan een e-mail.

### 2. Gesprek met de begeleider bij het bedrijf
Doe dit bij voorkeur persoonlijk. Vraag naar de voortgang en of er problemen zijn.

### 3. Driegesprek inplannen
Als er spanning is, plan dan een driegesprek: student, begeleider bedrijf, schoolbegeleider. Zet verwachtingen opnieuw helder neer.

### 4. Afbreken als laatste optie
Als de situatie niet verbetert, is afbreken beter dan doormodderen. Bespreek met de student wat dit betekent voor de studievoortgang en of er een nieuwe stage kan worden gevonden.

## Na afbreking

Evalueer met de student wat er mis ging. Was het de stage, de student, of een mismatch? Die reflectie helpt de student bij een volgende stage.

Overweeg ook of het bedrijf nog geschikt is voor toekomstige stages. Een herhaald patroon is reden om de samenwerking te stoppen.
$md$,
ARRAY['school'],
ARRAY['signalen', 'begeleiding', 'interventie', 'stage afbreken'],
'[]'::jsonb,
true, now()
);

-- ── 16. Je eerste buddy-gesprek ─────────────────────────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'eerste-buddy-gesprek',
'Je eerste buddy-gesprek — structuur en tips',
'Het eerste gesprek met je buddy-student zet de toon. Zo begin je goed.',
$md$## Waarom het eerste gesprek telt

Een buddy-koppeling begint bij het eerste gesprek. Hier stel je verwachtingen vast, bouw je een eerste vertrouwensband op en bepaal je samen hoe de samenwerking eruitziet. Een slecht eerste gesprek is moeilijk te herstellen. Een goed eerste gesprek legt een stevige basis.

## Voorbereiding

Lees voor het gesprek het profiel van de student. Wat studeert ze? In welke sector zoekt ze een stage? Wat zijn haar uitdagingen? Zo kun je gerichte vragen stellen in plaats van opnieuw beginnen bij nul.

## Structuur van het eerste gesprek (60 minuten)

### Inleiding (10 min)
Stel jezelf voor. Niet alleen je naam en functie, maar ook waarom je buddy bent geworden. Studenten waarderen eerlijkheid: "Ik herinner me hoe lastig het was om een goede stage te vinden, en ik wil anderen daarbij helpen."

### Luisteren (20 min)
Stel open vragen:
- "Vertel eens over je opleiding. Wat vind je ervan?"
- "Wat voor stage zoek je, en waarom?"
- "Wat zijn dingen die je lastig vindt in het zoekproces?"

Luister meer dan je praat. Dit gesprek gaat over de student, niet over jou.

### Verwachtingen afstemmen (15 min)
Wees helder over wat een buddy doet en niet doet:
- Wel: meedenken, netwerk delen, ervaringen bespreken, oefengesprekken
- Niet: stage regelen, cv schrijven, garanties geven

Vraag ook wat de student van jou nodig heeft.

### Afspraken maken (10 min)
Hoe vaak spreken jullie? Via welk kanaal? Wie neemt het initiatief? Stel dit vast — vaagheid leidt tot stilte.

### Afsluiting (5 min)
Geef de student één concrete actie mee voor het volgende gesprek. Dat geeft richting.

## Na het gesprek

Maak een korte notitie voor jezelf: wat zijn de leerpunten van de student, wat zijn de kansen in je netwerk, wat wil je volgende keer bespreken?
$md$,
ARRAY['buddy'],
ARRAY['buddy', 'gesprekken', 'mentoring', 'begeleiding'],
'[]'::jsonb,
true, now()
);

-- ── 17. Grenzen bewaken als buddy ────────────────────────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'grenzen-buddy-werk',
'Grenzen bewaken — wat hoort bij buddy-werk en wat niet',
'Buddy zijn is waardevol, maar heeft grenzen. Weet wat je rol is en wat je kunt doorverwijzen.',
$md$## De waarde van grenzen

Grenzen in buddy-werk zijn geen afwijzing. Ze zijn de basis voor een gezonde en duurzame begeleiding. Als je meer belooft dan je kunt waarmaken, of taken overneemt die de student zelf moet doen, help je op de korte termijn maar schaad je de ontwikkeling op de lange termijn.

## Wat wél bij buddy-werk hoort

- Meedenken over keuzes (niet de keuze maken voor de student)
- Netwerk beschikbaar stellen (niet zelf bellen namens de student)
- Oefengesprekken voeren
- Luisteren naar frustraties en helpen relativeren
- Ervaringen uit je eigen loopbaan delen die relevant zijn
- De student aanmoedigen om actie te ondernemen

## Wat níet bij buddy-werk hoort

- Een stage regelen of bemiddelen bij je eigen werkgever zonder toestemming
- Het cv van de student herschrijven (feedback geven is OK)
- Financiële ondersteuning bieden
- Meegaan naar gesprekken bij bedrijven
- Beschikbaar zijn op elk moment van de dag (stel beschikbaarheid in op Internly)
- Therapeutische ondersteuning bieden bij psychische klachten

## Wanneer doorverwijzen?

Als een student problemen deelt die buiten jouw expertise of rol vallen:

- **Psychische klachten** → schooldecaan of studentpsycholoog
- **Juridisch conflict met stagebedrijf** → school of juridische hulp
- **Financiële problemen** → DUO, gemeente, of schuldhulpverlening
- **Discriminatie** → College voor de Rechten van de Mens

Doorverwijzen is geen falen. Het is het beste wat je kunt doen als iets buiten je rol valt.

## Als het te zwaar wordt

Het kan voorkomen dat een student situaties deelt die emotioneel zwaar zijn. Jij hoeft dat niet alleen te dragen. Meld het via Internly als je je zorgen maakt, zodat de schoolbegeleider of het platform kan meekijken.
$md$,
ARRAY['buddy'],
ARRAY['buddy', 'grenzen', 'doorverwijzen', 'mentoring'],
'[]'::jsonb,
true, now()
);

-- ── 18. Trust Score op Internly ─────────────────────────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'trust-score-internly',
'Trust Score op Internly — hoe werkt het',
'De Trust Score laat zien hoe betrouwbaar een bedrijf is op de stagemarkt. Zo werkt de berekening.',
$md$## Wat is de Trust Score?

De Trust Score is een betrouwbaarheidsindicator op Internly voor stageverlenende bedrijven. Het cijfer loopt van 0 tot 100 en wordt weergegeven als een letter: A (hoog), B (gemiddeld) of C (laag).

De score helpt studenten om snel te beoordelen hoe een bedrijf omgaat met stagiairs. Hoe hoger de score, hoe consistenter het bedrijf reageert, begeleidt en nakomt wat het belooft.

## Hoe wordt de score berekend?

De Trust Score is gebaseerd op vier componenten:

### Reactiesnelheid (30%)
Hoe snel reageert een bedrijf op stageverzoeken? Bedrijven die consistent binnen een week reageren — ook met een afwijzing — scoren hoger. Ghosting verlaagt de score.

### Acceptatiegedrag (25%)
Hoeveel van de aangevraagde stages worden ook daadwerkelijk geaccepteerd en afgerond? Een hoog percentage geaccepteerde en voltooide stages duidt op betrouwbaarheid.

### Profielvolledigheid (20%)
Is het bedrijfsprofiel volledig ingevuld? Bedrijven die transparant zijn over sector, grootte, website en beschrijving, scoren hoger op dit onderdeel.

### Reviews (25%)
Wat zeggen voormalige stagiairs? Reviews worden gewogen gemiddeld meegenomen in de score. Alleen reviews van studenten met een geverifieerde match tellen mee.

## Wat de score niet is

De Trust Score is geen objectieve maat voor de kwaliteit van een stage. Het is een indicatie van betrouwbaarheid en responsiviteit. Sommige kleinere bedrijven scoren lager simpelweg omdat ze minder matches hebben — hun score is dan minder betrouwbaar.

## Hoe kan een bedrijf de score verbeteren?

- Reageer op alle stageverzoeken, ook afwijzingen
- Vul het bedrijfsprofiel volledig in
- Vraag stagiairs om een review achter te laten na de stage

## Vragen of bezwaren?

Neem contact op via hallo@internly.pro als je denkt dat je score onjuist is.
$md$,
ARRAY['student_bol', 'student_bbl', 'bedrijf', 'school', 'buddy'],
ARRAY['trust score', 'betrouwbaarheid', 'Internly', 'platform'],
'[]'::jsonb,
true, now()
);

-- ── 19. Chat-etiquette op Internly ──────────────────────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'chat-etiquette-internly',
'Chat-etiquette op Internly',
'De chat op Internly is bedoeld voor professionele communicatie over stages. Zo maak je een goede indruk.',
$md$## Waarom etiquette ertoe doet

Op Internly stuur je berichten naar bedrijven, scholen, begeleiders en buddies. Hoe je communiceert, is een eerste indruk. Een goed geformuleerd bericht laat zien dat je serieus bent. Een slordig bericht doet het tegenovergestelde.

## Voor studenten: berichten naar bedrijven

### Begin formeel, tenzij het bedrijf informeel is
Gebruik "Goedemiddag" of "Geachte [naam]" als je iemand voor het eerst aanspreekt. Als het bedrijf jou aanspreekt met "jij", kun je dat overnemen.

### Wees concreet
Niet: "Ik wil graag meer informatie."
Wel: "Ik ben geïnteresseerd in de stage als junior marketeer. Kunnen we een kennismakingsgesprek inplannen?"

### Geef context
De gesprekspartner kent jou niet. Noem kort wie je bent en wat je zoekt. Eén of twee zinnen is genoeg.

### Reageer snel
Als een bedrijf reageert, stuur dan binnen twee werkdagen een antwoord. Langzaam reageren wekt de indruk dat je niet gemotiveerd bent.

## Voor bedrijven: berichten naar studenten

### Reageer op elk bericht
Ook een afwijzing is een reactie. Studenten waarderen duidelijkheid boven stilte.

### Gebruik de naam van de student
Dat klinkt vanzelfsprekend, maar kopieer-geplakte berichten worden direct herkend.

### Wees helder over de volgende stap
Sluit elk bericht af met een concrete actie: "Laat me weten of je beschikbaar bent voor een gesprek volgende week."

## Wat niet mag op de chat

- Discriminerende of kwetsende taal
- Spam of herhaalde berichten zonder aanleiding
- Delen van privégegevens van anderen zonder toestemming
- Berichten buiten de context van stages (commerciële aanbiedingen, etc.)

Meld ongepaste berichten via de meldknop in de chat.
$md$,
ARRAY['student_bol', 'student_bbl', 'bedrijf', 'school', 'buddy'],
ARRAY['communicatie', 'chat', 'etiquette', 'platform'],
'[]'::jsonb,
true, now()
);

-- ── 20. Privacy en AVG op Internly ──────────────────────────────────────────
INSERT INTO kb_articles (slug, title, excerpt, body_markdown, audience, tags, external_links, published, published_at) VALUES (
'privacy-avg-internly',
'Privacy en AVG op Internly — wat we doen met jouw data',
'Internly verwerkt persoonsgegevens. Wat bewaren we, waarom, hoe lang, en wat zijn je rechten?',
$md$## Wij zijn verwerkingsverantwoordelijke

Internly is een product van Sasubo Holding B.V. Wij zijn de verwerkingsverantwoordelijke voor de persoonsgegevens die je op ons platform deelt. Dat betekent dat wij bepalen waarom en hoe jouw gegevens worden gebruikt, en dat wij verantwoordelijk zijn voor de bescherming ervan.

## Welke gegevens verwerken we?

### Accountgegevens
Je naam, e-mailadres en wachtwoord (versleuteld). Deze zijn nodig om jou toegang te geven tot het platform.

### Profielgegevens
Afhankelijk van je rol: opleidingsinformatie, sector, leerdoelen, beschikbaarheid. Bedrijven zien alleen wat je openbaar hebt gemaakt.

### Gebruiksgegevens
We loggen welke pagina's je bezoekt en welke acties je uitvoert (aanmelden, matchen, chatten). Dit doen we om het platform te verbeteren en om fraude en misbruik te detecteren.

### Berichten
Chatberichten worden opgeslagen in onze database. Wij lezen mee alleen als dat nodig is voor moderatie (bij een melding van ongepast gedrag).

## Op welke grondslag?

We verwerken jouw gegevens op basis van:

- **Uitvoering overeenkomst** — om de dienst te leveren waarvoor je je hebt aangemeld
- **Gerechtvaardigd belang** — voor veiligheid en fraudepreventie
- **Toestemming** — voor optionele functies zoals notificaties

## Hoe lang bewaren we je gegevens?

Accountgegevens bewaren we zolang je account actief is. Na verwijdering van je account worden persoonsgegevens binnen 30 dagen gewist, tenzij wettelijke bewaarplichten anders vereisen.

## Jouw rechten

Onder de AVG heb je het recht op:

- **Inzage** — welke gegevens we over je hebben
- **Rectificatie** — onjuiste gegevens laten aanpassen
- **Verwijdering** — je account en data laten wissen
- **Bezwaar** — tegen bepaalde verwerkingen

Stuur je verzoek naar privacy@internly.pro. We reageren binnen 30 dagen.

## Meer weten?

Zie ons volledige privacybeleid op internly.pro/privacybeleid.html. Voor vragen: privacy@internly.pro.
$md$,
ARRAY['student_bol', 'student_bbl', 'bedrijf', 'school', 'buddy'],
ARRAY['privacy', 'AVG', 'GDPR', 'gegevens', 'rechten'],
'[{"label":"Autoriteit Persoonsgegevens","url":"https://www.autoriteitpersoonsgegevens.nl"},{"label":"Internly Privacybeleid","url":"https://internly.pro/privacybeleid.html"}]'::jsonb,
true, now()
);
