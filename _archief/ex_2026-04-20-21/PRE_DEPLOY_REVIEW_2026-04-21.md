# Pre-Deploy Review — 21 april 2026
Scope: vijf bestanden gewijzigd vóór livetest. Geen brede audit — zie CODEBASE_AUDIT_2026-04-21.md voor overige bevindingen.

Bestanden: `js/roles.js` · `js/utils.js` · `js/profanity.js` (nieuw) · `auth.html` · `chat.html`

---

## Sectie 1 — Routing consistency (Rossi + Tarlok)

Twee routingpaden in auth.html:
- **Post-login** (`doLogin`, r.656-667): studenten met `student_profile` → `Internly.detectRole()` + `Internly.routeForRole()`. Naam NIET gecheckt.
- **Al-ingelogd** (`DOMContentLoaded`, r.878-888): `ROUTES[role]` + student-branch met naam-check.

Tabel — `n/a` = functie niet bestemd voor dit user-type.

| User type | roles.js routeForRole | utils.js routeStudentByMode | utils.js getRoleLanding | auth.html post-login | auth.html al-ingelogd | Consistent? |
|---|---|---|---|---|---|---|
| BBL actief (naam ✓) | `/bbl-hub.html` | `bbl-hub.html` | `bbl-hub.html` | `/bbl-hub.html` | `bbl-hub.html` | ✓ |
| BBL nieuw (naam null) | `/bbl-hub.html` | `bbl-hub.html` | `bbl-hub.html` | `/bbl-hub.html` | `bbl-profile.html` | ✗ |
| BOL actief (naam ✓) | `/discover.html` | `discover.html` | `discover.html` | `/discover.html` | `discover.html` | ✓ |
| BOL nieuw (naam null) | `/discover.html` | `discover.html` | `discover.html` | `/discover.html` | `student-profile.html` | ✗ |
| HBO actief (naam ✓) | `/discover.html` | `discover.html` | `discover.html` | `/discover.html` | `discover.html` | ✓ |
| HBO nieuw (naam null) | `/discover.html` | `discover.html` | `discover.html` | `/discover.html` | `student-profile.html` | ✗ |
| WO actief (naam ✓) | `/discover.html` | `discover.html` | `discover.html` | `/discover.html` | `discover.html` | ✓ |
| WO nieuw (naam null) | `/discover.html` | `discover.html` | `discover.html` | `/discover.html` | `student-profile.html` | ✗ |
| ONBEKEND (geen onderwijsniveau) | `/student-profile.html` | `discover.html` | `discover.html` | `/student-profile.html` | `student-profile.html` | ⚠ |
| Bedrijf | `/company-dashboard.html` | n/a | `company-dashboard.html` | `company-dashboard.html` | `company-dashboard.html` | ✓ |
| School | `/school-dashboard.html` | n/a | `school-dashboard.html` | `school-dashboard.html` | `school-dashboard.html` | ✓ |
| Begeleider | `/begeleider-dashboard.html` | n/a | `begeleider-dashboard.html` | `begeleider-dashboard.html` | `begeleider-dashboard.html` | ✓ |
| Buddy (gepensioneerd) | `/buddy-dashboard.html` | n/a | `buddy-dashboard.html` | `buddy-dashboard.html` | `buddy-dashboard.html` | ✓ |

**4 inconsistenties — uitleg:**

**BBL nieuw ✗** — `doLogin` routeert via `routeForRole` → `/bbl-hub.html` (naam niet gecheckt). `DOMContentLoaded` routeert naar `bbl-profile.html` als naam ontbreekt. Eerste login = bbl-hub, herbezoek auth.html = bbl-profile. Praktisch risico: klein (bbl-hub controleert of profiel compleet is).

**BOL/HBO/WO nieuw ✗** — `doLogin` routeert via `routeForRole` → `/discover.html` zonder naam-check. `DOMContentLoaded` routeert naar `student-profile.html` als naam null is. Eerste login = discover.html zonder ingevuld profiel. **Risico voor livetest:** als discover.html geen guard heeft die naam-loze studenten doorstuurt, ervaren zij een lege profielpagina vóór onboarding is afgerond.

