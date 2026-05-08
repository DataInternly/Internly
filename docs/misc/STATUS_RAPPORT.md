# Internly — Status Rapport voor FTP-Deploy Beslissingen

Datum: 2026-05-04
Modus: read-only, geen patches
Doel: Barry beslist deploy-volgorde voor livetest 11 mei

---

## Sectie 1 — Git-staat

### Branch + remote
- Branch: `main`
- Recent gepushte HEAD: `35ad118`

### Laatste 20 commits (oudste onderaan)

| Hash | Type | Onderwerp |
|---|---|---|
| 35ad118 | docs | afterwork pass logs + dead files inventory + todo updates |
| 7d4edd3 | chore | cosmetic pakket A sectie 1-6 (manifest, sw, debug-flag, og, favicon, lang-hide) |
| e2941b2 | fix | bedrijf-flow items 7, 9, 10, 11, 12 + diagnose en fix logs |
| 7210128 | feat | profiel: gewogen completeness + aanvulsuggesties + matching-update |
| 84a4803 | fix | livetest K-1 + S-2 + S-3 + S-5 + S-7 pre-livetest fixes |
| c8dc6f1 | fix | student-home: blanke pagina + consent-aware telemetry |
| 5947379 | fix | check 5 nav debug FAIL — hardcode stage-naam dynamisch |
| e0ef6e1 | fix | buddy B-06: buddy-view scheiden van vacature-matches |
| 8702eea | fix | header B-04 + B-07 + B-08 uniformiteit |
| 8909637 | fix | landing B-01 + B-05 BOL student landing en routing |
| 9818e69 | fix | auth B-02 + B-09 auth-state stabilisatie |
| 4f2c0e2 | content | blog.html + kennisbank-slug-routing |
| c4554fa | nav | empty-states navigerend op 4 pagina's |
| 247e9e5 | nav | matchpool-tab toegevoegd aan BBL student-navigatie |
| 9d13346 | nav | role-indicator + style.css WIP-bundel |
| 5829771 | fix | _fCtx typeof-guards voor consent-loze pagina's |
| b42138b | fix | mollie-webhook idempotency + Mollie API terug-fetch + security hardening |
| 74731fe | fix | consent-coverage: telemetry conditioneel + consent.js op alle pagina's |
| 928f251 | fix | cookie-consent AVG-banner + cookiebeleid + algemene voorwaarden |
| 6e84561 | fix | session-race _waitForSession singleton + SIGNED_OUT redirect |

### Diff-stat HEAD~7 → HEAD (laatste 7 commits)

41 bestanden gewijzigd, 2477 toevoegingen, 84 verwijderingen.

**Code-bestanden geraakt:**
- HTML: 18 pagina's (404, algemene-voorwaarden, bol-profile, chat, company-dashboard, cookiebeleid, esg-export, esg-rapportage, hoe-het-werkt, internly-worldwide, kennisbank, kennisbank-artikel, match-dashboard, matches, matchpool, mijn-notities, preview, privacybeleid, student-home)
- JS: 4 bestanden (animations/match-celebrate, roles, utils — plus matches.html in HTML-rij)
- CSS: css/style.css (9 regels)
- Manifest/SW: manifest.json + sw.js
- Edge: supabase/functions/vat-verify/index.ts (284 regels — nieuw)

### Working tree status

**Modified (8 tracked files):**
- CLAUDE.md, about.html, js/buddy.js, js/calendar.js, pricing.html, robots.txt, sitemap.xml, supabase/.temp/cli-latest

**Deleted (12 docs — verplaatst naar _archief/):**
- FIX_SESSION_2026-04-30.md, MIGRATIONS_HARD_WON.md, NAVIGATION_INTEGRITY_AUDIT_*, PREDEPLOY_AUDIT_PART{1,2,3}_*, ROUTING_AUTH_AUDIT.md, ROUTING_FIX_LOG.md, SRI_HASHES_TODO.md, TRACKER_AUDIT.md, TRACKER_BUILD_LOG_INSTRUCTIE2.md
- Plus _revamp_2026-04-29/backups/style.backup.2026-04-29.css

**Untracked (kritiek):**
- `js/avatar.js`, `js/profileView.js`, `js/welcome-overlay.js` — JavaScript bestanden gereferenced in productie HTML maar **NIET in git**
- `AVATAR_MIGRATION.sql`, `BACKLOG_MIGRATION.sql` — SQL migratiebestanden, nooit gecommit
- `supabase/functions/vat-verify/` — edge function in working tree, niet in git
- `_docs/` directory — onbekende inhoud
- 30+ `.md` bestanden (_archief, audits, TODOs, build logs)

