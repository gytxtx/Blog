# 站点审计与修复验收

日期：2026-10-27（UTC+8）

基准提交：`0194993741c5172095c5305c05ef98661f2a7147`，修复位于当前未提交工作树。

模式：针对上次 Full 审计四项问题的修复与 Delta 验收。

## 当前结论

原审计四项问题均已修复并验证，当前台账 **0 项待处理问题**。
原始报告和问题证据保存在 [.repository-audit/history/2026-10-27-initial.md](.repository-audit/history/2026-10-27-initial.md)，没有删除历史发现。
本次未提交、未部署。现有 `127.0.0.1:4322` 预览服务继续保留，本次临时启动的 Workers 本地服务已关闭。

## 修复结果

| 稳定 ID | 原级别 | 状态 | 修复及验证 |
| --- | --- | --- | --- |
| AUD-A11Y-001 | Medium | resolved | 灯箱入口及 dialog 有名称，图片描述传给大图；打开聚焦关闭按钮；Tab/Shift+Tab 双向循环、背景 inert；Esc/点击关闭恢复原入口焦点；导航销毁不恢复旧节点。普通及减少动效浏览器回归通过。 |
| AUD-LIC-001 | Low | resolved | 两款字体的原版权及 OFL 全文加入 public/fonts；补字体来源和许可说明；HTTP 验收确认字体和两份许可一起发布。 |
| AUD-DEP-001 | Low | resolved | Wrangler 4.153.0 → Miniflare 5.20261023.0-beta → undici 7.30.1；高危告警归零，依赖树、构建、dry-run 和实际 Workers 本地运行通过。 |
| AUD-SEO-001 | Low | resolved | 《猫》补显式 description；全部公开文章的 SEO/OG/JSON-LD 描述非空且一致；首页仍保留 more 标记的隐藏摘要行为。 |

四项建议的验证状态均已更新为 **Experimentally Verified**。

### 灯箱与内容图片

涉及 `src/lib/lightbox.ts` 和三篇含截图文章。为现有 13 张正文截图补充了有意义的 alt。
自动生成链接使用“查看大图：图片描述”，通过 `data-alt` 将描述传给 GLightbox。
弹窗以“图片预览”命名并设置 `aria-modal`，正常关闭后恢复最初触发链接，而不是浏览到的另一张图片。
临时监听和背景 inert 状态在关闭时清理；沿用既有等待关闭动画再换页的协议。

新增 `e2e/components.spec.ts` 中两项普通/减少动效回归，覆盖入口名称、大图 alt、初始焦点、双向 Tab 循环、方向键翻图、Esc、鼠标关闭和重复打开。
既有“灯箱打开时后退”回归同时通过，验证遮罩、键盘监听和导航继续可用。
方案依据：[WAI-ARIA 模态对话框模式](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)。

### 字体许可与 SEO

新增 `public/fonts/OFL-NotoSansSC.txt`、`OFL-NotoSerifSC.txt`，保留对应字体 name 表中的 Adobe 版权信息和上游完整许可。
`src/assets/fonts/README.md` 及根 README 说明字体来源、子集生成和许可位置；字体二进制未改。
许可正文已与官方 [Sans](https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/LICENSE)、[Serif](https://raw.githubusercontent.com/notofonts/noto-cjk/main/Serif/LICENSE) 原文比对。

《猫》的修复仅补 frontmatter description，不更改 `excerpt()` 或 `<!-- more -->` 的列表语义。
新增 `e2e/metadata.spec.ts` 两项验收：遍历 sitemap 的全部公开文章检查描述一致性并确认《猫》首页无摘要；检查发布的 WOFF2 文件头及两份版权/OFL 全文。

### 工具链依赖

仅更新 Wrangler 直接依赖及其关联锁文件条目，没有批量升级其他直接依赖或执行 `npm audit fix --force`。
已消除 [GHSA-xjj6-f33q-929c](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c) 对原 undici 7.29.1 的告警。
`npm audit` 仍有 **2 条 moderate 包记录（Satori → fflate，同一根因）**，没有 high / critical；`npm audit --omit=dev` 为 0。
原审计已核对该 [fflate 公告](https://github.com/advisories/GHSA-px8p-9vwx-vf98) 涉及 `unzipSync()`，本站 Satori 仅使用 `inflateSync()`，未发现可达路径；此项不属于本次四个待修问题，保留记录。

## 检查与测试

| 项目 | 结果 |
| --- | --- |
| `npm run check` | 86 个文件；0 errors / warnings / hints |
| `npm test` | 48 / 48 通过 |
| `npm run build` | 成功，包含图片、OG、字体子集及 Pagefind 索引 |
| `npm run check-urls` | 16 篇文章、15 个导航页和 62 条旧地址跳转通过；未解释差异 0 |
| Playwright 全套 | **57 / 57 通过**，包含新增 4 项回归；Chromium，桌面/手机/横屏/主题及减少动效 |
| `npm ls wrangler miniflare undici` | 依赖树正常；Wrangler 4.153.0 / undici 7.30.1 |
| `npm audit` | 0 high、0 critical；余下 2 moderate 包记录如上所述 |
| `npm audit --omit=dev` | 0 漏洞 |
| Wrangler `deploy --dry-run` | 静态资源打包验证成功；没有部署 |
| `workerd --version` | 原生可执行，2026-10-23 |
| `wrangler dev --local` 实际运行 | 成功解析 124 条重定向和 5 条响应头规则；下述 HTTP 及浏览器冒烟通过 |
| `git diff --check` / 台账 JSON | 通过 |

新增四项回归曾对旧产物运行，均能准确失败（图片描述空、页面描述空、许可 404）；修复后随全套转绿。

浏览器全套复用已有 `http://127.0.0.1:4322` 生产预览，以系统临时配置移除重复启动的 webServer；其余目录、浏览器、视口、并发和失败诊断设置与仓库配置一致。
执行命令为 `npx playwright test --config "$env:TEMP\blog-astro-audit-playwright.config.mjs"`，使用本次构建后的 dist。

## Workers 本地冒烟及视觉证据

临时地址：`http://127.0.0.1:8788`，使用升级后的 Wrangler / workerd 实际运行。

- 首页、《猫》、WOFF2 及两份许可文件均为 200。
- 旧 `/blog/2026/09/26/Cat/` 和大小写兼容 `/article/2026/09/Cat/` 均为 301，直接指向 `/article/2026/09/cat/`。
- 不存在的页面返回 404。
- 灯箱实际键盘打开/关闭及焦点恢复成功；所测页面没有运行时 JS 错误。
- 检查桌面 1280×900 和手机 375×812 深色灯箱截图；保留既有布局，关闭入口可见。

系统临时目录 `C:/Users/gytxtx/AppData/Local/Temp/blog-astro-fix-evidence/` 保存 `workers-smoke.json` 和桌面/手机截图。

## 限制与后续

验证覆盖 Chromium 和本地 Workers；没有执行线上部署、真实登录评论、GA 统计配置核验或受控网络 Core Web Vitals 测量。
确定性浏览器测试继续模拟第三方服务。当前会话没有 Browser 插件，使用仓库现有 Playwright。
安装保留原有 npm 脚本权限策略；更新后的原生 workerd、dry-run 和本地运行均已验证。

原审计提出的“将已有检查串成发布质量门”仍为自动化建议，不是本次四项已确认缺陷的一部分。
新增防护为两项灯箱交互回归和两项元数据/许可发布回归，未引入新的 CI 或部署流程。
