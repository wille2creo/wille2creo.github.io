# Repository Guidelines

## Project Structure

- Root pages: `index.html`, `archive.html`, `404.html`.
- Posts: `_posts/zh/YYYY-MM-DD-title.md` and `_posts/en/YYYY-MM-DD-title.md`.
  English posts explicitly set `locale: en`; Chinese posts use the default.
- Templates: `_layouts/` and `_includes/`; the site has no external theme.
- Language pages: `zh/index.html`, `en/index.html`, `en/archive.html`.
- Data: `_data/languages.yml`, `_data/navigation.yml`, `_data/ui-text.yml`.
- Contents: `_plugins/contents.rb` builds navigation from rendered headings.
- Styles: `_sass/_site.scss` and `assets/css/main.scss` contain the local visual layer.
- Assets: `assets/` for favicons, images, and standalone static files.
- GitHub Pages workflow: `.github/workflows/pages.yml`.

## Commands

- Use the Ruby version in `.ruby-version`.
- `make install`: install Ruby dependencies locally.
- `make serve`: run the local Jekyll site.
- `make build`: build the production site.
- `make check`: build and run site and publisher checks (requires Node).
- `npm run test:browser`: inspect the built site with Chromium. Install it with
  `npx playwright install chromium`; use the Node version in `.node-version`.

## Style

Follow `.editorconfig`: UTF-8, LF, two-space indentation, final newline, no
trailing whitespace, and 80-character preferred lines. Keep Markdown front
matter valid YAML. Keep shared components in `_includes/` and styling in the
Sass modules under `_sass/site/`, forwarded by `_sass/_site.scss`.

## Checks

Before submitting changes, run the checks that match your edit:

- Content/config: `make build`.
- Dependency changes: `make install`, then `make build`.
- Visual or route changes: `make check`, then `npm run test:browser` and inspect
  affected pages with `make serve` when needed.
- Publisher changes: `npm run wechat:test`.

Generated-site contracts live in `test/`, publisher regressions in
`wechat/test/`, and browser checks in `test/browser/`. Keep screenshots and
temporary artifacts outside the repository; `BROWSER_ARTIFACTS` sets their
destination. CI gates deployment on the Jekyll build and validation jobs.

## Commits

Use Conventional Commits: `type(scope): subject`. Preferred types include
`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, and `release`.
Keep subjects lowercase, under 72 characters, and without a period.
