// Google Translate init callback — called by translate_a/element.js
function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'nl',
    includedLanguages: 'nl,en,de,fr',
    layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
    autoDisplay: false
  }, 'google_translate_element');
}

// Trigger a language switch via the hidden Google Translate combo
function switchLang(lang) {
  var select = document.querySelector('.goog-te-combo');
  if (select) {
    select.value = lang;
    select.dispatchEvent(new Event('change'));
  }
  localStorage.setItem('internly_lang', lang);
  document.querySelectorAll('.lang-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
}

// On load: restore saved language preference and mark active button
window.addEventListener('load', function() {
  var saved = localStorage.getItem('internly_lang') || 'nl';
  document.querySelectorAll('.lang-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.lang === saved);
  });
  if (saved && saved !== 'nl') {
    setTimeout(function() {
      switchLang(saved);
    }, 2000);
  }
});
