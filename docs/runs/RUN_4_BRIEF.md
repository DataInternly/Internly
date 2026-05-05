# Run 4 — 6 mei 2026

## Eén scope-keuze (kies vóór CC opent)

### Optie A: NAV-01 refactor + header consistentie
- HEADER_NAV_BY_ROLE consumption afmaken (`_renderStudentHeaderLoggedIn` migreren)
- mijn-berichten.html design-mismatch onderzoeken
- INTERNLY_HEADER_SPEC compliance per rol verifiëren

### Optie B: Pricing-update implementatie
- pricing.html herstructureren single revenue line
- school refs strippen naar gratis
- mijn-abonnement.html opzetten voor bedrijf-only
- Tarif-structuur beslissing eerst (Dax2 + Barry)

### Optie C: profile_completeness client-side
- Berekening op 7 weighted fields (memory: opdracht_domein=30 pts)
- Test op alle 3 dashboards waar het getoond wordt
- Helper handelt al graceful undefined af — voeg nu echte berekening toe

## Scope-discipline regels (Run 4)
1. Eén optie kiezen vóór CC opent
2. Crew-briefing eerst (5 min wheels-up)
3. Sub-runs alleen na expliciete go
4. Maximum 3 commits in run
5. End-of-run review door Blara + TQ

## Dagelijkse smoke test (verplicht vóór run-start)
- 5 rollen × 3 publieke pagina's (hoe-het-werkt, internly-worldwide, pricing)
- Login state behouden tussen pagina's
- Header rendering correct per rol
- Verifieer dat 9cc7ca3 fix de hoe-het-werkt + internly-worldwide hero niet meer kapot maakt bij BBL-session

## Open verificatie-gaps (Hal — voor Run 4 of later)
- mijn-berichten visuele inconsistentie (NAV-01 backlog)
- 5-rol regressie publieke pagina's (handmatige browser-test)
- profiles_select_related breedte review (Audit 8 LAAG-bevinding)
- bbl-hub kalender/reflectie/chat content visibility (DevTools console-data ontbreekt)

## Pre-run checklist
- [ ] Optie A/B/C gekozen
- [ ] CLAUDE.md herlezen — open Sprint 5 items + Bekende risico's
- [ ] SESSION_LOG.md gecheckt voor recurring issues
- [ ] Smoke test uitgevoerd op 9cc7ca3

## Witty — discipline-actie
13 sub-runs vandaag (Run 1, 1.5, 1.6, 1.7, 1.8, 1.8-bis, 1.9, 1.10, 2, 2.1, 2.2, 3, 3.B, 3.C). Pattern, geen toeval. Run 4 lock: één run, één scope, geen sub-runs zonder expliciete go van Picard2.

## Bismarck — time-box
Run 4 max 90 min. Bij overschrijding → halt + herplan. Niet doorduwen.
