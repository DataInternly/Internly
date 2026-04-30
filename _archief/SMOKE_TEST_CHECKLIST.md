# Internly Smoke Test Checklist
**Gebruik vóór elke FTP upload. Doorlooptijd: ~8 minuten.**
Maak screenshots van rides die falen — sla op als evidence.

---

## 1. Inloggen werkt (alle rollen)

- [ ] Open `https://internly.pro/auth.html`
- [ ] Login als student (`student@internly.pro`)
- [ ] Verwacht: redirect naar `student-profile.html` of `match-dashboard.html`
- [ ] Logout werkt (knop rechtsboven)
- [ ] Login als bedrijf (`bedrijf@internly.pro`) → redirect naar `company-dashboard.html`
- [ ] Login als school (`school@internly.pro`) → redirect naar `school-dashboard.html`

---

## 2. Matchpool laadt (student)

- [ ] Login als student → open `matchpool.html`
- [ ] Drie toggles zichtbaar: **Vacatures** / **Buddies** / **Bedrijven**
- [ ] Eerste kaart verschijnt zonder JS-error in console
- [ ] Toggle uit-klikken (bijv. Buddies) → kaarttype verdwijnt uit rotatie
- [ ] Empty-state toont correct als alle decks leeg zijn

---

## 3. Swipe flow (Geordi2 scenario's 2-4)

- [ ] Right-swipe op vacature → row in `swipes` tabel (check via Supabase Studio)
  - Verwacht: `target_type='vacature'`, `direction='like'`
- [ ] Right-swipe op buddy → `target_type='buddy'`
- [ ] Right-swipe op bedrijf → `target_type='bedrijf'`
- [ ] Pass-swipe → row in `swipes` tabel met `direction='pass'`
- [ ] Zelfde kaart tweemaal tonen: **niet mogelijk** (gefilterd bij laden) ✓

---

## 4. Bedrijfs-inbox + mutual match (Geordi2 scenario 4)

- [ ] Login als bedrijf → open `company-dashboard.html`
- [ ] Sectie "Interesse in jou" toont likes van studenten
- [ ] Klik "Accepteren" op een student → bevestig in DB:
  - `swipes` tabel: nieuwe rij met `swiper_id=bedrijf.id`, `target_type='student'`
  - `matches` tabel: nieuwe rij met `type='mutual_swipe'`, `status='accepted'`

---

## 5. Notificaties (Geordi2 scenario 5)

- [ ] Na mutual match: **beide** partijen zien `new_match` notificatie (bell badge incrementeert)
- [ ] Notificatie-dropdown opent correct
- [ ] "Alles gelezen" button werkt

---

## 6. Chat opent vanuit match (Geordi2 scenario 6)

- [ ] Klik op match-notificatie → navigeert naar `chat.html` of `matches.html`
- [ ] Bericht typen + versturen werkt
- [ ] Real-time update zichtbaar op ontvangerspagina

---

## 7. School-dashboard (Geordi2 scenario 7)

- [ ] Login als school → `school-dashboard.html` laadt zonder JS-error
- [ ] Cohort-overzicht zichtbaar
- [ ] Koppelingsformulier (begeleider-link) werkt → check `matches` tabel:
  - `type='begeleider_link'` (**niet** `match_type` — was bug, nu gefixed)

---

## 8. BBL pad (Geordi2 scenario 8)

- [ ] Login als BBL-student → redirect naar `bbl-hub.html` (niet `student-profile.html`)
- [ ] Voortgang laadt correct
- [ ] Geen JS-errors in console

---

## 9. Console clean

- [ ] **Geen rode errors** in browser DevTools console op enige pagina hierboven
- [ ] **Geen 404s** op resources (check Network tab — filter op rood)
- [ ] Geen `[object Object]` in zichtbare UI

---

## 10. Auth guard

- [ ] Open `matchpool.html` **zonder** in te loggen → redirect naar `auth.html` ✓
- [ ] Open `company-dashboard.html` als student → redirect ✓

---

## Na slagen: FTP deployen
Bestandsvolgorde voor upload:
1. `js/utils.js`
2. `js/supabase.js`
3. `js/matchpool.js`
4. `matchpool.html`
5. Overige gewijzigde bestanden (zie git status)

*Aangemaakt: 22 april 2026 — All-Hands Council audit (Geordi2's scenario's)*
