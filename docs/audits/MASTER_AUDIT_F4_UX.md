# MASTER AUDIT — FASE 4 : UX CONSISTENCY (mama-test relevant)
Datum: 9 mei 2026
Methode: read-only grep + HEADER_SPEC kruisverwijzing
Git-staat: working tree clean; vrijdag-changes (b7b1c90) zijn gecommit

---

## 4.1 — Header-types per HEADER_SPEC

### Type A — Publiek (uitgelogd)
HEADER_SPEC noemt: `<header class="public-header">` met logo + 4 nav-links + login-button. Pagina's horen dit te tonen voor uitgelogde users.

**Realiteit**: 11 publieke pagina's roepen `renderRoleHeader(role, null, ...)` aan **wanneer een user wel ingelogd is** — dat geeft Type B/C/D/E. Voor uitgelogde users tonen ze hun eigen statische header.

| Pagina | renderRoleHeader-aanroep? | Type A statische fallback? |
|---|---|---|
| about.html | JA (1150) | JA |
| algemene-voorwaarden.html | JA (517) | JA |
| cookiebeleid.html | JA (539) | JA |
| esg-rapportage.html | JA (913) | JA |
| faq.html | JA (1099) | JA |
| hoe-het-werkt.html | JA (1467) | JA |
| internly-worldwide.html | JA (1816) | JA |
| kennisbank.html | JA (1930) | JA |
| pricing.html | JA (810) | JA |
| privacybeleid.html | JA (801) | JA |
| spelregels.html | JA (655) | JA |

**Status: PASS** voor 11 publieke pagina's; ze switchen tussen Type A (uitgelogd) en role-header (ingelogd) correct.

### Type B — Student BOL/BBL (groen)
| Pagina | Helper-aanroep |
|---|---|
| bbl-dashboard.html:610 | `renderStudentHeader({ activeTab: 'matches' })` |
| bbl-hub.html:2631 | `renderStudentHeader({ activeTab: 'discover' })` |
| discover.html:1435 | `renderStudentHeader({ activeTab: 'discover' })` |
| matches.html:753 | `renderStudentHeader({ activeTab: ... })` |
| match-dashboard.html:2612 | `renderStudentHeader({ activeTab: 'hub' })` (alleen voor role==='student') |
| mijn-sollicitaties.html:808 | `renderStudentHeader({ activeTab: 'sollicitaties' })` |
| student-home.html:277 | `renderStudentHeader({ activeTab: 'home' })` |
| student-profile.html:1657 | `renderStudentHeader({ activeTab: null })` |
| mijn-berichten.html:872 | `renderRoleHeader(headerRole, 'berichten', ...)` met BBL-detect (handmatig) |

**Status: PASS** — alle 9 student-pagina's gebruiken een centrale helper. mijn-berichten gebruikt `renderRoleHeader` i.p.v. `renderStudentHeader` maar met expliciete BBL-detect (zie HEADER_SPEC §B "verboden" sectie — dit is het correcte patroon).

#### F4.1.A — student profile/bbl/bol pagina's renderen Type B Header maar pagina-content heeft eigen markup [P3]
`bbl-profile.html`, `bol-profile.html`, `student-profile.html` zijn **profile-form pagina's** met eigen wizard-flow (← Terug knoppen tussen stappen). Type B header zit erbovenop maar de wizard heeft eigen kleurenschema. Bedoeld zo. PASS.

### Type C — Bedrijf (sidebar)
| Pagina | Header-pattern |
|---|---|
| company-dashboard.html | eigen sidebar-markup + topbar |
| company-discover.html | eigen sidebar-markup |
| match-dashboard.html | eigen `#hub-topbar` voor non-student |
| vacature-detail.html | eigen markup |

**Status: VERIFY** — geen helper voor Type C bestaat (HEADER_SPEC noemt `renderRoleHeader('bedrijf', ...)` of `renderBedrijfSidebar()`). Beide pagina's hebben eigen markup. **Geen consistentie-check tussen company-dashboard en company-discover sidebars.**

### Type D — School / Begeleider (sidebar)
| Pagina | Header-pattern |
|---|---|
| school-dashboard.html | eigen sidebar-markup + topbar |
| begeleider-dashboard.html | eigen sidebar-markup + topbar |
| international-school-dashboard.html | eigen markup, **eigen sign-out** |

**Status: VERIFY** — geen helper. Drie pagina's, drie afwijkingen mogelijk.

