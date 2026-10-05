(() => {
  const input = document.getElementById('search');
  if (!input) return;

  const results = document.getElementById('results');
  const status = document.getElementById('search-status');
  const normalize = (text) => text.toLowerCase();
  let indexPromise;
  let revision = 0;

  const toggle = document.querySelector('.search__toggle');
  const panel = document.querySelector('.search-content');
  toggle.setAttribute('aria-expanded', 'false');
  new MutationObserver(() => {
    const open = panel.classList.contains('is--visible');
    toggle.setAttribute('aria-expanded', String(open));
    if (!open) toggle.focus();
  }).observe(panel, { attributes: true, attributeFilter: ['class'] });

  input.form.addEventListener('submit', (event) => event.preventDefault());

  function decodeText(text) {
    const decoder = document.createElement('textarea');
    decoder.innerHTML = text;
    return decoder.value;
  }

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(input.dataset.index)
        .then((response) => {
          if (!response.ok) throw new Error('Search index unavailable');
          return response.json();
        })
        .then((posts) => posts
          .filter((post) => post.locale === input.dataset.locale)
          .map((post) => {
            const text = decodeText(post.text);
            return {
              ...post,
              text,
              titleKey: normalize(post.title),
              textKey: normalize(text),
            };
          }))
        .catch((error) => {
          indexPromise = undefined;
          throw error;
        });
    }
    return indexPromise;
  }

  input.addEventListener('input', async () => {
    const currentRevision = ++revision;
    const terms = normalize(input.value).trim().split(/\s+/).filter(Boolean);
    results.replaceChildren();
    status.textContent = '';
    if (!terms.length) return;

    status.textContent = input.dataset.loading;
    try {
      const posts = await loadIndex();
      if (currentRevision !== revision) return;

      const titleHits = (post) => terms.filter((term) =>
        post.titleKey.includes(term)).length;
      const matches = posts
        .filter((post) => terms.every((term) =>
          post.titleKey.includes(term) || post.textKey.includes(term)))
        .sort((a, b) => titleHits(b) - titleHits(a));
      status.textContent = `${matches.length} ${input.dataset.count}`;
      const fragment = document.createDocumentFragment();
      for (const post of matches) {
        const article = document.createElement('article');
        article.className = 'archive__item';
        const heading = document.createElement('h2');
        heading.className = 'archive__item-title';
        const link = document.createElement('a');
        link.href = post.url;
        link.textContent = post.title;
        heading.append(link);
        const excerpt = document.createElement('p');
        excerpt.className = 'archive__item-excerpt';
        const position = post.textKey.indexOf(terms[0]);
        const start = Math.max(0, position - 45);
        excerpt.textContent = (start > 0 ? '…' : '')
          + post.text.slice(start, start + 180)
          + (post.text.length > start + 180 ? '…' : '');
        article.append(heading, excerpt);
        fragment.append(article);
      }
      results.append(fragment);
    } catch {
      if (currentRevision === revision) {
        status.textContent = input.dataset.error;
      }
    }
  });
})();
