# INTERNLY PRE-DEPLOYMENT AUDIT — DEEL 3
# Datum: 30 april 2026
# Focus: Kalender per rol, Chat, PDF-export, Input edge cases
# Status: LOPEND — autonoom, geen interactie vereist

Severity: BLOCKER | HOOG | MIDDEL | LAAG | PASS

---

═══════════════════════════════════════════════════════════
DEEL A — KALENDER: ARCHITECTUUR EN GEDEELDE BASIS
═══════════════════════════════════════════════════════════

## CHECK A1 — KALENDER: CENTRALE IMPLEMENTATIE

**Bestand:** `js/calendar.js` — 476 regels totaal

**Public API (`InternlyCalendar.*`):**
- `render(containerId, dbClient, userId)` — render beschikbaarheidsraster (regel 432)
- `renderChatButton(otherUserId, otherEmail, otherName, insertBeforeId, dbClient, userId, matchId)` — knop in chat (regel 450)
- Interne methods exposed: `_toggle, _saveAll, _close, _updateLabel, _submit, _open`

**Tabellen gelezen:**
- `availability` — SELECT day_of_week, hour_start, status (regel 125-126, 210-213)
- `meetings` — INSERT (regel 343-357)
- `notifications` — INSERT (regel 367-374)
- `auth.getUser()` voor email (regel 340)

**Tabellen geschreven:**
- `availability` — DELETE + INSERT (regel 140-145)
- `meetings` — INSERT (regel 343)
- `notifications` — INSERT (regel 367)

**Try/catch coverage:**
- `loadSlots()` — try/catch ✓ (regel 124-131)
- `saveAll()` — try/catch ✓ (regel 139-148)
- `openModal()` slots-load — try/catch ✓ (regel 209-216)
- `submitMeeting()` — try/catch ✓ (regel 339-388)
- `notifications.insert(...)` — gebruikt `.catch()` (regel 374) maar dit is **GEEN geldige Promise-chaining** op een Supabase query response object — kan stille faal opleveren — zie HOOG hieronder

**Datum-input validatie vóór DB-write (`submitMeeting()`, regel 320-388):**
- `if (!subj||!contact||!date||!start||!end)` — verplichte velden check ✓ (regel 331)
- `if (end<=start)` — eindtijd > starttijd check ✓ (regel 332) — voorkomt **zowel** `start==end` als `end<start`
- **GEEN expliciete past-date check in JS** — maar `<input type="date" min="${today}">` op regel 262 vertrouwt op browser-validatie
- HTML5 `min` attribuut wordt door alle moderne browsers gehandhaafd, maar dit is **client-side only** — een gebruiker met devtools kan het min-attribuut verwijderen en een datum in het verleden indienen
- Geen DB constraint `proposed_date >= CURRENT_DATE` aanwezig (kan niet geverifieerd worden zonder DB-toegang)

**A1 — BEVINDINGEN:**
- **PASS** — start/end validatie present (`end<=start` op regel 332 dekt zowel gelijk als omgekeerd)
- **PASS** — try/catch op alle Supabase calls
- **PASS** — verplichte velden check
- **MIDDEL** — past-date guard alleen via HTML5 `min` attribuut, geen JS-controle. Een gebruiker kan via devtools een datum in het verleden indienen. `js/calendar.js:262` (alleen `min` attribuut), `js/calendar.js:331` (geen past-check). **Fix:** voeg `if (date < today) { calNotify('Datum mag niet in het verleden liggen', false); return; }` toe rond regel 332.
- **MIDDEL** — `.catch(err => console.warn(...))` op `_db.from('notifications').insert(...)` (regel 374) is een Supabase response wrapper, niet zeker een Promise — kan resolve met `{error}` object zonder de catch te activeren. Ontvanger ontvangt geen melding stil bij faal.
- **LAAG** — calendar.js bevat een verwijzing naar `window.MEETING_NOTIFICATION_TYPE || 'new_meeting'` (regel 369) — global niet gedefinieerd elders → fallback wordt altijd gebruikt; dead code-pad.

---

## CHECK A2 — KALENDER: TIJDZONE BEHANDELING

**`js/calendar.js` datum-relevante code:**
- Regel 231: `const today = new Date().toISOString().split('T')[0];` — neemt UTC datum, niet Europe/Amsterdam
- Regel 404: `new Date().toLocaleTimeString('nl-NL', ...)` — voor display, OK
- Regel 414: `new Date(data.date + 'T12:00:00').toLocaleDateString('nl-NL', ...)` — bewust 12:00 toegevoegd om DST/timezone-shift te voorkomen ✓ (slimme workaround)

**Tijdzone-issue op regel 231:**
- Op 23:30 lokale tijd in Nederland (UTC+1 in winter, UTC+2 in zomer) is het al de volgende dag in UTC.
- `new Date().toISOString().split('T')[0]` retourneert dan de UTC-datum = morgen.
- Een gebruiker die om 23:30 lokaal een afspraak voor "vandaag" wil indienen kan het niet, want het min-attribuut is morgen.
- Inverse: vroeg in de ochtend kan iemand een afspraak indienen voor een datum die nog niet "morgen" is in lokale tijd, maar wel in UTC al is.

**DST-boundary risico:**
- `proposed_date` is een DATE-kolom (geen timestamp), `time_start` en `time_end` zijn TIME-strings.
- Display gebruikt `T12:00:00` als tijd-anker → ver buiten DST shift uren (00:00–04:00) — DST-veilig ✓
- 09:00 op een DST-dag wordt opgeslagen als pure TIME `'09:00'` zonder timezone-info, en als pure string getoond. Geen conversie → geen DST-shift in display.

**Tijd-zone in andere bestanden — gevonden patronen:**

- `bbl-dashboard.html:399` — `decisionDeadline.toISOString().split('T')[0]` — UTC datum, niet lokaal. Risico: deadline verschuift met DST.
- `match-dashboard.html:5647` — bestandsnaam-slug op CSV download (`stageplan-Naam-2026-04-30.csv`) — UTC, mismatch op late avond ≤30min impact, accepteerbaar
- `match-dashboard.html:5940` — bestandsnaam-slug op andere CSV — idem accepteerbaar

**Datum-vergelijkingen via tekst (`'2026-04-30' < '2026-05-01'`)**: Lexicographische string-vergelijking werkt voor ISO-datums. ✓

**A2 — BEVINDINGEN:**
- **MIDDEL** — `js/calendar.js:231` gebruikt `toISOString()` voor `today` ten behoeve van `min` attribuut. Tussen 23:00–00:00 lokaal kan een gebruiker geen "vandaag" datum kiezen omdat de UTC-datum al een dag verder is. **Fix:** vervang met lokale datum-builder zoals `const d = new Date(); const today = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');`
- **PASS** — display van afspraken gebruikt `T12:00:00` als veilig anker (regel 414) → DST-veilig
- **PASS** — `time_start`/`time_end` worden als pure TIME-strings opgeslagen, geen timezone-conversie nodig
- **MIDDEL** — `bbl-dashboard.html:399` decision deadline gebruikt UTC, niet lokaal. Voor deadlines is dat een echt risico (avond-deadline kan op verkeerde dag uitkomen).

---

## CHECK A3 — KALENDER: DUBBELE BOEKING PREVENTIE

**Zoekresultaat:** geen `overlap`, `conflict`, `dubbel`, geen pre-INSERT SELECT op `meetings` tabel om bestaande slots te checken in `js/calendar.js:343` (de meeting INSERT) of `match-dashboard.html:5468` (parallelle INSERT).

**Workflow:**
- `submitMeeting()` in `js/calendar.js:320-388` voegt direct in zonder andere meetings te raadplegen
- `match-dashboard.html:5468` (`bookFromCalendar`) idem direct insert
- `bbl-hub.html:1541` idem direct insert

Dat betekent: een student kan om 14:00 een afspraak met bedrijf A én om 14:00 een afspraak met school B accepteren — beide in dezelfde tabel, geen waarschuwing.

**A3 — BEVINDINGEN:**
- **MIDDEL** — geen overlap-detectie. `js/calendar.js:343`, `match-dashboard.html:5468`, `bbl-hub.html:1541`. Dubbele boekingen zijn mogelijk. **Fix:** voeg een `db.from('meetings').select('id').or('organizer_id.eq.X,attendee_id.eq.X').eq('proposed_date', date).overlaps('time_range', ...)` check toe vóór insert.

---

## CHECK A4 — KALENDER: BESCHIKBAARHEID SLOTS

**`js/calendar.js:122-132` (`loadSlots()`):**
- Bij geen rijen voor `availability` retourneert `(data||[])` → `_slots` blijft `{}` → leeg raster wordt gerenderd ✓
- Empty state via legenda zichtbaar — gebruiker krijgt instructie "Klik om te wisselen..." (regel 182)

**Validatie van availability-input:**
- `availability` wordt opgeslagen als `(user_id, day_of_week, hour_start, status)` — tijden zijn **discrete uren** (8-17, gehard-coded HOURS array op regel 18) → end time is impliciet `hour_start + 1`
- Geen mogelijkheid om "end time before start time" in te stellen, want eindtijd bestaat niet als losse input
- Geen mogelijkheid om "start == end" in te stellen om dezelfde reden

