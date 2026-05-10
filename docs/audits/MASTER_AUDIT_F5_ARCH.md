# MASTER AUDIT — FASE 5 : ARCHITECTUUR & DUPLICATIE
Datum: 9 mei 2026
Methode: read-only grep + cross-file pattern detection

---

## 5.1 — Same concept in 2+ files (7/11 principe)

### Loop-shield singletons (CLAUDE.md §Loop-shield regels)
| Functie | Verwacht | Realiteit | Status |
|---|---|---|---|
| `function notify(` | 1 (utils.js:488) | 1 | **PASS** |
| `function escapeHtml(` | 1 (utils.js:527) | 1 | **PASS** |
| `function createNotification(` | 1 (utils.js) | 1 | **PASS** |
| `const SUPABASE_URL` | 1 (supabase.js:6) | 1 | **PASS** |
| `function calNotify(` | 1 (calendar.js, lokale variant) | 1 | **PASS** (legitiem — eigen #cal-notif target) |
| `function hasActivePlan(` | 1 (supabase.js:172) | 1 | **PASS** (lokale kopieën verwijderd in K3) |
| `function renderTrustBadge(` | 1 (utils.js:506) | 1 | **PASS** |
| `function getDisplayName(` | 1 (utils.js:374) | 1 | **PASS** |
| `function formatNLDate(` | 1 (utils.js:776) | 1 | **PASS** |

### F5.1.A — `formatDate()` in 7 pagina's [P2]
**Verwacht** géén lokale definities — `formatNLDate()` in utils.js:776 is de canonieke helper.

**Realiteit**: 7 lokale `function formatDate(` definities:
| Pagina | Locatie | Signature |
|---|---|---|
| bbl-dashboard.html:403 | `function formatDate(iso)` | locale-specifiek |
| bbl-hub.html:1166 | `function formatDate(iso)` | idem |
| bbl-profile.html:554 | `function formatDate(iso)` | idem |
| company-discover.html:534 | `function formatDate(d)` | varianten parameter-naam |
| match-dashboard.html:4735 | `function formatDate(dateStr)` | idem |
| mijn-sollicitaties.html:286 | `function formatDate(d)` (binnen IIFE) | idem |
| vacature-detail.html:727 | `function formatDate(d)` | idem |

**Risico**: drift. 7 implementaties met naar verwachting subtiele verschillen in maand-naam, uitgangsformaat, lokaal-string. **P8 violation** (Build rule: gedeeld contract eerst definiëren).

**Mitigatie**: vervang allen door `formatNLDate()` uit utils.js. Volume: 7 edits, ~30 min.

**Classificatie: P2** — code-duplicatie + drift-risico, geen functionele bug.

### F5.1.B — geen `function notify(` of `function escapeHtml(` buiten utils.js [PASS]
Loop-shield gehandhaafd. PASS.

---

## 5.2 — Hardcoded magic numbers

### F5.2.A — `56px` topbar-height in 22 bestanden [P2]
| Pagina | Aantal hits |
|---|---|
| company-dashboard | 4 |
| school-dashboard | 4 |
| begeleider-dashboard | 4 |
| admin | 4 |
| bbl-hub | 1 |
| bbl-dashboard | 1 |
| bbl-profile | 1 |
| buddy-dashboard | 1 |
| chat | 2 |
| match-dashboard | 1 |
| matchpool | 2 |
| mijn-sollicitaties | (verifieer) |
| algemene-voorwaarden | 2 |
| privacybeleid | 2 |
| security | 2 |
| spelregels | 2 |
| cookiebeleid | 2 |
| review-form | 1 |
| esg-rapportage | 1 |
| internly-worldwide | 1 |
| hoe-het-werkt | 1 |
| matches | 1 |

Pattern: `height: 56px; padding: 0 24px;` voor topbar + `top: 56px; height: calc(100vh - 56px);` voor sticky-sidebar.

**Mitigatie**: voeg `--topbar-h: 56px;` toe aan `:root` in style.css en gebruik overal `var(--topbar-h)`. Eén plek wijzigen ipv 22 pagina's.

**Classificatie: P2** — niet kritisch, maar wijziging vereist 22 file-edits ipv 1.

### F5.2.B — `width: 56px; height: 56px;` (avatar sizing) [P3]
Alleen in about.html:312 — geïsoleerd. PASS.

### F5.2.C — Andere magic numbers
- `24px` padding — overal aanwezig, hoort in CSS-variabel `--s5` of `--s4` (deels al gedefinieerd via `var(--s5, 24px)`)
- `220px` sidebar-width — verwacht in 4 dashboards, niet getest
- `60px` collapsed sidebar — verwacht in mobile responsive
- `768px` breakpoint — overal in @media queries (industry-standard, acceptable)
- `300ms` / `200ms` transition durations — meestal via `var(--t-fast, 120ms)` patroon, deels hardcoded

**Geen kritieke vondsten naast 56px.** Classificatie P3.

---

## 5.3 — Hardcoded colors

### CSS-variabelen reeds gedefinieerd (style.css:181-191)
```css
--green:    #1a7a48;   --green-bg: #e8f5ee;
--blue:     #1a4a7a;
--amber:    #b87a1a;   --amber-bg: #fdf3e0;
--red:      #b82020;   --red-bg:   #fdeaea;
--ink:      #0d1520;   --ink2:     #374151;   --ink3: #7a8799;
--bg2:      #f4f6f9;
```

### Hardcoded hex-codes in HTML (greppattern: `#0d1520|#1a7a48|...`)
927 hits over 50 files. Top-offenders:
| Pagina | Hex-hits |
|---|---|
| student-profile.html | 72 |
| bol-profile.html | 71 |
| bbl-hub.html | 65 |
| discover.html | 60 |
| internly-worldwide.html | 56 |
| hoe-het-werkt.html | 53 |
| company-dashboard.html | 50 |
| match-dashboard.html | 38 |
| chat.html | 36 |
| mijn-berichten.html | 27 |
| kennisbank-artikel.html | 26 |
| bbl-dashboard.html | 22 |
| bbl-profile.html | 21 |
| admin.html | 20 |
| mijn-sollicitaties.html | 20 |

### F5.3.A — Hardcoded kleuren overal [P3 — bekend]
CLAUDE.md §Open voor Sprint 5 noemt expliciet:
> Hardcoded kleuren #0d1520, #1a7a48, #b82020, #7a8799, #374151 vervangen door variabelen in de bestanden zelf — sprint 5 werk

Status onveranderd. Migratie is post-LT.

**Hint voor migratie**: `var(--ink, #0d1520)` patroon werkt in style.css op regel 246-247 en biedt fallback. 5 grote pagina's (student-profile, bol-profile, bbl-hub, discover, internly-worldwide) zijn 60% van het werk.

**Classificatie: P3** — bekende tech-debt, post-LT.

---

## 5.4 — Footer-structuur

### Inventarisatie `<footer>` tags
**48 hits over 48 bestanden** (1 per pagina). Vrijwel elke HTML-pagina heeft een eigen `<footer>` block.

### `renderFooter()` helper
**Bestaat NIET**: `function renderFooter\(` returnt 0 hits. Helper is alleen als TODO genoemd in 7 pagina's:
| Pagina | Locatie comment |
|---|---|
| bbl-hub.html:2991 | `<!-- TODO: vervang met shared renderFooter() (Backlog #8) -->` |
| international-school-dashboard.html:1010 | idem |
| international-student-dashboard.html:2363 | idem |
| matchpool.html:525 | idem |
| mijn-notities.html:383 | idem |
| pricing.html:753 | idem |
| review-form.html:408 | idem |

**Bevinding**: het audit-prompt zei "48 hardcoded + 7 met `renderFooter()` helper-aanroep" — niet correct. **Realiteit: 48 hardcoded + 7 met TODO-comment voor toekomstige helper. De helper is nog niet geïmplementeerd.**

### F5.4.A — 48 hardcoded `<footer>` blocks, geen helper [P3]
Tech-debt: footer-content drift over 48 pagina's mogelijk. CLAUDE.md verwijst naar TODO_FOOTER_REFACTOR voor de migratie-plan.

**Mitigatie**: 
1. Bouw `renderFooter()` in js/utils.js die `kb-shared-footer` html returnt
2. Vervang alle 48 `<footer>` blocks door `<div id="footer-anchor"></div>` + `renderFooter()` aanroep aan einde van pagina-script

Volume: ~3-4 uur werk (overkill voor pre-LT).

**Classificatie: P3** — bekende tech-debt, geen LT-blocker.

---

## 5.5 — IIFE welkomstblok-pattern

### 3 IIFEs aangetroffen (bevestigd Run 3)
| Pagina | Lokatie | Pattern |
|---|---|---|
| bbl-hub.html:712 | `(async () => { ... })()` | fetch profile + studentProfile → calculateCompleteness → renderRoleLanding('student_bbl', data) |
| company-dashboard.html:745 | `(async () => { ... })()` | fetch profile + companyProfile → calculateCompleteness → renderRoleLanding('bedrijf', data) |
| school-dashboard.html:722 | `(async () => { ... })()` | fetch profile + schoolProfile → calculateCompleteness → renderRoleLanding('school', data) |

### Pattern-divergentie
**Step-by-step kruisverwijzing**:
1. **Auth-check** — alle 3 hetzelfde patroon (db.auth.getUser → if !user return)
2. **Role-fetch** — alle 3 select 'naam, role' op profiles
3. **Role-specific fetch** — verschillende kolomlijsten:
   - bbl: `opleiding, jaar, school, opdracht_domein, motivatie, skills, bbl_mode, postcode`
   - bedrijf: `bedrijfsnaam, sector, size, trust_score, trust_grade, website, beschrijving, avatar_key, remote_possible`
   - school: (verifieer)
4. **Completeness-calc** — `calculateProfileCompleteness('<role>', data)` + `getCompletenessSuggestions('<role>', data)` — identiek pattern
5. **profile_edit_url** — verschillend: bbl='bbl-profile.html', bedrijf='#', school='#' (zie F4.6.A)
6. **renderRoleLanding** — `anchor.innerHTML = renderRoleLanding('<role>', data)` — identiek
7. **Quick actions injection** — `anchor.querySelector('.rl-actions').innerHTML = ...` — divergent (rol-specifieke buttons)

### F5.5.A — Welkomstblok-IIFE kandidaat voor helper [P3]
Stap 1, 2, 4, 6 zijn 100% identiek over de 3 IIFEs. Alleen stap 3 (kolom-lijst), 5 (edit-url), 7 (quick actions) zijn verschillend.

**Mitigatie**: helper `setupRoleLanding(config)`:
```js
async function setupRoleLanding({ role, anchorId, profileTable, columns, profileEditUrl, quickActionsHtml }) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;
  const { data: profile } = await db.from('profiles').select('naam, role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== expectedRole) return;
  const { data: roleProfile } = await db.from(profileTable).select(columns).eq('profile_id', user.id).maybeSingle();
  const data = { naam: profile.naam, ...roleProfile };
  data.profile_completeness = calculateProfileCompleteness(role, data);
  data.completeness_suggestions = getCompletenessSuggestions(role, data);
  data.profile_edit_url = profileEditUrl;
  document.getElementById(anchorId).innerHTML = renderRoleLanding(role, data);
  // caller inserts quick actions via callback or DOM-query
}
```

**Classificatie: P3** — nice-to-have refactor. Niet LT-blocker.

---

## 5.6 — Edge Functions

### Inventarisatie (uitgebreid van Fase 2)
| Functie | LOC | Aanroeper | Status | Auth-mode |
|---|---|---|---|---|
| `create-checkout` | 122 | pricing.html (stub) | DEAD voor LT | JWT-required (handmatige check r49-54) |
| `mollie-webhook` | 405 | externe Mollie webhook | LIVE indien Mollie actief | service_role + Mollie signature |
| `send-push-notification` | 34 | DB-trigger via webhook | LIVE | **GEEN auth-check** — zie F2.6.A |
| `vat-verify` | 284 | company-dashboard.html:2896 | LIVE | (verifieer JWT-mode) |

### Dode functions
**ZERO dode Edge Functions** — alle 4 hebben caller(s). create-checkout is stub-status (Mollie niet actief) maar de code is wel referencable vanuit pricing.html toekomstige flow.

### F5.6.A — Geen Edge Function deploy-status getest [VERIFY]
Geen indicator in code-tree welke functies daadwerkelijk gedeployed zijn op productie. Documentation:
- `_docs/MIGRATIONS_HARD_WON.md` noemt mollie-webhook
- `docs/audits/AUDIT_IMPLEMENTATIE_2026-05-03.md:284` noemt mollie-webhook +405 regels herschreven CC1, **uncommitted op werkkopie** (status mei 2026 onbekend)
- HANDOVER.md noemt deployments

**Verifieer voor LT**:
```bash
supabase functions list
# verwacht: vat-verify (deployed), send-push-notification (deployed), 
#          create-checkout (mogelijk deployed), mollie-webhook (mogelijk uncommitted)
```

**Classificatie: VERIFY** voor LT-readiness.

---

## 5.7 — SQL migration history

### SQL-bestanden in working tree
| Bestand | Regels | Type | Status |
|---|---|---|---|
| `internly_migration.sql` | 1142 | full DDL — schema + RLS + indexes + kb_articles | base migration |
| `sql/migrations.sql` | 111 | post-base ALTER TABLE additions (BBL, buddy, conversations buddy_pair_id, buddy_queue) | incrementeel |
| `AVATAR_MIGRATION.sql` | 32 | avatars storage bucket + policies | incrementeel |
| `BACKLOG_MIGRATION.sql` | 13 | backlog tabel | incrementeel |
| `BUDDY_PROFILE_RUN2_MIGRATION.sql` | 25 | buddy_profile uitbreidingen | incrementeel |
| `STAGE_MILESTONES_MIGRATION.sql` | 144 | stage_milestones tabel + RLS | incrementeel |
| `SQL_CLEANUP_DUPLICATE_POLICIES_DRAFT.sql` | 95 | cleanup-bundel | **DRAFT — niet uitgevoerd** |

### F5.7.A — Geen migrations-tabel of versie-tracking [P2 — bekend]
Geen `schema_migrations` tabel zichtbaar in DDL. Geen volgordelijke versie-nummering. Volgorde wordt extern bijgehouden (CLAUDE.md "STARR SQL-migratie uitvoeren" als open punt).

**Risico**: 6 ALTER-bestanden moeten in juiste volgorde worden uitgevoerd. Geen idempotentie-garantie — alleen `CREATE TABLE IF NOT EXISTS` en `ALTER TABLE ADD COLUMN IF NOT EXISTS` patronen aanwezig (acceptable per file-niveau).

**Classificatie: P2** — bekend tech-debt, niet kritisch maar verhoogt risico bij DB-recreate.

### F5.7.B — `SQL_CLEANUP_DUPLICATE_POLICIES_DRAFT.sql` is draft [VERIFY]
File header: "REQUIRES BARRY APPROVAL vóór uitvoering". Behandelt duplicate policies op `matches`, `notifications`, `buddy_requests` (Layer 3 audit april 2026).

**VERIFY**: is deze cleanup uitgevoerd? Indien ja: zou file uit working tree moeten of moved naar `_archief/`. Indien nee: doc-gat (zou in BACKLOG.md moeten staan).

### F5.7.C — Pending vs uitgevoerd onderscheid ontbreekt [P3]
Welke `ALTER TABLE`s zijn gedraaid op productie? Geen audit-log in repo. CLAUDE.md noemt "STARR SQL-migratie uitvoeren" als open punt — minstens één migration is pending.

**Mitigatie**: 
- Vraag Barry: welke migration files zijn op productie uitgevoerd?
- Documenteer in `sql/MIGRATION_LOG.md` met executed-at datum per file
- Voor nieuwe migrations: voeg datum-prefix toe (`2026-05-09-stage-milestones.sql`)

**Classificatie: P3** — observability, geen acute bug.

### F5.7.D — `internly_migration.sql` met `CREATE TABLE IF NOT EXISTS` patroon [INFO]
File is volledig idempotent (gebruikt `IF NOT EXISTS` overal en `DROP POLICY IF EXISTS` vóór CREATE). Veilig om herhaaldelijk uit te voeren. PASS.

---

## TOP 5 BEVINDINGEN — FASE 5

| # | ID | Severity | Beschrijving | Tijdkost fix |
|---|---|---|---|---|
| 1 | F5.7.A / F5.7.C | **P2** | Geen migration-versie-tracking — risico bij DB-recreate of nieuwe omgeving (livetest-staging?) | 30 min docs + 5 min ALTER |
| 2 | F5.1.A | P2 | 7× `function formatDate(` lokaal gedefinieerd — drift-risico | ~30 min |
| 3 | F5.2.A | P2 | `56px` topbar-height in 22 bestanden — niet via CSS-variabele | ~45 min find-replace |
| 4 | F5.3.A | P3 (bekend) | 927 hardcoded hex-codes verspreid; CSS-vars al gedefinieerd | ~3 uur post-LT |
| 5 | F5.4.A | P3 (bekend) | 48× hardcoded `<footer>` zonder helper; 7 TODO-comments verwijzen naar niet-bestaande `renderFooter()` | ~3-4 uur post-LT |

### Andere observaties
- 7/11 loop-shield singletons (notify/escapeHtml/createNotification/SUPABASE_URL/hasActivePlan/renderTrustBadge): **PASS** — alle 1 hit
- IIFE welkomstblok in 3 dashboards: **divergent waar het moet** (kolom-lijst per rol), **identiek waar mogelijk** (auth + completeness + render). Refactor-kandidaat (P3)
- Edge Functions: 4 stuks, **geen dode code**. send-push-notification auth-check VERIFY blijft openstaan (F2.6.A)
- SQL-bestanden: 7 stuks, één expliciet draft (`SQL_CLEANUP_DUPLICATE_POLICIES_DRAFT.sql`)
- Audit-prompt vermeldde "7 met renderFooter helper-aanroep" — **incorrect**; het zijn 7 TODO-comments, helper bestaat niet

**STOP — Fase 5 klaar.** Wacht op "ga door fase 6".
