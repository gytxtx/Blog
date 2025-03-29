---
date:
    created: 2025-03-29

authors:
- gytxtx

categories:
- 杂谈

slug: First-Article

links:
  - 文章列表: blog/index.md
  - 关于我: blog/About.md
  - 外部链接:
    - MkDocs-Material 文档: https://squidfunk.github.io/mkdocs-material/
---

# 本站的第一篇文章

最近萌生了搭建个人博客的想法，但手头没有服务器资源，也不想投入过多运维成本——这让我突然想起之前部署过的 **[Material for MkDocs](https://github.com/squidfunk/mkdocs-material)** 文档框架。这个原本用于技术文档的工具，或许正是我需要的极简博客解决方案。

<!-- more -->

---

## 为什么选用 Material for MkDocs？

### 1. Material Design 的纯粹美感

作为 Google 设计语言的忠实爱好者，**Material for MkDocs** 天生具备 **沉浸式的视觉层次**。恰到好处的阴影过渡、丝滑的组件交互，以及自适应暗色模式，让写作体验与内容呈现都充满现代感。

### 2. 低代码高定制的平衡术

通过简单的 `mkdocs.yml` 配置文件即可实现：

- [自定义导航栏与页脚](https://squidfunk.github.io/mkdocs-material/setup/)
- [集成评论系统](https://squidfunk.github.io/mkdocs-material/setup/adding-a-comment-system/)（如 Giscus）
- [添加 SEO 优化标签](https://squidfunk.github.io/mkdocs-material/setup/setting-up-tags/)
- [扩展 Markdown 语法支持](https://squidfunk.github.io/mkdocs-material/reference/)（流程图、数学公式等）
- 更多扩展 / 自定义功能...

无需前端知识，却能实现专业级定制，这对技术出身的写作者尤为友好。

### 3. 静态网站的优雅哲学

所有内容通过 Markdown 书写，`mkdocs build` 命令一键生成纯静态页面，可直接部署至 `GitHub Pages` / `Vercel` 等免费平台。没有数据库维护压力，没有插件漏洞风险，只有 **「内容即资产」** 的极简主义。

---

## 为什么不用 WordPress？

1. **成本敏感**：一台 24 小时在线的云服务器年费足够买三本技术书籍，而静态托管方案真正实现零成本运维 ~~（其实主要原因就是：我是学生党）~~
2. **减法原则**：当 80% 的博客功能只是展示文章时，为何要承受插件更新、后台管理、性能调优的重负？
3. **版本控制基因**：所有文章以 `.md` 文件存储于 Git 仓库，天然具备版本回溯、多端同步能力，写作过程本身就是代码提交史

---

## 关于这个博客的实验性尝试

作为技术爱好者，我始终相信 **「输出是最好的输入」**。这里将主要记录：

- :material-book: 技术原理分享（WinAPI 实践 / 编程技巧 / 云原生构建 等）
- :material-code-tags: 效率工具链实践
- :material-pen: 偶尔跨界的人文思考

我也同时在实践中学习，这也印证了 「Anyway, Keep learning.」 这句话。

尽管这是首次尝试博客创作，但我更愿意将其视为 **「数字花园」** 的播种——不追求日更的节奏，只聚焦于持续的知识沉淀与重构。如果您在阅读中发现任何技术谬误，或是有想探讨的话题，欢迎跳转至 [:material-email-outline: 关于我](https://gytxtx.github.io/Blog/blog/About/) 页面获取联系方式与我交流。

静待思想的种子在此生根发芽。🌱

---

> **后记**
>
> 本文全程使用 VS Code 编辑，通过 GitHub Actions 自动构建部署，使用 GitHub Pages 托管————这或许就是静态博客的魅力所在。
>
> 使用 `DeepSeek R1` 长思考模型辅助撰写。（他把我想说的都说了，太 NB 了）