### Per recente commit — wat zit erin

| Commit | Bestanden geraakt | Hoofdimpact |
|---|---|---|
| 35ad118 | 8 docs (deletions) | docs-cleanup, geen runtime-impact |
| 7d4edd3 | manifest.json, sw.js, utils.js, match-celebrate.js, style.css, 19 HTML | cosmetic pakket A — favicon-paths, OG-meta, debug-flag, lang-hide |
| e2941b2 | match-dashboard, company-dashboard, chat + diagnose-logs | bedrijf-flow items 7/9/10/11/12 |
| 7210128 | student-home.html, bol-profile.html | gewogen completeness + matching-update bij domein-edit |
| 84a4803 | matchpool, roles.js, utils.js, matches.html, student-home.html | livetest fixes K-1+S-2+S-3+S-5+S-7 |
| c8dc6f1 | student-home.html | nieuw bestand — blanke pagina + consent telemetry |
| 5947379 | match-dashboard.html | nav debug stage-naam dynamisch |
| e0ef6e1 | matches.html | buddy-view isolatie van vacature-deck |
| 8702eea | meerdere HTML headers | header uniformiteit B-04/B-07/B-08 |
| 8909637 | auth.html, landing-flows | BOL student landing routing |

---

## Sectie 2 — Open features per commit (deploy-classificatie)

| Commit | Classificatie | Toelichting |
|---|---|---|
| 35ad118 docs | **Pure code** (geen FTP nodig — docs only) | Alleen .md cleanup |
| 7d4edd3 cosmetic A | **Pure code** | manifest.json + sw.js + utils.js + match-celebrate.js + css + HTML — alles via FTP |
| e2941b2 bedrijf-flow | **Pure code** | match-dashboard / company-dashboard / chat HTML |
| 7210128 profiel | **Pure code** | student-home + bol-profile, gebruikt bestaande triggerStudentMatching |
| 84a4803 livetest fixes | **Pure code** | matchpool DOM, roles.js, utils.js, matches, student-home |
| c8dc6f1 student-home | **Pure code** | nieuwe HTML + telemetry consent-conditie |
| 5947379 nav debug | **Pure code** | match-dashboard tweak |
| e0ef6e1 buddy isolatie | **Pure code** | matches.html only |
| 8702eea header uniform | **Pure code** | HTML headers |
| 8909637 BOL landing | **Pure code** | auth + landing flows |
| 9818e69 auth state | **Pure code** | auth.html session handling |
| 4f2c0e2 blog | **Pure code** | blog.html + kennisbank-slug-routing |
| c4554fa empty states | **Pure code** | UI-kopjes |
| 247e9e5 matchpool BBL | **Pure code** | nav-config in utils.js |
| 9d13346 role indicator | **Pure code** | style.css WIP |
| 5829771 _fCtx guards | **Pure code** | telemetry.js typeof-guards (onaangeraakt deze sessie) |
| **b42138b mollie webhook** | **Plus Edge Function** | `supabase/functions/mollie-webhook/` — vereist `supabase functions deploy mollie-webhook`. Mogelijk ook SQL voor idempotency-tabel |
| 74731fe consent coverage | **Pure code** | consent.js + telemetry-conditie op 33 pagina's |
| 928f251 cookie consent | **Pure code** | consent.js + cookiebeleid.html + algemene-voorwaarden.html |
| 6e84561 session race | **Pure code** | utils.js + auth.html session singleton |

**Conclusie sectie 2:** 19 van 20 commits zijn Pure code (alleen FTP). Eén commit (b42138b mollie-webhook) vereist Edge Function deploy.

---

## Sectie 3 — Pending werk per stroom

