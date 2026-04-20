(function () {
  const raw = sessionStorage.getItem('internly_esg_export_data');
  if (!raw) { console.warn('[ESG] Geen export-data in sessionStorage. Preview mode.'); return; }
  let data;
  try { data = JSON.parse(raw); } catch (e) { console.error('[ESG] Kon export-data niet parsen:', e); return; }
  document.querySelectorAll('[data-field]').forEach(el => {
    const path = el.getAttribute('data-field');
    const value = path.split('.').reduce((obj, key) => obj?.[key], data);
    if (value !== undefined && value !== null) { el.textContent = value; }
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { setTimeout(() => window.print(), 300); });
  } else {
    window.addEventListener('load', () => { setTimeout(() => window.print(), 500); });
  }
  window.addEventListener('afterprint', () => { sessionStorage.removeItem('internly_esg_export_data'); });
})();
