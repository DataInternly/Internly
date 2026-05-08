# TODO — Public footer refactor (Backlog #8)

**Aangemaakt** 2026-05-03
**Trigger** TQ-check Fase B (CC FIX PLAN — Internly Bedrijf-rol Audit)
**Status** Open — niet ingepland

---

## Probleem

Publieke pagina's renderen voettekst inline per-pagina. Inconsistenties bevestigd:

- [index.html:1796-1815](index.html#L1796-L1815): canonical voettekst — 14 links inclusief Blog + Kennisbank
- [pricing.html:754-775](pricing.html#L754-L775): had Kennisbank, **Blog ontbrak** (atomic gefixt 2026-05-03 in Sessie B.1) — voetstructuur is een gedeeltelijke kopie van index.html maar mist `kb-shared-footer` HTML-structuur
- [about.html:855-872](about.html#L855-L872): **Kennisbank ontbrak** (atomic gefixt 2026-05-03 in Sessie B.2). Heeft fundamenteel andere structuur — `<div class="footer-links">` met `<a>` ipv `<ul>` — én Blog wijst naar **externe URL** (`https://internly.pro/blog`) terwijl alle andere pagina's naar `blog.html` wijzen
- [blog.html](blog.html): heeft eigen blog-specifieke nav-structuur
- [kennisbank.html](kennisbank.html), [kennisbank-artikel.html](kennisbank-artikel.html): mogelijk eigen pattern
- International-* pagina's: niet geverifieerd in scope FTP-walkthrough

## Symptomen

1. Mismatched link-sets per pagina (about mist Kennisbank, pricing miste Blog)
2. Mismatched URL-targets (about Blog → externe URL, andere → blog.html)
3. Mismatched HTML-structuur (`<ul>` vs `<a>`, `kb-shared-footer` class vs naked `<footer>`)
4. Geen single source of truth voor footer-volgorde, link-tekst, of vertaling

## Voorgestelde refactor

### 1. Definieer `renderPublicFooter(opts)` in `js/info.js`

```js
function renderPublicFooter(containerId = 'public-footer', opts = {}) {
  // opts: { variant: 'full' | 'minimal', currentPage: 'pricing' }
  // Genereert canonical footer-HTML met
  // - Brand
  // - Link-list (volgorde van index.html canon)
  // - Copy + tagline
}
```

### 2. Migreer alle publieke pagina's

Vervang inline `<footer>` door `<div id="public-footer"></div>` + `<script>renderPublicFooter()</script>`.

Pagina's te migreren:
- index.html
- about.html (incl. URL-fix Blog → blog.html)
- pricing.html
- faq.html
- hoe-het-werkt.html
- spelregels.html
- privacybeleid.html
- algemene-voorwaarden.html
- cookiebeleid.html
- kennisbank.html
- kennisbank-artikel.html
- blog.html (mogelijk variant met blog-specifieke pre-footer-CTA)
- internly-worldwide.html
- esg-rapportage.html
- 404.html
- pricing.html (FTP-06 atomic ondertussen gefixt)

### 3. Tests
- Verificatie dat elke publieke pagina exact dezelfde link-set heeft
- Cross-page navigation test: van elke publieke pagina kun je naar elke andere komen via footer

## Effort
- Ontwerp + functie: M (~2 uur)
- Migratie 16 pagina's: L (~4-6 uur)
- Verificatie: S

## Afhankelijkheden
- Geen blockers
- Kan parallel met Fase C (renderGreetingHero) — andere file (info.js vs utils.js)

## Niet doen
- Geen footer voor app-pagina's (dashboards) in dit refactor — die hebben eigen footer-needs (klein, "© 2026 Sasubo Holding B.V.")

## Trigger om te bouwen
TBD — Barry te bevestigen

---

**Logged door** CC Sessie 2026-05-03 Fase B
**Reviewer** TQ — flagged dat atomic-fixes B.1 + B.2 niet als finale oplossing moeten worden gezien
