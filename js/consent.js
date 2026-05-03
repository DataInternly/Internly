// js/consent.js — Internly Cookie Consent Module
// Wrapt orestbida/cookieconsent v3 voor gebruik op alle Internly-pagina's.
// Categorieën:
//   necessary  — altijd aan (Supabase auth-sessie, localStorage taal/UI)
//   functional — Google Translate (laadt externe Google-scripts)
//   analytics  — Platform-gebruiksdata (intern, geen derden)
//
// Gebruik op elke pagina:
//   <script src="js/consent.js" defer></script>
//   Init na DOMContentLoaded:  window.InternlyConsent.init()
//
// Consent uitlezen elders:
//   window.InternlyConsent.hasConsent('functional') → bool
//   window.InternlyConsent.onAccept('analytics', () => {...})
//
// Banner-knop in footer:
//   <button onclick="window.InternlyConsent && window.InternlyConsent.showPreferences()">
//     Cookie-instellingen
//   </button>

(function () {
  'use strict';

  // ── Configuratie ──────────────────────────────────────────────────────────
  const CC_VERSION = 'v3.0.1';
  const CC_BASE    = 'https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@' + CC_VERSION + '/dist/';
  const CONSENT_REVISION = 1; // verhogen wanneer categorieën wijzigen

  // Pending callbacks per categorie — uitgevoerd zodra consent gegeven wordt.
  const _pending = { necessary: [], functional: [], analytics: [] };
  let _initialized = false;

  // ── Internly-kleuren via CSS-injectie ─────────────────────────────────────
  function _injectInternlyCSS() {
    if (document.getElementById('internly-cc-style')) return;
    const s = document.createElement('style');
    s.id = 'internly-cc-style';
    s.textContent = `
      :root {
        --cc-bg:                          #f4f3ef;
        --cc-primary-color:               #0d1520;
        --cc-secondary-color:             #2e4038;
        --cc-btn-primary-bg:              #e05c1a;
        --cc-btn-primary-color:           #ffffff;
        --cc-btn-primary-hover-bg:        #c14d15;
        --cc-btn-secondary-bg:            transparent;
        --cc-btn-secondary-color:         #0d1520;
        --cc-btn-secondary-border-color:  #0d1520;
        --cc-btn-secondary-hover-bg:      rgba(13,21,32,0.06);
        --cc-toggle-on-bg:                #1a7a48;
        --cc-toggle-off-bg:               #b0b8c0;
        --cc-toggle-readonly-bg:          #d6dadf;
        --cc-separator-bg:                rgba(13,21,32,0.10);
        --cc-cookie-category-block-bg:    #ffffff;
        --cc-cookie-category-block-border:#e8e6df;
        --cc-cookie-category-expanded-block-bg: #faf8f3;
        --cc-overlay-bg:                  rgba(13,21,32,0.55);
        --cc-font-family:                 'Outfit', system-ui, sans-serif;
      }
      #cc-main .cc__div { font-family: 'Outfit', system-ui, sans-serif; }
      #cc-main .pm__title,
      #cc-main .cm__title { font-family: 'Bricolage Grotesque', system-ui, sans-serif; }
    `;
    document.head.appendChild(s);
  }

  // ── Externe library lazy-loaden ───────────────────────────────────────────
  function _loadCCScript() {
    return new Promise((resolve) => {
      if (window.CookieConsent) { resolve(); return; }

      // CSS
      const css = document.createElement('link');
      css.rel  = 'stylesheet';
      css.href = CC_BASE + 'cookieconsent.css';
      document.head.appendChild(css);

      // JS
      const s = document.createElement('script');
      s.src = CC_BASE + 'cookieconsent.umd.js';
      s.onload  = () => resolve();
      s.onerror = () => {
        console.warn('[InternlyConsent] kon cookieconsent library niet laden');
        resolve(); // stil falen — banner verschijnt niet, platform werkt door
      };
      document.head.appendChild(s);
    });
  }

  // ── Pending callbacks afvuren wanneer een categorie geaccepteerd wordt ────
  function _flushPending(category) {
    const queue = _pending[category];
    if (!queue || queue.length === 0) return;
    while (queue.length) {
      const cb = queue.shift();
      try { cb(); }
      catch (e) { console.error('[InternlyConsent] callback fout (' + category + '):', e); }
    }
  }

  // ── Run de banner ─────────────────────────────────────────────────────────
  async function _run() {
    await _loadCCScript();
    if (!window.CookieConsent || typeof window.CookieConsent.run !== 'function') return;

    _injectInternlyCSS();

    window.CookieConsent.run({
      revision: CONSENT_REVISION,
      cookie: {
        name: 'internly_cc',
        expiresAfterDays: 365
      },
      guiOptions: {
        consentModal: {
          layout:        'box',
          position:      'bottom left',
          equalWeightButtons: false,
          flipButtons:   false
        },
        preferencesModal: {
          layout:        'box',
          position:      'right',
          equalWeightButtons: false,
          flipButtons:   false
        }
      },
      categories: {
        necessary:  { enabled: true, readOnly: true },
        functional: {},
        analytics:  {}
      },
      language: {
        default: 'nl',
        autoDetect: 'document',
        translations: {
          nl: {
            consentModal: {
              title:              'Cookies op Internly',
              description:        'We gebruiken noodzakelijke cookies voor inloggen en sessiebeheer. Met jouw toestemming gebruiken we ook functionele cookies (Google Translate) en platform-analytics. Je kunt je keuze altijd later wijzigen.',
              acceptAllBtn:       'Alles accepteren',
              acceptNecessaryBtn: 'Alleen noodzakelijk',
              showPreferencesBtn: 'Instellingen',
              footer:             '<a href="privacybeleid.html">Privacybeleid</a><a href="cookiebeleid.html">Cookiebeleid</a>'
            },
            preferencesModal: {
              title:              'Voorkeuren voor cookies',
              acceptAllBtn:       'Alles accepteren',
              acceptNecessaryBtn: 'Alleen noodzakelijk',
              savePreferencesBtn: 'Mijn keuze opslaan',
              closeIconLabel:     'Sluiten',
              sections: [
                {
                  title:       'Hoe wij cookies gebruiken',
                  description: 'Internly gebruikt cookies om het platform te laten werken en om de ervaring te verbeteren. Hieronder zie je per categorie wat dat betekent. Je kunt zelf kiezen wat je toestaat — alleen noodzakelijke cookies zijn altijd actief omdat het platform anders niet kan functioneren.'
                },
                {
                  title:        'Noodzakelijk',
                  description:  'Vereist voor het functioneren van het platform — inloggen, sessiebeheer en jouw taalvoorkeur. Deze cookies kunnen niet worden uitgeschakeld.',
                  linkedCategory: 'necessary'
                },
                {
                  title:        'Functioneel',
                  description:  'Wordt gebruikt voor Google Translate, zodat de pagina automatisch in jouw voorkeurstaal getoond kan worden. Google kan hierbij pagina-inhoud verwerken om de vertaling te genereren.',
                  linkedCategory: 'functional'
                },
                {
                  title:        'Platform-analytics',
                  description:  'Helpt ons begrijpen hoe het platform gebruikt wordt zodat we het kunnen verbeteren. Gegevens blijven binnen Internly en worden niet met derden gedeeld.',
                  linkedCategory: 'analytics'
                },
                {
                  title:       'Meer informatie',
                  description: 'Voor vragen over ons cookiebeleid, neem contact op via <a href="mailto:hallo@internly.pro">hallo@internly.pro</a>. Lees ons volledige <a href="cookiebeleid.html">cookiebeleid</a> en <a href="privacybeleid.html">privacybeleid</a> voor meer details.'
                }
              ]
            }
          }
        }
      },
      onConsent: function () {
        // Initiële beslissing — vuur callbacks voor elke geaccepteerde categorie
        ['necessary', 'functional', 'analytics'].forEach(function (cat) {
          if (window.CookieConsent.acceptedCategory(cat)) _flushPending(cat);
        });
      },
      onChange: function () {
        // Latere wijziging — vuur callbacks voor categorieën die NU wel zijn geaccepteerd
        ['necessary', 'functional', 'analytics'].forEach(function (cat) {
          if (window.CookieConsent.acceptedCategory(cat)) _flushPending(cat);
        });
      }
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.InternlyConsent = {
    init: function () {
      if (_initialized) return;
      _initialized = true;
      _run().catch(function (e) {
        console.warn('[InternlyConsent] init fout:', e?.message || e);
      });
    },

    hasConsent: function (category) {
      if (!window.CookieConsent || typeof window.CookieConsent.acceptedCategory !== 'function') {
        return false;
      }
      return window.CookieConsent.acceptedCategory(category) === true;
    },

    onAccept: function (category, callback) {
      if (typeof callback !== 'function') return;
      // Als de library al geladen is en consent al gegeven: meteen vuren
      if (window.CookieConsent && typeof window.CookieConsent.acceptedCategory === 'function') {
        if (window.CookieConsent.acceptedCategory(category)) {
          try { callback(); }
          catch (e) { console.error('[InternlyConsent] callback fout:', e); }
          return;
        }
      }
      // Anders: in queue — wordt afgevuurd vanuit onConsent/onChange
      if (_pending[category]) _pending[category].push(callback);
    },

    showPreferences: function () {
      if (window.CookieConsent && typeof window.CookieConsent.showPreferences === 'function') {
        window.CookieConsent.showPreferences();
      }
    },

    // Voor diagnose en debugging
    _getCategoryState: function () {
      if (!window.CookieConsent) return null;
      return {
        necessary:  window.CookieConsent.acceptedCategory('necessary'),
        functional: window.CookieConsent.acceptedCategory('functional'),
        analytics:  window.CookieConsent.acceptedCategory('analytics')
      };
    }
  };

  // Auto-init zodra DOM klaar is — pagina's hoeven niet expliciet te initieren
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.InternlyConsent.init();
    });
  } else {
    window.InternlyConsent.init();
  }
})();
