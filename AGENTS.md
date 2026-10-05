# Repository Guidelines

## Project Structure

- Root pages: `index.html`, `archive.html`, `404.html`.
- Posts: `_posts/zh/YYYY-MM-DD-title.md` and `_posts/en/YYYY-MM-DD-title.md`.
  English posts explicitly set `locale: en`; Chinese posts use the default.
- Theme: `minimal-mistakes-jekyll` gem; avoid local theme overrides unless needed.
- Language pages: `zh/index.html`, `en/index.html`, `en/archive.html`.
- Data: `_data/languages.yml`, `_data/navigation.yml`, `_data/ui-text.yml`.
- Includes: `_includes/footer.html` keeps the footer minimal.
- Styles: `_sass/_site.scss` and `assets/css/main.scss` contain the local visual layer.
- Assets: `assets/` for favicons, images, and standalone static files.
- GitHub Pages workflow: `.github/workflows/pages.yml`.

## Commands

- Use the Ruby version in `.ruby-version`.
- `make install`: install Ruby dependencies locally.
- `make serve`: run the local Jekyll site.
- `make build`: build the production site.

## Style

Follow `.editorconfig`: UTF-8, LF, two-space indentation, final newline, no
trailing whitespace, and 80-character preferred lines. Keep Markdown front
matter valid YAML. Prefer gem-theme configuration over copying theme internals
into this repository. Keep custom styling in `_sass/_site.scss`.

## Checks

There is no broad unit-test suite. Before submitting changes, run the checks
that match your edit:

- Content/config: `make build`.
- Dependency changes: `make install`, then `make build`.
- Visual or route changes: `make serve`, then inspect affected pages.

## Commits & PRs

Use Conventional Commits: `type(scope): subject`. Preferred types include
`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, and `release`.
Keep subjects lowercase, under 72 characters, and without a period.

PRs should include a short change summary, verification commands, linked issues
when relevant, and screenshots for layout, styling, or image changes.