**A4 — BEVINDINGEN:**
- **PASS** — empty state handled (leeg raster met legenda)
- **PASS** — start/end validatie n.v.t. (impliciet door discrete uurslots)
- **PASS** — invalid time validatie n.v.t.
- **LAAG** — beschikbaarheid slechts ma–vr, 8:00–17:00. Studenten met flexibele beschikbaarheid (avond, weekend) kunnen die niet aangeven. (geen audit-bevinding sec, maar functionele beperking)

---

═══════════════════════════════════════════════════════════
DEEL B — KALENDER: PER ROL EN PER DASHBOARD
═══════════════════════════════════════════════════════════

## CHECK B1 — KALENDER IN MATCH-DASHBOARD (student/bedrijf)

**Locatie:** `match-dashboard.html` — meeting modal in `renderModalStep1()` (regel 5286–5346) en `renderModalStep2()` (regel 5366–5414); `saveMeeting()` op regel 5428–5516.

**Edge cases:**

1. **Onderwerp leeg** — `nextStep()` regel 5356: `if (!to || !subject || !contact)` blokkeert lege onderwerp + receiver + contact. ✓ **PASS**. Onderwerp heeft `maxlength="80"` (regel 5321) ✓
2. **Geen tijdslots** — `saveMeeting()` regel 5432: `const filled = modalTimeSlots.filter(s => s.date && s.from && s.to)` + `if (filled.length === 0)` toon toast 'Voeg minimaal één tijdstip toe.' ✓ **PASS**
3. **proposed_date in verleden** — geen `min` attribuut op de date inputs in `renderModalStep2()` regel 5376! In tegenstelling tot `js/calendar.js:262`, ontbreekt hier zelfs HTML5 minimum. **HOOG** — gebruiker kan een afspraak voor 1980 indienen.
4. **Video zonder URL** — `nextStep()` valideert `contact` (regel 5356), maar valideert NIET dat de URL een geldige URL is. Een bedrijf kan "test" intypen voor een Videocall en doorgaan. **MIDDEL**.
5. **Notificatie bij accept** — `acceptMeeting()` regel 5132–5168: `db.from('notifications').insert({type: 'meeting_accepted'...})` op regel 5153–5160 → `.catch(err => console.warn(...))`. ✓ **PASS** (notificatie aanwezig).
6. **Dubbele acceptatie** — `acceptMeeting()` regel 5132–5168 controleert NIET op `m.status === 'geaccepteerd'` voordat de status wordt gewijzigd. Een gebruiker kan op de accept-knop klikken, dan opnieuw klikken voordat de DB-update terugkomt. Geen `.disabled` op knop tijdens async. **MIDDEL** — race condition mogelijk.
7. **Lege meetings UI** — `match-dashboard.html:2611` haalt meetings op. Bij empty array → standard render zonder crash, geen explicit empty state nodig. ✓ **PASS** (gemodelleerd met `?? []`).
8. **Match niet 'accepted'** — geen guard. De meeting modal opent via `openMeetingModal()` regel 5275 zonder check op `match.status`. Als het match-dashboard wordt opgevraagd voor een match met status 'pending' of 'rejected' kan een afspraak alsnog worden aangemaakt. **MIDDEL**.

**B1 — BEVINDINGEN samengevat:**
- HOOG — geen `min` attribuut op date inputs (regel 5376) — past-date crash mogelijk
- MIDDEL — geen URL-validatie voor video meeting links
- MIDDEL — geen guard tegen dubbele accept (race condition)
- MIDDEL — geen guard tegen meeting voor non-accepted match

---

## CHECK B2 — KALENDER IN BBL-HUB (BBL student)

**Locatie:** `bbl-hub.html` — `createMeeting()` regel 1519–1589, `saveReflectie()` regel 2196–2235.

1. **BBL student zonder leerbedrijf** — `createMeeting()` regel 1529: `if (!currentUser || !activeMatch) { notify('Koppeling niet geladen — ververs de pagina', false); return; }` ✓ **PASS**. Dezelfde guard staat al voor de UI ge-render wordt: `loadActiveMatch()` op pagina-load.
2. **Vergelijking met match-dashboard** — bbl-hub `createMeeting()` is **simpler maar veiliger**: 
   - Heeft `if (date < today)` past-date guard ✓ (regel 1528)
   - Heeft schooldag-blokkering via `disabled` option (regel 1514)
   - **Maar timeEnd is hard-coded `start hour + 1`** (regel 1538) — geen flexibiliteit, en `parseInt(time.split(':')[0]) + 1` kan een hour van 24 produceren als time = "23:00" → "24:00" als string, die mogelijk niet als TIME wordt geaccepteerd door Postgres. **MIDDEL**.
3. **Lege reflectie** — `saveReflectie()` regel 2205: `if (!leermoment) { notify('Vul minimaal het Reflectie/Leermoment-veld in'); return; }` — alleen `leermoment` is verplicht; situatie/taak/actie/resultaat mogen leeg zijn. ✓ **PASS** (volgens design).
4. **Meervoudige zelfreflectie indiening** — Geen guard tegen meervoudige inzending voor dezelfde periode (`saveReflectie()` heeft geen periodes/weken). Een student kan elke seconde een nieuwe reflectie indienen → spam in chat. **LAAG** (functionele beperking).

**B2 — BEVINDINGEN samengevat:**
- MIDDEL — `bbl-hub.html:1538` `parseInt + 1` kan "24:00" produceren bij start = "23:00", potentiële DB-fout.
- LAAG — geen periode-check op zelfreflectie-inzending.
- PASS — past-date guard ✓, schooldag-blokkering ✓, active match check ✓.

---

## CHECK B3 — KALENDER IN SCHOOL-DASHBOARD (school/begeleider)

**Locatie:** `school-dashboard.html` regel 2400 — alleen `InternlyCalendar.render('ical-container', db, user.id)` wordt aangeroepen, dat rendert het beschikbaarheidsraster maar **geen meeting-creatie**.

1. **School begeleider creëert meeting** — er is **GEEN** functionaliteit in school-dashboard om een afspraak met een student te plannen. Een school kan alleen via match-dashboard.html (driegesprek-flow) een meeting initiëren. **MIDDEL** — feature gap, niet defect.
2. **Notificatie naar student** — n.v.t. (geen meeting-creatie in school-dashboard)
3. **Overzicht alle meetings** — niet aanwezig in school-dashboard. School kan zien welke matches actief zijn maar niet alle aankomende afspraken op één plek. **LAAG**.
4. **Visibility van company meetings** — n.v.t. (geen view aanwezig)

**B3 — BEVINDINGEN:**
- MIDDEL — School-dashboard heeft beschikbaarheidsraster (regel 2400) maar geen UI om een meeting te plannen. CLAUDE.md noemt dit als open issue ("school-dashboard.html: ontbreekt 'Plan driegesprek' per student").
- LAAG — geen meeting-overzichtsview voor alle gekoppelde studenten.

---

## CHECK B4 — KALENDER IN BEGELEIDER-DASHBOARD

**Locatie:** `begeleider-dashboard.html` regel 1180 — alleen `InternlyCalendar.render('ical-container', db, user.id)`.

1. **Begeleider eigen meeting-creatie** — niet aanwezig. Net als school-dashboard alleen het beschikbaarheidsraster.
2. **Beschikbaarheid grid** — wel aanwezig (regel 1180), opslag via `saveAll()` in calendar.js werkt.
3. **Begeleider zonder studenten** — `loadStudents()` regel 1165 laadt studenten; bij 0 studenten wordt het lijst leeg gerenderd. Niet getest of empty state nette messaging toont.

**B4 — BEVINDINGEN:**
- MIDDEL — Begeleider heeft beschikbaarheidsraster maar geen meeting-creatie UI.
- LAAG — Empty state voor "geen studenten" nog niet bevestigd.

---

## CHECK B5 — KALENDER IN INTERNATIONAL-STUDENT-DASHBOARD

**Locatie:** `international-student-dashboard.html` regel 969–984 (input fields), regel 1783–1903 (`submitLA()`).

1. **`la-end` < `la-start`** — `submitLA()` voert **GEEN** validatie uit op datum-volgorde (regel 1808–1824). Beide datums worden simpelweg geparsed en als `start_date`/`end_date` ingevoegd. **HOOG**.
2. **`la-hours` ≤ 0** — input heeft `min="1" max="60"` (regel 979), maar `submitLA()` regel 1816: `parseInt(... ,10) || null` — als `parseInt` 0 retourneert, valt het door naar `|| null` ✓ implicit. **PASS** voor 0, maar negatieve invoer (gebruiker met devtools) wordt niet geblokkeerd.
3. **`la-credits` ≤ 0** — input heeft `min="0" max="60"` (regel 983) — 0 is **toegestaan** (mogelijk gewenst voor unpaid). Geen JS-validatie. **PASS** maar functioneel ongeldig credits=0 wordt niet geblokkeerd.
4. **`la-start == la-end`** — niet gevalideerd. Stage van 0 dagen wordt geaccepteerd. **MIDDEL**.
5. **Validatie vóór insert** — `submitLA()` controleert profiel-volledigheid (regel 1786) en match-existence (regel 1794–1799), maar **GEEN** validatie van `la-start`, `la-end`, `la-hours`, `la-credits`, `la-supervisor-name`, `la-supervisor-email` — alle null toegestaan in payload. **HOOG**.

