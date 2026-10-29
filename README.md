# wille2creo.github.io

Personal Jekyll site published at <https://wille2creo.github.io>.

## Supported use

Readers enter through the language selector, browse language-specific homes
and archives, and follow permanent article URLs. Navigation, article text,
contents links, and images are available as static HTML. JavaScript adds local
search, appearance controls, contents tracking, and the image viewer.

Feed readers consume `/feed.xml`; crawlers and link previews consume the
sitemap, canonical URLs, and page metadata. Public article URLs and the
Reading pages at `/zh/now/` and `/en/now/` stay stable as source files change.

The author uses the WeChat CLI to turn Chinese posts into local exports and
browser previews, then copies the result into the official editor. The
publisher preserves article content, image order, credits, and public links.
Its JavaScript modules are internal to this workflow; its supported commands
and output files are described in [wechat/README.md](wechat/README.md).

## Structure

- `_posts/zh/` and `_posts/en/`: posts grouped by language, using
  `YYYY-MM-DD-title.md` filenames.
- `_data/navigation.yml`: navigation for each language.
- `_data/languages.yml`: brands, home links, introductions, and language labels.
- `_data/ui-text.yml`: translated interface and accessibility labels.
- `_layouts/` and `_includes/`: site templates and shared components.
- `_sass/_site.scss`: local visual entry point for focused Sass partials in
  `_sass/site/`.
- `assets/css/main.scss`: stylesheet entry point.
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

Make honors the Ruby on your `PATH`; Bundler checks it against `.ruby-version`.
Select that interpreter with your preferred version manager; the repository
does not override your machine's Ruby installation.

## Validation and optional publishing tools

Use the exact Node version in `.node-version`, matching CI,
then install the locked development dependencies:

```sh
npm ci --ignore-scripts
make check
npx playwright install chromium
npm run test:browser
```

`make check` builds once, checks browser-script syntax, audits generated local
links and language listings, and runs the WeChat publisher's regression tests.
`npm test` is equivalent. Browser checks start their own loopback server against
the built site; screenshots go to a temporary directory, or `BROWSER_ARTIFACTS`
when set. Publisher checks and browser checks each generate their own exports
in temporary directories and leave the author's `wechat/out/` bundles intact.
Run `make build` before browser checks after changing source files.

CI builds once and runs the site and publisher checks before deployment.
Manual workflow runs also run Chromium; use `npm run test:browser` locally for
interaction or layout changes. The browser smoke suite covers desktop, phone
and landscape layouts, search, navigation, contents, the image viewer, themes,
and publisher clipboard behavior. Dependency updates are checked weekly through
Dependabot.

Checks cover resolvable navigation and assets, canonical URLs, language isolation
and faithful exports. Browser checks use representative reading and publishing
flows; screenshots support visual review.

The optional [WeChat publishing tool](wechat/README.md) adapts Chinese posts
into local exports and previews. Exporting requires Node, but does not require
a Jekyll build or access to a publishing account. Its contract tests use Jekyll
as an independent reference for routes and article content.

## Notes

Templates and Sass modules are owned by this repository. The SEO include keeps
titles, descriptions, canonical links, Open Graph metadata, publication dates,
and the root schema. `_plugins/contents.rb` builds contents lists from rendered
heading IDs using Nokogiri. MathJax's version is declared in
`_data/dependencies.yml`. Site interactions use native browser APIs.

GitHub Pages is deployed through Actions to support the local contents filter
and language pagination.

## Languages

The root `/` is a language selector. The Chinese home is `/zh/`; the English
home is `/en/`. Both use the same visual styles and seal, with separate brands
and introductory text. The language switch shows the destination
`中` or `EN` and opens that language's home when clicked, including on a post.

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

The About and Reading pages live in `zh/about.md`, `zh/reading.md`,
`en/about.md`, and `en/reading.md`. Reading lists use yearly Markdown
sections; update their visible date when changing entries. The Chinese list keeps the full record.
The English list selects foreign works, Chinese classics, and established
modern Chinese works with published or recognized English titles. Preserve
the earliest reading year for each book and the relative order within each
year; omit later repeats. Use English titles and author names in English.
The existing `/zh/now/` and `/en/now/` URLs remain stable.

Search uses a local panel with substring matching for Chinese
and English. Locale-specific `assets/search-en.json` and
`assets/search-zh-CN.json` index post titles and full content at build time;
`assets/js/site-search.js` fetches only the current locale. The complete
`assets/search.json` remains available. Multiple
space-separated terms must all match. Set `search: false` on a post to omit it.

## Appearance

Light and dark palettes default to the system's `prefers-color-scheme`. The
appearance button shows a sun, moon, or device
for the current mode. Each click cycles Light, Dark, and System;
explicit choices persist locally across pages and languages. Light keeps the
warm paper background; dark uses ink green, warm white text, and lighter green
accents. The red seal retains
its color in both modes. Shared color tokens live in `_sass/site/_tokens.scss`;
`_includes/head.html` sets matching browser chrome colors.

## Published assets

The shared head links the root favicon, PNG favicon sizes, and Apple touch icon.
All languages use the same paper-white “之” on deep green. The mark retains
the Alimama DaoLiTi glyph with balanced margins. `assets/favicon.svg` is the
master; `assets/favicon-16x16.svg` slightly enlarges and thickens the mark for
16px. The ICO embeds the dedicated 16px PNG alongside 32px and 48px editions.
Stylesheets, browser scripts, and icon links carry a build version so browsers
refresh them together after deployment.
Font subsets and their licenses are published; font provenance documentation is
excluded from the site. There is no web app manifest or standalone app mode.
