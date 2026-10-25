# 主题重写指南（陪练手册）

> 这份文档是表现层重写的契约与验收标准。你是作者，写代码的是你；
> 陪练（AI）负责 review、跑验收、讲思路，**不代笔**。
> 分工边界一句话：`git diff main -- src/layouts src/components src/styles src/pages` 里的
> markup/CSS 归你，路由逻辑与脚本归基础设施。

## 1. 文件所有权地图

### 你的领地（表现层，可整体重写）

| 文件 | 职责 |
|---|---|
| `src/styles/global.css` | 设计令牌（CSS 变量）、排版、组件样式 |
| `src/layouts/Base.astro` | HTML 骨架、`<head>`、主题引导脚本 |
| `src/layouts/Post.astro` | 文章页布局（元信息、上下篇、评论挂载点） |
| `src/layouts/Prose.astro` | about/links 等纯文页布局 |
| `src/components/Header.astro` | 导航、搜索弹窗、主题切换按钮 |
| `src/components/Footer.astro` | 页脚 |
| `src/components/PostCard.astro` | 列表卡片 |
| `src/components/Pager.astro` | 分页控件 |
| `src/components/Giscus.astro` | 评论组件 |
| `src/pages/*.astro` 与 `src/pages/blog/**` 的 **markup 部分** | 各页面呈现 |

### 基础设施（重写时不要动；动了必须说明理由）

- `src/content.config.ts`（zod schema = 内容契约）
- `src/lib/posts.ts`（URL 规则、排序、摘要——URL 冻结承诺的实现）
- `src/pages/**` 的 **frontmatter 路由逻辑**：`getStaticPaths`、`params` 生成、`postUrl()` 调用。
  ⚠️ 这是唯一一层"表现与基础设施物理混居"的地方：路由逻辑逐字保留，下面的 markup 随便改。
- `src/pages/og/[...slug].png.ts`、`src/pages/rss.xml.js`、`scripts/**`、`astro.config.mjs`

## 2. 你消费的 API（`src/lib/posts.ts`）

```ts
PAGE_SIZE = 10
postUrl(post): string          // "/blog/2025/03/29/First-Article/"
postOgPath(post): string       // "2025/03/29/First-Article"（og 图去前缀路径）
getPosts(): Promise<Post[]>    // 非草稿，日期倒序
getPostsForIndex(): Promise<Post[]>  // 置顶在前，其余日期倒序
categorySlug(c): string        // "GitHub" -> "github"，中文原样
formatDate(d): string          // "2025 年 3 月 29 日"
excerpt(post, max=100): string // 以 <!-- more --> 为界的纯文本摘要
gitDateKey(post): string       // git-dates.json 的键
type Post = CollectionEntry<'blog'>
```

`Post.data`：`title, date, slug, description?, authors[], categories[], tags[],
readtime?, draft, pin, comments`。作者资料在 `src/data/authors.ts`。

布局 props 现状（可重新设计，但数据来源就这些）：

- `Base.astro` ← `{ title, description?, ogImage? }`
- `Post.astro` ← `{ post, readtime, prev, next }` + `<Content />` slot；
  "更新于"来自 `git-dates.json`（构建期生成，`gitDateKey(post)` 取键）
- `Prose.astro` ← `{ frontmatter: { title } }` + slot

## 3. 耦合点（重写时必须保持的协议）

1. **三处同值的三元组**：`astro.config.mjs` 的 `themeCssSelector` ↔ `<html data-theme>`
   的取值 ↔ `global.css` 里 `--ec-*` 变量覆盖的选择器。现在统一为
   `github-light` / `github-dark`。只改站点配色 → 动 `global.css` 即可；
   想换代码高亮配色 → 三处一起改。
2. **主题引导脚本**（Base.astro inline）：必须早于首帧执行、localStorage key `theme`
   取值 `auto|light|dark`、`astro:after-swap` 时重放、切换时 `dispatchEvent(new CustomEvent('themechange'))`
   （Giscus 靠这个事件同步主题）。
3. **Pagefind**：head 引 `/pagefind/pagefind-ui.css|js`（构建后产物，dev 下 404 属正常）；
   弹窗内保留 `#pagefind-search` 容器挂 PagefindUI。中文翻译对象可随意改文案。
4. **OG 图约定**：`ogImage` 指向 `/og/{postOgPath(post)}.png`，非文章页用 `/og/default.png`。
   端点是基础设施，你只管传对路径。
5. **Giscus**：`data-repo / data-repo-id / data-category / data-category-id /
   data-mapping="pathname"` 逐字保留——评论按 pathname 绑定，动一个丢一片。
6. **GA**：gtag 片段（G-29NRC21SS3）保留在 head。
7. **`.prose`**：Markdown 渲染的正文样式挂钩。已知内容事实：单换行会渲染为 `<br>`
   （remark-breaks）；admonition 已转成 `> **标题**` 引用块；脚注是 GFM 原生。

## 4. 验收清单（每次提交前自查，review 时陪练会复跑）

```bash
npm run build        # 零报错
npm run check-urls   # ✅ 未解释差异为 0（URL 门）
npm run dev          # 视觉走查
```

视觉走查：三档主题切换且无闪白 → 搜索弹窗出结果 → 文章页 Giscus 加载 →
正文图片灯箱 → 暗色下代码块配色 → 375px 移动端 → `/rss.xml` 可订阅。

## 5. 建议动工顺序

1. `global.css`：设计令牌 + 字体（定调子，反馈最快）
2. `Base.astro`：骨架 + head（把耦合点 2/4/6 原样搬好）
3. `Header.astro`：导航 + 搜索 + 主题按钮（耦合点 1/3）
4. `PostCard.astro` + `index.astro`：首页即文章列表（2026-10-25 结构调整）
5. `Post.astro` + `.prose`：正文排版（最见功力的部分）
6. `Footer/Giscus/404/index`：收尾

小步提交，每完成一个文件 `npm run build` 一次。

## 6. 陪练协作方式

- 工作分支：`theme`（main 保持已验收状态，随时 `git diff main` 对照、`git show main:<file>` 看旧实现）。
- 写完（或卡住）直接说 **"review"** 或描述问题；陪练跑验收、按普通同事标准 review，不代笔。
- 想要某个效果的实现思路/API 讲解，直接问——讲思路不算代笔。

## 7. 结构决策记录

- **2026-10-25 · 首页即文章列表**：原「独立首页 + /blog/ 索引」取消。`/` 直接呈现文章卡片
  （置顶在前），分页迁至 `/page/N/`；基线 URL `/blog/` 与 `/blog/page/2/` 以静态重定向
  （meta refresh + noindex）接到新位置，URL 门保持绿色。`/blog/` 前缀下的文章、归档、
  分类、标签、about、links 一概不动。标签入口移入主导航。