**B5 — BEVINDINGEN:**
- HOOG — `submitLA()` regel 1814–1815 — geen `la-end > la-start` check. Een student kan einddatum vóór startdatum indienen.
- HOOG — `submitLA()` regel 1808 — geen verplichte velden check. Een leeg LA kan worden ingediend.
- MIDDEL — `la-start == la-end` (zero-day stage) niet geblokkeerd.
- MIDDEL — negatieve hours/credits via devtools mogelijk.

---

## CHECK B6 — MEETINGS TABLE: ORPHAN PREVENTION

**Search:** geen `db.from('meetings').delete()` aanroepen in alle live html/js bestanden — alleen INSERT en UPDATE patronen aanwezig.

- `js/account.js:130` — account-deletion zet alleen `deletion_requested=true` + `deletion_requested_at` (vlag, geen daadwerkelijke purge)
- Match rejection (`match-dashboard.html:5205`) update meeting status naar `'afgewezen'` — meeting blijft bestaan maar is afgemarkeerd
- Geen ON DELETE CASCADE patroon zichtbaar in de SQL-comments van het project

**B6 — BEVINDINGEN:**
- MIDDEL — Bij accountverwijdering blijft `meetings.organizer_id` of `meetings.attendee_id` verwijzen naar een verwijderde gebruiker. Geen cleanup-routine. Vereist DB-cascade of cleanup edge function. **MIDDEL**.
- LAAG — Bij match-rejection wordt meeting niet opgeruimd, alleen status veranderd. Hangt orphans gedurende lange tijd (acceptabel als status='afgewezen' wordt gerespecteerd in queries).

---

═══════════════════════════════════════════════════════════
DEEL C — CHAT: GRONDIG EDGE CASE ONDERZOEK
═══════════════════════════════════════════════════════════

## CHECK C1 — CHAT: LEEG BERICHT GUARD

**Locatie:** `chat.html:1085-1158` (`sendMessage()`)

1. **Lege/whitespace bericht** — regel 1089-1090: `const content = input.value.trim(); if (!content) return;` ✓ **PASS** — trim verwijdert whitespace + newlines, dus alleen-newlines bericht wordt ook geblokkeerd.
2. **Alleen newlines** — `\n\n\n`.trim() = '' → `if (!content) return;` blokkeert. ✓ **PASS**
3. **Maximum berichtlengte** — geen `maxlength` attribuut op `#msgInput` (regel 518-523). Geen JS character-counter. Geen visuele indicator. **MIDDEL**.
4. **50.000 chars paste** — geen truncation, geen error. Wordt direct naar Supabase gestuurd. Postgres `text` veld accepteert tot ~1GB. UI wordt mogelijk traag. **MIDDEL**.

**C1 — BEVINDINGEN:**
- PASS — empty/whitespace check ✓ (regel 1089-1090)
- MIDDEL — geen max-length enforcement op chat-bericht
- LAAG — geen visuele character counter

---

## CHECK C2 — CHAT: SPECIALE TEKENS EN EMOJI

**Locatie:** `chat.html` — `appendMessage()` regel 652-688, `renderMessages()` regel 598-650.

1. **Emoji & multi-byte Unicode** — `escapeHtml()` (uit `js/utils.js`) escaped HTML entities maar werkt charwise via String operaties → standaard JS String werkt op UTF-16 code units, niet codepoints. `String.prototype.slice()` gebruikt op regel 622, 659 (`.slice(0,2)`) kan een emoji surrogate pair splitsen → kapotte chars. **MIDDEL**.
2. **RTL text (Arabisch/Hebreeuws)** — geen `dir="auto"` attribuut op `.bubble`. Bubbles tonen RTL-text in LTR-layout, leesbaar maar niet visueel correct. **LAAG**.
3. **Zero-width / unzichtbare Unicode** — `trim()` op regel 1089 verwijdert alleen ASCII whitespace en standaard Unicode whitespace, NIET zero-width characters (`​`, `﻿`). Een gebruiker kan een bericht met alleen `​​​` indienen → lijkt leeg, maar wordt opgeslagen. **MIDDEL**.
4. **URLs in berichten** — `escapeHtml(raw)` op regel 624, 661 escaped HTML maar maakt URLs **NIET klikbaar**. Pure tekst-rendering. **LAAG** (functionele beperking).

**C2 — BEVINDINGEN:**
- HOOG — geen zero-width filter in trim → ogenschijnlijk lege berichten kunnen worden ingediend (regel 1089).
- MIDDEL — `slice(0, 2)` op naam (regel 622, 659, 741) kan emoji surrogate pairs splitsen → garbage UI.
- LAAG — geen RTL-support, geen URL auto-link.

---

## CHECK C3 — CHAT: REALTIME VERBINDING VERLIES

**Locatie:** `chat.html` — `subscribeRealtime()` regel 1060-1081, `subscribeMeetingNotifications()` regel 775-799.

1. **Connection drop** — regel 1075-1080: `.subscribe((status, err) => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { notify('Verbinding verbroken — ververs de pagina om door te gaan', false); } })` — **GEEN auto-reconnect**, alleen melding ✓ user moet handmatig refreshen
2. **Visuele indicator** — alleen toast-melding bij CHANNEL_ERROR/TIMED_OUT. Geen persistente offline-banner. Op regel 564: `window.addEventListener('offline', () => notify('Geen internetverbinding — wijzigingen worden niet opgeslagen'))` — alleen op browser-offline event.
3. **Bericht verzonden offline** — `sendMessage()` regel 1115 voert insert uit; bij netwerkfout valt het in error-pad regel 1123-1144: pendingRow krijgt `data-status="failed"`, retry-knop wordt getoond, toast verschijnt ✓ **PASS**.
4. **Tab refocus** — geen `visibilitychange` listener om gemiste berichten te herladen. Realtime subscriptie zou herstarten maar berichten ontvangen tijdens tab-blur kunnen gemist worden bij timeout. **MIDDEL**.
5. **Unsubscribe op unload** — regel 1462-1465: `window.addEventListener('beforeunload', ...)` met unsubscribe op alle 3 channels ✓ **PASS**.

**C3 — BEVINDINGEN:**
- PASS — failed send geeft retry-knop ✓ (regel 1123-1144)
- PASS — beforeunload unsubscribes ✓ (regel 1462)
- MIDDEL — geen visibilitychange handler om gemiste berichten op te halen
- LAAG — geen auto-reconnect bij CHANNEL_ERROR; user moet refreshen

---

## CHECK C4 — CHAT: CONVERSATIE INITIALISATIE EDGE CASES

**Locatie:** `chat.html:982-1024` (init flow)

1. **Geen actieve match** — `chat.html` checkt aan het begin via URL-param `?match=`. Als geen `match=` param: valt door naar `loadAllConversations(userId)` regel 1162 → toont overzicht of empty state ✓ **PASS**.
2. **Conversation row bestaat niet** — regel 999-1006: als `conv` null, wordt nieuwe ingevoegd met `.insert({ match_id: mId })`. Bij faal: regel 1008-1012 toont "Gesprek kon niet worden geladen." melding ✓ **PASS**.
3. **Duplicate conversations** — `db.from('conversations').insert({ match_id: mId })` zonder upsert. Als twee tabs tegelijk openen: race condition → twee conversation rows voor dezelfde match. **MIDDEL** (mits geen UNIQUE constraint op `match_id` in DB).
4. **Brand new match, 0 messages** — `renderMessages()` regel 601-608 toont empty state met "Begin met een open vraag." ✓ **PASS**.

**C4 — BEVINDINGEN:**
- PASS — empty state ✓
- PASS — failed conv create toont nette melding
- MIDDEL — race condition kan duplicate conversations creëren bij twee tabs (regel 1000)

---

## CHECK C5 — CHAT: MEETING CARDS IN BERICHTEN

**Locatie:** `chat.html:692-729` (`renderMeetingCard()`)

1. **proposed_date null/undefined** — regel 700-702: `const nlDate = meeting.proposed_date ? new Date(meeting.proposed_date + 'T12:00:00').toLocaleDateString(...) : '';` ✓ **PASS** — null-veilig.
2. **contact_info empty** — regel 696: `const contactLine = meeting.contact_info ? ` · ${escapeHtml(meeting.contact_info)}` : '';` ✓ **PASS**.
3. **status onverwacht** — regel 715-718: ternaire op `meeting.status === 'bevestigd' ? ... : ...` — als status 'tegenbod' of 'geannuleerd' is, wordt het als "✕ Afgewezen" getoond. **MIDDEL** — onjuiste UI.
4. **Dubbele klik op accept/reject** — `acceptMeetingFromChat()` regel 801-836 en `declineMeetingFromChat()` regel 838-873: **GEEN** debounce/disabled state op de buttons. Een gebruiker kan tweemaal klikken voor de eerste UPDATE retourneert. De tweede update is idempotent (status blijft 'bevestigd'), maar de notificatie wordt **tweemaal** verstuurd. **MIDDEL**.
5. **Disabled state tijdens processing** — niet aanwezig.

