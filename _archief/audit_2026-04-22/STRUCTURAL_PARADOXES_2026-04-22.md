# The Doctor — Structural Paradoxes Audit
**Datum**: 22 april 2026
**Rol**: The Doctor — Ik zoek naar tegenstrijdigheden die bestaan ongeacht hoe de gebruiker zich gedraagt.
**Scope**: Vijf paradoxcategorieën: data, rechten, state, timing, identiteit.
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Definitie

Een structurele paradox is een situatie waarbij twee systeem-aannames tegelijk niet waar kunnen zijn, ongeacht de invoer. Dit verschilt van een bug: een bug is een fout in de implementatie. Een paradox is een fout in het ontwerp.

---

## Paradox 1 — Data: Trust Score heeft twee bronnen van waarheid

**Locatie**: admin.html:528–533, company-dashboard.html:1949–1955, discover.html (leest van internship_postings)

### Beschrijving
`trust_score` bestaat als kolom in zowel `company_profiles` als `internship_postings`.

- admin.html schrijft naar beide: `company_profiles.trust_score` én `internship_postings.trust_score`.
- company-dashboard.html schrijft naar beide bij upsert.
- discover.html leest Trust Badge van `internship_postings.trust_score` (vacaturekaart).
- Er is geen trigger of constraint die de twee synchroon houdt.

### De paradox
Een bedrijf heeft Trust Score A in zijn profiel en Trust Score B op zijn vacaturekaart. Beide zijn de "officiële" Trust Score. Er is geen mechanisme dat bepaalt welke authoratief is.

### Gevolg
- Student ziet Trust A op de vacaturekaart maar Trust B in het bedrijfsprofiel (als ze doorklikken).
- Admin zet Trust Score A → vertrouwt op dual-write. Als één write mislukt: systeem is permanent inconsistent.
- Zodra een automatisch herberekenings-algoritme (sprint 5 plan) wordt geïmplementeerd, moet het op beide tabellen schrijven — of één wordt het enkelvoudige autoritaire bron.

**Ernst**: HOOG voor sprint 5 — het Trust Score algoritme kan niet correct werken zolang er twee onafhankelijke bronnen zijn.

---

## Paradox 2 — State: BBL-hub zonder BBL-context

**Locatie**: bbl-hub.html:948 (verlenging-view), bbl-hub.html:2262 (signOff), bbl-hub.html:2380 (renewalSign)

### Beschrijving
bbl-hub.html laadt volledig voor iedere gebruiker waarbij `bbl_mode === true` in hun profiel. De hub toont zeven views inclusief Contractverlenging en Evaluatie-ondertekening.

Er is geen check of er een actieve meetings-record bestaat (het record dat de stage vertegenwoordigt) vóórdat de verlenging- en evaluatieflows beschikbaar worden gemaakt.

### De paradox
Een BBL-student die zich heeft geregistreerd (bbl_mode=true) maar nog geen formele stage-koppeling heeft, kan:
- De verlengings-UI openen en zien: "Wettelijke termijn: 90 dagen" met lege datum-velden.
- De evaluatieflow starten en "Evaluatie ondertekenen" klikken.
- signOff() aanroepen, wat een meetings.update uitvoert op een record dat niet bestaat of een ander record is.

### Gevolg
- Lege UI-states zonder guard (dagen-counter toont "—", deadline toont "—").
- Evaluatie-ondertekening slaagt als de meetings-query een random rij teruggeeft, of faalt stil als er geen rij is.
- Renewal_status wordt geschreven naar een meetings-record dat mogelijk geen BBL-stage vertegenwoordigt.

**Ernst**: MIDDEL — voor nieuwe BBL-gebruikers zonder stage leidt dit tot verwarring of stille schrijffouten.

---

## Paradox 3 — Rechten: Admin RLS is client-side

**Locatie**: admin.html (volledig bestand), js/supabase.js (SUPABASE_ANON_KEY)

### Beschrijving
admin.html biedt beheerfunctionaliteit: Trust Score handmatig aanpassen per bedrijf, gebruikersoverzicht, platform-statistieken.

CLAUDE.md vermeldt expliciet: "Admin RLS = client-side only."

### De paradox
De Supabase ANON_KEY is publiek zichtbaar in de browser (supabase.js laadt hem als window.__SUPABASE_ANON_KEY). Elke gebruiker die de admin.html URL kent en de Supabase-tabelnamen kent (beide bekend via de browser-console), kan de admin-writes uitvoeren via de Supabase-client zonder admin-rechten.

Concreet: de Trust Score update op admin.html werkt via:
```javascript
db.from('company_profiles').update({ trust_score: score }).eq('profile_id', id)
```

Als de `company_profiles`-tabel geen RLS-policy heeft die admin-writes beperkt tot een specifieke rol, kan elke ingelogde gebruiker dit verzoek namaken.

