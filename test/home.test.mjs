import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('an older artwork leads once while all remaining pages stay chronological',
  async () => {
    const source = await mkdtemp(path.join(os.tmpdir(), 'blog-home-'));
    try {
      await mkdir(path.join(source, '_layouts'));
      await cp(path.join(root, '_layouts/home.html'),
        path.join(source, '_layouts/home.html'));
      await cp(path.join(root, '_includes'), path.join(source, '_includes'),
        { recursive: true });
      await writeFile(path.join(source, '_layouts/default.html'),
        '<html><body>{{ content }}</body></html>');
      const expected = {};
      for (const [locale, count] of [['en', 7], ['zh-CN', 4]]) {
        const language = locale === 'en' ? 'en' : 'zh';
        await mkdir(path.join(source, language));
        await writeFile(path.join(source, language, 'index.html'),
          `---\nlayout: home\nlocale: ${locale}\npagination:\n`
          + `  enabled: true\n  locale: ${locale}\n---\n<h1>Home</h1>`);
        await mkdir(path.join(source, '_posts', language), { recursive: true });
        expected[language] = [];
        for (let index = 0; index < count; index++) {
          const url = `/${language}/post-${index}/`;
          expected[language].push(url);
          let artwork = '';
          if (language === 'en' && [1, 5].includes(index)) {
            artwork = `artwork:\n  home_preview: ${index === 5}\n`
              + '  light: /art.svg\n  width: 100\n  height: 100\n';
          }
          if (language === 'en' && index === 3) {
            artwork = 'artwork:\n  home_preview: true\n';
          }
          await writeFile(path.join(source, '_posts', language,
            `2026-10-${31 - index}-post-${index}.md`),
            `---\ntitle: Post ${index}\nlocale: ${locale}\n`
            + `permalink: ${url}\n${artwork}---\nFixture article.`);
        }
      }
      await writeFile(path.join(source, '_posts/en/2026-11-01-hidden.md'),
        '---\ntitle: Hidden\nlocale: en\nhidden: true\nartwork:\n'
        + '  home_preview: true\n  light: /hidden.svg\n---\nHidden.');
      execFileSync('bundle', ['exec', 'ruby', '-rjekyll', '-e', `
        site = Jekyll::Site.new(Jekyll.configuration(
          "source" => ARGV[0], "destination" => "#{ARGV[0]}/_site",
          "quiet" => true, "future" => true,
          "plugins" => ["jekyll-paginate-v2"],
          "pagination" => {
            "enabled" => true, "per_page" => 3,
            "permalink" => "/p/:num/", "sort_field" => "date",
            "sort_reverse" => true
          }
        ))
        site.process
      `, source], {
        cwd: root, stdio: 'pipe',
        env: { ...process.env, BUNDLE_PATH: 'vendor/bundle',
          BUNDLE_USER_HOME: '.bundle' },
      });
      for (const [language, posts] of Object.entries(expected)) {
        const lead = language === 'en' ? posts[5] : null;
        const actual = [], chronological = [];
        for (let number = 1; number <= Math.ceil(posts.length / 3); number++) {
          const relative = number === 1 ? `${language}/index.html`
            : `${language}/p/${number}/index.html`;
          const dom = new JSDOM(await readFile(
            path.join(source, '_site', relative), 'utf8'));
          try {
            const document = dom.window.document;
            assert.equal(document.querySelector('.journal-feature a')
              ?.getAttribute('href') ?? null, number === 1 ? lead : null);
            const links = [...document.querySelectorAll(
              '.journal-feature a, .journal-entry a')]
              .map(link => link.getAttribute('href'));
            assert.equal(links.length, Math.min(3,
              posts.length - (number - 1) * 3), relative);
            actual.push(...links);
            chronological.push(...[...document.querySelectorAll(
              '.journal-entry a')].map(link => link.getAttribute('href')));
          } finally {
            dom.window.close();
          }
        }
        assert.deepEqual(chronological, posts.filter(post => post !== lead));
        assert.equal(new Set(actual).size, actual.length);
        assert.deepEqual([...actual].sort(), [...posts].sort());
      }
    } finally {
      await rm(source, { recursive: true, force: true });
    }
  });
