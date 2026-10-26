# Blog

项目仓库：[gytxtx/Blog_Astro](https://github.com/gytxtx/Blog_Astro)。

基于 [Astro](https://astro.build/) 框架搭建的个人博客。由 Material for MkDocs 迁移而来，
迁移评估与方案见旧仓库的 `MIGRATION-ASSESSMENT.md` / `MIGRATION-PLAN.md`。

模块归属、主题与路由兼容契约、脚本清理方式和验收标准见 `THEME-GUIDE.md`。
全站布局、字号、空间尺度、公共控件与动效约定见 [DESIGN.md](./DESIGN.md)。

## 常用命令

响应式规则：960px 及以下使用折叠导航，跨断点切换后重置菜单状态；640px 及以下卡片单列，
480px 及以下完整日期独占一行并缩小卡片留白。导航、标签和阅读全文等触屏入口至少高 44px。
顶栏、正文和页脚使用安全区留白，搜索弹窗监听 VisualViewport，在横屏和软键盘弹出时
保留关闭入口并让结果单独滚动。浏览器回归包含 320–1180px 手机、平板横竖屏；软键盘和安全区采用模拟验证。

- [查看官方使用说明](https://docs.astro.build)
  Astro 文档

- 不带链接的介绍文字
  展示卡片
:::
```

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