**C5 — BEVINDINGEN:**
- PASS — null proposed_date en contact_info worden gehandeld
- MIDDEL — onverwachte statusvalues (tegenbod, geannuleerd) worden als "✕ Afgewezen" getoond
- MIDDEL — geen debounce op accept/reject knop → dubbele notificaties bij snelle klikken

---

## CHECK C6 — CHAT: BERICHTEN LADEN BIJ PAGINERING

**Locatie:** `chat.html:1026-1047` (`loadMessages()`)

1. **Pagination** — regel 1028-1032: `db.from('messages').select(...).eq('conversation_id', convId).order('created_at', { ascending: true })` — **GEEN limit, GEEN offset, GEEN range**. Alle messages worden in één query geladen.
2. **1000+ berichten** — Supabase default limit is 1000 rows zonder explicit `range()`. Een gesprek met 1500 berichten zou alleen de eerste 1000 ophalen, ouder of nieuwer afhankelijk van order. Met `ascending: true` → oudste 1000, nieuwste niet getoond. **HOOG** als gesprekken groot worden.
3. **Load more mechanism** — niet aanwezig.
4. **Sort order** — `ascending: true` → oudste eerst, nieuwste onderaan ✓ **PASS**.
5. **Scroll to bottom** — regel 649: `area.scrollTop = area.scrollHeight;` op render ✓ **PASS**. Op append (regel 687): idem ✓.

**C6 — BEVINDINGEN:**
- PASS — sort order correct (oldest first)
- PASS — scroll to bottom op render en append
- HOOG — geen pagination → bij >1000 berichten gaan recente messages verloren in UI
- MIDDEL — geen "load more" mechanism

---

## CHECK C7 — MIJN-BERICHTEN: OVERZICHTSPAGINA

**Locatie:** `mijn-berichten.html`

1. **Zero conversations** — `_emptyStateHtml()` regel 387-402 toont "Hier komen straks je gesprekken te staan." met CTAs naar discover/buddy ✓ **PASS**.
2. **Zero messages in conversation** — `_convCardHtml()` regel 362: `escapeHtml((conv._lastMsg || 'Nog geen berichten').slice(0, 60))` ✓ **PASS**.
3. **Unread count realtime** — geen subscriptie zichtbaar in dit bestand. Counts worden berekend op load en bij actie-handlers. Niet realtime. **MIDDEL**.
4. **Other party deleted** — regel 646: `_otherName: other.naam || 'Onbekend'` ✓ fallback works. Regel 361: `name = escapeHtml(conv._otherName || 'Onbekend')` ✓ **PASS**.
5. **Sort by most recent** — `_lastTime` field gebruikt — moet in load-functie gesorteerd worden. (Niet expliciet gecheckt op sort, maar standaard Supabase order is op created_at descending in conv loader.)

**C7 — BEVINDINGEN:**
- PASS — empty state present
- PASS — null naam fallback works ("Onbekend")
- PASS — null lastMsg fallback works
- MIDDEL — unread count is niet realtime → student zit op overview, andere tab krijgt nieuw bericht, count update pas op refresh

---

═══════════════════════════════════════════════════════════
DEEL D — PDF EXPORT: ALLE DASHBOARDS
═══════════════════════════════════════════════════════════

## CHECK D1 — PDF EXPORT: WELKE DASHBOARDS HEBBEN EEN EXPORT?

**Inventaris:**
| Bestand | Functie | Output |
|---|---|---|
| `bbl-hub.html:1932` | `exportBBLReflectieverslag()` | PDF — STARR-reflecties + leerdoelen |
| `match-dashboard.html:5653` | `exportPDF()` | PDF — Stage Hub overzicht (student/match/meetings/leerdoelen) |
| `match-dashboard.html:4040` | (separate jsPDF init) | tweede PDF-functie — vermoedelijk eindrapport per leerdoel |
| `js/esg-export.js:208` | `downloadPDF()` | opent `/esg-export.html` met sessionStorage |
| `js/esg-export.js:223` | `downloadCSV()` | CSV — ESG datapoints |
| `js/esg-inject.js:12` | auto-print on `/esg-export.html` | renders ESG dashboard met `window.print()` |
| `match-dashboard.html:5647` | CSV download `stageplan-${name}-${date}.csv` | CSV |
| `bbl-hub.html:1592` `exportIcal()` | `.ics` bestand | iCal voor agenda-import |

---

## CHECK D2 — PDF EXPORT: LEGE DATA SCENARIO

**`bbl-hub.html` `exportBBLReflectieverslag()`:**
- Regel 2039: `if (skills.length > 0) { sectionHeader('Leerdoelen'); ... }` — leerdoelen sectie wordt overgeslagen bij empty ✓
- Regel 2096-2102: `if (allEntries.length === 0) { ...doc.text('Geen zelfreflecties opgeslagen.', ...) }` ✓ **PASS**
- Geen loading state op de knop tijdens PDF-generatie. **MIDDEL**.

**`match-dashboard.html` `exportPDF()`:**
- Regel 5654-5657: fallback naar `window.print()` als jsPDF library niet geladen is ✓
- `match.student.name` op regel 5688, 5700 — als `match.student` null is → crash. Geen guard. **HOOG**.

**`js/esg-export.js`:**
- Regel 96-98: `gemRating = aantalBeoordelingen > 0 ? sum/n : 0` ✓ veilig bij empty
- Regel 127: `dp03: { score: company.trust_score ?? null }` ✓ null veilig
- Regel 182: `value: dp.dp03.score !== null ? dp.dp03.score.toFixed(1) : '—'` ✓ null guard
- **MAAR** regel 146: `dp04_avg: dp.dp04.count > 0 ? parseFloat(dp.dp04.avg.toFixed(2)) : null` — als avg = 0 (allemaal 0-ratings ofwel division-by-zero) → toFixed faalt niet, maar null wordt gestuurd. ✓
- Regel 208-219: `downloadPDF()` heeft GEEN loading state. **MIDDEL**.

**D2 — BEVINDINGEN:**
- HOOG — `match-dashboard.html:5688` `match.student.name` zonder null guard kan crashen op PDF export.
- MIDDEL — geen loading state op PDF-generatie knoppen (alle drie de exports).
- PASS — empty data scenarios worden correct gehandeld in BBL en ESG export.

---

## CHECK D3 — PDF EXPORT: SPECIALE TEKENS

**jsPDF default font is Helvetica** — dat is een **WinAnsi/Latin-1** font die NIET alle UTF-8 karakters ondersteunt. Speciale tekens zoals `é`, `ë`, `ü`, `ij` werken meestal (Latin-1), maar emoji, Cyrillisch, Hebreeuws, Chinees zullen renderen als kapotte vierkanten of niets.

**`bbl-hub.html` regel 2058:** `doc.text(skill, margin + 11, y + 4.5)` — als skill een emoji bevat (van een student-profiel) → kapot in PDF.

**HTML entities:**
- BBL PDF gebruikt `escapeHtml()` NIET op waarden voor jsPDF (omdat het geen HTML maar PDF is). `&amp;` zou letterlijk worden getoond als de waarde uit de DB ge-escaped is gekomen, of als raw `&` als de waarde raw is opgeslagen. Aanname: messages.content wordt raw opgeslagen → output is correct.

**Lange teksten:**
- `bbl-hub.html:2072,2151:` `doc.splitTextToSize(val, cW - 8)` — wraps automatisch ✓
- `match-dashboard.html` (PDF section): vermoedelijk idem
- BBL PDF gebruikt `check(7)` per regel (regel 2073) om naar nieuwe pagina te springen ✓

**D3 — BEVINDINGEN:**
- MIDDEL — emoji's en non-Latin1 karakters renderen kapot in jsPDF (gebruikt default Helvetica). Naam met "🎉" wordt als blank vakje getoond.
- PASS — long text wrapping en overflow naar nieuwe pagina werken correct.

---

## CHECK D4 — ESG EXPORT (bedrijf Business plan)

**Locatie:** `js/esg-export.js` (296 regels)

1. **Zero matches/data** — `fetchDatapoints()` regel 75-85: bij accepted.length === 0 wordt `studentIds` lookup overgeslagen. `niveauBreakdown` blijft 0 voor alle niveaus. ✓ **PASS**
2. **`trust_score` null** — regel 127: `dp03: { score: company.trust_score ?? null }` ✓ **PASS** — geen crash.
3. **VSME data points null guards:**
   - DP01: `total: accepted.length` — array, nooit null ✓
   - DP02: `responsRatio = totaalSollicitaties > 0 ? ... : 0` ✓
   - DP03: `score: company.trust_score ?? null` ✓
   - DP04: `gemRating = aantalBeoordelingen > 0 ? ... : 0` ✓
   - DP05: filter calls op array (nooit null) ✓
   - DP06: `[...new Set(allTags)].filter(Boolean)` ✓
   Alle zes zijn null-veilig. **PASS**
4. **Filename PII** — regel 266: `internly-esg-${dp.year}-${today}.csv` — bevat **GEEN** PII ✓ **PASS**. Wel: `dp.companyNaam` wordt opgeslagen in de CSV (regel 231), wat verwacht is voor een ESG rapport.
5. **Server-side opslag** — regel 152: `db.from('esg_exports').insert(row)` — DP01-DP06 metrics worden in de database opgeslagen voor audittrail. Geen PII in de geschreven row buiten company_profile_id. ✓ **PASS**.

