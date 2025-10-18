---
title: Google Pixel 5 开启 VoLTE 实录

date:
  created: 2025-10-18

readtime: 3

authors:
  - gytxtx

categories:
  - 玩机

slug: Google-Pixel-5-VoLTE

comments: true
---

# Google Pixel 5 开启 VoLTE 实录

我之前一直在用的 Vivo X9 Plus，因为性能老旧、系统卡顿等原因，使用体验越来越差。于是我开始考虑更换一部能解锁、能折腾的手机。

本来打算买小米，但近几年小米对 Bootloader 解锁限制越来越严格，最终我把目标转向了朋友推荐的 **Google Pixel 系列**。  
在预算范围内，Pixel 5 的配置和手感都不错，于是我入手了它。

本文记录我在使用 Pixel 5 时，开启 **VoLTE 功能** 的过程与体验。

<!-- more -->

---

## 硬件配置与日常体验

Pixel 5 搭载 Snapdragon 765G 处理器，配备 8 GB 内存与 128 GB 存储。  
虽然这颗芯片发布于 2019 年，但对比我之前的 Snapdragon 653 来说，性能提升相当明显。

屏幕是一块 1080 × 2340 的 OLED 面板，支持 90 Hz 刷新率。  
系统操作流畅，日常使用微信、支付宝、哔哩哔哩等国产应用也不会明显卡顿。

---

## 通话与网络问题

由于 Pixel 系列未在中国大陆发售，Google 默认 **禁用了中国地区的 VoLTE 和 5G 功能**。  
插入中国移动 SIM 卡后，可以上网与通话，但不支持 VoLTE，通话时会自动切换到 EDGE 网络，质量较差。  
而在使用中国联通 SIM 卡时，由于部分地区已停用 3G 基站，甚至无法拨号。

因此，要正常使用通话功能，**开启 VoLTE 就显得十分必要。**

---

## 开启 VoLTE 的过程

我最初尝试了 [Pixel IMS](https://github.com/kyujin-cho/pixel-volte-patch) 项目，但文档中明确说明 **不支持 Pixel 5**，尝试后也未成功。

后来参考了这篇教程：[在 Pixel 5 上开启 VoLTE 的解决方案](https://blog.youth2009.org/pixel-5-flash-root-enable-volte/)，  
按照步骤刷入 Magisk 模块并修改配置后，VoLTE 功能成功恢复。

!!! warning "注意"
    * 该方法需解锁 Bootloader 并 Root 设备，可能导致系统不稳定或无法接收 OTA 更新。
    * 操作前务必备份数据。

---

## 总结

Pixel 5 虽然已是一款老设备，但在系统优化和整体体验上依旧出色。  
解决 VoLTE 问题后，作为主力机完全够用。  
如果你也喜欢干净纯粹的 Android 系统，并不介意折腾，这款设备依然值得一试。
