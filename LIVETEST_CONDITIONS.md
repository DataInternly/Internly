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

## Wanneer CLEAR FOR LIVETEST
Alle vier condities groen → Picard2 spreekt uit:
CLEAR FOR LIVETEST

Datum doel: zo snel mogelijk na FTP upload.
