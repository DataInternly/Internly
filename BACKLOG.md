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
