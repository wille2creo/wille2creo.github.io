import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { parse } from 'yaml';
import { convert, frontMatter, postRoute } from '../convert.mjs';
import { build, root, hash } from '../build.mjs';
import { publicationContent } from '../publication.js';

const site = { url: 'https://example.com', baseurl: '', permalink: '/:year/:month/:day/:title/' };
const file = path.join(root, '_posts/zh/2026-01-01-fixture.md');
const wrap = body => `---\ntitle: 测试\nexcerpt: 摘要\n---\n\n${body}`;

test('adapter preserves paragraph rhythm, quotes, hard breaks and inline markup', async () => {
  const source = '### 第一章\n\n第一段 **强调**。  \n下一行。\n\n> 引文\n>\n> <cite>出处</cite>\n\n<div class="travel-passage" markdown="1">\n\n原段落。\n\n</div>\n\n尾段。';
  const { body } = await convert(wrap(source), file, site, root);
  assert.ok(body.includes('第一段 **强调**。  \n下一行。'));
  assert.ok(body.includes('> 引文\n>\n> <cite>出处</cite>'));
  assert.ok(body.includes('原段落。\n\n'));
  assert.ok(body.includes('尾段。'));
  assert.ok(!body.includes('<div'));
});

test('multiline components resolve page metadata, credit and full image aspect', async () => {
  const source = '---\ntitle: 测试\nartwork:\n  light: /assets/plate.png\n---\n\n{% include artwork.html src=page.artwork.light alt="光 & 影" %}\n\n{% include travel-photo.html\n src="/assets/portrait.jpg" alt="竖幅" width=768 height=1024\n credit="摄影者" aspect_ratio="16 / 9" %}';
  const { body } = await convert(source, file, site, root);
  assert.match(body, /https:\/\/example.com\/assets\/plate.png/);
  assert.match(body, /alt="光 &amp; 影"/);
  assert.match(body, /width="768" height="1024"/);
  assert.match(body, /<figcaption>摄影者<\/figcaption>/);
  assert.ok(!body.includes('16 / 9'));
});

test('code remains literal; unknown Liquid stops rather than deleting content', async () => {
  const code = '```liquid\n{% unknown %}\n```\n\n`{{ page.title }}`';
  assert.equal((await convert(wrap(code), file, site, root)).body.trim(), code);
  assert.equal((await convert(wrap('{% raw %}{{ literal }}{% endraw %}'), file, site, root)).body.trim(), '{{ literal }}');
  await assert.rejects(convert(wrap('正文\n\n{% include unknown.html %}'), file, site, root), /尚未支持组件/);
  await assert.rejects(convert(wrap('{% if page.foo %}正文{% endif %}'), file, site, root), /未支持的 Liquid/);
});

test('nested raw/code captures restore completely without changing literals', async () => {
  for (const [input, expected] of [
    ['```liquid\n{% raw %}{{ page.title }}{% endraw %}\n```',
      '```liquid\n{{ page.title }}\n```'],
    ['`{% raw %}{{ value }}{% endraw %}`', '`{{ value }}`'],
    ['{% raw %}`{{ value }}`{% endraw %}', '`{{ value }}`'],
    ['```text\n{% raw %}$& $1 {{ value }}{% endraw %}\n```\n\n' +
      '{% raw %}tail {{ other }}{% endraw %}',
    '```text\n$& $1 {{ value }}\n```\n\ntail {{ other }}'],
  ]) {
    const { body } = await convert(wrap(input), file, site, root);
    assert.equal(body.trim(), expected);
    assert.ok(!body.includes('\u0000'));
  }
});

test('Jekyll URL tokens honor pretty titles, slug/date and permalink overrides', () => {
  assert.equal(decodeURI(postRoute('2024-06-30-回忆、内在时间.md', {}, site)),
    '/2024/06/30/回忆-内在时间/');
  assert.equal(postRoute('2017-07-02-Hello darkness.md', {}, site),
    '/2017/07/02/Hello-darkness/');
  assert.equal(postRoute(file, { slug: 'New Name', date: '2025-02-03' }, site),
    '/2025/02/03/New-Name/');
  assert.equal(postRoute(file, {
    slug: 'New.Name', permalink: '/notes/:year/:title/:slug/',
  }, site), '/notes/2026/New.Name/new-name/');
  assert.equal(postRoute(file, { permalink: '/fixed/' }, site), '/fixed/');
  assert.throws(() => postRoute(file, { permalink: '/:unknown/' }, site),
    /不支持的 permalink 占位符/);
});

