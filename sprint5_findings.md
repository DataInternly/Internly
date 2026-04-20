# Sprint 5 Bevindingen — buiten scope, voor sprint 5b

Gedocumenteerd per Sokka's instructie: "niet doen, documenteer voor sprint 5b".

---

## F1 — Werkelijk 34 email-split patronen, niet 23

Grep vond 34 `split('@')` patronen in totaal. 23 zijn gemigreerd (in-scope bestanden).
Resterende 11 in sprint 5b bestanden:
- `admin.html:416` (1)
- `bbl-dashboard.html:568` (1)
- `bbl-hub.html:1254, 1310, 1684, 1964, 2423, 2525` (6)
- `bbl-profile.html:660` (1)
- `begeleider-dashboard.html:890` (1)
- `buddy-dashboard.html:784` (1)

---

## F2 — getDisplayName checkt niet `profile.name` (alleen `naam`)

Op twee plekken worden profile rows met een `name` kolom (naast `naam`) doorgegeven aan getDisplayName:
- `chat.html:742` — `profile.naam || profile.name || profile.email?.split('@')?.[0]`
- `company-dashboard.html:1718` — `p.naam || p.name || p.email?.split('@')?.[0]`

getDisplayName checkt `user?.naam` maar niet `user?.name`. In de praktijk gebruiken alle profielen `naam` (NL platform), dus `name` is waarschijnlijk nooit gevuld. Sprint 5b: voeg `user?.name` toe aan getDisplayName als gebleken is dat het veld gevuld wordt.

---

## F3 — Contextspecifieke fallbacks vervangen door 'Gebruiker'

De volgende patronen hadden een inhoudelijk fallback die nu 'Gebruiker' is geworden:
- `'Jij'` (chat render — eigen berichten)
- `'Gesprekspartner'` (chat render — andere partij)
- `'Iemand'` (notificatie teksten)
- `'Een student'`, `'Een bedrijf'`, `'Jouw school'`, `'Jouw bedrijf'` (notificatie teksten)

Impact: alleen zichtbaar als user geen naam EN geen email heeft — extreem zeldzaam.
Sprint 5b: overweeg context-parameter voor getDisplayName.

---

## F4 — discover.html signOut verwijderde realtime subscription cleanup

De oude `signOut()` in discover.html deed `db.removeChannel(notifSubscription)` vóór signOut.
`performLogout()` doet dit niet. Bij redirect verdwijnt de subscription sowieso.
Sprint 5b: overweeg cleanup hook in performLogout of beforeunload.

---

## F6 — privacybeleid.html:406 — Trust Score automatisch-claim in juridisch document

`privacybeleid.html:406` — "Voor bedrijven berekenen we automatisch een betrouwbaarheidsscore, gebaseerd op meetbaar gedrag"
Het Trust Score auto-algoritme is niet geïmplementeerd. Dit staat in een juridisch document — stil aanpassen
zonder juridische review is riskant.
Sprint 5b: Barry bekijkt de exacte formulering; overweeg "op basis van meetbaar gedrag" zonder "automatisch".

---

## F7 — faq.html:628 — BBL contract-verlengingsnotificatie niet geverifieerd

`faq.html:628` — "Internly notificeert jou en je werkgever automatisch" (over verlengingsbeslissing 90 dagen voor einde contract)
Niet geverifieerd of deze specifieke notificatie daadwerkelijk is opgezet in de BBL-flow.
Sprint 5b: controleer of de BBL-verlengingsnotificatie actief is; zo niet, tekst aanpassen naar "kun je instellen".

---

## F5 — begeleider-dashboard.html session-timeout signOut niet gemigreerd (intentioneel)

`begeleider-dashboard.html:602` — `await db.auth.signOut().catch(() => {})` in session-timeout handler
stuurt naar `auth.html?reason=timeout`, niet naar `/index.html`. Dit is bewust buiten scope gehouden.
Sprint 5b: overweeg `performLogout(redirectUrl)` variant met optionele redirect-override.
