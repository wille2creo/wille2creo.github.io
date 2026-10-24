import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import { parse } from 'yaml';
import { convert, publicURL } from '../convert.mjs';
import { root } from '../build.mjs';

const file = path.join(root, '_posts/zh/2026-10-24-fixture.md');
const wrap = body => `---\ntitle: Fixture\n---\n\n${body}`;

test('document links match actual Jekyll routes for pages, posts, and assets', async () => {
  const targets = ['zh/about.md', 'en/about.md', 'zh/reading.md',
    'index.html', 'assets/favicon-32x32.png', '_posts/zh/2026-08-30-观雷.md'];
  const tags = targets.map(target => `{% link ${target} %}`);
  const script = `require 'jekyll'; require 'json'
    site = Jekyll::Site.new(Jekyll.configuration('quiet' => true))
    site.read
    puts JSON.generate(JSON.parse(ARGV.fetch(0)).map { |tag|
      Liquid::Template.parse(tag).render!(site.site_payload,
        registers: {site: site})
    })`;
  const { stdout } = await promisify(execFile)('bundle',
    ['exec', 'ruby', '-e', script, JSON.stringify(tags)], {
      cwd: root,
      env: { ...process.env, BUNDLE_PATH: 'vendor/bundle', BUNDLE_USER_HOME: '.bundle' },
    });
  const routes = JSON.parse(stdout);
  const site = parse(await readFile(path.join(root, '_config.yml'), 'utf8'));
  for (const [index, tag] of tags.entries()) {
    const result = await convert(wrap(tag), file, site, root);
    assert.equal(result.body.trim(), new URL(routes[index], site.url).href,
      targets[index]);
  }
  await assert.rejects(convert(wrap('{% link zh/missing.md %}'),
    file, site, root), /ENOENT/);
  await assert.rejects(convert(wrap('{% link ../README.md %}'),
    file, site, root));
  for (const target of ['README.md', '_includes/head.html']) {
    await assert.rejects(convert(wrap(`{% link ${target} %}`),
      file, site, root), /未公开/);
  }
});

test('unsupported page permalink tokens fail instead of exporting broken links', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'wechat-link-'));
  try {
    await writeFile(path.join(temporary, 'note.md'),
      '---\npermalink: /notes/:title/\n---\n\nNote\n');
    await assert.rejects(convert(wrap('{% link note.md %}'), file,
      { url: 'https://example.com' }, temporary), /需要明确适配/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test('relative article resources preserve a configured baseurl', () => {
  const context = { site: { url: 'https://example.com', baseurl: '/blog' },
    article: '/2026/10/24/fixture/' };
  assert.equal(publicURL('photo.jpg', context),
    'https://example.com/blog/2026/10/24/fixture/photo.jpg');
  assert.equal(publicURL('/assets/photo.jpg', context),
    'https://example.com/blog/assets/photo.jpg');
  assert.equal(publicURL('#chapter', context), '#chapter');
  assert.throws(() => publicURL('javascript:alert(1)', context), /协议/);
});
