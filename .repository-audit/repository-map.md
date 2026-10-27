# 仓库地图与风险画像

- 日期：2026-10-28（审计 2026-10-27，随后完成修复轮次）
- 基准：`766e2a6b1b4a1631f55733850dcffbbe2283cf39`（修复内容尚未提交）
- 类型：从 MkDocs 迁移的个人静态博客，16 篇公开文章，1 篇草稿。
- 技术：Astro 7、TypeScript / JavaScript、Markdown、原生 CSS；Node >=22.23.4。
- 环境：本地 Windows 开发，Cloudflare Workers 静态资源发布；主要浏览器。

## 结构

| 路径 | 职责 |
| --- | --- |
| `src/pages/` | 首页、文章、分类/标签/归档、旧地址跳转、RSS、OG、robots、manifest |
| `src/layouts/` | Base 页面骨架及 Post / Prose / Archive 呈现 |
| `src/components/` | 导航、目录、列表、分页、卡片、评论等 |
| `src/content/`、`src/data/` | 文章和作者、友链、日期基线 |
| `src/lib/` | 内容查询/日期/Markdown 转换和浏览器行为 |
| `src/styles/` | 全局入口、主题相关令牌与功能 CSS |
| `src/integrations/`、`scripts/`、`scripts/archive/` | 字体子集、Git 历史准备、索引、URL 验收；已停用的一次性迁移脚本归档在 `scripts/archive/` |
| `tests/`、`e2e/` | Node 单元测试和 Playwright 生产浏览器回归 |
| `public/`、`wrangler.toml` | 静态资产、响应头、重定向和部署配置 |
| `README.md`、`THEME-GUIDE.md`、`DESIGN.md` | 开发入口、兼容契约、模块归属、视觉和交互规则 |

## 关键契约

- 文章正文 `/article/YYYY/MM/小写slug/`，公式唯一来源是 `src/lib/post-url.mjs`；旧日级/月级路径直接跳转；评论沿用原日级标识，OG 图按日级嵌套路径 `/og/YYYY/MM/DD/slug.png`。
- 生产排除草稿；旧地址与纯分页地址（`/page/N/`、`/archive/YYYY/page/N/`）都不进入搜索和 sitemap。
- 内容日期来自已提交 Git 内容；构建前补齐历史，公共样式变化不刷新文章日期。
- 普通每页行为通过 `onPageLoad` 清理；灯箱按需 `import('glightbox')`，具有独立异步销毁协议，自定义元素管理评论及仓库卡片。
- 键盘入口固定：`.skip-link` → `#main`，客户端换页后焦点交给正文；`<html>` 缺少 `data-theme` 即视为脚本未执行，header.css 据此给出无脚本导航回退。
- 主题、字号、间距、卡片表面各有单一维护入口；断点名册在 `tokens.css` 的 `--bp-*` 与 `src/lib/breakpoints.ts` 两处同名，由 `tests/breakpoints.test.mjs` 核对；动效时长与滚动阈值由脚本读令牌，不另写像素或毫秒。
- 尊重减少动效（全量降级）、触控最小尺寸、安全区与视觉视口。
- 如启动开发服务，使用 `astro dev --background` 及配套管理命令。

## 验证与发布

`npm run check` → `npm test` → `npm run build` → `npm run check-urls` → Playwright。
`npm run deploy` 由 `predeploy` 自动先跑前三项门禁再构建上传；`npm run test:browser` 包含构建和 Playwright，不在发布门上，动效或交互改动后单独跑。
浏览器回归可直接复用本机常驻的 `127.0.0.1:4322` 预览（`reuseExistingServer: !process.env.CI`）。
仓库没有自带 CI 工作流（明确决定，见 README「部署」）；外部 Cloudflare 构建设置未检查。

## 风险权重

- 高：迁移链接、内容可达性、索引、静态构建、核心客户端交互、日期真实性。
- 中：无障碍、移动布局、缓存/资源性能、工具依赖、第三方资产许可证、第三方服务回退。
- 低：服务端权限与访客数据持久化；当前架构无自建动态 API、账户或交易数据。
- 信任边界：作者控制的 Markdown/数据；访客搜索输入；公开 GitHub API；Giscus iframe；GA；本地构建工具。
- 昂贵失效：已索引旧地址失效、草稿公开、构建不可复现、换页脚本泄漏、阅读/键盘导航不可用。

## 审计状态

基线链：`2026-10-27 initial full`（`0194993`）→ `同日 delta 修复验收`（4 项 resolved，见 `.repository-audit/history/`）→ `2026-10-27 full 复审计`（`766e2a6`）→ `2026-10-27→28 修复轮次`（工作树）。
当前待处理 **0 Critical / 0 High / 0 Medium / 1 Low / 0 Informational**：只剩 AUD-GIT-001 的 `.git` 残留删除待你确认；另有 2 项接受风险（AUD-DEP-002、AUD-PERF-002）。上一轮 22 项与更早 4 项共 25 项已修复并经验收。详见根目录报告与 [findings.json](findings.json)。
修复轮次验收：`astro check` 91 文件 0 诊断 · `node --test` 50/50 · 构建 64 页 · URL 门 diff 0 · Playwright 65/65 · `wrangler dev` 本地起服无告警。
新测得事实：文章页脚本块由 58,472 B 降到 2,926 B（gzip 1,493 B），glightbox 独立成 55,910 B 的 chunk 且文章 HTML 引用 0 次；`wrangler dev` 对 navigate 请求走 `not_found_handling`，本地不复现 `_redirects` 的 301，新旧 `compatibility_date` 表现一致。
