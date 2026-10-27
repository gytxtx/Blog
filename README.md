# Blog

项目仓库：[gytxtx/Blog_Astro](https://github.com/gytxtx/Blog_Astro)。

基于 [Astro](https://astro.build/) 框架搭建的个人博客。由 Material for MkDocs 迁移而来，
迁移评估与方案见旧仓库的 `MIGRATION-ASSESSMENT.md` / `MIGRATION-PLAN.md`。

模块归属、主题与路由兼容契约、脚本清理方式和验收标准见 `THEME-GUIDE.md`。
全站布局、字号、空间尺度、公共控件与动效约定见 [DESIGN.md](./DESIGN.md)。

## 常用命令

```bash
npm ci                # 安装依赖
npm run dev -- --background # 后台开发；搜索弹窗显示开发预览提示
npm run build         # astro build（含标题字体子集）→ pagefind 索引
npm run check         # astro check 类型检查
npm test              # 内容转换、目录、请求恢复等单元回归
npm run test:browser  # 构建后运行 Chromium 浏览器回归
npm run preview       # 预览构建产物
npm run preview:worker # 构建后在本地 Workers 运行时预览
npm run deploy        # 构建并部署到 Cloudflare Workers
npm run check-urls    # URL 验收门：构建产物 vs 线上基线 diff
```

首次运行浏览器回归前执行 `npx playwright install chromium`。测试会启动并关闭
`127.0.0.1:4322` 的生产预览，截图和失败轨迹保存在系统临时目录
`blog-astro-playwright`，不会写入站点源码。第三方服务使用确定性模拟；真实搜索使用本次构建的索引。

样式入口为 `src/styles/global.css`，按功能导入 CSS；全站尺寸与字体变量在 `tokens.css`，
明暗配色在 `src/lib/theme.ts`。文章卡片、分页和页脚使用组件局部样式。
正文、友链、GitHub 卡片的公共外观统一在 `src/styles/cards.css`，尺寸变量仍集中在 `tokens.css`。
各类卡片仅保留自己的内容布局。归档首页与分页共用 `src/layouts/Archive.astro`，
年份、分类和标签分组统一由 `src/lib/post-groups.ts` 提供。
导航、搜索、主题和文章交互分别维护在 `src/lib/header.ts`、`search-control.ts`、
`theme-control.ts`、`navigation.ts`、`article-behaviors.ts`；目录和灯箱分别在 `toc-tracking.ts`、
`lightbox.ts`。普通页面功能通过 `page-lifecycle.ts` 注册挂载与清理；首帧主题引导由
`theme-bootstrap.ts` 生成，仍在 Base 内联执行。

响应式规则：960px 及以下使用折叠导航，跨断点切换后重置菜单状态；640px 及以下卡片单列，
480px 及以下完整日期独占一行并缩小卡片留白。导航、标签和阅读全文等触屏入口至少高 44px。
顶栏、正文和页脚使用安全区留白，搜索弹窗监听 VisualViewport，在横屏和软键盘弹出时
保留关闭入口并让结果单独滚动。浏览器回归包含 320–1180px 手机、平板横竖屏；软键盘和安全区采用模拟验证。

## 部署（Cloudflare Workers）

站点以 Workers 静态资源方式托管：`wrangler.toml` 的 `assets.directory` 指向 `dist`，
`npm run deploy` 会先构建再上传（首次使用先执行 `npx wrangler login`）。

Cloudflare 自动拉取仓库构建时，构建命令使用 `npm run build`，部署命令使用
`npx wrangler deploy`。`prebuild` 会检查 Git 历史：浅克隆自动执行
`git fetch --unshallow --no-tags origin`，完整仓库不发起网络请求；获取失败或历史仍不完整时
停止构建，避免关于/友链的更新日期缺失。该步骤只补全历史，不切换构建提交。

- `blog.gytxtx.top/*` 由 `wrangler.toml` 的 Worker 路由接入 `blog`，所属区域为 `gytxtx.top`。
  DNS 在 Cloudflare 控制台单独维护：`blog` 的 CNAME 指向 `cf.090227.xyz`，设为**仅 DNS（灰云）**，
  让访客使用优选域名的解析结果；该 DNS 记录不由 Wrangler 管理。
  不要再添加同名 Custom Domain，以免与优选 CNAME 冲突；HTTPS 证书在区域的 SSL/TLS 中管理。
- 默认的 `https://blog.<账户子域>.workers.dev` 可用于部署后验证与回退。
- `public/_redirects` 与 `public/_headers` 在 Workers 静态资源下同样生效；
  `public/CNAME` 仅为历史遗留，Workers 不读取。

## 友链卡片

`/links/` 的友链数据集中维护在 `src/data/friends.ts`，按数组顺序展示。每条记录包含
`name`（名称）、`url`（网站链接）、`avatar`（外部头像 URL）和可选的 `description`（简介）。
头像直接引用外部地址，不下载到仓库；加载失败时显示名称首字，空简介显示“暂无简介”。
卡片支持浅色与深色主题，桌面两列、手机一列，点击整张卡片会在新标签页打开网站。

## 正文自定义卡片

在 `.md` 文章中使用 `:::cards` 容器，每个无序列表项对应一张卡片。
第一行是顶部描述，第二行是更醒目的下方主标题；两处文字都允许自动换行，不截断。

```markdown
:::cards{columns=2}
- :icon[lucide:book-open] [从这里开始了解博客](/about/)
  阅读指南

- [查看官方使用说明](https://docs.astro.build)
  Astro 文档

- 不带链接的介绍文字
  展示卡片
:::
```

- `columns` 可填 `1`、`2`、`3`，省略时默认两列；宽度不超过 640px 时统一单列。
- 第一行开头可选 `:icon[lucide:图标名]`，使用项目已有的 Lucide 图标集，无需客户端脚本。
- 描述或标题中的一个 Markdown 链接会作用于整张卡片；站内链接在当前页打开，站外链接在新标签页打开。
  不填链接时显示普通展示卡片。每张卡片最多一个链接。
- 文字支持加粗、斜体、删除线与行内代码；卡片内不支持图片、嵌套列表或其他块内容。
- 列数、图标名或内容格式有误时会给出带源文件位置的构建错误。
- 容器前后留空行，第二行文字按 Markdown 列表规则缩进两格。只写一个列表项即可插入单张卡片；
  如需占满正文宽度，使用 `:::cards{columns=1}`。

## GitHub 仓库卡片

普通 `.md` 文章中，将带 `github-card` 标记的链接独占一段即可，前后留空行：

```markdown
[gytxtx/OpenJBD](https://github.com/gytxtx/OpenJBD "github-card")
```

链接文字为 `owner/repo` 时，简介自动获取；换成其他文字可作为自定义简介：

```markdown
[通过蓝牙连接 JBD 智能 BMS 的 Android 应用](https://github.com/gytxtx/OpenJBD "github-card")
```

### 多列仓库卡片

使用 `:::github-cards` 将仓库链接组成网格，`columns` 设置列数：

```markdown
:::github-cards{columns=2}
- [gytxtx/OpenJBD](https://github.com/gytxtx/OpenJBD)
- [为 AI Agent 提供 Windows 桌面观察与交互能力](https://github.com/gytxtx/kagami-desktop)
:::
```

`columns` 接受正整数，例如 `1`、`2`、`3`、`4`，省略时默认两列；宽度不超过 640px 时统一单列。
每个列表项只放一个仓库链接，容器内无需再写 `"github-card"`。简介仍由链接文字决定；
链接文字为 `owner/repo` 或仓库 URL 时自动获取简介，其他文字作为自定义简介。
也可以把原有带 `"github-card"` 的独立段落链接直接放进容器，链接之间留空行。
列数或链接格式有误时会报告源文件位置。原有单张卡片的写法和宽度保持不变。

容器外的普通链接、行内链接和代码块不转换。Astro 页面可直接使用同一组件：

```astro
---
import GitHubRepoCard from '../components/GitHubRepoCard.astro';
---

<GitHubRepoCard repo="gytxtx/OpenJBD" />
<GitHubRepoCard
  repo="gytxtx/OpenJBD"
  description="通过蓝牙连接 JBD 智能 BMS 的 Android 应用"
  language="Kotlin"
  stars={0}
  forks={0}
  fetchMetadata={false}
/>
```

卡片的仓库名和链接在 HTML 中直接输出，无 JavaScript 时仍可访问。进入视口后获取公开 GitHub
信息，补全简介、语言、Stars 和 Forks；同一仓库请求去重，成功结果在会话内缓存 30 分钟。
请求失败、仓库不存在或触发限流时保留原卡片，不显示虚假的零统计，也不影响构建。
`fetchMetadata={false}` 可关闭自动获取，完全使用手动填写的数据。构建不请求 GitHub API，无需 Token。

## 迁移要点（面向未来的自己）

- **页面 URL**：标签 `/tags/`、归档 `/archive/YYYY/`、关于 `/about/`、友链 `/links/`、
  分类 `/category/{slug}/`；文章为 `/article/YYYY/MM/{小写 slug}/`，年月取 `pubDate`（UTC）。
  旧 `/blog/` 导航地址、`/blog/YYYY/MM/DD/{slug}/` 和 `/blog/YYYY/MM/{slug}/` 都直接跳转到最终地址。
  `public/_redirects` 提供 Cloudflare Workers 301（含有、无末尾斜杠两种形式）。
  `scripts/check-urls.mjs` 对比线上基线（`urls-baseline-raw.xml`），并验证新页面和旧地址跳转；
  未解释差异必须为 0。
  原始 front matter slug 保留，用于旧链接、评论和 OG 图片；`postUrl` 在生成正文地址时转小写。
  既有大小写文章地址在开发模式由 middleware 跳转，部署到 Cloudflare Workers 后由 `_redirects` 301 跳转。
  不为大小写变体重复输出 HTML，避免 Windows 文件系统覆盖正文页。
- **文章元数据**：`title / description / pubDate / updatedDate / heroImage` 与 Astro 官方 blog 模板同名；
  `updatedDate` 保留旧站迁移信息，后续不需要手填。既有文章的历史更新时间固定在
  `src/data/content-date-baselines.json`：优先取 MkDocs 原文的显式更新时间，缺失时取旧仓库最后一次
  Git 修订时间（保留完整时间）。17 篇文章的来源见 [历史日期核对记录](CONTENT-DATE-BASELINES.md)；
  仅修改日期字段不会刷新页面更新时间。
- **内容更新时间**：文章、关于页和友链页统一由 `src/lib/content-dates.mjs` 比较 Git 已提交快照，
  首次入库只建立基线；文章沿用 `pubDate` 和旧站历史更新日期，顶层页以首次入库作为创建基线。
  正文（包括错字、代码、链接与 Markdown 排版）、标题、摘要、题图、作者字段、分类、标签、阅读时间，
  以及直接引用的本地图片变化都会算更新；友链还跟踪 `src/data/friends.ts` 的数据内容。
  源文件重命名、日期/slug/发布控制字段、公共组件/样式、共享作者资料、远程资源内容不触发更新；
  CRLF/LF 与文件首尾空白也忽略，正文内部换行、缩进和硬换行保留。
  纯格式迁移若改变了正文或可见信息，仍按内容变化计算，不按 commit message 猜测是否应忽略。
  Git 合并以第一父链上的合入提交时间为准，未提交修改不推进日期；页面、JSON-LD、文章 OG 元数据与
  sitemap `lastmod` 使用同一结果。读者可见日期按 UTC+8，文章发布当天的更新隐藏提示，SEO 保留完整时间；
  关于/友链的更新提示位于正文末尾。首页等聚合页及 404 不设置内容更新时间。
  标准构建入口 `npm run build` 会先检查 Git，自动补全浅克隆历史，失败则停止；
  GitHub Actions 也可直接设置 `fetch-depth: 0`。绕过前置步骤直接运行 `astro build` 时，
  无 Git 或浅克隆仍会警告并回退到已知历史日期，无可信日期则省略，不使用构建时间。
  URL 和归档分组仍按 `pubDate` 的 UTC 年月保持稳定。
- **OG 社交卡片**：`src/pages/og/[...slug].png.ts` 用 satori 逐页生成；
  分享图继续保留 `/og/YYYY/MM/DD/{slug}.png`，兼容既有分享记录。
  中文字体为 GB2312 全集子集（`scripts/subset-font.mjs` 预生成、已入库，构建期零网络依赖）。
  注意 satori 默认按 content-box 处理尺寸，样式里必须显式 `boxSizing: 'border-box'`。
- **标题字体**：Noto Serif SC Bold 自托管，`src/integrations/serif-subset.mjs` 在构建结束时扫 `dist`
  里的标题文字，从入库的 GB2312 子集再裁出 `/fonts/NotoSerifSC-Bold.woff2`（约 80 KB）；dev 下直接提供完整
  GB2312 子集。不依赖 Google Fonts（国内不可达时会阻塞首屏）。缓存策略见 `public/_headers`。
  Noto Sans/Serif SC 字体以 SIL OFL 1.1 分发，原版权与许可全文分别随站点发布为
  `public/fonts/OFL-NotoSansSC.txt`、`public/fonts/OFL-NotoSerifSC.txt`；来源及重新生成注意事项见
  [字体许可说明](src/assets/fonts/README.md)。项目 MIT 许可证不替代字体许可证。
- **搜索**：Pagefind，`scripts/pagefind-index.mjs` 建索引（中文按 Intl.Segmenter 预切词，与查询端一致）；
  只索引文章正文和关于/友链；UI 走官方 Default UI。
- **评论**：Giscus 使用 `specific`，搜索词固定为旧版 pathname 去掉开头的 `/`，
  因此文章地址移除日后仍查找原来的讨论。
- `src/content/blog/2026-09-17_Fuck.md` 在源仓库中当前为草稿（`draft: true`），
  因此不出现在站点中——这与旧站行为一致。
