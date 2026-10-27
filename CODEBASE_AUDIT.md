# 站点全面审计（UI/UX · 动效 · 架构 · 样式 · 可维护性）

## 审计元数据

- 审计日期：2026-10-27（full 复审计，基准提交 `766e2a6`）
- 修复轮次：2026-10-27 → 2026-10-28，按报告的「建议优先级」顺序执行
- 当前状态：**全部改动留在工作树，尚未提交**；本轮验收针对工作树内容重新构建后测得
- 上一轮完整报告：[.repository-audit/history/2026-10-27-full.md](.repository-audit/history/2026-10-27-full.md)（发现清单原样保留，含被驳回候选）
- 完整台账：[.repository-audit/findings.json](.repository-audit/findings.json)　·　修复前线台账：[.repository-audit/history/2026-10-28-pre-fix-findings.json](.repository-audit/history/2026-10-28-pre-fix-findings.json)

## 执行摘要

上一轮报出 22 项待处理（0 Critical / 0 High / 9 Medium / 12 Low / 1 Informational）。本轮之后：

| 状态 | 数量 | 说明 |
| --- | --- | --- |
| 已修复 | 21 | 全部经命令或浏览器实测验收，落点见下表 |
| 接受风险 | 2 | AUD-DEP-002（satori→fflate，延续项）、AUD-PERF-002（搜索样式阻塞，本轮定为维持） |
| 仍开放 | 1 | AUD-GIT-001 的 `.git` 残留删除需要你确认，不属可逆操作，未代为执行 |

验收命令全绿：`npm run check` 91 文件 0 诊断 · `npm test` 50/50 · `npm run build` 64 页 · `npm run check-urls` 62 条旧地址跳转 + URL diff 0 · `npx playwright test` **65/65**（比上轮多 8 项新回归）· `npx wrangler dev` 本地启动，124 条跳转与 5 条响应头规则解析无告警。

三项「需要人做的决定」已给出结论，文档已同步（DESIGN.md 令牌表与动效表、THEME-GUIDE.md 第 3 节耦合点与第 6 节结构决策、README.md 部署与命令）。

## 决定与结论

| 议题 | 结论 | 落地位置 |
| --- | --- | --- |
| 发布质量门（AUD-TOOL-002） | 选 A：只加 `predeploy`，不引入 CI 工作流 | `package.json` 的 `predeploy` = `check && test && check-urls`；README「部署」写明理由与「浏览器回归单独跑」的边界 |
| `pagefind-ui.css` 全站 head 阻塞（AUD-PERF-002） | 维持现状：2.6 KB gzip 换首次打开搜索无样式闪烁，不做按需注入 | THEME-GUIDE.md 第 3 节第 3 条把它写成明确约定 |
| 断点契约（AUD-STY-001） | 选 A 的加强版：登记表 + 脚本侧同名常量 + 双向核对测试 | `tokens.css` 的 `--bp-*`、`src/lib/breakpoints.ts`、`tests/breakpoints.test.mjs`；DESIGN.md 令牌表改写真实契约 |
| 站点地图是否发布分页地址（AUD-SEO-002） | 排除 | `astro.config.mjs` 的 sitemap filter；重建后 29 条地址，无 `/page/N/` |
| `.git` 历史重写残留（AUD-GIT-001） | 文档已补，删除留给你 | CONTENT-DATE-BASELINES.md 新增「与 Astro 仓库提交历史的关系」 |

## 修复清单

Medium：

