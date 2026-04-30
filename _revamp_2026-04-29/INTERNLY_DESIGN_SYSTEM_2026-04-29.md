# Internly Design System — site-wide revamp

**Datum** 29 april 2026
**Auteur** Dolly + Polly + De Sensei, met crew-review
**Doel** Eén visuele taal voor alle 18+ pagina's. Geen drift, geen inline-herhaling.

---

## 1. Tokens — single source of truth

Deze tokens horen in `css/style.css` op `:root`. Elke pagina consumeert ze — geen pagina herdefinieert ze.

### Kleur

```css
:root {
  /* Brand primitives */
  --c-green-deep: #0f5c36;
  --c-green: #1a7a48;
  --c-green-glow: #22a85e;
  --c-orange: #FF7E42;
  --c-orange-deep: #e05c1a;
  --c-cream: #f4f3ef;
  --c-cream-warm: #fdfaf6;
  --c-paper: #f6f2e8;
  --c-ink: #0d1520;
  --c-ink-soft: #2a1810;

  /* Semantic */
  --bg-page: var(--c-cream);
  --bg-page-warm: var(--c-cream-warm);   /* chat, kalmere lees-pagina's */
  --bg-surface: #ffffff;
  --bg-surface-elev: #ffffff;
  --bg-dark: var(--c-ink);
  --bg-hero: linear-gradient(148deg, #1e8a52 0%, #1a7a48 42%, #145e38 100%);

  --fg-primary: var(--c-ink);
  --fg-secondary: #2e4038;
  --fg-tertiary: #6b8070;
  --fg-on-dark: #ffffff;
  --fg-on-dark-soft: rgba(255,255,255,.62);

  --accent: var(--c-orange-deep);
  --accent-soft: rgba(224,92,26,.12);
  --accent-glow: rgba(255,126,66,.35);
  --accent-line: #e05c1a;

  --line-subtle: rgba(13,26,16,.09);
  --line-default: rgba(13,26,16,.14);
}
```

### Spacing — 8px scale

```css
:root {
  --s1: 4px;    --s2: 8px;    --s3: 12px;
  --s4: 16px;   --s5: 24px;   --s6: 32px;
  --s7: 48px;   --s8: 64px;   --s9: 96px;
  --s10: 128px;
}
```

**Regel**: nooit een eigen waarde gebruiken (`13px`, `15px`). Altijd een token. Bedward markeert dit als "magic value" tijdens audits.

### Typografie

```css
:root {
  --font-display: 'Bricolage Grotesque', system-ui, sans-serif;
  --font-body: 'Outfit', system-ui, sans-serif;
  --font-mono: 'DM Mono', ui-monospace, monospace;
  --font-script: 'Caveat', cursive;

  --fs-1: clamp(.72rem, 1vw, .76rem);
  --fs-2: clamp(.82rem, 1.2vw, .88rem);
  --fs-3: clamp(.95rem, 1.4vw, 1.05rem);
  --fs-4: clamp(1.15rem, 1.8vw, 1.4rem);
  --fs-5: clamp(1.5rem, 2.4vw, 2rem);
  --fs-6: clamp(2rem, 3.6vw, 3rem);
  --fs-hero: clamp(2.4rem, 5.6vw, 4.4rem);
}
```

**Regels per font:**
- `--font-display` voor h1, h2, h3 en grote cijfers (Bricolage Grotesque, weight 700–800)
- `--font-body` voor alles dat geen kop is (Outfit, weight 400–600)
- `--font-mono` voor citaten-bronnen, tijdstempels, technische labels (DM Mono)
- `--font-script` voor de menselijke laag — kanttekeningen, eyebrow boven quotes, één plek per pagina maximaal (Caveat, weight 600–700)

### Radius en shadow

```css
:root {
  --r-sm: 8px;
  --r-md: 12px;
  --r-lg: 20px;
  --r-pill: 999px;

  --shadow-sm: 0 1px 3px rgba(0,0,0,.06);
  --shadow-md: 0 4px 16px rgba(0,0,0,.08);
  --shadow-lg: 0 18px 40px rgba(0,0,0,.12);
  --shadow-cta: 0 10px 30px var(--accent-glow);
}
```

### Motion

```css
:root {
  --ease: cubic-bezier(.16, 1, .3, 1);
  --t-fast: 120ms;
  --t-base: 220ms;
  --t-slow: 420ms;
}
```

**Regel**: respecteer altijd `@media (prefers-reduced-motion: reduce)`. Animatie is een nice-to-have, nooit een vereiste.

---

## 2. Pagina-archetypes

