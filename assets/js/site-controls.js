(() => {
  const root = document.documentElement;
  // Let native fragment scrolling handle header spacing and reduced motion.
  root.setAttribute('data-scroll-ignore', '');
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const storageKey = 'blog-theme';
  const modes = ['light', 'dark', 'system'];
  const validChoice = (value) => ['light', 'dark'].includes(value);
  let choice = 'system';
  try {
    const stored = localStorage.getItem(storageKey);
    if (validChoice(stored)) choice = stored;
  } catch (_) {
    // System preference remains available when storage is blocked.
  }

  const applyTheme = () => {
    root.dataset.theme = choice;
    const resolved = choice === 'system'
      ? (media.matches ? 'dark' : 'light') : choice;
    for (const mode of ['light', 'dark']) {
      document.getElementById(`theme-color-${mode}`)?.setAttribute(
        'media', mode === resolved ? 'all' : 'not all'
      );
    }
    document.querySelectorAll('source[data-artwork-dark]').forEach((source) => {
      source.media = resolved === 'dark' ? 'all' : 'not all';
    });
    const next = modes[(modes.indexOf(choice) + 1) % modes.length];
    document.querySelectorAll('[data-theme-switch]').forEach((button) => {
      const labels = {
        light: button.dataset.labelLight,
        dark: button.dataset.labelDark,
        system: button.dataset.labelSystem,
      };
      const label = `${button.dataset.currentLabel}: ${labels[choice]}; `
        + `${button.dataset.nextLabel} ${labels[next]}`;
      button.setAttribute('aria-label', label);
      button.title = label;
    });
  };
  applyTheme();
  media.addEventListener('change', applyTheme);
  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    choice = validChoice(event.newValue) ? event.newValue : 'system';
    applyTheme();
  });

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    // The masthead is cached per language; page state stays local.
    document.querySelectorAll('.site-nav .visible-links a').forEach((link) => {
      if (link.pathname === window.location.pathname) {
        link.setAttribute('aria-current', 'page');
      }
    });
    const contents = document.querySelector('[data-toc]');
    if (contents) {
      const wide = window.matchMedia('(min-width: 1280px)');
      const setContents = () => { contents.open = wide.matches; };
      setContents();
      wide.addEventListener('change', setContents);
    }
    document.querySelectorAll('[data-theme-switch]').forEach((button) => {
      button.addEventListener('click', () => {
        choice = modes[(modes.indexOf(choice) + 1) % modes.length];
        try {
          if (choice === 'system') localStorage.removeItem(storageKey);
          else localStorage.setItem(storageKey, choice);
        } catch (_) {
          // The chosen appearance still applies for this page.
        }
        applyTheme();
      });
    });
  });
})();
