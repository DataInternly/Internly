# Audit Rapport — Sprint 3 Go/No-Go
Datum: 22 april 2026
Methode: Supabase CLI `--linked` directe SQL-queries + bestandsscan
Status: READ-ONLY — geen wijzigingen aangebracht

---

## 0. TL;DR

**Sprint 2 migratie mag NIET worden uitgevoerd zoals hij nu staat.** De database bevat al correctere versies van de functies en triggers dan wat de Sprint 2 SQL zou installeren — uitvoeren zou werken downgraden en dubbele triggers creëren. Drie kolom/waarde-fouten in de migratie (`match_type` → `type`, `'swipe_mutual'` → `'mutual_swipe'`, `actief` → `active`) raken ook de frontend-code in `buddy.js`. Sprint 3 kan pas starten na een gecorrigeerde migratie-bundel en een fix in buddy.js/buddy-dashboard.html. Pool-sizes zijn bovendien erg klein (0 actieve buddies), wat een lege swipe-deck geeft bij eerste test.

---

## 1. Database State

### 1.1 matches — CHECK constraints

| Naam | Definitie | Opmerking |
|------|-----------|-----------|
| `matches_completion_status_check` | `completion_status IN ('running','completed','terminated_early','unknown')` | Pre-bestaand |
| `matches_match_target_check` | `match_target IN ('posting','student','buddy','bedrijf','vacature')` | Uitgebreid in Sprint 2 |
| `matches_status_check` | `status IN ('pending','accepted','rejected')` | Pre-bestaand — **LET OP: geen 'active'** |
| `matches_type_check` | `type IN ('student_bedrijf','school_bedrijf','student_posting','school_posting','begeleider_link','mutual_swipe')` | Uitgebreid in Sprint 2 — **waarde is `'mutual_swipe'` (niet `'swipe_mutual'`)** |

**⚠️ Risico:** `bbl-hub.html` en `company-dashboard.html` doen `.in('status', ['accepted', 'active'])` in SELECT-queries. Omdat `status='active'` niet bestaat in de CHECK, zullen deze queries nooit rows met `'active'` retourneren. SELECT-filtering is geen fout, maar de intent van de query klopt niet — gedraagt zich stiller dan verwacht.

### 1.2 matches — Foreign keys

| Naam | Definitie |
|------|-----------|
| `matches_initiated_by_fkey` | FK naar `profiles(id)` |
| `matches_party_a_fkey` | FK naar `profiles(id) ON DELETE CASCADE` |
| `matches_party_b_fkey` | FK naar `profiles(id) ON DELETE CASCADE` |
| `matches_posting_id_fkey` | FK naar `internship_postings(id) ON DELETE SET NULL` |
| `matches_praktijkbegeleider_profile_id_fkey` | FK naar `profiles(id) ON DELETE SET NULL` |
| `matches_roc_profile_id_fkey` | FK naar `profiles(id) ON DELETE SET NULL` |
| `matches_school_posting_id_fkey` | FK naar `school_postings(id) ON DELETE SET NULL` |

### 1.3 matches — Kolommen

| Kolom | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| party_a | uuid | NO | — |
| party_b | uuid | NO | — |
| type | text | NO | — |
| status | text | NO | 'pending' |
| initiated_by | uuid | YES | — |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| match_target | text | YES | 'profile' |
| posting_id | uuid | YES | — |
| school_posting_id | uuid | YES | — |
| praktijkbegeleider_profile_id | uuid | YES | — |
| contract_end_date | date | YES | — |
| doorstroom | boolean | YES | — |
| renewal_status | jsonb | YES | '{}' |
| skills_progress | jsonb | YES | '{}' |
| roc_profile_id | uuid | YES | — |
| first_response_at | timestamptz | YES | — |
| completion_status | text | YES | 'unknown' |
| completed_at | timestamptz | YES | — |

**Nota bene: kolom heet `type`, NIET `match_type`.**

### 1.4 matches — Triggers

| Naam | Enabled | Definitie |
|------|---------|-----------|
| `trigger_notify_on_mutual_match` | O (actief) | AFTER INSERT, WHEN `new.type = 'mutual_swipe'`, roept `notify_on_mutual_match()` aan |

