# Run 3 — mijn-berichten rol-aware + avatar sweep
Datum: 1 mei 2026
Voorwaarden: Run 1 succesvol (`renderRoleHeader` aanwezig). Run 2 niet vereist (raakt geen buddy-dashboard files).

## Resultaat

| Stap | Status | Bestand(en) |
|---|---|---|
| 1 — `requireRole` verruiming naar `'student','gepensioneerd'` | APPLIED | [mijn-berichten.html:806](mijn-berichten.html#L806) |
| 2 — `renderRoleHeader` vervangt `renderStudentHeader` | APPLIED | [mijn-berichten.html:834-841](mijn-berichten.html#L834-L841) |
| 3 — Rol-aware queries + UI guards | APPLIED | [mijn-berichten.html:551-552, 565-590](mijn-berichten.html#L551-L590) |
| 4 — Avatar display-sweep (3 locaties) | APPLIED | mijn-berichten.html, chat.html, match-dashboard.html |
| 5 — `renderStudentHeader` callers inventaris | DONE | (rapport-only, zie hieronder) |

### Pre-condities geverifieerd
- `requireRole(...allowedRoles)` accepteert al rest-args ([js/utils.js:125](js/utils.js#L125)) — geen wijziging nodig in utils.js.
- `renderRoleHeader` heeft backwards-compat fallback naar `#student-header` container ([js/utils.js:476-481](js/utils.js#L476-L481)) — `mijn-berichten.html` heeft `<div id="student-header">` op [:233](mijn-berichten.html#L233), dus container blijft werken zonder rename.

### Per-stap detail

**STAP 1 — Role-guard verruiming**
- [mijn-berichten.html:806](mijn-berichten.html#L806): `requireRole('student')` → `requireRole('student', 'gepensioneerd')`.
- Direct daarna een eigen profile-fetch om de rol op te slaan in `window.__currentRole`, plus `window.__currentUser = { id, naam }`, plus `document.body.dataset.role = userRole`. Dit zet de body-attribute zodat eventuele rol-specifieke CSS (bv. paarse buddy-tint via `body[data-role="gepensioneerd"]`) automatisch werkt.
- BBL-check is nu rol-aware: `_isBBL = false` voor non-students (geen onnodige `student_profiles` query voor buddies).

**STAP 2 — Header rendering**
- [mijn-berichten.html:834-841](mijn-berichten.html#L834-L841): `await renderRoleHeader(userRole, 'berichten', { profile: { naam } })`. Met `if (typeof ... === 'function')` guard.
- **Fallback** naar oude `renderStudentHeader` indien `renderRoleHeader` om welke reden dan ook niet geladen is (defensief — Run 1 dependency).
- Container-id niet hernoemd: `student-header` blijft, `renderRoleHeader` herkent het via z'n eigen fallback.

**STAP 3 — Rol-aware queries + UI guards**
- Bestaande queries (matches, pendingReqs, buddyPairs, anyBegeleider) zijn **al rol-agnostisch** — ze filteren op `party_a/party_b/student_id/buddy_id .eq. ${uid}`. Voor buddies: matches/pendingReqs leveren leeg op (buddies komen niet voor in `matches` tabel met begeleider-types), buddyPairs levert hun eigen pairs. **Geen query-aanpassing nodig.**
- **Wel toegevoegd**: `addBegeleiderLink` ([:551-552](mijn-berichten.html#L551-L552)) toont nu alleen voor BOL-studenten (`_isStudent && !_isBBL && !_hasBegeleider`). Buddies krijgen 'm niet meer.
- **Empty-state** ([:565-590](mijn-berichten.html#L565-L590)) is nu rol-aware:
  - Student: oorspronkelijke CTA's "Vind een stage" / "Vind een buddy" (+ optionele begeleider-knop)
  - Buddy: één CTA "Terug naar dashboard" + aangepaste sub-text "Zodra een student je verzoek accepteert verschijnen jullie gesprekken hier."

**STAP 4 — Avatar sweep**

`<script src="js/avatar.js">` toegevoegd op:
- [mijn-berichten.html:18](mijn-berichten.html#L18) (was niet geladen)
- [chat.html:16](chat.html#L16) (was niet geladen)
- [match-dashboard.html:18](match-dashboard.html#L18) (was niet geladen)

| Locatie | Voor | Na |
|---|---|---|
| [mijn-berichten.html:362](mijn-berichten.html#L362) `_convCardHtml` | `escapeHtml(avatarInitials(conv._otherName))` | `getAvatarSvg(conv._otherAvatarKey, conv._otherName, 'sm')` met fallback initialen |
| [mijn-berichten.html:425](mijn-berichten.html#L425) `renderRequests` | `escapeHtml(avatarInitials(r._fromName))` | `getAvatarSvg(r._fromAvatarKey, r._fromName, 'sm')` met fallback |
| [mijn-berichten.html:558, 651](mijn-berichten.html#L558) data-flow | (geen) | `_fromAvatarKey` in enrichedReqs + `_otherAvatarKey` in `_allConvs` |
| [chat.html:1416-1427](chat.html#L1416-L1427) conversations-list render | initialen-only via inline `.split('').map(w[0])` | `getAvatarSvg(profile.avatar_key, profile.naam, 'md')` met fallback initialen |
| [match-dashboard.html:2907](match-dashboard.html#L2907) studentRes capture | `match.student.avatar` (initialen) only | `match.student.avatarKey = s.avatar_key` extra capture |
| [match-dashboard.html:3238](match-dashboard.html#L3238) Stagegegevens-card avatar | `match.student.avatar` (initialen) | `getAvatarSvg(avatarKey, name, 'md')` met fallback initialen |

**Niet aangepakt** ([chat.html:1002 SELECT](chat.html#L1002) chat-header): geselecteerd maar er is **geen avatar-element in de chat topbar** ([:454-458](chat.html#L454-L458) — alleen `topbar-match-name` en `topbar-match-sub`). Toevoegen vraagt nieuwe HTML-structuur — out-of-scope voor sweep, gemarkeerd voor latere run.

**Fallback-pattern** consistent: `(avatar_key && typeof getAvatarSvg === 'function') ? sticker : initialen`. Defensief — werkt ook als `js/avatar.js` faalt te laden of als `avatar_key` null is.

**STAP 5 — `renderStudentHeader` callers inventaris**

Pagina's die nog `renderStudentHeader` aanroepen (excl. fallback in mijn-berichten):

| Bestand | activeTab | Migratie-kandidaat? |
|---|---|---|
| [bbl-dashboard.html:583](bbl-dashboard.html#L583) | matches | NEE — BBL-student-only |
| [bbl-hub.html:2536](bbl-hub.html#L2536) | discover | NEE — BBL-student-only |
| [discover.html:1401](discover.html#L1401) | discover | NEE — student-only (vacatures-zoeker) |
| [matches.html:698](matches.html#L698) | matches | **POTENTIEEL** — `matches.html` zou ook bruikbaar kunnen zijn voor buddies om hun matches te zien. Vraagt eigen scoping. |
| [mijn-sollicitaties.html:825](mijn-sollicitaties.html#L825) | sollicitaties | NEE — BOL-only |
| [student-profile.html:1627](student-profile.html#L1627) | null | NEE — student profielform |

Geen acute migratie-noodzaak. Alleen [matches.html](matches.html) is een toekomstige mogelijkheid als Barry buddies hun matches in dezelfde view wil tonen.

## Onverwachte vondsten

1. **Conversation-queries zijn al rol-agnostisch** — hoefde STAP 3 niet inhoudelijk te raken voor de queries zelf, alleen voor UI-guards (begeleider-link, empty-state copy).
2. **`addBegeleiderLink`-bug** — vóór deze run zou een buddy de "+ Voeg begeleider toe" knop zien en kunnen klikken (een student-specifieke flow). Nu correct geguard op `_isStudent`.
3. **chat.html topbar heeft geen avatar-slot** — in [:454-458](chat.html#L454-L458) staan alleen naam en sub. De `avatar_key` SELECT op [:1002](chat.html#L1002) is dus dood-data tot er een UI-slot is. Niet gefixt deze run (vereist HTML-structuur-wijziging in topbar).
4. **`getAvatarSvg(key, fallbackName, size)` heeft size param** — niet gedocumenteerd in de instructie maar wel beschikbaar. Gebruikt `'sm'` (28px) voor list-items en `'md'` (44px) voor grotere card-avatars. Past bij bestaand size-systeem in [js/avatar.js:66-74](js/avatar.js#L66-L74).
5. **`renderStudentHeader` blijft in mijn-berichten als fallback** — bewust, defensief tegen Run 1 niet geladen scenario. Geen vervuiling want het is binnen een `else if (typeof ...)` guard.

## Smoke-test (verifieerbaar door Barry)

| Test | Verwachting |
|---|---|
| Login als `student1@internly.pro` → `mijn-berichten.html` | ✅ Werkt zoals voorheen, student-nav, conversations zichtbaar |
| Login als `buddy1@internly.pro` → `mijn-berichten.html` | ✅ requireRole laat door, geen redirect naar buddy-dashboard |
| Buddy ziet eigen pair-conversations | ✅ `buddy_pairs` query filtert correct op `buddy_id.eq.${uid}` |
| `body[data-role]` attr zichtbaar in DevTools | ✅ "student" of "gepensioneerd" zoals van toepassing |
| Top-nav rendert via `renderRoleHeader` | ✅ student → student-nav (7 items), buddy → buddy-nav (5 items) |
| Avatar in conv-card toont sticker als avatar_key gezet | ✅ via `getAvatarSvg` fallback-pattern |
| Avatar in request-card toont sticker | ✅ idem |
| Empty-state buddy: alleen "Terug naar dashboard" CTA | ✅ rol-aware copy |
| `+ Voeg begeleider toe` knop verborgen voor buddy | ✅ via `_isStudent` guard |
| chat.html conversations-list: avatar als sticker | ✅ via inline render-template fix |
| match-dashboard.html Stagegegevens-card: avatar als sticker | ✅ via `match.student.avatarKey` capture |
| Console clean op alle drie pagina's | ✅ — geen `getAvatarSvg is not defined` (nu via script-tag) |

## Andere `renderStudentHeader` callers (voor toekomst)

Eén potentiële migratie-kandidaat: **matches.html** — als Barry buddies hun match-overview wil laten zien. Vraagt:
- `requireRole('student', 'gepensioneerd')` op [:692](matches.html#L692) of vergelijkbaar
- `renderRoleHeader(role, 'matches', ...)` ipv `renderStudentHeader`
- Conversation-query check: zelfde uid-OR pattern werkt al voor buddy_pairs

Geen werk in deze run — alleen genoteerd voor latere consideratie.

## Klaar voor smoke-test door Barry

**Ja** — alle 4 functionele stappen APPLIED + 1 inventaris-stap DONE. Geen blockers. Buddy heeft nu volledige toegang tot mijn-berichten zonder dat student-specifieke features (begeleider-link) onterecht verschijnen. Avatar-sweep brengt 3 locaties (mijn-berichten / chat / match-dashboard) in lijn met de shared `getAvatarSvg`-helper.

**Open vraag**: chat.html topbar avatar — wel of niet toevoegen aan de topbar UI? Vereist HTML-structuur-wijziging (`<div class="topbar-match-avatar">` slot). Aanbeveling: aparte mini-run als Barry dit visueel wenst.
