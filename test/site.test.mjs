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
const { url: origin } = parse(await readFile(path.join(root, '_config.yml'), 'utf8'));
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

test('every generated local link, fragment, image, and preload resolves', async () => {
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
      for (const element of document.querySelectorAll(
        'a[href], img[src], source[srcset], link[rel="preload"]'
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

test('production output excludes tooling and pins remote runtime dependencies', async () => {
  for (const name of ['wechat', 'node_modules', 'script', 'test',
    'package.json', 'package-lock.json', 'AGENTS.md', 'ARTWORK.md',
    'assets/js/main.min.js', 'assets/js/main.min.js.map', 'assets/js/vendor',
    'assets/js/plugins', 'assets/js/lunr']) {
    await assert.rejects(access(path.join(site, name)), name);
  }
  const home = await readFile(path.join(site, 'zh/index.html'), 'utf8');
  assert.ok(!home.includes('@latest'), 'Published dependencies must be versioned');
  for (const version of Object.values(dependencies)) {
    assert.match(version, /^\d+\.\d+\.\d+$/, 'Remote packages need stable versions');
  }
  assert.ok(!home.includes('main.min.js'));
  assert.ok(!home.includes('fontawesome'));
  const math = await readFile(path.join(site,
    '2023/11/02/关于回忆与我/index.html'), 'utf8');
  assert.ok(math.includes(`mathjax@${dependencies.mathjax}/`));
});

test('tooling has one Node runtime and no deprecated or overridden dependencies', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.engines.node,
    (await readFile(path.join(root, '.node-version'), 'utf8')).trim());
  assert.equal(manifest.overrides, undefined);
  const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
  assert.deepEqual(Object.entries(lock.packages)
    .filter(([, dependency]) => dependency.deprecated).map(([name]) => name), []);
});
