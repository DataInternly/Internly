# BUDDY SWIPE RESEARCH — 1 mei 2026

## js/swipes.js

**Total line count:** 192 regels.

**Window exports (3):**

| Export | Signature | Lines |
|---|---|---|
| `window.swipesAcceptLike` | `async function(likeId)` — fetch original swipe, insert reciprocal `direction:'like'` swipe, notify match, removeCard | [js/swipes.js:101-130](js/swipes.js#L101) |
| `window.swipesPassLike` | `async function(likeId)` — removeCard immediately, fetch original swipe, insert `direction:'pass'` swipe (best-effort) | [js/swipes.js:134-154](js/swipes.js#L134) |
| `window.reloadIncomingLikes` | `async function()` — fetches incoming likes, filters out already-swiped-back, populates `#incoming-likes-list` | [js/swipes.js:158-189](js/swipes.js#L158) |

**Internal helpers (not exported):**
- `formatRelativeDate(iso)` — "Vandaag/Gisteren/N dagen/weken/maanden geleden"
- `fetchIncomingLikes(userId)` — query swipes table
- `renderIncomingLikeCard(like)` — HTML voor één kaart
- `removeCard(likeId)` — fade-out + auto-hide section if empty

**Tables queried:** alleen `swipes`. Drie locaties:
| Line | Operation | Filter |
|---|---|---|
| [js/swipes.js:23-29](js/swipes.js#L23) | SELECT in `fetchIncomingLikes` | `target_id=user AND direction='like'` (limit 20) |
| [js/swipes.js:105-109](js/swipes.js#L105) | SELECT in `swipesAcceptLike` | `id=likeId` (lookup original) |
| [js/swipes.js:116-121](js/swipes.js#L116) | INSERT in `swipesAcceptLike` | reciprocal like |
| [js/swipes.js:140-144](js/swipes.js#L140) | SELECT in `swipesPassLike` | `id=likeId` (lookup original) |
| [js/swipes.js:147-152](js/swipes.js#L147) | INSERT in `swipesPassLike` | pass record |
| [js/swipes.js:173-177](js/swipes.js#L173) | SELECT in `reloadIncomingLikes` | own swipes to filter pending |

**Geen** queries op `student_profiles`, `company_profiles`, `buddy_profiles`, `buddy_pairs`, of `buddy_requests`.

**Swipe deck / card stack:** **NEE.** `renderIncomingLikeCard()` is een **lijst-item** renderer, geen Tinder-style stack. Cards renderen verticaal in een container, geen swipe-gesture handling, geen z-stack, geen deck-rotatie animatie.

**Outgoing swipe logic:** **GEDEELTELIJK.** Module focust op *ontvangen* likes (incoming). Het schrijft wel outgoing swipes naar de DB (`swipesAcceptLike` schrijft een reciprocal like, `swipesPassLike` schrijft een pass), maar alleen **als reactie op een ontvangen like** — niet als pro-actieve discovery. Geen functie die zegt "haal student-X op en stel voor om te swipen".

**HTML element IDs targeted:**
| ID | Operation | Line |
|---|---|---|
| `incoming-likes-list` | innerHTML populated met cards | 159, 165, 186-188 |
| `incoming-likes-section` | display:'block' / 'none' show/hide | 93, 183-184 |
| `ilc-${likeId}` | per-card unique ID for fade-removal | 48, 84 |

**zoekt_buddy referenced:** **NO.** Module heeft geen kennis van het veld.

**Swipe right vs left handling:**
- **Accepteren-knop** (visueel "swipe right"): `swipesAcceptLike(likeId)` → INSERT reciprocal `direction:'like'` → toast "Match geaccepteerd!"
- **Overslaan-knop** (visueel "swipe left"): `swipesPassLike(likeId)` → removeCard direct (optimistic UI) → INSERT `direction:'pass'` (fire-and-forget)

**Geen daadwerkelijke gesture-detection** — pure button-clicks.

---

## buddy_requests schema

**Source:** [internly_migration.sql:215-223](internly_migration.sql#L215)

| Kolom | Type | Default | Constraint |
|---|---|---|---|
| `id` | uuid | `uuid_generate_v4()` | PK |
| `requester_id` | uuid | — | FK → profiles(id) |
| `receiver_id` | uuid | — | FK → profiles(id) |
| `type` | text | — | (vrije waarde — geen CHECK) |
| `message` | text | — | optionele motivatie |
| `status` | text | `'pending'` | CHECK IN ('pending','accepted','declined') |
| `created_at` | timestamptz | `now()` | — |

**Status values:** `pending` / `accepted` / `declined` (3 waarden — geen 'cancelled' of 'expired').

**Direction:** `requester_id → receiver_id`. **Geen CHECK-constraint** die oplegt wie requester moet zijn vs receiver. De RLS doet wel de inhoudelijke gating: alleen requester mag inserten ([internly_migration.sql:763-764](internly_migration.sql#L763)).

**RLS policies** ([internly_migration.sql:756-767](internly_migration.sql#L756)):
| Policy | Cmd | Condition |
|---|---|---|
| `breq_select_party` | SELECT | `requester_id = auth.uid() OR receiver_id = auth.uid()` |
| `breq_insert_own` | INSERT | `WITH CHECK (requester_id = auth.uid())` |
| `breq_update_receiver` | UPDATE | `USING (receiver_id = auth.uid())` |

**Implicatie:** alleen de requester kan een request *aanmaken* — alleen de receiver kan accepteren/afwijzen (UPDATE status). Ideaal gemodelleerd voor een "buddy stuurt request naar student" flow.

---

## buddy_pairs schema

**Source:** [internly_migration.sql:163-172](internly_migration.sql#L163)

| Kolom | Type | Default | Constraint |
|---|---|---|---|
| `id` | uuid | `uuid_generate_v4()` | PK |
| `requester_id` | uuid | — | FK → profiles(id) |
| `receiver_id` | uuid | — | FK → profiles(id) |
| `type` | text | — | comment: 'gepensioneerd' \| 'werkend' \| etc. |
| `status` | text | `'active'` | CHECK IN ('active','ended','pending') |
| `reveal_after` | timestamptz | — | anonymity unlock date |
| `ended_at` | timestamptz | — | bij beëindiging |
| `created_at` | timestamptz | `now()` | — |

**Status values:** `active` / `ended` / `pending`.

**RLS policies** ([internly_migration.sql:741-753](internly_migration.sql#L741)):
| Policy | Cmd | Condition |
|---|---|---|
| `bp_select_party` | SELECT | `requester_id = auth.uid() OR receiver_id = auth.uid()` |
| `bp_insert_auth` | INSERT | `WITH CHECK (auth.uid() IS NOT NULL)` |
| `bp_update_party` | UPDATE | `USING (requester_id = auth.uid() OR receiver_id = auth.uid())` |

**Implicatie:** insert is breed (elke ingelogde user kan een pair aanmaken — applicatie-logica gates dit). Select+update zijn party-only.

---

## incoming-likes-section

**Container** ([buddy-dashboard.html:325-329](buddy-dashboard.html#L325)):
```html
<div class="card" id="incoming-likes-section" style="display:none">
  <div class="card-label">Interesse in jou</div>
  <p style="font-size:.82rem;color:#6b7280;margin-bottom:12px;">
    Studenten en bedrijven die jou een like hebben gestuurd.
    Accepteer om te koppelen.
  </p>
  <div id="incoming-likes-list"></div>
</div>
```

Section staat default verborgen, wordt alleen getoond als `pending.length > 0` (door reloadIncomingLikes).

**Card layout** ([js/swipes.js:48-78](js/swipes.js#L48), per card binnen `#incoming-likes-list`):
- Avatar-circle (40×40, gradient groen `#1a7a48 → #0f5c36`, white initial letter)
- Naam (`profiles.naam`, ellipsis-overflow)
- Sub-line: rolLabel ("Student"/"Bedrijf"/"Buddy") · relatieve datum
- "Accepteren" button (groen pill)
- "Overslaan" button (witte ghost pill)

**Reusable for outgoing deck:** **PARTIAL.** De `incoming-like-card` HTML/styling is een mooie referentie maar is een **horizontale-row layout**, niet een full-bleed swipe-card. Voor een echte swipe-deck wil je:
- Grotere card (full-width, taller)
- Meer profile-velden zichtbaar (motivatie, opleiding, skills)
- Z-stacked positioning + transform-rotate per kaart
- Touch/mouse gesture handlers

De avatar-helper en `formatRelativeDate` zijn 100% herbruikbaar. De kaart-renderer moet nieuw geschreven worden.

**Touch/swipe gesture handlers in buddy-dashboard.html:** **NEE.** Geen `touchstart`/`touchmove`/`mousedown` patroon gevonden. Buddies "swipen" momenteel alleen via knoppen (Accepteren/Overslaan).

---

## student_profiles for swipe cards

**zoekt_buddy in migration:** **NO.** [internly_migration.sql](internly_migration.sql) heeft 0 hits voor `zoekt_buddy`. Het is alleen toegevoegd via [BACKLOG_MIGRATION.sql:7-9](BACKLOG_MIGRATION.sql#L7) — een aparte SQL die Barry handmatig moet draaien. Tot dat moment retourneert de query `column does not exist`.

**Available fields op student_profiles voor swipe cards** ([internly_migration.sql:27-54](internly_migration.sql#L27) + ALTER TABLEs op lijn 453-464):
| Veld | Type | Aanwezig |
|---|---|---|
| `naam` | text | ✓ |
| `opleiding` | text | ✓ |
| `school` | text | ✓ |
| `jaar` | int | ✓ |
| `beschikbaar_vanaf` | date | ✓ |
| `beschikbaar_tot` | date | ✓ |
| `opdracht_domein` | text | ✓ |
| `motivatie` | text | ✓ |
| `skills` | jsonb | ✓ |
| `avatar_key` | text | ✓ (via AVATAR_MIGRATION) |
| `avatar_url` | text | ✓ |
| `bio` | text | ✓ |
| `niveau` | text | ✓ |
| `sector` | text | ✓ |
| `bbl_mode` | boolean | ✓ |
| `postcode` | text | ✓ |
| **`zoekt_buddy`** | boolean | ⚠ **alleen na BACKLOG_MIGRATION.sql** |

Genoeg informatie voor rijke swipe-cards: naam + avatar + opleiding/jaar/school header, motivatie als body-tekst, skills als chips, opdracht_domein + sector als tags, beschikbaar_vanaf datum.

**RLS — kan een 'gepensioneerd' user `student_profiles` lezen waar `zoekt_buddy=true`?** **YES — onbeperkt zelfs.**

[internly_migration.sql:559-560](internly_migration.sql#L559) `sp_select_all` policy is:
```sql
CREATE POLICY "sp_select_all" ON student_profiles
  FOR SELECT USING (true);
```

`USING (true)` = volledig openbaar voor alle authenticated users. Een buddy kan ALLE student-profielen zien, niet alleen `zoekt_buddy=true`. De filter moet dus client-side via `.eq('zoekt_buddy', true)`. **Maar:** dit betekent ook dat een buddy theoretisch elk profiel kan opvragen, niet alleen die opt-in zijn. Niet een security-probleem (data is per design gedeeld), wel een UX-discipline kwestie.

---

## Architecture recommendation

**Single-scroll addition:** **PARTIAL — werkt voor knop-gestuurde swipe, niet voor full-screen modal.**

Buddy-dashboard is single-scroll, ~1049 regels. Een nieuwe sectie-card "Studenten die een buddy zoeken" past **technisch** in het bestaande patroon — geen show()/screen-X switcher refactor nodig. Maar voor een **immersieve full-screen swipe-deck** (waar je echt door 20 studenten heen swiped) is een single-scroll-card te beperkt: je wilt focus, geen sidebar-distractie, geen scroll naar andere secties.

**Refactor needed:** **NEE — als je voor optie A kiest. JA als optie B.**

**Recommended approach (3 opties, oplopend in complexiteit):**

**Optie A — sectie-card binnen bestaande scroll** (geen refactor): plaats nieuw `<div class="card" id="zoekt-buddy-students-section">` na de "Actieve koppelingen" card. Lijst-render met dezelfde stijl als incoming-likes (avatar-row + accept/skip knoppen), gefilterd op `student_profiles.zoekt_buddy=true`. Per accept: insert in `buddy_requests` met `requester_id=current_user, receiver_id=student.profile_id, type='gepensioneerd'`. Past in 1 sessie, geen architectuur-wijziging.

**Optie B — modal swipe-deck** (kleine refactor): button "Vind een student" opent een full-screen modal-overlay met een Tinder-stack. Touch/mouse handlers, transform-rotate per kaart, accept/skip via knoppen óf swipe-gesture. Sluit modal na laatste kaart. Past in 1-2 sessies. Buddy-dashboard scroll blijft intact, modal is overlay.

**Optie C — full screen-switcher refactor**: buddy-dashboard refactor naar het `show()` + `screen-X` patroon van company/school-dashboard. Tabs: Dashboard | Vind student | Profiel | Instellingen. Te zwaar voor een feature die nog niet bewezen is.

**Aanbeveling:** **Optie A** voor v1 (validate dat zoekt_buddy users daadwerkelijk doorklikken). Als A traction heeft, upgrade naar Optie B. C alleen als de feature core wordt.

---

## What swipes.js can reuse

Direct herbruikbaar:
- `formatRelativeDate(iso)` — voor "beschikbaar vanaf 2 weken geleden" labels
- `removeCard(likeId)` patroon — fade-out + container empty-check
- Acceptatie-knop styling (groen pill) en Overslaan-styling (witte ghost pill)
- Avatar-circle styling (40×40 gradient + initial)

Conceptueel herbruikbaar maar moet aangepast voor buddy-flow:
- `swipesAcceptLike` patroon (insert reciprocal swipe) → vervang door insert in **buddy_requests**, niet `swipes`
- `swipesPassLike` patroon → kan blijven schrijven naar `swipes` met `direction='pass'` om in toekomst dubbele suggesties te voorkomen, OF skip DB-write als je geen "pass-historie" voor buddy-flow wilt

Niet herbruikbaar:
- `fetchIncomingLikes` query — gaat over `swipes` tabel met user als target. Voor buddy-discovery wil je `student_profiles` query met `zoekt_buddy=true` filter
- `reloadIncomingLikes` filter-logica — andere business-rule

---

## What needs to be built new

1. **Query function**: `fetchBuddySeekers(userId)` — leest `student_profiles` waar `zoekt_buddy=true`, filtert reeds-aangevraagde studenten via JOIN op `buddy_requests` (waar `requester_id=current_user`)
2. **Card renderer**: `renderBuddySeekerCard(student)` — full-card layout met motivatie + skills + opleiding (vs. incoming-likes' compact row)
3. **Action functions**:
   - `buddyRequestStudent(studentId)` — INSERT in `buddy_requests` met sender=buddy, receiver=student, type='gepensioneerd'. Stuur notificatie via `createNotification(studentId, 'buddy_request', requestId, 'buddy', '<naam> wil je buddy zijn')`
   - `buddySkipStudent(studentId)` — optioneel: INSERT in `swipes` of een nieuwe `buddy_skips` tabel om dubbele suggesties te voorkomen
4. **HTML section**: nieuwe `<div class="card">` in buddy-dashboard.html na de "Actieve koppelingen" card
5. **Init-call**: `loadBuddySeekers()` aangeroepen vanuit DOMContentLoaded, parallel met `loadPairs()`/`loadPendingRequests()`
6. **Empty state**: copy + visual voor "Geen studenten vinden momenteel een buddy"
7. **Realtime**: optioneel — subscription op `student_profiles` UPDATE waar `zoekt_buddy` wisselt naar true (kan uitgesteld)
8. **Notification type**: `buddy_request` bestaat al in [VALID_NOTIFICATION_TYPES](js/utils.js) — geen utils.js wijziging nodig

**Geen schema-wijziging vereist.** De feature gebruikt bestaande tabellen (`student_profiles.zoekt_buddy` via BACKLOG_MIGRATION.sql, `buddy_requests` per migration). Wel: **BACKLOG_MIGRATION.sql moet eerst gedraaid worden** voordat deze feature werkt.
