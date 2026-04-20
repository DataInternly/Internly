# INTERNLY — CLAUDE CONTEXT
Lees dit vóór elke sessie.

## Platform
Internly.pro — Nederlands stageplatform.
Vanilla HTML/CSS/JS · Supabase (qoxgbkbnjsycodcqqmft)
Gehost via FileZilla FTP · Sasubo Holding B.V.
Projectmap: c:\Projects\Internly

## Rollen en routing
| Rol           | Na login                  | Hub                  |
|---------------|---------------------------|----------------------|
| BOL student   | student-profile.html      | match-dashboard.html |
| BBL student   | bbl-profile.html          | bbl-hub.html         |
| Bedrijf       | company-dashboard.html    | —                    |
| School        | school-dashboard.html     | —                    |
| Begeleider    | begeleider-dashboard.html | —                    |
| Gepensioneerd | buddy-dashboard.html      | —                    |

routeStudent() in utils.js (7/11 — enige routing-beslisser):
  BBL (bbl_mode === true) → bbl-profile.html
  BOL (alles anders)      → student-profile.html

## Centrale bestanden
js/utils.js        — notify(), escapeHtml(),
                     formatNLDate(), getNotifText(),
                     createNotification(), TOAST_TIMEOUT_MS,
                     routeStudent() (centrale BBL/BOL routing)
js/supabase.js     — Supabase client, SUPABASE_URL,
                     SUPABASE_ANON_KEY, hasActivePlan(),
                     initSessionTimeout()
                     window.__SUPABASE_ANON_KEY = SUPABASE_ANON_KEY
                     (gezet voor telemetry.js _tel — Bug 7)