**D4 — BEVINDINGEN:**
- PASS — alle 6 VSME datapoints zijn null-guarded
- PASS — geen PII in filename
- PASS — server-side log heeft geen sensitive data
- LAAG — geen indicator dat een PDF-export ook een DB-write doet (`saveExport` op regel 152). User verwacht client-only export, maar er wordt wel een audit-rij geschreven.

---

## CHECK D5 — STAGEVERSLAG / EINDVERSLAG

**Inventaris:**
- `bbl-hub.html:77` — comment "Sprint-restrictie: eindverslag-flow + 90-dagen alert NIET aanraken" — flow is **niet geïmplementeerd**, alleen een placeholder/sprint-comment.
- `match-dashboard.html:81` — comment "eindverslag-flow + jspdf PDF-export NIET aanraken" — idem niet geïmplementeerd.
- Geen `eindverslag*` bestanden of UI-elementen aanwezig.

**Wat WEL aanwezig is:**
- BBL `exportBBLReflectieverslag()` — kan als BBL-eindverslag fungeren (alle reflecties + leerdoelen)
- match-dashboard `exportPDF()` — Stage Hub overzicht
- "stageverslag"-as-label gevonden in stagebegeleiding.html, maar dat is niet een document-flow.

**D5 — BEVINDINGEN:**
- LAAG — eindverslag-flow staat in HANDOVER.md backlog en is **niet bereikbaar** (geen UI-knop, geen route). Geen broken state. Comment in code documenteert dit als open backlog item.

---

═══════════════════════════════════════════════════════════
DEEL E — INPUT EDGE CASES: PER FORMULIER
═══════════════════════════════════════════════════════════

## CHECK E1 — DATUM INVOER EDGE CASES

**Geïnventariseerde date inputs (live bestanden, geen BACKUP):**
| ID | Bestand | Min/Max | Validatie? |
|---|---|---|---|
| `contract_start` | bbl-profile.html:373 | geen | nvt |
| `contract_end` | bbl-profile.html:377 | geen | nvt |
| `beschikbaar_vanaf` | bol-profile.html:548, student-profile.html:851 | geen | nvt |
| `f-start` | company-dashboard.html:842 | geen | nvt |
| `la-start` | international-student-dashboard.html:969 | geen | geen (cf B5) |
| `la-end` | international-student-dashboard.html:973 | geen | geen (cf B5) |
| `m-task-deadline` | match-dashboard.html:3692 | geen | nvt |
| `m-dl-date` | match-dashboard.html:3782 | geen | nvt |
| `m-r-date` | match-dashboard.html:3903 | geen | nvt |
| `cf-date-${id}` (counter proposal) | match-dashboard.html:4965 | geen | nvt |
| `mf-date` (calendar.js) | js/calendar.js:262 | `min={today}` | client-only |

1. **1 januari 1900** — alle date inputs zonder min accepteren dit. Geen JS-validatie. **MIDDEL** voor `contract_start`, `f-start`, `beschikbaar_vanaf` (kan stagedeadline 1900 opslaan).
2. **31 december 2099** — geen max, alle accepteren dit. **LAAG**.
3. **`contract_end` < `contract_start`** — `bbl-profile.html` heeft geen JS-validatie. **HOOG**.
4. **`beschikbaar_vanaf` in verleden** — geen guard. Een student kan beschikbaarheid op 2020-01-01 zetten → matching kan onverwacht gedrag vertonen. Mogelijk gewenst (al beschikbaar). **LAAG**.
5. **Cross-field date comparisons** — niet aanwezig in `bbl-profile.html` voor contract dates, niet aanwezig in `international-student-dashboard.html` voor LA dates. **HOOG**.

**E1 — BEVINDINGEN:**
- HOOG — `bbl-profile.html:373,377` `contract_end < contract_start` zonder validatie
- HOOG — `international-student-dashboard.html:969,973` (cf CHECK B5)
- MIDDEL — meerdere date fields zonder min/max kunnen 1900-of-2099 datums accepteren

---

## CHECK E2 — NUMMER INVOER EDGE CASES

**Inventaris number inputs (live bestanden):**

| ID | Bestand | min | max | Server validatie? |
|---|---|---|---|---|
| `ts-${profile_id}` (admin trust) | admin.html:514 | 0 | 100 | JS check (regel 531) ✓ |
| `f-responsedays` | company-dashboard.html:899 | 1 | 14 | nvt |
| `uren_per_week` | bbl-profile.html:383 | 1 | 40 | nvt |
| `bp-leeftijd` (buddy age) | buddy-dashboard.html:411 | 18 | 120 | nvt |
| `la-hours` | international-student-dashboard.html:979 | 1 | 60 | nvt |
| `la-credits` | international-student-dashboard.html:983 | 0 | 60 | nvt |
| `la-amount` | international-student-dashboard.html:1001 | 0 | (geen) | nvt |

1. **Min/max attributen** — meeste velden hebben min/max gezet ✓ behalve `la-amount` (geen max — kan 999999999 zijn).
2. **Negatieve waarden** — HTML5 `min` blokkeert in browser, MAAR via devtools is alles mogelijk. Geen JS-checks behalve admin trust score.
3. **Decimale waarden** — `parseInt(...,10)` op alle int fields. Een gebruiker die "1.7" typt → parseInt geeft 1 (afronden naar beneden). Functioneel ok maar geen feedback. **LAAG**.
4. **Extreem grote waarden** — `la-amount` accepteert 999999999. Postgres int overflow kan optreden bij waarden >2147483647 als kolom int4 is. **MIDDEL**.
5. **Admin trust score** — `admin.html:531` `if (isNaN(val) || val < 0 || val > 100)` ✓ **PASS**.

**E2 — BEVINDINGEN:**
- MIDDEL — `la-amount` heeft geen max → potentiële int overflow in DB
- LAAG — geen feedback op decimal input
- LAAG — devtools kan negatieve waarden indienen op alle number fields behalve admin
- PASS — admin trust score 0-100 enforce in JS

---

## CHECK E3 — TAG INPUTS EDGE CASES

**Inventaris:**
- `tagsInput` (company-dashboard.html:863) — `maxlength="30"` per tag, max 8 tags (`tags.length >= 8`)
- `intlLangsInput` (company-dashboard.html:980) — `maxlength="20"` per tag
- `skillsInput` (bol-profile.html:560) — `maxlength="30"`
- `buddy-lang-input` (buddy-dashboard.html:444) — `maxlength="20"`
- `oTagsInput` (school-dashboard.html:842) — `maxlength="30"`

**Pattern (company-dashboard.html:1494-1517):**
```js
addTag(this.value.trim().replace(/,/g, ''));
function addTag(s) {
  if (tags.length >= 8 || tags.includes(s) || !s) return;
  ...
}
```

1. **Maximum tag count** — `tags.length >= 8` enforced ✓ in `tagsInput`. Andere implementaties: niet zeker.
2. **Maximum length per tag** — `maxlength` HTML attribuut ✓ all set
3. **Whitespace-only tags** — `.trim()` + `if (!s) return` blokkeert ✓
4. **Duplicate tags** — `tags.includes(s)` blokkeert ✓
5. **Comma in tag** — `.replace(/,/g, '')` strips comma's vóór toevoegen ✓
6. **Emoji-only tags** — geen blokkering. Een tag van puur "😀" wordt toegevoegd. **LAAG** (functioneel verdedigbaar).
7. **Trim** — gebeurt op input maar niet expliciet op opslag — als `tags` array geserialiseerd wordt naar DB, is `s` al getrimd ✓

**E3 — BEVINDINGEN:**
- PASS — company-dashboard tags hebben max count, dedup, comma-strip
- LAAG — emoji-only tags worden geaccepteerd (niet expliciet probleem)
- Niet alle tag-inputs hebben dezelfde guards — `oTagsInput`, `intlLangsInput`, `skillsInput`, `buddy-lang-input` hebben mogelijk geen identieke handler. **MIDDEL** — 7/11 violation: tagInput is op verschillende plekken anders geïmplementeerd. (Zie CLAUDE.md regel 33-35: "Als een tweede bestand hetzelfde concept implementeert als een eerste: definieer eerst een gedeeld contract".)

---

## CHECK E4 — SELECT/DROPDOWN EDGE CASES

**Inventaris en analyse:**

1. **`f-vestiging`** (company-dashboard.html:849):
   - `populateVestigingSelector()` regel 2946-2953: behoudt de eerste option (default), voegt vestigingen toe.
   - Bij 0 vestigingen → alleen default option zichtbaar.
   - `vestiging_id` op regel 2134: `document.getElementById('f-vestiging')?.value || null` — bij empty default value: null wordt gepost ✓
   - **Geen guard** — een bedrijf kan een vacature posten zonder vestiging te selecteren. Of dat erg is hangt af van DB-validatie. **MIDDEL** — kan resulteren in vacature zonder locatie.
