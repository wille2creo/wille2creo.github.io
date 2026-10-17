#!/usr/bin/env node
import { readFile, realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { build, outRoot } from './build.mjs';

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    theme: { type: 'string' }, port: { type: 'string', default: '0' },
    'no-open': { type: 'boolean', default: false }, help: { type: 'boolean' },
  } });
  const [command, article] = positionals;
  if (values.help || !command) {
    console.log('npm run wechat:preview -- <_posts/zh/article.md> [--theme essay|travel] [--port 4173] [--no-open]\nnpm run wechat:export -- <_posts/zh/article.md> [--theme essay|travel]');
  } else {
    if (!['preview', 'export'].includes(command) || !article || positionals.length !== 2) {
      throw new Error('用法：wechat:preview 或 wechat:export -- <_posts/zh/article.md>');
    }
    const port = Number(values.port);
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('端口应为 0–65535');
    const result = await build(article, values.theme);
    console.log(`已导出：${result.outDir}\n主题：${result.manifest.metadata.theme}；正文图片：${result.manifest.images.length}`);
    if (command === 'preview') {
      const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
        '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
      const server = createServer(async (req, res) => {
        try {
          const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
          if (pathname.split('/').some(part => part.startsWith('.build-'))) {
            throw new Error('not found');
          }
          if (pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
          if (pathname === '/') {
            res.writeHead(302, { Location: `/${encodeURIComponent(result.slug)}/preview.html` }).end();
            return;
          }
          const file = await realpath(path.resolve(outRoot, `.${pathname}`));
          if (!file.startsWith(outRoot + path.sep) || !(await stat(file)).isFile()) throw new Error('not found');
          res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream',
            'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
          res.end(await readFile(file));
        } catch { res.writeHead(404).end('Not found'); }
      });
      server.on('error', error => { console.error(error.message); process.exitCode = 1; });
      server.listen(port, '127.0.0.1', () => {
        const url = `http://127.0.0.1:${server.address().port}/${encodeURIComponent(result.slug)}/preview.html`;
        console.log(`预览：${url}\nCtrl+C 停止。修改源文或主题后重新运行命令。`);
        if (!values['no-open']) {
          const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer.exe' : 'xdg-open';
          spawn(opener, [url], { stdio: 'ignore' }).on('error', () => console.log('请手动打开上方地址'));
        }
      });
    }
  }
} catch (error) {
  console.error(`出版失败：${error.message}`);
  process.exitCode = 1;
}
