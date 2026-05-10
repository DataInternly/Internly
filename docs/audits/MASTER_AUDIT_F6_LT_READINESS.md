# MASTER AUDIT — FASE 6 : PRE-LT READINESS
Datum: 9 mei 2026 (zaterdag — LT op 11 mei 9:00 maandag)
Methode: read-only inspectie van repo-state, git, docs, FTP-status

---

## 6.1 — Test-accounts

### CLAUDE.md vermeldt 3 base-accounts
| Rol | UUID-prefix | Email |
|---|---|---|
| Student | `65ed548f` | student@internly.pro |
| Bedrijf | `a5d25384` | bedrijf@internly.pro |
| School | `520f9b1a` | school@internly.pro |

### Audit-prompt vraagt 12 testaccounts
- 3 buddy-accounts: `buddy1.test@internly.pro`, `buddy2.test@internly.pro`, `buddy3.test@internly.pro`
- 3 student-accounts: `student1.test@internly.pro`, `student2.test@internly.pro`, `student3.test@internly.pro`
- 6 student_profiles met `zoekt_buddy=true`
- 6 buddy_profiles
- Plus base-accounts (Lena, Daan, Vandaag, HvA, Jan)

### Verificatie in repo
**Niet mogelijk** — testaccounts zitten in productie auth.users + profiles tabellen. Geen seed-file in repo voor testaccounts (alleen `seed/kb_articles_seed.sql` voor knowledge base).

### F6.1.A — Test-accounts moeten handmatig worden gecreëerd [P0/P1 — VERIFY]
Per `docs/runs/2026-05-08-EOD.md:18` (Outstanding voor zaterdag 9 mei):
> Tester namen + telefoonnummers verzamelen (deadline 12:00)

Dit suggereert dat testers niet de hierboven genoemde fictieve accounts gebruiken maar **echte deelnemers** met hun eigen contactgegevens.

**Vraag voor Barry**:
1. Komen testers met eigen account, of pre-aangemaakt?
2. Indien pre-aangemaakt: zijn de 6 buddy + 6 student accounts daadwerkelijk in DB?
3. Indien echte deelnemers: hoe geven we hen toegang vóór 11 mei 9:00? Auth-flow is werkend.

**GO/NO-GO**: zaterdag 9 mei 12:00 deadline volgens EOD-journal. Als deze deadline gehaald wordt, **GO**. Anders **VERIFY** noodzakelijk maandag 8:00.

---

## 6.2 — Welkomspagina's (Bucket A 1.1/1.2/1.3)

### Verwacht (audit-prompt)
- bbl-welcome.html / bbl-onboarding.html
- bedrijf-welcome.html
- school-welcome.html

### Realiteit
**Geen van bovenstaande aanwezig** in repo. Wel aanwezig:
- `coming-soon-stagebegeleider.html`
- `coming-soon-international-student.html`
- `coming-soon-international-school.html`

### F6.2.A — Welkomspagina's vervangen door coming-soon (5.H) [BEVESTIGD]
Per `BACKLOG.md` Atomic Burn 1 + commit `910b049 feat(beta): 5.H Coming Soon redirect voor 3 rollen`. De 3 coming-soon pagina's zijn de **5.H-implementatie**: voor stagebegeleider + international-student + international-school werd een "coming soon" redirect ingevoerd ipv volledig dashboard.

`auth.html:794-802` redirect logica:
```js
window.location.href = 'coming-soon-stagebegeleider.html';
window.location.href = 'coming-soon-international-student.html';
window.location.href = 'coming-soon-international-school.html';
```

**De ontbrekende welkomspagina's voor BBL/bedrijf/school zijn niet vervangen — onboarding voor deze 3 rollen verloopt via**:
- BBL: direct naar bbl-hub.html (resolveStudentDashboard)
- Bedrijf: direct naar company-dashboard.html
- School: direct naar school-dashboard.html

**Status: PASS** — design-keuze, niet ontbrekend werk.

---

## 6.3 — Mollie subscription view (Bucket A 4.6)

### Verwacht
- `mijn-abonnement.html` of subscription-section in company-dashboard

### Realiteit
- `mijn-abonnement.html`: **niet aanwezig**
- `account.html`: niet aanwezig
- Subscription-overzicht zit verwerkt in `AccountModule.renderAccountScreen()` in js/account.js — leest `subscriptions` tabel + `payments` tabel
- Bedrijf bekijkt abonnement via Account-tab in company-dashboard.html

