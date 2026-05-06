# Rollen-Architectuur Filesystem-Check

**Datum**: 6 mei 2026
**Bijlage bij**: `ROLLEN_ARCHITECTUUR_AUDIT.md` Sectie 1 + 5
**Doel**: TBD-items invullen met filesystem-realiteit. Geen interpretatie, geen aanbevelingen.

---

## Check 1 — Rol-specifieke files (bestaan + grootte)

| File | Bytes | Status |
|---|---|---|
| `begeleider-dashboard.html` | 57.739 | **bestaat, gevuld** (niet stub) |
| `buddy-dashboard.html` | 64.062 | **bestaat, gevuld** |
| `international-school-dashboard.html` | 41.541 | **bestaat, gevuld** |
| `international-student-dashboard.html` | 94.296 | **bestaat, gevuld** (grootste) |
| `internly-worldwide.html` | 65.709 | **bestaat** (publieke landings-pagina, geen dashboard) |

**Note**: file-grootte alleen indiceert "is er code", niet "werkt het end-to-end". Functionele test is niet binnen scope van filesystem-check.

## Check 2 — HEADER_NAV_BY_ROLE inhoud

[js/utils.js:775-805](js/utils.js#L775)

| Role-key | # Items | Items |
|---|---|---|
| `student` | 7 | home, matchpool, vacatures, sollicitaties, berichten, kennisbank, buddy |
| `student_bbl` | 5 | discover (Overzicht), matchpool, berichten, kennisbank, buddy |
| `gepensioneerd` | 5 | overzicht, matches, berichten, notities, profiel |
| `bedrijf` | — | **geen entry** (sidebar-pattern, niet topbar) |
| `school` | — | **geen entry** (sidebar-pattern) |
| `begeleider` | — | **geen entry** (sidebar-pattern, mini-bar op publieke pagina's) |
| `student_international` | — | **geen entry** |
| `school_international` | — | **geen entry** |
| `admin` | — | **geen entry** |

Comment regel 803-804: "Toekomstige rollen krijgen hier hun eigen nav-config. company / school behouden hun bestaande sidebar-pattern."

## Check 3 — Auth-guard pattern per pagina

**`guardPage()`**: 0 callers in `*.html`. Helper bestaat in utils.js (window-export op regel 356) maar **niet in gebruik**. CLAUDE.md beschrijft Run 7B-migratie als gepland, **niet uitgevoerd**.

**`requireRole()`**: 8 callers
| Pagina | Toegestane rollen |
|---|---|
| chat.html | student, bedrijf, school |
| discover.html | student |
| matches.html | student |
| mijn-berichten.html | student, gepensioneerd |
| mijn-notities.html | gepensioneerd |
| mijn-sollicitaties.html | student |
| student-home.html | student |

**Inline auth-check** (geen requireRole/guardPage): meeste dashboards. Voorbeeld [begeleider-dashboard.html:1310-1325](begeleider-dashboard.html#L1310):
```js
const { data: { user } } = await db.auth.getUser();
if (!user) { window.location.href = 'auth.html'; return; }
const { data: profile } = await db.from('profiles').select('role, naam, email, sector').eq('id', user.id).maybeSingle();
if (!profile || profile.role !== 'begeleider') { window.location.href = 'auth.html'; return; }
```

CLAUDE.md "Auth-architectuur (Mei 2026)" sectie noemt 19 pagina's met inline auth-check waiting for `guardPage()` migratie. Geconfirmeerd in filesystem.

## Check 4 — DB-tabellen per rol (live SELECTs)

| Tabel | Wordt gequeried in | Bevestigd als bestaand |
|---|---|---|
| `profiles` | alle pagina's | ✓ |
| `student_profiles` | bbl-hub, student-home, international-student-dashboard, etc. | ✓ |
| `company_profiles` | company-dashboard, admin, match-dashboard | ✓ |
| `school_profiles` | school-dashboard, match-dashboard, mijn-berichten | ✓ |
| `international_school_profiles` | auth.html, international-school-dashboard | ✓ |
| `buddy_profiles` | bbl-hub:2811, buddy-dashboard:1398, js/buddy.js:670/838/851, js/matchpool.js:40 | ✓ |
| `subscriptions` | auth.html, hasActivePlan(), Mollie | ✓ |
| `waitlist` | auth.html (gepensioneerd-flow) | ✓ |
| `international_student_profiles` | **0 hits** | **bestaat NIET — Int'l Student gebruikt `student_profiles` met `student_type='international'`** |
| `begeleider_profiles` | **0 hits** | **bestaat NIET — begeleider data zit in `profiles` (sector, naam, email)** |

**Conclusie Sectie 5 TBDs**:
- ❌ `begeleider profiel-tabel` — **geen aparte tabel**. Sector + email + naam in `profiles`. Plan-info in `subscriptions`.
- ✅ `buddy_profiles` — **bestaat als aparte tabel**. SELECT in [buddy-dashboard.html:1398](buddy-dashboard.html#L1398) toont velden: `profile_id, naam, pitch, bio, achtergrond, kennis_gebieden, specialiteiten, grove_beschikbaarheid, postcode, stad, leeftijd, talen, foto_url, active, open_to_international, avatar_key` (16 kolommen).
- ❌ `international_student_profiles` — **geen aparte tabel**. Flag-pattern via `student_profiles.student_type='international'`. Bevestigd in [international-student-dashboard.html:6](international-student-dashboard.html#L6) header-comment: "Loaded after auth when student_profiles.student_type === 'international'".

## Sectie 1 TBDs — invullen

| Auth-card | UI rol | DB role | Discriminator | Profile-table | **Status**: |
|---|---|---|---|---|---|
| `rc-begeleider` | Stagebegeleider | `begeleider` | — | **`profiles`** (geen aparte tabel) + `subscriptions` voor plan | ✓ TBD invullen |
| `rc-gepensioneerd` | Buddy | `gepensioneerd` | — | **`buddy_profiles`** (aparte tabel, 16 cols) + `waitlist` voor onboarding-fase | ✓ TBD invullen |
| `rc-student-international` | Int'l Student | `student` | `student_type='international'` | **`student_profiles`** (geen aparte tabel — flag-pattern) | ✓ TBD invullen |

**Aangepaste rol-mapping (na CC-check)**:

```
| `rc-begeleider`             | begeleider     | profiles + subscriptions   |
| `rc-gepensioneerd`          | gepensioneerd  | buddy_profiles + waitlist  |
| `rc-student-international`  | student        | student_profiles (flag)    |
| `rc-school-international`   | school         | international_school_profiles |
```

## Sectie 3 Gap-analyse — invullen

### Stagebegeleider — gap-status update

```
Onbekend → Bekend:
✓ Dashboard file: begeleider-dashboard.html (57.7 kb, gevuld)
✓ Profile-tabel: profiles (sector kolom + naam/email)
✗ Per-sessie betalingsmodel — niet gevonden in code (Mollie startCheckout is stub)
✗ Kalender-integratie — niet gevonden
✗ Eindverslag BOL+BBL builder — niet gevonden

Audit-aanbeveling onveranderd: Coming Soon voor 11 mei
Reden: dashboard bestaat maar core-features (per-sessie betaling +
       eindverslag) ontbreken. Dashboard-shell zonder backend-flow
       is misleidend voor livetest-deelnemer.
```

### Buddy — gap-status update

```
Onbekend → Bekend:
✓ buddy_profiles tabel: bestaat met 16 kolommen
✓ buddy-dashboard.html: 64.0 kb, gevuld
✓ js/buddy.js: aanwezig (4 SELECT-callsites)
✓ js/matchpool.js: aanwezig (1 SELECT-callsite — buddy zichtbaar in matchpool)
? Opt-in flow — code aanwezig maar e2e-validatie pending
? Matching algoritme — TBD inspectie van js/buddy.js + matchpool.js
? Buddy-pair_id — niet expliciet gevonden in deze check

Audit-aanbeveling onveranderd: 11 mei launch BEHOUDEN
Bismarck-flag staat — Picard2 final call vereist.
```

### International Student — gap-status update

```
Onbekend → Bekend:
✓ Eigen dashboard: international-student-dashboard.html (94.3 kb, GROOTSTE van alle dashboards)
✓ student_profiles met student_type='international' (flag-pattern bevestigd)
? i18n-volledigheid — niet getest in deze check (translate.js bestaat maar coverage onbekend)
? Visa-info kennisbank — niet specifiek gevonden

Audit-aanbeveling: HEROVERWEGEN.
Reden: international-student-dashboard.html is grootst van alle dashboards
       (94.3 kb). Implementatie lijkt vergevorderd. Coming Soon-aanbeveling
       was gebaseerd op aanname dat het nog niet bestond. Filesystem-check
       weerlegt dat. Echter: bestaan ≠ functioneel + i18n-validated.
       Functionele smoke-test door Barry kan deze beslissing snel duidelijk
       maken.
```

### International School — gap-status update

```
Onbekend → Bekend:
✓ international_school_profiles tabel bestaat (auth.html INSERT + dashboard SELECT)
✓ international-school-dashboard.html: 41.5 kb, gevuld
✓ auth.html flow: international school account → tabel-rij + redirect

Audit-aanbeveling: HEROVERWEGEN.
Reden: zelfde patroon als Int'l Student — implementatie aanwezig.
       Functionele smoke-test door Barry kan beslissing scherper maken.
```

## Sectie 9 — Volgorde van werken: stap 3 status

Stap 3 "CC filesystem-check (15 min)" — **VOLTOOID**.

Output van deze check vult Sectie 1 TBDs en Sectie 3 gaps in. Stap 4 (crew-deliberation) kan starten.

## Niet binnen scope van deze check

- Functionele e2e-test per rol (browser-based)
- i18n volledigheids-coverage (translate.js parsing)
- Mollie-checkout test (per-sessie betaling)
- Buddy matching algorithm review (js/buddy.js inspectie)
- RLS-policies per nieuwe tabel (Bedward Audit 8-pattern)

Deze items behoren tot Fase 1 audit-werk of bij de Picard2 final call.

## Bevindingen voor Picard2 final call

Twee items lijken op aanname-fout in de planning-doc:

1. **Int'l Student / School zijn aanzienlijk verder dan "TBD"**.
   `international-student-dashboard.html` is met 94.3 kb het GROOTSTE dashboard van het hele platform. Dit is geen stub. Voor "Coming Soon"-beslissing is functionele smoke-test door Barry doorslaggevend, niet de aanname dat het ontbreekt.

2. **Begeleider-dashboard bestaat maar core-features ontbreken**.
   57.7 kb dashboard met auth + role-guard + plan-guard, MAAR Mollie-checkout is stub (uit CLAUDE.md "Bekende stubs"). Per-sessie betaalflow is core voor begeleider-business-model. Coming Soon-beslissing blijft staan.

## Sign-off

- 7/11: filesystem-realiteit gemeld zonder interpretatie. Functionele beoordeling = Barry + Picard2.
- Tom Bomba: stop hier. Pauze tussen stap 3 en 4 zoals gepland.
