# Tech Inventory Internly.pro
Datum: 21 april 2026
Scope: diep-tech aanvulling op CODEBASE_AUDIT_2026-04-21.md

---

### Sectie 1 — Attack surface per tabel zonder geverifieerde RLS

Legenda: SELECT (S), INSERT (I), UPDATE (U), DELETE (D)
Asterisk (*) = schrijfoperatie zonder client-side rolcheck direct erboven in dezelfde functie.

---

**applications**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| S | admin.html:368 | Ja — admin rolcheck r.784 |
| S | mijn-sollicitaties.html:438 | Ja — requireRole('student') r.670 |
| S | vacature-detail.html:621 | Ja — prof?.role !== 'student' r.611 |
| I | vacature-detail.html:631 | Ja — r.611 rolcheck vóór insert |
| I | vacature-detail.html:663 | Ja — r.611 rolcheck vóór insert |

---

**buddy_pairs**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| S | buddy-dashboard.html:394 | Ja — role !== 'gepensioneerd' r.761 |
| S | buddy-dashboard.html:501 | Ja — r.761 |
| U | buddy-dashboard.html:567 | Ja — r.761 |
| U* | buddy-dashboard.html:572 | Ja — r.761 (rollback) |
| S | buddy-dashboard.html:596 | Ja — r.761 |
| S | chat.html:1050 | Ja — requireRole('student','bedrijf','school') r.1146 |
| I | js/buddy.js:472 | Afhankelijk van aanroepende pagina — geen eigen rolcheck in buddy.js |
| U | js/buddy.js:557 | Afhankelijk van aanroepende pagina |
| S | js/utils.js:540 | Afhankelijk van aanroepende context |
| S | matches.html:853 | Ja — requireRole('student') r.813 |

---

**buddy_queue**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| UPSERT* | js/buddy.js:729 | Geen eigen rolcheck in buddy.js — afhankelijk van aanroepende pagina |

---

**buddy_requests**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| S | buddy-dashboard.html:515 | Ja — role !== 'gepensioneerd' r.761 |
| U | buddy-dashboard.html:554 | Ja — r.761 |
| U | buddy-dashboard.html:562 | Ja — r.761 |
| U* | buddy-dashboard.html:572 | Ja — r.761 (rollback) |
| S | buddy-dashboard.html:596 | Ja — r.761 |
| S | js/buddy.js:235 | Geen eigen rolcheck in buddy.js |
| S | js/buddy.js:280 | Geen eigen rolcheck in buddy.js |
| I* | js/buddy.js:393 | Geen eigen rolcheck in buddy.js |
| U* | js/buddy.js:407 | Geen eigen rolcheck in buddy.js |
| S | js/buddy.js:446 | Geen eigen rolcheck in buddy.js |
| U* | js/buddy.js:460 | Geen eigen rolcheck in buddy.js |
| U* | js/buddy.js:486 | Geen eigen rolcheck in buddy.js (rollback) |
| S | js/buddy.js:531 | Geen eigen rolcheck in buddy.js |

---

**bundling_requests**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| S | admin.html:605 | Ja — admin rolcheck r.784 |
| U* | admin.html:678 | Ja — r.784 |
| U* | admin.html:720 | Ja — r.784 |
| S | school-dashboard.html:1899 | Ja — requireRole('school') r.2072 |
| S | school-dashboard.html:2007 | Ja — r.2072 |

---

**conversations**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| S | bbl-hub.html:2590 | Ja — bbl_mode check r.2491 |
| I* | bbl-hub.html:2601 | Ja — r.2491 |
| S | chat.html:749 | Ja — requireRole('student','bedrijf','school') r.1146 |
| I* | chat.html:756 | Ja — r.1146 |
| S | chat.html:912 | Ja — r.1146 |
| S | chat.html:1090 | Ja — r.1146 |
| I* | chat.html:1100 | Ja — r.1146 |
| I* | chat.html:1108 | Ja — r.1146 |
| S/I* | company-dashboard.html:1555–1557 | Ja — rolcheck r.2501 bij boot |
| S | company-dashboard.html:1609 | Ja — r.2501 |
| S | company-dashboard.html:2617 | Ja — r.2501 |
| I* | js/buddy.js:499 | Geen eigen rolcheck in buddy.js |
| S | matches.html:562 | Ja — requireRole('student') r.813 |
| I* | matches.html:567 | Ja — r.813 |
| I* | matches.html:630 | Ja — r.813 |

