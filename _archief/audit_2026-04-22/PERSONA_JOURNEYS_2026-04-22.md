# Blara — Persona Journey Simulation
**Datum**: 22 april 2026
**Rol**: Blara — Ik simuleer echte mensen, niet ideale gebruikers.
**Scope**: Drie persona's × zeven momenten. Wat werkt, wat hapert, welke features worden ontdekt vs. gemist.
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Persona A — Yara, 17, MBO niveau 3

**Profiel**: Telefoon Samsung A15, 4G in de bus, thuis wifi. Eerste stage, broer is geghost in het verleden. Engels matig, Nederlands thuistaal.

---

### Moment 1 — Eerste bezoek
**Wat ziet ze**: index.html op telefoon. Hero: "40 mails. 0 reacties. Dat kan anders." Grote animatie met doorgestreepte nul. Rol-tiles 2×2 grid.
**Wat begrijpt ze**: De doorgestreepte nul is onduidelijk op kleine schermen (clamp doet het werk, maar `struck` font-size krimpt naar `clamp(2.6rem, 13vw, 5rem)` op <480px). De tagline "Geen ghosting, geen vage beloftes" raakt haar direct — haar broers situatie.
**Wat hapert**: Ze ziet vier tiles: Student, BBL, Bedrijf, School. Ze weet niet of ze "Student" of "BBL" is. De labels "BOL" en "BBL" staan niet op de homepagina uitgelegd. Ze klikt op "Student" omdat ze begrijpt wat dat is.
**Wat doet ze**: Klikt op "Maak nu een profiel aan" → auth.html
**Ontdekte werkende feature**: Trust badges (A/B/C) — ze ziet ze pas later op discover.html
**Gemiste werkende feature**: Buddy-systeem — de strip staat onderaan de role-tiles maar de tekst "Krijg begeleiding van een mentor of ervaringsdeskundige" is te klein en abstract voor een eerste bezoek op telefoon

---

### Moment 2 — Account aanmaken
**Wat ziet ze**: auth.html — groen kaartje, "Welkom terug." (logo-sub text), tabs Inloggen | Registreren. Role picker met visuele kaartjes (Student, BBL, Bedrijf, School, Buddy, Begeleider).
**Wat begrijpt ze**: "Welkom terug" verwaart haar — ze is hier voor het eerst. De role-picker is visueel duidelijk. Ze kiest "Student".
**Wat hapert**: De form vraagt e-mail en wachtwoord, geen verdere uitleg over wat er met haar data gebeurt. Ze heeft geen werk-/schoolmail en twijfelt of haar Gmail geldig is. (Geen validatie of placeholder-hint dat Gmail ok is.)
**Wat doet ze**: Vult Gmail in, kiest wachtwoord, registreert. Krijgt "Controleer je e-mail" melding.
**Ontdekte werkende feature**: Taalschakelaar (NL/EN/DE/FR) — ze ziet hem maar gebruikt hem niet
**Gemiste werkende feature**: Nergens staat wat er na registratie gebeurt (geen "welkom-flow" preview)

---

### Moment 3 — Eerste actie: vacature zoeken
**Wat ziet ze**: Na e-mail-bevestiging → student-profile.html (profiel invullen). Na profiel → match-dashboard.html / discover.html.
**Wat begrijpt ze**: discover.html is helder. Zoekbalk, filters, vacature-kaartjes met trust-badge en "Responsgarantie: Ja/Nee" indicator.
**Wat hapert**: Trust Score badge (A/B/C) — ze weet niet wat dit betekent. Er is geen tooltip of uitleg direct bij de badge. Ze klikt op een vacature met Trust A, leest de pagina, solliciteert.
**Wat doet ze**: Solliciteert op eerste vacature. Krijgt confirm-toast (via notify → toast.success na Sprint α).
**Ontdekte werkende feature**: Reistijdfilter — ze ontdekt dit toevallig als ze "Filter op reistijd" ziet staan. Dit is een echte winnaar: ze woont ver van centrum en dit is direct relevant.
**Gemiste werkende feature**: Matchpool/swipe (niet gelinkt vanuit discover.html). Ze ontdekt discover.html maar niet de swipe-interface.

---

