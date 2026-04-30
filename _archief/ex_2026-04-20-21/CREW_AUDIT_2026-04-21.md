# CREW AUDIT — Deploy 2026-04-21
**Scope:** 9 deploy-bestanden + retroactieve impact op bredere codebase.
**Eerdere rapporten:** niet herhaald. Alleen nieuwe bevindingen.

---

## As 1 — Routing-consistentie ⚠ 3 afwijkingen

| Rol + staat | roles.js | routeStudentByMode | getRoleLanding | auth.html ROUTES | auth.html already-in | Consistent? |
|---|---|---|---|---|---|---|
| BBL (bbl_mode=true) | /bbl-hub.html | bbl-hub.html | bbl-hub.html | bbl-hub.html | bbl-hub.html (+ naam-check) | ✓ |
| BOL/HBO/WO (met naam) | /discover.html | discover.html | discover.html | discover.html | discover.html | ✓ |
| BOL/HBO/WO (geen naam) | /discover.html | discover.html | discover.html | discover.html → discover kaatst → student-profile | student-profile (else if !naam) | ⚠ Twee hops nieuw |
| Onbekend student | /student-profile.html | student-profile.html | **discover.html** | discover.html | student-profile.html | ✗ getRoleLanding inconsistent |
| Admin/onbekend rol | /student-profile.html | n/a | discover.html | **match-dashboard.html** (stale!) | n/a | ✗ Drie fallbacks verschillen |
| Bedrijf / School / Begeleider / Buddy | ✓ | n/a | ✓ | ✓ | ✓ | ✓ |

**Paradox BOL nieuw (geen naam):** auth.html stuurt naar discover.html → discover.html kaatst terug naar student-profile.html → student-profile sloeg op → routeStudentByMode → discover.html. **Geen loop** (student-profile redirect is pas na save), maar twee extra hops voor nieuwe user.

**Discover BBL-guard:** discover.html redirectt naar `bbl-hub.html` ✓ — consistent met auth.html BBL-branch.

**✗-tellers:** 2 inconsistenties, 1 extra-hop ⚠.

---

## As 2 — Silent errors & atomicity ⚠ 4 risico's

| Bestand:regel | Async call | Catch? | Fail-mode | Advies |
|---|---|---|---|---|
| utils.js:570 | getUnreadTotal() heel | ✓ try/catch | returnt 0 → badge toont 0, **silent** | Acceptabel — 0 is veilig default |
| mijn-berichten.html:449 | conversations.insert() na match.update | ✗ | Silent — match is accepted, conversation ontbreekt | ⚠ Atomicity: match accepted maar chat nooit aangemaakt |
| mijn-berichten.html:453 | createNotification('begeleider_invite'…) | ✗ | **'begeleider_invite' is NIET in VALID_NOTIFICATION_TYPES** → console.error, geen DB-insert | ✗ Kritiek: notificatie verstuurd nooit |
| mijn-berichten.html:462-470 | declineRequest: match.update + createNotification | ✗ | Beide fire-and-forget | ⚠ Geen gebruikersfeedback bij falen |
| begeleider-dashboard.html:1027 | createNotification('buddy_request'…) | ✗ | buddy_request ✓ wél geldig type, maar geen catch | ⚠ Stil bij netwerk-fout |
| school-dashboard.html:_sendSchoolUitnodiging | createNotification('buddy_request'…) | ✗ | Idem begeleider | ⚠ |
| profanity.js (chat.html) | filter() | n/a via `?? content` | **Graceful fallback** naar originele tekst | ✓ |
| Debounce 300ms | _runSuSearch / _udSearchDebounce | ✗ individuele query | Geen cancel van vluchtige queries, maar 300ms buffer absorbeert snel typen | ✓ Acceptabel |

**Zwaarste:** `'begeleider_invite'` is een hallucinated notification type — createNotification() logt console.error en insert slaagt niet.

---