### F6.3.A — Mollie integratie status: STUB [P3 — bekend]
Per CLAUDE.md "Bekende stubs":
> pricing.html startCheckout() = stub (Mollie niet actief)

Per `docs/journal/2026-05-05.md:34`: 
> Bucket A 12/14 (86%) — open: **4.6 mijn-abonnement**, 5.1 viewer-banner

**Status anno 9 mei**: 4.6 nog open, niet gemerged. company-dashboard heeft 7+ knoppen die nog naar `pricing.html#section-bedrijf` linken (per `INTERNLY_5RUN_FIX_PLAN_4MEI.md:314`).

**Impact LT**: bedrijf kan in account-tab zijn (lege) subscription-state zien. Mollie-checkout is gedisabled. **Geen LT-blocker** — testers gebruiken geen betaalflow.

**Classificatie: P3** — gepland voor Run 5+, niet livetest-relevant.

---

## 6.4 — Viewer-banner CSS (Bucket A 5.1)

### Verwacht
- `.viewer-banner` CSS-class in css/style.css
- conditionele banner in match-dashboard.html voor cross-role view

### Realiteit
- `viewer-banner` in `css/style.css`: **0 hits**
- `viewer-banner` in `match-dashboard.html`: **0 hits**

### F6.4.A — Viewer-banner niet geïmplementeerd [P2 — Bucket A 5.1 OPEN]
Per `docs/audits/LIVETEST_AUDIT_4MEI.md:299`:
> match-dashboard student/bedrijf/school/begeleider — **NEE** — geen viewer-banner CSS-class | medium |

**Concrete UX-impact**: bedrijf opent match-dashboard om student-stage te bekijken → geen visuele markering dat hij een ander persoon's data ziet → kan verwarring + privacy-misverstand veroorzaken.

**Reproductie LT**: indien tester met bedrijf-account een match opent en feedback geeft alsof het zijn eigen profiel is → mama-test #6 risico.

**Mitigatie**: 
1. CSS-class `.viewer-banner` toevoegen aan style.css (1 declaratie)
2. In match-dashboard.html: conditioneel `<div class="viewer-banner">Je bekijkt de stage van [naam]</div>` boven content wanneer `currentUser.id !== student-eigenaar.id`

Volume: 30 min werk.

**Classificatie: P2** — UX-helderheid voor LT, niet blocker maar mama-test relevant.

---

## 6.5 — FTP sync status

### Git-state
| Check | Resultaat |
|---|---|
| Branch | `main` |
| Sync met origin/main | ✓ up to date |
| Working tree | clean (alleen 5 audit-rapporten van vandaag untracked) |
| Laatste commit | `3e17cf6 docs: EOD 8 mei journal` (8 mei 21:09) |

### FTP-status
Per `docs/runs/2026-05-08-EOD.md:6`:
> FTP upload via DirectAdmin (48 files + .well-known/)

**Bevinding**: vrijdag 8 mei is de productie via DirectAdmin (niet FileZilla zoals CLAUDE.md aangeeft) gesynced. 48 files. **Tussen 8 mei 21:09 en 9 mei nu zijn er geen code-commits** — alleen mijn audit-rapporten.

### F6.5.A — Productie-sync status [PASS volgens journal — VERIFY direct]
**Aanname**: productie internly.pro draait op de stand van commit 3e17cf6. **Niet direct te verifiëren vanuit dit terminal**.

