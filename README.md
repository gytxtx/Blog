# Blog

项目仓库：[gytxtx/Blog_Astro](https://github.com/gytxtx/Blog_Astro)。

基于 [Astro](https://astro.build/) 框架搭建的个人博客。由 Material for MkDocs 迁移而来，
迁移评估与方案见旧仓库的 `MIGRATION-ASSESSMENT.md` / `MIGRATION-PLAN.md`。

## 常用命令

- [查看官方使用说明](https://docs.astro.build)
  Astro 文档

- 不带链接的介绍文字
  展示卡片
:::
```

链接文字为 `owner/repo` 时，简介自动获取；换成其他文字可作为自定义简介：

容器外的普通链接、行内链接和代码块不转换。Astro 页面可直接使用同一组件：

卡片的仓库名和链接在 HTML 中直接输出，无 JavaScript 时仍可访问。进入视口后获取公开 GitHub
信息，补全简介、语言、Stars 和 Forks；同一仓库请求去重，成功结果在会话内缓存 30 分钟。
请求失败、仓库不存在或触发限流时保留原卡片，不显示虚假的零统计，也不影响构建。
`fetchMetadata={false}` 可关闭自动获取，完全使用手动填写的数据。构建不请求 GitHub API，无需 Token。

## 迁移要点（面向未来的自己）