- **AUD-TOOL-002** — 发布门缺失 → `predeploy` 挂上 `npm run deploy`。
- **AUD-TOOL-001** — [playwright.config.ts:23](playwright.config.ts#L23) `reuseExistingServer: !process.env.CI`；本机常驻预览下可直接跑全套。
- **AUD-TYPE-001** — `src/lib/*.mjs`、`src/integrations/*.mjs`、`scripts/*.mjs` 全部加 `// @ts-check`，`astro check` 覆盖 91 文件；remark 插件的最小 AST 形状集中在 `src/lib/remark-mdast.mjs`，注册处保留一次 `any[]` 收敛。
- **AUD-ARCH-001** — 文章年月地址公式收进 [src/lib/post-url.mjs](src/lib/post-url.mjs) 的 `articleUrl()`，`posts.ts` 与 `content-dates.mjs` 转调；守卫是 `e2e/metadata.spec.ts` 的 sitemap `lastmod` 可解析断言。
- **AUD-A11Y-002** — [src/layouts/Base.astro:106](src/layouts/Base.astro#L106) 跳转正文链接 + `<main id="main" tabindex="-1">`；[src/lib/navigation.ts:10](src/lib/navigation.ts#L10) 在 `astro:after-swap` 后把焦点交给正文。
- **AUD-A11Y-003** — [src/lib/toc-tracking.ts](src/lib/toc-tracking.ts)：活动项 `scrollIntoView({ block: 'nearest' })`，reduced-motion 用 `auto`；章节判定线改读 `html` 的实际 `scroll-padding-top`（+1px 容差）。
- **AUD-UX-001** — [src/styles/header.css:234](src/styles/header.css#L234) 用 `html:not([data-theme])` 判别脚本未执行：隐藏汉堡与三个脚本控件，导航展开为换行链接，顶栏不再吸顶。
- **AUD-PERF-001** — [src/lib/lightbox.ts](src/lib/lightbox.ts) 确认有含图链接后才 `await import('glightbox')`，并校验链接仍在新文档上。文章页脚本块 **58,472 B → 2,926 B（gzip 1,493 B）**；glightbox 独立成 55,910 B 的 chunk，被文章 HTML 引用 0 次。

Low / Informational：

- **AUD-A11Y-004** — [src/lib/theme.ts:38](src/lib/theme.ts#L38) 每套主题同时输出 `color-scheme`。
- **AUD-CFG-001** — 构建期依赖（js-yaml、typescript、satori、@resvg/resvg-js、subset-font、pagefind、sharp）上移到 `dependencies`；供应链结论改用全量 `npm audit` 表述。
- **AUD-CFG-002** — `wrangler.toml` `compatibility_date` 前滚到 `2026-10-01`，本地 workerd 2026-10-23 起服无告警，`_headers` 实测生效（`/fonts/*` → `max-age=86400, must-revalidate`）。`_redirects` 的 301 在 `wrangler dev` 下新旧日期同样走 `not_found_handling` 返回 404，属本地 dev 限制；线上抽查留给首次部署后。
- **AUD-ARCH-002** — [src/components/BackToTop.astro](src/components/BackToTop.astro) 改走 `onPageLoad` 并返回清理函数，阈值读 `--scroll-trigger`。
- **AUD-ARCH-003** — 卡片样式单一入口收敛到 `global.css`，组件内重复导入删除。
- **AUD-STY-001** — 断点三处对齐（`--bp-*` 名册 / `breakpoints.ts` / `@media` 字面值），对应关系由 `tests/breakpoints.test.mjs` 核对。
- **AUD-STY-002** — 列数令牌更名 `--github-card-columns` → `--card-columns`，注入点同步。
- **AUD-STY-003** — [src/components/Pager.astro:70](src/components/Pager.astro#L70) 禁用态注释改为实测值（浅色 2.54:1、深色 3.30:1），依据 WCAG 1.4.3 对不可交互组件的豁免。
- **AUD-STY-004** — 焦点环去重，统一由 `base.css` 提供。
- **AUD-MOTION-001** — 进度条分步时长、回顶阈值、目录判定线全部改由令牌驱动（`--motion-progress-delay/step/ramp`、`--scroll-trigger`、`scroll-padding-top`）；自定义属性不归一化，故新增 `tokenTime()` 自行识别 `ms`/`s`。
- **AUD-TEST-001** — 两条产物端 e2e：`/rss.xml` 的 `<language>`、`content:encoded` 正文、条目内地址全绝对；从文章页 HTML 取 `og:image` 实际地址断言 PNG 魔数。
- **AUD-MAINT-001** — 一次性迁移脚本 `git mv` 到 `scripts/archive/`，头部标注已停用。
- **AUD-SEO-002** — 站点地图排除分页地址（见「决定与结论」）。

## 本轮新增的守卫

| 守卫 | 覆盖 |
| --- | --- |
| `predeploy`（check + test + check-urls） | 发布路径本身 |
| `tests/breakpoints.test.mjs` | 断点名册 ↔ 脚本常量 ↔ `@media` 字面值 |
| `e2e/accessibility.spec.ts`（4 项） | skip link 与换页焦点、矮视口目录可见、`color-scheme`、禁用 JS 的导航可达 |
| `e2e/motion-tokens.spec.ts` | 进度条分步时长跟随 `--motion-progress-*` 与 `--motion-page` |
| `e2e/metadata.spec.ts`（新增 2 项） | RSS 全文与绝对地址、页面声明的 `og:image` 真实可取 |
| sitemap `lastmod` 可解析断言 | 地址公式漂移导致更新时间静默丢失 |

## 已知限制与接受风险

- `reuseExistingServer` 复用的预览可能指向旧 `dist`；靠 `test:browser` 先 `npm run build` 约束，未加端口可配置与新鲜度校验。
- AUD-DEP-002：satori→fflate 的 2 条 moderate（`unzipSync` 公告，Satori 走 `inflateSync`，未发现可达路径）；`audit fix --force` 会降级 satori，不应执行。
- AUD-PERF-002：`pagefind-ui.css` 继续作为每页 head 阻塞样式，已写成约定。
- AUD-GIT-001：`.git/history-rewrite-20261027.md` 与 `history-regroup-20261027-205549/` 仍在，记录的「新 HEAD」已非当前 HEAD 的祖先；文档已说明，删除待确认。
- 性能数字均为本机回环测量，未跑 Lighthouse；浏览器仅 Chromium。
- 未执行部署，未核验线上 Cloudflare 设置、真实 Giscus 与 GA。

## 复审计指引

下一轮只需核对：① `predeploy` 与新增 e2e 是否仍绿色；② 灯箱按需加载后文章页脚本块体积；③ `.git` 残留是否已清理；④ 首次以新 `compatibility_date` 部署后抽查一条旧文章 301。被驳回的候选与运行时取证方式见上一轮报告，不必重复取证。