## As 3 — Security & RLS ✗ 3 kritieke gaten

**a. begeleider_link matches**

| Vraag | Bevinding | Status |
|---|---|---|
| RLS op matches voor begeleider_link? | CLAUDE.md: "Admin RLS = client-side only" → geen server-side RLS | ✗ |
| Kan student zichzelf uitnodigen? | `_sendBegeleiderUitnodiging`: geen `party_a !== party_b` check | ✗ |
| Willekeurige user INSERT andere parties? | Zonder RLS: ja, elke ingelogde user kan matches aanmaken voor anderen | ✗ |

**b. Bobba filter bypass**

| Vraag | Bevinding | Status |
|---|---|---|
| Rate-limiting op messages.insert? | Geen server-side rate-limit in code | ✗ |
| curl omzeilt filter? | Filter is client-side only — direct API-call negeert profanity.js volledig | ✗ |

**c. Mijn-berichten data-lekkage**

| Vraag | Bevinding | Status |
|---|---|---|
| conversations gefilterd op user? | matches-query filtert op `party_a.eq.uid OR party_b.eq.uid` ✓; conversations IN(matchIds) ✓ | ✓ |
| URL-leak via chat.html?match=X? | chat.html moet eigen RLS hebben — buiten deze deploy-scope | ⚠ |

**d. GDPR consent bij begeleider-koppeling**

| Vraag | Bevinding | Status |
|---|---|---|
| Consent-moment voor student? | Geen consent-scherm — student accepteert verzoek maar ziet geen GDPR-tekst | ⚠ |

---

## As 4 — Architecture centralisatie ⚠ 4 punten

**Duplicatie uitnodig-modal:**
begeleider-dashboard (`ud-*` klassen) en school-dashboard (`su-*` klassen) zijn **parallelle implementaties** van identieke logica. Consolidatie-kandidaat: gedeelde `openInviteStudentModal(config)` helper in utils.js of apart `js/invite-student.js`. Sprint 5.

**Taalconsistentie:**

| Term | Waar | Oordeel |
|---|---|---|
| "Berichten" | utils.js nav, company-dashboard, bbl-hub, page title chat.html | ✓ Consistent |
| "Mijn Berichten" | mijn-berichten.html `<title>` | ✓ Acceptabel |
| "Gesprekken" | chat.html topbar tekst `Gesprekken` | ⚠ Mismatch met "Berichten" elders |
| "Uitnodigen" vs "Nodig student uit" | buttons consistent per context | ✓ |

**Retroactieve impact — stale referenties buiten deploy:**

| Bestand:regel | Ref | Correct? |
|---|---|---|
| matches.html:824 | `MBO_BOL → bol-profile.html` guard | ⚠ Oud patroon, niet in deploy |
| mijn-sollicitaties.html:680 | Idem MBO_BOL guard | ⚠ Oud patroon, niet in deploy |
| student-profile.html:1303 | redirect naar `bbl-profile.html` | ✓ BBL profiel-form, correct |
| student-profile.html:1309 | redirect naar `bol-profile.html` | ⚠ Oud — onduidelijk of bol-profile.html actief blijft |
| discover.html:406 | `match-dashboard.html` in nav tab | ✓ Stage Hub link, niet landing |
| auth.html:669 | fallback `match-dashboard.html` | ✗ Stale — moet `admin.html` of `student-profile.html` worden |

---

## As 5 — Mission & UX ⚠ 2 punten

**a. Nieuwe student onboarding-flow (code-read):**
auth → discover → student-profile (2 hops). student-profile vraagt: naam (required), bbl_mode/onderwijsniveau.
Na opslaan → routeStudentByMode → discover.html. Eerste CTA op discover: vacatures zien. ✓ Logisch.