### Type E — Buddy (paars)
| Pagina | Helper-aanroep |
|---|---|
| buddy-dashboard.html:842,1362 | `renderRoleHeader('gepensioneerd', ...)` |
| mijn-notities.html:225 | `renderRoleHeader('gepensioneerd', 'notities', ...)` |
| mijn-berichten.html | rol-detectie selecteert `gepensioneerd` als applicable |

**Status: PASS**

### Geen helper, eigen markup
| Pagina | Reden |
|---|---|
| chat.html | eigen rol-aware mini-topbar met `← Stage Hub` link |
| admin.html | minimal admin-header |
| auth.html | login-form, geen rol-header |
| la-sign.html | publiek signing-form |

**Bevinding**: HEADER_SPEC compliance is **goed voor Type B en E** (helper-driven), **slecht voor Type C en D** (geen helper bestaat — elke dashboard heeft eigen sidebar-markup). Dit is gedocumenteerde tech-debt (geen helper voor sidebars). P2 voor post-LT.

---

## 4.2 — Logout consistency (mama-test #2)

### Inventarisatie van alle logout-knoppen
| Pagina | Locatie | Class | Tekst | Functie | Mama-test? |
|---|---|---|---|---|---|
| company-dashboard.html:596 | topbar | `topbar-logout` | `🚪 Uitloggen` | performLogout | ✓ |
| school-dashboard.html:618 | topbar | `topbar-logout` | `🚪 Uitloggen` | performLogout | ✓ |
| company-dashboard.html:730 | sidebar | `btn-logout` | `🚪 Uitloggen` | signOut() wrapper | DUPLICATE |
| school-dashboard.html:710 | sidebar | `btn-logout` | `🚪 Uitloggen` | signOut() wrapper | DUPLICATE |
| renderStudentHeader (utils.js:1184) | header | `sh-logout-btn` | `🚪 Uitloggen` | performLogout | ✓ via helper |
| buddy-dashboard.html:323 | topbar | `topbar-signout` | `↪ Uit` | signOut() wrapper | **AFWIJKEND** |
| bbl-profile.html:331 | topbar | `topbar-signout` | `↪ Uit` | signOut() wrapper | **AFWIJKEND** |
| chat.html:492 | topbar | inline-style | `↪ Uit` | performLogout | **AFWIJKEND** |
| match-dashboard.html:2217 | topbar (non-student) | inline-style | `↪ Uit` | performLogout | **AFWIJKEND** |
| bol-profile.html:1422 | topbar | `btn-topbar-logout` | `Uitloggen` | signOut() | **AFWIJKEND** |
| company-discover.html:758 | topbar | `btn-topbar-logout` | `Uitloggen` | signOut() | **AFWIJKEND** |
| international-school-dashboard.html:498 | topbar | (geen class) | `Sign out` | signOut() | **AFWIJKEND** (Engels) |
| international-student-dashboard.html:793 | topbar | (geen class) | `Sign out` | signOut() | **AFWIJKEND** (Engels) |

