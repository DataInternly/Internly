# Reid2 — Insider Threat Analysis
**Datum**: 22 april 2026
**Rol**: Reid2 — Gedrags-profiling. Externe hackers zijn makkelijk te begrijpen. Insiders zijn moeilijker — ze hebben legitieme toegang.
**Scope**: Vijf insider-personas × legitieme grenzen × technisch mogelijke overschrijdingen × ontbrekende mechanismen.
**Instructie**: READ-ONLY analyse — geen code-wijzigingen.

---

## Definitie

Een insider threat is niet per definitie kwaadwillend. Een insider is iemand met legitieme toegang die — bewust of onbewust — meer doet, ziet, of verandert dan de bedoeling is. De schade kan ontstaan door kwade opzet, nalatigheid, of gewoon nieuwsgierigheid zonder kwaad in de zin.

---

## Persona 1 — De Ontwikkelaar (Barry, toekomstige mede-devs)

### Legitieme toegang
- Supabase Console (service role key = god-mode: alle data leesbaar en schrijfbaar, RLS bypassed)
- Supabase auth admin (kan accounts aanmaken, verwijderen, e-mails wijzigen)
- Alle productie-code via FTP
- telemetry.js (kan monitoring uitzetten)

### Technisch mogelijk maar niet bedoeld

**1. Alle gebruikersdata inzien**
Via Supabase Console Table Editor: alle profiles, messages, conversations, reviews (inclusief anonieme BBL-reviews), sollicitaties, beoordelingen. Geen audit-log van Console-acties in Supabase Free tier.

**2. Gebruikersaccounts impersonaten**
Via Supabase Auth admin SDK:
```javascript
const { data } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: 'gebruiker@mail.nl'
});
// → magic link geeft directe inlog als die gebruiker
```
Geen melding aan de gebruiker.

**3. Reviews lezen die als "anoniem" zijn aangemerkt**
Insider-buddy reviews of anonieme beoordelingen zijn alleen anoniem voor andere gebruikers, niet voor de DB-beheerder. reviewer_id staat altijd in de tabel.

**4. Telemetry/monitoring uitzetten**
In supabase.js of telemetry.js: één regel aanpassen om monitoring te deactiveren. Geen andere check die dit detecteert.

### Ontbrekende mechanismen

- **Geen audit-log**: Wie heeft wat gelezen/gewijzigd in Supabase Console? Dit is een Supabase Free-plan beperking (audit logs zijn Pro-feature). Barry heeft hier bewust voor gekozen of niet over nagedacht.
- **Geen vier-ogen-principe**: Barry is de enige met console-toegang. Geen tweede sleutelbeheerder.
- **Privacybeleid documenting**: privacybeleid.html vermeldt niet dat de ontwikkelaar toegang heeft tot alle data.

### Risico-rating
LAAG (Barry is de oprichter — geen kwade opzet verwacht). Maar: bij team-uitbreiding stijgt dit naar HOOG als dezelfde Console-toegang zonder audit-log wordt gedeeld.

---

## Persona 2 — De Admin-gebruiker (via admin.html)

### Legitieme toegang
- Trust Score handmatig aanpassen per bedrijf
- Reviews flaggen en verwijderen
- Waitlist-verzoeken zien en afhandelen
- Statistieken: totaal users, reviews, flagged reviews

### Technisch mogelijk maar niet bedoeld

**1. Trust Score onomkeerbaar verlagen**
admin.html:528: `db.from('company_profiles').update({ trust_score: val })`. Geen undo-functie. Geen historiek van vorige waarden. Als een admin per ongeluk 0 invoert: geen herstel zonder handmatige DB-correctie.

**2. Reviews verwijderen zonder trace**
admin.html:453: `db.from('reviews').delete().eq('id', reviewId)`. Hard delete, geen soft-delete of audit-trail. Een verwijderde review is weg — inclusief eventuele bewijswaarde.

**3. Flagged reviews onterecht schoonmaken**
admin.html:461–465: unflag een review (zet flagged=false, flag_reason=null). Een bedrijf dat weet hoe de admin bereikt kan worden, kan proberen via-via reviews te laten verwijderen.