**⚠️ KRITIEK:** Sprint 2 migratie maakt trigger `trg_notify_mutual_match` met een ANDERE naam maar DEZELFDE functie. Uitvoeren creëert twee triggers → dubbele notificaties bij elke match.

### 1.5 Andere kern-tabellen — samenvatting

#### swipes
Kolommen: `id`, `swiper_id`, `target_id`, `target_type`, `direction`, `created_at`

CHECK constraints:
- `swipes_direction_check`: `direction IN ('like','pass')`
- `swipes_target_type_check`: `target_type IN ('vacature','buddy','bedrijf','student')` ← **'student' stond er al in. Sprint 2 A.0 ALTER was een no-op.**

Triggers:
- `trigger_swipe_mutual_match` — AFTER INSERT, roept `check_mutual_swipe_match()` aan

**⚠️ KRITIEK:** Sprint 2 maakt trigger `trg_check_mutual_swipe` (andere naam, zelfde functie). Dubbele mutual-match detectie als migratie wordt uitgevoerd.

#### buddy_profiles
Kolommen (volledige bestaande schema):

| Kolom | Type | Default |
|-------|------|---------|
| profile_id | uuid (PK) | — |
| naam | text | — |
| pitch | text | — |
| bio | text | — |
| kennis_gebieden | text[] | '{}' |
| specialiteiten | text[] | '{}' |
| grove_beschikbaarheid | text | — |
| postcode | text | — |
| stad | text | — |
| leeftijd | int | — |
| achtergrond | text | — |
| talen | text[] | ARRAY['Nederlands'] |
| foto_url | text | — |
| **active** | boolean | **false** |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

**⚠️ KRITIEK:**
1. Kolom heet `active`, NIET `actief`. Sprint 2 migratie `CREATE TABLE IF NOT EXISTS` was een no-op (tabel bestond al) maar de kolom-naam aanname is fout.
2. `active` default is `false` (niet `true` zoals in Sprint 2 migratie aangenomen).
3. Tabel heeft extra kolommen (`naam`, `pitch`, `bio`, `achtergrond`, `talen`, `foto_url`) die niet in het nieuwe buddy-profiel-formulier zitten.
4. `profile_id` is de PK — geen aparte `id` UUID kolom.

#### internship_postings (voor Sprint 3)
Beschikbare kolommen: `id`, `company_profile_id`, `company_name`, `sector`, `title`, `description`, `duration` (text, NIET `duration_weeks`), `start_date`, `tags`, `guarantee`, `response_days`, `match_target`, `is_active_profile`, `trust_score`, `trust_grade`, `status`, `created_by`, `created_at`, `postcode`, `bbl_mode`, `contract_start`, `contract_end`, `hours_per_week`, `vergoeding_cents`, `company_user_id`, `domain`, `buddy_allowed`, `vestiging_id`

**⚠️ Sprint 3 blocker:** Kolom heet `duration` (text), NIET `duration_weeks`. Instructie-doc gebruikt verkeerde naam.

#### company_profiles
Beschikbare kolommen voor kaart: `profile_id`, `bedrijfsnaam`, `sector`, `size`, `beschrijving`, `trust_score`, `trust_grade` — allen aanwezig ✓

### 1.6 RLS Policies — samenvatting per tabel

#### matches — DUBBELE POLICIES (pre-bestaand probleem)
| Policy | CMD |
|--------|-----|
| `matches_insert_party` | INSERT |
| `own insert matches` | INSERT — DUPLICAAT |
| `matches_select_party` | SELECT |
| `own read matches` | SELECT — DUPLICAAT |
| `matches_update_party` | UPDATE |
| `own update matches` | UPDATE — DUPLICAAT |

Drie paren van dubbele policies. Functioneel harmless (OR-logica), maar rommelig.

#### swipes — policies (correct, pre-bestaand)
- `swipes_insert_own` — INSERT met extra check `swiper_id <> target_id` (self-swipe blokkering)
- `swipes_select_own` — SELECT eigen swipes
- `swipes_select_target` — SELECT likes gericht op jou (EN likes op jouw postings)