### Moment 4 — Eerste fout
**Wat ziet ze**: Ze klikt "Lees meer" op een vacature terwijl ze toch niet ingelogd is (sessie verlopen na inactiviteit). Vóór de session-guard-fix: redirect naar auth.html. Na de fix: de pagina laadt gewoon.
**Wat begrijpt ze**: Als ze toch een redirect krijgt, begrijpt ze niet waarom. Ze dacht dat ze ingelogd was.
**Wat hapert**: Na session-guard-fix is dit scenario minder pijnlijk, maar de error-message bij login (bijv. "Je sessie is verlopen") bestaat niet — er is simpelweg een redirect.
**Wat doet ze**: Logt opnieuw in. Lost op.
**Gemiste fout-feedback**: Geen toast die uitlegt "Je sessie is verlopen, log opnieuw in."

---

### Moment 5 — Eerste echte interactie: sollicitatie verstuurd
**Wat ziet ze**: mijn-sollicitaties.html — haar sollicitatie staat op "Wacht". Er is een "Terugnemen"-knop (Sprint α). Er is een leeg-staat als ze nog niets heeft: "Nog geen sollicitaties verstuurd."
**Wat begrijpt ze**: "Wacht" is helder. Ze vraagt zich af wanneer ze een reactie krijgt.
**Wat hapert**: Er is geen verwachtingsmanagement over responstijd. "Responsgarantie: Ja" op de vacaturekaart belooft een reactie, maar niet wanneer.
**Ontdekte werkende feature**: "Terugnemen"-knop met undo — intuïtief, ze gebruikt het om een per ongeluk verstuurde sollicitatie terug te trekken.
**Gemiste werkende feature**: In-app notificatie. Ze krijgt geen pushnotificatie of banner als haar sollicitatie wordt bekeken. (push.js is geladen maar browser-permission niet gevraagd op dit moment)

---

### Moment 6 — Drie dagen wachten en terugkomen
**Wat ziet ze**: Logt in, gaat naar mijn-sollicitaties.html. Status nog "Wacht".
**Wat begrijpt ze**: Het systeem heeft haar niet geupdated. Geen e-mail, geen notificatie.
**Wat hapert**: Er is geen mechanisme dat haar informeert als de deadline voor de responsgarantie nadert voor het bedrijf. Dit is een van de kernbeloften van het platform.
**Wat doet ze**: Klikt op de vacature om te zien of er updates zijn. Er zijn geen updates zichtbaar.
**Ontdekte werkende feature**: Geen nieuwe feature ontdekt.
**Gemiste werkende feature**: Notificatie "Bedrijf heeft je sollicitatie bekeken" — bestaat niet.

---

### Moment 7 — Derde week actief
**Wat ziet ze**: Ze heeft inmiddels 3 sollicitaties. Ontdekt de matches-pagina vanuit de navigatie.
**Wat begrijpt ze**: "Matches" is onduidelijk — ze denkt aan een datingapp. Op de pagina ziet ze dat het een tweerichtingsaanvaarding is (student + bedrijf moeten beide akkoord). Dit is niet uitgelegd.
**Wat hapert**: De matches-flow (beide partijen moeten swipen) is verborgen in productlogica. Geen onboarding-tooltip.
**Ontdekte werkende feature**: Chat — ze ontdekt dat ze kan chatten na een match. Dit is haar beste moment: directe verbinding met het bedrijf.
**Gemiste werkende feature**: Buddy-systeem — na drie weken heeft ze het nog nooit gebruikt. De discovery-pad naar buddy.html is verborgen.

---

## Persona B — Marc, 47, HR-medewerker

**Profiel**: Laptop 5 jaar oud, Windows Edge. Stagiair-werving is extra taak naast hoofdwerk. 30 min/dag.

---

### Moment 1 — Eerste bezoek
**Wat ziet ze**: index.html op desktop Edge. Hero ziet er goed uit op groot scherm.
**Wat begrijpt hij**: De "40 mails. 0 reacties" hero is vanuit studenten-perspectief geschreven. Marc denkt: "Dat is ons probleem niet, wij reageren altijd." Zijn mental model sluit niet aan op de hero-copy.
**Wat hapert**: De rolpicker-tiles zijn 2×2 grid. Hij ziet "Bedrijf" en klikt. De rol-beschrijving zegt "Zoek je de juiste stagiair? Ga direct naar de vacature-tool." Dat is duidelijk.
**Ontdekte werkende feature**: Geen — hij klikt direct door naar auth.html.
**Gemiste werkende feature**: ESG/CSRD-functionaliteit (de "Waarom nú" sectie met CSRD-informatie is onder de fold, hij scrollt niet zo ver)