**b. Empty-state hiërarchie mijn-berichten:**
Primaire knop: `"Vind een stage"` (groen, `.primary`) → `/discover.html` ✓ Correct voor nieuwe user.
Secundaire: `"Vind een buddy"` → buddy-dashboard.html.
Tertiaire (alleen BOL zonder begeleider): `"+ Voeg begeleider toe"`.
Volgorde is correct.

**c. Bobba vervangwoord aanpasbaar:**
`addWord(w)` methode aanwezig op `window.Internly.profanity` → post-livetest finetuning mogelijk ✓.
Vervangwoord zelf ("bobba") is hardcoded in filter(). Niet aanpasbaar zonder broncode-wijziging. ⚠ Sprint-item.

**d. Profiel-pagina's form-only:**
student-profile.html, bbl-profile.html: form-only, geen preview/dashboard ✓. Gedocumenteerd als sprint-item in CLAUDE.md.

---

## As 6 — Strategisch & continuity ✗ 2 bevindingen

**a. Hallucination-scan:**

| Aanroep | Gedefinieerd? | Status |
|---|---|---|
| `formatRelativeTime` in mijn-berichten | Lokaal gedefinieerd r.292 | ✓ |
| `avatarInitials` in mijn-berichten | Lokaal gedefinieerd r.304 | ✓ |
| `requireRole`, `renderStudentHeader`, `createNotification` | utils.js | ✓ |
| `createNotification(..., 'begeleider_invite', ...)` | Type **NIET** in VALID_NOTIFICATION_TYPES | ✗ Kritiek |
| `matches.match_type`, `match_target` kolommen | Aanwezig in bestaande codebase (bbl-hub etc.) | ✓ |

**b. Paywall-impact:**
`requireRole('student')` op mijn-berichten.html → bedrijven/begeleiders geen toegang ✓.
"Open chat" knop in begeleider-dashboard is voor begeleiders — correct, geen paywall-conflict ✓.

**c. HANDOVER.md:**
Laatste update: **2026-04-14**. Deploy-bestanden van vandaag (21 april) niet gedocumenteerd. ✗ Niet bijgewerkt.

**d. Onuitgesproken aanname (TQ):**
> **"Een student heeft maximaal één actieve begeleider."**
De `maybeSingle()` check in begeleider-modal controleert op bestaand begeleider_link — maar meerdere pending/rejected links zijn technisch mogelijk. En school-dashboard.html stuurt ook `begeleider_link` matches — een student kan tegelijk een begeleider EN een school als party_a hebben in begeleider_link, met geen onderscheid in de inbox-weergave. Niet hardop besproken.

---

## Totaaloverzicht

| As | ✓ | ⚠ | ✗ |
|---|---|---|---|
| 1 Routing | 4 | 1 | 2 |
| 2 Errors | 2 | 4 | 1 |
| 3 Security | 2 | 2 | 3 |
| 4 Architectuur | 3 | 3 | 1 |
| 5 UX | 3 | 2 | 0 |
| 6 Strategisch | 3 | 0 | 2 |
| **Totaal** | **17** | **12** | **9** |

---

## Eindoordeel: HOLD

**Reden:**

1. **✗ Kritiek:** `'begeleider_invite'` is een onbekend notification type → createNotification() insert mislukt stil. Elke accepteer/weiger-actie in mijn-berichten stuurt geen notificatie. Fix: wijzig naar `'buddy_request'` of voeg type toe aan VALID_NOTIFICATION_TYPES + getNotifText().

2. **✗ Kritiek:** conversations.insert() in acceptRequest heeft geen error-check → match staat op 'accepted' maar chat bestaat niet. Fix: toevoegen `if (convErr) { ... }`.

3. **✗ Auth.html:669 stale fallback** `'match-dashboard.html'` voor onbekende rollen. Laag risico in productie (admin accounts zeldzaam) maar corrigeerbaar in één regel.

**De overige ✗ (RLS gaps, HANDOVER.md)** zijn pre-existing of buiten huidige deploy-scope. Na fix van punten 1 en 2 is de deploy GO.