**VERIFY voor LT**:
1. Open https://internly.pro in private/incognito browser
2. Check of de vrijdag-changes zichtbaar zijn (zoek `🚪 Uitloggen` in topbar van company-dashboard.html — Mama-test #2 fix b7b1c90)
3. Check of viewer-banner ontbreekt (verwacht: ja, nog niet geïmplementeerd)
4. Check of `coming-soon-international-*.html` bereikbaar zijn

**Classificatie: GO indien viewer-banner P2 acceptabel** — anders 1u werk vóór maandag.

### F6.5.B — `.well-known/security.txt` bevestigd op productie [PASS]
Aanwezig in repo + EOD-journal noemt `.well-known/` upload. Goed voor responsible disclosure. Per audit Fase 3 PASS (3.5 Security headers + responsible disclosure stub).

### F6.5.C — Stray files in repo root [P3]
Onbedoeld gecommit in commit `58ff8e1`:
- `changed.txt` (UTF-16, 24 regels — vermoedelijk PowerShell `Out-File` dump)
- `tatus --short` (typo van `git status --short`, 37 regels — git-warnings dump)

Beide niet kritisch maar verwarrend. Niet uploaden naar FTP (waarschijnlijk gefilterd door DirectAdmin patroon, anders zichtbaar als 404). **Cleanup**: `git rm changed.txt "tatus --short"` post-LT.

**Classificatie: P3**

---

## 6.6 — Documentation up-to-date

### Status per document
| Bestand | Laatst geüpdate | Vandaag (9 mei)? |
|---|---|---|
| CLAUDE.md | 5 mei (Bedward smartHomeRedirect + 8 mei journal verwijst) | NEE — 4 dagen oud |
| HANDOVER.md | 6 mei (Run 5 sectie) | NEE — 3 dagen oud |
| BACKLOG.md | 6 mei (Atomic Burn 1) | NEE — 3 dagen oud |
| docs/journal/ | 2026-05-05.md (1 entry) | **GAP** — 6/7/8/9 mei ontbreken |
| docs/runs/2026-05-08-EOD.md | 8 mei avond | **meest recent** |

### F6.6.A — docs/journal heeft alleen 5 mei entry [P3]
Drie dagen ontbreken (6, 7, 8 mei). 8 mei staat in `docs/runs/2026-05-08-EOD.md` ipv journal-folder. Inconsistente locatie voor dag-journals.

**Aanbeveling**: na 11 mei kort `2026-05-09.md` toevoegen aan journal voor LT-verloop.

### F6.6.B — Run 1.7 status [P0/P1 VERIFY]
HANDOVER.md regel 76-83:
> Bug A (messages.type does not exist): NIET GEFIXT — wacht op Barry-keuze
> Bug B (meetings.match_id does not exist): NIET GEFIXT — wacht op Barry-keuze
> Diagnose: beide kolommen ZIJN gedefinieerd in internly_migration.sql

**Status 9 mei**: HANDOVER.md is 3 dagen oud. Run 1.7 was geplanned voor zaterdag 9 mei 9:00 hard start (per EOD 8 mei). Status NU = open.

**Verifieer met Barry**:
- Schema-sync uitgevoerd op productie? (Optie 2)
- Of localhost? (Optie 1)
- Of code-degradatie? (Optie 3)

Indien niet uitgevoerd: bbl-hub + match-dashboard meeting-INSERT zal silently falen.

**Classificatie: P0/P1** — 2 features kapot bij LT als productie niet geüpdate.

### F6.6.C — CLAUDE.md mist huidige session-leerprincipes [P3]
CLAUDE.md is structureel niet bijgewerkt sinds 5 mei. Recente leerpunten (b7b1c90 logout-fix, dc70386 profile-completeness) staan niet in CLAUDE.md.

**Niet kritisch voor LT** — bestaande sectie blijft accuraat, alleen incompleet.

---

## 6.7 — Smoke test prerequisites

### Pad-existentie
| Pad / pagina | Status |
|---|---|
| auth.html | aanwezig (login + signup) |
| index.html | aanwezig (publiek landing) |
| discover.html | aanwezig (vacatures BOL) |
| matches.html | aanwezig |
| match-dashboard.html | aanwezig |
| chat.html | aanwezig |
| company-dashboard.html | aanwezig |
| school-dashboard.html | aanwezig |
| begeleider-dashboard.html | aanwezig |
| buddy-dashboard.html | aanwezig |
| bbl-hub.html / bbl-dashboard.html | aanwezig |
| international-* dashboards | aanwezig |
| **mijn-abonnement.html** | **MIST** (Bucket A 4.6 open) |
| **account.html** | **MIST** (vervangen door AccountModule in dashboards) |

### Cross-flow check
| Flow | Bestaat? |
|---|---|
| Login student → discover.html | JA |
| Login bedrijf → company-dashboard.html | JA |
| Login school → school-dashboard.html | JA |
| Login buddy → buddy-dashboard.html | JA |
| Login intl-school → coming-soon-international-school.html | JA (5.H beta) |
| Match flow (student → bedrijf → match) | JA |
| Chat flow | JA |
| Logout (alle rollen) | JA — F4.2 noemt 4 verschillende teksten/styles |

### F6.7.A — Browser-test door Barry [VERIFY MAANDAG 8:00]
Audit kan code-existence verifiëren maar niet runtime-correctness. Per Geordi2 zondag-walkthrough (per EOD 8 mei impliciet).

**Smoke-test checklist die zou moeten worden gedraaid**:
1. Login werkt voor 6+ testaccounts (afhankelijk van F6.1.A uitkomst)
2. Discover toont vacatures (RLS + `internships_select_all` OK per Fase 1)
3. Match-flow: student solliciteert → bedrijf accepteert → match.status=accepted
4. Chat: realtime-message verschijnt zonder refresh
5. Logout: clearUserState() + redirect (op alle 4 hoofdrollen)
6. Mobile (<768px): topbar/sidebar/mobile-tabs gedrag

**GO/NO-GO**: afhankelijk van Geordi2 walkthrough zondag.

---

## 6.8 — Out-of-scope security flag

### F6.8.A — GitHub PAT in `.git/config` remote URL [P0 — actie buiten LT-scope]
`git remote -v` exposeert een GitHub Personal Access Token (`ghp_...`) embedded in de origin URL. Token zit in `.git/config` (niet in repo zelf). Risico's:
1. Token zichtbaar bij elke `git remote -v` call (zoals in deze audit)
2. Bij upload van `.git/` directory naar productie via fout FTP-pattern wordt token publiek
3. Token in CI/CD logs of crash-dumps

**Mitigatie**:
1. **Roteer token vóór 11 mei**: github.com/settings/tokens → Revoke huidige + genereer nieuwe
2. Vervang remote-URL: `git remote set-url origin git@github.com:DataInternly/Internly.git` (SSH) **OF** gebruik Git Credential Manager
3. Dubbel-check `.gitignore` op `.git/config` (default ja, maar valideer)

**Classificatie: P0** — token-leak. Tijdkost: 5 min.

---

## TOP BEVINDINGEN — FASE 6 (GO/NO-GO matrix)

| # | ID | Severity | GO/NO-GO impact | Tijdkost fix |
|---|---|---|---|---|
| 1 | F6.6.B | **P0/P1** | Run 1.7 schema-sync — meeting-INSERT blokker als niet uitgevoerd | 2 min SQL |
| 2 | F6.8.A | **P0** | GitHub PAT in remote URL — roteer + SSH | 5 min |
| 3 | F6.1.A | **P1 VERIFY** | Test-accounts: weten we wie test? | 12:00 zaterdag deadline |
| 4 | F6.4.A | **P2** | Viewer-banner niet geïmplementeerd — mama-test #6 risico | 30 min |
| 5 | F6.5.A | VERIFY | Productie internly.pro live-check (vrijdag-changes zichtbaar?) | 5 min browser-test |
| 6 | F6.7.A | VERIFY | Smoke-test alle rollen door Geordi2 zondag | ~2u walkthrough |

### Andere observaties
- Welkomspagina's BBL/bedrijf/school: design-keuze om geen welcome-page te hebben. **PASS**.
- Mollie subscription view: STUB acceptable (geen betaalflow tijdens LT). **PASS**.
- Documentation: HANDOVER.md/BACKLOG.md/CLAUDE.md zijn 3-4 dagen oud — niet kritisch maar journal-gap. **P3**.
- Stray files (`changed.txt`, `tatus --short`): cosmetic cleanup. **P3**.
- `.well-known/security.txt` aanwezig + gedeployed. **PASS**.

---

## GO / NO-GO INDICATIE PER CHECK

| Check | Status | Indicatie |
|---|---|---|
| 6.1 Testaccounts | VERIFY | NO-GO tot 12:00 zaterdag (Barry deadline) |
| 6.2 Welkomspagina's | PASS | GO |
| 6.3 Mollie-view | PASS (stub) | GO — geen betaalflow tijdens LT |
| 6.4 Viewer-banner | NIET geïmplementeerd | GO met risico (mama-test #6) — of fix 30 min |
| 6.5 FTP sync | PASS volgens 8 mei EOD | GO mits browser-spotcheck zondag |
| 6.6 Documentation | gedateerd maar accuraat | GO |
| 6.7 Smoke prereqs | alle paden bestaan | GO mits Geordi2 walkthrough |
| 6.8 GitHub PAT | exposed | NO-GO tot rotatie (5 min werk) |

**Algeheel**: **GO mits 4 bevindingen worden afgehandeld vóór 11 mei 9:00**:
1. Schema-sync (F6.6.B)
2. PAT-rotatie (F6.8.A)
3. Test-account-bevestiging (F6.1.A)
4. Productie-spotcheck via browser (F6.5.A)

Optioneel maar aanbevolen: viewer-banner P2 fix (F6.4.A — 30 min werk dekt mama-test #6).

**STOP — Fase 6 klaar.** Wacht op "afronden" voor master triage-rapport.
