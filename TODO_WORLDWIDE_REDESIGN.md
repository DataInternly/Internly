# TODO — internly-worldwide.html visueel redesign

## Context
FTP-walkthrough 2026-05-03 (Barry voice-to-text). De Worldwide-pagina
voelt niet als deel van de Internly-merkfamilie. Te veel blauw,
geen visuele binding met internationaal-thema, geen aansluiting bij
het groene merk.

## Wat te veranderen

### 1. Hero / openingsvisual
- Groen globe-silhouet als hero-visual (subtiel, niet hard outline)
- Tint: `var(--green)` of donkerdere variant — consistent met
  brand-palette
- Niet realistisch, niet 3D — flat illustratief in de stijl van
  bestaande Internly-iconografie

### 2. Stedenkaart met dotted lines
- Vijf stippen voor de vijf steden die Worldwide ondersteunt
  (lijst confirmeren met Barry — vermoedelijk Amsterdam,
  Berlijn, Madrid, Stockholm, Dublin)
- Dotted lines tussen de stippen, lichte beweging of subtiele
  hover-state
- Geen wereldkaart-foto, geen Google Maps — eigen SVG-illustratie
- Past binnen `var(--green)` + `var(--ink)` palette

### 3. Blauw terugdringen
- Huidige Worldwide-pagina gebruikt op meerdere plekken een
  blauwe accent-kleur (vermoedelijk `#2c5dd1` of vergelijkbaar)
  die niet in het Internly-palet voorkomt
- Vervang door `var(--green)` voor primaire accents en
  `var(--ink2)`/`var(--ink3)` voor secundaire elementen
- Behoud oranje accent (`#FF7E42`) voor CTA's — consistent met
  rest van Internly

## Reden
1. Merkconsistentie: Worldwide is geen apart merk, het is een
   Internly-feature voor internationale stages
2. FTP-walkthrough: gebruiker (Barry) ervaart de pagina als
   "visueel los staand" van de rest van het platform
3. Geen functionele bug, wel een conversion-risico — als de pagina
   niet als onderdeel van Internly herkend wordt, daalt vertrouwen

## Waar in code
- [internly-worldwide.html](internly-worldwide.html) — hele pagina
- Inline `<style>` block (huidige aanpak) of nieuwe shared stylesheet
- Mogelijk extractie van color-tokens naar `css/style.css`
  `:root` als die nu hardcoded blauw bevatten

## Niet doen
- Geen content-wijzigingen (FAQ, headlines, copy blijft) — alleen
  visueel
- Geen layout-wijzigingen (kolommen, secties, volgorde) — alleen
  kleurenschema en illustraties
- Geen i18n — pagina blijft Engelstalig
- Geen footer-harmonisatie — die staat al in
  [TODO_FOOTER_REFACTOR.md](TODO_FOOTER_REFACTOR.md)

## Effort
- Globe-illustratie ontwerp: M (designer of AI-asset)
- Stedenkaart SVG: S
- Color-token vervanging in inline styles: S
- QA cross-browser: S

## Afhankelijkheden
- Designer-asset voor globe + stedenkaart, of generative AI met
  goedkeuring Barry
- Bevestiging van de vijf steden-lijst

## Status
Geparkeerd. Niet kritisch voor productie-launch, wel belangrijk
voor merk-perceptie wanneer internationale tak actief wordt
gepromoot.

## Trigger om te bouwen
- Wanneer internationale acquisitie-campagne start
- Of wanneer Worldwide-pagina meer dan X% van publiek verkeer
  trekt (analytics-trigger, nu nog niet meetbaar)