---

**esg_reports**

niet aangetroffen in code

---

**matches**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| S | admin.html:diverse | Ja — admin rolcheck r.784 |
| S | bbl-dashboard.html:diverse | Ja — bbl_mode check |
| S | bbl-hub.html:diverse | Ja — bbl_mode check r.2491 |
| S | begeleider-dashboard.html:diverse | Ja — requireRole verwacht |
| I* | matches.html:619 | Ja — requireRole('student') r.813 |
| U* | matches.html:558 | Ja — r.813 |
| S | company-dashboard.html:1460 | Ja — rolcheck r.2501 |
| U* | match-dashboard.html:5096 | Ja — auth.getUser() check r.2660; role via hubState |
| U* | match-dashboard.html:5157 | Ja — r.2660 |
| U* | match-dashboard.html:5191 | Ja — r.2660 |
| S | school-dashboard.html:1233 | Ja — requireRole('school') r.2072 |
| I* | school-dashboard.html:diverse | Ja — r.2072 |

---

**meetings**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| S | bbl-dashboard.html:613 | Ja — bbl_mode check |
| I* | bbl-hub.html:1540 | Ja — bbl_mode check r.2491 |
| S | bbl-hub.html:1348,1371,1396 | Ja — r.2491 |
| U* | bbl-hub.html:1630 | Ja — r.2491 |
| S | bbl-hub.html:2266,2329 | Ja — r.2491 |
| S | chat.html:518,541 | Ja — requireRole r.1146 |
| U* | chat.html:558,595 | Ja — r.1146 |
| S | company-dashboard.html:2211 | Ja — rolcheck r.2501 |
| I* | js/calendar.js:340 | Afhankelijk van aanroepende pagina |
| S | js/esg-export.js:47 | Publieke module, geen rolcheck in bestand zelf |
| S | match-dashboard.html:2584 | Ja — auth.getUser() r.2660 |
| U* | match-dashboard.html:5096,5157,5191 | Ja — r.2660 |
| I* | match-dashboard.html:5420 | Ja — r.2660 |

---

**messages**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| S | admin.html:370 | Ja — admin rolcheck r.784 |
| S | bbl-hub.html:1220 | Ja — bbl_mode check r.2491 |
| U* | bbl-hub.html:1267 | Ja — r.2491 |
| I* | bbl-hub.html:1302 | Ja — r.2491 |
| S | bbl-hub.html:1824 | Ja — r.2491 |
| I* | bbl-hub.html:2209 | Ja — r.2491 |
| S | chat.html:783 | Ja — requireRole r.1146 |
| U* | chat.html:805 | Ja — r.1146 |
| I* | chat.html:864 | Ja — r.1146 |
| S | chat.html:979 | Ja — r.1146 |
| S | company-dashboard.html:1619,2624 | Ja — rolcheck r.2501 |

---

**notifications**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| I* | admin.html:694,729 | Ja — admin rolcheck r.784 |
| S | begeleider-dashboard.html:758 | Ja — rolcheck verwacht |
| I* | bol-profile.html:943 | Ja — auth + rolcheck |
| I* | buddy-dashboard.html:583 | Ja — role !== 'gepensioneerd' r.761 |
| S | company-dashboard.html:1028 | Ja — r.2501 |
| U* | company-dashboard.html:1068,1083 | Ja — r.2501 |
| S | discover.html:921 | Ja — requireRole('student') r.1152 |
| U* | discover.html:961,979 | Ja — r.1152 |
| I* | match-dashboard.html:5105,5162,5196,5447 | Ja — r.2660 |
| S | matches.html:275 | Ja — requireRole('student') r.813 |
| U* | matches.html:315,331 | Ja — r.813 |
| I* | mijn-sollicitaties.html:482 | Ja — requireRole('student') r.670 |
| U* | mijn-sollicitaties.html:532 | Ja — r.670 |
| S | school-dashboard.html:908 | Ja — requireRole('school') r.2072 |
| U* | school-dashboard.html:948,963 | Ja — r.2072 |
| I* | student-profile.html:948 | Ja — auth + rolcheck |
| I* | js/utils.js:344 | Via createNotification() — verwacht userId parameter, geen eigen rolcheck |
| I* | js/buddy.js:580 | Geen eigen rolcheck in buddy.js |
| I* | js/calendar.js:364 | Afhankelijk van aanroepende pagina |

