import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { once } from 'node:events';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build } from '../../wechat/build.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const site = path.join(root, '_site');
const artifacts = process.env.BROWSER_ARTIFACTS
  ?? await mkdtemp(path.join(os.tmpdir(), 'blog-browser-'));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
let server, browser, context, page, base, publisher;
const errors = [];

before(async () => {
  await mkdir(artifacts, { recursive: true });
  await readFile(path.join(site, 'index.html'));
  publisher = await mkdtemp(path.join(os.tmpdir(), 'blog-publisher-'));
  await build('_posts/zh/2026-10-17-达科他五日.md', { outputRoot: publisher });
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const isPublisher = url.pathname.startsWith('/__publisher/');
      const directory = isPublisher ? publisher : site;
      const pathname = isPublisher ? url.pathname.slice('/__publisher'.length)
        : url.pathname;
      let file = path.resolve(directory, '.' + decodeURIComponent(pathname));
      if (file !== directory && !file.startsWith(directory + path.sep)) {
        throw new Error('Outside site');
      }
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      response.writeHead(200, { 'Content-Type': mime[path.extname(file)]
        ?? 'application/octet-stream' });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404).end('Not found');
    }
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
  context = await browser.newContext({ colorScheme: 'light', reducedMotion: 'reduce' });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && message.location().url.startsWith(base)) {
      errors.push(message.text());
    }
  });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  if (publisher) await rm(publisher, { recursive: true, force: true });
  console.log(`Browser screenshots: ${artifacts}`);
});

async function checkVisibleImages() {
  await page.locator('img').evaluateAll(images => Promise.all(images
    .filter(image => {
      const box = image.getBoundingClientRect();
      return box.bottom > 0 && box.top < innerHeight && box.width > 0;
    }).map(image => image.decode())));
  await page.evaluate(() => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test('entry, both languages, and an article fit desktop, phone and landscape', async () => {
  for (const [width, height] of [[1440, 1000], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width, height });
    for (const route of ['/', '/zh/', '/en/', '/2026/10/17/达科他五日/']) {
      const response = await page.goto(base + route);
      assert.equal(response.status(), 200, route);
      await page.evaluate(() => document.fonts.ready);
      await checkVisibleImages();
      assert.ok((await page.title()).length, route);
      assert.ok((await page.locator('h1').innerText()).trim(), route);
      assert.ok(await page.evaluate(() =>
        document.documentElement.scrollWidth <= innerWidth + 1
      ), `${route}: overflow at ${width}`);
      if (route === '/en/' && width === 390) {
        await page.screenshot({ path: path.join(artifacts, 'home-mobile.png') });
      }
    }
  }
});

test('language, search, failure recovery, focus, and theme persistence work', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/');
  await page.getByRole('link', { name: 'English — Übersicht' }).click();
  await page.waitForURL(base + '/en/');
  await page.locator('.site-control--language').click();
  await page.waitForURL(base + '/zh/');
  const toggle = page.locator('[data-search-toggle]');
  await toggle.click();
  await page.locator('#search').fill('达科他');
  await page.waitForFunction(() => document.querySelector('#results h2'));
  assert.ok((await page.locator('#results h2').allTextContents()).includes('达科他五日'));
  await page.screenshot({ path: path.join(artifacts, 'search-mobile.png') });
  await page.keyboard.press('Escape');
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  assert.ok(await toggle.evaluate(element => element === document.activeElement));
  await page.reload();
  await page.route('**/assets/search-zh-CN.json', route => route.fulfill({ status: 503 }));
  await toggle.click();
  await page.locator('#search').fill('达科他');
  await page.waitForFunction(() => document.querySelector('#search-status')
    .textContent.includes('暂时无法'));
  await page.unroute('**/assets/search-zh-CN.json');
  await page.locator('#search').fill('土拨鼠');
  await page.waitForFunction(() => document.querySelector('#results h2'));
  // The deliberately failed request is the only expected browser error.
  assert.equal(errors.length, 1);
  assert.match(errors[0], /503 \(Service Unavailable\)/);
  errors.length = 0;
  await page.keyboard.press('Escape');
  await page.locator('[data-theme-switch]').click();
  await page.locator('[data-theme-switch]').click();
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await checkVisibleImages();
  await page.screenshot({ path: path.join(artifacts, 'home-dark.png') });
  await page.goto(base + '/en/about/');
  assert.equal(await page.locator('.visible-links a[aria-current="page"]')
    .textContent(), 'About');
  await page.locator('[data-search-toggle]').click();
  await page.locator('#search').fill('Thunderstorm');
  await page.waitForFunction(() => document.querySelector('#results h2'));
  assert.deepEqual(await page.locator('#results h2').allTextContents(), ['Thunderstorm']);
});

