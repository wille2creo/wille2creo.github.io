(() => {
  const labels = document.currentScript.dataset;
  const content = document.querySelector('.page__content');
  if (!content) return;

  content.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')
    .forEach(heading => {
      const link = document.createElement('a');
      link.className = 'header-link';
      link.href = `#${heading.id}`;
      link.setAttribute('aria-label', labels.permalink);
      link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">'
        + '<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0'
        + 'm2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" /></svg>';
      heading.append(link);
    });

  const contents = document.querySelector('[data-toc]');
  if (contents) {
    const wide = matchMedia('(min-width: 1280px)');
    const setContents = () => { contents.open = wide.matches; };
    setContents();
    wide.addEventListener('change', setContents);
    const links = [...contents.querySelectorAll('a')];
    const headings = links.map(link => document.getElementById(
      decodeURIComponent(link.hash.slice(1))));
    const update = () => {
      const offset = document.querySelector('.masthead').offsetHeight + 24;
      const current = headings.findLast(heading =>
        heading.getBoundingClientRect().top <= offset) ?? headings[0];
      for (const [index, link] of links.entries()) {
        if (headings[index] === current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    };
    let scheduled = false;
    addEventListener('scroll', () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        update();
      });
    }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  const photos = [...content.querySelectorAll('a:has(> img)')]
    .filter(link => /\.(jpe?g|png|gif|webp)$/i.test(new URL(link.href).pathname));
  if (!photos.length) return;
  const viewer = document.createElement('dialog');
  viewer.className = 'image-viewer';
  viewer.setAttribute('aria-label', labels.viewer);
  const image = document.createElement('img');
  const button = (label, text, action) => {
    const control = document.createElement('button');
    control.type = 'button';
    control.setAttribute('aria-label', label);
    control.textContent = text;
    control.addEventListener('click', action);
    viewer.append(control);
    return control;
  };
  let position = 0;
  const show = index => {
    position = (index + photos.length) % photos.length;
    image.src = photos[position].href;
    image.alt = photos[position].querySelector('img').alt;
  };
  button(labels.close, '×', () => viewer.close()).className = 'image-viewer__close';
  if (photos.length > 1) {
    button(labels.previous, '‹', () => show(position - 1)).className = 'image-viewer__previous';
    button(labels.next, '›', () => show(position + 1)).className = 'image-viewer__next';
  }
  viewer.append(image);
  document.body.append(viewer);
  photos.forEach((link, index) => link.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    show(index);
    viewer.showModal();
  }));
  viewer.addEventListener('click', event => {
    if (event.target === viewer) viewer.close();
  });
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') show(position - 1);
    if (event.key === 'ArrowRight') show(position + 1);
  });
  viewer.addEventListener('close', () => image.removeAttribute('src'));
})();
