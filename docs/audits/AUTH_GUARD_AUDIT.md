# AUTH GUARD AUDIT — Internly

**Datum:** 2026-05-10
**Scope:** alle .html-bestanden in `c:\Projects\Internly` die ingelogde content tonen
**Methode:** grep op `guardPage(`, `requireRole(`, `db.auth.getUser(`

## Detectiecriteria

| Methode | Patroon | Status |
|---|---|---|
| A | `guardPage(` als eerste actie in init | ✓ voorkeur (CLAUDE.md §Auth-architectuur) |
| B | `requireRole(` als eerste actie | ⚠ deprecated (geldig, blijft werken voor 6 callers) |
| C | inline `db.auth.getUser()` met redirect bij `!user` | ⚠ tech-schuld B-1 (migratie-plan loopt) |
| D | géén auth-check, redirect of role-guard | 🔴 KRITIEK |

## Uitgesloten van audit (publieke pagina's)

Per CLAUDE.md §smartHomeRedirect zijn dit publieke pagina's. Een `getUser()`-call hierin is geen auth-guard maar UI-personalisatie (header-CTA tonen/verbergen):

`index.html`, `about.html`, `pricing.html`, `kennisbank.html`, `kennisbank-artikel.html`,
`faq.html`, `hoe-het-werkt.html`, `privacybeleid.html`, `spelregels.html`,
`cookiebeleid.html`, `algemene-voorwaarden.html`, `stagebegeleiding.html`,
`internly-worldwide.html`, `esg-rapportage.html`, `esg-export.html`,
`internly_simulator.html`, `404.html`, `500.html`, `503.html`, `maintenance.html`,
`preview.html`, `coming-soon-international-school.html`,
`coming-soon-international-student.html`, `coming-soon-stagebegeleider.html`,
`la-sign.html` (logout/expired-landing), `blog.html`, `security.html`,
`auth.html` (loginpagina zelf — checkt of al ingelogd om door te sturen)

## Resultaat-tabel ingelogde pagina's

