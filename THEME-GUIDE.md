# 站点维护指南

本文记录模块归属、兼容契约和验收方式。当前目标是保持页面外观与功能，降低修改一个功能时
需要追踪的文件和隐含约定。用户已授权 AI 实施；原“陪练不代笔”的协作约定不再适用。

## 1. 修改入口

### 呈现与样式

组件独占的样式优先放在组件内。同一功能的默认、窄屏、触屏和动效规则集中维护；
跨布局、Markdown 输出、第三方输出和文档级伪元素的规则保留在功能 CSS 中。
共享变量从 `tokens.css` 或 `theme.ts` 修改，功能例外留在所属模块；新增规则放进对应文件。

### 内容与路由

- `src/content.config.ts`（zod schema = 内容契约）
- `src/lib/posts.ts`（URL 规则、排序、摘要——年月地址与旧地址兼容的实现）
- `src/lib/post-groups.ts` 提供按 UTC 年份、分类、标签分组的纯查询。保持组内输入顺序；
  分类用小写地址、首次显示名，标签保留大小写并按数量与名称排序。
- `src/pages/**` 的 frontmatter 保留 `getStaticPaths`、`params` 和 Astro 分页调用；
  查询规则交给 `post-groups.ts`，归档呈现交给 `Archive.astro`。
- `src/pages/og/[...slug].png.ts`、`src/pages/rss.xml.js`、`scripts/**`、`astro.config.mjs`

站名和规范域名集中在 `src/consts.ts` 的 `SITE`；页面标题、Astro 构建配置、
`site.webmanifest.ts` 和 `robots.txt.ts` 从这里读取。Manifest 与 OG 图片同时消费 `THEMES` 配色。
上述模块可以因具体需求调整，但内容 frontmatter、URL、评论标识与输出行为必须继续满足第 3 节契约。

## 2. 你消费的 API（`src/lib/posts.ts`）

`Post.data`：`title, description?, pubDate, updatedDate?, heroImage?, slug, authors[], categories[], tags[],
readtime?, draft, pin, comments`。作者资料在 `src/data/authors.ts`。

布局 props 现状（可重新设计，但数据来源就这些）：

## 3. 耦合点（重写时必须保持的协议）

1. **主题名与配色**：`theme.ts` 的 `THEMES` 同时供 Astro 代码高亮配置、`data-theme` 与 CSS 变量使用，
   现在为 `github-light` / `github-dark`。修改站点颜色只改 `THEMES.*.colors`；浏览器地址栏颜色随 `bg` 更新。
   代码块外观覆盖保留在 `prose.css` 的 `html[data-theme] .prose .expressive-code`。
2. **主题引导脚本**（`theme-bootstrap.ts`，由 Base 输出为经典内联脚本）：必须早于首帧执行、localStorage key `theme`
   取值 `auto|light|dark`、`astro:before-swap` 时预先应用到新文档、切换时 `document.dispatchEvent(new CustomEvent('themechange'))`
   （Giscus 靠这个事件同步主题）。
3. **Pagefind**：生产构建的 head 保留 `/pagefind/pagefind-ui.css`；JS 和 UI 由
   `src/lib/search-control.ts` 在首次打开搜索时加载，必须保留加载、失败重试和关闭焦点恢复。
   dev 弹窗显示预览提示；保留 `#pagefind-search` 容器挂 PagefindUI。
4. **OG 图约定**：`ogImage` 指向 `/og/{postOgPath(post)}.png`，非文章页用 `/og/default.png`。
   端点是基础设施，你只管传对路径。
5. **Giscus**：`data-repo / data-repo-id / data-category / data-category-id` 逐字保留。
   `data-mapping="specific"` 的 `data-term` 使用 `legacyPostUrl(post).slice(1)`，
   与旧版 pathname 的搜索词一致；不要改成新的年月地址，否则匹配不到既有评论。
6. **GA**：gtag 片段（G-29NRC21SS3）保留在 head。
7. **`.prose`**：Markdown 渲染的正文样式挂钩。已知内容事实：单换行会渲染为 `<br>`
   （remark-breaks）；admonition 已转成 `> **标题**` 引用块；脚注是 GFM 原生。
8. **图标**：`astro-icon` 已在 `astro.config.mjs` 注册，Lucide 全集可用。用法：
   `import { Icon } from 'astro-icon/components'` → `<Icon name="lucide:sun" size={24} />`，
   构建期内联为 SVG、继承 `currentColor`（明暗模式免处理）。本地自定义图标放
   `src/icons/*.svg` 后 `<Icon name="文件名" />`。Header 使用对应的 Lucide 图标。

## 4. 客户端脚本的初始化与清理

## 5. 验收清单

```bash
npm run build        # 零报错
npm run check        # 类型检查零诊断
npm run check-urls   # ✅ 未解释差异为 0（URL 门）
npm test             # 内容及请求恢复回归
npm run test:browser # Chromium 交互回归（包含构建）
npm run dev -- --background # 开发走查；用 astro dev stop/status/logs 管理
```

公共卡片外观由 `src/styles/cards.css` 管理，避免在三种卡片中分别覆写表面样式。
标题动效通过项目自有的 `data-post-title="list|post"` 定位，保留该标记与 transition:name。
导航进度位于 `src/lib/navigation.ts`。
Giscus 通过自定义元素管理加载/销毁，保留原 repo/category/term 协议及讨论区备用入口。

## 6. 结构决策记录

- **2026-10-25 · 首页即文章列表**：原「独立首页 + /blog/ 索引」取消。`/` 直接呈现文章卡片
  （置顶在前），分页迁至 `/page/N/`；基线 URL `/blog/` 与 `/blog/page/2/` 以静态重定向
  （meta refresh + noindex）接到新位置，URL 门保持绿色。`/blog/` 前缀下的文章、归档、
  分类、标签、about、links 一概不动。标签入口移入主导航。
- **2026-10-26 · 去掉导航页前缀，文章按年月归类**：标签、归档、分类、关于、友链移到根路径；
  正式文章地址改为 `/article/YYYY/MM/slug/`。`/blog/` 下只保留旧地址的直接跳转，
  不进入搜索或站点地图。评论标识和 OG 图片继续使用迁移前的日级路径。
  正文 slug 统一转为小写，原大小写地址保留 301；不生成仅大小写不同的两份 HTML，避免 Windows 路径覆盖。