2. **`m-to`** (match-dashboard.html:5314): `<option value="">— Kies ontvanger —</option>`. `nextStep()` regel 5356 valideert `if (!to || !subject || !contact)` ✓ **PASS**.
3. **`student-switcher`** (match-dashboard.html:1968 in BACKUP, vergelijkbaar in live): voor school die wisselt tussen studenten. Niet interactief problematisch.
4. **`visa-status-select`, `housing-status-select`** (international-student-dashboard.html): niet zichtbaar of validatie heeft. Dynamic dropdown maar afgeleid van profile data.
5. **`domeinFilter`, `sectorFilter`** (discover.html, company-discover.html): filters voor visualisatie, lege selectie = "alle". OK ✓

**E4 — BEVINDINGEN:**
- MIDDEL — `f-vestiging` (company-dashboard.html:849) accepteert empty default value → vacature zonder vestiging. Geen JS-guard.
- PASS — `m-to` (match-dashboard.html:5314) heeft validatie

---

## CHECK E5 — FORMULIER SUBMIT TIJDENS LADEN

1. **`doRegister`** (auth.html:904) — regel 933 `btn.disabled = true;` → Supabase signUp → regel 943 `btn.disabled = false;` na response. Re-enable in **happy en error path** ✓ **PASS** (re-enable staat NIET in finally maar wel direct na de await — dus ook bij error werkt het).
2. **`doLogin`** (auth.html:778) — regel 789 `if (btn.disabled) return;` als al verzonden → regel 791 disable, regel 796 re-enable. Pattern correct ✓ **PASS**.
3. **Company vacancy form** — niet expliciet gechecked, maar `_vestigingen.forEach` toevoegen lijkt geen disable-knop te hebben in `addVestiging()`. Niet kritiek voor double-submit.
4. **Review submission in mijn-sollicitaties** — niet gecheckt expliciet. Aanname: zelfde patroon als auth.
5. **Meeting forms** — `js/calendar.js:334-388` heeft `_isSavingMeeting` flag + `btn.disabled = true` ✓. `match-dashboard.html:5429` heeft `window._isSavingMeeting` flag ✓. `bbl-hub.html:1520` heeft `window._isCreatingMeeting` flag ✓.

**E5 — BEVINDINGEN:**
- PASS — auth flows hebben double-submit guard (auth.html:791, 933)
- PASS — meeting creatie heeft flag-based guard
- LAAG — review en company vacancy submit niet expliciet gecheckt op double-submission

---

## CHECK E6 — URL PARAMETER INJECTION

**Inventaris:**

1. **`auth.html:645`** — `_initParams = new URLSearchParams(window.location.search)`. Direct daarna (regel 646-648) wordt URL leeggemaakt om te voorkomen dat Google Translate URL logt ✓ comment "?role= is uitsluitend een UI-hint, nooit voor authenticatie-beslissingen" ✓ **PASS**.
2. **`vacature-detail.html:995-1004`** — `id` en `source` worden gelezen, source wordt gevalideerd tegen whitelist `['internships', 'internship_postings']` (regel 999). `id` wordt direct in Supabase query gebruikt regel 1009 `db.from(source).select(selectCols).eq('id', id)` — Supabase eq() escaped automatisch ✓ **PASS**.
3. **`match-dashboard.html:2136`** — `MATCH_ID` direct uit URL. Wordt vermoedelijk gebruikt in queries; Supabase eq() escaped ✓.
4. **`chat.html:1425`** — `params.get('match')` of `params.get('buddy_pair_id')`, gebruikt in queries.
5. **`la-sign.html:366`** — `token` parameter, gebruikt om signing flow te starten. Validatie via DB lookup.
6. **`pricing.html:661`** — `for` parameter; subscription-flow.

**innerHTML rendering van URL params:**
- Geen direct `innerHTML` gevonden waar URL-param zonder escape wordt geïnsererd. Alle inserts gaan via Supabase eq() of escapeHtml().

**E6 — BEVINDINGEN:**
- PASS — `vacature-detail.html` valideert `source` tegen whitelist
- PASS — `auth.html` gebruikt URL params alleen als UI-hint, niet voor auth-beslissingen
- LAAG — geen unescaped innerHTML met URL param geïdentificeerd
- LAAG — Supabase eq() biedt automatic SQL injection prevention

---

## CHECK E7 — FORMULIER RESET NA SUBMIT

**Voorbeelden:**
1. **Review form** — `review-form.html` — niet expliciet gechecked maar standard pattern is geconfirmeerd via auth.
2. **Chat send** — `chat.html:1095`: `input.value = '';` direct na trim ✓ **PASS** (cleared vóór async insert).
3. **Meeting form** — `js/calendar.js:378` `closeModal()` na success ✓ **PASS** (modal sluit, state reset bij her-opening).
4. **Company profile save** — `addVestiging()` regel 2971-2973 wist velden na success: `['vest-naam','vest-stad','vest-postcode','vest-adres'].forEach(id => { ...el.value = ''; })` ✓ **PASS**.
5. **Failed submit** — `chat.html:1132`: `input.value = filtered;` herstelt input bij faal ✓ **PASS**. `auth.html:943`: button re-enable, geen velden cleared (correct gedrag bij faal) ✓.

**E7 — BEVINDINGEN:**
- PASS — chat textarea clears immediately, restores on failure
- PASS — vestiging form clears on success
- PASS — auth retains values on failure

---

═══════════════════════════════════════════════════════════
DEEL F — INPUT EDGE CASES: GLOBAAL
═══════════════════════════════════════════════════════════

## CHECK F1 — KOPIEER-PLAK EN AUTOFILL GEDRAG

**`autocomplete` audit (live bestanden):**
- `auth.html:496,500` — login fields gebruiken `email` en `current-password` ✓ correct
- `auth.html:518,523` — register fields gebruiken `email` en `new-password` ✓ correct
- `bbl-profile.html:316` — `naam` gebruikt `autocomplete="name"` ✓ correct
- `begeleider-dashboard.html:1194`, `school-dashboard.html:2420`, `mijn-berichten.html:277` — search inputs gebruiken `autocomplete="off"` ✓ correct
- `review-form.html:200` — review title `autocomplete="off"` ✓ correct (geen behoefte aan history)

**F1 — BEVINDINGEN:**
- PASS — autocomplete attributen zijn correct gezet op alle live formulieren
- LAAG — geen incorrecte autocomplete op password fields gevonden

---

## CHECK F2 — MOBIEL TOETSENBORD TYPE

**Search:** geen `inputmode` attribuut gebruikt in live bestanden.

- `type="email"` op email-velden (auth.html, about.html, index.html) ✓ shows email keyboard
- `type="number"` velden (bp-leeftijd, uren_per_week, la-hours, ts-) toont numeric keyboard automatisch ✓
- Voor postcode (Nederlands formaat 1234AB): `type="text"` zonder `inputmode="numeric"` — toont volledig toetsenbord. Aan te raden: `inputmode="text"` met `pattern="[0-9]{4}\s?[A-Za-z]{2}"`. **LAAG**.

**F2 — BEVINDINGEN:**
- PASS — `type="email"` en `type="number"` triggeren correct toetsenbord
- LAAG — geen `inputmode` op postcode/telefoon fields → suboptimale mobile UX

---

## CHECK F3 — COPY-PASTE XSS IN CHAT

**Locatie:** `chat.html`

1. **Input → DB**: `sendMessage()` regel 1115 stuurt `filtered` (na profanity filter) als `content` zonder escape naar Supabase. **Stored as raw text** in `messages.content`. ✓
2. **DB → Display**: 
   - `renderMessages()` regel 624: `text = escapeHtml(raw).replace(/\bbobba\b/g, ...)` ✓ escape vóór render
   - `appendMessage()` regel 661: `text = escapeHtml(raw)...` daarna **ook** `escapeHtml(text)` op regel 683 — dat is **DUBBELE escape**! Een bericht met `<` wordt: ronde 1 → `&lt;`, ronde 2 → `&amp;lt;` → user ziet `&lt;` letterlijk. **MIDDEL — BUG**.
3. **Re-render**: bij refresh wordt de raw content uit DB opnieuw escape'd ✓ niet dubbel.

**F3 — BEVINDINGEN:**
- **MIDDEL — BUG** — `chat.html:683` past dubbele escape toe op nieuw verzonden berichten. Een gebruiker die `<3` typt, ziet `&lt;3` na verzending tot refresh, dan correct.
- PASS — DB stores raw, display escaped (correct strategy)

---

## CHECK F4 — WAITLIST EMAIL DUPLICATEN

**Inventaris waitlist insert points (live):**
- `about.html:1000, 1050` (twee static signups)
- `auth.html:1067`
- `bol-profile.html:1606`
- `discover.html:1563`
- `student-profile.html:1903`
- `vacature-detail.html:1184`
- `buddy-dashboard.html:735, 977`

**Pattern check (about.html:998-1018):**
- Regel 1006: `if (error.code === '23505')` — duplicate email gehandeld als success (toont success state) ✓ **PASS**
- Regel 1035: `email = ...value.trim()` ✓ trim wordt gedaan
- **Geen `.toLowerCase()`** op email — `User@example.com` en `user@example.com` worden als verschillende emails opgeslagen → duplicates mogelijk vanuit verschillende casing. **MIDDEL**.
- Pattern is **gedupliceerd** tussen 7 bestanden. Bij elke verandering: 7 plekken aanpassen. **MIDDEL** (7/11 violation).

