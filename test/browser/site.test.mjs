import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, mkdtemp } from 'node:fs/promises';
import { once } from 'node:events';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const site = path.join(root, '_site');
const artifacts = process.env.BROWSER_ARTIFACTS
  ?? await mkdtemp(path.join(os.tmpdir(), 'blog-browser-'));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
let server, browser, context, page, base;
const errors = [];

before(async () => {
  await mkdir(artifacts, { recursive: true });
  await readFile(path.join(site, 'index.html'));
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const publisher = url.pathname.startsWith('/__publisher/');
      const directory = publisher ? path.join(root, 'wechat/out') : site;
      const pathname = publisher ? url.pathname.slice('/__publisher'.length)
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

test('entry, both languages, archives, and posts fit desktop and phone viewports', async () => {
  for (const [width, height] of [[1440, 1000], [1024, 768], [768, 1024], [674, 767],
    [390, 844], [320, 568], [667, 375], [844, 390]]) {
    await page.setViewportSize({ width, height });
    for (const route of ['/', '/zh/', '/en/', '/archive.html', '/en/archive.html',
      '/2026/10/17/达科他五日/', '/2026/08/30/Thunderstorm/']) {
      const response = await page.goto(base + route);
      assert.equal(response.status(), 200, route);
      await page.evaluate(() => document.fonts.ready);
      await checkVisibleImages();
      assert.ok((await page.title()).length, route);
      assert.ok((await page.locator('h1').innerText()).trim(), route);
      assert.ok(await page.evaluate(() =>
        document.documentElement.scrollWidth <= innerWidth + 1
      ), `${route}: overflow at ${width}`);
      if (['/zh/', '/en/'].includes(route) && width <= 760) {
        const rows = await page.locator(
          '.visible-links a, .site-controls > *').evaluateAll(elements =>
          elements.filter(element => element.getClientRects().length).map(element => {
            const rect = element.getBoundingClientRect();
            return rect.top + rect.height / 2;
          }));
        assert.ok(Math.max(...rows) - Math.min(...rows) <= 1,
          `${route}: header stays on one row at ${width}`);
      }
      if (['/zh/', '/en/'].includes(route) && [1440, 390].includes(width)) {
        const language = route === '/zh/' ? 'zh' : 'en';
        await page.screenshot({ path: path.join(artifacts,
          `home-${language}-${width}.png`) });
      }
      if ([1440, 390].includes(width) &&
        ['/archive.html', '/2026/08/30/Thunderstorm/'].includes(route)) {
        const name = route === '/archive.html' ? 'archive' : 'article';
        await page.screenshot({ path: path.join(artifacts, `${name}-${width}.png`) });
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
  assert.equal(await toggle.getAttribute('aria-label'), '搜索文章');
  assert.ok(await toggle.evaluate(element => element === document.activeElement));
  await page.reload();
  await page.route('**/assets/search.json', route => route.fulfill({ status: 503 }));
  await toggle.click();
  await page.locator('#search').fill('达科他');
  await page.waitForFunction(() => document.querySelector('#search-status')
    .textContent.includes('暂时无法'));
  await page.unroute('**/assets/search.json');
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
  await page.goto(base + '/2026/08/30/Thunderstorm/');
  await page.waitForFunction(() => document.querySelector('source[data-artwork-dark]')
    .media === 'all');
  await page.goto(base + '/en/about/');
  assert.equal(await page.locator('.visible-links a[aria-current="page"]')
    .textContent(), 'About');
  await page.locator('[data-search-toggle]').click();
  await page.locator('#search').fill('Thunderstorm');
  await page.waitForFunction(() => document.querySelector('#results h2'));
  assert.deepEqual(await page.locator('#results h2').allTextContents(), ['Thunderstorm']);
});

test('home branding, pagination, and article navigation fit the reading layout', async () => {
  for (const width of [1440, 674, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const locale of ['zh', 'en']) {
      await page.goto(`${base}/${locale}/`);
      const brand = page.locator('.site-title');
      await page.waitForFunction(() => getComputedStyle(
        document.querySelector('.site-title')).visibility === 'hidden');
      await page.locator('[data-search-toggle]').click();
      assert.ok(await brand.isVisible(), 'Search retains the home link');
      assert.equal(await page.locator('#search').getAttribute('placeholder'), null);
      assert.equal(await page.locator('#search').inputValue(), '');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => getComputedStyle(
        document.querySelector('.site-title')).visibility === 'hidden');
      await page.locator('.pagination').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => getComputedStyle(
        document.querySelector('.site-title')).visibility === 'visible');
      assert.ok(await brand.isVisible(), 'Scrolling restores the wordmark');
      assert.ok(await page.evaluate(() =>
        document.documentElement.scrollWidth <= innerWidth + 1));
      if (width <= 540) {
        const menu = page.locator('.compact-nav');
        await menu.locator('summary').click();
        assert.ok(await menu.getByRole('link').first().isVisible());
        await menu.locator('summary').click();
      }
      const geometry = await page.evaluate(() => {
        const items = [...document.querySelectorAll('.pagination li')]
          .map(item => item.getBoundingClientRect());
        const left = Math.min(...items.map(item => item.left));
        const right = Math.max(...items.map(item => item.right));
        const pagination = document.querySelector('.pagination')
          .getBoundingClientRect();
        const footer = document.querySelector('.page__footer')
          .getBoundingClientRect();
        return { center: (left + right) / 2, viewport: innerWidth,
          gap: footer.top - pagination.bottom, footerHeight: footer.height };
      });
      assert.ok(Math.abs(geometry.center - geometry.viewport / 2) <= 1);
      assert.ok(geometry.gap <= 33, 'Pagination has a compact footer gap');
      assert.ok(geometry.footerHeight <= 52, 'Copyright has a compact row');
      await page.screenshot({ path: path.join(artifacts,
        `pagination-${locale}-${width}.png`) });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(() => getComputedStyle(
        document.querySelector('.site-title')).visibility === 'hidden');
    }
    for (const route of ['/2026/10/17/达科他五日/',
      '/2026/08/30/Thunderstorm/']) {
      await page.goto(base + route);
      assert.ok(await page.locator('.site-title').isVisible());
      if (width === 1440) {
        assert.equal(await page.locator('.page__content')
          .evaluate(element => element.getBoundingClientRect().width), 900);
      }
      const links = page.locator('.post-navigation__link');
      for (const link of await links.all()) {
        const alignment = await link.evaluate(element => {
          const arrow = element.querySelector('.post-navigation__direction');
          const title = element.querySelector('.post-navigation__title');
          const firstLine = document.createRange();
          firstLine.selectNodeContents(title);
          return { arrow: arrow.textContent.trim(),
            top: arrow.getBoundingClientRect().top,
            titleTop: firstLine.getClientRects()[0].top };
        });
        assert.match(alignment.arrow, /^[←→]$/);
        assert.ok(Math.abs(alignment.top - alignment.titleTop) < 12,
          'The arrow shares the first title line');
      }
    }
  }
  assert.deepEqual(errors, []);
});

test('continuation pages start directly below the header', async () => {
  for (const width of [1440, 674, 390, 320, 667]) {
    await page.setViewportSize({ width, height: 767 });
    for (const locale of ['zh', 'en']) {
      for (const fragment of ['', '#posts']) {
        await page.goto(`${base}/${locale}/p/2/${fragment}`);
        const gap = await page.evaluate(() => {
          const header = document.querySelector('.masthead')
            .getBoundingClientRect();
          const entry = document.querySelector('.journal-entry')
            .getBoundingClientRect();
          return entry.top - header.bottom;
        });
        assert.ok(gap >= -1 && gap <= 1,
          `${locale} page 2 at ${width}${fragment}: gap ${gap}`);
      }
      if ([674, 390].includes(width)) {
        await page.screenshot({ path: path.join(artifacts,
          `continuation-${locale}-${width}.png`) });
      }
    }
  }
});

test('pagination, contents, archive fragments, and the native image viewer integrate', async () => {
  await page.goto(base + '/en/');
  assert.equal(await page.locator('.journal-feature h2').innerText(),
    'Thunderstorm');
  assert.equal(await page.locator('.journal-entry h2').first().innerText(),
    'What I Still Ask of Life');
  assert.equal(await page.locator('.journal-entry h2')
    .filter({ hasText: /^Thunderstorm$/ }).count(), 0);
  await page.locator('.journal-feature__link').click();
  await page.waitForURL('**/2026/08/30/Thunderstorm/');
  await page.goto(base + '/zh/');
  assert.equal(await page.locator('.journal-feature h2').innerText(),
    '达科他五日');
  await page.locator('.pagination').getByRole('link', { name: '2', exact: true }).click();
  await page.waitForURL('**/zh/p/2/#posts');
  assert.equal(await page.locator('.journal-feature').count(), 0);
  assert.equal(await page.locator('.journal-entry').count(), 8);
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
  await page.screenshot({ path: path.join(artifacts, 'native-image-viewer.png') });
  await page.keyboard.press('ArrowRight');
  assert.ok((await page.locator('.image-viewer img').getAttribute('src'))
    .includes('badlands-wind-tree'));
  await page.keyboard.press('ArrowLeft');
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

test('the pinned MathJax runtime renders existing cancel notation', async () => {
  await page.goto(base + '/2023/11/02/关于回忆与我/');
  await page.locator('mjx-container[jax="SVG"]').first().waitFor();
  await page.evaluate(() => window.MathJax.startup.promise);
  assert.ok(await page.locator('mjx-container svg').count() > 0);
  assert.equal(await page.locator('[data-mml-node="merror"]').count(), 0);
  assert.deepEqual(errors, []);
});

test('publisher previews and Clipboard API payloads match exported content', async () => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  for (const [slug, lineHeight] of [
    ['2026-08-30-观雷', '32px'], ['2026-10-17-达科他五日', '31.2px'],
  ]) {
    await page.goto(`${base}/__publisher/${slug}/preview.html`);
    await page.locator('#publication img').evaluateAll(images =>
      Promise.all(images.map(image => image.decode())));
    const typography = await page.locator('.article-body p').first().evaluate(p => ({
      fontSize: getComputedStyle(p).fontSize,
      lineHeight: getComputedStyle(p).lineHeight,
    }));
    assert.deepEqual(typography, { fontSize: '16px', lineHeight });
    await page.evaluate(() => {
      navigator.clipboard.write = async items => {
        window.copiedHTML = await (await items[0].getType('text/html')).text();
      };
    });
    await page.locator('#copy').click();
    await page.waitForFunction(() => window.copiedHTML);
    const copied = await page.evaluate(() => window.copiedHTML);
    const fragment = await readFile(path.join(root, 'wechat/out', slug, 'fragment.html'), 'utf8');
    assert.equal(copied, fragment.trim());
    await page.locator('#copy-body').click();
    await page.waitForFunction(() => !window.copiedHTML.includes('publication-header'));
    await page.screenshot({ path: path.join(artifacts, `publisher-${slug}.png`) });
  }
  assert.deepEqual(errors, []);
});

test('clipboard denial reports an error without selecting or copying another way', async () => {
  await page.evaluate(() => {
    getSelection().removeAllRanges();
    navigator.clipboard.write = async () => {
      throw new DOMException('Permission denied', 'NotAllowedError');
    };
  });
  await page.locator('#copy').click();
  await page.waitForFunction(() => document.querySelector('#status')
    .textContent.includes('剪贴板权限'));
  assert.equal(await page.evaluate(() => getSelection().rangeCount), 0);
});
