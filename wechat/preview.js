import { publicationContent } from './publication.js';

const article = document.querySelector('#publication');
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

document.querySelector('#select').addEventListener('click', selectBody);
document.querySelector('#width').addEventListener('change', event => {
  document.querySelector('#paper').style.width = `${event.target.value}px`;
});

async function copy(bodyOnly) {
  const clone = publicationContent(article, { bodyOnly });
  const html = clone.outerHTML;
  const text = clone.textContent;
  try {
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' }),
    })]);
    status.textContent = '已复制带内联样式的富文本。粘贴到公众号后，请逐张核对图片并保存草稿试读。';
  } catch {
    status.textContent = '复制失败，请检查浏览器的剪贴板权限后重试。';
  }
}

// Manual selection copy uses the same public src as the copy buttons.
// Preserve the selected range and its inline ancestry (font/spacing on #publication).
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