test('every Chinese post URL matches Jekyll, including post_url references', async () => {
  const config = parse(await readFile(path.join(root, '_config.yml'), 'utf8'));
  const names = (await readdir(path.join(root, '_posts/zh')))
    .filter(name => name.endsWith('.md'));
  for (const name of names) {
    const source = await readFile(path.join(root, '_posts/zh', name), 'utf8');
    const converted = await convert(source, path.join(root, '_posts/zh', name), config, root);
    const route = decodeURI(new URL(converted.metadata.source_url).pathname);
    const generated = new JSDOM(await readFile(
      path.join(root, '_site', route, 'index.html'), 'utf8'));
    const canonical = generated.window.document.querySelector('link[rel="canonical"]').href;
    assert.equal(converted.metadata.source_url, canonical, name);
    generated.window.close();
  }
  const linked = await convert(wrap(
    '[前文]({% post_url zh/2024-06-30-回忆、内在时间和理想自我 %})'),
  file, config, root);
  assert.match(decodeURI(linked.body), /\/2024\/06\/30\/回忆-内在时间和理想自我\//);
});

test('post_url and URL filters use actual repository metadata', async () => {
  const { body } = await convert(wrap('[前文]({% post_url zh/2026-08-30-观雷 %})\n\n![图]({{ "/assets/a.jpg" | relative_url }})'), file, site, root);
  assert.match(decodeURI(body), /https:\/\/example.com\/2026\/08\/30\/观雷\//);
  assert.match(body, /https:\/\/example.com\/assets\/a.jpg/);
});

// Independent oracle: Jekyll renders the original source with its real Liquid
// includes. Compare ordered paragraphs/headings and image/credit positions.
// This catches deletions, duplicate prose, changed emphasis, and reordering.
function events(body) {
  for (const node of body.querySelectorAll('aside, .page__share, .page__taxonomy')) node.remove();
  return [...body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,img,figcaption,.publication-caption')]
    .filter(el => el.tagName !== 'P' || !el.querySelector('img'))
    .map(el => el.tagName === 'IMG'
      ? { type: 'image', src: decodeURI(new URL(el.getAttribute('src'), site.url).href), alt: el.getAttribute('alt') }
      : { type: el.matches('figcaption,.publication-caption') ? 'caption' : el.tagName,
        text: el.textContent.trim().replace(/\s+/g, ' '),
        ...(el.tagName === 'P' ? { emphasis: [...el.querySelectorAll('strong,em')].map(x => [x.tagName, x.textContent]) } : {}) });
}

for (const [filename, route, theme, count] of [
  ['2026-08-30-观雷', '2026/08/30/观雷', 'essay', 1],
  ['2026-10-17-达科他五日', '2026/10/17/达科他五日', 'travel', 5],
]) {
  test(`${filename}: render and compare every ordered block against Jekyll`, async () => {
    const original = new JSDOM(await readFile(path.join(root, '_site', route, 'index.html'), 'utf8'));
    const result = await build(`_posts/zh/${filename}.md`);
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
    assert.equal(result.manifest.images.length, count);
    assert.equal(document.querySelector('#wenyan').firstElementChild.className, 'publication-header');
    assert.equal(document.querySelectorAll('.publication-description').length, 1);
    assert.equal(document.querySelectorAll('.publication-title').length, 0);
    const preview = new JSDOM(await readFile(path.join(result.outDir, 'preview.html'), 'utf8'));
    assert.equal(preview.window.document.querySelector('.publication-title').textContent,
      result.manifest.metadata.title);
    assert.equal(publicationContent(preview.window.document.querySelector('#wenyan')).outerHTML,
      (await readFile(path.join(result.outDir, 'fragment.html'), 'utf8')).trim());
    assert.equal(document.querySelector('img').style.width, '100%');
    if (theme === 'travel') {
      assert.equal(document.querySelector('img.publication-portrait').style.width, '86%');
    }
    preview.window.close();
    assert.ok(!document.querySelector('style, script'));
    assert.ok(document.querySelector('.article-body p').style.color);
    assert.ok(document.querySelector('h3').style.fontFamily.includes('Songti'));
    for (const image of result.manifest.images) {
      assert.equal(hash(await readFile(path.join(result.outDir, image.asset))), image.sha256);
    }
    assert.ok(!(await readFile(path.join(result.outDir, 'fragment.html'), 'utf8')).includes('127.0.0.1'));
    for (const excluded of ['wechat', 'node_modules', 'package.json', 'package-lock.json']) {
      await assert.rejects(access(path.join(root, '_site', excluded)));
    }
    original.window.close();
    exported.window.close();
  });
}

test('a third travel post converts without article-specific rules', async () => {
  const filename = '_posts/zh/2026-10-16-落基山十三日.md';
  const source = await readFile(path.join(root, filename), 'utf8');
  const result = await convert(source, path.join(root, filename), site, root);
  assert.equal(result.metadata.theme, 'travel');
  assert.equal((result.body.match(/<img /g) || []).length,
    (frontMatter(source).body.match(/{%\s*include travel-photo.html/g) || []).length);
  assert.ok(!result.body.includes('travel-pair'));
  assert.ok(!result.body.includes('{%'));
});
