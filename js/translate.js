// Google Translate Widget — laadt alleen na functional cookie-consent.
// Loaded by: auth.html, discover.html, matches.html, mijn-sollicitaties.html,
// company-discover.html. Taalvoorkeur persist via localStorage.
//
// CC-2: externe Google scripts mogen pas geladen worden nadat de gebruiker
// expliciet 'functional' consent heeft gegeven via InternlyConsent.

(function () {
  'use strict';

  let _translateInitialized = false;

  // ── Public: switchLang blijft altijd beschikbaar ──────────────────────────
  // Als Google Translate (nog) niet geladen is, slaan we alleen de keuze op.
  // Zodra translate later wel laadt, past hij de opgeslagen voorkeur toe.
  window.switchLang = function (lang) {
    localStorage.setItem('internly_lang', lang);
    document.querySelectorAll('.lang-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    const select = document.querySelector('.goog-te-combo');
    if (select) {
      select.value = lang;
      select.dispatchEvent(new Event('change'));
    }
    // Als translate nog niet geladen is en de gebruiker een andere taal kiest,
    // probeer alsnog te initialiseren (functional consent kan implied zijn
    // door de actie). InternlyConsent regelt de daadwerkelijke gating.
    if (!_translateInitialized && lang !== 'nl' && window.InternlyConsent) {
      if (window.InternlyConsent.hasConsent('functional')) _initTranslate();
    }
  };

  // ── Init-callback die Google Translate aanroept ──────────────────────────
  // Moet als window-global beschikbaar zijn vanaf het moment dat het externe
  // script laadt. Definitie altijd beschikbaar; pas effectief wanneer
  // _initTranslate() het externe script geladen heeft.
  window.googleTranslateElementInit = function () {
    if (!window.google || !window.google.translate || !window.google.translate.TranslateElement) return;
    new window.google.translate.TranslateElement({
      pageLanguage: 'nl',
      includedLanguages: 'nl,en,de,fr',
      layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
      autoDisplay: false
    }, 'google_translate_element');
  };

  // ── Privé: laad Google Translate widget ──────────────────────────────────
  function _initTranslate() {
    if (_translateInitialized) return;
    _translateInitialized = true;

    // Hidden host-div voor de widget
    if (!document.getElementById('google_translate_element')) {
      const el = document.createElement('div');
      el.id = 'google_translate_element';
      el.style.display = 'none';
      document.body.appendChild(el);
    }

    // Externe Google script
    const s = document.createElement('script');
    s.defer = true;
    s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.head.appendChild(s);

    // Pas opgeslagen taalvoorkeur toe zodra de widget aanwezig is
    const saved = localStorage.getItem('internly_lang') || 'nl';
    document.querySelectorAll('.lang-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.lang === saved);
    });
    if (saved && saved !== 'nl') {
      setTimeout(function () { window.switchLang(saved); }, 1500);
    }
  }

  // ── Lang-knoppen markeren ook zonder consent ─────────────────────────────
  // Zodat de UI niet kapot oogt: highlight de actieve knop op basis van
  // localStorage, ook als de externe widget (nog) niet geladen is.
  function _paintActiveLangButton() {
    const saved = localStorage.getItem('internly_lang') || 'nl';
    document.querySelectorAll('.lang-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.lang === saved);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _paintActiveLangButton);
  } else {
    _paintActiveLangButton();
  }

  // ── Consent-gate ─────────────────────────────────────────────────────────
  // Als InternlyConsent niet beschikbaar is: stil falen (geen translate = OK).
  // Als wel beschikbaar: laad direct als consent al gegeven, anders wachten.
  function _wireConsent() {
    if (!window.InternlyConsent) return;
    if (window.InternlyConsent.hasConsent('functional')) {
      _initTranslate();
    } else {
      window.InternlyConsent.onAccept('functional', _initTranslate);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _wireConsent);
  } else {
    _wireConsent();
  }
})();
