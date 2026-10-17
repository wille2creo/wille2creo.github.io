# 震之 · 微信公众号出版工具

中文博文仍只在 `_posts/zh/` 写作。本目录负责适配 Jekyll、调用
Wenyan CLI 排版、整理图片和本地预览。没有公众号 API、账号配置或自动发布。

## 安装与使用

需要 Node.js 22.21+（22.x），或 24 及以上，首次安装：

```sh
npm ci --ignore-scripts
npm run wechat:preview -- _posts/zh/2026-08-30-观雷.md
npm run wechat:preview -- _posts/zh/2026-10-17-达科他五日.md
```

命令先重新生成，再启动仅监听 `127.0.0.1` 的静态预览服务器，自动打开浏览器。
端口默认自动分配，终端显示地址；Ctrl+C 停止。可用 `--port 4173` 固定端口、
`--no-open` 关闭自动打开。修改文章或主题后，重新运行命令并刷新页面。
正在运行的服务器也可以浏览 `wechat/out/` 内其他已生成文章。

只导出、不启动服务：

```sh
npm run wechat:export -- _posts/zh/2026-08-30-观雷.md
npm run wechat:export -- _posts/zh/2026-10-17-达科他五日.md
# 可选：手动指定主题，不需要修改原文
npm run wechat:preview -- _posts/zh/2026-08-30-观雷.md --theme essay
```

默认主题来自可选的 `wechat.theme` Front Matter；否则根据
`classes: travel-essay` 选择 Travel，其余使用 Essay。两个原型无需改动原文。

## 从预览到公众号编辑器

1. 桌面浏览器中检查全文。预览宽度可选 375 / 390 / 430 px；窄屏自动收缩。
2. “复制摘要和正文”和 HTML 导出默认只包含摘要与完整正文。
   标题仅在预览中显示，不进入复制或导出的文章内容；不显示作者和具体日期。
   如果不需要正文中的摘要，使用“仅复制正文”。后台的标题、摘要、
   封面字段始终需要人工填写，信息可从 `manifest.json` 查看。
3. 到公众号编辑器粘贴。剪贴板同时写入 `text/html` 和 `text/plain`；HTML
   中样式已经内联，图片恢复为原始公开 HTTPS 地址，不含 localhost 图片链接。
4. 复制受限时会尝试浏览器兼容复制；仍失败则选中相应内容，按 ⌘C / Ctrl+C。
   页面上的“选中正文”也可主动使用。使用预览页时选区复制仍会替换图片地址。
   也可直接打开 `article.html`，选中显示的文章复制，**不要粘贴 HTML 源码**。
   交互预览页需通过预览命令提供的 HTTP 地址打开。
5. 展开“复制、图片与手动操作”，按编号下载原图。若微信外链抓取失败，
   在原位置上传对应图片替换；图片仍要核对顺序、完整比例、alt 和 Flickr 署名。
   本地预览使用本地副本，所以本地显示成功并不能证明微信能抓取公开地址。
6. 保存草稿，用微信手机预览，核对排版、图片、站外链接、署名及摘要。
   最后由作者自行发布。

底部“在本地试粘贴”可检查系统剪贴板确实含富文本、样式和图片。
它是浏览器剪贴板测试区，不能模拟微信的清洗和图片转存规则。
站外链接可能被微信过滤；工具保留原链接，不增加脚注或改写文章。
字体依赖手机系统，微信也可能调整字号、段距或移除样式，需实机确认。

## 输出与文件分工

输出位于 `wechat/out/<文章文件名>/`，全部忽略提交，可重复生成：

| 文件 | 用途 |
| --- | --- |
| `body.md` | 仅完成 Jekyll 适配的正文，便于对照原文 |
| `input.md` | Wenyan 输入，含独立排版的页首与正文 |
| `theme.css` | 公共主题与当前变体的合并结果 |
| `article.html` | 完整 HTML 导出，图片使用公开地址 |
| `fragment.html` | 可供剪贴板使用的内联样式 HTML 片段 |
| `preview.html` / `.css` / `.js` | 本地 HTTP 预览，用打包图片显示 |
| `publication.js` | 复制与导出共用的文章内容规则 |
| `assets/` | 正文与封面原图；按内容散列命名，不裁剪、不压缩 |
| `manifest.json` | 标题、日期、摘要、封面、原文地址、原文 SHA256、正文块及图片顺序/alt/SHA256 |

`convert.mjs` 只处理 Jekyll 边界；`build.mjs` 调用 CLI 并整理产物；
`bundle.mjs` 负责完整产物的暂存和替换；`publication.js` 统一复制与导出的内容规则；
`cli.mjs` 提供命令和静态服务器；主题在 `themes/`；预览 UI 与文章样式分离。
Jekyll 显式排除 `wechat/`、Node 依赖及 package 文件，不改变网站页面。

