import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { parse } from 'yaml';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, '_site');
const config = parse(await readFile(path.join(root, '_config.yml'), 'utf8'));
const { url: origin } = config;
const dependencies = parse(await readFile(
  path.join(root, '_data/dependencies.yml'), 'utf8'));

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(file)
      : file.endsWith('.html') ? [file] : [];
  }))).flat();
}

test('published pages expose metadata and resolve local navigation and assets', async () => {
  const documents = new Map();
  try {
    for (const file of await htmlFiles(site)) {
      documents.set(file, new JSDOM(await readFile(file, 'utf8')));
    }
    assert.ok(documents.size > 0, 'Run make build before the checks');
    for (const [file, dom] of documents) {
      const document = dom.window.document;
      const route = '/' + path.relative(site, file);
      assert.ok(document.querySelector('h1')?.textContent.trim(), route);
      assert.ok(['en', 'zh-CN'].includes(document.documentElement.lang), route);
      const search = document.querySelector('#search');
      if (search) {
        const index = `/assets/search-${document.documentElement.lang}.json`;
        assert.equal(search.dataset.index, index, `${route}: search locale`);
        await access(path.join(site, index));
      }
      assert.ok(document.title.trim(), `${route}: title`);
      assert.ok(document.querySelector('meta[name="description"]')?.content,
        `${route}: description`);
      const canonical = document.querySelector('link[rel="canonical"]')?.href;
      assert.equal(canonical, new URL(route.replace(/index\.html$/, ''), origin).href,
        `${route}: canonical URL`);
      assert.equal(document.querySelector('meta[property="og:url"]')?.content,
        canonical, `${route}: shared URL`);
      for (const element of document.querySelectorAll(
        'a[href], img[src], source[srcset], script[src], '
        + 'link[rel="preload"], link[rel="stylesheet"], '
        + 'link[rel="icon"], link[rel="apple-touch-icon"]'
      )) {
        const value = element.getAttribute('href')
          ?? element.getAttribute('src') ?? element.getAttribute('srcset');
        const url = new URL(value, origin + route);
        if (url.origin !== origin) continue;
        let target = path.join(site, decodeURIComponent(url.pathname));
        if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
        await access(target);
        if (url.hash && documents.has(target)) {
          assert.ok(documents.get(target).window.document.getElementById(
            decodeURIComponent(url.hash.slice(1))
          ), `${route}: missing fragment ${value}`);
        }
      }
      for (const image of document.images) {
        assert.ok(image.width > 0 && image.height > 0, `${route}: image dimensions`);
      }
      for (const nav of document.querySelectorAll('nav.toc:has(.toc__menu)')) {
        assert.ok(nav.querySelector('details[open]'), `${route}: no-script contents`);
        const headings = [...document.querySelectorAll(
          '.page__content :is(h1, h2, h3, h4, h5, h6)[id]')];
        const links = [...nav.querySelectorAll('a')];
        assert.deepEqual(links.map(link => link.hash.slice(1)),
          headings.map(heading => encodeURI(heading.id)), `${route}: contents order`);
        assert.deepEqual(links.map(link => link.textContent),
          headings.map(heading => heading.textContent), `${route}: contents labels`);
      }
      if (!document.body.classList.contains('layout--home')) continue;
      const entries = [...document.querySelectorAll('.journal-feature,.journal-entry')];
      const dates = [...document.querySelectorAll('.journal-entry')]
        .map(entry => entry.querySelector('time').dateTime);
      assert.deepEqual(dates, [...dates].sort().reverse(), `${route}: chronology`);
      const links = entries.map(entry => entry.querySelector('a').getAttribute('href'));
      assert.equal(new Set(links).size, links.length, `${route}: repeated entry`);
      if (/\/p\//.test(route)) {
        assert.equal(document.querySelector('.journal-feature'), null, route);
      }
      for (const link of links) {
        const target = path.join(site, decodeURIComponent(link), 'index.html');
        assert.equal(documents.get(target).window.document.documentElement.lang,
          document.documentElement.lang, `${route}: language isolation`);
      }
    }
  } finally {
    for (const dom of documents.values()) dom.window.close();
  }
});