**Nota bene:** Sprint 2 `swipes_select_target` policy was simpeler dan de bestaande. Bestaande policy beschermt beter (alleen `direction='like'` zichtbaar, plus posting-eigenaar kan ook zien wie liket).

#### buddy_profiles — policies (correct, pre-bestaand, kolom `active` gebruikt)
- `buddy_select_active` — `(active = true) OR (profile_id = auth.uid())`
- `buddy_upsert_own` — INSERT
- `buddy_update_own` — UPDATE

Sprint 2 policies zouden DROP + recreate doen — in dit geval geen achteruitgang, maar redundant.

#### notifications — DUBBELE POLICIES (pre-bestaand)
`Users manage own notifications` (ALL) overlapt met `notif_insert_auth`, `notif_select_own`, `notif_update_own`.

### 1.7 Functies die op matches/swipes/buddy_profiles opereren

#### check_mutual_swipe_match() — DE BESTAANDE VERSIE IS BETER

```sql
-- Bestaande functie (correct):
IF NEW.target_type = 'vacature' THEN
  v_target_profile_id := (SELECT ip.created_by FROM internship_postings ip WHERE ip.id = NEW.target_id);
ELSE
  v_target_profile_id := NEW.target_id;
END IF;
-- ... detecteert mutual match en INSERT INTO matches:
INSERT INTO matches (party_a, party_b, type, status, initiated_by, match_target, posting_id, created_at)
VALUES (NEW.swiper_id, v_target_profile_id, 'mutual_swipe', 'accepted', NEW.swiper_id, NEW.target_type,
        CASE WHEN NEW.target_type = 'vacature' THEN NEW.target_id ELSE NULL END, now());
```

**Sprint 2 versie was broken:**
- Gebruikte `match_type` (kolom bestaat niet, heet `type`)
- Gebruikte waarde `'swipe_mutual'` (constraint staat `'mutual_swipe'` toe)
- Had geen speciale afhandeling voor `target_type = 'vacature'`

**Conclusie: Sprint 2 migratie mag `check_mutual_swipe_match()` NIET overschrijven.**

#### notify_on_mutual_match() — bestaande versie ook correct
Controleert `NEW.type = 'mutual_swipe' AND NEW.status = 'accepted'` → insert twee notificaties (party_a en party_b). Sprint 2 versie deed hetzelfde maar zou opnieuw als `CREATE OR REPLACE` worden geschreven.

---

## 2. Database Data

### 2.1 Rol-verdeling
| Rol | Count |
|-----|-------|
| bedrijf | 1 |
| gepensioneerd | 2 |
| school | 1 |
| student | 2 |
**Totaal: 6 gebruikers — test-data only**

### 2.2 Vacatures
| Status | Count |
|--------|-------|
| active | 2 |

### 2.3 Trust-grade vacatures
| Grade | Count |
|-------|-------|
| A | 2 |

### 2.4 Buddy profiles — actief
| active | Count |
|--------|-------|
| false | (0 rows returned = 0 actieve buddy_profiles) |

**⚠️ Alle buddy_profiles hebben `active = false` (de default).** Niemand heeft `active = true` gezet.

### 2.5 Bedrijfsprofielen trust
| Grade | Count |
|-------|-------|
| A | 1 |

### 2.6 Match types
| Type | Status | Count |
|------|--------|-------|
| student_posting | accepted | 3 |
| student_posting | pending | 1 |

### 2.7 Swipes
| Target type | Direction | Count |
|-------------|-----------|-------|
| bedrijf | like | 1 |
| student | like | 1 |

### 2.8 Notification types in gebruik
| Type | Count |
|------|-------|
| new_message | 6 |
| new_match | 3 |
| meeting_request | 2 |
| meeting_invite | 1 |
| new_review | 1 |
| application_accepted | 1 |
| buddy_request | 1 |
| school_referral | 1 |

**⚠️ Discrepantie met CLAUDE.md:** DB gebruikt `meeting_request` en `meeting_invite`, CLAUDE.md registreert `new_meeting`. `application_accepted` en `school_referral` staan niet in de CLAUDE.md-lijst.

### 2.9 Pool-sizes voor Sprint 3 swipe-deck