---

### Moment 2 — Account aanmaken
**Wat ziet hij**: auth.html, kiest "Bedrijf". Vult e-mail en wachtwoord in.
**Wat hapert**: Na registratie → company-dashboard.html. Geen onboarding. Hij ziet een leeg dashboard ("Nog geen vacatures geplaatst"). Hij weet niet wat hij nu moet doen.
**Ontdekte werkende feature**: Toast-notificatie bij succesvol inloggen — hij merkt het niet op.
**Gemiste werkende feature**: Onboarding checklist ("Stap 1: Vul je bedrijfsprofiel in")

---

### Moment 3 — Eerste actie: vacature plaatsen
**Wat ziet hij**: company-dashboard.html. Hij zoekt "Vacature plaatsen". Er is een formulier.
**Wat begrijpt hij**: Formulier is helder. Hij vult in: functietitel, sector, locatie, beschrijving.
**Wat hapert**: Het veld "Responsgarantie: Ja/Nee" is aanwezig maar hij weet niet wat de consequenties zijn van "Ja" zeggen. Er is geen uitleg inline.
**Wat doet hij**: Zet Responsgarantie op "Ja" zonder te begrijpen wat dat inhoudt.
**Ontdekte werkende feature**: Vacature plaatsen werkt. Hij ziet zijn vacature in het dashboard.
**Gemiste werkende feature**: Trust Score — hij heeft geen idee dat zijn Trust Score beïnvloed wordt door zijn responsgedrag.

---

### Moment 4 — Eerste fout
**Wat ziet hij**: Een student heeft gesolliciteerd. Hij ziet de notificatie (bell-icon). Hij klikt erop maar de notificatie brengt hem naar een pagina die hij niet herkent.
**Wat hapert**: De notificatie-CTA is een link naar de relevante pagina, maar de pagina-context is onduidelijk voor een nieuwe gebruiker.
**Wat doet hij**: Sluit de pagina, gaat via het dashboard naar "Aanmeldingen".

---

### Moment 5 — Eerste echte interactie: sollicitatie beoordelen
**Wat ziet hij**: company-dashboard.html, matches-sectie. Student heeft gesolliciteerd.
**Wat begrijpt hij**: "Accepteren" of "Weigeren" knop. Duidelijk.
**Wat hapert**: Na weigering: geen manier om feedback te sturen aan de student. De student krijgt een in-app notificatie "match afgewezen" maar geen reden.
**Ontdekte werkende feature**: ESG-statistieken op het dashboard (stub, maar de UI is zichtbaar).
**Gemiste werkende feature**: Driegesprek-planning — staat niet op zijn radar.

---

### Moment 6 — Drie dagen wachten
**Wat ziet hij**: Niets. Geen notificaties van studenten.
**Ontdekte werkende feature**: Geen.
**Gemiste werkende feature**: "Responsgarantie"-deadline nadert — er is geen systeem dat hem herinnert dat hij zijn sollicitanten moet beantwoorden.

---

### Moment 7 — Derde week actief
**Wat ziet hij**: Zijn Trust Score staat op "B" (fictief). Hij weet niet waarom niet "A".
**Wat hapert**: Trust Score UI is aanwezig maar er is geen uitleg over hoe de score is opgebouwd (algoritme is stub).
**Gemiste werkende feature**: ESG-export — hij heeft een CSRD-rapportage nodig in week 3 maar de export-functie bestaat niet.

---

## Persona C — Joke, 64, stagebegeleider

**Profiel**: iPad Air, 3 jaar oud, thuis-wifi. 35 jaar onderwijs, eerste keer swipe-platform. Kan email en Google Docs.

---

### Moment 1 — Eerste bezoek
**Wat ziet ze**: index.html op iPad Safari. Hero laadt goed.
**Wat begrijpt ze**: "40 mails. 0 reacties." — ze herkent dit van haar studenten. Ze scrolt verder. "Scholen & ROC's" tile ziet ze op de homepage niet duidelijk — de 2×2 grid heeft "School" in de rechterbenedenhoek.
**Wat hapert**: Ze klikt per ongeluk op "BBL" omdat dit naast "School" staat. Leest de beschrijving, klikt terug. Tweede poging: "School".

---

