# 仓库地图与风险画像

- 日期：2026-10-27（UTC+8）
- 基准：`0194993741c5172095c5305c05ef98661f2a7147`
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
| `src/integrations/`、`scripts/` | 字体子集、Git 历史准备、索引、URL 验收及迁移工具 |
| `tests/`、`e2e/` | Node 单元测试和 Playwright 生产浏览器回归 |
| `public/`、`wrangler.toml` | 静态资产、响应头、重定向和部署配置 |
| `README.md`、`THEME-GUIDE.md`、`DESIGN.md` | 开发入口、兼容契约、模块归属、视觉和交互规则 |

## 关键契约

- 文章正文 `/article/YYYY/MM/小写slug/`；旧日级/月级路径直接跳转；评论及 OG 沿用原日级标识。
- 生产排除草稿；旧地址不进入搜索和 sitemap。
- 内容日期来自已提交 Git 内容；构建前补齐历史，公共样式变化不刷新文章日期。
- 普通每页行为通过 `onPageLoad` 清理；灯箱具有独立异步销毁协议，自定义元素管理评论及仓库卡片。
- 主题、字号、间距、卡片表面各有单一维护入口；尊重减少动效、触控、安全区与视觉视口。
- 如启动开发服务，使用 `astro dev --background` 及配套管理命令。

## 验证与发布

`npm run check` → `npm test` → `npm run build` → `npm run check-urls` → Playwright。
`npm run test:browser` 包含构建和 Playwright；`npm run deploy` 包含构建及 Wrangler 上传。
仓库没有自带 CI 工作流；外部 Cloudflare 构建设置未检查。

## 风险权重

- 高：迁移链接、内容可达性、索引、静态构建、核心客户端交互、日期真实性。
- 中：无障碍、移动布局、缓存/资源性能、工具依赖、第三方资产许可证、第三方服务回退。
- 低：服务端权限与访客数据持久化；当前架构无自建动态 API、账户或交易数据。
- 信任边界：作者控制的 Markdown/数据；访客搜索输入；公开 GitHub API；Giscus iframe；GA；本地构建工具。
- 昂贵失效：已索引旧地址失效、草稿公开、构建不可复现、换页脚本泄漏、阅读/键盘导航不可用。

## 审计状态

首份可用基线为本次 full 审计；无历史报告需归档。四项问题已在当前工作树修复并验收；当前待处理数量均为 0，详见根目录报告与 findings.json。浏览器回归增加至 57 项。
