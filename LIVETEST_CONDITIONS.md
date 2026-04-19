# INTERNLY — LIVETEST CONDITIONS
Picard2: "Als deze vier groen zijn: livetest."

## Conditie 1 — Pre-FTP verificatie
Pre-FTP checklist scoort 23/23 PASS.
Geen FAIL. Maximaal 2 WARN.

Laatste score: 23/23 PASS · 0 FAIL · 2 WARN
  W1 — company-discover.html: motivatie in render-code
       maar niet in SELECT (dead code, geen security-risico)
  W2 — about.html + index.html: inline SUPABASE_URL
       (publieke pagina's, buiten app-scope)
Status: GROEN ✓

## Conditie 2 — Laatste FAILs opgelost
- calNotify() hernoemd in calendar.js ✓
- pricing.html SUPABASE_URL verwijderd ✓
Status: GROEN ✓

## Conditie 3 — Geordi2 journey B1
Geordi2 loopt op de live site (internly.pro)
journey B1 handmatig door — alle 12 stappen:
 1. Student logt in → lands op match-dashboard
 2. Opent discover → ziet vacatures + Trust badges
 3. Solliciteert → ontvangt bevestigingsmelding
 4. Mijn Sollicitaties → ziet status
 5. Match ontvangen → notificatie zichtbaar
 6. Chat opent → ziet welkomstbericht
 7. Stuurt bericht → ontvangen door bedrijf
 8. Plant meeting → card zichtbaar in chat
 9. Attendee accepteert → organizer notificatie
10. match-dashboard → zichtbaarheidsbalk aanwezig
11. BBL-student → bbl-dashboard (apart account)
12. Logout → redirect naar auth.html

Status: WACHT OP FTP-UPLOAD

## Conditie 4 — Quick wins zichtbaar
Op internly.pro zichtbaar voor nieuwe gebruiker:
- Trust Score schaal bij elke badge
- Sollicitatie-bevestiging na solliciteren
- Zichtbaarheidsbalk op match-dashboard
- Anonimiteitsherinnering in BBL review
- Lege staten met CTAs

Status: WACHT OP FTP-UPLOAD

## Systeem-audit — 17 april 2026
Geen nieuwe blockers gevonden.
Alle vier condities van Picard2 zijn de enige
actieve blockers. Audit bevestigt FTP-gereedheid.

## Super-Audit v3 — 17 april 2026
Aanvullende fixes toegepast na volledige codebase-scan:
- H1: 3 stille catch blocks voorzien van console.warn
- H3: 9 realtime subscribe() calls voorzien van error handler
- D3: "Internly bewaakt reactietermijn" text toegevoegd aan mijn-sollicitaties.html
Geen nieuwe livetest-blockers. Condities 1+2 blijven GROEN.

## BISMARCK Volledigheidsaudit — 17 april 2026
Audit scope: N1 (10) · N2 (7) · N3 (8) · 26 bestanden volledig gelezen.
Scores: N1 10/10 · N2 5/7 · N3 7/8. Totaal FAILs: 3, alle Sprint 5 P1.
Geen nieuwe FTP-blockers. Livetest-condities 1–4 ongewijzigd.

Openstaande Sprint 5 P1 items (NIET blokkerend voor huidige FTP):
1. hasActivePlan() gating op 6 studentpagina's
2. Admin RLS database-niveau (Supabase Console)
3. K3: hasActivePlan() shared contract in supabase.js

## Geordi2 journeys v2 (5 journeys, uitgebreid)
Na FTP: Geordi2 voert uit:
G1 — BOL Student: login → match-dashboard → discover → solliciteer → mijn-sollicitaties → match → chat → logout → verify auth.html + sessionStorage leeg
G2 — BBL Student: login → bbl-dashboard of bbl-profile → bbl-hub → evaluatie → logout
G3 — Bedrijf: login → company-dashboard → vacature plaatsen → company-discover → logout
G4 — School lege staat: login → school-dashboard → CTA zichtbaar → klik → notify → logout
G5 — Buddy context-kaartje: login → buddy-dashboard → context-kaartje met naam/opleiding/bedrijf/datum → logout

## Picard2's beslissing — 17 april 2026

De livetest begint zodra Geordi2's journey B1
groen is op de live site.

Niet "zodra alles perfect is."
Niet "zodra alle sprint 5 items opgelost zijn."
Zodra journey B1 groen is.

Wat daarna gevonden wordt: sprint 5.
Wat gebruikers rapporteren: sprint 5 input.
Een platform dat leert van echte gebruikers
groeit. Een platform dat wacht op perfectie
gaat nooit live.

— Picard2, 17 april 2026

## Wanneer CLEAR FOR LIVETEST
Alle vier condities groen → Picard2 spreekt uit:
CLEAR FOR LIVETEST

Datum doel: zo snel mogelijk na FTP upload.