| Bestand | Auth methode | Locatie | Status |
|---|---|---|---|
| [admin.html](admin.html) | inline getUser | regel 1055 | ⚠ tech-schuld |
| [bbl-dashboard.html](bbl-dashboard.html) | inline getUser | regel 561 | ⚠ tech-schuld |
| [bbl-hub.html](bbl-hub.html) | inline getUser | regel 2573 | ⚠ tech-schuld |
| [bbl-profile.html](bbl-profile.html) | inline getUser | regel 748 | ⚠ tech-schuld |
| [begeleider-dashboard.html](begeleider-dashboard.html) | inline getUser | regel 1314 | ⚠ tech-schuld |
| [bol-profile.html](bol-profile.html) | inline getUser | regel 1394 | ⚠ tech-schuld |
| [buddy-dashboard.html](buddy-dashboard.html) | inline getUser | regel 1330 | ⚠ tech-schuld |
| [chat.html](chat.html) | requireRole | regel 1600 | ⚠ deprecated |
| [company-dashboard.html](company-dashboard.html) | inline getUser | regel 1525, 3475 | ⚠ tech-schuld |
| [company-discover.html](company-discover.html) | inline getUser | regel 734 | ⚠ tech-schuld |
| [discover.html](discover.html) | requireRole | regel 1432 | ⚠ deprecated |
| [international-school-dashboard.html](international-school-dashboard.html) | inline getUser | regel 596 | ⚠ tech-schuld |
| [international-student-dashboard.html](international-student-dashboard.html) | inline getUser | regel 1107 | ⚠ tech-schuld |
| [match-dashboard.html](match-dashboard.html) | inline getUser | regel 2864 | ⚠ tech-schuld |
| [matches.html](matches.html) | requireRole | regel 750 | ⚠ deprecated |
| [matchpool.html](matchpool.html) | requireRole (via [js/matchpool.js](js/matchpool.js#L287)) | js/matchpool.js:287 | ⚠ deprecated |
| [mijn-berichten.html](mijn-berichten.html) | requireRole | regel 840 | ⚠ deprecated |
| [mijn-notities.html](mijn-notities.html) | requireRole | regel 211 | ⚠ deprecated |
| [mijn-sollicitaties.html](mijn-sollicitaties.html) | requireRole | regel 794 | ⚠ deprecated |
| [review-form.html](review-form.html) | inline getUser | regel 368 | ⚠ tech-schuld |
| [school-dashboard.html](school-dashboard.html) | inline getUser | regel 1240, 2613 | ⚠ tech-schuld |
| [student-home.html](student-home.html) | requireRole | regel 228 | ⚠ deprecated |
| [student-profile.html](student-profile.html) | inline getUser | regel 1634 | ⚠ tech-schuld |
| [vacature-detail.html](vacature-detail.html) | semi-publiek (alleen banner) | regel 1120 | ✓ by design |

## Bijzondere gevallen

### vacature-detail.html — semi-publiek (geen bug)

Regel 1118-1122 documenteert de keuze:

> *"Auth-guard: pagina is publiek bereikbaar — banner toont alleen als user NIET ingelogd is. Geen requireRole hier: ingelogde non-students mogen vacatures ook bekijken."*

`getUser()` wordt enkel gebruikt om de auth-banner te tonen/verbergen. De solliciteer-actie ([vacature-detail.html:976](vacature-detail.html#L976)) heeft een eigen guard die anonieme users een notify-melding geeft. Geen redirect — dit is bedoeld gedrag.

### matchpool.html — auth-guard in JS-module

[matchpool.html](matchpool.html) zelf bevat geen auth-call, maar laadt [js/matchpool.js:287](js/matchpool.js#L287) dat `requireRole('student')` aanroept tijdens init. Wel een geldige guard, maar minder zichtbaar dan inline.

### Pagina's met requireRole + getUser (geen dubbele guard)

`chat.html`, `matches.html`, `mijn-berichten.html`, `mijn-notities.html`, `mijn-sollicitaties.html`, `student-home.html`: hier roept `requireRole()` éérst, daarna `getUser()` voor de `currentUser`-variabele. De `getUser()` is een data-fetch, geen tweede auth-guard. Telt als methode B (`requireRole`).

## Totaaloverzicht

| Categorie | Aantal | Bestanden |
|---|---:|---|
| **A. `guardPage()`** | **0** | — (helper bestaat sinds Run 7B in [js/utils.js:287](js/utils.js#L287), nog niet geadopteerd) |
| **B. `requireRole()`** | **8** | chat, discover, matches, matchpool (via js), mijn-berichten, mijn-notities, mijn-sollicitaties, student-home |
| **C. inline `db.auth.getUser()`** | **15** | admin, bbl-dashboard, bbl-hub, bbl-profile, begeleider-dashboard, bol-profile, buddy-dashboard, company-dashboard, company-discover, international-school-dashboard, international-student-dashboard, match-dashboard, review-form, school-dashboard, student-profile |
| **C-bis. semi-publiek (by design)** | **1** | vacature-detail |
| **D. zonder auth-check (KRITIEK)** | **0** ✅ | — |

**Totaal ingelogde pagina's:** 8 (B) + 15 (C) + 1 (C-bis) = **24**.

## Conclusie

🟢 **Geen kritieke gaten.** Alle 24 ingelogde pagina's hebben een werkende auth-guard. De semi-publieke vacature-detail.html is een bewuste design-keuze met expliciete documentatie in de code.

🟡 **Migratie-tech-schuld is bekend en gepland.** CLAUDE.md §Auth-architectuur §Migratie-plan beschrijft batches Run 7C–7G die de 16 inline-checks geleidelijk migreren naar `guardPage()`. De 8 `requireRole()`-callers volgen daarna.

🔴 **Adoptie van `guardPage()`: 0/24.** De helper bestaat sinds Run 7B maar is nog door geen enkele pagina in gebruik. Eerstvolgende migratie-batch volgens CLAUDE.md is Run 7C: buddy-dashboard, company-dashboard, school-dashboard.

## Aanbeveling sprint 5

Volgens CLAUDE.md §Auth-architectuur staat Run 7C klaar (3 dashboards, hoge prio). Deze drie zijn ook het zwaarst belast (hoogste regelnummers, meest complexe DOMContentLoaded-handlers) en zouden als eerste profiteren van anti-flicker via `data-auth-pending`/`data-auth-ready`.

Implementatie per file: ~20-40 regels schrappen + 1 `guardPage()`-call. Tijdsinschatting CLAUDE.md: 30-90 min per sprint.
