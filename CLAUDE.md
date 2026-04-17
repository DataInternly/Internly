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
| BOL student   | match-dashboard.html      | match-dashboard.html |
| BBL student   | bbl-dashboard.html        | bbl-hub.html         |
| Bedrijf       | company-dashboard.html    | —                    |
| School        | school-dashboard.html     | —                    |
| Begeleider    | begeleider-dashboard.html | —                    |
| Gepensioneerd | buddy-dashboard.html      | —                    |

BBL-check in auth.html: bbl_mode=true uit
student_profiles → bbl-dashboard.html
BOL-fallback: ROUTES['student'] = match-dashboard.html

## Centrale bestanden
js/utils.js        — notify(), escapeHtml(),
                     formatNLDate(), getNotifText(),
                     createNotification(), TOAST_TIMEOUT_MS
js/supabase.js     — Supabase client, SUPABASE_URL,
                     SUPABASE_ANON_KEY, hasActivePlan(),
                     initSessionTimeout()
js/calendar.js     — InternlyCalendar module,
                     renderChatButton(), submitMeeting(),
                     calNotify() (lokale toast-variant,
                     targets #cal-notif, niet #notif)
js/buddy.js        — buddy request/accept/decline flow
css/style.css      — CSS variabelen en gedeelde stijlen

## Laadvolgorde (elke app-pagina)
1. js/utils.js
2. js/supabase.js
3. js/calendar.js (alleen pagina's met kalender)
4. js/buddy.js (alleen buddy-pagina's)

index.html is publieke pagina — laadt utils.js NIET.

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
- ESG-export = stub (notify Binnenkort)
- Admin RLS = client-side only

## Bouwregels (altijd volgen)
1. Bouw elke feature compleet in één sessie
2. Elke INSERT: verifieer alle relatie-kolommen
   (match_id, buddy_pair_id, roc_profile_id)
3. Als een tweede bestand hetzelfde concept
   implementeert als een eerste: definieer eerst
   een gedeeld contract in js/utils.js of supabase.js
4. Blara en TQ reviewen aan het einde van elke
   bouwsessie — niet alleen bij audits

## Notification types (geregistreerd in utils.js)
new_message · new_meeting · meeting_accepted ·
meeting_rejected · new_match · eval_signed ·
eval_completed · buddy_request · buddy_accepted ·
buddy_declined · subscription_activated ·
subscription_failed

## Test accounts
Student:    65ed548f (student@internly.pro)
Bedrijf:    a5d25384 (bedrijf@internly.pro)
School:     520f9b1a (school@internly.pro)

## Loop-shield regels (Tarlok + Hal)
Na elke sessie: grep op
  function notify(             → verwacht 0 buiten utils.js
  function escapeHtml(         → verwacht 0 buiten utils.js
  const SUPABASE_URL           → verwacht 0 buiten supabase.js
  function createNotification( → verwacht 0 buiten utils.js

Uitzondering: function calNotify( in calendar.js is correct
(lokale variant, targets eigen #cal-notif element).

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