**ONBEKEND ⚠** — `routeStudentByMode` geeft `discover.html` (bedoeld voor track-wissel, niet voor routing na login). `routeForRole` geeft correct `/student-profile.html`. Geen conflict in practice want `routeStudentByMode` wordt niet aangeroepen voor ONBEKEND-users.

**Structurele noot (sprint-item):** Twee onafhankelijke routing-bronnen (`ROUTES{}` in auth.html en `routeForRole()` in roles.js) beslissen hetzelfde. Consolidatie naar één bron is sprint 5 werk.

**roles.js gebruikt absolute paden** (`/discover.html`) — utils.js gebruikt relatieve paden (`discover.html`). Functioneel identiek op root-deploy, maar inconsistent.

---

## Sectie 2 — AI-hallucinatie scan (Emily + Morgan + Hal)

| Bestand:regel | Verwijzing | Bestaat? | Risico |
|---|---|---|---|
| auth.html:658 | `Internly.detectRole` | ✓ — roles.js r.25, geladen r.19 auth.html | Geen |
| auth.html:663 | `Internly.routeForRole` | ✓ — roles.js r.48 | Geen |
| auth.html:669 | `'match-dashboard.html'` als fallback | ✓ bestand bestaat, maar stale rol — zie §6 | Laag |
| auth.html:884 | `select('bbl_mode, naam, onderwijsniveau')` | ✓ alle drie kolommen in `student_profiles` | Geen |
| chat.html:17 | `js/profanity.js` | ✓ — nieuw aangemaakt deze sessie | Geen |
| chat.html:955 | `window.Internly?.profanity?.filter` | ✓ — profanity.js geladen op r.17, vóór inline script | Geen |
| js/profanity.js | Geen imports, geen externe calls | ✓ — volledig zelfstandige IIFE | Geen |
| js/roles.js:54-58 | Alle pad-strings | ✓ — bbl-hub, discover, company-dashboard, school-dashboard, begeleider-dashboard, buddy-dashboard, student-profile bestaan | Geen |
| js/utils.js:404 | `'bbl-hub.html'` | ✓ bestand bestaat | Geen |
| js/utils.js:406 | `'discover.html'` | ✓ | Geen |
| js/utils.js:474 | `/match-dashboard.html` in nav-template | ✓ | Geen |

Geen hallucinaties gevonden in de vijf bestanden.

---

## Sectie 3 — Silent errors (Hal)

| Bestand:regel | Pattern | Gevolg bij failure | Aanbeveling |
|---|---|---|---|
| auth.html:646 | `if (spErr) console.error(...)` — geen notify | `_sp` blijft `undefined`, code gaat door. Fallback (r.664-666): `student-profile.html`. Acceptabel. | Geen actie |
| auth.html:669 | `ROUTES[role] \|\| 'match-dashboard.html'` | Admin-rol (niet in ROUTES) → `match-dashboard.html` zonder foutmelding. Stille verkeerde redirect. | Sprint-item: vervang door `'index.html'` |
| profanity.js:93 | `addWord: w => BOBBA_WORDS.push(w.toLowerCase())` | `addWord(null)` → TypeError. Geen validatie. | Laag risico (interne API, geen user-input path) |
| chat.html:955 | `?? content` fallback als profanity-module afwezig | Ongefilterd bericht wordt verzonden als profanity.js niet laadt. Graceful degradation, niet een crash. | Acceptabel |
| chat.html:484/521 | `?? (msg.content \|\| '')` fallback | Ongefilterde render als module afwezig. Zelfde als boven. | Acceptabel |

Geen lege `.catch(()=>{})` blokken gevonden in de vijf bestanden.

---

## Sectie 4 — Bobba filter beveiliging (Bedward + Knob)

**a. Coverage — alle invloedpaden user-content:**

| Pad | Gefilterd? |
|---|---|
| `sendMessage` INSERT (`content:` veld) | ✓ r.955 — `filtered` gebruikt |
| `sendMessage` optimistic append | ✓ r.963 — `content: filtered` |
| `renderMessages` (initieel laden uit DB) | ✓ r.484 — `raw` vóór `escapeHtml` |
| `appendMessage` (realtime inkomend bericht) | ✓ r.521 — `raw` vóór `escapeHtml` |
| Buddy-gesprek laden | ✓ — roept `loadMessages()` → `renderMessages()` aan |
| Meeting-kaarten (subject, datum) | ✗ — `renderMeetingCard` filtert niet. Scheldwoorden in `meeting.subject` zichtbaar. Laag risico (subject is eigen input bij plannen) |
| Berichten bewerken | n/a — bewerkfunctie bestaat niet in chat.html |

