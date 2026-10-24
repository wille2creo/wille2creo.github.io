# 震之 · 微信公众号出版工具

文章只在 `_posts/zh/` 写作。工具生成本地 HTML、原图清单和预览页面，
由作者复制到公众号编辑器，保存草稿并用手机验收后发布。

## 使用

使用 `.node-version` 指定的 Node 版本：

```sh
npm ci --ignore-scripts
npm run wechat:preview -- _posts/zh/2026-10-17-达科他五日.md
npm run wechat:export -- _posts/zh/2026-08-30-观雷.md
```

预览服务只监听 `127.0.0.1`，自动分配端口并打开浏览器。用 `--port 4173`
固定端口，`--no-open` 关闭自动打开。修改源文或主题后重新运行命令。
Ctrl+C 停止服务；其他已生成的文章也可以通过同一服务浏览。

主题可通过 `--theme essay|travel` 或文章的 `wechat.theme` 指定。
未指定时，`classes: travel-essay` 使用 Travel，其余使用 Essay。
主题 CSS 位于 `themes/`，同时控制导出和复制内容的字体、行距、段距与图片比例。

## 复制与发布

1. 在预览页检查全文、摘要、图片和署名。阅读宽度可选 375 / 390 / 430 px。
2. 点击“复制摘要和正文”或“仅复制正文”。复制使用浏览器 Clipboard API；
   失败时检查权限后重试。“选中正文”提供直接选择正文的操作。
3. 在公众号编辑器粘贴。标题、摘要字段与封面需要另外填写，信息见
   `manifest.json`。导出 HTML 和默认复制内容包含摘要与正文，标题仅在预览显示。
4. 图片使用公开地址。本地预览使用打包原图，不能证明微信能接收外链。
   按清单检查每张图片；外链抓取失败时，在原位置上传对应原图。
5. 保存草稿并用微信手机预览，检查排版、图片、站外链接、署名与摘要后发布。

预览页支持正文选区复制，并在复制时恢复图片的公开地址。也可打开
`article.html` 复制文章；不要粘贴 HTML 源码。底部的本地粘贴检查区用于
检查系统剪贴板，不模拟微信的内容清洗与图片转存。

## 结构与输出

- `convert.mjs`：解析文章元数据和使用中的 Jekyll 图片、链接语法。
- `render.mjs`：Marked 解析 Markdown，MathJax 4 排版公式，css-inline 内联主题 CSS。
- `build.mjs`：编排转换、图片打包、导出与预览。
- `bundle.mjs`：完整生成后才替换正式目录，失败时恢复上一份完整产物。
- `publication.js`：统一导出、复制按钮与选区复制的内容规则。
- `cli.mjs`：命令入口和本地静态服务。

输出在 `wechat/out/<文章文件名>/`，不提交到 Git：

| 文件 | 内容 |
| --- | --- |
| `body.md` | Jekyll 语法转换后的正文 |
| `input.md` / `theme.css` | 排版输入和合并的主题 CSS |
| `article.html` / `fragment.html` | 完整导出与可复制的 HTML 片段 |
| `preview.html` / `.css` / `.js` | 本地预览 |
| `publication.js` | 复制和导出规则 |
| `assets/` | 按内容散列命名的原图，不裁剪或压缩 |
| `manifest.json` | 元数据、源文散列、正文块、图片顺序、alt 和图片散列 |

同站图片从仓库读取。远程图片下载到 `wechat/.cache/`，缓存存在后可离线导出。
远端图片更新后，删除对应缓存重新生成。构建失败会报告错误，上一份完整产物
不代表本次构建成功。成功构建移除不再使用的打包资源。

支持 `travel-photo.html`、`artwork.html`、`artwork-image.html`、`page.*`、
URL/escape filters、`post_url` 和 `link`。页面链接读取目标的 permalink；
缺失、未公开、仓库外目标或尚未支持的占位符会报错。布局容器展开后保持正文
与图片顺序。未知 Liquid 和活动 HTML 报错，不静默删除内容。

标题、摘要、摄影署名和正文保持独立；alt 不转为新增说明。文章不添加关注话术、
装饰或新的结语。主题使用系统字体、完整图片比例与内联样式，不下载网页字体。

## 检查

```sh
npm run wechat:test
```

检查先重建 Jekyll，再对照实际文章地址、段落、强调、图片、署名和顺序。
同时验证元数据、资源散列、主题 CSS、公式、未知语法报错、产物替换与网站隔离。
完整网站与浏览器检查见根目录 [README](../README.md)。