Niet elke pagina krijgt dezelfde behandeling. Vier archetypes:

| Archetype | Pagina's | Achtergrond | Layout-spine |
|-----------|----------|-------------|--------------|
| **Marketing/info** | index, about, kennisbank, pricing, faq, privacybeleid, spelregels, esg-rapportage | `--bg-page` met subtiele grain (zoals huidige homepage) | Hero → secties → footer |
| **Auth** | auth | `--bg-page-warm` met halftone-dotted overlay | Gecentreerde card (max 480px) |
| **Dashboard** | admin, student-profile, company-dashboard, school-dashboard, bbl-dashboard, bbl-hub, stage-hub, match-dashboard, buddy-dashboard | `--bg-page` | Sidebar (240px) + main content |
| **Lijst/discover** | discover, company-discover, matches, mijn-sollicitaties | `--bg-page` | Toolbar + grid/lijst |
| **Detail** | vacature-detail | `--bg-page-warm` | Topbar + lees-kolom (max 720px) + sticky CTA |
| **Chat** | chat | `--bg-page-warm` met **dotted journal in oranje spectrum** | Sidebar conversaties (280px) + threadview |

---

## 3. Componenten — gedeelde patterns

### Knop primair

```html
<button class="btn btn-primary">Maak een profiel aan →</button>
```

```css
.btn {
  font-family: var(--font-body);
  font-size: var(--fs-3);
  font-weight: 600;
  padding: var(--s3) var(--s5);
  border-radius: var(--r-pill);
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: background var(--t-fast), transform var(--t-fast), box-shadow var(--t-fast);
}
.btn-primary {
  background: var(--accent);
  color: #fff;
  box-shadow: var(--shadow-cta);
}
.btn-primary:hover { background: #c44e15; transform: translateY(-1px); }

.btn-secondary {
  background: transparent;
  color: var(--accent);
  border-color: var(--accent);
}
.btn-secondary:hover { background: var(--accent); color: #fff; }

.btn-ghost {
  background: transparent;
  color: var(--fg-secondary);
}
.btn-ghost:hover { color: var(--fg-primary); }
```

### Card

```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--line-subtle);
  border-radius: var(--r-md);
  padding: var(--s5);
  box-shadow: var(--shadow-sm);
  transition: border-color var(--t-fast), transform var(--t-fast), box-shadow var(--t-fast);
}
.card:hover {
  border-color: var(--line-default);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.card-accent { border-top: 3px solid var(--c-green); }
```

### Input

```css
.input {
  font-family: var(--font-body);
  font-size: var(--fs-3);
  padding: var(--s3) var(--s4);
  border: 1.5px solid #e2e8f0;
  border-radius: var(--r-pill);
  outline: none;
  transition: border-color var(--t-fast);
}
.input:focus { border-color: var(--c-green); }
```

### Caveat-noot — de menselijke laag

Polly's signature. **Eén plek per pagina max.** Plekken in volgorde van voorkeur:
1. Naast de primaire CTA in de hero ("gratis voor studenten")
2. Eyebrow boven de quotes-sectie ("echte stemmen, geen marketing")
3. Een kanttekening in een onverwacht hoekje (footer-tagline, bevestigings-toast)

```css
.caveat {
  font-family: var(--font-script);
  color: var(--accent-line);
  transform: rotate(-2deg);
  display: inline-block;
}
```

---

## 4. Chat-pagina — dotted journal achtergrond

Barry's specifieke verzoek. Onderzoek bevestigt dat een combinatie van een dot-grid (`radial-gradient`) plus een diagonale warm-orange wash (`linear-gradient` of een tweede `radial-gradient`) het journal-gevoel vangt zonder dat het luidruchtig wordt.

```css
body.page-chat {
  background-color: var(--c-cream-warm);
  background-image:
    /* 1. dot grid op 22px ritme */
    radial-gradient(circle, rgba(13, 26, 16, 0.07) 1px, transparent 1px),
    /* 2. warme oranje light-source rechtsboven */
    radial-gradient(ellipse 80% 60% at 90% 8%, rgba(255, 126, 66, 0.10), transparent 60%),
    /* 3. diepere warm-pool linksonder */
    radial-gradient(ellipse 70% 50% at 8% 92%, rgba(224, 92, 26, 0.05), transparent 60%);
  background-size: 22px 22px, 100% 100%, 100% 100%;
  background-attachment: fixed;
}
```

