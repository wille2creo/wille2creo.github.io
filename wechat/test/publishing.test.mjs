import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { JSDOM } from 'jsdom';
import { convert, postRoute } from '../convert.mjs';
import { build, root, hash } from '../build.mjs';

const site = { url: 'https://example.com', baseurl: '', permalink: '/:year/:month/:day/:title/' };
const file = path.join(root, '_posts/zh/2026-01-01-fixture.md');
const wrap = body => `---\ntitle: 测试\nexcerpt: 摘要\n---\n\n${body}`;
let outputRoot;

before(async () => {
  outputRoot = await mkdtemp(path.join(os.tmpdir(), 'wechat-export-'));
});
after(async () => {
  if (outputRoot) await rm(outputRoot, { recursive: true, force: true });
});

test('code remains literal; unknown Liquid stops rather than deleting content', async () => {
  const code = '```liquid\n{% unknown %}\n```\n\n`{{ page.title }}`';
  assert.equal((await convert(wrap(code), file, site, root)).body.trim(), code);
  assert.equal((await convert(wrap('{% raw %}{{ literal }}{% endraw %}'), file, site, root)).body.trim(), '{{ literal }}');
  await assert.rejects(convert(wrap('正文\n\n{% include unknown.html %}'), file, site, root), /尚未支持组件/);
  await assert.rejects(convert(wrap('{% if page.foo %}正文{% endif %}'), file, site, root), /未支持的 Liquid/);
});

test('nested raw/code content stays literal', async () => {
  const input = '```text\n{% raw %}$& $1 {{ value }}{% endraw %}\n```';
  assert.equal((await convert(wrap(input), file, site, root)).body.trim(),
    '```text\n$& $1 {{ value }}\n```');
});

test('Jekyll URL tokens honor pretty titles, slug/date and permalink overrides', () => {
  assert.equal(decodeURI(postRoute('2024-06-30-回忆、内在时间.md', {}, site)),
    '/2024/06/30/回忆-内在时间/');
  assert.equal(postRoute(file, { slug: 'New Name', date: '2025-02-03' }, site),
    '/2025/02/03/New-Name/');
  assert.equal(postRoute(file, {
    slug: 'New.Name', permalink: '/notes/:year/:title/:slug/',
  }, site), '/notes/2026/New.Name/new-name/');
  assert.throws(() => postRoute(file, { permalink: '/:unknown/' }, site),
    /不支持的 permalink 占位符/);
});

// Independent oracle: Jekyll renders the original source with its real Liquid
// includes. Compare ordered paragraphs/headings and image/credit positions.
// This catches deletions, duplicate prose, changed emphasis, and reordering.
function events(body) {
  for (const node of body.querySelectorAll('.sidebar__right')) node.remove();
  return [...body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,img,figcaption,.publication-caption')]
    .filter(el => el.tagName !== 'P' || !el.querySelector('img'))
    .map(el => el.tagName === 'IMG'
      ? { type: 'image', src: decodeURI(new URL(el.getAttribute('src'), site.url).href), alt: el.getAttribute('alt') }
      : { type: el.matches('figcaption,.publication-caption') ? 'caption' : el.tagName,
        text: el.textContent.trim().replace(/\s+/g, ' '),
        ...(el.tagName === 'P' ? { emphasis: [...el.querySelectorAll('strong,em')].map(x => [x.tagName, x.textContent]) } : {}) });
}

for (const [filename, route, theme] of [
  ['2026-08-30-观雷', '2026/08/30/观雷', 'essay'],
  ['2026-10-17-达科他五日', '2026/10/17/达科他五日', 'travel'],
]) {
  test(`${filename}: render and compare every ordered block against Jekyll`, async () => {
    const original = new JSDOM(await readFile(path.join(root, '_site', route, 'index.html'), 'utf8'));
    const result = await build(`_posts/zh/${filename}.md`, { outputRoot });
    const exported = new JSDOM(await readFile(path.join(result.outDir, 'article.html'), 'utf8'));
    const document = exported.window.document;
    const actual = events(document.querySelector('.article-body'));
    const expected = events(original.window.document.querySelector('.page__content'));
    // Site-root image paths use the actual publication origin in the export.
    for (const item of expected) if (item.type === 'image' && item.src.startsWith(site.url)) {
      item.src = item.src.replace(site.url, 'https://wille2creo.github.io');
    }
    assert.deepEqual(actual, expected);
    assert.equal(result.manifest.metadata.theme, theme);
    assert.equal(result.manifest.images.length,
      expected.filter(event => event.type === 'image').length);
    assert.equal(document.querySelectorAll('.publication-description').length, 1);
    assert.equal(document.querySelector('.publication-description').textContent,
      result.manifest.metadata.description);
    assert.equal(document.querySelectorAll('.publication-title').length, 0);
    for (const image of document.images) {
      assert.ok(image.style.width, 'Image sizing is available after paste');
      assert.equal(image.style.height, 'auto', 'Images retain their proportions');
    }
    assert.ok(!document.querySelector('style, script'));
    assert.ok(document.querySelector('.article-body p').style.color);
    for (const image of result.manifest.images) {
      assert.equal(hash(await readFile(path.join(result.outDir, image.asset))), image.sha256);
    }
    assert.ok(!(await readFile(path.join(result.outDir, 'fragment.html'), 'utf8')).includes('127.0.0.1'));
    original.window.close();
    exported.window.close();
  });
}
