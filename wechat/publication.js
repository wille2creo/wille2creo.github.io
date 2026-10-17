// One publication policy for export, clipboard buttons and manual selection.
// The input is never changed; preview-only metadata stays visible in the UI.
export function publicationContent(article, { bodyOnly = false } = {}) {
  const clone = article.cloneNode(true);
  clone.querySelector('.publication-title')?.remove();
  const header = clone.querySelector('.publication-header');
  if (bodyOnly || !header?.textContent.trim()) header?.remove();
  for (const img of clone.querySelectorAll('img[data-publish-src]')) {
    img.setAttribute('src', img.getAttribute('data-publish-src'));
    img.removeAttribute('data-publish-src');
  }
  return clone;
}