**F4 — BEVINDINGEN:**
- PASS — 23505 wordt herkend en gracieus afgehandeld in about.html
- MIDDEL — geen lowercase normalization → duplicates mogelijk via casing
- MIDDEL — patroon is in 7 bestanden gedupliceerd in plaats van shared utility

---

## CHECK F5 — TEKENTELLER CONSISTENTIE

**Inventaris:**
- `bol-profile.html:879` definieert `charCount(inputId, countId, max)` lokaal
- `student-profile.html:1182` definieert dezelfde functie lokaal
- Beide implementaties zijn vermoedelijk identiek maar gedupliceerd

**Pattern (bol-profile.html:879-884):**
```js
function charCount(inputId, countId, max) {
  const len = document.getElementById(inputId).value.length;
  const el  = document.getElementById(countId);
  el.textContent = `${len} / ${max}`;
  el.className   = 'char-count' + (len > max * .9 ? ' warn' : '');
}
```

1. **Counter accuraat** — gebruikt `.value.length` ✓
2. **Copy-paste** — `oninput=` event triggert ook bij paste ✓ **PASS**
3. **Limit reached** — `maxlength="300"` HTML attribuut blokkeert verdere input via toetsenbord. Counter alleen visueel.
4. **Server-side maxlength** — niet zeker (DB constraint niet gecheckt). Aanname: dezelfde limiet als HTML.
5. **7/11 violation** — `charCount()` is in `bol-profile.html` en `student-profile.html` gedupliceerd. Niet in `js/utils.js`. **MIDDEL** — schending bouwregel 3 in CLAUDE.md.

**F5 — BEVINDINGEN:**
- PASS — counter is accuraat, paste werkt
- PASS — HTML maxlength geforceerd
- MIDDEL — `charCount()` is gedupliceerd in twee bestanden in plaats van utils.js (7/11 violation)

---

═══════════════════════════════════════════════════════════
DEEL G — SPECIFIEKE GEBRUIKERSSTROOM CHECKS
═══════════════════════════════════════════════════════════

## CHECK G1 — STUDENT ZONDER PROFIEL

**`discover.html:1395-1407`:**
- Regel 1397-1401: query op `student_profiles` met `naam, opleiding, ...`
- Regel 1407: `if (!sp || !sp.naam) { window.location.replace('student-profile.html'); return; }` ✓ **PASS**

**`match-dashboard.html`:**
- Regel 2790: `student_profiles.select('naam, opleiding, jaar')` — gebruikt voor display, geen guard.
- **Geen onboarding-guard zoals discover.html** — een student zonder profiel kan match-dashboard rechtstreeks aanroepen via URL en gegevens van een match laden.

**`chat.html:1418`:** `requireRole('student', 'bedrijf', 'school')` — alleen role guard, geen profile guard.

**G1 — BEVINDINGEN:**
- PASS — `discover.html` redirect naar profiel-setup als profile ontbreekt
- HOOG — `match-dashboard.html` heeft GEEN onboarding-guard — een student zonder profile kan rechtstreeks `match-dashboard.html?match=ID` openen
- HOOG — `chat.html` heeft GEEN profile-guard — student zonder profile kan rechtstreeks chat openen

---

## CHECK G2 — BEDRIJF ZONDER VESTIGING

**`company-dashboard.html`:**
- Regel 2946-2953: `populateVestigingSelector()` voegt opties toe aan `f-vestiging`. Bij 0 vestigingen: alleen default option.
- Regel 2134: `vestiging_id: document.getElementById('f-vestiging')?.value || null` — `null` wordt opgeslagen ✓
- **Geen guard** voorkomt dat een vacature geplaatst wordt zonder vestiging.

**G2 — BEVINDINGEN:**
- MIDDEL — bedrijf kan vacature plaatsen zonder vestiging (zie ook CHECK E4)
- LAAG — UI toont geen waarschuwing dat vestiging ontbreekt

---

## CHECK G3 — MATCH LIFECYCLE EDGE CASES

**`isApplying()`** — `js/utils.js:208-217` — sessionStorage flag, voorkomt **alleen tijdens dezelfde sessie** dat een student tweemaal solliciteert. Reset bij logout. Niet bestand tegen multiple browsers/tabs.

1. **Student met accepted match solliciteert opnieuw** — `vacature-detail.html:854` checkt `isApplying()` (in-flight). Daarnaast regel 896-899: `db.from('applications').select('id').eq('student_id', user.id).eq('posting_id', v.id)` checkt **DUPLICATE op dezelfde posting**. Maar **niet** of student al een accepted match elsewhere heeft. **MIDDEL** — student kan parallel solliciteren op meerdere vacatures.
2. **Bedrijf accept twice** — niet expliciet gechecked. Aanname: idempotent UPDATE.
3. **Vacature paused tijdens accepted match** — geen check zichtbaar. Geaccepteerde match blijft bestaan, posting wordt status='paused'. UX: student ziet match in match-dashboard, kan hem niet meer in discover vinden.
4. **Rejected match access** — `match-dashboard.html` heeft geen guard op match.status. Een student kan ?match=ID openen waar status='rejected' → toont gegevens. **MIDDEL**.

**G3 — BEVINDINGEN:**
- PASS — duplicate check op zelfde posting (vacature-detail.html:896-899)
- MIDDEL — geen check op "student has already accepted match" voorafgaand aan nieuwe sollicitatie
- MIDDEL — rejected/cancelled matches zijn nog toegankelijk via URL

---

## CHECK G4 — BUDDY SYSTEEM EDGE CASES

**`js/buddy.js:270-286`:**
- Guard: `db.from('buddy_requests').select('id')...in('status', ['pending', 'accepted']).limit(1).maybeSingle()` ✓ duplicate check ✓ **PASS**

1. **Buddy zonder kennisgebieden** — geen blokkering om gevonden te worden. Buddy verschijnt in resultaten zonder kennisgebieden filter. **LAAG**.
2. **Multiple buddy requests** — `js/buddy.js:271-286` blokkeert duplicates ✓ **PASS**
3. **Empty state buddy** — niet expliciet gechecked in dashboard. Aanname: lijst is leeg.
4. **Account-deletion van buddy_pair partij** — geen cleanup zichtbaar. Bij `account.js` `deletion_requested=true` blijft buddy_pair bestaan.

**G4 — BEVINDINGEN:**
- PASS — duplicate buddy request guard (js/buddy.js:271-286)
- LAAG — buddy zonder kennisgebieden is niet uitgesloten van resultaten
- MIDDEL — buddy_pair orphan als één van de partijen account verwijdert

---

## CHECK G5 — ADMIN FLOW EDGE CASES

**`admin.html:528-543` (`saveTrustOverride()`):**
1. **Trust score buiten 0-100** — regel 531: `if (isNaN(val) || val < 0 || val > 100) { notify('Voer een getal in tussen 0 en 100'); return; }` ✓ **PASS**
2. **Approve bundeling voor verwijderde school** — niet expliciet gechecked. Aanname: SELECT zou null retourneren en update zou geen rows raken.
3. **Pagination admin user list** — `loadTrustOverrides()` regel 487-488: `.order('trust_score', { ascending: false, nullsFirst: false })` zonder `range()` of `limit()`. Supabase default 1000 rows. Bij 1000+ companies: niet alle zichtbaar. **MIDDEL**.
4. **Unflag review** — niet expliciet gechecked.

**G5 — BEVINDINGEN:**
- PASS — trust score 0-100 enforce
- MIDDEL — admin user list zonder pagination → bij 1000+ rijen onvolledig

---

═══════════════════════════════════════════════════════════
DEEL H — DEPLOYMENT-SPECIFIEKE CHECKS
═══════════════════════════════════════════════════════════

## CHECK H1 — BESTANDSGROOTTES

**Top 10 HTML (live, root):**
| Bestand | Bytes |
|---|---|
| match-dashboard.html | 262.564 (256 KB) |
| company-dashboard.html | 141.793 (138 KB) |
| bbl-hub.html | 128.419 (125 KB) |
| internly_simulator.html | 114.327 |
| school-dashboard.html | 108.222 |
| international-student-dashboard.html | 86.271 |
| student-profile.html | 81.574 |
| chat.html | 76.634 |
| bol-profile.html | 75.348 |
| index.html | 66.982 |

**JS files (top 5):**
| Bestand | Bytes |
|---|---|
| buddy.js | 26.482 |
| utils.js | 25.898 |
| telemetry.js | 25.325 |
| calendar.js | 24.832 |
| account.js | 18.935 |

**H1 — BEVINDINGEN:**
- LAAG — geen HTML over 500KB (largest 256KB)
- LAAG — geen JS over 200KB (largest 26KB)
- PASS — file sizes binnen redelijk grenzen voor unminified vanilla stack
- LAAG — `match-dashboard.html` op 256KB is grootste bestand; mobile parse-time vermoedelijk acceptabel maar suboptimaal

---

## CHECK H2 — SUPABASE PROJECT REF IN CODE

**Bestanden met `qoxgbkbnjsycodcqqmft` (live):**
- `js/supabase.js` ✓ verwacht
- `js/telemetry.js` — verwacht (heeft eigen Supabase client init voor telemetry)
- `pricing.html` ❌ **HOOG**
- `index.html:1955, 2026` ❌ **HOOG** — twee plekken (waitlist signup met inline ref)
- `about.html:995` (eerder gezien) ❌ **HOOG** — inline supabase client in waitlist signup

