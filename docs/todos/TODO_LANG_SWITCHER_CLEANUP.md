# TODO — Lang-switcher cleanup

## Context
2026-05-04. NL/EN/FR knoppen staan in de topbar van company-dashboard
(en mogelijk meer pagina's, niet bevestigd). Roepen `switchLang()` aan
maar functie werkt niet — bevestigd door Barry tijdens fix-pass.
Halve implementatie van een i18n-feature die geparkeerd is voor
post-livetest.

## Wat
Wanneer DeepL-integratie wordt opgepakt:
- Bevestig welke pagina's deze knoppen hebben
  (grep op `switchLang` of `class="lang-btn"`)
- Beslis: knoppen activeren met werkende `switchLang` via DeepL,
  of knoppen verwijderen tot i18n echt af is

## Niet doen
- Geen losse fix nu. Verbreedt scope tijdens fix-pass van 2026-05-04.
- Hoort bij brede i18n-sessie samen met DeepL-integratie.

## Trigger om te bouwen
Wanneer Barry DeepL-account werkend heeft en i18n-architectuur
implementeert (memory: `js/i18n.js` + `locales/nl.json` +
`locales/en.json` plus `data-i18n` attributen).