| Pool | Aantal |
|------|--------|
| Actieve vacatures (grade A+B) | **2** |
| Actieve buddies (active = true) | **0** |
| Actieve bedrijven (grade A+B) | **1** |

**⚠️ KRITIEK:** Bij Sprint 3 launch ziet een student:
- Vacature-toggle: 2 kaarten
- Buddy-toggle: 0 kaarten (lege staat)
- Bedrijf-toggle: 1 kaart

Dit is functioneel testbaar maar leeg voor buddy-deck. Empty-state scenario is zeker bij eerste test.

---

## 3. Frontend Code State

### 3.1 HTML-bestanden (root)

| Bestand | Bytes | Datum |
|---------|-------|-------|
| 404.html | 3118 | 16 apr |
| about.html | 36553 | 20 apr |
| admin.html | 36009 | 20 apr |
| auth.html | 39478 | 22 apr |
| bbl-dashboard.html | 27006 | 20 apr |
| bbl-hub.html | 118244 | 22 apr |
| bbl-profile.html | 29634 | 22 apr |
| begeleider-dashboard.html | 48351 | 22 apr |
| bol-profile.html | 73532 | 20 apr |
| buddy-dashboard.html | 35352 | 22 apr |
| chat.html | 68386 | 22 apr |
| company-dashboard.html | 127654 | 22 apr |
| company-discover.html | 21192 | 21 apr |
| discover.html | 58277 | 21 apr |
| match-dashboard.html | 253555 | 19 apr |
| **matchpool.html** | — | **bestaat niet** |
| matches.html | 30414 | 22 apr |
| school-dashboard.html | 104364 | 22 apr |

### 3.2 JS-bestanden

| Bestand | Bytes | Datum | Functies |
|---------|-------|-------|---------|
| buddy.js | 30919 | 22 apr | 21 |
| calendar.js | 24832 | 22 apr | 8 |
| swipes.js | 7550 | 22 apr | 3 |
| utils.js | 27106 | 22 apr | 23 |
| telemetry.js | 21801 | 17 apr | — |
| reviews.js | 12969 | 22 apr | — |
| kb.js | 11897 | 22 apr | — |
| esg-export.js | 11897 | 20 apr | — |
| profanity.js | 5070 | 21 apr | — |
| supabase.js | 5499 | 22 apr | — |
| **matchpool.js** | — | **bestaat niet** |

### 3.3 matches.html — huidige staat

- `.swipe-area` (id="swipe-container") aanwezig ✓
- `.swipe-card` klasse aanwezig ✓
- Functies: `likeCard()`, `skipCard()`, `advanceCard()`, `loadCards()`, `createCard()`, drag handlers ✓
- Swipe-UI is volledig functioneel — dit is de huidige swipe-implementatie die Sprint 4 moet sunseteen
- Geen sunset-banner aanwezig (correct — die komt in Sprint 4)
- Inline JS: ~620 regels

### 3.4 matchpool.html
**Bestaat niet.** Sprint 3 maakt dit aan.

### 3.6 match-dashboard.html — renderMatchpool()

`renderMatchpool()` bestaat en is **volledig demo-only**:
- Rendert hardcoded demo-profielen (bedrijf, school, buddy)
- Heeft "Voorbeeldprofielen tonen" toggle (localStorage-based)
- Geen DB-queries
- Heeft empty-state als demo uitgeschakeld
Sprint 3 vervangt dit met echte matchpool.html.

### 3.7 buddy.js Sprint 2 functies

Aanwezig: `loadBuddyProfile`, `populateBuddyProfile`, `collectBuddyProfileData`, `saveBuddyProfile` ✓

**⚠️ Maar alle vier gebruiken `actief` terwijl de DB-kolom `active` heet:**
- `populateBuddyProfile`: leest `data.actief` (undefined in DB-response)
- `collectBuddyProfileData`: zet `actief:` key (wrong column name in upsert)
- `saveBuddyProfile`: stuurt `actief` naar upsert → kolom bestaat niet, wordt genegeerd of faalt

### 3.8 swipes.js Sprint 2 functies

Aanwezig: `fetchIncomingLikes` (intern), `renderIncomingLikeCard` (intern), `reloadIncomingLikes` (window), `swipesAcceptLike` (window), `swipesPassLike` (window) ✓