test('pagination, contents, archive fragments, and the native image viewer integrate', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/en/');
  const featuredRoute = await page.locator('.journal-feature__link').getAttribute('href');
  const featuredTitle = await page.locator('.journal-feature h2').innerText();
  assert.ok(!(await page.locator('.journal-entry h2').allTextContents())
    .includes(featuredTitle));
  await page.locator('.journal-feature__link').click();
  await page.waitForURL(base + featuredRoute);
  assert.equal(await page.locator('h1').innerText(), featuredTitle);
  await page.goto(base + '/zh/');
  assert.ok(await page.locator('.journal-feature__link').isVisible());
  await page.locator('.pagination').getByRole('link', { name: '2', exact: true }).click();
  await page.waitForURL('**/zh/p/2/#posts');
  assert.equal(await page.locator('.journal-feature').count(), 0);
  assert.ok(await page.locator('.journal-entry').count() > 0);
  await page.goto(base + '/2026/10/17/达科他五日/');
  assert.equal(await page.locator('[data-toc]').evaluate(e => e.open), false);
  await page.locator('[data-toc] summary').click();
  await page.locator('nav.toc').getByRole('link', { name: '黑山', exact: true }).click();
  await page.waitForFunction(() => decodeURIComponent(location.hash) === '#黑山');
  assert.ok(await page.locator('[id="黑山"]').evaluate(e =>
    e.getBoundingClientRect().top >= document.querySelector('.masthead')
      .getBoundingClientRect().bottom));
  await page.setViewportSize({ width: 1440, height: 1000 });
  assert.equal(await page.locator('[data-toc]').evaluate(e => e.open), true);
  await page.locator('nav.toc').getByRole('link', { name: '土拨鼠', exact: true }).click();
  await page.locator('nav.toc').getByRole('link', { name: 'Rapid!', exact: true }).click();
  await page.waitForFunction(() => location.hash === '#rapid');
  await page.waitForFunction(() => document.querySelector(
    'nav.toc a[aria-current="location"]')?.hash === '#rapid');
  await page.locator('.travel-photo a').first().click();
  await page.getByRole('dialog', { name: '图片查看器' }).waitFor();
  await page.locator('.image-viewer img').evaluate(image => image.decode());
  const firstImage = await page.locator('.image-viewer img').getAttribute('src');
  await page.screenshot({ path: path.join(artifacts, 'native-image-viewer.png') });
  await page.keyboard.press('ArrowRight');
  assert.notEqual(await page.locator('.image-viewer img').getAttribute('src'), firstImage);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.image-viewer').open);
  await page.goto(base + '/archive.html');
  const year = page.locator('.archive-years a').last();
  const hash = await year.getAttribute('href');
  await year.click();
  await page.waitForFunction(value => location.hash === value, hash);
  assert.deepEqual(errors, []);
});

test('navigation and contents remain available without JavaScript', async () => {
  const plainContext = await browser.newContext({ javaScriptEnabled: false });
  try {
    const plain = await plainContext.newPage();
    await plain.goto(base + '/2026/08/30/Thunderstorm/');
    assert.equal(await plain.locator('[data-toc]').getAttribute('open'), '');
    assert.ok(await plain.locator('nav.toc a').first().isVisible());
    assert.ok(await plain.locator('.visible-links a').first().isVisible());
  } finally {
    await plainContext.close();
  }
});

test('publisher previews and Clipboard API payloads match exported content', async () => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const slug = '2026-10-17-达科他五日';
  await page.goto(`${base}/__publisher/${slug}/preview.html`);
  await page.locator('#publication img').evaluateAll(images =>
    Promise.all(images.map(image => image.decode())));
  assert.ok(await page.locator('.article-body p').first().isVisible());
  await page.evaluate(() => {
    navigator.clipboard.write = async items => {
      window.copiedHTML = await (await items[0].getType('text/html')).text();
    };
  });
  await page.locator('#copy').click();
  await page.waitForFunction(() => window.copiedHTML);
  const copied = await page.evaluate(() => window.copiedHTML);
  const fragment = await readFile(path.join(publisher, slug, 'fragment.html'), 'utf8');
  assert.equal(copied, fragment.trim());
  await page.locator('#copy-body').click();
  await page.waitForFunction(() => !window.copiedHTML.includes('publication-header'));
  await page.screenshot({ path: path.join(artifacts, `publisher-${slug}.png`) });
  assert.deepEqual(errors, []);
});
