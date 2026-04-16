// Google Translate Widget — language preference persists via cookie
// Loaded by: auth.html, discover.html, matches.html, mijn-sollicitaties.html, company-discover.html
(function () {
  const el = document.createElement('div');
  el.id = 'google_translate_element';
  el.style.display = 'none';
  document.body.appendChild(el);
})();

function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'nl',
    includedLanguages: 'nl,en,de,fr',
    layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
    autoDisplay: false
  }, 'google_translate_element');
}

function switchLang(lang) {
  const select = document.querySelector('.goog-te-combo');
  if (select) {
    select.value = lang;
    select.dispatchEvent(new Event('change'));
  }
  localStorage.setItem('internly_lang', lang);
  document.querySelectorAll('.lang-btn').forEach(function (b) {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
}

window.addEventListener('load', function () {
  const saved = localStorage.getItem('internly_lang') || 'nl';
  document.querySelectorAll('.lang-btn').forEach(function (b) {
    b.classList.toggle('active', b.dataset.lang === saved);
  });
  if (saved && saved !== 'nl') {
    setTimeout(function () { switchLang(saved); }, 1500);
  }
});

(function () {
  const s = document.createElement('script');
  s.defer = true;
  s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.head.appendChild(s);
})();