### F4.2.A — 4 verschillende teksten voor "uitloggen" [P2]
| Tekst | Aantal pagina's |
|---|---|
| `🚪 Uitloggen` | 6 (company-dash topbar+sidebar, school-dash topbar+sidebar, alle student-pagina's via helper, mijn-notities) |
| `↪ Uit` | 4 (buddy-dashboard, bbl-profile, chat, match-dashboard non-student) |
| `Uitloggen` (zonder emoji) | 2 (bol-profile, company-discover) |
| `Sign out` | 2 (international dashboards — Engels intentioneel?) |

**Bedward-commit b7b1c90 zegt "tekst standaardisatie alle rollen"** — maar realiteit: alleen company + school zijn gestandaardiseerd, andere 8 pagina's nog niet. Mama-test #2 (Mark van der Vossen) zal hier struikelen: hij ziet 4 teksten verspreid over de pagina's.

**Mitigatie**: standaardiseer op `🚪 Uitloggen` (15 chars) of `↪ Uit` (5 chars — beter mobiel). Een keuze + 8 pagina-edits.

**Classificatie: P2** — UX inconsistentie, niet blocker maar mama-test relevant.

### F4.2.B — Dubbele logout-knop op company + school dashboard [P3]
Beide hebben `topbar-logout` (regel ~596) **én** `btn-logout` in de sidebar (regel ~710-730). Twee buttons, exact dezelfde functie, beide tonen `🚪 Uitloggen`. Op desktop ziet de user beide.

**Mitigatie**: verwijder de sidebar-versie OR de topbar-versie. Sidebar maakt meer sense voor sticky-positioning op lange dashboards.

**Classificatie: P3**

### F4.2.C — International dashboards in het Engels [P3 / DESIGN-CHECK]
`Sign out` i.p.v. `Uitloggen`. Mogelijk bewust (international-doelgroep), maar inconsistent met rest van de app waar BBL/BOL Nederlandstalig blijft.

**Verifieer met PO**: international dashboards EN-only of NL+EN switcher?

---

## 4.3 — Back-knop consistency (mama-test #3)

### `goBack()` helper — `js/utils.js:401`
```js
function goBack(fallbackHref) {
  const ref = document.referrer;
  const hasMeaningfulHistory = ref && !ref.includes('auth.html') && ref !== window.location.href;
  if (hasMeaningfulHistory || window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = fallbackHref || 'index.html';
  }
}
```

### Inventarisatie call-sites
| Pagina | Regel | Aanroep | Fallback |
|---|---|---|---|
| company-dashboard.html | 727 | `goBack('company-dashboard.html')` | self ✓ (Run gefixt — TODO_ROL_AWARE_BACK_NAVIGATION) |
| school-dashboard.html | 709 | `goBack('discover.html')` | **STUDENT-pagina** (BUG — TODO open) |
| begeleider-dashboard.html | 513 | `goBack('discover.html')` | **STUDENT-pagina** (BUG — TODO open) |
| buddy-dashboard.html | 322 | `goBack('index.html')` | neutraal — OK |
| spelregels.html | 422 | `goBack('index.html')` | neutraal — OK |
| renderStudentHeader (utils.js:1183) | helper | `goBack('discover.html')` | OK voor student rol |

### F4.3.A — school + begeleider back-knop fallback wijst naar student-pagina [P2]
Reproductie: ingelogde school-user opent dashboard → klikt "← Vorige pagina" als allereerste actie → `history.length === 1` → fallback `discover.html` (student-pagina) → wordt **geredirect naar auth.html via guardPage** (`discover.html` is student-only).

UX-impact: school/begeleider raakt onverwacht uitgelogd of komt op verkeerd dashboard. **Mama-test #3 confirmed**.

**Mitigatie** (per TODO_ROL_AWARE_BACK_NAVIGATION):
- Optie A: per-pagina hardcoded fallback. `school-dashboard:709` → `goBack('school-dashboard.html')`. Volume: 2 edits.
- Optie B: rol-aware via `goBack(getRoleLanding(role))`. Vereist `role` in scope op de back-button — meer werk.

**Classificatie: P2** — UX-blocker voor school/begeleider, niet kritisch genoeg voor LT-blocker (workaround: gebruik browser-back). Maar **bekend per FINAL_CHECK_REPORT.md:173** als deferred.

### F4.3.B — chat.html out-of-scope back-knop [P3]
chat.html heeft eigen rol-aware terugknop logic (lijn 1622 commentaar: "Item 10 — chat.html is gedeeld over rollen"). Niet gestandaardiseerd via `goBack()` helper. PASS — design-keuze.

---

## 4.4 — Account-switch flow (mama-test #1)

### `js/account.js` overzicht
- Bestand: 467 regels
- Exports: `window.AccountModule` met `renderAccountScreen(containerId, lang)` + `handleSaveContact()`
- Geen URL-wijziging, geen redirect — **rendert alleen DOM in container**

### Callers
| Pagina | Trigger |
|---|---|
| bbl-dashboard.html:606 | render in `account-container` |
| begeleider-dashboard.html:747-756 | dubbele call (event-handler + state) |
| buddy-dashboard.html:1358 | render |
| company-dashboard.html:1618 | render bij section='account' |
| international-school-dashboard.html:681 | render met `'en'` taal |
| international-student-dashboard.html:1207 | render met `'en'` |
| match-dashboard.html:3197 | render |

**Account is een tab in het dashboard**, geen aparte pagina.

### F4.4.A — geen rol-parameter aan renderAccountScreen [P2]
TODO_ACCOUNT_REFACTOR.md beschrijft dit precies:
> AccountModule **leest niet** de huidige rol bij rendering. `renderAccountScreen(containerId, lang)` neemt alleen taal, geen rol. Plan-labels zijn rol-impliciet (company_pro, school_premium, begeleider_starter), maar de UI toont al die plan-namen ongeacht of de huidige user bedrijf, school of begeleider is.

**Mama-test #1 risico**: bedrijf-user opent Account-tab, ziet ook school_premium-plan optie. Verwarrend.

**Mitigatie**: `renderAccountScreen(containerId, lang, role)` + filter plans op rol. ~30 min werk.

**Classificatie: P2**

### F4.4.B — geen wrong-role guard [P3]
Theoretisch kan een student via DevTools `AccountModule.renderAccountScreen()` aanroepen op een bedrijf-pagina (al die methode is alleen window-global zichtbaar voor gerichte aanroep — niet exploitable via UI).

**Classificatie: P3** — defensieve verbetering.

### F4.4.C — wrong-role guard company-dashboard.html:3408-3410 [VERIFY]
De audit-prompt noemt deze regels als "mogelijk gerelateerd" aan account-switch. Ik verifieer.

(zie company-dashboard.html:3473-3489 hierboven — `userRole !== 'bedrijf'` → redirect naar getRoleLanding. Dit is een rol-check op page-load, niet op account-switch. Account-switch flow gebeurt CLIENT-side in dezelfde tab, deze guard triggert dus niet.)

**Status**: deze guard beschermt tegen "verkeerde rol opent verkeerde dashboard via URL" maar niet tegen "user wisselt account in dezelfde tab".

---

## 4.5 — Overzicht-knop

### Inventarisatie
| Pagina | "Overzicht" tekst |
|---|---|
| begeleider-dashboard.html:489 | sidebar-label "Overzicht" → leidt naar #overview-section |
| school-dashboard.html:660 | sidebar-label "Overzicht" → leidt naar #overview-section |
| match-dashboard.html:3289 | page-title "Overzicht" (niet een knop) |
| match-dashboard.html:2191 | info-tooltip "Overzicht van behaalde competenties..." |
| mijn-sollicitaties.html:229 | page-sub "Overzicht van je ingediende aanvragen" |

**Geen "Overzicht" knop in topbar/sidebar voor andere rollen** (student gebruikt "Mijn Stage Hub" / "Home", buddy gebruikt "Overzicht" in renderRoleHeader('gepensioneerd') tabs).

### F4.5.A — "Overzicht" tekst per rol verschillend [P3]
| Rol | Tekst eerste-tab |
|---|---|
| Student BOL | `Mijn Stage Hub` (renderStudentHeader bolNav) |
| Student BBL | `Overzicht` (renderStudentHeader bblNav) |
| Bedrijf | `Dashboard` (sidebar-label) |
| School | `Overzicht` (sidebar-label) |
| Begeleider | `Overzicht` (sidebar-label) |
| Buddy | `Overzicht` (HEADER_NAV_BY_ROLE) |

3 verschillende termen voor "het hoofd-overzicht": `Mijn Stage Hub` / `Dashboard` / `Overzicht`. Mama-test #5 zou hierop kunnen struikelen ("waar is mijn dashboard?").

**Mitigatie**: standaardiseer op `Overzicht` (4 rollen al) — vereist BOL en bedrijf bijwerken.

**Classificatie: P3** — niet blocker.

---

## 4.6 — Trust Score / profile_completeness rendering

### `renderRoleLanding()` (js/utils.js:1036) — completeness-component
- Toont alleen bij `completeness < 100`
- Voortgangsbalk + suggesties
- Suggesties zijn `<a href="${profileEditUrl}">+ ...</a>` — wijst naar `profile_edit_url`

### `profile_edit_url` per rol
| Rol | Pagina | Waarde |
|---|---|---|
| BBL | bbl-hub.html:743 | `'bbl-profile.html'` ✓ |
| Bedrijf | company-dashboard.html:783 | `'#'` (DODE LINK) |
| School | school-dashboard.html:751 | `'#'` (DODE LINK) |

### F4.6.A — bedrijf en school suggestion-links zijn dood (`#`) [P2]
Bedrijf/school user ziet "Profiel 65% compleet" met suggestie-links → klikt → niets gebeurt (`href="#"` geen handler).

**Mitigatie**: 
- Bedrijf: `data.profile_edit_url = 'company-dashboard.html?section=profile'` of dedicated `company-profile.html` (bestaat niet — moet gebouwd)
- School: `data.profile_edit_url = 'school-dashboard.html?section=profile'`

**Classificatie: P2** — visible bug, mama-test #4 (profile-completion) zou hierop falen.

### F4.6.B — Trust Score auto-algoritme niet geïmplementeerd [P3 — bekend]
Per CLAUDE.md "Bekende stubs": Trust Score = niet geïmplementeerd. profile_completeness wordt **client-side berekend** via helpers in utils.js (calculateProfileCompleteness). Geen DB-trigger. Acceptabel voor LT.

---

## 4.7 — Mobile responsive (< 768px)

### Sidebar verbergen patroon
Bedrijf/school/begeleider gebruiken **identiek patroon**:
```css
@media (max-width: 768px) {
  .sidebar { display: none; }
  .mobile-tabs { display: flex; }
}
```
- begeleider-dashboard.html:365-366 ✓
- school-dashboard.html: vermoedelijk idem (geen explicit grep-hit op de pagina, maar mobile-tabs bestaat op :601 voor company)

### Mobile-tabs heeft logout? — NEE
Grep `mt-tab.*Uit|mt-tab.*signOut|mt-tab.*Logout` → **0 hits**. Mobile-tabs heeft alleen Dashboard/Vacatures/Matches/Berichten/Reviews — **geen logout-knop**.

### F4.7.A — Mobile users zonder logout-toegang [P2]
Op mobile (<768px) verbergt het systeem de sidebar. Op company-dashboard:
- Topbar `topbar-logout` is wel zichtbaar (vrijdag-fix b7b1c90)
- Sidebar `btn-logout` (regel 730) is verborgen
- Mobile-tabs heeft geen logout

**Op company/school: PASS** — topbar-logout is mobile-bereikbaar.

**Op buddy/bbl-profile/bol-profile/chat/match-dashboard mobile**: topbar-signout / inline-styled buttons — verifieer of ze zichtbaar blijven < 768px.

**VERIFY NEEDED**: open match-dashboard.html op iPhone-viewport, controleer of `↪ Uit` button bereikbaar is. Vermoedelijk wel (zit in de `#hub-topbar` die niet wordt verborgen), maar inline-style geeft geen garantie.

**Classificatie: P2** — verifieer per pagina.

### F4.7.B — Mobile-tabs heeft geen logout (intentioneel) [INFO]
Standaard UX-pattern. PASS.

---

## TOP 5 BEVINDINGEN — FASE 4 + mama-test mapping

| # | ID | Severity | Beschrijving | Mama-test | Tijdkost fix |
|---|---|---|---|---|---|
| 1 | F4.6.A | **P2** | Bedrijf + school profile_edit_url = `'#'` (dode link) → completeness-suggesties klikken niets | mama-test #4 (profielsugges-tie werkt niet) | 30-90 min (vereist nieuwe pagina's) |
| 2 | F4.3.A | **P2** | school + begeleider `goBack` fallback `'discover.html'` (student-pagina) → kan tot redirect-naar-auth leiden | mama-test #3 | 5 min × 2 pagina's |
| 3 | F4.2.A | P2 | 4 verschillende logout-teksten over 13 pagina's; b7b1c90 standaardiseerde alleen bedrijf+school | mama-test #2 | ~30 min (8 pagina-edits) |
| 4 | F4.4.A | P2 | renderAccountScreen leest geen rol → toont alle plans ongeacht user-rol | mama-test #1 (verwarrende account-tab) | ~30 min |
| 5 | F4.7.A | P2 | Mobile-logout bereikbaarheid niet geverifieerd op buddy/bbl-profile/chat/match-dashboard | n.v.t. — verify | 5 min DevTools-check |

### Andere observaties
- HEADER_SPEC compliance Type B + E: **PASS** (helper-driven)
- HEADER_SPEC compliance Type C + D: **GAP** — geen helper bestaat, eigen markup per pagina (P3 tech-debt)
- 11 publieke pagina's gebruiken Type A + role-header switch: **PASS**
- Trust Score auto-algoritme: niet geïmplementeerd, acceptable voor LT (bekend stub)
- Mobile patroon (sidebar→mobile-tabs): consistent over bedrijf/school/begeleider
- Vrijdag commit b7b1c90 is gemerged (working tree clean) — labelt zelf "niet browser-getest"

**STOP — Fase 4 klaar.** Wacht op "ga door fase 5".