---

**push_subscriptions**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| UPSERT* | js/push.js:55 | Geen eigen rolcheck in push.js — afhankelijk van aanroepende pagina en dbClient parameter |

---

**stage_deadlines**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| S | match-dashboard.html:2513 | Ja — auth.getUser() r.2660 |
| U* | match-dashboard.html:3755 | Ja — r.2660; rol via hubState.role |
| I* | match-dashboard.html:3763 | Ja — r.2660 |

---

**stage_leerdoelen**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| S | match-dashboard.html:2512 | Ja — r.2660 |
| U* | match-dashboard.html:3813,3828 | Ja — r.2660 |
| S | school-dashboard.html:1243 | Ja — requireRole('school') r.2072 |

---

**stage_log**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| S | match-dashboard.html:2516 | Ja — r.2660 |
| I* | match-dashboard.html:4268 | Ja — r.2660; fire-and-forget met .then() |

---

**stage_plans**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| S | match-dashboard.html:2511 | Ja — r.2660 |
| U* | match-dashboard.html:4246 | Ja — r.2660 |
| S | match-dashboard.html:4249 | Ja — r.2660 |
| U* | match-dashboard.html:4558 | Ja — r.2660 |
| I*/S | match-dashboard.html:4539,4562 | Ja — r.2660 |

---

**stage_reflecties**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| S | match-dashboard.html:2515 | Ja — r.2660 |
| U* | match-dashboard.html:3917 | Ja — r.2660 |
| I* | match-dashboard.html:3925 | Ja — r.2660 |
| D* | match-dashboard.html:3949 | Ja — r.2660 |

---

**stage_tasks**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| S | match-dashboard.html:2514 | Ja — r.2660 |
| U* | match-dashboard.html:3371,3695 | Ja — r.2660; hubState.role bepaalt maker |
| D* | match-dashboard.html:3406 | Ja — r.2660 |
| I* | match-dashboard.html:3704 | Ja — r.2660 |

---

**subscriptions**

| Operatie | Bestand:regel | Rolcheck aanwezig? |
|---|---|---|
| I*/U | admin.html:687 | Ja — admin rolcheck r.784 |
| UPSERT* | auth.html:744,800 | Ja — rol is zojuist bepaald in registratieflow |
| S | begeleider-dashboard.html:619 | Ja — rolcheck verwacht |
| S | company-dashboard.html:2520,2543,2546,2572 | Ja — r.2501 |
| S | js/supabase.js:81 (hasActivePlan) | Geen rolcheck — hulpfunctie, aangeroepen vanuit elke pagina |
| UPSERT* | pricing.html:515 | Geen client-side rolcheck — elke ingelogde gebruiker kan elk plan activeren* |
| S | school-dashboard.html:1185,1873,2095 | Ja — requireRole('school') r.2072 |

*pricing.html:515: `startCheckout()` verifieert alleen dat er een geldige sessie is (`session.user.id`), niet of de gebruiker de juiste rol heeft voor het gekozen plan. Een student kan theoretisch `company_starter` activeren.

---

**trust_score_history**

niet aangetroffen in code

---

**webhook_events**

niet aangetroffen in code

---

### Sectie 2 — Edge Functions inventaris

Grep op `.invoke(` in alle HTML en JS bestanden: **geen resultaten gevonden**. Er zijn geen actieve Edge Function-aanroepen via de Supabase client in de codebase.

Externe `fetch()` naar Supabase-domeinen die Edge Function-gedrag simuleren of oproepen:

| Bestand:regel | URL/Functie | Methode | Opmerking |
|---|---|---|---|
| pricing.html:532 | `qoxgbkbnjsycodcqqmft.supabase.co/functions/v1/create-checkout` | POST | Mollie-checkout stub — functie bestaat waarschijnlijk niet (Mollie niet actief) |

