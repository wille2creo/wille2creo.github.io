import { publicationContent } from './publication.js';

const article = document.querySelector('#wenyan');
const status = document.querySelector('#status');
const images = [...article.querySelectorAll('img')];
const selected = () => article.querySelector('.article-body');

function selectBody() {
  const range = document.createRange();
  range.selectNodeContents(selected());
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  status.textContent = '正文已选中。按 ⌘C / Ctrl+C，再到编辑器粘贴；图片仍需逐张核对。';
}

function selectPublication() {
  const range = document.createRange();
  range.selectNodeContents(article);
  const title = article.querySelector('.publication-title');
  if (title) range.setStartAfter(title);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  status.textContent = '摘要和正文已选中。按 ⌘C / Ctrl+C，再到编辑器粘贴；图片仍需逐张核对。';
}

document.querySelector('#select').addEventListener('click', selectBody);
document.querySelector('#width').addEventListener('change', event => {
  document.querySelector('#paper').style.width = `${event.target.value}px`;
});

async function copy(bodyOnly) {
  const clone = publicationContent(article, { bodyOnly });
  const html = clone.outerHTML;
  const text = clone.textContent;
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error('clipboard unavailable');
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' }),
    })]);
    status.textContent = '已复制带内联样式的富文本。粘贴到公众号后，请逐张核对图片并保存草稿试读。';
  } catch {
    // Native copy event still carries explicit HTML, not localhost img URLs.
    const range = document.createRange();
    range.selectNodeContents(article);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const listener = event => {
      event.preventDefault();
      event.clipboardData.setData('text/html', html);
      event.clipboardData.setData('text/plain', text);
    };
    document.addEventListener('copy', listener);
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { /* manual selection below */ }
    document.removeEventListener('copy', listener);
    if (copied) status.textContent = '已通过浏览器兼容方式复制富文本。粘贴后请核对图片。';
    else if (bodyOnly) selectBody();
    else selectPublication();
  }
}

// Manual selection copy uses the same public src as the copy buttons.
// Preserve the selected range and its inline ancestry (font/spacing on #wenyan).
document.addEventListener('copy', event => {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.toString()) return;
  const range = selection.getRangeAt(0);
  if (!article.contains(range.commonAncestorContainer)) return;
  const wrapper = article.cloneNode(false);
  if (range.commonAncestorContainer === selected()) {
    const body = selected().cloneNode(false);
    body.append(range.cloneContents());
    wrapper.append(body);
  } else wrapper.append(range.cloneContents());
  const publication = publicationContent(wrapper);
  event.preventDefault();
  event.clipboardData.setData('text/html', publication.outerHTML);
  event.clipboardData.setData('text/plain', publication.textContent);
});
document.querySelector('#copy').addEventListener('click', () => copy(false));
document.querySelector('#copy-body').addEventListener('click', () => copy(true));

Promise.all(images.map(img => img.decode().then(() => true, () => false))).then(results => {
  const failed = results.filter(ok => !ok).length;
  status.textContent = failed
    ? `${failed} 张图片加载失败；请检查资源后再复制。`
    : `${images.length} 张正文图片已加载。可复制富文本；微信后台仍需检查图片、链接与排版。`;
});
