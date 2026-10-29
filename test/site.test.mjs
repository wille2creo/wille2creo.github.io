import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { parse } from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, '_site');
const config = parse(await readFile(path.join(root, '_config.yml'), 'utf8'));
const { url: origin } = config;

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

test('production output honors the configured publishing boundary', async () => {
  for (const name of config.exclude) {
    await assert.rejects(access(path.join(site, name)), name);
  }
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
    } finally {
      document.window.close();
    }
  }
});
