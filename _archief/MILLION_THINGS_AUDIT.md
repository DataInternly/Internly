# INTERNLY — MILLION LITTLE THINGS AUDIT
Datum: 1 mei 2026
Auditor: Claude (read-only, parallel sub-agents)
Scope: c:\Projects\Internly, exclusief BACKUP/ en _revamp_2026-04-29/
Excluded: security audit (zie SECURITY_AUDIT_2026-05-01.md voor K1–K4 + H1–H8)

---

## EXECUTIVE SUMMARY

| Severity | Count |
|---|---|
| KRITIEK  | 0 |
| HOOG     | ~70 (silent catches & ongechecked DB queries gegroepeerd; 13 unieke knelpunten) |
| MIDDEL   | ~25 |
| LAAG     | ~40 |
| PASS     | 50+ |

Geen behavioral KRITIEK gevonden. Eén grote accessibility-failure (WCAG AA contrast op `--accent` #FF7E42). Twee bevestigde double-submit gaten op save-knoppen. Brede patroon-zwakte: catch-blocks die alleen `console.warn` doen op DB-failure paths — gebruiker krijgt success-toast terwijl insert/update faalde.

---

## REEKS 1 — STILLE FOUTEN

### CHECK E1 — Catch blocks zonder notify (silent failures)

50+ catch-blokken loggen alleen naar console. Concentratie:

| Bestand | # silent | Voorbeeld file:line |
|---|---|---|
| bbl-hub.html | ~22 | 1773, 1810, 1842, 1849 |
| match-dashboard.html | ~10 | 5400, 5411, 5457, 5468, 5491, 5502, 5760 |
| company-dashboard.html | ~8 | 1860, 1988, 2480, 2544, 3314 |
| school-dashboard.html | ~6 | 1388, 1426, 1622, 1920 |
| buddy-dashboard.html | ~6 | 743, 758, 800, 908, 915, 1000 |
| js/buddy.js | 3 | 133, 584, 1017 |
| js/calendar.js | 2 | 133, 225 |
| js/swipes.js | 1 | 152 |
| js/milestones.js | 2 | 103, 135 |

**Worst offenders (functionele impact)**:

| File:Line | Severity | Issue |
|---|---|---|
| [bbl-hub.html:1810](bbl-hub.html#L1810) | HOOG | `notify('Toelichting opgeslagen')` afgevuurd OOK bij DB-error → false success |
| [matches.html:534](matches.html#L534) | HOOG | match aanmaken: insert faalt → student ziet "Opgeslagen" toast |
| [school-dashboard.html:1920](school-dashboard.html#L1920) | HOOG | school_referral notif batch silent — bedrijven krijgen geen melding |
| [match-dashboard.html:5400-5760](match-dashboard.html#L5400-L5760) | HOOG | meeting accept/decline/cancel + notif inserts: 7 silent catches → meeting state en counterparty notif kan kapot zonder toast |
| [buddy-dashboard.html:743](buddy-dashboard.html#L743) | HOOG | rollback request status silent → orphan accepted/pending state mogelijk |

### CHECK E2 — DB queries zonder error check

38+ instances. `await db.from(...).select(...)` waar alleen `{ data }` gedestructureerd wordt zonder `error`. Hot paths affected:

| File:Line | Issue |
|---|---|
| [js/buddy.js:219](js/buddy.js#L219), [225](js/buddy.js#L225), [249](js/buddy.js#L249), [274](js/buddy.js#L274), [814](js/buddy.js#L814), [1017](js/buddy.js#L1017) | Hele buddy candidate-flow zonder error checks |
| [js/swipes.js:140](js/swipes.js#L140), [173](js/swipes.js#L173) | swipes flow |
| [match-dashboard.html:2691](match-dashboard.html#L2691), [2779](match-dashboard.html#L2779), [2794](match-dashboard.html#L2794), [2841](match-dashboard.html#L2841), [2871](match-dashboard.html#L2871), [2921](match-dashboard.html#L2921), [3641](match-dashboard.html#L3641), [4548](match-dashboard.html#L4548), [5726](match-dashboard.html#L5726) | role guards & meeting flow zonder error check |
| [matches.html:444](matches.html#L444), [449](matches.html#L449), [479](matches.html#L479), [487](matches.html#L487), [493](matches.html#L493), [501](matches.html#L501), [703](matches.html#L703) | conversation + match flow zonder error check |
| [chat.html:782](chat.html#L782), [805](chat.html#L805), [829](chat.html#L829), [866](chat.html#L866), [1121](chat.html#L1121), [1565](chat.html#L1565), [1568](chat.html#L1568) | chat data load zonder error check |
| [company-dashboard.html:3366](company-dashboard.html#L3366), [3380](company-dashboard.html#L3380), [3444](company-dashboard.html#L3444) | company role+naam queries |
| [admin.html:447](admin.html#L447), [1030](admin.html#L1030) | admin role check kan stil falen |

Severity HOOG voor admin role check (1030) — silent failure zou non-admin door kunnen laten als RLS niet zou blokkeren.

### CHECK E3 — Async functions returning undefined op error

| File:Function | Issue |
|---|---|
| [js/buddy.js:140](js/buddy.js#L140) buddyLoadPairs | Returns undefined on error; caller niet onderscheid stale/error |
| [js/buddy.js:213](js/buddy.js#L213) buddyFindCandidates | Returns `[]` op error én op echte 0 — caller weet verschil niet |
| [js/buddy.js:267](js/buddy.js#L267) buddySendRequest | Returns undefined op alle error paths |
| [js/buddy.js:322](js/buddy.js#L322) buddyAcceptRequest | Idem |
| [js/buddy.js:767](js/buddy.js#L767) saveBuddyProfile | Returns undefined op success+error gelijk |
| [js/buddy.js:793](js/buddy.js#L793) fetchBuddySeekers | Returns `[]` op error → empty banner shown |
| [js/swipes.js:22](js/swipes.js#L22) fetchIncomingLikes | Returns `[]` op error |
| [js/swipes.js:101](js/swipes.js#L101) swipesAcceptLike | Returns undefined |
| [js/calendar.js:124](js/calendar.js#L124) loadSlots | Returns undefined op error → grid stale |

Heel `js/buddy.js` public API mist signaal "did this fail" in return-value.

### CHECK E4 — Raw error.message naar gebruiker

15 instances waar `error.message` (Postgres/PostgREST stack-text) in een `notify()` belandt.

| File:Line | Severity |
|---|---|
| [admin.html:738](admin.html#L738), [774](admin.html#L774), [911](admin.html#L911), [952](admin.html#L952), [1020](admin.html#L1020) | MIDDEL (admin-only) |
| [bol-profile.html:1245](bol-profile.html#L1245) | MIDDEL (student-facing) |
| [student-profile.html:1549](student-profile.html#L1549) | MIDDEL (student-facing) |
| [school-dashboard.html:2098](school-dashboard.html#L2098) | MIDDEL (school-facing) |
| [match-dashboard.html:2719](match-dashboard.html#L2719), [2944](match-dashboard.html#L2944) | MIDDEL |
| [international-student-dashboard.html:1510](international-student-dashboard.html#L1510), [2060](international-student-dashboard.html#L2060) | MIDDEL |
| [international-school-dashboard.html:943](international-school-dashboard.html#L943) | MIDDEL |
| [company-dashboard.html:1831](company-dashboard.html#L1831), [2188](company-dashboard.html#L2188), [2310](company-dashboard.html#L2310) | MIDDEL (escapeHtml maar nog steeds Postgres-tekst) |

### CHECK E5 — Double-submit vulnerability

| Knop | File:Line | Verdict |
|---|---|---|
| vacature-detail apply | [vacature-detail.html:931](vacature-detail.html#L931) | PASS |
| company saveProfile | [company-dashboard.html:2928](company-dashboard.html#L2928) | PASS |
| company saveIntl | [company-dashboard.html:3762](company-dashboard.html#L3762) | PASS |
| school saveProfiel | [school-dashboard.html:2078](school-dashboard.html#L2078) | PASS |
| chat sendMessage | [chat.html:1218](chat.html#L1218) | PASS |
| auth doLogin | [auth.html:880](auth.html#L880) | PASS |
| auth doRegister | [auth.html:1006](auth.html#L1006) | PASS |
| **buddy saveBuddyProfile** | [js/buddy.js:767](js/buddy.js#L767) ↔ [buddy-dashboard.html:474](buddy-dashboard.html#L474) | **HOOG — geen disable, dubbele upsert mogelijk** |
| **begeleider saveProfiel** | [begeleider-dashboard.html:989](begeleider-dashboard.html#L989) ↔ [:644](begeleider-dashboard.html#L644) | **HOOG — function fetcht knop niet eens** |

---

## REEKS 2 — EMPTY + LOADING STATES

### CHECK L1 — Loading states

| File | Verdict |
|---|---|
| discover.html | PASS — "Vacatures laden…" placeholder |
| school-dashboard.html | PASS — `showLoading(...)` voor student-list |
| company-dashboard.html | PASS — `<div class="empty">Laden…</div>` |
| buddy-dashboard.html | PASS — initial markup "Laden…" |
| mijn-berichten.html | PASS — 3 skeleton cards static |
| mijn-sollicitaties.html | PASS — Laden text in container |
| **admin.html loadStats** | **MIDDEL** — `—` placeholder maar geen spinner; values springen direct |

### CHECK L2 — Empty states

| File | Verdict |
|---|---|
| discover.html:943 | PARTIAL — message + sub, geen CTA |
| mijn-sollicitaties.html:362 | GOOD — message + CTA naar discover |
| mijn-berichten.html:347 | GOOD — message + 3 CTAs |
| school-dashboard.html:769 | GOOD — message + "Nodig student uit" CTA |
| company-dashboard.html:1740 | GOOD — message + "Nieuwe vacature plaatsen" CTA |
| company-dashboard.html:1960 | PARTIAL — error fallback, geen empty CTA |
| buddy-dashboard.html:614 | PARTIAL — geen CTA bij geen pairs |
| match-dashboard.html:3441 (taken) | PARTIAL — geen inline CTA |
| match-dashboard.html:3320 (deadlines) | PARTIAL — geen inline CTA |
| admin.html:811 | PARTIAL — N/A (admin job-state) |

### CHECK L3 — Notification badge stale counts

| File | Verdict |
|---|---|
| company-dashboard.html | PASS — `loadNotifications()` herrekent bellCount |
| school-dashboard.html | PASS — zelfde patroon |
| buddy-dashboard.html | N/A — geen notif-dropdown |
| admin.html | N/A — geen notif-dropdown |

---

## REEKS 3 — NAVIGATIE

### CHECK N1 — Back-navigation fallback

| File | Verdict |
|---|---|
| js/utils.js:154 (canon) | PASS |
| begeleider/buddy/company/school dashboards | PASS — alle gebruiken `goBack(fallback)` |
| privacybeleid.html:464 | PASS — link href is fallback |
| **spelregels.html:422** | **HOOG — `<a href="#" onclick="history.back();return false">` zonder fallback bij deep-link** |

### CHECK N2 — Broken hrefs

PASS. Alle 40 `*.html` bestanden gescand — elk relatief href bestaat.

### CHECK N3 — Escape sluit modals

| File | Modal | Verdict |
|---|---|---|
| company-dashboard.html:1485 | confirm + flag | PASS |
| school-dashboard.html:1193 | koppel + generic | PASS |
| match-dashboard.html:3921 | generic | PASS |
| mijn-berichten.html:684 | begeleider modal | PASS |
| chat.html:953 | emoji picker | PASS |
| **begeleider-dashboard.html:1311** | **ud-modal** | **HOOG — geen Escape listener** |
| **vacature-detail.html:847** | **motivatie-modal** | **HOOG — geen Escape listener** |

### CHECK N4 — Browser back na login

[auth.html:983,988,992,994](auth.html#L983) — alle 4 gebruiken `window.location.href = ...` ipv `.replace()`. **HOOG — browser-back flasht naar login screen** voordat auth-gate redirect.

---

## REEKS 4 — FORMULIEREN

### CHECK F1 — Required-indicators

| File:Line | Severity |
|---|---|
| [auth.html:537](auth.html#L537) | PASS — "Velden met * zijn verplicht" + label class="req" |
| [school-dashboard.html:2222](school-dashboard.html#L2222), [2229](school-dashboard.html#L2229) | LAAG — required textarea zonder visueel * |
| [international-school-dashboard.html:697-705](international-school-dashboard.html#L697-L705) | LAAG — geen visueel * op verplichte velden |

### CHECK F2 — Character counters

13 textareas zonder counter. Worst:

| File:Line | maxlength | Issue |
|---|---|---|
| [company-dashboard.html:856](company-dashboard.html#L856) f-desc | 2000 | LAAG — geen counter |
| [company-dashboard.html:1242](company-dashboard.html#L1242) p-desc | 2000 | LAAG — geen counter |
| [international-student-dashboard.html:994](international-student-dashboard.html#L994) la-objectives | 2000 | LAAG — geen counter |
| [review-form.html:206](review-form.html#L206) | 1000 | LAAG — geen counter |
| [admin.html:686](admin.html#L686) note | — | LAAG |
| bbl-hub.html reflectie (5x), match-dashboard textareas (8+) | — | LAAG — geen maxlength + geen counter |

### CHECK F3 — Input trimming

3 MIDDEL gevonden in match-dashboard.html:

| File:Line | Veld |
|---|---|
| [match-dashboard.html:5613](match-dashboard.html#L5613) | `m-note?.value` zonder trim |
| [match-dashboard.html:5431](match-dashboard.html#L5431) | `cf-note-${id}?.value` zonder trim |
| [match-dashboard.html:4851](match-dashboard.html#L4851) | `sp-schoolnoot.value` zonder trim |

Alle email/naam velden in profiel-pagina's PASS (sanitize/trim aanwezig).

### CHECK F4 — Postcode normalisatie tijdens invoer

| File:Line | Verdict |
|---|---|
| [bol-profile.html:556](bol-profile.html#L556), [student-profile.html:860](student-profile.html#L860) | PARTIAL — uppercase oninput, geen space-strip |
| [bbl-profile.html:355](bbl-profile.html#L355) | MISSING |
| [buddy-dashboard.html:456](buddy-dashboard.html#L456) | MISSING |
| [company-dashboard.html:887](company-dashboard.html#L887), [3616](company-dashboard.html#L3616) | MISSING |

Geen DB-vervuiling (alle save-paths normaliseren correct), enkel UX.

### CHECK F5 — Enter submit

| File:Line | Severity |
|---|---|
| [auth.html:514-525](auth.html#L514-L525) login | **MIDDEL — `<div>` ipv `<form>`, Enter doet niets** |
| [auth.html:536-637](auth.html#L536-L637) register | **MIDDEL** |
| [auth.html:705-714](auth.html#L705-L714) reset password | **MIDDEL** |

### CHECK F6 — Save button text changes

PASS op de meeste profile-pagina's. MISSING:

| File:Line | Verdict |
|---|---|
| bbl-hub.html:881 saveReflectie | MISSING |
| bbl-hub.html:1746 ld-toelichting | MISSING |
| bbl-hub.html:789 createMeeting | MISSING |
| match-dashboard.html:3971, 4037, 4102, 4189, 4646, 5826 | MISSING — alle modal Opslaan-buttons |
| admin.html:541 saveTrustOverride | MISSING |
| begeleider-dashboard.html:644 saveProfiel | MISSING |

---

## REEKS 5 — UI CONSISTENTIE

### CHECK U1 — Toast duration

PASS. js/toast.js:13-17 centraliseert: success=3200, info=4000, warning=5000, undoable=7000, error=0 (persistent met sluiten-knop). `TOAST_TIMEOUT_MS=3200` in utils.js synchroon. Geen custom-duration overrides in productie.

### CHECK U2 — Confirm voor destructieve acties

| Actie | File:Line | Verdict |
|---|---|---|
| deleteReview | admin.html:484 | PASS |
| delPosting | company-dashboard.html:2652 | PASS — openModal |
| deleteVestiging | company-dashboard.html:3693 | PASS — openModal |
| delOproep | school-dashboard.html:2040 | PASS |
| deleteTaak | match-dashboard.html:3556 | PASS — two-tap inline |
| markAfgerond | match-dashboard.html:2733 | PASS |
| endPair (buddy) | buddy-dashboard.html:651 | PASS — two-click |
| terugnemen | mijn-sollicitaties.html:544 | PASS — undo-toast |
| signLA | international-school-dashboard.html:921 | PASS |
| **rejectMatch** | **company-dashboard.html:2003** | **HOOG — geen confirm** |
| **declineRequest** | **mijn-berichten.html:487** | **HOOG — geen confirm** |
| skipCard | matches.html:553 | FAIL-BY-DESIGN (swipe = intent) |

### CHECK U3 — Success vs error colors

PASS. js/toast.js: success groen #1a7a48 + ✓, error rood #b82020 + ✕ + role="alert" + persistent.

### CHECK U4 — Long name overflow

| Element | Verdict |
|---|---|
| .card-title, sidebar-user-name, topbar-match-name | PASS — ellipsis |
| .student-nav a | LAAG — geen ellipsis, lange tabs kunnen wrappen |
| .buddy-tab counter | LAAG — geen min-width |
| .hub-topbar-stage-name | LAAG — onbekend of ellipsis |

### CHECK U5 — Button label consistency

LAAG. Drie varianten naast elkaar:
- `Opslaan` / `Opslaan…` / `Opslaan →` (mix in zelfde codebase)
- `Bewaar deze vacature` (vacature-detail.html:832) vs `Opslaan voor later` (:1072) — zelfde actie
- `Bezig…` vs `Opslaan…` als loading-state inconsistent
- buddy-dashboard.html:474 `Profiel opslaan` (zonder pijl) vs profiel-pagina's `Profiel opslaan →`

---

## REEKS 6 — REALTIME

### CHECK R1 — Subscription cleanup

PASS — alle 10 subscription sites hebben beforeunload cleanup. Geen leaks.

### CHECK R2 — Re-subscribe zonder unsubscribe

| File:Line | Verdict |
|---|---|
| bbl-hub.html:1247 | PASS — removeChannel-first |
| chat.html:1193, 794 | PASS |
| company/school-dashboard | PASS — guard `\|\| notifSubscription` |
| matches.html:224 | PASS |
| **discover.html:1229** | **MIDDEL — geen guard, geen unsubscribe-first** |
| **matchpool.html:439** | **MIDDEL — idem** |
| **buddy-dashboard.html:952** | **MIDDEL — latent risk** |

### CHECK R3 — Realtime fallback bij connection error

PASS op meeste sites (`notify('Verbinding verbroken — ververs de pagina')`).

| File:Line | Issue |
|---|---|
| **chat.html:1696 minesweeper** | **SILENT — geen callback** |
| **matchpool.html:447** | **SILENT — alleen console.warn** |

Geen polling-fallback ergens — refresh-prompt is enige remediation.

---

## REEKS 7 — MOBILE

### CHECK M1 — Touch targets

PASS globaal: `input/textarea/select/button { min-height: 44px }` (style.css:1341).

| Element | Issue |
|---|---|
| .btn-pass, .btn-like | MIDDEL — `min-height: unset !important` override; padding redt het ternauwernood (~46px) |
| .btn-enable-pool | MIDDEL — `min-height: unset` + padding 11px (~42px, onder 44) |
| **.info-btn** | **MIDDEL — 17×17px circular help-icon, ver onder touch target** |
| .lang-btn mobile | MIDDEL — padding 3-6px → 26px hoog |

### CHECK M2 — Viewport meta

PASS. Alle 40 .html files hebben `<meta name="viewport">`.

### CHECK M3 — Horizontal scroll

| File:Line | Verdict |
|---|---|
| .notif-dropdown | PASS — mobile media query 8px margins |
| .info-pop 240px | LAAG |
| **.student-header .notif-dropdown 280px** | **MIDDEL — geen mobile-override** |

### CHECK M4 — iOS input zoom

PASS globaal: input/textarea/select font-size 16px (style.css:1336).

| File:Line | Issue |
|---|---|
| **.form-input (style.css:1660)** | **MIDDEL — `font-size: .92rem` (~14.7px) overschrijft global → iOS zoom triggert** |

---

## REEKS 8 — ACCESSIBILITY

### CHECK A1 — Img alt

PASS. Slechts 2 `<img>` totaal in codebase, beide met alt.

### CHECK A2 — Emoji-only buttons zonder aria-label

15+ instances LAAG, vooral close-knoppen `×`/`✕`/`✕`:
- match-dashboard.html: 8 modal-close buttons
- bbl-hub.html: 3 (send + cal-prev/next)
- chat.html: 2 (send + minesweeper close)
- admin.html: 1 (clipboard 📋)
- mijn-berichten.html: 1 (modal-close)

PASS waar correct: review-form star-buttons, begeleider-dashboard:1315, match-dashboard:5049, index.html beta-popup.

### CHECK A3 — Form labels

MIDDEL — auth.html `<label>` elementen hebben **geen `for=` attribute**, inputs hebben geen `aria-labelledby`/`aria-label`. Screen-reader krijgt geen programmatische associatie. Geldt waarschijnlijk codebase-wide voor alle profile-pagina's.

### CHECK A4 — Modal focus management

FAIL codebase-wide:
- `previouslyFocused`/`restoreFocus` patroon ontbreekt overal (grep: 0 hits)
- Geen focus-trap (Tab cycling) in een enkele modal
- Initial focus IN modal alleen voor search-inputs (begeleider/school/mijn-berichten)
- Bij close: focus wordt nooit teruggezet naar trigger

### CHECK A5 — Color contrast

| Combo | Ratio | WCAG AA | Verdict |
|---|---|---|---|
| **#FFF op #FF7E42 (--accent)** | **~2.7:1** | **FAIL** normal én large | **HOOG — elke primary CTA (.btn-primary, .btn-demo, .btn-like, .bell-count)** |
| #FFF op #1A7A48 (--green) | ~5.4:1 | PASS | OK |
| #FFF op #0F5C36 (--dark-green) | ~8.4:1 | PASS AAA | OK |
| #FFF op #E05C1A hover | ~3.6:1 | FAIL normal | LAAG (hover-only) |
| **#7A8799 (--ink3) op wit** | **~3.6:1** | **FAIL normal** | **MIDDEL — gebruikt in .form-hint, .trust-hint, .payments-table th** |
| #6B7280 op wit | ~4.83:1 | PASS net | OK |
| **#9CA3AF op wit** | **~2.85:1** | **FAIL** | **MIDDEL — .nd-time, .review-date, .empty-state** |
| #B82020 op wit | ~6.4:1 | PASS | OK |
| #B87A1A op #FDF3E0 amber | ~4.3:1 | FAIL net AA | LAAG |

---

## REEKS 9 — INTERNLY SPECIFIEK

### CHECK I1 — Trust Score consistency

| File:Line | Verdict |
|---|---|
| js/utils.js:245 renderTrustBadge canon | PASS — grade+score+NL-label+kleur |
| discover, matches, mijn-sollicitaties, profiles, school-dashboard | PASS — gebruiken canon |
| **admin.html:538-539** | **LAAG — number+grade in losse cells, geen kleur, geen NL-label** |
| **company-dashboard.html:1570-1583** | **LAAG — afwijkend label-format "Grade A — Betrouwbaar" ipv "Betrouwbaar"** |
| vacature-detail.html:746,762 | LAAG — `eScore` dead var naast canon-call |

### CHECK I2 — Date formatting

PASS canonical `formatNLDate()` (utils.js:277) breed gebruikt.

| File:Line | Issue |
|---|---|
| admin.html:610, 456-457 | LAAG — numeric `30-04-2026` ipv "30 april 2026", inconsistent binnen file |
| company-dashboard.html:3303 | LAAG — numeric NL inconsistent met long format elders in zelfde file |
| **match-dashboard.html:5758** | **MIDDEL — notif-tekst bevat raw `${firstSlot.date}` yyyy-mm-dd** |
| **match-dashboard.html:5896-5897** | **MIDDEL — CSV-export raw yyyy-mm-dd** |
| **match-dashboard.html:6159-6160** | **MIDDEL — PDF-export raw yyyy-mm-dd** |

Geen rauwe ISO `2026-04-30T...` strings naar gebruikers gevonden.

### CHECK I3 — Notification labels

PASS. Alle 24 types in VALID_NOTIFICATION_TYPES (utils.js:322-340) hebben dedicated label in getNotifText (utils.js:362-393). Drie types (`application_accepted`, `application_rejected`, `school_referral`) leunen op `n.message ||` met dedicated fallback (LAAG).

### CHECK I4 — Avatar initials edge cases

3 verschillende implementaties, geen shared helper:

| File:Line | Issue |
|---|---|
| **company-discover.html:503**, **school-dashboard.html:1457** | **LAAG — TypeError op `null` naam (geen guard)** |
| js/utils.js:408, matches.html:753 | LAAG — single-char only (verliest achternaam) |
| mijn-berichten.html:308-311 | OK — best implementation |
| Allen | LAAG — geen tussenvoegsel-handling ('Lena de Vries' → 'LD' ipv 'LV') |

### CHECK I5 — Role badge labels

| File:Line | Verdict |
|---|---|
| auth.html:1270 | PASS — volledige map |
| bol-profile.html:1426, student-profile.html:1735 | PASS — buddy-types vertaald |
| mijn-berichten.html:319-322, 412 | PASS |
| match-dashboard.html:3041, 5099 | PASS — student/bedrijf/school |
| **admin.html:609** | **LAAG — `escapeHtml(r.rol)` raw DB-string in waitlist-tabel** |
| admin.html:1006 | LAAG — CSV export raw |

Geen shared `getRoleLabel()` helper.

### CHECK I6 — Scroll to top op tab-switch

| File | Verdict |
|---|---|
| **company-dashboard.html show()** | **MIDDEL — FAIL, geen scrollTo** |
| **school-dashboard.html show()** | **MIDDEL — FAIL** |
| **begeleider-dashboard.html show()** | **MIDDEL — FAIL** |
| **admin.html show()** | **MIDDEL — FAIL** |
| **international-school-dashboard.html show()** | **MIDDEL — FAIL** |
| **international-student-dashboard.html show()** | **MIDDEL — FAIL** |
| **bbl-hub.html goView()** | **MIDDEL — FAIL** |
| match-dashboard.html switchTab | PASS-effectief — innerHTML rerender reset scroll |

### CHECK I7 — Form state op tab-switch

7 dashboards PRESERVED (CSS-class toggle, DOM blijft).

| File | Verdict |
|---|---|
| **match-dashboard.html switchTab (3071)** | **MIDDEL — RESET. innerHTML rerender vernietigt unsaved form-state** |

---

## TOP 20 FIXES (gesorteerd op impact)

1. **HOOG — A5** — White-on-#FF7E42 contrast 2.7:1 — fails WCAG AA. Affects every primary CTA. Donker-orange of donker-bg achter wit. Single CSS-fix met enorme impact. → [css/style.css:365](css/style.css#L365)

2. **HOOG — N4** — auth.html:983,988,992,994 → vervang `window.location.href = X` door `window.location.replace(X)`. Browser-back flasht anders kort terug naar login. → [auth.html:983-994](auth.html#L983)

3. **HOOG — E5/buddy** — saveBuddyProfile knop disable + text-state. → [buddy-dashboard.html:474](buddy-dashboard.html#L474) + [js/buddy.js:767](js/buddy.js#L767)

4. **HOOG — E5/begeleider** — saveProfiel knop disable + text-state. → [begeleider-dashboard.html:644](begeleider-dashboard.html#L644) + [:989](begeleider-dashboard.html#L989)

5. **HOOG — U2** — rejectMatch en declineRequest hebben geen confirm. Eén foute klik = afgewezen + notificatie verstuurd. → [company-dashboard.html:2003](company-dashboard.html#L2003) + [mijn-berichten.html:487](mijn-berichten.html#L487)

6. **HOOG — N3** — Vacature motivatie-modal en begeleider ud-modal sluiten niet op Escape. Voeg keydown-listener toe. → [vacature-detail.html:847](vacature-detail.html#L847) + [begeleider-dashboard.html:1311](begeleider-dashboard.html#L1311)

7. **HOOG — E1/bbl-hub** — `notify('Toelichting opgeslagen')` afgevuurd ook bij DB-error. Verplaats notify naar success-pad. → [bbl-hub.html:1810](bbl-hub.html#L1810)

8. **HOOG — E1/matches** — match aanmaken silent on insert error → student ziet false success. → [matches.html:534](matches.html#L534)

9. **HOOG — E1/match-dashboard meetings** — 7 fire-and-forget meeting flow catches (5400-5760). Meeting state of counterparty notif kan stuk gaan zonder toast. → [match-dashboard.html:5400-5760](match-dashboard.html#L5400-L5760)

10. **HOOG — E1/school referrals** — school_referral notif batch silent → bedrijven krijgen geen melding. → [school-dashboard.html:1920](school-dashboard.html#L1920)

11. **HOOG — N1** — spelregels back-link `<a href="#" onclick="history.back();return false">` zonder fallback bij deep-link. → [spelregels.html:422](spelregels.html#L422)

12. **MIDDEL — F5** — auth.html login/register/reset gebruiken `<div>` ipv `<form>`. Enter triggert geen submit. → [auth.html:514-714](auth.html#L514-L714)

13. **MIDDEL — A3** — auth.html `<label>` zonder `for=` attribute, inputs zonder id-match. SR-users krijgen geen associatie. → [auth.html:516-637](auth.html#L516-L637)

14. **MIDDEL — A4** — Geen modal focus restore in hele codebase. Toevoegen `previouslyFocused` patroon in openModal/closeModal. → [company-dashboard.html:1453-1474](company-dashboard.html#L1453)

15. **MIDDEL — I6** — 7 dashboards scrollen niet naar top bij tab-switch. Eén `window.scrollTo(0,0)` in elke `show()`/`goView()`. → company/school/begeleider/admin/intl-*/bbl-hub

16. **MIDDEL — I7** — match-dashboard switchTab destroys unsaved form-state. Beware bij meeting-modal of stage-plan editor. → [match-dashboard.html:3071](match-dashboard.html#L3071)

17. **MIDDEL — M4** — `.form-input { font-size: .92rem }` overschrijft global 16px → iOS zoom. Verhogen naar 16px. → [css/style.css:1660](css/style.css#L1660)

18. **MIDDEL — I2** — match-dashboard notif-tekst, CSV-export en PDF-export tonen raw yyyy-mm-dd. Wrap in `formatNLDate()`. → [match-dashboard.html:5758, 5896-5897, 6159-6160](match-dashboard.html#L5758)

19. **MIDDEL — F4** — Postcode-inputs hebben geen oninput-normalisatie (alleen on save). UX hint. → bbl-profile, buddy-dashboard, company-dashboard

20. **LAAG — I4** — company-discover.html:503 + school-dashboard.html:1457 crashen op `null` naam. Trek shared `getInitials()` helper in utils.js met null-guard + tussenvoegsel-handling.

---

## KLAAR VOOR LIVETEST?

### 🟠 ORANJE

**Geen behavioral KRITIEK gevonden** — geen functie is volledig stuk, geen pagina onbereikbaar, geen data-loss vector geïdentificeerd buiten de eerder gerapporteerde security-items.

**Maar voor production launch nog steeds ROOD totdat aangepakt:**

1. **Color contrast WCAG AA failure** op alle primary CTAs — niet acceptabel voor publieke launch. Eén CSS-fix lost het op (donker-orange varia of donker-bg achter wit).
2. **Open KRITIEKE security-items** uit SECURITY_AUDIT_2026-05-01.md (K1 trust_score self-write, K2 self-verify, K3 role escalation, K4 mollie-webhook signature) blijven onveranderd open — die blokkeren livetest meer dan deze behavioral findings.
3. **Twee double-submit gaten** (buddy + begeleider save) — niet kritiek (upsert is idempotent) maar leidt tot dubbele notify + dubbele showOverzicht.
4. **2 destructieve acties zonder confirm** (rejectMatch, declineRequest) — single-click consequence is groot, makkelijk te misklikken.

**Voor begeleide livetest met friendly users: 🟠 OK**, mits:
- Color contrast fix doorgevoerd (1 CSS-edit)
- 4 KRITIEK security items uit vorige audit gefixt eerst
- Top-5 HOOG behavioral fixes hierboven (#1-#5) doorgevoerd

**Voor publieke launch: nu nog 🔴 ROOD** — top-20 hierboven minimaal aanpakken, plus security-items.

**Realistisch tijdspad voor 🟢 GROEN:**
- Top-5 HOOG behavioral: ~3 uur
- Color contrast fix: ~30 min
- 4 KRITIEK security items (uit andere audit): ~4 uur
- Resterende HOOG (~7 items rond silent catches in meeting/match flow): ~4 uur

Totaal: ~12 uur development om naar 🟢 te komen.

---

## Bestanden geanalyseerd
40 .html files in project root (exclusief BACKUP/ en _revamp_2026-04-29/) + js/utils.js, js/buddy.js, js/calendar.js, js/swipes.js, js/milestones.js, js/account.js, js/toast.js, js/telemetry.js, css/style.css.

## Audit-methodologie
5 parallelle read-only sub-agents per reeks-cluster. Elke agent grep'te brede patronen en sampled concrete file:line bewijzen. Bevindingen samengevoegd in dit rapport zonder modificaties aan de codebase.