### Ontbrekende mechanismen

- **Geen actie-historiek**: wie heeft welke Trust Score aangepast? Op welk moment?
- **Geen bevestigingsdialoog** voor destructieve acties (review verwijderen, score op 0 zetten)
- **Geen admin-rolverificatie server-side**: admin.html's beveiliging is client-side auth-check

### Risico-rating
MIDDEL — trust_score manipulatie door admin is onomkeerbaar en onzichtbaar.

---

## Persona 3 — De Kwaadwillende Student

### Legitieme toegang
- Eigen profiel, sollicitaties, matches, chat, reviews, buddy-verzoeken

### Technisch mogelijk maar niet bedoeld

**1. Meerdere accounts aanmaken**
Geen e-maildomein-restrictie gevonden in auth.html. Elke Gmail-alias (`naam+spam@gmail.com`) geeft een nieuw account. Geen telefoonverificatie of CAPTCHA gedetecteerd.

**2. Spam-sollicitaties**
mijn-sollicitaties.html:456: "terugnemen" werkt via delete + herinsert. Er is geen rate-limiting op sollicitaties aangetroffen in de code. Een student kan meerdere vacatures gelijktijdig bespamen, of herhaaldelijk solliciteren, terugnemen, en opnieuw solliciteren bij hetzelfde bedrijf.

**3. Buddy-misbruik als grooming-vector**
buddySendRequest() stuurt een verzoek met een optioneel bericht. Er is geen content-moderatie op buddy-berichten. Een kwaadwillende kan buddy-verzoeken sturen met manipulatieve of ongepaste berichten.

**4. Chat-misbruik**
Geen content-moderatie gedetecteerd op chat-berichten. Ongepaste content is persistent in de conversatie-tabel.

**5. Review-score-bombing**
Als een student bij meerdere bedrijven heeft gesolliciteerd (ook afgewezen matches), kan hij meerdere reviews met lage rating plaatsen. Geen minimum-interactie-vereiste gevonden buiten de `match_id`-koppeling.

### Ontbrekende mechanismen

- **Geen account-link detectie** (identieke browser-fingerprint, IP-adres)
- **Geen rate-limiting op sollicitaties of buddy-verzoeken**
- **Geen content-moderatie** op chat of buddy-berichten
- **Geen minimum-stage-duur vereiste** voor reviews

### Risico-rating
MIDDEL — kwetsbaar voor spam en reputatie-aanvallen zodra platform groeit.

---

## Persona 4 — Het Kwaadwillende Bedrijf

### Legitieme toegang
- Eigen vacatures plaatsen, sollicitaties beoordelen, matches beheren, reviews lezen, chat, kalender

### Technisch mogelijk maar niet bedoeld

**1. Studentgegevens als dataset scrapen**
company-dashboard.html laadt sollicitaties met student-profieldata. Via de Supabase-client kan een bedrijf systematisch alle sollicitaties bij hun vacatures ophalen en student-profielen (naam, opleiding, niveau, foto) opslaan buiten het platform.

**Welke data ziet een bedrijf van een sollicitant?**
Uit code-patroon: naam, opleiding, niveau, stagejaar, profielfoto (indien aanwezig), motivatietekst. Dit is nodig voor het matchproces maar is meer dan een gemiddeld CV-platform toont.

**2. Trust Score gaming**
Bedrijf vraagt studenten actief om vijf-sterren reviews in ruil voor acceptatie. Geen mechanisme detecteert dit — reviews worden zonder context gepubliceerd.

**3. Vacature-inflatie**
Bedrijf plaatst vacatures met hoge Trust Score badge (uit een periode dat ze actief waren) terwijl ze nu inactief zijn. Geen auto-expiry op vacatures gedetecteerd.

**4. Data-portabiliteit misbruik**
Als bedrijf beschikt over sollicitant-data (naam, e-mail via profiel join): dit is AVG-gevoelig. Er is geen exportfunctie, maar de Supabase-client geeft directe DB-access.

### Ontbrekende mechanismen

