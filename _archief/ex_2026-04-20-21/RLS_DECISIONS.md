# RLS Beslissingen

**Datum** 19 tot 20 april 2026
**Scope** Volledige RLS herschrijving Supabase database internly.pro
**Auteur** Barry
**Status** Uitgevoerd, getest, productie

---

## Aanleiding

Tijdens voorbereiding van livetest week 6 voerde ik een audit uit op de RLS policies van de database. Die audit legde dertien publieke lekken bloot, verspreid over tien tabellen. Verschillende van die policies hadden `USING true` als toegangsregel, wat betekent dat de betreffende tabel voor elke bezoeker van internly.pro leesbaar was zonder inlog.

Omdat het platform is opgezet rond vertrouwen tussen studenten, bedrijven en scholen, was deze situatie onverenigbaar met de beloftes in de missie en met de AVG. Voor echte studenten op het platform zouden doorbraken werden gezet. De beslissing was om livetest uit te stellen tot dit was opgelost.

---

## Uitgangspunten

Bij het herschrijven van de RLS zijn vier principes gehanteerd.

**Default deny.** Elke nieuwe policy gaat uit van niets tonen, dan pas uitzonderingen definiëren.

**Privacy by default.** Kolommen die gevoelig zijn (email, zichtbaarheid profiel, toestemming voor data aggregatie) krijgen standaardwaarden die de gebruiker beschermen. De gebruiker zet actief aan wat hij wil delen, niets is vooraf aangevinkt.

**Context over rol.** Toegang wordt niet bepaald door de rol alleen (bedrijf ziet alles, student ziet niets). Toegang wordt bepaald door de relatie (bestaat er een match, is dit je cohort, ben je gekoppeld als buddy).

**Schema niveau, geen UI guards.** Elke check wordt in de database afgedwongen, niet in de JavaScript code van de pagina. Een user die de UI omzeilt en direct queries stuurt, moet dezelfde beperkingen tegenkomen.

---

## Architectuur

### Helper functies

Zes SECURITY DEFINER functies zijn aangemaakt om recursieproblemen in RLS policies te voorkomen. RLS policies die tabellen joinen waar zelf ook RLS op staat, leiden tot oneindige lussen. De helper functies draaien met hoge rechten maar bevatten alle logica zelf.

- `is_current_user_admin()` checkt of de huidige gebruiker admin is
- `has_match_with(other_id)` checkt of er een pending of accepted match bestaat
- `is_school_of_student(student_id)` checkt of de huidige school deze student in cohort heeft
- `is_student_of_school(school_profile_id)` inverse check voor student kant
- `is_buddy_of(student_id)` checkt actieve buddy pair
- `current_user_email()` retourneert email van huidige user, voor waitlist check

### Kolommen toegevoegd

Drie nieuwe kolommen ondersteunen het nieuwe toegangsmodel.

Op de `profiles` tabel:
- `is_admin boolean default false`, platform administrator flag
- `email_zichtbaar boolean default false`, opt in voor emailtonen op publieke views

Op de `student_profiles` tabel:
- `profiel_zichtbaar_voor_bedrijven boolean default false`, opt in voor matchpool browse
- `aggregation_consent boolean default null`, toestemming voor data aggregatie in ESG rapporten

Alle drie privacy-beschermend default. Gebruikers moeten actief aanzetten wat ze willen delen.

### Publieke views

Vier views bieden een gecontroleerde publieke laag over de strenge tabellen.

- `student_profiles_pool` toont minimale kaart velden (leerdoelen, motivatie, opleiding, sector interesse, beschikbaarheid) voor studenten die opt in hebben. Nooit naam, foto, geslacht of postcode. Bedrijven browsen deze view in discover.
- `company_profiles_public` toont bedrijfsgegevens (naam, sector, Trust Score, website, beschrijving) voor alle ingelogde users. Email alleen als `email_zichtbaar` aanstaat.
- `school_profiles_public` idem voor scholen.
- `reviews_public` toont rating, body en datum zonder reviewer identiteit, ter bescherming van BBL anonimiteit.

### Bewust publieke tabellen

Twee policies blijven na de herschrijving `USING true`, beide met reden.

- `internships` (380 rijen, public domain inspiratie vacatures) is expliciet publiek bedoeld als bron voor studenten.
- `waitlist_insert_public` staat anonieme inschrijvingen toe op de mailinglist, zonder dat een account vereist is.

SELECT op `waitlist` zelf is gerestricteerd tot de eigen inschrijving plus admin.

---

## Tabellen, per tabel

### `profiles`

Toegang tot een profielrij heeft een gebruiker als het zijn eigen rij is, hij admin is, hij een match heeft met deze rij, hij de school is van deze student, of hij een actieve buddy is van deze student.

### `student_profiles`

Zelfde regels als profiles, met extra vermelding dat match status pending of accepted telt. Niet rejected.

### `company_profiles`

Toegang tot directe tabel voor eigen rij, admin en match partijen. Bredere toegang loopt via `company_profiles_public` view met email blurring.

### `school_profiles`

Idem company_profiles, plus dat een student automatisch zijn eigen school ziet (via text match op schoolnaam veld).

### `reviews`

Reviewer ziet eigen reviews, reviewee ziet reviews over zichzelf, admin ziet alles. Publieke view `reviews_public` toont rating en body zonder reviewer identiteit, voor zichtbaarheid op bedrijfspagina's zonder anonimiteitsschending.

### `availability`

Eigen slots altijd zichtbaar. Andere users alleen bij accepted match. Plannen van een gesprek vereist immers dat beide partijen elkaars beschikbaarheid zien.

### `vestigingen`

Eigen beheer plus admin. Publieke view `vestigingen_public` exposeert alle velden, want vestigingsadressen zijn echt publieke informatie.