### Moment 2 — Account aanmaken
**Wat ziet ze**: auth.html, kiest "Begeleider" (niet "School" — ze is een individu, geen instelling).
**Wat hapert**: Onderscheid tussen "School" (institutioneel) en "Begeleider" (individueel) is niet meteen helder. Ze kiest "Begeleider" omdat dat het meest op haar situatie lijkt, maar als ze aan een ROC werkt, had ze "School" moeten kiezen. Er is geen beslisboom.
**Wat doet ze**: Registreert als Begeleider, betaalt €49/mnd (stub — geen werkende betaling, maar ze wordt hier wel naartoe gestuurd).

---

### Moment 3 — Eerste actie: studenten bekijken
**Wat ziet ze**: begeleider-dashboard.html of school-dashboard.html. Beide hebben een studentenlijst-view.
**Wat hapert**: school-dashboard.html toont "Vul eerst je schoolnaam in bij Profiel om studenten te zien." Ze weet niet waar haar profiel is.
**Ontdekte werkende feature**: Signalen-sectie (>14 dagen inactief studenten) — eenmaal dat ze haar profiel heeft ingevuld, ziet ze dit en vindt het nuttig.
**Gemiste werkende feature**: Driegesprek-workflow — staat als feature op de pricing-pagina, maar ze vindt het niet in het dashboard.

---

### Moment 4 — Eerste fout
**Wat ziet ze**: Ze probeert een student een notificatie te sturen maar de knop doet niets (stub of geen reactie).
**Wat hapert**: Geen duidelijke foutmelding.

---

### Moment 5 — Eerste echte interactie
**Wat ziet ze**: Ze kan een driegesprek plannen via de kalender.
**Wat begrijpt ze**: calendar.js is geladen maar de driegesprek-workflow is niet volledig geïmplementeerd per CLAUDE.md.
**Ontdekte werkende feature**: Kalender-knop werkt voor afspraken plannen.

---

### Moment 6 — Drie dagen wachten
**Geen nieuwe ontdekkingen.** Ze gebruikt het platform niet actief omdat er geen proactieve meldingen zijn.
**Gemiste werkende feature**: Inactiviteit-signaal voor haar studenten — ze ontdekt dit pas actief als ze inlogt.

---

### Moment 7 — Derde week
**Wat ziet ze**: Ze heeft 3 studenten gekoppeld. Ze wil een voortgangsrapport exporteren.
**Wat hapert**: Export (PDF/CSV) is een premium feature maar ook een stub. Ze klikt op "Exporteer" → niets.
**Gemiste werkende feature**: Export — staat op de pricing-pagina als feature, werkt niet.

---

## Patroonanalyse: werkende features die gemist worden

| Feature | Ontdekt door | Gemist door | Reden |
|---------|-------------|-------------|-------|
| Reistijdfilter | Yara (toevallig) | Marc, Joke | Verborgen achter toggle, niet in focus |
| Buddy-systeem | Niemand | Alle drie | Strip op homepage te subtiel, geen eigen marketing |
| Matchpool/swipe | Niemand | Yara, Joke | Niet gelinkt vanuit discover.html of homepage |
| Stage Hub | Yara (deels) | Marc, Joke | Naam "Stage Hub" niet herkenbaar als feature |
| Driegesprek | Niemand | Joke | Gepromoot op pricing, niet vindbaar in product |
| ESG/CSRD | Marc (stub gezien) | Yara, Joke | Relevant voor Marc maar in verkeerde context |

## Aanbevelingen

1. **"Student of BBL?" — beslisboom toevoegen**: Bij de homepage role-picker en auth.html, één uitlegzin: "Werk je al bij een leerbedrijf? → BBL. Zoek je nog een stage? → Student."
2. **Buddy-discovery verbeteren**: De buddy-strip op de homepage verdient een eigen feature-blok, niet alleen een kleine strip.
3. **Matchpool discoverable maken**: Een link vanuit discover.html naar de swipe-interface ("Liever swipen?") ontsluit deze feature voor Yara.
4. **Verwachtingsmanagement na sollicitatie**: Een toast of inline tekst na sollicitatie: "Bedrijven hebben X dagen om te reageren via de Responsgarantie."
5. **Onboarding voor bedrijven**: Na eerste login → checklist: profiel invullen, eerste vacature plaatsen, Trust Score uitgelegd.

---

*Blara — 22 april 2026 — READ-ONLY*
