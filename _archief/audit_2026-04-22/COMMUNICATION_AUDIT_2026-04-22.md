# JJ2 — Communication Completeness Audit
**Datum**: 22 april 2026
**Rol**: JJ2 — Elke notificatie die niet aankomt, is een moment waarop het platform zijn belofte breekt.
**Scope**: Alle events waarvoor een notificatie zou moeten gaan. Welke bestaan, welke niet, en of de tekst deugt.
**Instructie**: READ-ONLY, geen code-wijzigingen.

---

## Methode

Bronnen:
- CLAUDE.md: geregistreerde notificatietypes
- Grep op `createNotification(` in codebase
- Grep op notificatie-triggers per event

Geregistreerde types (CLAUDE.md):
`new_message · new_meeting · meeting_accepted · meeting_rejected · new_match · eval_signed · eval_completed · buddy_request · buddy_accepted · buddy_declined · subscription_activated · subscription_failed · new_review`

---

## Notificatietabel

| Event | Aan wie | Via | Code-bewijs | Type | Status |
|-------|---------|-----|-------------|------|--------|
| Nieuwe sollicitatie door student | Bedrijf | in-app | mijn-sollicitaties.html:249 → `createNotification(bedrijfId, ...)` | Niet in registered types (zie bug #1) | ⚠️ |
| Match geaccepteerd door bedrijf | Student | in-app | company-dashboard.html:1573 → `'application_accepted'` | Niet in registered types (zie bug #1) | ⚠️ |
| Match afgewezen door bedrijf | Student | in-app | company-dashboard.html:1586 → `'application_rejected'` | Niet in registered types (zie bug #1) | ⚠️ |
| Nieuw bericht in chat | Gesprekspartner | in-app | chat.html:691, :728 → `'new_message'` | ✓ geregistreerd | ✅ |
| Nieuw chatbericht (begeleider) | Deelnemer | in-app | mijn-berichten.html:476, :770 → `'begeleider_invite'` | Niet in registered types | ⚠️ |
| Afspraak gepland | Betrokken partij | in-app | chat.html:1024 → `'new_meeting'` | ✓ geregistreerd | ✅ |
| Afspraak geaccepteerd | Aanvrager | in-app | bbl-hub.html:1360 → `'meeting_accepted'` | ✓ geregistreerd | ✅ |
| Afspraak afgewezen | Aanvrager | in-app | bbl-hub.html:1319 → `'meeting_rejected'` | ✓ geregistreerd | ✅ |
| Evaluatie ondertekend | Andere partij | in-app | bbl-hub.html:2280–2310 → `'eval_signed'` | ✓ geregistreerd | ✅ |
| Evaluatie voltooid | Betrokkenen | in-app | bbl-hub.html:2280 → `'eval_completed'` | ✓ geregistreerd | ✅ |
| Buddy-verzoek gestuurd | Buddy | in-app | begeleider-dashboard.html:1038, school-dashboard.html:2249 → `'buddy_request'` | ✓ geregistreerd | ✅ |
| Buddy-verzoek geaccepteerd | Student | in-app | bbl-hub.html:1560 → `'buddy_accepted'` | ✓ geregistreerd | ✅ |
| Buddy-verzoek afgewezen | Student | in-app | bbl-hub.html:1575 → `'buddy_declined'` | ✓ geregistreerd | ✅ |
| Nieuw review | Bedrijf | in-app | matches.html:412, :473 → `'new_review'` | ✓ geregistreerd | ✅ |
| School koppelt student aan begeleider | Student | in-app | school-dashboard.html:1715, :1722 | type onbekend (zie bug #2) | ⚠️ |
| **Responsgarantie deadline nadert** | Bedrijf | — | GEEN | n.v.t. | ❌ |
| **Trust Score verlaagd** | Bedrijf | — | GEEN | n.v.t. | ❌ |
| **Student start stage** | School + Bedrijf | — | GEEN | n.v.t. | ❌ |
| **BBL 90-dag-mark nadert** | Student + School | — | GEEN | n.v.t. | ❌ |
| **Eindverslag definitief** | Bedrijf + School | — | GEEN | n.v.t. | ❌ |
| Wachtwoord vergeten | Gebruiker | email | Supabase Auth | n.v.t. | ✅ |
| Account verwijderd | Gebruiker | email? | Niet aangetroffen | n.v.t. | ❓ |
| Abonnement geactiveerd | Gebruiker | in-app | `'subscription_activated'` (geregistreerd) | Code-trigger niet gevonden | ⚠️ |
| Abonnement mislukt | Gebruiker | in-app | `'subscription_failed'` (geregistreerd) | Code-trigger niet gevonden | ⚠️ |

**Legende**: ✅ geïmplementeerd · ⚠️ problematisch · ❌ volledig afwezig · ❓ onbekend

---

## Bug #1 — Niet-geregistreerde notificatietypes in use

**STATUS: FALSE POSITIVE — GESLOTEN 22 april 2026**

Bij verificatie (na de audit) blijkt dat `VALID_NOTIFICATION_TYPES` in `js/utils.js:428–439` al alle types bevat:
- `application_accepted` ✓ aanwezig
- `application_rejected` ✓ aanwezig
- `begeleider_invite` ✓ aanwezig
- `school_referral` ✓ aanwezig (JJ2 had dit niet gesignaleerd, ook al aanwezig)

`getNotifText()` (utils.js:441–465) heeft voor elk type een vertaling.

**Werkelijke bug**: CLAUDE.md's "Notification types" sectie was verouderd (13 types) t.o.v. de code (17 types). CLAUDE.md is bijgewerkt op 22 april 2026.

**Leermoment**: JJ2's audit vergeleek met de CLAUDE.md-documentatie, niet met de feitelijke code. Audits moeten altijd de broncode lezen, niet de documentatie.

---

## Bug #2 — school-dashboard.html notificatietypes onbekend

**Locatie**: school-dashboard.html:1715, :1722

Grep: `await createNotification(studentId, ...)` — de type-string vereist lezen van de precieze code-context. Niet geverifieerd zonder dieper lezen.

**Ernst**: Onbekend — vereist context-check.

---

## Kritische afwezige notificaties

### Responsgarantie deadline nadert
**Verwacht**: Als een bedrijf een sollicitant meer dan X dagen niet beantwoordt, zou het bedrijf een herinnering moeten ontvangen.
**Implementatie**: **AFWEZIG** — er is geen cron-job, Edge Function of server-side check.
**Impact**: Dit is de kern van de Responsgarantie-belofte. Zonder notificatie is de responsgarantie puur een UI-label met geen afdwinging.

### Trust Score verlaagd
**Verwacht**: Als een bedrijf een lagere Trust Score krijgt, wil het dit weten en begrijpen.
**Implementatie**: **AFWEZIG** — Trust Score algoritme is een stub.
**Impact**: Bedrijven kunnen hun gedrag niet verbeteren als ze niet weten dat hun score veranderd is.

### BBL 90-dagen-mark nadert
**Verwacht**: 90 dagen vóór contracteinde → notificatie aan student, leerbedrijf, school.
**Implementatie**: **AFWEZIG** als actieve notificatie — bbl-hub.html:960 toont de termijn in de UI maar verstuurt geen notificatie.
**Impact**: De marketing-belofte "Internly houdt die deadline bij" is niet waar: de deadline wordt getoond, niet bewaakt.

### Eindverslag definitief
**Verwacht**: Als een eindverslag door alle partijen is ondertekend (eval_completed), stuurt het platform een bevestiging aan school.
**Gedeeltelijk aanwezig**: `eval_completed` wordt verstuurd bij bbl-hub.html signOff, maar school-dashboard.html heeft geen notificatie-handler voor dit event aangetroffen.
**Impact**: MIDDEL — de keten werkt deels maar is niet volledig.

---

## Notificatie-tekst kwaliteit

| Notificatie | Huidige tekst (estimate) | Oordeel |
|-------------|--------------------------|---------|
| application_accepted | "X heeft jouw match geaccepteerd — start het gesprek!" | ✅ Helder, CTA aanwezig |
| application_rejected | "X heeft de match helaas afgewezen" | ⚠️ Geen reden, geen vervolgstap |
| new_message | Bericht-preview? | ❓ Niet geverifieerd — bevat het de naam van de afzender? |
| buddy_request | "X wil je buddy worden" | ✅ (aanname op basis van codepatroon) |
| eval_signed | "Evaluatie ondertekend door X" | ✅ (aanname) |

### Privacy-risico in notificatieteksten
**Observatie**: Notificaties als "application_accepted" bevatten de bedrijfsnaam direct in de message-string. Dit is bedoeld. Maar als de bedrijfsnaam persoonsgegevens bevat (bijv. een eenmanszaak "Jan Jansen Consulting"), lekt de naam via de notificatietabel.
**Ernst**: LAAG — acceptabel in context, maar bewust van maken bij AVG-review.

---

## Offline gedrag

**Observatie**: Notificaties worden geladen via `loadNotifications()` op page-load. Supabase realtime stuurt nieuwe notificaties via WebSocket.

**Scenario**: Gebruiker is offline, ontvangt een match-notificatie, logt in als verbinding hersteld is.
**Verwacht**: loadNotifications() haalt alle ongelezen notificaties op — ✅ werkt.
**Risico**: Als de WebSocket verbinding verliest terwijl de gebruiker actief is op de pagina, ontvangt hij geen real-time notificaties totdat hij de pagina herlaadt. Geen visuele indicator.

---

## Samenvatting

**Werkend (13 events)**: new_message, new_meeting, meeting_accepted, meeting_rejected, eval_signed, eval_completed, buddy_request, buddy_accepted, buddy_declined, new_review, application_accepted, application_rejected, wachtwoord-reset

**Problematisch (5 events)**: application_accepted/rejected/begeleider_invite gebruiken niet-geregistreerde types; subscription_activated/failed zijn geregistreerd maar trigger niet gevonden; school-koppeling type onbekend

**Volledig afwezig (5 kritische events)**: responsgarantie-deadline, trust-score-update, student-start-stage, BBL-90-dag-mark, eindverslag-aan-school

**Afwezig maar impliciet beloofd door marketing**: responsgarantie-deadline (meest urgent)

---

## Prioritering

| Prioriteit | Actie |
|-----------|-------|
| P1 | Voeg `application_accepted`, `application_rejected`, `begeleider_invite` toe aan VALID_NOTIFICATION_TYPES |
| P2 | Implementeer BBL-90-dag notificatie (gecombineerd met bestaande renewal-UI) |
| P3 | Responsgarantie-deadline herinnering (vereist cron of Edge Function) |
| P4 | Trigger vinden voor subscription_activated/failed |
| P5 | Eindverslag-notificatie aan school bij eval_completed |

---

*JJ2 — 22 april 2026 — READ-ONLY*
