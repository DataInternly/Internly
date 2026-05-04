# WELKOM PAGINA AUDIT — 1 mei 2026

Read-only research. Geen bestanden gewijzigd.

---

## ROUTING MAP NA LOGIN

### A) Login-routing (post-`signInWithPassword`, [auth.html:975-995](auth.html#L975-L995))

| Rol | Sub-conditie | Login-landing | Via functie |
|---|---|---|---|
| student (BBL met naam) | `_sp.bbl_mode === true && _sp.naam !== null/''` | `bbl-hub.html` | `resolveStudentDashboard()` (js/roles.js:75) |
| student (BBL zonder naam) | `_sp.bbl_mode === true && _sp.naam === null/''` | `bbl-profile.html` | `resolveStudentDashboard()` (js/roles.js:73) |
| student (international) | `_sp.student_type === 'international'` | `international-student-dashboard.html` | `resolveStudentDashboard()` (js/roles.js:78) |
| student (BOL/HBO/WO standaard) | `_sp.bbl_mode === false/null` | `match-dashboard.html` | `resolveStudentDashboard()` (js/roles.js:80) |
| student (geen `_sp` rij) | `_sp == null` | `student-profile.html` (onboarding) | hard-coded fallback (auth.html:988) |
| school (international) | `_intlSchool` row exists | `international-school-dashboard.html` | hard-coded (auth.html:992) |
| school (gewoon) | geen intl row | `school-dashboard.html` | `getRoleLanding('school')` → `ROLE_LANDING.school` |
| bedrijf | — | `company-dashboard.html` | `getRoleLanding('bedrijf')` |
| begeleider | — | `begeleider-dashboard.html` | `getRoleLanding('begeleider')` |
| gepensioneerd (buddy) | — | `buddy-dashboard.html` | `getRoleLanding('gepensioneerd')` |
| admin | — | `admin.html` | `getRoleLanding('admin')` |

NB: `ROLE_LANDING.student` = `'discover.html'` is een **vangnet** dat nooit getriggerd wordt — `getRoleLanding()` delegeert role==='student' naar `resolveStudentDashboard` (utils.js:36-41).

### B) Signup-routing (post-`db.auth.signUp`)

**Geen directe redirect** — auth.html:1182 toont een succes-bericht:
> "Account aangemaakt! Controleer je e-mail en klik op de bevestigingslink om in te loggen."

De gebruiker logt daarna pas in via de email-bevestigingsflow. Eerste login volgt het login-pad (sectie A). Geen aparte signup-landing.

### C) `resolveStudentDashboard()` — mogelijke return waarden ([js/roles.js:64-81](js/roles.js#L64-L81))
- `null` (als profile.role !== 'student')
- `'match-dashboard.html'` (geen studentProfile, of standaard BOL/HBO/WO)
- `'bbl-profile.html'` (bbl_mode=true + naam null/'')
- `'bbl-hub.html'` (bbl_mode=true + naam ingevuld)
- `'international-student-dashboard.html'` (student_type='international')

### D) Identiteits-doorgifte aan landing page
**JA — sessionStorage** (`internly_role`):
- auth.html:936 — `sessionStorage.setItem('internly_role', role)`
- auth.html:951 — overschreven naar `'bbl'` als BBL-mode
- auth.html:952 — overschreven naar `'student_international'` als intl

Géén URL-params, géén cookies, géén user-id doorgifte. Landing pages roepen zelf `db.auth.getUser()` aan. Naam wordt niet via storage doorgegeven — landing pages laden zelf uit `profiles` of `student_profiles` tabel.

### E) Variabelenamen in auth.html
| Concept | Variabele | Waar |
|---|---|---|
| user.id | `data.user.id` (in doLogin) | auth.html:930 |
| naam (signup-input) | `naam` (lokale const) | auth.html:1042, 1067 |
| naam (post-login) | NIET gelezen — alleen via DB-lookup later | n/a |
| role (DB) | `profile.role`, daarna `role` | auth.html:929-934 |
| role (sessionStorage) | `'internly_role'` | auth.html:936 |
| selectedRole (signup) | `selectedRole` | auth.html:1042, 1066 |

### F) Exact code-blok regels 975-1003

```js
    if (role === 'student') {
      if (_sp && typeof _sp.bbl_mode === 'boolean') {
        // Bestaand profiel — gebruik centrale resolver (single source of truth)
        // js/roles.js gegarandeerd geladen via §Laadvolgorde
        // BBL routing — resolved 2026-04-30 CC Instruction B
        // resolveStudentDashboard checks naam in _sp:
        //   BBL + naam null/empty → bbl-profile.html (onboarding)
        //   BBL + naam filled     → bbl-hub.html
        window.location.href = resolveStudentDashboard({ role: 'student' }, _sp);
      } else {
        // Onboarding-guard: student zonder profiel → profiel-form
        // Resolved 2026-04-30 (CC Instruction B): identiek patroon
        // als discover.html:1406 — geen conflict met canon B2.
        window.location.href = 'student-profile.html';
      }
    } else if (role === 'school' && _intlSchool) {
      // International school → eigen dashboard
      window.location.href = 'international-school-dashboard.html';
    } else {
      window.location.href = getRoleLanding(role, false);
    }
  }, 1000);

  // Push registration — only if permission already granted (no dialog → no race with redirect).
  // First-time permission request is handled by discover.html where there's no redirect pressure.
  if (role === 'student' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    registerPushNotifications(db, data.user.id).catch(() => {});
  }
```