js/calendar.js     — InternlyCalendar module,
                     renderChatButton(), submitMeeting(),
                     calNotify() (lokale toast-variant,
                     targets #cal-notif, niet #notif)
js/buddy.js        — buddy request/accept/decline flow
js/telemetry.js    — client-side sessie-bewaking v2.1
                     zie "Telemetry.js — hunter codenames" hieronder
                     voor vertaaltabel codenamen ↔ echte namen
                     _bootReady() loopt na DOMContentLoaded
css/style.css      — CSS variabelen en gedeelde stijlen

## Laadvolgorde (elke app-pagina)
1. js/utils.js
2. js/supabase.js
3. js/push.js (alleen pagina's met push-notificaties)
4. js/calendar.js (alleen pagina's met kalender — geladen onderaan body)
5. js/buddy.js (alleen buddy-pagina's)
6. js/telemetry.js (ALTIJD als laatste — snapshots utils-functies)

index.html: laadt utils.js + supabase.js + telemetry.js (toegevoegd 20 april — auth gate vereist db).
Publieke info-pagina's (about, privacybeleid, spelregels, 404): laden telemetry.js NIET.

## Loop-shield regels (uitgebreid — Tarlok + Hal)
Na elke sessie: grep op
  function notify(             → verwacht 0 buiten utils.js
  function escapeHtml(         → verwacht 0 buiten utils.js
  const SUPABASE_URL           → verwacht 0 buiten supabase.js
  function createNotification( → verwacht 0 buiten utils.js

Uitzondering: function calNotify( in calendar.js is correct
(lokale variant, targets eigen #cal-notif element).

Aandacht: telemetry.js bevat commentaar met createNotification — dit is
GEEN definitie. grep -n ipv -l gebruiken om te onderscheiden.

## Bekende risico's

- AWGB-risico: filteropties in company-discover kunnen proxy zijn voor
  discriminatoire selectie (domein-filter kan niveau of herkomst
  impliceren). Beoordeling door juridische adviseur nodig vóór
  schaalvergroting. — Guinan2, 17 april 2026

## Bekende stubs en dead code
- hasActivePlan() bevraagt subscriptions-tabel actief
  (HANDOVER.md zegt "altijd true/stub" — dat is ONJUIST)
- send-meeting-email Edge Function bestaat niet
  (invoke verwijderd uit calendar.js, in-app notificatie actief)
- stage-hub.html = dood bestand, vervangen door
  match-dashboard.html (staat nog foutief in HANDOVER.md
  FileZilla-lijst — niet uploaden)
- Ghosting-bestraffing = niet geïmplementeerd
- Trust Score auto-algoritme = niet geïmplementeerd
- ESG-export PDF/CSV = stub in company-dashboard.html
  (lijnen 2302-2303: "beschikbaar vanaf week 9")
- pricing.html startCheckout() = stub (Mollie niet actief)
- Admin RLS = client-side only
- company-discover.html contact() = stub (notificatie zonder DB-insert)

## Bouwregels (altijd volgen)
1. Bouw elke feature compleet in één sessie
2. Elke INSERT: verifieer alle relatie-kolommen
   (match_id, buddy_pair_id, roc_profile_id)
3. Als een tweede bestand hetzelfde concept
   implementeert als een eerste: definieer eerst
   een gedeeld contract in js/utils.js of supabase.js
4. Blara en TQ reviewen aan het einde van elke
   bouwsessie — niet alleen bij audits
P8 (Kant + Data2): De SELECT-kolommen en de render-functies
   die ze gebruiken moeten altijd gesynchroniseerd zijn.
   Een kolom die niet gerenderd wordt hoort niet in de SELECT.
   Een render-referentie naar een kolom die niet in de SELECT
   staat is een bug.

## Notification types (geregistreerd in utils.js)
new_message · new_meeting · meeting_accepted ·
meeting_rejected · new_match · eval_signed ·
eval_completed · buddy_request · buddy_accepted ·
buddy_declined · subscription_activated ·
subscription_failed · new_review

## Test accounts
Student:    65ed548f (student@internly.pro)
Bedrijf:    a5d25384 (bedrijf@internly.pro)
School:     520f9b1a (school@internly.pro)

## Sessie-architectuur aanbeveling (Tarlok)
Maximaal 3 fases per Claude Code sessie.
Verificatie na elke sessie vóór FTP.
Instructies altijd met exacte grep-verwachting:
"verwacht exact N resultaten" — nooit "bevestig aanwezigheid".

## Pre-sessie checklist (Tarlok)
Vóór elke nieuwe Claude Code instructie:

1. Staat in SESSION_LOG.md wat al opgelost is?
   Introduceert de nieuwe instructie een
   eerder opgelost probleem opnieuw?

2. Heeft de instructie maximaal 3 fases?
   Zo niet: splits in twee sessies.

3. Hebben alle PASS/FAIL criteria een
   exact verwacht getal?
   "grep op X → verwacht 0" niet
   "bevestig aanwezigheid van X"

4. Is de volgorde van stappen zo dat
   stap B stap A niet kan breken?

5. Is er een verificatie-stap aan het einde
   vóór FTP?

## Open voor Sprint 5
- K3 (7/11 principe): OPGELOST — hasActivePlan() lokale kopieën
  verwijderd uit company-dashboard.html, school-dashboard.html,
  begeleider-dashboard.html. Enige definitie: js/supabase.js.
- CSS-variabelen: :root heeft nu --green, --blue, --amber, --red,
  --ink, --ink2, --ink3, --bg2 (toegevoegd sprint 4).
  Hardcoded kleuren #0d1520, #1a7a48, #b82020, #7a8799, #374151
  vervangen door variabelen in de bestanden zelf — sprint 5 werk
- hasActivePlan() gating niet actief op: discover.html, matches.html,
  mijn-sollicitaties.html, chat.html, student-profile.html,
  vacature-detail.html — sprint 5 P1
- school-dashboard.html: ontbreekt "Plan driegesprek" per student,
  fase-nummering (1/2/3), signaal bij >14 dagen inactieve studenten
- Ghosting-bestraffing (Supabase cron-job of Edge Function)
- Trust Score auto-algoritme (Edge Function)
- Admin RLS (Supabase Console — nu client-side only)
- ESG-export implementeren (nu stub)
- Cohort-rapportage school
- Buddy-kalender + sessie-plannen
- Begeleider-agenda
- Postadres Sasubo Holding in privacybeleid.html
- Mollie betaalintegratie (pricing.html startCheckout stub)
- STARR SQL-migratie uitvoeren (zie HANDOVER.md)
- about.html + index.html: inline SUPABASE_URL opruimen
- renderApplications (mijn-sollicitaties.html, ~151 regels) opsplitsen
- renderESG (company-dashboard.html, ~128 regels) opsplitsen

## Architecturele ketens

### signOff-keten (bbl-hub.html)
signOff(party)
  → db.from('meetings').update({ status: newStatus })   [schakel 1 — DB write]
  → await createNotification(recipientId, 'eval_signed'/'eval_completed', ...)
      → db.from('notifications').insert(...)             [schakel 2 — breekpunt]
        → Supabase realtime trigger
          → startNotifSubscription callback op ontvangerspagina
            (company-dashboard.html · school-dashboard.html · matches.html
             discover.html · mijn-sollicitaties.html · chat.html)
            → showToast(payload.new.message)             [schakel 3 — UI]
            → loadNotifications()                        [schakel 4 — DB read]
              → DOM update — geen write-back             [eindpunt]

Breekpunt: schakel 2 — createNotification() was fire-and-forget zonder await.
Fix (april 2026): createNotification-aanroepen in signOff() omgezet naar
await met try/catch; bij falen: console.error + notify('Evaluatie
gedeeltelijk opgeslagen', false).

### matches-tabel asymmetrie (Timmy, 17 apr 2026)
party_a en party_b betekenen verschillende dingen
per match_type:
- student_to_company: party_a = student, party_b = bedrijf
- school_referral:    party_a = school, party_b = bedrijf
Elke query op matches moet match_type lezen
vóór party_a/party_b te interpreteren.
Stille aanname — geen foutmelding als vergeten.

### Trust Score basis (sprint 5)
De signOff-keten is ook de infrastructuur voor het Trust Score algoritme.
Wat ontbreekt: een Edge Function op review-INSERT die trust_score
herberekent op basis van:
- reviews.rating (gewogen gemiddelde over alle reviews voor company_profile_id)
- response_days vs actual response time (applications tabel)
- meeting completion rate (meetings tabel, status = 'voltooid')
Data is aanwezig in de DB. Berekening ontbreekt.
Implementatie: Supabase Edge Function + database trigger op reviews.

## Onuitgesproken aannames (TQ — controleer bij twijfel)

1. Alle 17 app-bestanden zijn alleen
   bereikbaar voor ingelogde gebruikers.
   Check: heeft elk bestand een auth-guard?

2. De livetest is met gebruikers die het
   platform begrijpen.
   Check: test ook met iemand die niets weet.

3. FTP na verificatie = veilig.
   Check: Geordi2's handmatige journey is
   de enige echte bevestiging.

4. Meer fixes = beter platform.
   Check: na grote fix-sessies, één dag
   observeren op de live site.

5. Claude begrijpt de intentie van een instructie.
   Check: geef altijd bestandsnaam + regelnummer
   als die bekend zijn. Nooit "vind de functie."

## Telemetry.js — hunter codenames
(Bedward + Unsub Knob + The Worm, april 2026)

| Codenaam      | Echte naam         | Functie                        |
|---------------|-------------------|-------------------------------|
| telemetry.js  | hunters.js        | Bestandsnaam                  |
| _cfg          | HUNTERS_CONFIG     | Centrale configuratie          |
| _sess         | ThreatScore        | Cumulatieve dreigingsscore     |
| _tel          | SecurityLog        | Database-logging               |
| _fCtx         | HoneypotSentinel   | Bot-detectie via forms         |
| _env          | CanaryToken        | Broncode-lek detectie          |
| _render       | DOMGuard           | DOM-injectie bewaking          |
| _pol          | CSPReporter        | CSP-overtreding reporting      |
| _perf         | TimingGuard        | Gedragspatroon detectie        |
| _state        | IntegrityPulse     | Function-integriteit bewaking  |
| _yield()      | tarpit()           | Vertragingsrespons             |
| _pause()      | _activateFreeze()  | Sessie bevriezen               |
| _shadow()     | _activatePoison()  | Functie vergiftigen            |
| _bootReady()  | _bootReady()       | Boot sequence (ongewijzigd)    |

Nooit de vertaaltabel verwijderen.
Nooit de codenamen in CLAUDE.md vervangen
door de echte namen — de tabel is de brug.