### 3.9 Utils.js helpers

| Helper | Aanwezig? |
|--------|-----------|
| `notify()` | ✓ regel 281 |
| `escapeHtml()` | ✓ regel 324 |
| `formatNLDate()` | ✓ regel 335 |
| `formatRelativeDate()` | **✗ niet aanwezig** — swipes.js definieert eigen lokale versie (correct) |
| `requireRole()` | ✓ regel 93 |

Sprint 3 heeft alles wat het nodig heeft ✓

### 3.10 FTP / Deploy status

```
git status: 18 bestanden modified (M), 5 verwijderd (D, naar EX/),
            12 untracked (??): js/swipes.js, mijn-berichten.html, review-form.html, etc.
```

**Open vraag voor Barry:** Welke bestanden zijn al op Antagonist/FTP? De Sprint 1 CSS-refactor (css/style.css, matches.html) is lokaal klaar maar vermoedelijk nog niet geupload.

---

## 4. Bijvangst-documentatie status

### 4.1 Zijn Sprint 2 constraint-uitbreidingen gedocumenteerd?

Grep op `matches_match_target_check`, `matches_type_check`, `mutual_swipe`:
- `internly_migration.sql` — **niet gevonden in recente commits**
- `CLAUDE.md` — niet gedocumenteerd
- Change-log — geen change-log aanwezig

**Conclusie: NEE.** De Sprint 2 constraint-uitbreidingen en de bevinding dat de migratie-SQL bugs bevatte zijn nergens vastgelegd. Aanbeveling: documenteer in CLAUDE.md.

---

## 5. Sprint 3 Readiness — Kolom-checks

### 5.1 Vacature-kaart query

```sql
SELECT id, title, description, sector, duration, start_date, tags,
       trust_score, trust_grade, company_name, created_by
FROM internship_postings LIMIT 1;
```
Resultaat: ✓ alle kolommen aanwezig (2 rijen)

**⚠️ Instructie-doc gebruikt `duration_weeks` — kolom heet `duration` (text). Aanpassen vóór Sprint 3.**

### 5.2 Buddy-kaart query

```sql
SELECT profile_id, naam, pitch, kennis_gebieden, specialiteiten,
       grove_beschikbaarheid, stad, leeftijd, achtergrond
FROM buddy_profiles LIMIT 1;
```
Resultaat: ✓ alle kolommen aanwezig, maar **0 rijen met `active = true`** — lege deck.

### 5.3 Bedrijf-kaart query

```sql
SELECT profile_id, bedrijfsnaam, sector, size, beschrijving, trust_score, trust_grade
FROM company_profiles LIMIT 1;
```
Resultaat: ✓ alle kolommen aanwezig, 1 rij ✓

---

## 6. Bestanden die Sprint 3 raakt

| Bestand | Actie | Huidige state |
|---------|-------|---------------|
| `matchpool.html` | Nieuw aanmaken | **Bestaat niet** ✓ |
| `js/matchpool.js` | Nieuw aanmaken | **Bestaat niet** ✓ |
| `css/style.css` | Uitbreiden (swipe-classes) | **Sprint 1 al gedaan** — 6 matches op swipe-card/swipe-area |
| `js/utils.js` | Nav-link "Matchpool" toevoegen | Nu: link naar `/matches.html` — **geen matchpool-link** |

---

## 7. Open vragen voor de crew

1. **Sprint 2 migratie-bundel**: De migratie SQL bevat bugs en mag niet worden uitgevoerd zoals hij staat. Wie corrigeert dit? Scope: kolom `match_type` → `type`, waarde `'swipe_mutual'` → `'mutual_swipe'`, verwijder de `check_mutual_swipe_match()` CREATE OR REPLACE (bestaande is beter), verwijder duplicate-trigger creates. Aparte correctie-sessie nodig vóór Sprint 3.

2. **buddy.js actief/active fix**: Drie functies in buddy.js en het buddy-dashboard-formulier gebruiken `actief` terwijl de DB-kolom `active` heet. Dit is een correctie van ~4 regels. Wordt dit gefixed vóór of als deel van Sprint 3?

