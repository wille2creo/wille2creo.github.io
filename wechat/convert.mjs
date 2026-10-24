import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function frontMatter(source) {
  const match = source.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error('文章必须包含 YAML Front Matter');
  const data = parse(match[1]);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Front Matter 必须是映射');
  }
  return { data, body: source.replace(/^\uFEFF/, '').slice(match[0].length) };
}

// This is a deliberately bounded adapter, not a Liquid or Markdown engine.
// Unknown Liquid fails visibly so a new component cannot silently lose prose.
function valueOf(token, context) {
  if (/^(["']).*\1$/s.test(token)) return token.slice(1, -1);
  if (/^\d+$/.test(token)) return token;
  if (/^(page|site)\.[\w.]+$/.test(token)) {
    const value = token.split('.').reduce((obj, key) => obj?.[key], context);
    if (value == null) throw new Error(`无法解析 Liquid 变量：${token}`);
    return value;
  }
  throw new Error(`不支持的 Liquid 值：${token}`);
}

function parameters(input, context) {
  const result = {};
  let rest = input.trim();
  while (rest) {
    const match = rest.match(/^([\w-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s]+)(?:\s+|$)/s);
    if (!match) throw new Error(`无法解析图片参数：${rest}`);
    result[match[1]] = valueOf(match[2], context);
    rest = rest.slice(match[0].length);
  }
  return result;
}

export function publicURL(input, { site, article }) {
  const value = String(input).trim();
  if (/^(https?:|mailto:|tel:|#)/i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (/^[a-z][\w+.-]*:/i.test(value)) throw new Error(`不支持的资源协议：${value}`);
  const base = new URL(`${site.url}${site.baseurl || ''}/`);
  // Jekyll's relative_url applies baseurl to paths beginning with '/'.
  if (value.startsWith('/')) return new URL(value.slice(1), base).href;
  return new URL(value, new URL(article.replace(/^\//, ''), base)).href;
}

async function documentLink(name, context, root) {
  root = await realpath(root);
  const file = await realpath(path.resolve(root, name.trim().replace(/^\//, '')));
  if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile()) {
    throw new Error(`无效 link 目标：${name}`);
  }
  const relative = path.relative(root, file).split(path.sep).join('/');
  const hidden = relative.split('/').some((part, index) =>
    part.startsWith('.') || (part.startsWith('_')
      && !(index === 0 && part === '_posts')));
  const excluded = (context.site.exclude ?? []).some(entry => {
    const prefix = String(entry).replace(/^\/+|\/+$/g, '');
    return relative === prefix || relative.startsWith(prefix + '/');
  });
  if (hidden || excluded) throw new Error(`link 目标未公开：${name}`);
  if (!/\.(md|markdown|html)$/i.test(file)) {
    return publicURL(`/${relative}`, context);
  }
  const source = await readFile(file, 'utf8');
  if (!/^\uFEFF?---\r?\n/.test(source)) {
    return publicURL(`/${relative}`, context);
  }
  const { data } = frontMatter(source);
  if (relative.startsWith('_posts/')) {
    return publicURL(postRoute(file, data, context.site), context);
  }
  const defaultRoute = `/${relative.replace(/\.(md|markdown)$/i, '.html')}`
    .replace(/\/index\.html$/, '/');
  const route = data.permalink ?? defaultRoute;
  if (!route.startsWith('/') || /:[a-z_]+/i.test(route)) {
    throw new Error(`link 目标的 permalink 需要明确适配：${route}`);
  }
  return publicURL(route, context);
}

function photo(name, args, context) {
  const a = parameters(args, context);
  const src = a.src ?? a.light;
  if (!src) throw new Error(`${name} 缺少 src/light`);
  const attrs = ['width', 'height'].map(key => a[key] && /^\d+$/.test(String(a[key]))
    ? ` ${key}="${a[key]}"` : '').join('');
  const portrait = Number(a.height) > Number(a.width) && Number(a.width) > 0;
  const orientation = portrait ? ' class="publication-portrait"' : '';
  const image = `<img src="${escapeHTML(publicURL(src, context))}" alt="${escapeHTML(a.alt)}"${attrs}${orientation}>`;
  const linked = a.link
    ? `<a href="${escapeHTML(publicURL(a.link, context))}">${image}</a>` : image;
  const caption = a.credit ?? a.caption;
  return `\n\n<figure class="publication-photo">${linked}${caption
    ? `<figcaption>${escapeHTML(caption)}</figcaption>` : ''}</figure>\n\n`;
}

export function postRoute(file, data, site) {
  const match = path.basename(file).match(/^(\d{4})-(\d{2})-(\d{2})-(.+)\.[^.]+$/);
  if (!match) throw new Error('文章文件名必须是 YYYY-MM-DD-title.md');
  const date = String(data.date ?? match.slice(1, 4).join('-'));
  const parts = date.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[ T])/);
  if (!parts) throw new Error(`不支持的文章日期：${date}`);
  const [, year, month, day] = parts;
  const slug = String(data.slug ?? match[4].replace(/\.+$/, ''));
  // Jekyll 4's UrlDrop uses cased "pretty" for :title and default for :slug.
  // Keep this small adapter covered against the actual Jekyll canonical URLs.
  const slugify = (value, pretty = false) => value.replace(pretty
    ? /[^\p{M}\p{L}\p{Nd}._~!$&'()+,;=@]+/gu
    : /[^\p{M}\p{L}\p{Nd}]+/gu, '-').replace(/^-|-$/g, '');
  const tokens = {
    year, month, day, i_month: String(Number(month)), i_day: String(Number(day)),
    title: slugify(slug, true), slug: slugify(slug).toLowerCase(),
  };
  const template = String(data.permalink ?? site.permalink ?? '/:year/:month/:day/:title/');
  if (!template.startsWith('/')) throw new Error(`不支持的 permalink：${template}`);
  const route = template.replace(/:([a-z_]+)/g, (all, key) => {
    if (!(key in tokens)) throw new Error(`不支持的 permalink 占位符：${key}`);
    return encodeURI(tokens[key]);
  });
  // Match Jekyll::URL's path cleanup; explicit permalinks can contain dots.
  return `/${route}`.replaceAll('..', '/').replaceAll('./', '').replace(/\/+/g, '/');
}

export async function convert(source, file, site, root) {
  const { data, body } = frontMatter(source);
  if (typeof data.title !== 'string' || !data.title.trim()) throw new Error('文章缺少标题');
  const article = postRoute(file, data, site);
  const context = { page: data, site, article };
  // Protect fenced and inline code from Liquid adaptation.
  const code = [];
  let converted = body.replace(/{%\s*raw\s*%}([\s\S]*?){%\s*endraw\s*%}/g,
    (all, literal) => `\u0000CODE${code.push(literal) - 1}\u0000`);
  converted = converted.replace(/^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[^\n]*$/gm,
    text => `\u0000CODE${code.push(text) - 1}\u0000`);
  converted = converted.replace(/(`+)([^`]|(?!\1)`)*?\1/g,
    text => `\u0000CODE${code.push(text) - 1}\u0000`);
  converted = converted.replace(/{%\s*comment\s*%}[\s\S]*?{%\s*endcomment\s*%}/g, '');
  converted = converted.replace(/{%\s*include\s+([\w.-]+)([\s\S]*?)%}/g,
    (all, name, args) => {
      if (!['travel-photo.html', 'artwork.html', 'artwork-image.html'].includes(name)) {
        throw new Error(`尚未支持组件 ${name}；请添加适配，不能跳过正文`);
      }
      return photo(name, args, context);
    });
  const postTags = [...converted.matchAll(/{%\s*post_url\s+([^%]+?)\s*%}/g)];
  for (const [tag, name] of postTags) {
    const target = path.resolve(root, '_posts', `${name}.md`);
    if (!target.startsWith(path.join(root, '_posts') + path.sep)) throw new Error('无效 post_url');
    const targetData = frontMatter(await readFile(target, 'utf8')).data;
    const url = publicURL(postRoute(target, targetData, site), context);
    converted = converted.replace(tag, () => url);
  }
  const linkTags = [...converted.matchAll(/{%\s*link\s+([^%]+?)\s*%}/g)];
  for (const [tag, name] of linkTags) {
    const url = await documentLink(name, context, root);
    converted = converted.replace(tag, () => url);
  }
  converted = converted.replace(/{{\s*(.*?)\s*}}/g, (all, expression) => {
    const [input, ...filters] = expression.split('|').map(x => x.trim());
    let result = valueOf(input, context);
    for (const filter of filters) {
      if (['relative_url', 'absolute_url'].includes(filter)) result = publicURL(result, context);
      else if (filter === 'escape') result = escapeHTML(result);
      else throw new Error(`不支持 Liquid filter：${filter}`);
    }
    return String(result);
  });
  if (/{[{%]/.test(converted)) throw new Error('尚有未支持的 Liquid；请添加明确适配');
  // Flatten only layout containers; preserve all text and source order.
  const wrappers = [];
  converted = converted.replace(/<\/?div\b[^>]*>/gi, tag => {
    if (/^<\/div/i.test(tag)) return wrappers.pop() ? '\n\n' : tag;
    const flatten = /\bmarkdown\s*=\s*["']1["']|\btravel-(passage|pair)\b/.test(tag);
    wrappers.push(flatten);
    return flatten ? '\n\n' : tag;
  });
  // Later captures can contain earlier raw/code captures. Restore in reverse
  // order so every nested placeholder is expanded exactly once.
  for (let i = code.length - 1; i >= 0; i--) {
    converted = converted.replaceAll(`\u0000CODE${i}\u0000`, () => code[i]);
  }
  const classes = Array.isArray(data.classes) ? data.classes : String(data.classes ?? '').split(/\s+/);
  const theme = data.wechat?.theme ?? (classes.includes('travel-essay') ? 'travel' : 'essay');
  const cover = data.cover ?? data.header?.image ?? data.artwork?.light;
  const metadata = {
    title: data.title,
    description: String(data.excerpt ?? data.description ?? '').trim(),
    date: String(data.date ?? path.basename(file).slice(0, 10)),
    cover: cover ? publicURL(cover, context) : null,
    source_url: publicURL(article, context),
    theme,
  };
  return { body: converted.trim() + '\n', metadata, context };
}
