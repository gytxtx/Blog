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
  - 技术

slug: GitHub-Block-CN-IP

links:
  - GitHub: https://github.com/

comments: true
---

# GitHub 屏蔽中国地区访问的解决方案

4 月 13 日 13:00 左右，GitHub 屏蔽了中国地区的访问，未登录用户访问时会触发 `HTTP 403 Forbidden` 错误，提示 **“Access to this site has been restricted.”**。已登录用户也可能会受到限制。

以下是我验证的一些解决方案：

<!-- more -->

---

## 1. 使用代理服务器（推荐）
使用代理客户端（如 Clash、V2Ray），连接非中国节点（美国、日本、新加坡等），并开启系统代理即可绕过 IP 封锁。

*由于众所周知的原因，不提供代理服务器提供商，请自行查找。*

## ~~2. 利用 Bug 绕过限制（此方法已不可用）~~
使用被封禁的节点（例如中国大陆网络）访问 <https://github.com/login/> 后， GitHub 会存储一个 Cookie ，这时只要这个 Cookie 不被删除，再用被 GitHub 封禁的节点访问 GitHub 就不会被 403 禁止访问，无需登录 GitHub 。如果这个 Cookie 被删除， GitHub 还会 403 禁止访问。

说人话就是：裸连 GitHub 并访问 <https://github.com/login/>，无需理会 `Access to this site has been restricted.`，之后直接访问 `github.com` 即可解除限制。

## 3. 使用镜像站
使用类似于 [KKGitHub](https://kkgithub.com/) 的 GitHub 镜像服务来解除限制。

---

**声明：本文仅提供技术讨论，不推荐具体工具或服务商。**

部分方法可能随政策调整失效，如果有其他方法欢迎在评论区补充。

本文撰写匆忙，如有错误请及时指出。