---

## LANDING PAGES

| Bestand | Role guard? | Auth-methode | First render |
|---|---|---|---|
| discover.html (regel 1388) | ✓ via `requireRole('student')` (regel 1397) | `db.auth.getUser()` (1394) | `initDemoDiscover()` voor anonieme view; daarna `renderStudentHeader()` + `loadNotifications()` |
| bbl-hub.html (regel 2478) | ✓ `_bblProf.role === 'student'` + bbl_mode check (2492) | `db.auth.getUser()` (2481) | role check + bbl_mode redirect, daarna BBL-profiel laden |
| company-dashboard.html (regel 3360) | ✓ `userRole === 'bedrijf'` (3367) | `db.auth.getUser()` (3361) | role redirect of dashboard data laden |
| school-dashboard.html (regel 2495) | ✓ `userRole === 'school'` (2502) | `db.auth.getUser()` (2496) | role redirect of school-data laden |
| begeleider-dashboard.html (regel 1223) | ✓ `profile.role === 'begeleider'` | `db.auth.getUser()` (1226) | studenten + activity feed laden |
| buddy-dashboard.html (regel 996) | ✓ `profile.role === 'gepensioneerd'` (957) | `db.auth.getUser()` (1002) | waitlist-row + buddy-pairs laden |
| international-student-dashboard.html (regel 1074) | ❌ alleen user-check, GEEN role-check | `db.auth.getUser()` (1076) | `loadProfile()` direct |

**Geen** van deze pagina's heeft bestaande "welcome"- of "first-visit"-logica. Wel:
- discover.html:1390-1393 — `ww_banner_dismissed` (Worldwide-banner dismiss)
- school-dashboard.html — `internly_push_asked` banner
- about.html:953-966 — `internly_waitlist_seen` (publieke pagina, niet protected)

---

## INJECTION STRATEGY

### Aanbevolen optie: **Optie 2 — overlay op dashboard met sessionStorage flag**

**Motivering**: De bestaande routing is volledig afgehandeld via `resolveStudentDashboard()` + `getRoleLanding()` met BBL/international forks die NIET makkelijk centraal te onderscheppen zijn (bbl-mode/intl-mode beslissingen zijn al genomen voor de redirect plaatsvindt). Een welkom-injectie ná de redirect heeft 0 risico op routing-breuken: elk dashboard heeft al zijn eigen auth- en role-guard, het welkom-element is een UI-overlay die na een sessionStorage-check wordt getoond.

| Optie | Risico | Reden |
|---|---|---|
| 1: auth.html → welkom.html → dashboard | HOOG | Vereist dat welkom.html ALLE BBL/intl/role-forks dupliceert; redirect-loop risico bij inactieve session; race-conditions met setTimeout(1000) op auth.html:996 |
| 2: dashboard-overlay met `internly_welcomed_<uid>` flag | **0** | Dashboard auth-guard blijft autoritatief; overlay is post-render; één flag per user |
| 3: welkom.html als landing met dynamische role-load | MIDDEL | Verdubbelt logica van resolveStudentDashboard; vereist update van auth.html op 4 plaatsen |

### B) Kan welkom.html veilig de role lezen?
**JA** — `db.auth.getUser()` returnt de actieve session zonder mutaties. `db.from('profiles').select('role')` is RLS-bounded op `id = user.id`. Pattern is identiek aan elke huidige dashboard. Voorwaarde: laad `js/utils.js`, `js/roles.js`, `js/supabase.js` in die volgorde (CLAUDE.md §Laadvolgorde).

### C) Redirect-loop risico
**NEE** — als welkom.html alleen een UI-overlay is (Optie 2). **JA** als Optie 1 gekozen wordt en welkom.html een eigen auth-guard heeft die naar auth.html stuurt: gebruiker komt terug op welkom.html → opnieuw naar auth.html. Mitigatie bij Optie 1: welkom.html mag op !user enkel direct doorsturen naar `index.html` (publieke landing), niet naar auth.html.

### D) Veilige storage-key
**Aanbeveling**: `internly_welcomed_<userId>` in `localStorage` (persistent — anders zien gebruikers het bij elke browser-restart).

Geen collision met bestaande keys (zie hieronder). Patroon volgt al gebruikte conventie (`internly_buddy_optin_<id>`, `internly_renewal_<id>`, `internly_student_postcode_<id>`).

---

## BESTAANDE STORAGE KEYS