| Stroom | Status | Open werk | Kritisch livetest 11 mei? |
|---|---|---|---|
| **Bedrijf-flow + Pakket A vandaag** | klaar (gecommit, niet gepusht-na-FTP) | FTP nodig: 19 HTML + manifest.json + sw.js + js/utils.js + js/animations/match-celebrate.js + css/style.css | **JA** — bevat student-home, matchpool DOM-fix, debug-flag, OG-meta |
| **Mollie webhook (b42138b)** | klaar in code, deploy-status onbekend | Edge Function deploy: `supabase functions deploy mollie-webhook`. Mogelijk SQL voor idempotency-tabel. **Vraag voor Barry.** | **NEE** voor livetest (Mollie staat als stub in pricing.html, niet actief in flow) |
| **Consent.js + cookiebeleid (928f251 + 74731fe)** | klaar in code, gepusht | FTP nodig: js/consent.js + cookiebeleid.html + algemene-voorwaarden.html + footer-uitbreidingen | **JA** — AVG-vereiste, livetest met externe gebruikers |
| **_fCtx typeof-guards (5829771)** | klaar in code, gepusht | FTP nodig: js/telemetry.js (**geen edits in deze sessie ✓**). Auth/la-sign/international-* pagina's tested? Onbekend | **JA** — voorkomt console-errors bij niet-consent gebruikers |
| **Blog-integratie (4f2c0e2)** | klaar in code, gepusht | FTP nodig: blog.html + kennisbank-slug-routing in JS | **NEE** — content-feature, geen functioneel pad in livetest |
| **RUN2 buddy-profile** | onbekend / WIP | Untracked: js/avatar.js, js/profileView.js, js/welcome-overlay.js. Geen commit. **Vraag voor Barry: af of WIP?** | **JA als WIP** — productie HTML referenceert deze JS-bestanden |
| **guardPage migratie 11 dashboards** | niet gestart | CLAUDE.md noemt Run 7C-G migratie — geen enkele pagina gebruikt guardPage() (audit 3 mei) | **NEE** — bestaande inline auth-checks werken |
| **Anon-key rotatie** | onbekend | js/supabase.js bevat anon-key. Was er gisteren een exposure? **Vraag voor Barry.** | **JA als nog niet gerouteerd** — security-blocker |

### Detail per stroom

**Bedrijf-flow + Pakket A** — Alles in laatste 3 commits (e2941b2 + 7d4edd3 + 35ad118). Bevat de 19 HTML-bestanden uit cosmetic uitrol én de bedrijf-flow fixes. FTP-bundel is groot (zie Sectie 1 diff-stat) maar klaar.

**Mollie webhook** — Code aanwezig in `supabase/functions/mollie-webhook/`. Idempotency-pattern in commit suggereert mogelijk een nieuwe `webhook_events` tabel. SQL niet zichtbaar in working tree — mogelijk al uitgevoerd of nog niet geschreven. Edge Function moet via Supabase CLI gedeployed worden. Niet livetest-blocker.

**Consent.js + cookiebeleid** — 33 pagina's hebben consent.js geladen. AVG-banner toont op eerste bezoek. cookiebeleid.html en algemene-voorwaarden.html zijn nieuwe wettelijke pagina's. **Vereist FTP voor publieke livetest.**

**_fCtx typeof-guards** — telemetry.js (no-go-zone) is in eerdere sessie aangepast met typeof-guards. Niet aangeraakt deze sessie ✓. Test: bezoek auth.html zonder consent — geen console-errors.

**RUN2 buddy-profile** — js/avatar.js (avatar-picker, geref. in CLAUDE.md "vanmiddag fix 30 apr"), js/profileView.js, js/welcome-overlay.js (geref. in CLAUDE.md "1 mei"). Alle drie untracked. **Productie kan nu al breken als deze niet via FTP geüpload zijn.** Vraag voor Barry.

**guardPage migratie** — Run 7C-G in CLAUDE.md gepland, niet uitgevoerd. Geen blocker.

**Anon-key rotatie** — Geen audit-bewijs van exposure. Vraag voor Barry.

---

## Sectie 4 — Modified plus untracked files

### Modified (tracked, edits zonder commit)

| Bestand | Stroom | Aanbeveling |
|---|---|---|
| CLAUDE.md | doc-update sessie-context | Commit als losse "docs: status rapport prep" of laten staan |
| about.html | onbekend (mogelijk consent footer) | Diff bekijken vóór FTP — kleine wijziging, mogelijk al deel van consent-pakket |
| js/buddy.js | onbekend (B-06 follow-up?) | Diff bekijken — buddy logica kritisch voor matches.html |
| js/calendar.js | onbekend | Diff bekijken — calendar wordt op match-dashboard gebruikt |
| pricing.html | consent footer of stub-update | Diff bekijken |
| robots.txt | SEO | OK voor FTP |
| sitemap.xml | SEO | OK voor FTP, regenereren met nieuwe pagina's |
| supabase/.temp/cli-latest | CLI tooling | Niet committen, IDE state |

### Untracked — kritiek voor productie

