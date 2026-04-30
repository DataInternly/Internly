/* ============================================================
   Internly Kennisbank Module v1.0
   Vereist: utils.js (notify, escapeHtml, formatNLDate), supabase.js (db)
   ============================================================ */

'use strict';

// ── Audience labels ───────────────────────────────────────────────────────────
const KB_AUDIENCE_LABELS = {
  student_bol: 'BOL student',
  student_bbl: 'BBL student',
  bedrijf:     'Bedrijf',
  school:      'School',
  buddy:       'Buddy',
};

function audienceToLabel(a) {
  return KB_AUDIENCE_LABELS[a] || a;
}

// ── fetchPublishedArticles ────────────────────────────────────────────────────
async function fetchPublishedArticles({ audience = null, searchTerm = null } = {}) {
  let query = db
    .from('kb_articles')
    .select('id, slug, title, excerpt, audience, tags, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false });

  if (audience && audience !== 'all') {
    query = query.contains('audience', [audience]);
  }

  if (searchTerm && searchTerm.trim().length >= 2) {
    const term = searchTerm.trim();
    // textSearch op de GIN-index (dutch config)
    query = query.textSearch('title', term, { type: 'websearch', config: 'dutch' });
  }

  const { data, error } = await query;

  if (error) {
    console.error('[kb] fetchPublishedArticles fout:', error);
    notify('Kon artikelen niet laden', false);
    return [];
  }
  return data || [];
}

// ── fetchPublishedArticlesFallback ────────────────────────────────────────────
// Gebruikt ilike als textSearch geen resultaten geeft (te strikte tokenisatie)
async function fetchPublishedArticlesFallback({ audience = null, searchTerm = null } = {}) {
  let query = db
    .from('kb_articles')
    .select('id, slug, title, excerpt, audience, tags, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false });

  if (audience && audience !== 'all') {
    query = query.contains('audience', [audience]);
  }

  if (searchTerm && searchTerm.trim().length >= 2) {
    const term = '%' + searchTerm.trim().replace(/[%_]/g, '') + '%';
    query = query.or(`title.ilike.${term},excerpt.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[kb] fetchPublishedArticlesFallback fout:', error);
    return [];
  }
  return data || [];
}

// ── fetchArticleBySlug ────────────────────────────────────────────────────────
async function fetchArticleBySlug(slug) {
  const { data, error } = await db
    .from('kb_articles')
    .select('id, slug, title, excerpt, body_markdown, audience, tags, external_links, author, published_at')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (error) {
    console.error('[kb] fetchArticleBySlug fout:', error);
    return null;
  }
  return data;
}

// ── fetchRelated ──────────────────────────────────────────────────────────────
async function fetchRelated(currentId, audiences, limit = 3) {
  const { data, error } = await db
    .from('kb_articles')
    .select('id, slug, title, excerpt, audience')
    .eq('published', true)
    .neq('id', currentId)
    .overlaps('audience', audiences)
    .limit(limit);

  if (error) {
    console.error('[kb] fetchRelated fout:', error);
    return [];
  }
  return data || [];
}

// ── renderArticleCard ─────────────────────────────────────────────────────────
function renderArticleCard(article) {
  const audienceLabel = (article.audience || []).map(audienceToLabel).join(', ');
  const tags = (article.tags || []).slice(0, 3);
  const tagsHtml = tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const dateStr = article.published_at ? formatNLDate(article.published_at) : '';

  return `
    <a href="kennisbank-artikel.html?slug=${encodeURIComponent(article.slug)}" class="kb-card">
      <div class="kb-card-audience">${escapeHtml(audienceLabel)}</div>
      <h3 class="kb-card-title">${escapeHtml(article.title)}</h3>
      <p class="kb-card-excerpt">${escapeHtml(article.excerpt)}</p>
      <div class="kb-card-footer">
        <div class="kb-card-tags">${tagsHtml}</div>
        ${dateStr ? `<span class="kb-card-date">${escapeHtml(dateStr)}</span>` : ''}
      </div>
    </a>`;
}

// ── renderArticleGrid ─────────────────────────────────────────────────────────
function renderArticleGrid(articles) {
  const grid     = document.getElementById('kb-articles-grid');
  const emptyEl  = document.getElementById('kb-empty');
  if (!grid) return;

  if (!articles || articles.length === 0) {
    grid.innerHTML = '';
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;
  grid.innerHTML = articles.map(renderArticleCard).join('');
}

// ── loadAndRenderArticles ─────────────────────────────────────────────────────
async function loadAndRenderArticles({ audience = null, searchTerm = null } = {}) {
  const grid = document.getElementById('kb-articles-grid');
  if (grid) grid.innerHTML = '<div class="kb-loading">Artikelen laden…</div>';

  let articles = await fetchPublishedArticles({ audience, searchTerm });

  // Fallback: als textSearch niks geeft maar er wel een zoekterm is
  if (searchTerm && searchTerm.trim().length >= 2 && articles.length === 0) {
    articles = await fetchPublishedArticlesFallback({ audience, searchTerm });
  }

  renderArticleGrid(articles);
}

// ── bindSearchAndFilter ───────────────────────────────────────────────────────
function bindSearchAndFilter() {
  let currentAudience = 'all';
  let currentSearch   = '';
  let debounce        = null;

  const searchInput = document.getElementById('kb-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        currentSearch = e.target.value;
        loadAndRenderArticles({
          audience:   currentAudience === 'all' ? null : currentAudience,
          searchTerm: currentSearch,
        });
      }, 320);
    });
  }

  document.querySelectorAll('#audience-filter .fp').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#audience-filter .fp').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAudience = btn.dataset.audience;
      loadAndRenderArticles({
        audience:   currentAudience === 'all' ? null : currentAudience,
        searchTerm: currentSearch,
      });
    });
  });
}

// ── renderMarkdownSafe ────────────────────────────────────────────────────────
// escapeHtml EERST, daarna regex voor structuur — geen raw HTML injection mogelijk
function renderMarkdownSafe(md) {
  if (!md) return '';

  // 1. Escape alle HTML-speciale tekens in de ruwe markdown
  let html = escapeHtml(md);

  // 2. Headings (na escaping zijn < en > al weg — geen conflicten)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm,   '<h1>$1</h1>');

  // 3. Bold en italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g,     '<em>$1</em>');

  // 4. Links — URL al escaped, maar https:// is veilig na escapeHtml
  // escapeHtml verandert & → &amp; maar laat https:// intact
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // 5. Lijstitems → <li>
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  // Groepeer opeenvolgende <li> in <ul>
  html = html.replace(/(<li>[^]*?<\/li>)(\n<li>[^]*?<\/li>)*/g, (match) => {
    return '<ul>' + match + '</ul>';
  });

  // 6. Paragrafen: blokken gescheiden door lege regels
  html = html.split(/\n{2,}/).map(chunk => {
    const t = chunk.trim();
    if (!t) return '';
    if (/^<(h[1-3]|ul|li|blockquote)/.test(t)) return t;
    // Newlines binnen een paragraaf → <br>
    return '<p>' + t.replace(/\n/g, '<br>') + '</p>';
  }).join('\n');

  return html;
}

// ── loadAndRenderArticle (detail pagina) ─────────────────────────────────────
async function loadAndRenderArticle(slug) {
  const titleEl    = document.getElementById('article-title');
  const bodyEl     = document.getElementById('article-body');
  const excerptEl  = document.getElementById('article-excerpt');
  const audEl      = document.getElementById('audience-tags');
  const authorEl   = document.getElementById('article-author');
  const dateEl     = document.getElementById('article-date');
  const linksEl    = document.getElementById('external-links');
  const relatedEl  = document.getElementById('related-grid');

  if (titleEl) titleEl.textContent = 'Laden…';

  try {
    const article = await fetchArticleBySlug(slug);

    if (!article) {
      if (titleEl) titleEl.textContent = 'Artikel niet gevonden';
      if (bodyEl)  bodyEl.innerHTML    = '<p>Dit artikel bestaat niet of is verwijderd. <a href="kennisbank.html">← Terug naar kennisbank</a></p>';
      return;
    }

    // <title> en <meta description>
    document.title = article.title + ' — Internly Kennisbank';
    const metaDesc = document.getElementById('article-meta-desc');
    if (metaDesc) metaDesc.setAttribute('content', article.excerpt);

    // Canonical
    const canonical = document.getElementById('canonical-link');
    if (canonical) canonical.setAttribute('href', 'https://internly.pro/kennisbank-artikel.html?slug=' + encodeURIComponent(slug));

    // Inhoud vullen
    if (titleEl)   titleEl.textContent   = article.title;
    if (excerptEl) excerptEl.textContent = article.excerpt;
    if (authorEl)  authorEl.textContent  = article.author || 'Internly redactie';
    if (dateEl)    dateEl.textContent    = article.published_at ? formatNLDate(article.published_at) : '';

    if (audEl) {
      audEl.innerHTML = (article.audience || []).map(a =>
        `<span class="tag">${escapeHtml(audienceToLabel(a))}</span>`
      ).join('');
    }

    if (bodyEl) {
      bodyEl.innerHTML = renderMarkdownSafe(article.body_markdown);
    }

    // Externe links
    if (linksEl) {
      const links = Array.isArray(article.external_links) ? article.external_links : [];
      if (links.length > 0) {
        linksEl.innerHTML = '<h4 class="kb-sources-title">Bronnen</h4><ul class="kb-sources-list">' +
          links.map(link =>
            `<li><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a></li>`
          ).join('') + '</ul>';
      }
    }

    // Gerelateerde artikelen
    if (relatedEl) {
      const related = await fetchRelated(article.id, article.audience || []);
      if (related.length > 0) {
        relatedEl.innerHTML = related.map(renderArticleCard).join('');
      } else {
        document.querySelector('.related-articles')?.setAttribute('hidden', '');
      }
    }

  } catch (err) {
    console.error('[kb] loadAndRenderArticle fout:', err);
    if (titleEl) titleEl.textContent = 'Er ging iets mis';
    if (bodyEl)  bodyEl.innerHTML    = '<p>Probeer het opnieuw. <a href="kennisbank.html">← Terug naar kennisbank</a></p>';
  }
}

// ── renderKBHeader ────────────────────────────────────────────────────────────
// Lichtgewicht publieke header voor kennisbank-pagina's
// Werkt voor zowel anonieme bezoekers als ingelogde gebruikers van elke rol
async function renderKBHeader(containerId) {
  const el = typeof containerId === 'string'
    ? (containerId.startsWith('#') ? document.querySelector(containerId) : document.getElementById(containerId))
    : containerId;
  if (!el) return;

  try {
    const { data: { user } } = await db.auth.getUser();

    if (user) {
      const { data: prof } = await db
        .from('profiles')
        .select('role, naam')
        .eq('id', user.id)
        .maybeSingle();

      const role = prof?.role || '';
      const dashHref = {
        bedrijf:       'company-dashboard.html',
        school:        'school-dashboard.html',
        begeleider:    'begeleider-dashboard.html',
        gepensioneerd: 'buddy-dashboard.html',
      }[role] || 'discover.html';

      el.innerHTML = `
        <header class="kb-topbar">
          <a href="index.html" class="kb-logo">intern<span>ly</span></a>
          <nav class="kb-nav">
            <a href="kennisbank.html">Kennisbank</a>
          </nav>
          <div class="kb-header-actions">
            <a href="${escapeHtml(dashHref)}" class="kb-btn-secondary">← Dashboard</a>
            <button class="kb-btn-secondary" onclick="performLogout()">Uitloggen</button>
          </div>
        </header>`;
    } else {
      el.innerHTML = `
        <header class="kb-topbar">
          <a href="index.html" class="kb-logo">intern<span>ly</span></a>
          <nav class="kb-nav">
            <a href="kennisbank.html">Kennisbank</a>
          </nav>
          <div class="kb-header-actions">
            <a href="auth.html" class="kb-btn-secondary">Inloggen</a>
            <a href="auth.html?mode=signup" class="kb-btn-primary">Aanmelden</a>
          </div>
        </header>`;
    }
  } catch (err) {
    console.error('[kb] renderKBHeader fout:', err);
    el.innerHTML = `
      <header class="kb-topbar">
        <a href="index.html" class="kb-logo">intern<span>ly</span></a>
        <div class="kb-header-actions">
          <a href="auth.html" class="kb-btn-secondary">Inloggen</a>
        </div>
      </header>`;
  }
}

// ── Globals ───────────────────────────────────────────────────────────────────
window.loadAndRenderArticles  = loadAndRenderArticles;
window.loadAndRenderArticle   = loadAndRenderArticle;
window.bindSearchAndFilter    = bindSearchAndFilter;
window.renderKBHeader         = renderKBHeader;
window.renderMarkdownSafe     = renderMarkdownSafe;