### localStorage (17 unique)
```
buddy_anon_<id>
buddy_paused_<id>
internly_bbl_bedrijf_<id>
internly_bbl_reflectie_draft_<id>
internly_bbl_reflecties_<id>
internly_buddy_optin_<id>
internly_demo_profiles
internly_lang
internly_ld_<id>
internly_ld_toelichting_<id>
internly_push_asked
internly_referral_dismissed
internly_renewal_<id>
internly_saved_vacatures
internly_show_vacatures
internly_student_postcode_<id>
internly_waitlist_seen
```

### sessionStorage (6 unique)
```
bblView
internly_applying
internly_esg_export_data
internly_role
internly_trust_calculated_<id>
ww_banner_dismissed
```

**Geen collision** met `internly_welcomed_<userId>`. ✓

---

## VARIABELENAMEN IN AUTH.HTML

| Concept | Variabele |
|---|---|
| user.id | `data.user.id` (login flow); `user.id` (post-login flow regel 1265) |
| naam (signup) | `naam` (regel 1042) |
| role | `role` (lokaal); DB-bron `profile.role` (regel 929-934) |
| sessionStorage role | `'internly_role'` (regel 936) |
| selectedRole | `selectedRole` (signup, regel 1042, 1066) |

---

## ROLE ISOLATION

### A) Bedrijf user navigeert direct naar welkom.html
**SAFE** als welkom.html role uit DB leest (`profiles.role` via `db.auth.getUser()` → `db.from('profiles')`). RLS-bounded SELECT (`.eq('id', user.id)`) garandeert dat geen ander rol-record geretourneerd wordt.

### B) URL-param manipulatie risico
**SAFE als geen `?role=X` URL-param** gebruikt wordt. Aanbeveling: lees role ALLEEN uit DB. Welkom-content kies-logica mag NIET sessionStorage of URL-param vertrouwen.

### C) Toegang zonder login
Welkom.html moet zijn eigen auth-guard hebben. Als `!user`: redirect naar `index.html` (publieke landing, géén auth.html — voorkomt loop).

---

## VEILIGE IMPLEMENTATIE — STAP-VOOR-STAP

**Optie 2 (overlay):**

1. **Maak `welcome-overlay.js`** — exporteert één functie `maybeShowWelcomeOverlay(userId, role, naam)`:
   ```js
   if (localStorage.getItem('internly_welcomed_' + userId)) return;
   // render full-screen overlay met role-specifieke welcome-content
   // op overlay-close: localStorage.setItem('internly_welcomed_' + userId, '1')
   ```

2. **Voeg in elke landing page** ná auth+role check één call toe:
   ```js
   if (typeof maybeShowWelcomeOverlay === 'function') {
     maybeShowWelcomeOverlay(user.id, role, profile.naam);
   }
   ```
   Locaties:
   - discover.html — na regel 1400 (`renderStudentHeader`)
   - bbl-hub.html — na regel 2499 (na role-check)
   - company-dashboard.html — na regel 3372 (na role-check)
   - school-dashboard.html — na regel 2503 (na role-check)
   - begeleider-dashboard.html — na regel 1227
   - buddy-dashboard.html — na regel 1003
   - international-student-dashboard.html — na regel 1077
   - match-dashboard.html — na auth-guard
   - bbl-profile.html — na role-check
   - student-profile.html — na role-check (regel 1587 e.v.)

3. **Welkom-content opties**: 5 variantjes — student-bol, student-bbl, student-intl, bedrijf, school+begeleider+buddy (eventueel verder splitsen). Lees `role` uit `profiles`, lees `bbl_mode`/`student_type` uit `student_profiles` indien role==='student'.

4. **Geen wijzigingen aan auth.html, js/roles.js, js/utils.js nodig** — bestaande routing intact.

5. **Test-matrix**:
   - Eerste login na signup elke rol → overlay verschijnt
   - Tweede login → overlay verschijnt NIET
   - Andere browser/device (localStorage leeg) → overlay verschijnt opnieuw (acceptabel, want welkom is informatief)
   - Bedrijf logt in → bedrijf-overlay (nooit student-overlay)

### Welke alternatieve aanpak (Optie 1) als de business toch volledig nieuwe pagina wil
Indien echte `welkom.html` als pre-dashboard pagina vereist:
1. Voeg in auth.html:996 een check toe: `if (!localStorage.getItem('internly_welcomed_' + data.user.id)) { window.location.href = 'welkom.html'; return; }`
2. Bouw welkom.html met:
   - Eigen auth-guard (redirect naar `index.html` op !user, NOOIT naar auth.html)
   - Lees `profile.role` uit DB
   - Toon role-specifieke content
   - "Doorgaan" knop: `localStorage.setItem('internly_welcomed_' + user.id, '1'); window.location.href = getRoleLanding(role) || resolveStudentDashboard(profile, sp);`
3. Risico: 4 plaatsen waar redirect plaatsvindt (auth.html:983, 988, 992, 994) — overlay-aanpak is veiliger.

**Eindoordeel: Optie 2 is de veiligste keuze.**