test('contents handles skipped levels, Unicode IDs, and escaped heading text', () => {
  const html = '<h2 id="开篇">A &amp; <em>B</em></h2>'
    + '<h4 id="detail">Detail</h4><h3 id="sibling">Sibling</h3>'
    + '<h1 id="next">Next</h1><h2>Unlinked</h2>';
  const output = execFileSync('bundle', ['exec', 'ruby', '-rliquid',
    '-r./_plugins/contents', '-e',
    'puts Object.new.extend(SiteContents).contents_list(STDIN.read)'], {
    cwd: root, input: html, encoding: 'utf8',
    env: { ...process.env, BUNDLE_PATH: 'vendor/bundle', BUNDLE_USER_HOME: '.bundle' },
  });
  const dom = new JSDOM(output);
  try {
    const document = dom.window.document;
    assert.deepEqual([...document.querySelectorAll('.toc__menu > li > a')]
      .map(link => link.getAttribute('href')), ['#开篇', '#next']);
    assert.deepEqual([...document.querySelectorAll('.toc__menu > li > ul > li > a')]
      .map(link => link.textContent), ['Detail', 'Sibling']);
    assert.equal(document.querySelector('a').textContent, 'A & B');
    assert.equal(document.querySelector('em'), null);
    assert.equal(document.querySelectorAll('a').length, 4);
  } finally {
    dom.window.close();
  }
});

test('production output honors the configured publishing boundary', async () => {
  for (const name of config.exclude) {
    await assert.rejects(access(path.join(site, name)), name);
  }
  const math = await readFile(path.join(site,
    '2023/11/02/关于回忆与我/index.html'), 'utf8');
  assert.ok(math.includes(`mathjax@${dependencies.mathjax}/`));
});

test('tooling declares the Node runtime used by development and CI', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.engines.node,
    (await readFile(path.join(root, '.node-version'), 'utf8')).trim());
});

test('search results identify published articles in their own language', async () => {
  const posts = JSON.parse(await readFile(path.join(site, 'assets/search.json'), 'utf8'));
  assert.ok(posts.length > 0);
  for (const locale of Object.keys(parse(await readFile(
    path.join(root, '_data/languages.yml'), 'utf8')))) {
    const localized = JSON.parse(await readFile(path.join(site,
      `assets/search-${locale}.json`), 'utf8'));
    assert.deepEqual(localized, posts.filter(post => post.locale === locale));
  }
  const urls = new Set();
  for (const post of posts) {
    assert.ok(!urls.has(post.url), `Repeated search result: ${post.url}`);
    urls.add(post.url);
    const document = new JSDOM(await readFile(path.join(site,
      decodeURIComponent(post.url), 'index.html'), 'utf8'));
    try {
      assert.equal(post.locale, document.window.document.documentElement.lang);
      assert.equal(post.title, document.window.document.querySelector('h1')
        .textContent.trim());
      const paragraphs = [...document.window.document.querySelectorAll(
        '.page__content p')].map(p => p.textContent.trim()).filter(Boolean);
      // Whitespace and entities can differ between JSON and rendered HTML.
      const text = JSDOM.fragment(post.text).textContent.replace(/\s+/g, '');
      for (const paragraph of paragraphs) {
        assert.ok(text.includes(paragraph.replace(/\s+/g, '')), post.url);
      }
    } finally {
      document.window.close();
    }
  }
});

test('feed and sitemap URLs reach pages with matching canonical metadata', async () => {
  for (const [name, selector] of [
    ['feed.xml', 'entry > link[rel="alternate"]'], ['sitemap.xml', 'loc'],
  ]) {
    const xml = new JSDOM(await readFile(path.join(site, name), 'utf8'),
      { contentType: 'application/xml' });
    try {
      const links = [...xml.window.document.querySelectorAll(selector)];
      assert.ok(links.length > 0, name);
      for (const link of links) {
        const url = new URL(link.getAttribute('href') ?? link.textContent);
        assert.equal(url.origin, origin);
        const file = path.join(site, decodeURIComponent(url.pathname));
        const target = (await stat(file)).isDirectory()
          ? path.join(file, 'index.html') : file;
        const page = new JSDOM(await readFile(target, 'utf8'));
        try {
          assert.equal(page.window.document.querySelector('link[rel="canonical"]').href,
            url.href, `${name}: ${url.pathname}`);
        } finally {
          page.window.close();
        }
      }
    } finally {
      xml.window.close();
    }
  }
});
