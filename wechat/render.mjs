import { readFile } from 'node:fs/promises';
import { marked } from 'marked';
import { inlineFragment } from '@css-inline/css-inline';
import { JSDOM } from 'jsdom';
import { mathjax } from '@mathjax/src/js/mathjax.js';
import { TeX } from '@mathjax/src/js/input/tex.js';
import { SVG } from '@mathjax/src/js/output/svg.js';
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js';
import '@mathjax/src/js/util/asyncLoad/esm.js';
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import '@mathjax/src/js/input/tex/cancel/CancelConfiguration.js';

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const { devDependencies } = JSON.parse(await readFile(
  new URL('../package.json', import.meta.url), 'utf8'));
export const renderer = Object.fromEntries(['marked', '@css-inline/css-inline', '@mathjax/src']
  .map(name => [name, devDependencies[name]]));

export async function render(markdown, css) {
  const html = `<section id="publication">${marked.parse(markdown)}</section>`;
  const dom = new JSDOM(html);
  try {
    const content = dom.window.document;
    if (content.querySelector('script, style, iframe, video, audio, form, object, embed')) {
      throw new Error('正文包含不支持的活动内容');
    }
    // Match the posts' Kramdown convention: $$ is inline inside a paragraph
    // and displayed when it occupies the whole paragraph.
    const walker = content.createTreeWalker(content.body, dom.window.NodeFilter.SHOW_TEXT);
    const text = [];
    while (walker.nextNode()) text.push(walker.currentNode);
    for (const node of text) {
      if (node.parentElement.closest('pre, code')) continue;
      node.textContent = node.textContent.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
        const display = node.parentElement.tagName === 'P'
          && node.parentElement.textContent.trim() === match;
        return display ? `\\[${tex}\\]` : `\\(${tex}\\)`;
      });
    }
    const document = mathjax.document(content.body.innerHTML, {
      InputJax: new TeX({
        packages: ['base', 'ams', 'cancel'],
        formatError(_jax, error) { throw error; },
      }),
      OutputJax: new SVG({ fontCache: 'none' }),
    });
    await document.renderPromise();
    content.documentElement.innerHTML = adaptor.innerHTML(adaptor.root(document.document));
    const mathStyles = content.querySelector('#MJX-SVG-styles').textContent;
    const publication = content.querySelector('#publication');
    publication.outerHTML = inlineFragment(publication.outerHTML, css + mathStyles, {
      loadRemoteStylesheets: false,
    });
    for (const node of content.querySelectorAll('mjx-container')) {
      const wrapper = content.createElement('span');
      wrapper.className = node.hasAttribute('display')
        ? 'block-equation' : 'inline-equation';
      wrapper.style.cssText = node.style.cssText;
      wrapper.replaceChildren(...node.childNodes);
      node.replaceWith(wrapper);
    }
    return content.querySelector('#publication').outerHTML;
  } finally {
    dom.window.close();
  }
}