**Edge Functions die aangeroepen worden maar waarschijnlijk niet bestaan:**

| Functienaam | Bewijs van verwijdering | Status |
|---|---|---|
| `send-meeting-email` | Invoke verwijderd per sprint (CLAUDE.md §Bekende stubs) | Niet meer aangeroepen in code — veilig |
| `create-checkout` | pricing.html:532 roept aan via fetch() | Te bevestigen via Supabase Console |

---

### Sectie 3 — Silent failure hotspots (top 20)

| Rang | Bestand:regel | Type | Risico |
|---|---|---|---|
| 1 | match-dashboard.html:4268 | promise (fire-and-forget) | `stage_log` INSERT via `.then()` zonder `.catch()` — falen is onzichtbaar, log raakt verloren |
| 2 | match-dashboard.html:5101 | promise (.catch zonder notify) | `meetings.update` bij accepteren — fout leidt alleen tot `console.warn`, gebruiker ziet niks |
| 3 | match-dashboard.html:5112 | promise (.catch zonder notify) | `notifications.insert` bij accepteren — stille catch, ontvanger krijgt geen notificatie |
| 4 | match-dashboard.html:5158 | promise (.catch zonder notify) | `meetings.update` bij afwijzen — stille catch |
| 5 | match-dashboard.html:5169 | promise (.catch zonder notify) | `notifications.insert` bij afwijzen — stille catch |
| 6 | match-dashboard.html:5192 | promise (.catch zonder notify) | `meetings.update` bij annuleren — stille catch |
| 7 | match-dashboard.html:5203 | promise (.catch zonder notify) | `notifications.insert` bij annuleren — stille catch |
| 8 | match-dashboard.html:5454 | promise (.catch zonder notify) | `notifications.insert` na agenda-insert — stille catch |
| 9 | bbl-hub.html:1711–1718 | try (leeg catch) | `student_profiles` SELECT voor `skills_progress` — fout wordt compleet genegeerd, gebruiker ziet lege leerdoelenlijst zonder uitleg |
| 10 | bbl-hub.html:1822–1846 | try (.catch console.warn) | `messages` SELECT voor STARR-reflecties — fout gelogged maar gebruiker ziet lege geschiedenis zonder melding |
| 11 | discover.html:979 | promise (.then zonder .catch) | `notifications.update` markeer-als-gelezen — fout onzichtbaar |
| 12 | bbl-hub.html:1483 | promise (.then zonder .catch) | `loadMeetings().then(renderCalendar)` — als `loadMeetings` faalt, wordt `renderCalendar` niet aangeroepen en ziet gebruiker lege kalender |
| 13 | bbl-hub.html:1488 | promise (.then zonder .catch) | Zelfde patroon als r.1483 |
| 14 | company-dashboard.html:2589 | promise (.then zonder .catch intern) | `loadESGData` aangeroepen via `.then()` — de `.catch` op r.2592 logt alleen naar console |
| 15 | match-dashboard.html:2844–2845 | try (alleen console.error) | Student-switcher laadprobleem — gebruiker ziet geen foutmelding, dropdown verschijnt niet |
| 16 | match-dashboard.html:2899–2900 | try (alleen console.error) | School-switcher laadprobleem — zelfde patroon |
| 17 | school-dashboard.html:1279–1280 | try (alleen console.warn) | Match-verrijking faalt stil — studenten verschijnen als 'zoekend' zonder dat er een fout zichtbaar is |
| 18 | company-dashboard.html:1914–1916 | try (alleen console.error, return 0) | Matching trigger faalt — geen notificatie aan gebruiker |
| 19 | bbl-hub.html:1797–1808 | try (alleen console.warn) | `skills_toelichting` DB-write faalt — notify('Toelichting opgeslagen') staat *buiten* de catch (r.1811), wordt altijd getoond ook bij DB-fout |
| 20 | mijn-sollicitaties.html:255–258 | try (DOM-fout, geen notify) | Review submit — catch toont DOM-errortekst maar roept `notify()` niet aan; gebruiker ziet tekst in formulier maar geen toast |

