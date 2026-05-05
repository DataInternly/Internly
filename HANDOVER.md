# HANDOVER

## RUN 1 STATUS — 5 mei 2026

- **Status:** KLAAR voor smoke-test/deploy
- **Files gewijzigd:** about.html, pricing.html, faq.html, discover.html
- **Files bevestigd clean:** chat.html, kennisbank.html, hoe-het-werkt.html
- **Smoke-test:** zie `docs/runs/RUN_1_RAPPORT.md` sectie 5
- **Open punten:**
  - about.html + pricing.html behouden scripts (legitieme db-flow) — gedocumenteerde afwijking
  - kennisbank.html niet aangeraakt vanwege kb.js dependencies

## RUN 1.5 v2 STATUS — 5 mei 2026 (Optie A gekozen)

- **Issue 1 (Supabase config):** **KLAAR**
  - js/supabase.js — `_supabaseIsPublicPage` IIFE + passive client config op 20 publieke pagina's
  - autoRefreshToken=false, detectSessionInUrl=false op publieke pagina's
  - persistSession=true blijft (localStorage leesbaar)
- **Issue 2 (bbl-hub footer):** **KLAAR**
  - Minimale footer vervangen door rijke kb-shared-footer (10 links + brand + tagline)
- **Issue 3 (mijn-berichten header):** **KLAAR (strategie B)**
  - BBL student → student_bbl key in renderRoleHeader
  - 1-regel correctie via `_isBBL` flag
- **Klaar voor commit:** ja, na smoke-test door Barry
- **DRY-flag:** PUBLIC_PAGES nu op 2 plekken (utils.js + supabase.js) — backlog post-livetest

## RUN 1.6 STATUS — 5 mei 2026

- **Diagnose-uitkomst:** C (systemische gap)
- **Fix uitgevoerd:** ja
  - `clearUserState()` helper in `js/supabase.js`
  - `performLogout()` in `js/utils.js` gebruikt clearUserState
  - Pre-login cleanup in `auth.html` (doLogin + switchAccount)
  - 5 directe signOut-callers consistent gemaakt: admin, begeleider, intl-school, intl-student, account.js
  - Idle-timeout in supabase.js + begeleider-dashboard ook clearUserState
- **Files gewijzigd:** js/supabase.js, js/utils.js, js/account.js, auth.html, admin.html, begeleider-dashboard.html, international-school-dashboard.html, international-student-dashboard.html (8 files)
- **Service worker:** niet aangeraakt — geen response-caching
- **Klaar voor commit:** ja, na smoke-test door Barry

## RUN 1.7 STATUS — 5 mei 2026

- **Bug A (messages.type does not exist):** **NIET GEFIXT — wacht op Barry-keuze**
- **Bug B (meetings.match_id does not exist):** **NIET GEFIXT — wacht op Barry-keuze**
- **Diagnose:** beide kolommen ZIJN gedefinieerd in `internly_migration.sql` (regels 193-194 en 244 + index 1052). 9+ andere pagina's gebruiken match_id zonder errors. **Schema-versie-mismatch tussen Barry's testomgeving en source-of-truth — geen code-bug.**
- **Bredere audit:** mogelijk ook `conversations.match_id` (bbl-hub:2650) dezelfde mismatch.
- **Code-fix risicovol:** verbreekt zelfreflectie + meeting-invite + match-scoping.
- **Voorgestelde aanpak:** schema-sync op (localhost en/of productie) via SQL-blok in rapport. CC voert geen SQL uit.
- **Klaar voor commit:** bundle Run 1+1.5+1.6 niet geblokkeerd door Run 1.7
- **Volgende:** Barry kiest Optie 1 (localhost), 2 (productie), of 3 (code-degradatie)

## RUN X STATUS — 5 mei 2026

- **Doel:** backlog-reductie bundel (Cat A documentatie + Cat B kleine comments)
- **Items voltooid:**
  - **Item 3 (CLAUDE.md clearUserState sectie):** KLAAR — sectie toegevoegd onder telemetry-codenames
  - **Item 4 (HANDOVER.md run-statussen):** KLAAR — dit bestand bijgewerkt
  - **Item 5 (Bedward smartHomeRedirect sign-off):** KLAAR — gedocumenteerd in CLAUDE.md
  - **Item 6 (cluster 4.1 comment in bbl-hub):** KLAAR — comment-block bij renderStudentHeader-call (regel 2562-2565)
  - **Item 7 (open repro-vragen sectie):** KLAAR — zie hieronder
- **Items GEFLAGD:**
  - **Item 1 (docs/INTERNLY_HEADER_SPEC.md):** ONTBREEKT — Barry moet handmatig plaatsen
  - **Item 2 (docs/INTERNLY_5RUN_FIX_PLAN_4MEI.md):** ONTBREEKT — Barry moet handmatig plaatsen
- **Klaar voor commit:** ja, eigen commit (niet bundelen met Run 1.7)
- **FTP-target:** alleen bbl-hub.html (één regel comment-toevoeging)

---

## OPEN REPRO-VRAGEN (post-livetest)

1. **Cluster 6.8 — "maak profiel aan" zichtbaar bij ingevuld profiel**
   - Status: niet reproduceerbaar in audit
   - Welke pagina toont deze message? (waarschijnlijk student-home of bol-profile)
   - Welke condition triggert hem ten onrechte?
   - Volgende: Barry levert reproductie-stappen tijdens of na 11 mei

2. **Cluster 6.4 — "zoekstagiaires" plan-gating**
   - Status: exact UI-string niet vindbaar in code (`grep "zoekstagiaires" → 0 hits`)
   - Welke knop/link bedoelt Barry?
   - Waar ziet hij deze gating-melding?
   - Volgende: Barry levert screenshot of pagina-context

3. **Cluster 6.7 — buddy-naam-update persisteert niet**
   - Status: form-submit handler niet gelokaliseerd in directe grep
   - Zie audit cluster 6.7
   - Volgende: Barry reproduceert + DevTools network-tab, dan precieze error vindbaar

4. **Cluster 4.5 — bedrijf "vorige pagina" vanaf abonnement**
   - Status: pricing.html mist context-aware back-knop voor bedrijf-context
   - Niet kritisch voor 11 mei
   - Volgende: Run 5 implementeert context-aware back

---

## VOLGENDE STAPPEN

- **Direct:** Barry-keuzes voor Run 1.7 (schema-sync localhost/productie/code-degradatie)
- **Direct:** bundle-commit Run 1 + 1.5 v2 + 1.6 + Run X (mits alle smokes PASS)
- **Direct:** FTP volledige bundle (14 files Run 1-1.6 + bbl-hub.html Run X)
- **Daarna:** Run 2 — chat parser unification + buddy persistence + anti-flicker

## BACKLOG POST-LIVETEST

- PUBLIC_PAGES consolidatie via js/config.js (DRY-overtreding utils.js + supabase.js)
- internly_saved_vacatures user-prefix migratie (4 callsites)
- Multi-tab logout-sync (BroadcastChannel) — alleen als shared browser-gebruik in livetest
- kb-shared-footer als canonical voor alle ingelogde pagina's (5 nog op minimale footer)
- Bredere migratie renderRoleHeader → renderStudentHeader (7 pagina's met dezelfde drift als mijn-berichten)
- Schema audit-pass over alle pagina's (Run 1.7 dekt alleen bbl-hub)
- guardPage migratie 11 dashboards (CLAUDE.md Auth-architectuur sectie)
- Anon-key rotatie (audit STATUS_RAPPORT § Open vragen 3)
