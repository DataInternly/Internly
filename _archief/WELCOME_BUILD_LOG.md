# WELKOM OVERLAY BUILD LOG — 1 mei 2026

Sessie: welkom-overlay implementatie volgens WELCOME_AUDIT.md (Optie 2).
Geen wijzigingen aan auth.html, js/roles.js, js/utils.js.
Geen wijzigingen aan BACKUP/ of _revamp_2026-04-29/.

---

## js/welcome-overlay.js

**WRITTEN — 403 regels** (`c:\Projects\Internly\js\welcome-overlay.js`)

**Roles covered:**
- `student` — BOL/HBO/WO standaard
- `student_bbl` — BBL-studenten (paarse buddy-accent gebruikt voor gepensioneerd)
- `student_international` — engelstalig (international students)
- `bedrijf`
- `school`
- `begeleider`
- `gepensioneerd` — buddy

**Public API:**
- `window.maybeShowWelcomeOverlay(userId, role, naam, flags)` — toont overlay als geen flag
- `window._wDismiss(userId)` — dismiss + persist `internly_welcomed_<userId>` in localStorage

**Flag-key**: `internly_welcomed_<userId>` (localStorage, persistent)

---

## SCRIPT TAGS (Stap 2)

| Bestand | Toegevoegd op regel | Status |
|---|---|---|
| discover.html | 20 (na supabase.js:19) | ADDED |
| bbl-hub.html | 63 (na supabase.js:62) | ADDED |
| bbl-profile.html | 26 (na avatar.js:25) | ADDED |
| company-dashboard.html | 20 (na avatar.js:19) | ADDED |
| school-dashboard.html | 20 (na avatar.js:19) | ADDED |
| begeleider-dashboard.html | 20 (na avatar.js:19) | ADDED |
| buddy-dashboard.html | 28 (na avatar.js:27) | ADDED |
| international-student-dashboard.html | 44 (na avatar.js:43) | ADDED |
| match-dashboard.html | 23 (na supabase.js:22) | ADDED |
| student-profile.html | 20 (na avatar.js:19) | ADDED |

Alle 10 toegevoegd. Geen SKIPs.

---

## INJECTIES (Stap 3)

| Bestand:Regel | user.id var | naam-bron | flags |
|---|---|---|---|
| discover.html:1438 | `user.id` | `sp?.naam` (uit student_profiles SELECT regel 1425) | `{ bbl: false, international: sp?.student_type === 'international' }` |
| bbl-hub.html:2519 | `user.id` | `sp?.naam` (uit student_profiles SELECT regel 2505) | `{ bbl: true, international: false }` |
| bbl-profile.html:699 | `user.id` | `sp?.naam` (uit student_profiles SELECT regel 668) | `{ bbl: true, international: false }` |
| company-dashboard.html:3377 | `user.id` | inline `_wcProf?.naam` (extra SELECT op profiles) | `null` |
| school-dashboard.html:2512 | `user.id` | inline `_wcProf?.naam` (extra SELECT op profiles) | `null` |
| begeleider-dashboard.html:1242 | `user.id` | `profile.naam` (al geladen op regel 1235) | `null` |
| buddy-dashboard.html:1028 | `user.id` | `profile.naam` (al geladen op regel 1010) | `null` |
| international-student-dashboard.html:1119 | `user.id` | `_iSp?.naam` (uit student_profiles SELECT regel 1101) | `{ bbl: false, international: true }` |
| match-dashboard.html:2812 | `user.id` | `_spForWelcome?.naam` (alleen als mappedRole === 'student') | `null` |
| student-profile.html:1648 | `user.id` | `existing?.naam` (uit student_profiles SELECT regel 1632) | `null` |

**Patroon**: alle injecties gebeuren NA de role-guard EN NA de bbl/intl/role-bepaling, zodat de juiste sub-rol-variant getoond wordt.

**Speciale gevallen**:
- `company-dashboard.html` en `school-dashboard.html` deden tot nu toe geen aparte SELECT op `profiles.naam` — extra inline SELECT toegevoegd voor de welkom-call.
- `match-dashboard.html` — gewrapt in `if (mappedRole === 'student')` zodat alleen studenten een welkom op de Stage Hub zien.

---

## NIET GEWIJZIGD

- `auth.html` — ongewijzigd
- `js/roles.js` — ongewijzigd
- `js/utils.js` — ongewijzigd
- BACKUP/, _revamp_2026-04-29/ — niet aangeraakt

---

## GEWIJZIGDE BESTANDEN

1. `c:\Projects\Internly\js\welcome-overlay.js` — NIEUW (403 regels)
2. `c:\Projects\Internly\discover.html` — script tag + injectie
3. `c:\Projects\Internly\bbl-hub.html` — script tag + injectie
4. `c:\Projects\Internly\bbl-profile.html` — script tag + injectie
5. `c:\Projects\Internly\company-dashboard.html` — script tag + injectie + inline naam-fetch
6. `c:\Projects\Internly\school-dashboard.html` — script tag + injectie + inline naam-fetch
7. `c:\Projects\Internly\begeleider-dashboard.html` — script tag + injectie
8. `c:\Projects\Internly\buddy-dashboard.html` — script tag + injectie
9. `c:\Projects\Internly\international-student-dashboard.html` — script tag + injectie
10. `c:\Projects\Internly\match-dashboard.html` — script tag + conditional injectie
11. `c:\Projects\Internly\student-profile.html` — script tag + injectie

---

## TEST-CHECKLIST

- [ ] Eerste login als nieuwe student (BOL) → student-overlay verschijnt
- [ ] Eerste login als BBL-student → BBL-overlay verschijnt op bbl-hub
- [ ] Eerste login als international student → engelstalige overlay
- [ ] Eerste login als bedrijf → bedrijf-overlay
- [ ] Eerste login als school → school-overlay
- [ ] Eerste login als begeleider → begeleider-overlay
- [ ] Eerste login als gepensioneerd → buddy-overlay (paars accent)
- [ ] Tweede login (alle rollen) → géén overlay
- [ ] Klik op actie-link in overlay → overlay sluit, navigeert; bij terugkeer geen overlay meer
- [ ] Klik buiten dialog → overlay sluit, flag persisteert
- [ ] Reset-test: `localStorage.removeItem('internly_welcomed_<userId>')` → overlay komt terug
- [ ] Bedrijf-account loggt in → ziet bedrijf-overlay (NOOIT student-overlay)

---

## ROLLBACK-INSTRUCTIES (indien nodig)

1. Verwijder `<script src="js/welcome-overlay.js"></script>` uit alle 10 bestanden
2. Verwijder de `if (typeof maybeShowWelcomeOverlay === 'function') {...}` blokken (gemarkeerd met `// welcome-overlay.js — 1 mei 2026` comment)
3. (Optioneel) verwijder `js/welcome-overlay.js`

Alle injectie-blokken zijn defensief gewrapt in `typeof === 'function'` checks — als welcome-overlay.js niet geladen wordt, gaat de pagina gewoon door zonder error.
