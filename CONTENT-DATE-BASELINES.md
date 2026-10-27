# 文章历史更新时间基线

核对日期：2026-10-27。来源为 `E:\Repos\Blog_MkDocs`，Git 快照 `48154cc8ca0d1deaff60a20a64b268890c5c33a2`。

这份记录对应 `src/data/content-date-baselines.json`，供迁移后的 Astro 站点保留旧站文章的历史修订时间。

## 取值规则

- 逐篇匹配 `docs/blog/posts/` 与 `src/content/blog/` 的相对路径，并核对 slug。
- 优先使用旧文章显式声明的 `date.updated`（兼容 `updatedDate`）；缺失时取 `git log -1 --follow --format=%cI <快照> -- <文章路径>`。
- 当前迁移的 17 篇文章均未声明更新时间，因此本次全部取自 Git。保留完整时间与原时区，不截断为日期。
- 历史修订时间包含旧仓库中的文件重命名、资源路径调整和发布当天的提交，以保存旧站 Git 修订日期的语义；后续 Astro 提交仍按内容签名规则计算。
- 只有首次提交的文章也保留该提交时间，作为历史修订基线，不据此声称发生过额外修改。读者提示继续按 UTC+8 隐藏发布同日的更新；SEO 修改时间不早于发布日期。
- `Example-Article.md`（示例草稿）和 `2025-12-26_Site-Announcement.md` 未迁入当前文章集合，本次不新增文章。
- 本记录仅补齐文章基线；关于页、友链页仍使用 Astro 仓库现有历史。

## 核对结果

路径相对于两侧的文章目录；下列提交号均属于 MkDocs 仓库。

| 文章 | 相对路径 | 历史修订时间 | 来源提交 |
|---|---|---|---|
| 本站的第一篇文章 | `2025-03-29_First-Article.md` | `2025-08-23T10:30:56Z` | `714380a` |
| GitHub 屏蔽中国地区访问的解决方案 | `2025-04-13_GitHub-Block-CN-IP.md` | `2025-08-23T10:25:03Z` | `ce59dbb` |
| GitHub 暂时取消未登录用户从中国访问的限制 | `2025-04-14_GitHub-Unblock-CN.md` | `2025-08-23T10:25:03Z` | `ce59dbb` |
| 停更三年项目后，一个中学生亲历的易语言消亡史 | `2025-06-03_eyuyan-KFACBT_Toolkit.md` | `2025-06-06T02:59:10Z` | `323a1cd` |
| 中考必胜 | `2025-06-26_Zhongkao.md` | `2025-06-25T21:30:13Z` | `e55c4bb` |
| 本站域名已更改 | `2025-08-23_Domain-Changed.md` | `2025-10-22T14:01:56Z` | `289f4fe` |
| 使用 Cloudflare DNS 轻松实现域名重定向 | `2025-10-01_Cloudflare-Redirect/index.md` | `2025-12-26T11:52:33Z` | `4a5c654` |
| Google Pixel 5 开启 VoLTE 实录 | `2025-10-18_Google-Pixel-5-VoLTE.md` | `2025-10-18T14:08:32Z` | `fd571df` |
| 琐事记 #1：生日、入团、技能大赛 | `2025-12-14_Weekly-Diary.md` | `2025-12-14T09:58:32Z` | `989e6e8` |
| 琐事记 #2：被打、大赛后续、办卡 | `2025-12-21_Weekly-Diary_2.md` | `2025-12-21T15:20:00Z` | `f37e8e7` |
| 琐事记 #3：训练日常、烫伤、长春一日游 | `2025-12-28_Weekly-Diary_3.md` | `2026-05-22T23:14:50+08:00` | `a70ac3d` |
| Blue Archive Spine 立绘提取与自定义导出全流程 | `2026-01-18_Blue-Archive-Spine/index.md` | `2026-05-22T23:14:50+08:00` | `a70ac3d` |
| 停更的这几个月，我在做什么 | `2026-05-22_Monthly-Summary/index.md` | `2026-05-22T22:21:20+08:00` | `1438964` |
| 记录我的 Android Root 方案 | `2026-08-13_Android-Root.md` | `2026-08-16T20:38:56+08:00` | `88627fb` |
| Pixel 5 的 VoLTE 又坏了：一次 IMS 故障排查记录 | `2026-08-16_Pixel-5-VoLTE-Troubleshooting/index.md` | `2026-08-16T20:38:56+08:00` | `88627fb` |
| 反思 | `2026-09-17_Fuck.md` | `2026-09-17T22:29:12+08:00` | `5a4d8b0` |
| 猫 | `2026-09-26_Cat.md` | `2026-09-26T20:37:30+08:00` | `48154cc` |

其中《本站域名已更改》的 `289f4fe` 是文件重命名，《使用 Cloudflare DNS 轻松实现域名重定向》的 `4a5c654` 是文章和图片存储位置调整。两者保留旧仓库最后修订时间，未改写为本次迁移或构建时间。

## 与 Astro 仓库提交历史的关系

本文件的日期只来自 MkDocs 仓库；Astro 侧的「更新于」由 `src/lib/content-dates.mjs` 按已提交的内容签名历史计算，
本文件作为迁移前的基线注入。因此本仓库的提交历史一旦重写（`git filter-repo`、squash、regroup 都算），
两个后果必须当场复核：

1. `scripts/ensure-git-history.mjs`（`prebuild` 门）能否取到完整历史——浅克隆或部分历史会让内容日期静默缺失；
2. `src/data/content-date-baselines.json` 里的路径与 slug 是否仍与当前文章一一对应——重命名后地址公式
   （`src/lib/post-url.mjs`）变了，基线键不匹配同样静默丢 `lastmod`，由 `e2e/metadata.spec.ts` 的站点地图断言兜住。

`.git/` 内 2026-10-27 的两份重写对照记录（`history-rewrite-20261027.md`、`history-regroup-20261027-205549/`）属于当时的一次性产物，
其中写的「新 HEAD」已不再是当前 HEAD 的祖先，只作过程留痕，不要当作基线依据。