3. **Pool-grootte**: 0 actieve buddies, 2 vacatures, 1 bedrijf. Buddy-toggle in matchpool is leeg bij eerste test. Opties: a) test-data seeden met `active=true` buddy profiel, b) empty-state per toggle goed implementeren in Sprint 3, c) accepteren als known limitation.

4. **matches.html sunset-timing**: Momenteel heeft matches.html een volledig werkende swipe-UI. Sprint 4 plaatst daar een sunset-banner. De vraag is of er overlap-risico is: gebruikers op matches.html en matchpool.html tegelijk actief, swipes dubbel optredend. Hoe wordt dit afgevangen?

5. **Notification type discrepantie**: DB gebruikt `meeting_request`, CLAUDE.md registreert `new_meeting`. Geen functionele crash, maar inconsistentie. Wanneer wordt de VALID_NOTIFICATION_TYPES lijst in utils.js gesynchroniseerd met de DB-waarden?

6. **Duplicate RLS policies op matches**: Zes policies in drie dubbele paren. Niet blokkerend maar rommelig — wanneer opruimen?

7. **discover.html vs matchpool.html**: Beide dekken het "zoek stage" pad. Na Sprint 3: wat is de navigatie-flow? discover.html → solliciteer-flow; matchpool.html → swipe-flow. Moeten ze naast elkaar bestaan of is één de toekomst?

8. **FTP deploy strategie**: Sprint 1 + Sprint 2 frontend-changes staan alleen lokaal. Gaan Sprint 1+2 eerst live (zonder Sprint 3), of wacht Barry tot Sprint 3 af is en doet alles in één upload? Dit beïnvloedt wanneer Geordi2 journey B1 kan uitvoeren.

9. **`active = false` default in buddy_profiles**: Gepensioneerde buddies die hun profiel invullen worden niet gevonden (active=false). Moeten buddies expliciet `active=true` zetten via het formulier, of moet dit een opt-out zijn? Huidige form-default is de checkbox checked = true (opt-in), maar DB-default is false — inconsistentie.

---

## 8. Aanbevolen pre-Sprint 3 acties

### 🔴 Blokkerend voor Sprint 3

1. **Corrigeer Sprint 2 migratie SQL** vóór uitvoeren:
   - Verwijder of vervang `CREATE OR REPLACE FUNCTION check_mutual_swipe_match()` — bestaande functie is beter
   - Verwijder `CREATE TRIGGER trg_check_mutual_swipe` — trigger `trigger_swipe_mutual_match` bestaat al
   - Verwijder `CREATE TRIGGER trg_notify_mutual_match` — trigger `trigger_notify_on_mutual_match` bestaat al
   - ALTER TABLE A.0 voor swipes CHECK is een no-op (constraint al correct)
   - `CREATE TABLE IF NOT EXISTS buddy_profiles` is een no-op (tabel bestaat al)
   - RLS policies: gebruik `actief = true` → corrigeer naar `active = true` (maar ze bestaan al correct)

2. **Corrigeer buddy.js + buddy-dashboard.html** (`actief` → `active`):
   - `populateBuddyProfile`: `data.actief` → `data.active`
   - `collectBuddyProfileData`: `actief:` → `active:`
   - Form field mapping: checkbox `#bp-actief` stuurt `actief` key → moet `active` zijn

### 🟡 Sterk aanbevolen vóór Sprint 3

3. **Seed minimaal één buddy_profiles record met `active = true`** zodat buddy-toggle in matchpool niet lege deck toont bij eerste test.

4. **Documenteer de bestaande `check_mutual_swipe_match()` functie in CLAUDE.md** met de aantekening dat deze SECURITY DEFINER is, vacature-ownership correct oplost, en niet overschreven mag worden zonder review.

5. **Pas Sprint 3 instructie-doc aan**: `duration_weeks` → `duration` (text kolom).

### 🟢 Kan na Sprint 3

6. Synchroniseer `VALID_NOTIFICATION_TYPES` in utils.js met DB-waarden (`meeting_request`, `application_accepted`, `school_referral`).
7. Ruim duplicate RLS policies op matches op.
8. Documenteer matches `status IN ('pending','accepted','rejected')` constraint — geen 'active' — in CLAUDE.md.
