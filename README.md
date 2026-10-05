# wille2creo.github.io

Personal Jekyll site published at <https://wille2creo.github.io>.

## Structure

- `_posts/zh/` and `_posts/en/`: posts grouped by language, using
  `YYYY-MM-DD-title.md` filenames.
- `_data/navigation.yml`: navigation for each language.
- `_data/languages.yml`: brands, home links, introductions, and language labels.
- `_data/ui-text.yml`: translated interface and accessibility labels.
- `_includes/footer.html`: minimal footer override.
- `_sass/_site.scss`: local visual entry point for focused Sass partials in
  `_sass/site/`.
- `assets/css/main.scss`: theme stylesheet entry point plus local styles.
- `assets/`: favicons, fonts, browser scripts, and static assets.
- `/`: language selector; `zh/` and `en/`: language home pages.
- `.github/workflows/pages.yml`: build, check, and deploy GitHub Pages.

## Development

Install the Ruby version in `.ruby-version` and use GNU Make:

```sh
make install
make serve
```

Build for production with `make build`. Local development and GitHub Actions
use these same commands; Node.js and npm are not required.

## Notes

This site uses the `minimal-mistakes-jekyll` gem theme with a small editorial
style layer split across `_sass/site/`. Keep local overrides narrow and note
the upstream theme version in copied includes so theme updates remain
straightforward. The local SEO include keeps titles, descriptions, canonical
links, Open Graph metadata, publication dates, and the root schema.

GitHub Pages is deployed through Actions so the site can use third-party
gem-packaged themes.

## Languages

The root `/` is a language selector. The Chinese home is `/zh/`; the English
home is `/en/`. Both use the same visual styles and seal, with separate brands
and introductory text. The language switch shows the current
`中` or `EN` and opens the other home when clicked, including on a post.

Put Chinese posts in `_posts/zh/` and English posts in `_posts/en/`. Posts
default to `locale: zh-CN`; add `locale: en` to every English post. The folder
organizes the source files, while `locale` controls language-specific behavior.
Home pagination, archives, and previous/next links stay within that locale.
Existing post URLs are preserved. Translations are ordinary,
independent posts with no pairing or automatic translation.

Set each post's summary with `excerpt` in its YAML front matter. Keep summary
text separate from the body; do not use `<!--more-->` markers or add an opening
blockquote solely for the summary. Empty posts use `excerpt: ""`.
Prefer excerpts without full stops; omit terminal periods and use commas or
semicolons between clauses where appropriate.

Use plain text or Unicode for simple mathematical symbols. Posts that need
mathematical typesetting set `mathjax: true` in front matter; only those pages
load MathJax from jsDelivr. Write math as `$$...$$`: Kramdown distinguishes
inline math within a paragraph from display math on its own line. The MathJax
configuration includes the `cancel` extension for barred-subject notation.

The About and Reading pages live in `zh/about.md`, `zh/now.md`, `en/about.md`,
and `en/now.md`. Reading lists use yearly Markdown sections; update their
visible date when changing entries. The Chinese list keeps the full record.
The English list selects foreign works, Chinese classics, and established
modern Chinese works with published or recognized English titles. Preserve
the earliest reading year for each book and the relative order within each
year; omit later repeats. Use English titles and author names in English.
The existing `/zh/now/` and `/en/now/` URLs remain stable.

Search uses the theme's search panel with local substring matching for Chinese
and English. `assets/search.json` indexes post titles and full content at build
time; `assets/js/site-search.js` searches within the current locale. Multiple
space-separated terms must all match. Set `search: false` on a post to omit it.

## Appearance

Light and dark palettes default to the system's `prefers-color-scheme`. The
appearance button shows a sun, moon, or device
for the current mode. Each click cycles Light, Dark, and System;
explicit choices persist locally across pages and languages. Light keeps the
warm paper background; dark uses ink green, warm white text, and lighter green
accents. The red seal retains
its color in both modes. Shared color tokens live in `_sass/site/_tokens.scss`;
`_includes/head/custom.html` sets matching browser chrome colors.

## Published assets

The shared head links the root favicon, PNG favicon sizes, and Apple touch icon.
Font subsets and their licenses are published; font provenance documentation is
excluded from the site. There is no web app manifest or standalone app mode.
