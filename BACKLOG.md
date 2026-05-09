# BACKLOG

> Werk-document voor lopende sprint. Voor volledige item-cataloog (A-01..F-04)
> zie [_docs/BACKLOG_AUDIT_2026-05-03.md](_docs/BACKLOG_AUDIT_2026-05-03.md).

## Status updates 6 mei 2026

### Bevestigd KLAAR
- C-04 dode divs: gevalideerd via CC scan, niet opnieuw bouwen

### In progress vandaag
- C-02 supabase-js pin: alleen versie-pin gepland (SRI uitgesteld)
- C-05 setting-card-full: full-width CSS implementatie gepland
- C-07 about.html: tweede been Supabase script-tag te verifiëren

### Nieuwe items toegevoegd
- NAV-02: bbl-hub vs bbl-profile nav-pattern divergence
  (refactor naar shared internly-header Custom Element in
  PREP-4 sprint week 13+)
- C-13 (nieuw): mijn-berichten.html ontbreekt kennisbank-link
  in footer (niet door 5.D-6 veroorzaakt)
- C-14 (nieuw): SRI hashes apart sprint na livetest
- C-15 (nieuw): student-profile.html toont edit-form bij gevuld
  profiel (Profile edit-to-view backlog item)

### Atomic Burn 1 — KLAAR (6 mei 2026)
- C-02 supabase-js pin: 39 files gepinned op @2.45.4. SRI uitgesteld naar C-14.
- C-05 setting-card-full: CSS-hook toegevoegd (grid-column: 1 / -1) per RUN4-spec. No-op tot toekomstige grid-layout.
- BBL-tile bbl-hub.html: Kennisbank-tile vervangen door BBL Dashboard. Footer-link kennisbank.html intact.
- C-07 about.html: gesloten na re-evaluatie. Scripts zijn legitieme Run 1 exception (waitlist-popup window.db session-check). P2 al gemitigeerd via _supabaseIsPublicPage IIFE in Run 1.5 v2.
- C-04 dode divs: bevestigd KLAAR via BACKLOG-scan, geen werk.

### Bug fix vandaag (out-of-band SQL)
- C-15 student-profile edit-to-view bij gevuld profiel: OPGELOST via ALTER TABLE student_profiles ADD COLUMN bedrijf TEXT. Was geen rendering bug maar 400-symptoom (Postgres 42703 op ontbrekende kolom). Lena BOL profile route nu werkend.

### Nieuwe items toegevoegd (vervolg)
- C-16 (NIEUW): Canon-gat — 13 kolommen in productie student_profiles tabel ontbreken in repo-migraties (info_schema dump 6 mei). Refactor: dump live schema → genereer canon-migration → PR. Linkt aan eerder OUT_OF_SCOPE_CRITICAL regel 478. Sprint: PREP-4 of week 13+.
- C-17 (NIEUW): Lena onderwijsniveau is HBO (memory zei MBO_BOL). Memory-update verzonden, geen code-impact.

## Post-LT Mama-test Sessie

### F5 — Debounce match-dashboard meeting buttons
match-dashboard.html accept/decline/cancel meeting-handlers
missen disable-during-await pattern. Mama-test risico (D3):
rapid clicks → race-conflict + dubbele notify. Vereist
`data-meeting-action="<action>-${m.id}"` attribuut op buttons
(5 locaties: 5337, 5365, 5377, 5390, 5401) of equivalent
DOM-handle. Polish 4 in pre-browser-test-audit.md skipped
9 mei: attribuut bestaat niet, ~15 min werk vereist.

### G3 — School-naam snapshot bij match-acceptatie
Student kan student_profiles.school wijzigen mid-stage.
Stage-rapport toont dan nieuwe school-naam ipv school-bij-
matching. Side-effect kan begeleiders verwarren.
Voorstel: snapshot bij match.status='accepted' in
matches.school_name_at_match (nieuwe kolom) of in
match-metadata. Bron: pre-browser-test-audit.md scenario G3.

### C5 — Duplicate push-notif suppression
sw.js push-handler toont notif zonder Visibility API
check. Tester ziet bericht 2× (push op telefoon +
realtime in laptop-tab). Acceptabel UX maar polishbaar.
Voorstel: in sw.js push-handler, query `clients.matchAll()`
en skip notif als `visibility=visible` op zelfde origin.

### Browser-test verifies (2)
- B5 — avatar upload tijdens refresh: toont UI half-save?
- F6 — 320px viewport rendert mobile-tabs correct?

### charCount duplicatie (post-LT, 7/11 violation)
`function charCount` lokaal gedefinieerd in 3 profile-form pagina's:
bol-profile.html:936, student-profile.html:1237, bbl-profile.html:562
(toegevoegd 9 mei voor F4 fix). Drift-risico — alle 3 moeten
synchroon blijven. Post-LT consolidatie naar js/utils.js (~10 min).