| Bestand | Stroom | Aanbeveling |
|---|---|---|
| **js/avatar.js** | RUN2 buddy/avatar | **Verifieer Barry: af of WIP?** Als af → committen + FTP. Productie pagina's verwijzen er waarschijnlijk al naar |
| **js/profileView.js** | RUN2 profile-view module | Idem |
| **js/welcome-overlay.js** | RUN2 welcome-overlay (1 mei) | Idem — match-dashboard.html line 2883 roept `maybeShowWelcomeOverlay` aan |
| **AVATAR_MIGRATION.sql** | RUN2 schema | **Vraag Barry: al in Supabase Console uitgevoerd?** Als nee + js/avatar.js gebruikt nieuwe kolommen → DB-error op productie |
| **BACKLOG_MIGRATION.sql** | onbekend schema-werk | Vraag Barry |
| supabase/functions/vat-verify/ | edge function (commercieel) | Niet in scope livetest, **vraag Barry: deploy nodig?** |

### Untracked — niet kritiek

| Bestand-groep | Aantal | Aanbeveling |
|---|---|---|
| `_archief/*.md` | 30+ | Cleanup/log files. Niet committen, niet FTP'en. |
| `AUDIT_*`, `*_LOG.md`, `*_REPORT.md` in root | 10+ | Build/audit logs. Niet FTP'en. Eventueel `.gitignore` toevoegen voor `_archief/`. |
| `_docs/` | onbekend | Vraag Barry of dit moet committen |
| `kennisbank.html.bak`, `kennisbank-artikel.html.bak`, `js/kb.js.bak` | 3 | Backup-files. **NIET FTP'en.** Verwijderen of in `.gitignore`. |

---

## Sectie 5 — Dringende vragen voor Barry

1. **Is Mollie webhook SQL al in Supabase uitgevoerd?**
   Commit b42138b noemt "idempotency". Als idempotency op DB-niveau via een `webhook_events` tabel werkt: vereist die migratie. Niet zichtbaar in working tree.

2. **Is mollie-webhook Edge Function al gedeployed?**
   Commit b42138b van enkele dagen geleden. `supabase functions deploy mollie-webhook` uitgevoerd? Als nee: webhook werkt niet bij eerste live betaling.

3. **Is anon-key al geroteerd na gisteren's exposure?**
   Vraag uit prompt suggereert er was een exposure-incident. Geen audit-bewijs in commits. Status onbekend.

4. **Is RUN2 (js/avatar.js + js/profileView.js + js/welcome-overlay.js) klaar of WIP?**
   Drie JavaScript-bestanden untracked. CLAUDE.md verwijst ernaar als "vanmiddag fix 30 apr 2026" en "1 mei 2026". Als productie HTML er al naar wijst: nu al broken zonder FTP.

5. **Is AVATAR_MIGRATION.sql al uitgevoerd in Supabase?**
   Untracked SQL-bestand. Als js/avatar.js nieuwe `avatar_key` kolom verwacht: vereist deze migratie eerst.

6. **Is BACKLOG_MIGRATION.sql al uitgevoerd?**
   Onbekend doel. Vraag context Barry.

7. **Is supabase/functions/vat-verify nodig voor livetest?**
   Edge function aanwezig, niet gecommit. Bedoeld voor BTW-verificatie bedrijven? Niet kritisch voor livetest met testbedrijf.

8. **Welke modified bestanden in working tree moeten meedoen met de FTP?**
   about.html, js/buddy.js, js/calendar.js, pricing.html — geen commit, dus diff onbekend buiten Barry's lokale state. Risico bij FTP zonder review.

9. **Mag `.bak`-files (kennisbank, kb.js) verwijderd worden?**
   Backup-files in working tree. Niet FTP'en, maar wel cleanup-actie.

10. **Wat is `_docs/` directory?**
    Untracked map, onbekende inhoud. Mogelijk losse documentatie die Barry recent heeft toegevoegd.

---

## Sectie 6 — Voorgestelde deploy-volgorde

### Stap 1 — Beslissingen vooraf (Barry, ~15 min)
1. Beantwoord vragen 1-2 (Mollie deploy status). Als niet gedeployed: parkeren, niet kritisch voor 11 mei.
2. Beantwoord vraag 3 (anon-key). Als nog niet geroteerd: rotatie eerst, voor alles anders.
3. Beantwoord vraag 4-5 (RUN2 + AVATAR_MIGRATION.sql status).
4. Diff-review op modified bestanden (about.html, js/buddy.js, js/calendar.js, pricing.html). Beslis per file: committen + FTP, of weglaten.

### Stap 2 — Database eerst (als migraties open zijn)
**Vereist:** Supabase Console toegang
1. AVATAR_MIGRATION.sql uitvoeren (alleen als RUN2 mee gaat)
2. BACKLOG_MIGRATION.sql uitvoeren (alleen als bevestigd nodig)
3. Verifieer schema-state via testquery

