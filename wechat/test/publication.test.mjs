import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { publicationContent } from '../publication.js';
import { convert } from '../convert.mjs';
import { root } from '../build.mjs';
import { render } from '../render.mjs';

test('one publication policy preserves body headings and restores image URLs', () => {
  const dom = new JSDOM(`<section id="publication">
    <section class="publication-header">
      <h1 class="publication-title">预览标题</h1>
      <p class="publication-description">摘要</p>
    </section>
    <section class="article-body"><h1>原文一级标题</h1><p>原文</p>
      <img src="assets/photo.jpg" data-publish-src="https://example.com/photo.jpg">
    </section></section>`);
  try {
    const original = dom.window.document.querySelector('#publication');
    const publication = publicationContent(original);
    assert.equal(publication.querySelector('.publication-title'), null);
    assert.equal(publication.querySelector('.publication-description').textContent, '摘要');
    assert.equal(publication.querySelector('h1').textContent, '原文一级标题');
    assert.equal(publication.querySelector('img').getAttribute('src'), 'https://example.com/photo.jpg');
    assert.equal(publication.querySelector('[data-publish-src]'), null);
    assert.equal(publicationContent(original, { bodyOnly: true })
      .querySelector('.publication-header'), null);
    assert.ok(original.querySelector('.publication-title'));
    assert.equal(original.querySelector('img').getAttribute('src'), 'assets/photo.jpg');
    original.querySelector('.publication-description').remove();
    assert.equal(publicationContent(original).querySelector('.publication-header'), null);
  } finally {
    dom.window.close();
  }
});

test('publication images use theme sizing and preserve their full proportions', async () => {
  const input = '---\ntitle: test\n---\n\n'
    + '{% include travel-photo.html src="/portrait.jpg" alt="竖幅" width=768 height=1024 %}';
  const { body } = await convert(input, '2026-01-01-test.md',
    { url: 'https://example.com' }, root);
  const dom = new JSDOM(await render(body,
    'img { width: 100%; height: auto; } .publication-portrait { width: 72%; }'));
  try {
    const image = dom.window.document.querySelector('img');
    assert.equal(image.style.width, '72%');
    assert.equal(image.style.height, 'auto');
    assert.equal(image.width, 768);
    assert.equal(image.height, 1024);
  } finally {
    dom.window.close();
  }
});

test('display and inline equations support the notation used by the posts', async () => {
  const dom = new JSDOM(await render(
    '$$\\frac{\\cancel{S}}{s}$$\n\nText $$\\cancel{S}$$ remains inline\n',
    await readFile(path.join(root, 'wechat/themes/common.css'), 'utf8')));
  try {
    assert.ok(dom.window.document.querySelector('.block-equation svg'));
    assert.ok(dom.window.document.querySelector('.inline-equation svg'));
    assert.equal(dom.window.document.querySelector('[data-mml-node="merror"]'), null);
  } finally {
    dom.window.close();
  }
});
