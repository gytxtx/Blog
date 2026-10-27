# 站点 UI 约定

站点使用 Astro 与原生 CSS。沿用米白／深绿配色、衬线标题和简洁的阅读布局；明暗主题由 `src/lib/theme.ts` 管理。

## 公共规则

| 内容 | 来源 | 约定 |
| --- | --- | --- |
| 字体与字号 | `src/styles/tokens.css` | 标题 `--serif`，界面与正文 `--sans`，代码 `--mono`；标题、正文、辅助信息使用对应 `--fs-*` |
| 空间尺度 | `src/styles/tokens.css` | `--space-*` 对应 4、8、12、16、20、24、32、40、48、64px |
| 内容宽度 | `--measure` / `--wrap` | 阅读栏沿用 40rem，桌面 48rem；顶栏与页脚使用 68rem 外框；文章目录位于阅读栏外 |
| 页首 | `src/styles/page.css` | 首页、归档、分类、标签、独立内容页及文章统一起始留白、标题样式、分隔线和底部间距 |
| 页面留白 | `--page-start` | 桌面 64px、手机 40px、矮横屏 24px |
| 分组间距 | `--section-gap` | 桌面 48px、手机 40px；组内使用较小空间令牌 |
| 卡片 | `src/styles/cards.css` | 表面、边框、内边距、网格间距和圆角统一；内容与仓库卡片、友链共享 `--card-*` |
| 控件 | `src/styles/shared.css` | 图标按钮使用 `.ui-icon-button`，操作／重试使用 `.ui-button`，主操作增加 `.ui-button--primary` |
| 圆角 | `--radius-sm/md/lg` | 标记／行内代码 3px，控件／卡片／图片 6px，弹窗 8px |
| 交互尺寸 | `--control-size` | 独立控件至少 44px；正文行内链接保持自然排版 |
| 滚动阈值 | `--scroll-trigger` | 返回顶部按钮在滚动 320px 后出现，由组件读取令牌而非自带像素 |
| 断点 | `--bp-mini/compact/menu/measure/toc` | 480、640、960、1024、1279px；媒体查询仍写字面值，脚本侧同名常量在 `src/lib/breakpoints.ts`，对应关系由 `npm test` 核对 |
| 键盘入口 | `src/layouts/Base.astro` | 顶栏之前是 `.skip-link`（跳转至正文），`<main id="main" tabindex="-1">`；客户端换页完成后焦点交给 `#main` |
| 无脚本回退 | `src/styles/header.css` | `<html>` 没有 `data-theme` 即判定脚本未执行：隐藏汉堡与三个脚本控件，导航直接展开为换行链接，顶栏不再吸顶 |
| 原生控件配色 | `src/lib/theme.ts` | 每套主题同时输出 `color-scheme`，滚动条与表单底色跟着明暗切换 |
| 焦点 | `src/styles/base.css` | `:focus-visible` 统一 2px 强调色轮廓、4px 偏移；保留键盘可见状态 |

手机的正文统一为 16px；较大的页面使用 17px。正文行高为 1.85，界面控件为 1.6，页首标题为 1.3。首页文章条目保留 32px／手机 24px 的对称留白与 12px 内部间距；紧凑文章列表保留 12px 行留白。

## 动效

| 用途 | 令牌 | 时长 |
| --- | --- | --- |
| 悬停、颜色、箭头、目录指示 | `--motion-fast` | 180ms |
| 菜单、搜索弹窗、主题、返回顶部、折叠目录 | `--motion-enter` | 250ms |
| 分页与共享文章标题 | `--motion-page` | 320ms |
| 页面退出 | `--motion-exit` / `--motion-fade` | 220ms / 120ms |
| 进度条起笔延迟 | `--motion-progress-delay` | 200ms |
| 进度条每段增长 | `--motion-progress-step` + `--motion-progress-ramp` | 260ms 起，每段加 90ms |

进入使用 `--ease-enter`，退出使用 `--ease-exit`，颜色变化使用 `--ease-ui`。普通进入位移为 `--motion-distance`（8px），分页为 `--motion-page-distance`（32px）。保留已有翻页方向、共享标题变形和延迟进度条机制。

标题淡变交接使用 `--motion-handoff`（100ms），排版一致的缩小过渡使用 `--motion-handoff-late`（80ms），开始时间由总时长减去交接时长计算。进度条扫光使用 `--motion-sweep`（500ms），脚本读取实际 CSS 动画时长后再淡出，避免变量调整造成截断；起笔延迟与每段时长也由脚本读取 `--motion-progress-*` 和 `--motion-page`，不在 JS 里另写毫秒。目录高亮的判定线取 `html` 的实际 `scroll-padding-top`，与锚点落点保持同一条线。

动效与触控／焦点规则属于交互可访问性扩展。所有非必要控件动画放在 `prefers-reduced-motion: no-preference` 内；减少动态效果时停止平滑滚动、箭头位移与文档过渡。灯箱保留极短动画结束事件，确保关闭清理完成。

## 维护方式

- 新页面先复用 `.content` 或 `.wrap`，页首复用 `.page-head`；Markdown 的首个 h1 自动采用同一规则。
- 新增样式引用现有语义令牌；媒体查询不能消费 `var()`，所以断点集中在 `tokens.css` 的 `--bp-*` 名册，
  脚本侧同名常量在 `src/lib/breakpoints.ts`，两处对应关系和新增字面值由 `npm test` 核对；
  避免在多个页面重复覆盖相同留白。
- 保留字形光学校正、图片尺寸、表格／代码横向滚动等局部几何规则。
- 样式入口为 `src/styles/global.css`，功能规则放入对应文件，避免继续堆叠覆盖规则。
- 修改后运行 `npm run check`、`npm test`、`npm run test:browser`，检查桌面、手机、横屏、明暗主题与减少动态效果。

实现遵循 [Astro 样式指南](https://docs.astro.build/en/guides/styling/) 和 [Astro 组件指南](https://docs.astro.build/en/basics/astro-components/)。
