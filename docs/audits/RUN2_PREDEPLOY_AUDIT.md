# RUN2 PRE-DEPLOY AUDIT
**Datum** 2026-05-04 · **Modus** READ-ONLY · **Geen patches**

Diep code-review van de RUN2 buddy-profile coupled set: js/buddy.js (1399), js/avatar.js (148), js/profileView.js (179), js/welcome-overlay.js (403). Doel: bugs en deploy-blockers vinden vóór FTP.

---

## Sectie 1 — js/buddy.js review

### Bovenkant (regel 1-460)

**Wat de file doet:** centrale module voor het buddy-systeem (gepensioneerd-only sinds sprint 29 april). State in `BuddyModule`-singleton. Realtime-subscribe op buddy_requests + buddy_pairs. Standaard CRUD: send/accept/decline/end pair. INSERT op buddy_requests + buddy_pairs + notifications.

**Bevindingen:**

| # | Locatie | Bevinding | Severity |
|---|---|---|---|
| B-1 | [js/buddy.js:309](js/buddy.js#L309) | Hardcoded message "Een BBL-student bij jouw leerbedrijf wil een anonieme buddy-koppeling" wordt nooit bereikt — `BUDDY_CONFIG.gepensioneerd.anonymous = false`, dus de `config.anonymous`-tak is dead-code residue van verwijderde types (insider/peer/mentor). | low |
| B-2 | [js/buddy.js:360](js/buddy.js#L360) | `reveal_after: null` met comment "set externally for 'insider' type" — 'insider' is verwijderd, comment is verouderd. | low |
| B-3 | [js/buddy.js:379-384](js/buddy.js#L379-L384) | `if (req.type !== 'insider')` — dead-code conditional. 'insider' bestaat niet meer. Werkt nog (true voor alle gepensioneerd), maar misleidend bij lezing. | low |
| B-4 | [js/buddy.js:156-159](js/buddy.js#L156-L159) | `loadPairs` console.error + silent return zonder notify. P5: silent failure. Acceptabel als graceful-degradation (achtergrond-load), niet kritiek. | low |
| B-5 | [js/buddy.js:190-193](js/buddy.js#L190-L193) | Idem `loadPendingRequests`. | low |

**INSERT relation-column-checks (Build-regel 2):**
- buddy_requests INSERT regel 290 → `requester_id`, `receiver_id`, `type`, `message`, `status` ✓
- buddy_pairs INSERT regel 354-360 → `requester_id`, `receiver_id`, `type`, `status`, `reveal_after` ✓
- conversations INSERT regel 382 → `buddy_pair_id` ✓
- buddy_pairs/UPDATE regel 440 → `status`, `ended_at` ✓
- notifications INSERT regel 462 → `user_id`, `type`, `ref_id`, `ref_type`, `message`, `read` ✓

**Geen ontbrekende relation-columns gevonden.**

---

### Midden (regel 460-840)

**Wat de file doet:** render-helpers (pair-card, requests-panel, request-widget), navigation, orchestration (buddyHandleRequest met btn-disable mutex), buddyShowToast, RUN2 buddy-profile flow (load/populate/save/showOverzicht/showForm).

**Bevindingen:**

| # | Locatie | Bevinding | Severity |
|---|---|---|---|
| **B-6** | **[js/buddy.js:669-672](js/buddy.js#L669-L672)** | **`loadBuddyProfile` SELECT mist `pitch`, `achtergrond`, `bio`, `avatar_key`.** Alleen `kennis_gebieden, specialiteiten, grove_beschikbaarheid, postcode, stad, leeftijd, active` worden geselecteerd. Maar `populateBuddyProfile` (regel 688-695) zet wel deze 4 nieuwe velden op het form. Resultaat: bij eerste pagina-load worden de RUN2-velden NIET pregevuld — gebruiker ziet lege velden ondanks dat hij al pitch/bio/achtergrond heeft opgeslagen. Save/re-fetch (regel 818-820) heeft wel de juiste select-set, dus na save werkt het wel. | **high** |
| B-7 | [js/buddy.js:614-617](js/buddy.js#L614-L617) | `JSON.stringify(context)` op `buddy_queue.context`-kolom. Als die kolom `jsonb` is, slaat supabase-js automatisch JSON op zonder stringify — manual stringify levert dan een dubbel-encoded JSON-string in de jsonb (of een type-error). Schema-verificatie nodig. | medium |
| B-8 | [js/buddy.js:734-746](js/buddy.js#L734-L746) | `collectBuddyProfileData` — `talen`, `foto_url`, `open_to_international` worden in saveBuddyProfile re-fetch SELECT'd (regel 820) maar NIET door collect-functie verzameld. Dus die kolommen worden alleen gewijzigd door externe paths. Niet kritiek, maar inconsistent: re-fetch leest velden die nooit door deze flow geschreven worden. | low |
| B-9 | [js/buddy.js:827-828](js/buddy.js#L827-L828) | Naam-fallback uit profiles als buddy_profiles.naam null. Goed defensief patroon. ✓ | — |
| B-10 | [js/buddy.js:752-783](js/buddy.js#L752-L783) | `showBuddyOverzicht` heeft fallback voor missing `renderProfileView` (regel 776-782 toont alleen form). ✓ Goed. | — |

**DOM-refs in buddy.js die mogelijk ontbreken in HTML:**
- `#buddy-profile-form` — bestaat in buddy-dashboard.html (parent van #buddy-profile-form-card) ✓
- `#bp-pitch`, `#bp-achtergrond`, `#bp-bio` — niet geverifieerd in HTML, defensive null-checks aanwezig
- `#buddy-profile-saved-view`, `#buddy-profile-form-card` — bevestigd aanwezig (vorige audit)
- `#buddy-profile-overzicht` — backwards-compat hide-target, optioneel
- `#buddy-seekers-section`, `#buddy-deck-loading`, `#buddy-deck-wrap`, `#buddy-deck-actions`, `#buddy-deck-counter`, `#buddy-deck-empty`, `#buddy-deck-done`, `#buddy-seekers-list`, `#buddy-seekers-empty` — niet geverifieerd, alle calls hebben null-guard

---

### Onderkant (regel 840-1399)

**Wat de file doet:** RUN2 buddy → student discovery (`fetchBuddySeekers`, `loadBuddySeekers`, `buddyRequestStudent`, `buddySkipStudent`), full swipe-deck UI engine met drag/touch, AbortController-cleanup, mutex voor double-tap.

**Bevindingen:**

| # | Locatie | Bevinding | Severity |
|---|---|---|---|
| B-11 | [js/buddy.js:843-871](js/buddy.js#L843-L871) | `fetchBuddySeekers` heeft een nette try/catch fallback voor het ontbreken van `avatar_key`-kolom op student_profiles. Goed defensief patroon — werkt vóór én na AVATAR_MIGRATION.sql. ✓ | — |
| B-12 | [js/buddy.js:856](js/buddy.js#L856) | `.eq('zoekt_buddy', true)` — kolom `zoekt_buddy` zit in BACKLOG_MIGRATION.sql. Als die niet gedraaid is: query gooit error, valt in catch maar SELECT zonder `avatar_key` heeft hetzelfde `zoekt_buddy`-filter, dus 2e poging faalt ook. fetchBuddySeekers retourneert dan `[]` — silent empty. | medium |
| B-13 | [js/buddy.js:954-968](js/buddy.js#L954-L968) | `if (typeof createNotification === 'function')` defensive guard rond notificatie-insert. Op pagina's met utils.js geladen is dit altijd true; defensive maar redundant. ✓ Niet schadelijk. | — |
| B-14 | [js/buddy.js:1077-1078](js/buddy.js#L1077-L1078) | `_esc = typeof escapeHtml === 'function' ? escapeHtml : s => String(s ?? '')` — defensive escapeHtml fallback. Goede robustheid. ✓ | — |
| B-15 | [js/buddy.js:1100-1226](js/buddy.js#L1100-L1226) | `_buildDeckCard` gebruikt veel inline-style. Werkt, maar drift-risico bij maintenance. Niet kritiek. | low |
| B-16 | [js/buddy.js:1254-1291](js/buddy.js#L1254-L1291) | `_deckOnEnd` — drag-detection werkt met threshold 75. Touchstart/mousedown gescheiden — geen pointer-events fallback. Werkt op moderne browsers. ✓ | — |

**TODO/FIXME/XXX-comments:** geen gevonden in js/buddy.js.

**Try/catch zonder fallback notify:** B-4, B-5 zijn silent console-only voor achtergrond-loads. `deckAction` (regel 1361) heeft console-only error voor swipe-actie — gebruiker ziet swipe-animation gaan, geen toast bij DB-fout. Acceptabel maar niet ideaal.

---

## Sectie 2 — js/avatar.js review

**Wat de file doet:** definieert 14 vaste avatars met SVG-paths, exports `INTERNLY_AVATARS`, `getAvatarSvg(key, fallbackName, size)`, `renderAvatarPicker(containerId, currentKey, onChange)`. CSS injection on demand. State op `window._internlyAvatarKey`.

**Bevindingen:**

| # | Locatie | Bevinding | Severity |
|---|---|---|---|
| A-1 | [js/avatar.js:23-38](js/avatar.js#L23-L38) | 14 avatars compleet met key/label/bg/fg/shape. ✓ | — |
| A-2 | [js/avatar.js:40](js/avatar.js#L40), [76](js/avatar.js#L76), [147](js/avatar.js#L147), [148](js/avatar.js#L148) | Window-exports correct: `INTERNLY_AVATARS`, `getAvatarSvg`, `renderAvatarPicker`, `_internlyAvatarKey`. ✓ | — |
| A-3 | [js/avatar.js:55](js/avatar.js#L55) | `'duo'`-shape: `<circle fill="${fg === '#FF7E42' ? '#FF7E42' : fg}" ...>` — tautologie. Returnt altijd `fg`. Cosmetic dead-code, geen functioneel issue. | low |
| A-4 | [js/avatar.js:69-72](js/avatar.js#L69-L72) | Fallback voor onbekende avatar_key: initials-div met inline escapeHtml-replace. Werkt zonder window.escapeHtml-dependency. ✓ | — |
| A-5 | [js/avatar.js:80](js/avatar.js#L80) | CSS-injection guard via `getElementById('avatar-css')`. ✓ idempotent. | — |
| A-6 | [js/avatar.js:144](js/avatar.js#L144) | Picker UI werkt zonder DB-roundtrip — pure DOM met onChange-callback. ✓ | — |

**TODO/FIXME/XXX-comments:** geen gevonden.
**Module-export structuur correct:** ✓
**14 vaste avatars compleet gedefinieerd:** ✓
**Picker UI werkt zonder DB-roundtrip:** ✓
**Fallback voor onbekende avatar_key:** ✓ (initials)

---

## Sectie 3 — js/profileView.js review

**Wat de file doet:** rol-aware saved-view profielkaart renderer. Config-tabel `PROFILE_VIEW_CONFIGS` met `gepensioneerd` en `student` rollen. Hoofdfunctie `renderProfileView(profile, role, container, opts)`.

**Bevindingen:**

| # | Locatie | Bevinding | Severity |
|---|---|---|---|
| P-1 | [js/profileView.js:64](js/profileView.js#L64) | Signature `(profile, role, container, opts)` — komt overeen met buddy.js call regel 762: `renderProfileView(buddyProfile, 'gepensioneerd', savedContainer, {matchesCount, onEdit})`. ✓ | — |
| P-2 | [js/profileView.js:9-29](js/profileView.js#L9-L29) | Rol-config `gepensioneerd` compleet: accentColor, roleLabel, avatar, name/location/tagline-fields, 2 stats, 3 sections. ✓ Mapped correct op buddy_profiles-velden (avatar_key, naam, stad, pitch, grove_beschikbaarheid, kennis_gebieden, achtergrond, bio). | — |
| P-3 | [js/profileView.js:30-50](js/profileView.js#L30-L50) | Rol-config `student` aanwezig met andere veldnamen (skills, motivatie, beschrijving). Niet gebruikt door buddy.js, maar voorbereid voor toekomstige integratie. | — |
| P-4 | [js/profileView.js:51](js/profileView.js#L51) | Comment `// Toekomstig: company, school` — andere rollen ontbreken. fallback regel 66-69: `console.warn` + return. Geen runtime-error, maar als andere rol per ongeluk wordt doorgegeven blijft saved-view leeg. | low |
| P-5 | [js/profileView.js:64-79](js/profileView.js#L64-L79) | Defensieve checks op config, container, profile. Profile-empty rendert "Profiel nog niet ingevuld." ✓ | — |
| P-6 | [js/profileView.js:95-101](js/profileView.js#L95-L101) | Avatar fallback: `if (key && typeof window.getAvatarSvg === 'function')` met initials-fallback. ✓ Werkt ook zonder avatar.js geladen. | — |
| P-7 | [js/profileView.js:100, 111, 117, ...](js/profileView.js#L100) | `escapeHtml(...)` zonder `window.`-prefix. Vereist utils.js geladen vóór deze functie wordt aangeroepen. **Load-order in buddy-dashboard.html: utils.js (23) → profileView.js (28) → buddy.js (31).** ✓ Correcte volgorde. | — |
| P-8 | [js/profileView.js:178-179](js/profileView.js#L178-L179) | `window.renderProfileView`, `window.PROFILE_VIEW_CONFIGS` exported. ✓ | — |

**Dependencies correct gehandhaafd:**
- `window.getAvatarSvg` — defensive guard ✓
- `escapeHtml` (uit utils.js) — vereist load-order, **OK in buddy-dashboard.html** maar als deze module elders wordt geladen zonder utils.js: ReferenceError op call-time

**TODO/FIXME:** geen gevonden.

---

## Sectie 4 — js/welcome-overlay.js review

**Wat de file doet:** eenmalige welkom-overlay na eerste login per user. Flag in localStorage `internly_welcomed_<userId>`. Configs voor 7 rollen: student, student_bbl, student_international, bedrijf, school, begeleider, gepensioneerd.

**Bevindingen:**

| # | Locatie | Bevinding | Severity |
|---|---|---|---|
| W-1 | [js/welcome-overlay.js:280](js/welcome-overlay.js#L280) | Signature `maybeShowWelcomeOverlay(userId, role, naam, flags)` — matcht alle 10 invocations. ✓ | — |
| W-2 | [js/welcome-overlay.js:281](js/welcome-overlay.js#L281), [285](js/welcome-overlay.js#L285), [289](js/welcome-overlay.js#L289) | Drie silent returns: geen userId, al getoond, of unknown role. Acceptabel patroon voor opt-in feature. | low |
| W-3 | [js/welcome-overlay.js:226-233](js/welcome-overlay.js#L226-L233) | `_resolveWelcomeKey` — student + flags → student_bbl/student_international/student. Andere rollen pass-through. ✓ Logica correct gemapped op de invocations. | — |
| W-4 | [js/welcome-overlay.js:12-223](js/welcome-overlay.js#L12-L223) | 7 rol-configs aanwezig: student, student_bbl, student_international, bedrijf, school, begeleider, gepensioneerd. Elk met emoji, heading, sub, btn-color, 3 actions, 4 features. | — |
| W-5 | [js/welcome-overlay.js:284](js/welcome-overlay.js#L284) | localStorage-flag `internly_welcomed_<userId>` — persistent across sessions, eenmalig per user. ✓ | — |
| W-6 | [js/welcome-overlay.js:392-399](js/welcome-overlay.js#L392-L399) | `_wDismiss` met fade-out animation + setTimeout cleanup. ✓ | — |
| W-7 | [js/welcome-overlay.js:401-403](js/welcome-overlay.js#L401-L403) | Window-exports: `maybeShowWelcomeOverlay`, `_wDismiss`. `_wDismiss` is exposed omdat onclick-attributes het direct aanroepen (regel 238, 262, 371). ✓ | — |
| W-8 | [js/welcome-overlay.js:307-381](js/welcome-overlay.js#L307-L381) | Inline-style overlay met inline event-handlers. Werkt, maar `_wDismiss('${userId}')` interpoleert userId in onclick — als userId per ongeluk een single-quote bevat: XSS / parse-error. UUID's bevatten geen quotes, dus veilig in praktijk. | low |
| W-9 | [js/welcome-overlay.js:1-9](js/welcome-overlay.js#L1-L9) | Header-comment zegt "Geen wijzigingen aan auth.html / roles.js / utils.js". ✓ Module is volledig stand-alone — geen dependencies. | — |

**Dependencies en fallbacks:** geen externe dependencies. Pure DOM-injectie. ✓

**TODO/FIXME:** geen gevonden.

---

## Sectie 5 — Cross-page welcome-overlay rol-mapping

**Grep:** `maybeShowWelcomeOverlay|showWelcomeOverlay` over alle .html

| Pagina | Doorgegeven role | Flag | Resolved key | Config bestaat? |
|---|---|---|---|---|
| [buddy-dashboard.html:1358](buddy-dashboard.html#L1358) | `'gepensioneerd'` | `null` | `gepensioneerd` | ✓ |
| [company-dashboard.html:3420](company-dashboard.html#L3420) | `'bedrijf'` | `null` | `bedrijf` | ✓ |
| [school-dashboard.html:2567](school-dashboard.html#L2567) | `'school'` | `null` | `school` | ✓ |
| [begeleider-dashboard.html:1308](begeleider-dashboard.html#L1308) | `'begeleider'` | `null` | `begeleider` | ✓ |
| [bbl-profile.html:731-733](bbl-profile.html#L731-L733) | `'student'` | `{bbl:true, international:false}` | `student_bbl` | ✓ |
| [bbl-hub.html:2552-2554](bbl-hub.html#L2552-L2554) | `'student'` | `{bbl:true, international:false}` | `student_bbl` | ✓ |
| [discover.html:1477-1479](discover.html#L1477-L1479) | `'student'` | `{bbl:false, international:<conditional>}` | `student` of `student_international` | ✓ |
| [international-student-dashboard.html:1151-1153](international-student-dashboard.html#L1151-L1153) | `'student'` | `{bbl:false, international:true}` | `student_international` | ✓ |
| [match-dashboard.html:2900-2904](match-dashboard.html#L2900-L2904) | `'student'` | `null` | `student` | ✓ (gegate door `mappedRole === 'student'`) |
| [student-profile.html:1678-1682](student-profile.html#L1678-L1682) | `'student'` | `null` | `student` | ✓ |

**Alle 10 invocations matchen een bestaande config.** ✓

**Script-tag inclusie van welcome-overlay.js:** alle 10 pagina's hebben `<script src="js/welcome-overlay.js">` op regel ~20-65. ✓

---

## Sectie 6 — Cross-file consistency

**Functies die buddy.js van profileView.js aanroept:**
- `renderProfileView` → bestaat ✓ ([js/profileView.js:64](js/profileView.js#L64))
- `PROFILE_VIEW_CONFIGS` → wordt niet direct gelezen door buddy.js ✓

**Functies die buddy.js van avatar.js aanroept:**
- buddy.js gebruikt `window._internlyAvatarKey` (regel 725, 802) — staat geëxporteerd in [js/avatar.js:148](js/avatar.js#L148) ✓
- buddy.js gebruikt geen `getAvatarSvg` of `renderAvatarPicker` direct — die worden door HTML init-flow aangeroepen

**Globale window-vars cross-file:**

| Variable | Geschreven door | Gelezen door |
|---|---|---|
| `window._internlyAvatarKey` | avatar.js (init `null`, picker-callback updates) | buddy.js (saveBuddyProfile + prefillBuddyForm) ✓ |
| `window.INTERNLY_AVATARS` | avatar.js | (extern via picker) ✓ |
| `window.getAvatarSvg` | avatar.js | profileView.js (defensive guard) ✓ |
| `window.renderProfileView` | profileView.js | buddy.js (defensive `typeof === 'function'`) ✓ |
| `window.maybeShowWelcomeOverlay` | welcome-overlay.js | 10 HTML-pagina's (defensive guards) ✓ |
| `window._wDismiss` | welcome-overlay.js | inline onclick attributes in eigen overlay ✓ |
| `window.BUDDY_PAIRS_COUNT` | buddy-dashboard.html init-script (verondersteld) | buddy.js regel 753 — `|| 0` fallback dus geen crash ✓ |
| `window.prefillBuddyForm` | buddy.js regel 727 | (extern via init-flow) — niet zichtbaar geverifieerd waar het wordt aangeroepen |
| `window.showBuddyOverzicht`, `window.showBuddyForm` | buddy.js regel 1398-1399 | (extern via init-flow) ✓ |

**Geen ontbrekende exports of dangling references gevonden.**

---

## Sectie 7 — Conclusie

**Classificatie: MINOR-FIX-NODIG**

Eén echte bug die deploy zou blokkeren (B-6: `loadBuddyProfile` SELECT mist 4 RUN2-velden) en één SQL-vraag (B-7: jsonb-encoding op buddy_queue.context). De rest is residue-cosmetica, defensieve patronen die werken, of dead-code van verwijderde buddy-types.

### Issue-lijst (gesorteerd op severity)

| # | Bestand:regel | Probleem | Voorgestelde fix | Severity |
|---|---|---|---|---|
| **B-6** | [js/buddy.js:669-672](js/buddy.js#L669-L672) | `loadBuddyProfile` SELECT mist `pitch`, `achtergrond`, `bio`, `avatar_key` — RUN2-velden worden niet geladen bij eerste pagina-render | Voeg de 4 kolommen toe aan de SELECT-clause | **high** |
| **(infra)** | (geen bestand) | `buddy_profiles` SQL-migratie voor `pitch`, `achtergrond`, `bio`, `avatar_key` ontbreekt in beide MIGRATION.sql files (al gevlagd in vorige audit) | Schrijf `BUDDY_PROFILE_RUN2_MIGRATION.sql` of voeg toe aan BACKLOG_MIGRATION.sql | **high** |
| B-7 | [js/buddy.js:614-617](js/buddy.js#L614-L617) | `JSON.stringify(context)` op `buddy_queue.context` — als kolom jsonb is, dubbel-encoding | Verifieer schema; verwijder JSON.stringify als jsonb | medium |
| B-12 | [js/buddy.js:856](js/buddy.js#L856) | `.eq('zoekt_buddy', true)` — als BACKLOG_MIGRATION.sql niet gedraaid: silent empty-list (zowel try als catch falen) | Run BACKLOG_MIGRATION.sql voor deploy | medium |
| W-2 | [js/welcome-overlay.js:289](js/welcome-overlay.js#L289) | Silent return op unknown role | Acceptabel; voeg eventueel `console.warn` toe voor toekomstige debugging | low |
| P-4 | [js/profileView.js:51](js/profileView.js#L51) | Andere rollen (company, school, bbl, begeleider, intl) ontbreken in PROFILE_VIEW_CONFIGS | Niet voor deze deploy — alleen gepensioneerd is in scope | low |
| B-1 | [js/buddy.js:309](js/buddy.js#L309) | Hardcoded BBL-message in dead-code tak (config.anonymous = false) | Verwijder de `config.anonymous` ternary, alleen non-anonymous-pad behouden | low |
| B-2 | [js/buddy.js:360](js/buddy.js#L360) | Comment over 'insider' verouderd | Update comment of verwijder | low |
| B-3 | [js/buddy.js:379-384](js/buddy.js#L379-L384) | `if (req.type !== 'insider')` dead-code | Verwijder conditional, conversation-insert altijd uitvoeren | low |
| B-4, B-5 | [js/buddy.js:156, 190](js/buddy.js#L156) | Silent console.error in achtergrond-loads | Acceptabel; eventueel `notify('Buddy-data laden mislukt — ververs')` toevoegen | low |
| B-8 | [js/buddy.js:734-746](js/buddy.js#L734-L746) | Inconsistentie in collect vs select: re-fetch leest `talen, foto_url, open_to_international` die collect niet schrijft | Verwijder uit re-fetch SELECT of voeg toe aan collect | low |
| B-15 | [js/buddy.js:1100-1226](js/buddy.js#L1100-L1226) | Inline-styles in deck-card | Acceptabel voor RUN2-scope, refactor later naar CSS | low |
| A-3 | [js/avatar.js:55](js/avatar.js#L55) | `fg === '#FF7E42' ? '#FF7E42' : fg` — tautologie | Vervang door `fg` | low |
| W-8 | [js/welcome-overlay.js:307-381](js/welcome-overlay.js#L307-L381) | userId-interpolatie in onclick — XSS-veilig in praktijk maar niet by-design | Vervang `onclick="..."` door event-listeners (nice-to-have) | low |

### Aanbeveling

**Voor 11 mei livetest deploy:**

Alleen de twee high-severity issues moeten geadresseerd worden:

1. **B-6 fix:** SELECT in `loadBuddyProfile` uitbreiden met de 4 RUN2-velden.
2. **SQL aanvulling:** `BUDDY_PROFILE_RUN2_MIGRATION.sql` maken en in Supabase draaien.

Daarna run-status: KLAAR.

De medium-severity issues (B-7 jsonb, B-12 zoekt_buddy migration) zijn afhankelijk van of de migraties al gedraaid zijn — als Barry bevestigt dat AVATAR_MIGRATION.sql + BACKLOG_MIGRATION.sql gedraaid zijn, is B-12 vanzelf opgelost.

**Low-severity opruimwerk** (B-1, B-2, B-3, B-8, A-3) is post-livetest tech-debt — niet deploy-blocker, wel waard om in een latere refactor-pass te bundelen.

**FTP-blocker:** alleen B-6. Eén SELECT-clause uitbreiding.