### Stap 3 — RUN2 commits (alleen als klaar verklaard)
Als js/avatar.js + js/profileView.js + js/welcome-overlay.js klaar zijn:
```
git add js/avatar.js js/profileView.js js/welcome-overlay.js
git commit -m "feat/run2: avatar picker + profile view + welcome overlay"
git push origin main
```

### Stap 4 — Pure code FTP-bundel (kritisch voor livetest)

**Volgorde uploaden naar FileZilla** (geen restart nodig tussen):

A. **Eerst de manifest + service worker** (PWA cache):
- manifest.json
- sw.js
- favicon_192x192.png + favicon_512x512.png (al aanwezig — geen upload nodig, alleen verifiëren)

B. **JavaScript core** (gebruikt door alle pagina's):
- js/utils.js (debug-flag + HEADER_NAV_BY_ROLE update)
- js/roles.js (S-2 fallback fix)
- js/animations/match-celebrate.js (debug-flag guard)
- js/avatar.js + js/profileView.js + js/welcome-overlay.js (als RUN2 mee gaat)
- js/consent.js (al gecommit)
- js/translate.js (al gecommit)
- js/buddy.js + js/calendar.js (na diff-review)

C. **CSS**:
- css/style.css (lang-btn hide + role-indicator)

D. **HTML — student-flow eerst** (livetest-kern):
- student-home.html
- matchpool.html (K-1 DOM-fix)
- matches.html
- bol-profile.html (gewogen completeness)
- match-dashboard.html
- discover.html
- mijn-sollicitaties.html
- mijn-berichten.html
- mijn-notities.html
- bbl-hub.html, bbl-dashboard.html, bbl-profile.html

E. **HTML — overige rollen**:
- company-dashboard.html (bedrijf-flow fixes)
- school-dashboard.html
- buddy-dashboard.html
- begeleider-dashboard.html
- chat.html

F. **HTML — publieke + AVG**:
- index.html, about.html, pricing.html
- cookiebeleid.html, algemene-voorwaarden.html, privacybeleid.html
- kennisbank.html, kennisbank-artikel.html, blog.html
- spelregels.html, faq.html, stagebegeleiding.html, hoe-het-werkt.html
- 404.html, internly-worldwide.html
- esg-export.html, esg-rapportage.html, preview.html

### Stap 5 — Edge Functions (alleen als nodig vóór 11 mei)
```
supabase functions deploy mollie-webhook
supabase functions deploy vat-verify   # alleen als bevestigd nodig
```

### Stap 6 — Verificatie post-deploy

1. **Smoke test** op productie:
   - Open https://internly.pro/student-home.html — geen blanke pagina
   - Open matchpool.html — kaarten renderen, swipe-knoppen zichtbaar
   - DevTools console — geen 404 op `/icons/icon-192.png`
   - DevTools console — geen `[match-celebrate] self-test OK` meer (debug-flag werkt)
   - AVG-banner verschijnt bij eerste bezoek (incognito test)

2. **Per rol login-test**:
   - Student BOL: doorsturen naar student-home.html
   - Student BBL: doorsturen naar bbl-hub.html
   - Bedrijf, school, buddy, begeleider: eigen dashboard

### Parkeren (na livetest 11 mei)
- guardPage migratie (Run 7C-G)
- Cosmetic Pakket B (buddy paars consolidatie)
- ESG-export feature (stub in company-dashboard)
- STARR SQL-migratie
- Mollie betaalintegratie volledig activeren

---

## Eind-aanbeveling

**Kritiek pad voor 11 mei:**
1. Beantwoord Sectie 5 vragen 1-5 (database + RUN2 status)
2. Diff-review modified files
3. Database-migraties indien nodig
4. Bundel-FTP volgens stap 4 hierboven
5. Smoke-test stap 6

**Niet-blocker:** Mollie webhook deploy, vat-verify, guardPage migratie, Pakket B.

**Tijdsinschatting:** Database 15 min, FTP-upload 20 min, smoke-test 15 min. Totaal ~50 min als alle Sectie 5 vragen "klaar"-antwoord hebben.

**Risico:** als RUN2 untracked bestanden niet kloppen met productie HTML-references, dan is productie nu al kapot tot Stap 3 + Stap 4 zijn voltooid.

Geen patches gemaakt. js/telemetry.js niet aangeraakt. Geen SQL uitgevoerd.