**H2 — BEVINDINGEN:**
- HOOG — `pricing.html`, `index.html:1955,2026`, `about.html:995, 1046` bevatten hardcoded Supabase URL en anon key. Dit dupliceert het pattern uit supabase.js zonder reden. Bevestigd open backlog item in CLAUDE.md ("about.html + index.html: inline SUPABASE_URL opruimen").

---

## CHECK H3 — CONSOLE.LOG IN PRODUCTIE

**Top 10 verbose console-files (`console.(log|error|warn|info|debug)`):**
| Bestand | Count |
|---|---|
| company-dashboard.html | 26 |
| international-student-dashboard.html | 22 |
| bbl-hub.html | 18 |
| auth.html | 15 |
| match-dashboard.html | 12 |
| buddy-dashboard.html | 12 |
| international-school-dashboard.html | 11 |
| chat.html | 10 |
| admin.html | 7 |
| school-dashboard.html | 7 |
| bol-profile.html | 6 |

Most calls are `console.error` / `console.warn` (zoals zichtbaar in eerdere code-reads), legitiem voor productie. Echter ook `console.log` aanwezig in match-dashboard, bbl-hub.

**H3 — BEVINDINGEN:**
- LAAG — geen `console.log` met user PII / tokens gespotteerd in code-samples (alle gezien zijn `error.message` of generic strings)
- LAAG — debug logs in productie. Niet kritiek, maar hygiene-issue voor v1.

---

## CHECK H4 — ONAFGEMAAKTE FEATURES MET UI

**Search:** geen "coming soon" of "binnenkort" tekst in **live** bestanden gevonden (alleen in BACKUP en _revamp_2026-04-29 die uitgesloten zijn).

**Bekende incomplete features uit CLAUDE.md:**
- `company-dashboard.html:2302-2303` — ESG-export PDF/CSV labels "beschikbaar vanaf week 9" — ✓ feitelijk al gerealiseerd via `js/esg-export.js`. Stub-comment is verouderd.
- `pricing.html` `startCheckout()` — Mollie niet actief (stub)

**H4 — BEVINDINGEN:**
- LAAG — `pricing.html` `startCheckout()` is stub maar UI is zichtbaar. Mollie integratie open. Open backlog item.
- PASS — geen "coming soon" UI in live bestanden

---

## CHECK H5 — BROKEN IMAGES

**Search:** geen `<img src=` tags gevonden in live HTML bestanden. De codebase gebruikt **emoji + SVG** voor alle iconografie. Geen broken-image risico.

**H5 — BEVINDINGEN:**
- PASS — geen `<img>` tags gebruikt; emoji+SVG alleen

---

═══════════════════════════════════════════════════════════
DEEL I — EINDRAPPORTAGE DEEL 3
═══════════════════════════════════════════════════════════

## DEPLOYMENT BESLISSING — DEEL 3

**Telling alle bevindingen:**
- BLOCKER: 0
- HOOG: 11
- MIDDEL: ~38
- LAAG: ~22
- PASS: ~50

---

## TOP 5 MEEST KRITIEKE BEVINDINGEN DEEL 3

1. **`match-dashboard.html:5376`** — date input in meeting modal heeft GEEN `min` attribuut → past-date afspraak indienbaar. (HOOG · klein — voeg `min="${today}"` attribuut toe)
2. **`international-student-dashboard.html:1808-1815`** — `submitLA()` valideert NIET `la-end > la-start`, NIET verplichte velden, NIET `la-start != la-end`. Een student kan een Learning Agreement met einddatum 1 januari en startdatum 31 december indienen, of leeg LA. (HOOG · klein — voeg validatie toe vóór insert)
3. **`chat.html:1026-1032`** — `loadMessages()` heeft geen pagination/limit. Bij >1000 berichten in een gesprek gaan recente berichten verloren door Supabase default limit. (HOOG · middel — vervang door range-based pagination + load-more)
4. **`match-dashboard.html:5688`** — `match.student.name` zonder null guard in PDF export. Crasht voor matches zonder student-profiel. (HOOG · klein — voeg `match?.student?.name || 'Onbekend'` fallback)
5. **`index.html:1955,2026` en `about.html:995,1046`, `pricing.html`** — hardcoded Supabase project ref en anon key in HTML. Schendt 7/11 principe en bemoeilijkt key-rotatie. (HOOG · middel — vervang door delegatie naar `js/supabase.js`)

---

## GECOMBINEERDE STATUS — ALLE DRIE DELEN

Raadpleeg ook PREDEPLOY_AUDIT_2026-04-30.md (deel 1)
en PREDEPLOY_AUDIT_PART2_2026-04-30.md (deel 2).
Deployment is alleen GROEN als alle drie rapporten 
samen 0 BLOCKERS tonen.

---

## KALENDER SAMENVATTING

De kalender heeft een goede architectuurbasis: `js/calendar.js` is de canonieke implementatie en wordt door alle dashboards gedeeld. Beschikbaarheid (availability) heeft geen edge-case issues — discrete uurslots voorkomen invalid time-ranges. Het meeting-systeem heeft echter inconsistenties: drie verschillende `submitMeeting`-implementaties (calendar.js, match-dashboard, bbl-hub) met verschillende validatie. Alleen bbl-hub heeft een past-date check; match-dashboard heeft NIET eens een `min` attribuut. De kalender is niet productierijp zonder het invoegen van past-date guards in match-dashboard's meeting modal en zonder het toevoegen van overlap-detectie. School- en begeleider-dashboards missen UI om meetings te plannen. International-student LA-flow is fundamenteel onveilig (geen datum/value validatie). Meest urgent: B1, B5, A3.

---

## CHAT SAMENVATTING

De chat is in goede staat voor livetest met enkele middel-prioriteit issues. Empty-message guards werken via `.trim()` maar dekken zero-width characters niet (HOOG). Realtime-subscriptie heeft beforeunload cleanup ✓ maar geen auto-reconnect en geen visibilitychange-handler. Pagination ontbreekt geheel — bij >1000 berichten gaat data verloren (HOOG). Meeting-cards in chat hebben geen debounce op accept/reject knoppen, waardoor dubbele notificaties mogelijk zijn. Een dubbele-escape bug op `appendMessage()` regel 683 produceert tijdelijk gemankeerde HTML entities. Voor livetest acceptabel; voor productie issues op pagination en zero-width fixen. Kritieke issues: C2 (zero-width), C6 (pagination), F3 (dubbele escape).

---

## PDF EXPORT SAMENVATTING

Drie distinct PDF/export systemen aanwezig: BBL Reflectieverslag (bbl-hub), Stage Hub Overzicht (match-dashboard), ESG Export (esg-export.js → esg-export.html). Allen gebruiken jsPDF (Helvetica/Latin-1 — emoji's renderen kapot, MIDDEL). Geen loading states op de export-knoppen. ESG-export is grondig null-guarded (alle 6 VSME datapoints), correct getest met empty data. Match-dashboard PDF is risicovol: `match.student.name` zonder null guard kan crashen (HOOG). BBL PDF is robuust met empty-state messaging. Eindverslag-flow is bewust niet gebouwd (CLAUDE.md backlog). Risicovolst: match-dashboard PDF.

---

## AANBEVOLEN FIX VOLGORDE DEEL 3

**Fase 1 — BLOCKERS** (geen — direct door naar fase 2)

**Fase 2 — HOOG (11 items, geschat 1-2 dagen totaal):**

| # | Locatie | Issue | Effort |
|---|---|---|---|
| 1 | `match-dashboard.html:5376` | min attribuut op meeting date | klein (5 min) |
| 2 | `international-student-dashboard.html:1808` | la-* validatie volledig | middel (30 min) |
| 3 | `match-dashboard.html:5688` | null guard match.student.name | klein (5 min) |
| 4 | `bbl-profile.html:373,377` | contract_end > contract_start | klein (10 min) |
| 5 | `chat.html:1089` | filter zero-width characters | klein (10 min) |
| 6 | `chat.html:1026-1032` | implementeer pagination (range-based) | middel (1 uur) |
| 7 | `index.html:1955,2026`, `about.html:995,1046`, `pricing.html` | inline Supabase ref opruimen | middel (30 min) |
| 8 | `match-dashboard.html` (chat-pagina-flow) | onboarding profile guard | klein (15 min) |
| 9 | `chat.html:1418` | profile guard naast role guard | klein (15 min) |

**Fase 3 — MIDDEL (~38 items, geschat 4-6 dagen):**
Hoge waarde middel-fixes:
- Past-date guard in `js/calendar.js` (UTC issue, regel 231)
- Overlap-detectie meetings (A3)
- Geen lowercase op waitlist email (F4)
- charCount/tagInput consolidatie naar utils.js (F5, E3 — 7/11 violations)
- Loading state op PDF buttons (D2)
- Debounce op meeting accept/reject in chat (C5)
- Dubbele escape bug in chat appendMessage (F3)
- Plan-meeting UI in school/begeleider dashboards (B3, B4)

---

## AUDIT VOLTOOID DEEL 3 — 2026-04-30T00:00:00Z

