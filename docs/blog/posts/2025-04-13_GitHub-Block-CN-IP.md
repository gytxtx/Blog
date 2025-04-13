---
date:
    created: 2025-04-13

authors:
- gytxtx

readtime: 3

categories:
- GitHub

tags:
- GitHub

slug: GitHub-Block-CN-IP

links:
  - GitHub: https://github.com/

comments: true

---

# GitHub 屏蔽中国地区访问的解决方案

4 月 13 日 13:00 左右，陆续有人发现自己无法正常使用 GitHub ，页面上显示 **Access to this site has been restricted.** 错误（`HTTP 403`），已登录用户不受影响。

下面是一些解决方案：

<!-- more -->

---

## 1. 使用代理服务器

使用类似于 Clash Verge 的代理客户端，下载代理服务器提供商提供的订阅链接之后，选择一个非中国节点（中国大陆及港澳台），并开启系统代理即可解决问题。

*由于众所周知的原因，不提供服务器提供商，请自行查找。*

## 2. 利用 Bug 绕过限制

使用被封禁的节点（例如中国大陆网络）访问 <https://github.com/login/> 后， GitHub 会存储一个 Cookie ，这时只要这个 Cookie 不被删除，再用被 GitHub 封禁的节点访问 GitHub 就不会被 403 禁止访问，无需登录 GitHub 。如果这个 Cookie 被删除， GitHub 还会 403 禁止访问。

说人话就是：裸连 GitHub 并访问 <https://github.com/login/>，无需理会 `Access to this site has been restricted.`，之后直接访问 `github.com` 即可解除限制。

## 3. 使用镜像站

使用类似于 [KKGitHub](https://kkgithub.com/) 的 GitHub 镜像服务来解除限制。

---

目前我试过可用的就这三点，如果有其他方法欢迎在评论区补充。

本文撰写匆忙，如有错误请及时指出。
