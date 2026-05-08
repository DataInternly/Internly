# TODO — AccountModule rol-aware refactor

**Aangemaakt** 2026-05-03
**Trigger** TQ-check Fase D (CC FIX PLAN — Internly Bedrijf-rol Audit), na bevinding A.1
**Status** Open — gekoppeld aan FTP-05 root cause

---

## Achtergrond

`js/account.js` (AccountModule) is in april 2026 ontworpen als "gedeelde account settings module voor alle Internly rollen" (regel 2 file-comment). Het rendert dezelfde HTML-structuur (Contactgegevens / Abonnement / Factuurhistorie / Account verwijderen) ongeacht de rol.

## Bevinding uit Fase A.1

AccountModule **leest niet** de huidige rol bij rendering. `renderAccountScreen(containerId, lang)` neemt alleen taal, geen rol. Plan-labels zijn rol-impliciet (company_pro, school_premium, begeleider_starter), maar de UI toont al die plan-namen ongeacht of de huidige user bedrijf, school of begeleider is.

## Symptomen / risico's

1. **Verwarring**: bedrijf opent Account-tab en ziet "School Premium — €249/jaar" als optie in een lijst (niet getoond, want alleen huidige plan rendert) — niet kritiek nu, wel als plan-changer modaal komt
2. **Rol-context-verlies in handlers**: `handleSaveContact` slaat alleen profiles-rij op (rol-agnostisch), maar als toekomstige tab rol-specifieke velden krijgt (bv. bedrijf KVK, school accreditatie-nummer), dan moet de module weten welke rol actief is
3. **Geen guard tegen verkeerde rol**: theoretisch kan een student via developer tools `AccountModule.renderAccountScreen()` aanroepen op een bedrijf-pagina; de module rendert simpelweg wat in de DB staat zonder rol-check
4. **Navigatie-context ontbreekt**: na "Wijzigingen opslaan" blijft de gebruiker in account-tab. Voor sommige rollen (bv. bedrijf) zou een "Terug naar Dashboard"-link in de account-section logischer zijn dan voor anderen — maar er is geen rol-aware terugnavigatie

## Voorgestelde refactor

### 1. Voeg `role` parameter toe aan `renderAccountScreen`

```js
async function renderAccountScreen(containerId, lang = 'nl', role = null) {
  // ...
  // Pass role door naar renderers
  el.innerHTML =
    renderContactForm(contact, lang, role) +
    renderSubscriptionSection(sub, lang, role) +
    ...
}
```

### 2. Rol-specifieke plan-filtering in `renderSubscriptionSection`

Toon alleen plans relevant voor de actieve rol:
- `bedrijf` → company_pro, company_business
- `school` → school_premium, school_premium_monthly
- `begeleider` → begeleider_starter, begeleider_pro
- `student` → free (no upsell)
- `gepensioneerd` → free

### 3. Rol-specifieke teruglink + helpteksten

Bedrijf: "Vragen? Bekijk de [Pricing-pagina voor bedrijven](pricing.html#bedrijf)"
School: idem voor school
Etc.

### 4. Caller updates

Elke pagina die AccountModule aanroept moet de huidige rol meegeven:
```js
// company-dashboard.html
AccountModule.renderAccountScreen('account-container', 'nl', 'bedrijf');

// school-dashboard.html
AccountModule.renderAccountScreen('account-container', 'nl', 'school');

// etc.
```

## Relatie tot FTP-05

**Belangrijk**: Fase A.1 vond GEEN redirect-logica in AccountModule die FTP-05 verklaart. De FTP-walkthrough rapporteerde dat bedrijf "bij studenten landt" — dit is mogelijk:

- (a) Een visuele perceptie omdat AccountModule generieke rol-agnostische tekst toont (niet feitelijk een student-pagina)
- (b) Een redirect veroorzaakt door `smartHomeRedirect()` in `js/utils.js` (NIET door AccountModule)
- (c) De wrong-role guard op company-dashboard.html:3408-3410 die per ongeluk triggert

Deze refactor lost (a) op (rol-context maakt UI duidelijker dat je bij bedrijf bent). Voor (b) en (c) is aparte audit van `smartHomeRedirect()` nodig.

## Effort
- Refactor: M (~2-3 uur)
- Caller-updates: S
- Tests: S (manual: log in als elke rol, open Account-tab, verifieer rol-relevante content)

## Afhankelijkheden
- Geen blockers
- Kan parallel met andere refactors

## Niet doen
TBD — Barry te bevestigen

## Wanneer
- Niet urgent. Fase D (FTP-05 patch) gebeurt eerst als atomic guard-fix
- Deze refactor is voor Q3 als plan-changer-flow (Mollie integratie) live gaat

---

**Logged door** CC Sessie 2026-05-03 Fase A.1
**Reviewer** TQ — flagged dat AccountModule "altijd vanuit student is geschreven" en op lange termijn fundamenteel rol-aware moet worden
**Reviewer** Hal — als deze refactor komt, behoud `try/catch` + `notify()` + `console.error()` patroon (P5 build-regel)
