import { readFile, writeFile, mkdir, copyFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { parse } from 'yaml';
import { convert, escapeHTML, publicURL } from './convert.mjs';
import { publishBundle } from './bundle.mjs';
import { publicationContent } from './publication.js';
import { render, renderer } from './render.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const outRoot = path.join(root, 'wechat/out');
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function imageExtension(bytes) {
  if (bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return '.jpg';
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return '.png';
  if (bytes.subarray(0, 3).toString() === 'GIF') return '.gif';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return '.webp';
  throw new Error('图片必须是 JPEG、PNG、GIF 或 WebP；SVG/其他格式请先准备微信可用的副本');
}

async function prepareAsset(url, context, outDir, cache) {
  const siteBase = new URL(`${context.site.url}${context.site.baseurl || ''}/`);
  const target = new URL(url);
  let bytes;
  let localPath;
  // Prefer repository bytes, even when the corresponding blog change is unpublished.
  if (target.origin === siteBase.origin && target.pathname.startsWith(siteBase.pathname)) {
    const relative = decodeURIComponent(target.pathname.slice(siteBase.pathname.length));
    localPath = await realpath(path.resolve(root, relative));
    if (!localPath.startsWith(root + path.sep)) throw new Error(`图片超出仓库：${url}`);
    bytes = await readFile(localPath);
  } else {
    const cached = path.join(cache, hash(url));
    try { bytes = await readFile(cached); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`图片请求失败 ${response.status}：${url}`);
      bytes = Buffer.from(await response.arrayBuffer());
      imageExtension(bytes);
      await writeFile(cached, bytes);
    }
  }
  const digest = hash(bytes);
  const asset = `assets/${digest.slice(0, 16)}${imageExtension(bytes)}`;
  await writeFile(path.join(outDir, asset), bytes);
  return { url, asset, sha256: digest, bytes: bytes.length,
    ...(localPath ? { source: path.relative(root, localPath) } : {}) };
}

function checkContent(document) {
  if (!document.querySelector('#publication .article-body')) throw new Error('渲染器没有返回预期文章结构');
  if (document.querySelector('script, style, iframe, video, audio, form, object, embed')) {
    throw new Error('正文包含微信不支持的活动内容；请添加明确的转换规则');
  }
  for (const element of document.querySelectorAll('*')) {
    for (const attr of [...element.attributes]) {
      if (/^on/i.test(attr.name)) throw new Error(`正文含活动属性：${attr.name}`);
    }
  }
}

export async function build(article, {
  theme: requestedTheme, outputRoot = outRoot,
} = {}) {
  const file = await realpath(path.resolve(root, article));
  if (!file.startsWith(path.join(root, '_posts/zh') + path.sep) || !file.endsWith('.md')) {
    throw new Error('请选择 _posts/zh/ 内的 Markdown 文章');
  }
  const source = await readFile(file, 'utf8');
  const site = parse(await readFile(path.join(root, '_config.yml'), 'utf8'));
  const converted = await convert(source, file, site, root);
  const theme = requestedTheme ?? converted.metadata.theme;
  if (!['essay', 'travel'].includes(theme)) throw new Error('主题只能是 essay 或 travel');
  const slug = path.basename(file, '.md');
  const outDir = path.join(outputRoot, slug);
  const manifest = await publishBundle(outDir, staging =>
    writeBundle(staging, { source, file, converted, theme }));
  return { outDir, slug, manifest };
}

async function writeBundle(outDir, { source, file, converted, theme }) {
  const cache = path.join(root, 'wechat/.cache');
  await mkdir(path.join(outDir, 'assets'), { recursive: true });
  await mkdir(cache, { recursive: true });
  const metadata = { ...converted.metadata, theme };
  // Front Matter is data; the header is outside the original article body.
  const header = `<header class="publication-header"><h1 class="publication-title">${escapeHTML(metadata.title)}</h1>${metadata.description
    ? `<p class="publication-description">${escapeHTML(metadata.description)}</p>` : ''}</header>`;
  const markdown = `${header}\n\n<section class="article-body">\n\n${converted.body}\n</section>\n`;
  const inputFile = path.join(outDir, 'input.md');
  const css = (await Promise.all(['common', theme].map(name =>
    readFile(path.join(root, `wechat/themes/${name}.css`), 'utf8')))).join('\n');
  const themeFile = path.join(outDir, 'theme.css');
  await writeFile(inputFile, markdown);
  await writeFile(path.join(outDir, 'body.md'), converted.body);
  await writeFile(themeFile, css);
  const dom = new JSDOM(await render(markdown, css));
  try {
    const document = dom.window.document;
    checkContent(document);
    const section = document.querySelector('#publication');
    const images = [];
    const assets = new Map();
    const assetFor = async url => {
      if (!assets.has(url)) assets.set(url, await prepareAsset(url, converted.context, outDir, cache));
      return assets.get(url);
    };
    for (const [index, img] of [...section.querySelectorAll('img')].entries()) {
      const url = publicURL(img.getAttribute('src'), converted.context);
      if (!/^https?:\/\//.test(url)) throw new Error(`图片必须有公开 HTTP(S) 地址：${url}`);
      const asset = await assetFor(url);
      img.setAttribute('src', url);
      img.removeAttribute('srcset');
      img.removeAttribute('loading');
      img.removeAttribute('decoding');
      images.push({ number: index + 1, alt: img.getAttribute('alt') ?? '', ...asset });
    }
    for (const a of section.querySelectorAll('a[href]')) {
      a.setAttribute('href', publicURL(a.getAttribute('href'), converted.context));
    }
    const cover = metadata.cover ? await assetFor(metadata.cover) : null;
    // Conservative clipboard vocabulary: semantic figures/header become sections;
    // styles already exist inline, so no stylesheet or class is needed after paste.
    for (const element of [...section.querySelectorAll('figure, figcaption, header, article')]) {
      if (element.tagName === 'FIGCAPTION') element.classList.add('publication-caption');
      const replacement = document.createElement('section');
      for (const attr of element.attributes) replacement.setAttribute(attr.name, attr.value);
      replacement.replaceChildren(...element.childNodes);
      element.replaceWith(replacement);
    }
    const body = section.querySelector('.article-body');
    const text = body.textContent.replace(/\s+/g, '');
    const blocks = [...body.querySelectorAll('p, h1, h2, h3, h4, h5, h6')]
      .map(x => ({ tag: x.tagName.toLowerCase(), text: x.textContent }));
    // The title is preview metadata; WeChat has its own separate title field.
    const fragment = publicationContent(section).outerHTML;
    await writeFile(path.join(outDir, 'article.html'), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHTML(metadata.title)}</title></head><body style="width:390px;max-width:100%;margin:0 auto">${fragment}</body></html>\n`);
    await writeFile(path.join(outDir, 'fragment.html'), fragment + '\n');
    const manifest = {
      source: path.relative(root, file), source_sha256: hash(source),
      renderer, metadata, cover, images,
      body_text_sha256: hash(text), blocks,
      warnings: [
        '图片使用原始公开地址；微信可能拦截外链或粘贴后丢图。请按编号上传 assets 中的图片并替换。',
        '本地预览不代表微信中的最终效果。需在后台粘贴、保存草稿并用微信手机预览复核。',
        '微信可能移除站外链接；正文链接与图片署名均予以保留，发布前人工检查。',
      ],
    };
    await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    // Only preview src differs. Clipboard restores each public src on a clone.
    for (const [index, img] of [...section.querySelectorAll('img')].entries()) {
      img.setAttribute('data-publish-src', images[index].url);
      img.setAttribute('src', images[index].asset);
    }
    const template = await readFile(path.join(root, 'wechat/preview.html'), 'utf8');
    const gallery = images.map(img => `<li><a href="${escapeHTML(img.asset)}" download="${String(img.number).padStart(2, '0')}${path.extname(img.asset)}">下载图片 ${img.number}</a><span>${escapeHTML(img.alt)}</span></li>`).join('');
    const preview = template.replace('<!--TITLE-->', escapeHTML(metadata.title))
      .replace('<!--THEME-->', theme === 'essay' ? '随笔' : '旅行')
      .replace('<!--ARTICLE-->', section.outerHTML)
      .replace('<!--IMAGES-->', gallery || '<li>正文没有图片</li>')
      .replace('<!--COVER-->', cover ? `<a href="${escapeHTML(cover.asset)}" download>下载封面原图</a>` : '未指定封面');
    await writeFile(path.join(outDir, 'preview.html'), preview);
    for (const name of ['preview.js', 'preview.css', 'publication.js']) {
      await copyFile(path.join(root, 'wechat', name), path.join(outDir, name));
    }
    return manifest;
  } finally {
    dom.window.close();
  }
}