---

### Sectie 4 — Divergentie inventaris

| Concept | Aantal implementaties/locaties | Bestanden | Identiek? |
|---|---|---|---|
| notify / toast / calNotify | 6 varianten | `js/utils.js:268` (notify — canoniek), `js/calendar.js:28` (calNotify — lokaal, targets #cal-notif), `match-dashboard.html:4274` (toast — lokale variant met `type` parameter), `company-dashboard.html:1124` (showToast), `discover.html:1007` (showToast — lege body, ongebruikt), `matches.html:363` (showToast), `mijn-sollicitaties.html:590` (showToast), `school-dashboard.html:1000` (showToast) | Nee — 4 unieke implementaties naast de canonieke notify() |
| Modal open/close patronen | 3 patronen | `match-dashboard.html:3602` (classList.add('open') / overlay), `match-dashboard.html:5231,5235` (style.display = 'flex'/'none'), `company-dashboard.html:1179–1200` (getElementById + overlay click), `school-dashboard.html:1057–1078` (zelfde patroon als company-dashboard) | Nee — 3 structureel verschillende patronen zonder gedeeld contract |
| formatDate / formatNLDate / toLocaleDateString | Minstens 12 locaties | `js/utils.js` (formatNLDate — canoniek), `bbl-hub.html:1062,1066,1119,1412,1512,1892,1945,2108`, `bbl-dashboard.html:364,372`, `bbl-profile.html:442`, `chat.html:311,456,570,607`, `company-dashboard.html:1748,2439`, `company-discover.html:313`, `discover.html:568`, `admin.html:423,424,577,631`, `begeleider-dashboard.html:774`, `bol-profile.html:971,1455` | Nee — direct `toLocaleDateString('nl-NL', {...})` in meer dan 20 regels buiten utils.js |
| escapeHtml | 1 definitie | `js/utils.js:311` | Ja — enige definitie; correct |
| routeStudentByMode / Internly.routeForRole / getRoleLanding | 3 routing-functies | `js/utils.js:396` (routeStudentByMode — BBL/BOL beslist), `js/utils.js:20` (getRoleLanding — rol → URL), `js/roles.js:73` (Internly.routeForRole — alleen auth.html en hub.html) | Nee — drie functies met overlappende verantwoordelijkheid; `routeForRole` in roles.js delegeert niet naar utils.js |
| bbl_mode directe reads uit DB | 12 unieke locaties | `auth.html:643,884`, `bbl-dashboard.html:523`, `bbl-hub.html:2485,2514`, `bol-profile.html:1299`, `discover.html:1179`, `index.html:1139`, `js/utils.js:42,142,191,537`, `matches.html:822`, `mijn-sollicitaties.html:678`, `student-profile.html:1297` | N.v.t. — allen lezen, niet schrijven; patroon consistent maar niet gecentraliseerd |
| SUPABASE_URL hardcoded buiten supabase.js | 5 locaties | `about.html:782,820,871` (inline client aanmaken), `index.html:1246,1394` (fetch naar REST API), `js/telemetry.js:57` (security_reports endpoint), `pricing.html:533` (create-checkout fetch) | N.v.t. — hardcoded URL met anon key zichtbaar in broncode; geen variabele, geen module |

---

### Sectie 5 — Onbekend schema resolven

**company_doorstroom**

Enige aanroep: `bbl-hub.html:2434`.

```
.from('company_doorstroom')
.select('doorstroom_pct')
.eq('company_id', activeMatch.internship_postings.company_user_id)
.maybeSingle()
```

Aanroep alleen als `activeMatch?.internship_postings?.company_user_id` bestaat (r.2432). Tabel niet aangetroffen in andere bestanden.

| Item | Bestand:regel | Exacte query/SELECT-string |
|---|---|---|
| company_doorstroom SELECT | bbl-hub.html:2433–2437 | `.from('company_doorstroom').select('doorstroom_pct').eq('company_id', activeMatch.internship_postings.company_user_id).maybeSingle()` |

Tabel bestaat alleen als SELECT-bron — geen INSERT, UPDATE of DELETE aangetroffen. Inhoud en aanwezigheid: uit code niet te bevestigen (waarschijnlijk Supabase View of externe feed).

---

**hub_tasks**

Enige aanroep: `begeleider-dashboard.html:787`.

```
.from('hub_tasks')
.select('id')
.or(`assignee.eq.student`)
.eq('status', 'todo')
.limit(50)
```

Commentaar op r.792–793: "This is a rough indicator — a proper implementation would filter by matches where this begeleider is the supervisor." De query filtert op `assignee = 'student'` (letterlijke string, geen user ID), wat suggereert dat `assignee` een enum-achtige tekstkolom is, geen foreign key.

| Item | Bestand:regel | Exacte query/SELECT-string |
|---|---|---|
| hub_tasks SELECT | begeleider-dashboard.html:786–791 | `.from('hub_tasks').select('id').or('assignee.eq.student').eq('status', 'todo').limit(50)` |

Tabel niet aangetroffen in andere bestanden. Relatie met `stage_tasks` (match-dashboard.html) is onduidelijk — mogelijk dezelfde conceptuele entiteit, verschillende tabelnam.

---

**student_profiles.begeleider_profile_id**

| Bestand:regel | Operatie | Exacte query/gebruik |
|---|---|---|
| begeleider-dashboard.html:695–698 | SELECT (lezen) | `.from('student_profiles').select('profile_id, naam, opleiding, sector').eq('begeleider_profile_id', userId)` |

Commentaar op r.692–694: "field may not exist yet". Kolom wordt alleen gelezen via begeleider-dashboard.html. Geen INSERT, UPDATE of DELETE naar `begeleider_profile_id` aangetroffen in de gehele codebase. Kolom wordt ook niet gezet bij registratie (auth.html) of profielopslag (student-profile.html, bol-profile.html). Koppeling bestaat dus enkel als de kolom handmatig in de DB is gevuld.

---

### Sectie 6 — Persoonsgegevens in client-zone

#### 6a — localStorage en sessionStorage

| Bestand:regel | Key patroon | Voorbeeld-value type | Persoonsgegevens? |
|---|---|---|---|
| auth.html:634 | `internly_role` | string (rol naam) | Nee |
| auth.html:647 | `internly_role` | string 'bbl' | Nee |
| bbl-hub.html:1696 | `internly_bbl_reflectie_draft_{userId}` | JSON-object met velden situatie/taak/actie/resultaat/leermoment | **Ja — STARR-reflectietekst van student** |
| bbl-hub.html:1757 | `internly_ld_{userId}` | JSON-object skills → boolean | Marginaal (skills zijn al in profiel) |
| bbl-hub.html:1794 | `internly_ld_toelichting_{userId}` | JSON-object skills → tekst | **Ja — persoonlijke toelichtingen student** |
| bbl-hub.html:1855 | `internly_bbl_reflecties_{userId}` | JSON-array van STARR-objecten | **Ja — volledige zelfreflectiegeschiedenis student** |
| bbl-hub.html:2397 | `internly_renewal_{matchId}` | JSON-object verlenging-status | Beperkt (match-ID) |
| bbl-profile.html:599 | `internly_bbl_bedrijf_{userId}` | JSON-object bedrijfsnaam + functie | **Ja — werkgever en functie student** |
| bbl-profile.html:604 | `internly_student_postcode_{userId}` | string postcode | **Ja — postcode student** |
| bol-profile.html:1223 | `internly_student_postcode_{userId}` | string postcode | **Ja — postcode student** |
| bol-profile.html:1420,1433 | `internly_buddy_opt_in_{userId}` | string 'true'/'false' | Nee (voorkeur) |
| buddy-dashboard.html:354 | `buddy_avail_{userId}` | JSON-array beschikbaarheid (dagen) | Beperkt |
| buddy-dashboard.html:683 | `buddy_anon_{uid}` | string boolean | Nee |
| buddy-dashboard.html:696 | `buddy_paused_{uid}` | string boolean | Nee |
| company-dashboard.html:1776 | `internly_trust_calculated_{userId}` | string '1' | Nee |
| discover.html:1157 | `internly_role` | string 'student' | Nee |
| js/esg-export.js:216 | `internly_esg_export_data` (sessionStorage) | JSON-object met ESG-statistische data | Beperkt (bedrijfs-aggregaten, geen NAW) |
| index.html:1223 | `internly_role` | string rol-naam | Nee |
| match-dashboard.html:5938 | `internly_demo_profiles` | string 'true'/'false' | Nee |

**Grootste risico:** `internly_bbl_reflecties_{userId}` (bbl-hub.html:1855) — tot 20 STARR-reflecties per student, onversleuteld in localStorage, leesbaar via elke browser-extensie of XSS.

---

#### 6b — console.log met persoonsgegevens-risico

| Bestand:regel | Wat wordt gelogd |
|---|---|
| auth.html:646 | `spErr.message` — foutmelding van student_profiles fetch (bevat mogelijk DB-context) |
| auth.html:734 | `profileError.message` — foutmelding bij profile insert |
| bbl-hub.html:2489 | `spErr.message` — foutmelding student_profiles BBL-check |
| company-dashboard.html:1558 | `convErr.message` — conversation aanmaken, bevat match context |
| company-dashboard.html:1323 | `error?.message` — na match load; kan match-ID bevatten |
| js/utils.js:83 | `error.message` na fetchUserRole — bevat DB-context |
| js/utils.js:130 | Foutmelding na profiles fetch in getUserMode |
| js/utils.js:331 | `{ type, message }` — logt notificatie-payload bij ontbrekend userId (bevat berichtinhoud) |
| js/utils.js:547 | Fout bij renderStudentHeader — bevat buddy_pairs context |
| js/buddy.js:466 | `[buddy] acceptRequest update error` — bevat requestId |
| js/buddy.js:484 | `[buddy] acceptRequest pair insert error` — bevat requester_id / receiver_id |
| matches.html:556 | `[matches] matchRow fetch fout` met matchRowErr.message |
| matches.html:633 | `[matches] conversation aanmaken mislukt` met convErr.message |
| school-dashboard.html:1280 | `enrichErr.message` na match-verrijking |

Alle gevallen loggen foutmeldingen, geen rauwe persoongegevens (naam, e-mail, postcode). Grootste risico: `js/utils.js:331` logt de notificatie-`message` string die vrij-tekst (bijv. naam van afzender) kan bevatten.

---

### Sectie 7 — Externe fetch() inventaris

| Bestand:regel | URL/host | Method | Wat wordt verstuurd |
|---|---|---|---|
| index.html:1245–1256 | `qoxgbkbnjsycodcqqmft.supabase.co/rest/v1/waitlist` | POST | `{ email, source: pathname }` — e-mailadres gebruiker |
| index.html:1393–1404 | `qoxgbkbnjsycodcqqmft.supabase.co/rest/v1/waitlist` | POST | `{ email, source: pathname }` — e-mailadres gebruiker (tweede waitlist-formulier op dezelfde pagina) |
| pricing.html:532–542 | `qoxgbkbnjsycodcqqmft.supabase.co/functions/v1/create-checkout` | POST | `{ plan }` + `Authorization: Bearer {access_token}` — sessie-token gebruiker |
| js/telemetry.js:74–82 | `qoxgbkbnjsycodcqqmft.supabase.co/rest/v1/security_reports` | POST | `{ type, payload }` — telemetrie-event met browsergedrag-data; apikey in header |

Alle vier calls gaan naar het eigen Supabase-project (`qoxgbkbnjsycodcqqmft`). Geen externe derde partijen aangetroffen (geen Google Analytics, Mollie, Segment of vergelijkbaar) in `fetch()` aanroepen.

Opmerkingen:
- `index.html:1250–1251`: anon key staat hardcoded in de `fetch()` headers — zichtbaar in paginabron.
- `pricing.html:533`: roept `functions/v1/create-checkout` aan met gebruikers-`access_token`; functie bestaat waarschijnlijk niet (Mollie stub).
- `about.html:781–826`: gebruikt geen `fetch()` maar de Supabase JS-client met hardcoded credentials (`createClient(URL, ANON_KEY)`) — functioneel equivalent, maar niet meegeteld in fetch-inventaris.