支持多行 `travel-photo.html`、`artwork.html`、`artwork-image.html` 图片组件，
`page.*` 元数据、URL/escape filters、`post_url`、`link`、代码和 raw 区域。
文章地址按 Jekyll 的 `:title` / `:slug` 规则生成，支持原文的 slug、日期和
permalink 覆盖；不支持的 URL 占位符会报错。
`travel-passage` / `travel-pair` / `div markdown="1"` 仅去除布局容器，保留
原来的段落与图片顺序。其他普通 HTML、Markdown 引文、强调和换行交给 Wenyan。
未知 Liquid 或不支持的活动内容直接报错，不静默丢弃。当前不接受 SVG 图片；
遇到新组件或资源格式应明确添加适配，再验证，不能绕过报错删除正文。

同站图片从仓库读取，远程图片首次下载并缓存在 `wechat/.cache/`；首次导出需联网。
缓存存在后可离线重复导出。远端照片更新后，可删除此生成缓存再运行。
每次先在独立目录生成完整产物，成功后才替换正式目录；失败时清理暂存，
保留上一份完整产物。不要把失败后保留的旧导出视为本次结果。
成功重建会移除旧版本中已不再使用的打包资源。源码与所有图片均不修改。

## 主题设计

公共语言：白纸 `#ffffff`、石墨 `#373a36`、标题墨色 `#282e2b`、
灰绿次要文字 `#6a706a`、克制链接色 `#526557`。系统黑体正文 16 px、
宋体标题 30 px，章节 25 / 23 / 21 / 19 / 17 px，字距 0.5 px，
左右留白 22 px。全部左对齐，避免窄屏两端对齐产生不规则字距。

Essay 正文行高 2，段距 27 px；Travel 行高 1.95，段距 25 px。
章节用留白过渡，原生引用用细线与低一阶文字表达，`cite` 单独处理出处。
摄影保持天然比例，图片组件按原有宽高标记竖幅；Travel 主题将竖幅缩至正文宽度的
86%，横幅铺满正文宽度。图片大小与间距全部由主题控制。
只显示作者提供的图片说明/署名，不把 alt 自动变成新增说明。
结尾保留作者末段，以页尾留白收束，不添加“金句”、关注话术或装饰。

CSS 使用 Wenyan 自定义主题机制，由 CLI 转为内联样式；不使用外部字体、
渐变、伪元素、CSS 变量、依赖媒体查询的文章样式。语义 figure / figcaption /
header 在样式内联后转换为 section，使复制片段使用较保守的标签集合。
Wenyan 会把 Front Matter 的 description 自动变成引文，因此它只保存在
manifest 中，输入页首显式渲染一次。关闭链接转脚注与 Mac 代码块装饰。

## 验证与扩展

```sh
npm run wechat:test
```

本次实际运行结果和微信待验收项见 [验证记录](VALIDATION.md)。

命令先重建 Jekyll，避免旧 `_site` 被当作当前原文的参考。
测试会重新渲染两篇原型，独立读取 Jekyll 从原始文章生成的 `_site`，逐块比较
标题、每一段文字、强调、图片/alt/署名及其顺序，并检查图片文件散列、主题内联、
重复摘要和 Jekyll 输出隔离。另检查未知组件报错、代码原样保留、段落/引用/换行、
URL 解析，以及第三篇《落基山十三日》的通用转换。
此外检查所有中文博文的 URL 与 Jekyll canonical 一致、嵌套代码/raw 内容完整、
失败重建保留完整旧版本，以及修改主题 CSS 确实改变竖幅宽度。

新增主题时编辑公共 CSS 或变体，并以真实文章预览。Wenyan 的 CSS 应用器按
规则顺序内联，不能假设浏览器完整的 CSS 级联行为。新增组件时仅添加边界适配，
Markdown 解析继续使用 Wenyan，不创建第二个渲染器。

本次核对官方 [CLI 文档](https://github.com/caol64/wenyan-cli) 和
[主题文档](https://github.com/caol64/wenyan-cli/blob/main/docs/theme.md)，
并以安装版本的 `wenyan render --help` 与实现核实参数。
固定 `@wenyan-md/cli@2.0.12`，实际执行：

```sh
wenyan render --file input.md --custom-theme theme.css --no-footnote --no-mac-style
```

锁文件提供可重复安装。本次 npm audit 无 high/critical，但 Wenyan 间接依赖仍有
7 moderate / 1 low 报告；没有强制回退 CLI 或更改其渲染依赖。
升级时应检查上游修复并重跑内容对照与复制验证。

后续可在单独授权和设计后增加草稿箱图片上传；本原型不包含该功能。
