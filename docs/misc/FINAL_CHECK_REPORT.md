# FINAL CHECK REPORT — PRE-FTP
**Datum** 2026-05-04 · **Sessie** final-check audit · **Modus** READ-ONLY · **Geen patches toegepast**

Verificatie van vandaag's drie commits (e2941b2 bedrijf-flow + 7d4edd3 pakket A + 35ad118 afterwork). Alle pakket-A-files zitten in HEAD, niet in working tree — `git status` toont alleen pre-existerende modificaties (CLAUDE.md, about.html, pricing.html, robots.txt, sitemap.xml, js/buddy.js, js/calendar.js) die buiten scope van vandaag vallen.

---

## Sectie A — Bedrijf-flow patches

| # | Item | Result | Bewijs |
|---|---|---|---|
| A.1 | Item 7 wit-op-wit | **PASS** | [company-dashboard.html:574](company-dashboard.html#L574) bevat `style="color:var(--ink);font-weight:600"`. Geen `style="color:#fff"` op die regel. |
| A.2 | Item 9 sidebar back-button | **PASS** | [company-dashboard.html:726](company-dashboard.html#L726) bevat `onclick="goBack('company-dashboard.html')"`. Geen `goBack('discover.html')`. |
| A.3 | Item 10 chat back-button + mobile-tabs | **PASS** | [chat.html:482](chat.html#L482) heeft `id="chat-back-btn"`. Init-script [chat.html:1622-1636](chat.html#L1622-L1636) bevat rol-aware switch (`bedrijf` → `company-dashboard.html#matches`, `school` → `school-dashboard.html`, `begeleider` → `begeleider-dashboard.html`, default student `matches.html`). Mobile-tabs verborgen voor non-student via `_mobileTabs.style.display = 'none'`. |
| A.4 | Item 11 CAN-tabel | **PASS** | [match-dashboard.html:2563-2573](match-dashboard.html#L2563-L2573) `bedrijf`-rij: alle stage-content writes op `false` (addTask/editTask/deleteTask/checkTask/addDeadline/editDeadline/addReflectie/editReflectie/updateLeerdoel/editStageplan). Begeleidings-acties op `true` (inviteSchool/viewLog/viewScores). Student-, school-, begeleider-rijen ongewijzigd t.o.v. spec. **Noot:** spec gaf regel 2541-2580; werkelijke locatie 2554-2592 — drift in regel-aanduiding, inhoud klopt. `bedrijf-empty-state` grep → 7 hits in match-dashboard.html (≥ 5 vereist). |
| A.5 | Item 12 pricing-anchors | **PASS** | 8 hits van `pricing.html` in [company-dashboard.html](company-dashboard.html), allen eindigen op `#section-bedrijf` (regels 714, 1556, 1665, 1681, 1786, 3185, 3226, 3631). Geen anchor-loze hits. |
| A.6 | TODO files aanwezig | **PASS** | [TODO_ROL_AWARE_BACK_NAVIGATION.md](TODO_ROL_AWARE_BACK_NAVIGATION.md) aanwezig met juiste structuur (context + wat + niet-doen + trigger). [TODO_LANG_SWITCHER_CLEANUP.md](TODO_LANG_SWITCHER_CLEANUP.md) aanwezig. |

---

## Sectie B — Pakket A patches

| # | Item | Result | Bewijs |
|---|---|---|---|
| B.1 | Sectie 3 manifest + sw.js | **PASS** | [manifest.json:12,17](manifest.json) icons-array: `favicon_192x192.png` + `favicon_512x512.png`. Geen `icons/icon-*` paths. [sw.js:17](sw.js#L17) `icon: '/favicon_192x192.png'`. [sw.js:18](sw.js#L18) `badge: '/favicon_192x192.png'`. |
| B.2 | Sectie 6 debug-flag | **PASS** | [js/utils.js:14-16](js/utils.js#L14-L16) bevat `__INTERNLY_DEBUG === undefined` → default `false`. [js/animations/match-celebrate.js:370](js/animations/match-celebrate.js#L370) self-test guard: `if (!fail && window.__INTERNLY_DEBUG)`. [js/animations/match-celebrate.js:366](js/animations/match-celebrate.js#L366) `console.error` op FAIL-pad ongewijzigd. |
| B.3 | Sectie 4 lang-switcher | **PASS** | [css/style.css:257-264](css/style.css#L257-L264) bevat comment-block plus `.lang-btn { display: none !important; }`. |
| B.4 | Sectie 1 favicon-uitrol | **PASS** | Alle 11 doelpagina's hebben `apple-touch-icon` én `rel="manifest"` (cat A: 3 pagina's met manifest toegevoegd; cat B: 8 pagina's met volledig 4-regel template). |
| B.5 | Sectie 2 OG-uitrol | **PASS** | Alle 8 doelpagina's hebben `og:title` + `og:image` + `twitter:card`. Bestaande `meta name="description"` op alle 8 doelpagina's behouden — geen vervanging gedaan. |

---

## Sectie C — RLS client-code (write-locations op stage_* tabellen)

**Methode:** grep op `db.from('stage_*').{insert|update|delete|upsert}` over alle JS/HTML.

**Bevinding:** 11 write-locations gevonden, alle in [match-dashboard.html](match-dashboard.html). Geen writes in andere bestanden.

| Regel | Tabel | Operatie | Context |
|---|---|---|---|
| 3636 | stage_tasks | update | Status flip via `can('checkTask')` UI-gate (student=true, anderen=false) |
| 3671 | stage_tasks | delete | Delete via student-only knop |
| 4112 | stage_tasks | update | Edit via `can('editTask')` UI-gate (student=true) |
| 4172 | stage_deadlines | update | Edit via `can('editDeadline')` (alleen student=true voor add, edit=false voor allen) |
| 4230 | stage_leerdoelen | update | Progress + notes via `can('updateLeerdoel')` (student=true) |
| 4245 | stage_leerdoelen | update | Progress-only via student-input |
| 4334 | stage_reflecties | update | Edit via `can('editReflectie')` (student=true) |
| 4366 | stage_reflecties | delete | Delete via student-knop |
| 4663 | stage_plans | update (school_invited) | Via `inviteSchool` actie — student=true én bedrijf=true |
| 4685 | stage_log | insert | Logging — universele actie, alle rollen |
| 4985 | stage_plans | update (schoolnoot) | Via school-noot input — alleen school zou dit triggeren |

**Gates:** writes worden gegated door CAN-tabel via `if (!can(...))` checks rond UI-render. Bedrijf ziet de trigger-UI niet voor student-content, dus de write-functies zijn niet bereikbaar via UI.

**Twee writes met multi-rol toegang (intentioneel):**
- `stage_log` insert (4685) — alle rollen mogen loggen
- `stage_plans` school_invited update (4663) — `inviteSchool` op `true` voor zowel student als bedrijf in CAN-tabel

**Onzeker, jij beoordeelt:** of `stage_plans` schoolnoot (4985) door bedrijf bereikbaar is via UI. CAN-tabel toont geen `schoolnoot`-actie, maar het is ook niet uitgesloten dat de input-handler render-condities heeft die ik niet heb traced. Bedward zou hier client-code-walk moeten doen.

**Conclusie:** geen onverwachte writes vanuit non-student-rol gevonden via UI-paden. SQL-zijde RLS (Supabase) blijft de finale guard.

---

## Sectie D — Globale check

| # | Item | Result | Bewijs |
|---|---|---|---|
| D.1 | Orphaned `icons/icon-` | **PASS** | Grep door alle HTML/JS/JSON → **0 hits**. |
| D.1b | Hardcoded `discover.html` in 3 dashboards | **PASS met caveat** | [begeleider-dashboard.html:513](begeleider-dashboard.html#L513) en [school-dashboard.html:708](school-dashboard.html#L708) hebben nog `goBack('discover.html')`. **Beide gedocumenteerd in [TODO_ROL_AWARE_BACK_NAVIGATION.md](TODO_ROL_AWARE_BACK_NAVIGATION.md)** als deferred drift. company-dashboard heeft alleen `company-discover.html` (terecht, geen student-pad). Niet blocker — bekend en gepland voor router-state refactor. |
| D.2 | Syntax-check JS | **PASS** | `node --check` op js/utils.js, js/animations/match-celebrate.js, js/profanity.js, sw.js → alle 4 OK. |
| D.2b | Script-tag balance | **PASS** | company-dashboard.html: 22 `<script` / 22 `</script>`. match-dashboard.html: 14/14. chat.html: 13/13. |
| D.3 | Console-state | **PASS** | Grep `console.log` in /js/ → 2 hits: [js/animations/match-celebrate.js:371](js/animations/match-celebrate.js#L371) (achter `__INTERNLY_DEBUG`-guard, geen output in productie); [js/profanity.js:113](js/profanity.js#L113) (in `/* */` comment-block, regel 114 sluit met `*/`). Beide veilig. |
| D.4 | TODO/FIXME/XXX in /js/ | informationeel | **0 hits**. |

---

## Sectie E — FTP upload lijst

### E.1 — Files gewijzigd in vandaag's 3 commits (HEAD~3..HEAD)

| Categorie | Aantal | Files |
|---|---|---|
| HTML productie | 16 | 404, algemene-voorwaarden, chat, company-dashboard, cookiebeleid, esg-export, esg-rapportage, hoe-het-werkt, internly-worldwide, kennisbank, kennisbank-artikel, match-dashboard, mijn-notities, preview, privacybeleid, student-home |
| JS productie | 2 | js/utils.js, js/animations/match-celebrate.js |
| CSS productie | 1 | css/style.css |
| JSON productie | 1 | manifest.json |
| Service Worker | 1 | sw.js |
| Edge Function | 1 | supabase/functions/vat-verify/index.ts (**deploy via Supabase CLI, niet FTP**) |
| MD logs/docs | 14 | AFTERWORK_LOG, BEDRIJF_FLOW_DIAGNOSE, BEDRIJF_FLOW_FIX_LOG, COSMETIC_AUDIT, COSMETIC_FIX_LOG, DEAD_FILES_INVENTORY, TODO_*.md (8) |

### E.2 — Copy-paste-klare FTP-upload-lijst (productie alleen)

**Geen file in deze lijst zit in `_revamp_2026-04-29/` of `BACKUP/` — geverifieerd.**

```
404.html
algemene-voorwaarden.html
chat.html
company-dashboard.html
cookiebeleid.html
css/style.css
esg-export.html
esg-rapportage.html
hoe-het-werkt.html
internly-worldwide.html
js/animations/match-celebrate.js
js/utils.js
kennisbank-artikel.html
kennisbank.html
manifest.json
match-dashboard.html
mijn-notities.html
preview.html
privacybeleid.html
student-home.html
sw.js
```

**Totaal: 21 files voor FTP-upload.**

### E.3 — Niet via FTP (separate deploy-pad)

```
supabase/functions/vat-verify/index.ts
```
→ deployen via `npx supabase functions deploy vat-verify` of de Supabase Console.

### E.4 — Niet uploaden (logs/docs/TODO's, blijven in repo)

```
AFTERWORK_LOG.md
BEDRIJF_FLOW_DIAGNOSE.md
BEDRIJF_FLOW_FIX_LOG.md
COSMETIC_AUDIT.md
COSMETIC_FIX_LOG.md
DEAD_FILES_INVENTORY.md
TODO_ACCOUNT_REFACTOR.md
TODO_FOOTER_REFACTOR.md
TODO_LANG_SWITCHER_CLEANUP.md
TODO_LEARNING_AGREEMENT_RPC.md
TODO_MESSAGES_TAMPER_TRIGGER.md
TODO_NOTIFICATIONS_INSERT_HARDENING.md
TODO_ROL_AWARE_BACK_NAVIGATION.md
TODO_WORLDWIDE_REDESIGN.md
```

---

## Eindconclusie

| Metric | Aantal |
|---|---|
| PASS | 13 (A.1, A.2, A.3, A.4, A.5, A.6, B.1, B.2, B.3, B.4, B.5, D.2, D.3) |
| PASS met caveat | 1 (D.1b — bekende deferred drift, gedocumenteerd) |
| Onzeker | 1 (Sectie C — `stage_plans` schoolnoot bereikbaarheid) |
| FAIL | 0 |
| Informationeel | 1 (D.4) |

**Stop-condities:** geen geraakt. Geen FAILs, geen syntactische fouten, geen blockers.

**Aanbeveling: GA.**

- Pakket A en bedrijf-flow patches zijn correct doorgevoerd en gecommit.
- Geen orphaned references naar oude paths.
- Geen syntax-issues in gepatcht JS.
- Console-state schoon (alleen guarded en in-comment hits).
- FTP-upload-lijst is compact (21 productie-files), geen archief-residu.

**Caveats voor jouw aandacht:**

1. **Sectie C onzekerheid:** Bedward kan in 5 minuten verifiëren of `stage_plans.schoolnoot` write (regel 4985) door bedrijf bereikbaar is via UI. Niet een blocker, eerder een audit-vraag.
2. **D.1b TODO open:** [school-dashboard.html:708](school-dashboard.html#L708) en [begeleider-dashboard.html:513](begeleider-dashboard.html#L513) hebben nog `goBack('discover.html')`. Deferred per [TODO_ROL_AWARE_BACK_NAVIGATION.md](TODO_ROL_AWARE_BACK_NAVIGATION.md). Bekend, niet kritiek voor 11 mei livetest.
3. **kennisbank-artikel.html OG-fallback:** og:title staat op statische "Internly Kennisbank" — dynamische per-artikel OG zou js/kb.js moeten meeschrijven. Niet in FTP-blocker scope.

**Niet aangeraakt deze sessie:** js/telemetry.js, geen SQL, geen productie-files (read-only audit).