- **Geen data-minimalisatie**: bedrijf ziet meer student-data dan strikt nodig voor matching
- **Geen review-verificatie**: geen check of student daadwerkelijk bij dat bedrijf heeft gestageerd
- **Geen vacature-expiry** of activiteitscheck
- **Geen export-logging**: als bedrijf data scrapet via API, geen alarm

### Risico-rating
MIDDEL — aannemelijk scenario bij een groeiend platform, AVG-implicaties.

---

## Persona 5 — De Gelekte Sessie

### Situatie
Student laat laptop open in openbare ruimte (bibliotheek, kantine), vergeet uit te loggen.

### Wat is zichtbaar/toegankelijk zonder actie?

**Session timeout**: supabase.js:33–60 — `initSessionTimeout()` logt de gebruiker uit na 20 minuten inactiviteit. Waarschuwing bij 18 minuten.

→ Als `initSessionTimeout()` op alle pagina's wordt aangeroepen na auth-check: een onbeheerde laptop logt na 20 min automatisch uit. ✅

**Maar**: initSessionTimeout() moet aangeroepen worden. Grep-check:
```
grep -rn "initSessionTimeout" --include="*.html"
```
Als dit op sommige pagina's ontbreekt: die pagina's hebben geen idle-timeout, en een gelekte sessie blijft actief.

**Push-notificaties op lockscreen**:
js/push.js genereert browser-push-notificaties. Op Windows/Mac/iOS verschijnen deze op het lockscreen als de laptop vergrendeld is maar push-notificaties actief zijn. Een voorbijganger ziet:
- "Je hebt een nieuw bericht van [naam bedrijf]"
- "Match geaccepteerd door [bedrijfsnaam]"

Dit lekt matchpartner-namen en communicatiepatronen op het lockscreen van de student.

**Wat een kwaadwillende doet als hij 20 min eerder bij de laptop is**:
1. Opens match-dashboard → ziet actieve stages
2. Opens chat → leest alle berichten
3. Opens mijn-sollicitaties → ziet alle sollicitaties + status

### Ontbrekende mechanismen

- **initSessionTimeout() niet universeel**: verificatie vereist of alle pagina's het aanroepen
- **Push-notificaties op lockscreen**: geen opt-out of content-masking
- **Geen "actieve sessies"-overzicht**: gebruiker kan niet zien of zijn sessie elders actief is

### Risico-rating
LAAG-MIDDEL — gelekte sessie is reëel scenario (openbare locaties), initSessionTimeout() beperkt de window. Push-notificaties op lockscreen is een privacy-lek dat geen code-fix vereist maar een gebruikers-instructie.

---

## Samenvatting

| Persona | Meest kritieke risico | Mechanisme aanwezig | Mechanisme ontbreekt |
|---------|----------------------|---------------------|----------------------|
| Ontwikkelaar | Anonieme data inzien (BBL-reviews) | Service role = bewust | Audit-log, vier-ogen |
| Admin | Trust Score onomkeerbaar vernietigen | Visuele UI | Undo, historiek, confirmatie |
| Kwaadwillende student | Spam-sollicitaties, buddy-misbruik | UNIQUE-constraint | Rate-limiting, moderatie |
| Kwaadwillend bedrijf | Student-data scrapen, review-gaming | Geen | Data-minimalisatie, export-logging |
| Gelekte sessie | Volledige account-toegang | initSessionTimeout() (20 min) | Push-masking, sessie-overzicht |

### Overkoepelende bevinding

De zwakste insider-bescherming zit bij het kwaadwillende bedrijf (Persona 4). Bedrijven hebben de meeste data-toegang (student-profielen, sollicitaties), de minste beveiliging (geen rate-limiting, geen data-minimalisatie), en de sterkste zakelijke motivatie om te scrapen (wervingsdata heeft commerciële waarde).

Dit is ook het scenario met de directe AVG-risico's: persoonsgegevens van studenten die via de Supabase-client worden geëxporteerd en buiten het platform worden opgeslagen.

---

*Reid2 — 22 april 2026 — READ-ONLY*