### Gevolg
- Elke ingelogde gebruiker kan de Trust Score van elk bedrijf aanpassen als de RLS dit toelaat.
- Er is geen audit log van wie welke Trust Score heeft gewijzigd (geen `updated_by` kolom gedetecteerd).
- De admin-UI is een dunne laag bovenop dezelfde Supabase-client die alle andere gebruikers hebben.

**Ernst**: HOOG voor veiligheid en integriteit bij schaalvergroting. Acceptabel als PoC, onacceptabel bij echte gebruikers.

---

## Paradox 4 — Timing: Renewal_status lees-modificeer-schrijf zonder lock

**Locatie**: bbl-hub.html:2380–2398

### Beschrijving
(Volledig gedocumenteerd in Timmy's Atomic Ops rapport — Operatie 3.)

Samenvatting voor paradox-framing:

Het systeem laat drie partijen onafhankelijk hun verlengingskeuze opslaan via één gedeeld JSONB-veld. Het verwacht dat alle drie hun keuzes behouden worden, maar het schrijfmechanisme (select → merge in JS-geheugen → update) garandeert dit niet bij gelijktijdige writes.

### De paradox
Het systeem belooft drie onafhankelijke keuzes samen te voegen, maar de implementatie kan bij gelijktijdige toegang slechts één keuze per write garanderen.

De systeem-aanname en de implementatie-aanname zijn tegenstrijdig:
- **Systeem-aanname**: "Elke partij kan op elk moment zijn keuze opslaan; anderen' keuzes worden bewaard."
- **Implementatie-aanname**: "Er is altijd maximaal één partij tegelijk aan het schrijven."

Beide zijn tegelijk niet waar bij normaal gebruik van het platform.

**Ernst**: HOOG — dataverlies zonder foutmelding.

---

## Paradox 5 — Identiteit: match_type bepaalt de betekenis van party_a en party_b

**Locatie**: match-dashboard.html:2725–2804, CLAUDE.md (matches-tabel asymmetrie)

### Beschrijving
De `matches`-tabel heeft twee rollen: `party_a` en `party_b`. Hun betekenis verschilt per `match_type`:

| match_type | party_a | party_b |
|------------|---------|---------|
| student_to_company | student | bedrijf |
| school_referral | school | bedrijf |

match-dashboard.html:2737–2741 leest:
```javascript
if (user.id === matchRow.party_a) { ... } else if (user.id === matchRow.party_b) { ... }
```

En later:
```javascript
hubPartyIds.student = matchRow.party_a;
hubPartyIds.bedrijf = matchRow.party_b;
```

### De paradox
Bij een `school_referral`-match stelt de code `hubPartyIds.student = school_id`. Alles in de hub dat vervolgens met `hubPartyIds.student` werkt — student-profiel laden, student-naam weergeven, student-evaluatie linken — zal proberen de school-gebruiker te behandelen als een student.

CLAUDE.md vermeldt dit als bekende asymmetrie: "Elke query op matches moet match_type lezen vóór party_a/party_b te interpreteren. Stille aanname — geen foutmelding als vergeten."

### Gevolg
- match-dashboard.html:2766–2767 haalt expliciete student- én bedrijfs-profielen op via `party_a` en `party_b`. Bij een school_referral-match zou het een student-profiel ophalen voor de school (party_a = school_id) → leeg resultaat of foutief profiel.
- Geen foutmelding — de query geeft simpelweg geen resultaat omdat de school geen student_profile heeft.
- De hub toont dan een lege of inconsistente staat voor school_referral-matches.

**Ernst**: MIDDEL — school_referral-matches zijn een deelfunctie, maar de hub is de centrale interfacelaag. Incorrect gedrag hier schaadt het vertrouwen in de hub.

---

## Samenvatting paradoxen

| # | Type | Kern | Ernst |
|---|------|------|-------|
| 1 | Data | trust_score dual-source — geen autoritatieve bron | HOOG |
| 2 | State | BBL-hub toegankelijk zonder actieve BBL-stage | MIDDEL |
| 3 | Rechten | Admin RLS is client-side — security theatre | HOOG |
| 4 | Timing | renewal_status lees-modificeer-schrijf race | HOOG |
| 5 | Identiteit | party_a/party_b betekenis verschilt per match_type | MIDDEL |

### Gezamenlijk patroon
Alle vijf paradoxen delen een grondoorzaak: **aannames die in de code niet expliciet worden afgedwongen**. Ze zijn onzichtbaar in het happy path en manifesteren zich alleen bij specifieke omstandigheden (gelijktijdigheid, randgevallen, onverwacht gebruik). Geen van de vijf geeft een foutmelding — ze falen allemaal stil.

---

*The Doctor — 22 april 2026 — READ-ONLY*
