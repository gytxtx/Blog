# Blog

基于 [Astro](https://astro.build/) 框架搭建的个人博客。由 Material for MkDocs 迁移而来，
迁移评估与方案见旧仓库的 `MIGRATION-ASSESSMENT.md` / `MIGRATION-PLAN.md`。

表现层由本人在 `theme` 分支上手写重写，契约与验收标准见 `THEME-GUIDE.md`。

## 常用命令

```bash
npm ci                # 安装依赖
npm run dev           # 本地开发（搜索索引在构建后才存在，dev 下搜索按钮无效属正常）
npm run build         # astro build（含标题字体子集）→ pagefind 索引
npm run check         # astro check 类型检查
npm run preview       # 预览构建产物
npm run check-urls    # URL 验收门：构建产物 vs 线上基线 diff
```

## 部署（Cloudflare Pages）

`wrangler.toml` 只声明产物目录 `dist`（Pages 不读其中的构建命令）；控制台里构建命令设为 `npm run build`。

- 自定义域名 `blog.gytxtx.top` 在 Cloudflare 控制台绑定（`public/CNAME` 为历史遗留保留）。

## 迁移要点（面向未来的自己）

- **URL 冻结**：文章 URL 规则为 `/blog/YYYY/MM/DD/{front-matter slug}/`，日期取
  front matter 的 `pubDate`（Material 时代的 `date.created`）。`scripts/check-urls.mjs` 对比线上基线
  （`urls-baseline-raw.xml`），未解释差异必须为 0；已解释差异记录在脚本内
  `EXPLAINED_MISSING`。
- **文章元数据**：`title / description / pubDate / updatedDate / heroImage` 与 Astro 官方 blog 模板同名；
  "更新于"只认 front matter 的 `updatedDate`，改了文章要手动写上（迁移时已按旧站"最后更新"回填）。
- **OG 社交卡片**：`src/pages/og/[...slug].png.ts` 用 satori 逐页生成；
  中文字体为 GB2312 全集子集（`scripts/subset-font.mjs` 预生成、已入库，构建期零网络依赖）。
  注意 satori 默认按 content-box 处理尺寸，样式里必须显式 `boxSizing: 'border-box'`。
- **标题字体**：Noto Serif SC Bold 自托管，`src/integrations/serif-subset.mjs` 在构建结束时扫 `dist`
  里的标题文字，从入库的 GB2312 子集再裁出 `/fonts/NotoSerifSC-Bold.woff2`（约 80 KB）；dev 下直接提供完整
  GB2312 子集。不依赖 Google Fonts（国内不可达时会阻塞首屏）。缓存策略见 `public/_headers`。
- **搜索**：Pagefind，`scripts/pagefind-index.mjs` 建索引（中文按 Intl.Segmenter 预切词，与查询端一致）；
  只索引文章正文和关于/友链；UI 走官方 Default UI。
- **评论**：Giscus 按 pathname 映射，参数与旧站一致，URL 不变即评论不丢。
- `src/content/blog/2026-09-17_Fuck.md` 在源仓库中当前为草稿（`draft: true`），
  因此不出现在站点中——这与旧站行为一致。
