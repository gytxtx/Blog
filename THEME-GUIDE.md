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

## 2. 你消费的 API（`src/lib/posts.ts`）

`Post.data`：`title, description?, pubDate, updatedDate?, heroImage?, slug, authors[], categories[], tags[],
readtime?, draft, pin, comments`。作者资料在 `src/data/authors.ts`。

布局 props 现状（可重新设计，但数据来源就这些）：

## 3. 耦合点（重写时必须保持的协议）

## 5. 验收清单

## 6. 结构决策记录