# 站点 UI 约定

站点使用 Astro 与原生 CSS。沿用米白／深绿配色、衬线标题和简洁的阅读布局；明暗主题由 `src/lib/theme.ts` 管理。

## 公共规则

手机的正文统一为 16px；较大的页面使用 17px。正文行高为 1.85，界面控件为 1.6，页首标题为 1.3。首页文章条目保留 32px／手机 24px 的对称留白与 12px 内部间距；紧凑文章列表保留 12px 行留白。

## 动效

## 维护方式

- 新页面先复用 `.content` 或 `.wrap`，页首复用 `.page-head`；Markdown 的首个 h1 自动采用同一规则。
- 新增样式引用现有语义令牌；断点只修改令牌，避免在多个页面重复覆盖相同留白。
- 保留字形光学校正、图片尺寸、表格／代码横向滚动等局部几何规则。
- 样式入口为 `src/styles/global.css`，功能规则放入对应文件，避免继续堆叠覆盖规则。
- 修改后运行 `npm run check`、`npm test`、`npm run test:browser`，检查桌面、手机、横屏、明暗主题与减少动态效果。

实现遵循 [Astro 样式指南](https://docs.astro.build/en/guides/styling/) 和 [Astro 组件指南](https://docs.astro.build/en/basics/astro-components/)。