**Regels:**
- Achtergrond zit op `<body>`, NIET op `.chat-thread` of `.message-bubble`
- `background-attachment: fixed` zodat het niet meescroll en het journal-effect intact blijft
- Dot-opacity ≤ 7% — als je het patroon ziet bij een glimp, is het te hard
- Geen achtergrond op `.input-bar` of `.chat-thread` — die houden hun eigen rustig wit

**Performance:** drie gestapelde gradients zijn GPU-vriendelijk en kosten ~0kb. Geen images, geen network requests.

---

## 5. Per-pagina varianten — gradient overlays per archetype

Polly stelt voor: elke archetype krijgt zijn eigen subtiele warmte zodat de pagina-categorie meteen voelt anders zonder dat de brand breekt.

| Pagina | Achtergrond | Reden |
|--------|------------|-------|
| Marketing | `--bg-page` + grain (huidig) | Vertrouwd, levendig |
| Auth | `--bg-page-warm` + zachte dotted hoek | Focus, kalm |
| Dashboard | `--bg-page` plat | Werk-context, geen afleiding |
| Detail | `--bg-page-warm` | Lees-comfort |
| Chat | dotted journal oranje (sectie 4) | Persoonlijk, geschreven |
| Lijst/discover | `--bg-page` plat | Snelle scan |

---

## 6. Veiligheidsregels — non-negotiable per pagina

**Bedward:**
- P1: nooit een `<style>` of `<script>` met inline credentials in `<head>`
- P2: pagina's die geen auth nodig hebben (about, faq, etc) laden geen `js/supabase.js`
- P3: design-tokens worden alleen via CSS gedeclareerd, nooit via inline `style=""` op kritieke componenten

**Hal:**
- P4: design-revamp raakt nooit een ID die door JS wordt aangeroepen — als zo'n ID moet wijzigen voor een component, eerst grep over alle JS-files
- P5: geen typeof-checks die silent een feature uitschakelen — als een dependency mist, log + toast, niet zwijgen
- P6: volgorde van scripts blijft `utils.js → supabase.js → toast.js → telemetry.js → page-specific`

**De Sensei:**
- P7: één gedeeld stylesheet (`css/style.css`) met tokens en componenten. Pagina-specifieke CSS alleen voor pagina-eigen layout, niet voor herdefinitie van tokens
- P8: geen pagina mag meer dan 30 regels eigen `<style>` in `<head>` hebben — als het meer is, hoort het in `style.css` of in een eigen `css/page-name.css`

**7/11:**
- P9: als hetzelfde concept op 2+ pagina's verschijnt (een buddy-card, een trust-badge, een Stagepact-banner), eerst gedeeld component-contract definiëren

---

## 7. Implementatie-volgorde — niet alles tegelijk

Hotch2's prioriteits-matrix:

**Fase A — fundering (1 sessie)**
1. `css/style.css` uitbreiden met alle tokens uit sectie 1
2. Een gedeelde `<header>`-component vaststellen (auth-banner, nav, taal-switcher)
3. Een gedeelde `<footer>`-component vaststellen (links, copyright, contact)

**Fase B — high-traffic pagina's (2 sessies)**
4. `auth.html` → archetype Auth
5. `chat.html` → archetype Chat met dotted journal
6. `discover.html` → archetype Lijst
7. `student-profile.html` → archetype Dashboard

**Fase C — sub-pagina's (1 sessie)**
8. `about.html`, `kennisbank.html`, `pricing.html`, `faq.html` → archetype Marketing
9. `privacybeleid.html`, `spelregels.html`, `esg-rapportage.html` → archetype Marketing

**Fase D — werk-pagina's (2 sessies)**
10. Alle dashboards: admin, company, school, bbl, buddy, match, stage-hub
11. `vacature-detail.html` → archetype Detail
12. `matches.html`, `mijn-sollicitaties.html`, `bbl-hub.html`, `company-discover.html` → archetype Lijst

Per pagina: backup, transformatie via Claude Code blueprint-methode, integriteits-check, smoke-test, FileZilla.

---

## 8. Wat we NIET doen

- Geen rebrand. Kleuren, fonts, logo blijven exact zoals in homepage v2
- Geen JS-frameworks toevoegen. Vanilla blijft vanilla
- Geen build-step toevoegen. Tokens via CSS custom properties, geen Sass/Tailwind/etc
- Geen eigen waarden naast de tokens accepteren. Magic values worden gewist door Bedward in audit
- Geen pagina als "klein detail" behandelen. Privacy-beleid krijgt dezelfde zorg als de homepage
- Geen radicale verandering van layout-grid op werk-pagina's. Studenten en bedrijven zijn gewend aan waar dingen staan — kosmetiek mag, structuur niet