### `internship_postings`

SELECT publiek, maar alleen voor vacatures met `status = 'active'`. Eigen vacatures altijd zichtbaar voor eigenaar, ook draft. Write alleen voor eigenaar of admin.

### `internships`

SELECT volledig publiek (anon plus authenticated). Geen INSERT, UPDATE, DELETE policies, deze tabel wordt alleen door data ingestion scripts gevuld.

### `school_postings`

Zelfde patroon als internship_postings.

### `waitlist`

INSERT publiek voor anon plus authenticated (aanmelding open). SELECT en UPDATE alleen voor eigen email plus admin. DELETE alleen admin.

### Overige tabellen

`applications`, `availability`, `buddy_pairs`, `buddy_queue`, `buddy_requests`, `bundling_requests`, `conversations`, `esg_reports`, `matches`, `meetings`, `messages`, `notifications`, `push_subscriptions`, `stage_deadlines`, `stage_leerdoelen`, `stage_log`, `stage_plans`, `stage_reflecties`, `stage_tasks`, `subscriptions`, `trust_score_history`, `webhook_events` hebben bestaande policies die in deze ronde niet zijn herschreven. Ze zijn niet aangetast. Een volgende audit pakt ze op in een latere sprint.

---

## Opruim

Duplicate policies op verschillende tabellen (bijvoorbeeld `cp_insert_own` naast `own insert company_profiles`) zijn verwijderd. Elke tabel heeft nu één policy per operatie (SELECT, INSERT, UPDATE, DELETE), gestandaardiseerd op dezelfde naamconventie.

---

## Gevonden fouten tijdens uitvoering

**Probleem 1, oneindige recursie in RLS policies.**
Eerste versie van de profiles, student_profiles en school_profiles policies gebruikte inline subqueries naar andere tabellen met RLS. Dit veroorzaakte `infinite recursion detected in policy for relation` errors zodra een echte user een query draaide. In de SQL editor bleef de fout verborgen omdat service role RLS omzeilt.

**Oplossing.** Zes SECURITY DEFINER helper functies aangemaakt. Policies verwijzen naar deze functies in plaats van naar tabellen direct.

**Probleem 2, AVG overtreding op aggregation_consent default.**
Bij het toevoegen van de kolom voor data aggregatie toestemming stond de default op TRUE. Dit betekent dat bestaande en nieuwe studenten automatisch toestemming gaven zonder ooit gevraagd te zijn. In AVG termen is dit geen geldige toestemming.

**Oplossing.** Default verwijderd, kolom op NULL gezet. UI moet bij student profielpagina actief vragen.

**Probleem 3, permission denied voor auth.users tabel.**
De eerste versie van de waitlist policy verwees naar `auth.users` in een subquery. De `authenticated` role heeft geen rechten op die tabel.

**Oplossing.** `current_user_email()` helper function met SECURITY DEFINER.

---

## Testmethodiek

Elke policy reparatie is getest door in te loggen in de browser als een echte user (Lena, student@internly.pro) en via de JavaScript console te queryen of de juiste hoeveelheid data zichtbaar is. Pas na groene test werd de volgende ronde gestart.

De eindtest leverde de volgende resultaten voor Lena.

| Tabel | Rijen zichtbaar | Verwacht |
|---|---|---|
| profiles | 2 | Eigen plus Test Bedrijf via match |
| student_profiles | 1 | Eigen |
| company_profiles | 1 | Test Bedrijf via match |
| school_profiles | 1 | Eigen school via schoolnaam |
| reviews | 1 | Eigen review over Test Bedrijf |
| availability | 30 | Eigen slots |
| internship_postings | 1 | Publiek active vacature |
| internships | 380 | Public domain bronnen |
| waitlist | 0 | Lena niet in waitlist |

Alle resultaten komen overeen met de verwachting.

---

## Open punten voor volgende sprints

**UI werk.**
- Opt in toggle voor `profiel_zichtbaar_voor_bedrijven` op student-profile.html
- Waarschuwingstekst boven motivatie, school en opdracht_aanleiding velden
- Toggle voor `email_zichtbaar` op profielpagina van elke rol
- UI element om `aggregation_consent` te vragen aan bestaande en nieuwe studenten

**Code werk.**
- `discover.html` en `company-discover.html` migreren naar `student_profiles_pool` view
- Bedrijfs en school detailpagina's waar email wordt getoond, migreren naar `_public` views
- `chat.html` naam ophalen via match context in plaats van directe profiles select (mogelijk al werkend door match policy)

**Toekomstige RLS rondes.**
- De 20 tabellen die in deze sessie niet zijn herschreven (matches, messages, notifications, meetings, buddy_pairs, stage_*)
- Volledige audit na migratie naar `_public` views om te checken of code niet alsnog de strenge tabellen raakt waar views bedoeld waren

**ESG module fase 3.**
- Stored functions voor VSME sociaal hoofdstuk export
- Drempel check minimum cohort 5 voor anonimiteit
- PDF generatie service server side
- Trust Score history trigger op company_profiles update

---

## Documentatie van denkwijze

Dit was geen verplicht werk, geen klant vraag, geen bug report. Dit was proactieve due diligence voor livetest. De audit was mijn eigen keuze, het vinden van de lekken was ongemakkelijk, de reparatie was tijdrovend. Maar voor een platform dat verkoopt op vertrouwen is de database laag het eerste wat moet kloppen.

De keuze om livetest uit te stellen boven een onzekere lancering is afgestemd op Internly's kernboodschap. Wij beloven studenten en bedrijven dat wij hun data respecteren. Die belofte moet waar zijn voordat de eerste echte gebruiker zich aanmeldt.

---

*Einde document.*
