# INTERNLY SESSION LOG

## Sprint 4 + Opruimsessie — 17 april 2026

**Opgelost:**
- js/utils.js aangemaakt (escapeHtml, notify,
  formatNLDate, getNotifText, createNotification)
- 17 HTML-bestanden laden utils.js
- 15x escapeHtml + 15x notify inline verwijderd
- SUPABASE_URL gecentraliseerd in supabase.js
- typeof-guard vervangen door directe const-declaraties
  in supabase.js (dead code verwijderd)
- PII-fix company-discover.html (13 kolommen verwijderd
  uit SELECT, nu alleen 10 publieke kolommen)
- Rol-guard match-dashboard.html
  (allowedRoles = ['student', 'begeleider'])
- Stage Hub nav-knoppen → match-dashboard.html
  in company-dashboard.html en school-dashboard.html
- calNotify() hernoemd in calendar.js
  (was: lokale notify() die globale utils-notify overschreef)
- pricing.html inline SUPABASE_URL/ANON_KEY verwijderd
- ROUTES['student'] = 'match-dashboard.html' (was: discover.html)
- QW-1: sollicitatie-bevestiging notify in vacature-detail.html
- QW-2: Trust Score schaal A/B/C hint in discover + vacature-detail
- QW-3: zichtbaarheidsbalk in match-dashboard (tab-render)
- QW-4: anonimiteitsherinnering in bbl-hub boven reviewveld
- QW-5: lege staten met CTAs in bbl-hub + company-dashboard
- Sessie B copywerk:
  - auth.html: rol-uitleg per kaartje (6 beschrijvingen)
  - mijn-sollicitaties.html: afwijzingstekst toegevoegd
  - calendar.js: driegesprek-hint verduidelijkt
  - matches.html: "Zet aan dat bedrijven jou kunnen vinden"
  - school-dashboard.html: lege staat + fase-indicatoren
  - calendar.js: send-meeting-email invoke verwijderd
- CLAUDE.md, SESSION_LOG.md, LIVETEST_CONDITIONS.md aangemaakt

**Herintroduceerd / Open gebleven:**
- pricing.html SUPABASE_URL inline — opgelost
  in vervolgsessie (17 april)
- calendar.js had lokale notify() — hernoemd
  naar calNotify() in vervolgsessie (17 april)

**Aandachtspunt HANDOVER.md:**
- Vermeldt hasActivePlan() als "altijd true/stub" — ONJUIST.
  Functie bevraagt subscriptions-tabel actief (zie supabase.js).
- FileZilla-lijst bevat nog stage-hub.html — dead bestand,
  niet uploaden. Vervangen door match-dashboard.html.

**Open voor Sprint 5:**
- Ghosting-bestraffing (Supabase cron-job of Edge Function)
- Trust Score auto-algoritme (Edge Function)
- hasActivePlan() feature-gating activeren in dashboards
- Admin RLS (Supabase Console — nu client-side only)
- ESG-export implementeren (nu stub met notify Binnenkort)
- Cohort-rapportage school
- Buddy-kalender + sessie-plannen
- Begeleider-agenda
- Postadres Sasubo Holding in privacybeleid.html
- Mollie betaalintegratie (pricing.html startCheckout stub)
- STARR SQL-migratie uitvoeren (zie HANDOVER.md)
- about.html + index.html: inline SUPABASE_URL opruimen
  (publieke pagina's, laagste prioriteit)
- Dead render-code motivatie in company-discover.html
  (s.motivatie altijd undefined — SELECT bevat het niet)