**b. Input-robuustheid:**

| Input | Gedrag | OK? |
|---|---|---|
| `null` | `if (!text)` → return null | ✓ |
| `undefined` | zelfde | ✓ |
| `''` (leeg) | `!text` → return `''` | ✓ |
| Getal `42` | `typeof 42 !== 'string'` → return `42` | ✓ |
| Emoji-only `'🚀🎯'` | Niet matched door `\w+` → ongewijzigd | ✓ |
| Zeer lange string (1 MB) | Lineaire regex-complexiteit, geen catastrophic backtracking | ✓ |
| Unicode buiten BMP | `\w+` matcht geen surrogate pairs → doorgelaten | ✓ |

**c. Self-test code:** aanwezig in commentaar-blok r.100-114. Niet auto-uitgevoerd bij laden. Intentioneel — DevTools-only. ✓

**d. Alle 10 assertions aanwezig:** ✓ (r.103-113, exact conform instructie)

**e. Whitelist:**
| Woord | Reden | Correct opgebouwd? |
|---|---|---|
| `klasse` / `klassiek` / `klassikaal` | Bevat geen profaan substring na normalisatie | ✓ |
| `assumption` | Bevat 'ass' niet als normalisatie-output (is Engelse term) | ✓ |
| `assist` / `assistent` / `assistentie` | Zelfde | ✓ |
| `shift` | Bevat 'shit'? → 's-h-i-f-t' ≠ 's-h-i-t' als substring | ✓ |
| `shiftwerk` | Zelfde | ✓ |
| `assessment` | Bevat 'ass' (normalisatie: 'assessment') — zou zonder whitelist NIET matchen want 'ass' staat niet in BOBBA_WORDS (alleen 'asshole'). Whitelist is defensief, correct. | ✓ |
| `kankeronderzoek` / `kankerstichting` | Compound met 'kanker' → whitelist noodzakelijk | ✓ |

**f. `addWord()` runtime-API:** Toegankelijk via `window.Internly.profanity.addWord(...)`. Een gebruiker kan via DevTools extra woorden toevoegen — uitsluitend in eigen sessie, niet cross-user. `BOBBA_WORDS` zelf is niet direct toegankelijk (IIFE-closure). Geen meaningful attack-vector. ✓

---

## Sectie 5 — auth.html student-branch edge cases (Knob)

Relevante code (al-ingelogd check, r.881-888):
```javascript
if (sp?.bbl_mode === true) { dest = sp?.naam ? 'bbl-hub.html' : 'bbl-profile.html'; roleLabel = 'BBL-student'; }
else if (!sp?.naam) { dest = 'student-profile.html'; }
```

| Scenario | sp-waarden | dest | Correct? |
|---|---|---|---|
| **A** — nieuw, sp=null | `sp?.bbl_mode` = undefined → false; `!sp?.naam` = !undefined = true | `student-profile.html` | ✓ Onboarding starten |
| **B** — HBO actief | naam='Lena', bbl_mode=false, onderwijsniveau='HBO' | !sp?.naam = false → `ROUTES['student']` = `discover.html` | ✓ |
| **C** — BBL nieuw | naam=null, bbl_mode=true | `sp?.naam ? 'bbl-hub' : 'bbl-profile'` → `bbl-profile.html` | ✓ BBL-onboarding |
| **D** — role='admin' | ROUTES['admin'] = undefined → `if (role && ROUTES[role])` = false | Al-ingelogd panel NIET getoond — user ziet loginformulier. Post-login: `ROUTES['admin'] \|\| 'match-dashboard.html'` → `match-dashboard.html` ✗ | ✗ Stale fallback. Admin is geen livetest-rol. |
| **E** — role='gepensioneerd' | ROUTES['gepensioneerd'] = 'buddy-dashboard.html' | `buddy-dashboard.html` | ✓ Rol nog actief in ROUTES en codebase |

**Scenario D is ✗** maar heeft geen impact op livetest — admin-users bestaan niet in de testset. Sprint-item: verander fallback r.669 van `'match-dashboard.html'` naar `'index.html'`.

**Bijzondere noot — onderwijsniveau kolom in SELECT:** auth.html:884 selecteert `onderwijsniveau` uit `student_profiles` maar de al-ingelogd branch (r.887-888) gebruikt deze kolom nu NIET meer (de MBO_BOL-specifieke regel is verwijderd). De kolom wordt alleen nog gebruikt in `doLogin` via `detectRole`. De SELECT is daarmee iets ruimer dan nodig maar niet fout.

---

## Sectie 6 — Regressions / onbedoelde effecten (Rossi + Morgan)

**`match-dashboard.html` als oud default:**

| Bestand:regel | Pattern | Impact |
|---|---|---|
| auth.html:669 | `ROUTES[role] \|\| 'match-dashboard.html'` | Stale fallback voor onbekende rollen (admin). Geen livetest-impact. |
| Alle overige vermeldingen | Navigatielinks naar match-dashboard.html met `?match=` parameter | ✓ Correct — match-dashboard is nog steeds de stage-hub, geen default-route verwarring |

**`bol-profile.html` als auto-redirect (buiten de 5 bestanden):**

| Bestand:regel | Pattern | Impact |
|---|---|---|
| discover.html:1186 | `if (sp?.onderwijsniveau === 'MBO_BOL') { window.location.replace('bol-profile.html') }` | BOL-studenten op discover.html worden naar bol-profile.html gestuurd. Dit is profiel-navigatie, niet onboarding-redirect. Consistent met intentie. ✓ |
| matches.html:824 | Zelfde patroon | ✓ |
| mijn-sollicitaties.html:680 | Zelfde patroon | ✓ |
| student-profile.html:1309 | `window.location.replace('bol-profile.html')` | BOL-student op student-profile → redirect naar bol-profile. Nog steeds correcte segregatie. ✓ |

**`/hub.html` referenties:**

| Bestand:regel | Pattern | Impact |
|---|---|---|
| js/utils.js:474 | `/match-dashboard.html` | ✓ Geüpdatet deze sessie |

Geen straggling `/hub.html` referenties gevonden buiten backup-bestanden.

**BBL als sub-key in ROUTES:**

Geen bestand doet `ROUTES['bbl']` — BBL wordt als `student` + `bbl_mode` afgehandeld. ✓

---

## Sectie 7 — Strategische checkpoint (Tarlok + Dax)

**Deploy-advies: GO ⚠ (met één actief bewakingspunt)**

De vijf bestanden zijn intern consistent op de happy path. De routing-inconsistenties (§1 ✗-rijen) betreffen uitsluitend de eerste login van naamloze studenten — een randsituatie in livetest omdat testaccounts al een profiel hebben.

**Rest-risico:** een splinternieuwe BOL/HBO/WO-testuser die zich registreert en direct inlogt landt via `routeForRole` op `discover.html` vóór onboarding voltooid is. Als `discover.html` geen naam-guard heeft, ziet deze user een lege hub. Kans in livetest: laag (testgebruikers zijn warm uitgenodigd, niet koud geregistreerd).

**Barry bewaakt post-deploy eerste 48 uur:**
1. Nieuwe studentregistraties (BOL/HBO/WO) — landen ze op student-profile voor onboarding of schieten ze direct naar discover?
2. Bobba-filter console-errors (`[Bobba] self-test`) — mochten die optreden in productie, is profanity.js niet geladen.
3. BBL-instroom — nieuwe BBL-users landen op bbl-hub (niet bbl-profile) bij eerste login. Bbl-hub moet hiermee kunnen omgaan.

---

## Totaaltelling

| Categorie | Aantal |
|---|---|
| ✗ routing inconsistenties | 4 |
| ✗ stale fallback (admin) | 1 |
| ✗ meeting-kaart niet gefilterd | 1 |
| ⚠ routeStudentByMode ↔ routeForRole divergentie (ONBEKEND) | 1 |
| Totaal ✗/⚠ | **7** |

Geen hallucinaties · Geen broken file-imports · Geen lege catch-handlers · Bobba 10/10 assertions ✓
