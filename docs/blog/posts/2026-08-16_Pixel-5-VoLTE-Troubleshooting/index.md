---
date:
  created: 2026-08-16

# draft: true

readtime: 6

authors:
  - gytxtx

categories:
  - 玩机

slug: Pixel-5-VoLTE-Troubleshooting

comments: true
---


# Pixel 5 的 VoLTE 又坏了：一次 IMS 故障排查记录

去年我写过一篇 [Google Pixel 5 开启 VoLTE 实录](https://blog.gytxtx.top/blog/2025/10/18/Google-Pixel-5-VoLTE/)，记录了自己给 Pixel 5 开启国内 VoLTE 的过程。

最近重置手机之后，我又重新配置了一遍 Root 环境。

本来以为把以前用的模块重新装回去就完事了，结果重启之后却发现：

**VoLTE 又寄了。**

进入 `*#*#4636#*#*` 查看状态，IMS 一直没有注册。

问题是——我之前同样用过 APatch，同样装这个 VoLTE 模块，当时明明一点问题都没有。

于是就有了这次折腾。

<!-- more -->

---

## 一开始，我以为只是 IMS 配置坏了

我的设备还是那台 Pixel 5，运营商是中国移动。

手机本身可以正常连接 LTE，移动数据也完全正常，所以显然不是 SIM 卡没识别或者基站没信号。

先看了一下 CarrierConfig：

```sh
dumpsys carrier_config | grep -i volte
```

结果里面有：

```text
carrier_volte_available_bool = false
carrier_volte_provisioned_bool = false
```

第一眼看到这里，我还挺激动：

> 抓到了，不就是 CarrierConfig 没加载对吗？

但继续排查之后，事情没这么简单。

系统里的 Qualcomm IMS 服务其实正常存在：

```sh
pm list packages | grep -i ims
```

能找到：

```text
org.codeaurora.ims
com.android.service.ims
...
```

正在运行的服务里也能看到：

```text
org.codeaurora.ims/.ImsService
```

所以 IMS 组件并没有丢。

---

## 真正有用的线索来自 Radio Log

既然 Android 这一层看不出明显问题，那就继续往 modem 方向查。

抓取 Radio Log：

```sh
logcat -b radio -d | grep -iE "ims|volte|mbn"
```

其中有一段让我开始觉得不对劲：

```text
GRIL-Q : MODEM: [GRPT][IMS Config] EFS-Ver.:0, VoLTE:Y, VT:Y, VoWiFi:WFC Disabled, CallPref:Cellular preferred, RTT:NA.

GRIL-Q : MODEM: [GRPT][IMS Config] OMA-DMServiceMask: 0x0, SERVICE_ENABLE:N, VOLTE_ENABLE:N, VT_ENABLE:N, PRESENCE_ENABLE:N, VOWIFI_ENABLE:N
```

意思很直接：

**modem 支持 VoLTE，但当前配置并没有把 VoLTE 打开。**

接着又看到了：

```text
GRIL-Q : MODEM: [GRPT][MBN] WildCard, sub[0]
GRIL-Q : MODEM: [GRPT][MBN] SW_DEFAULT, sub[1]
```

MBN 可以简单理解为高通 modem 针对不同地区、运营商准备的一套配置。

而这里加载的是 `WildCard`，也就是通用配置。

这就奇怪了。

因为我安装的 VoLTE 模块明明就是靠补充 MBN 配置来支持国内运营商的。

---

## 模块里明明有 China，系统里却没有

于是我去看了一下手机当前真正能看到的 MBN：

```sh
ls /vendor/rfs/msm/mpss/readonly/vendor/mbn/mcfg_sw/generic/Pixel
```

结果：

```text
APAC
AUNZ
EU
MEA
NA
PTCRB
SEA
TestSIM
common
```

没有：

```text
China
```

再看看 VoLTE 模块里面：

```sh
ls /data/adb/modules/Pixel5VolteVoWiFi/vendor/rfs/msm/mpss/readonly/vendor/mbn/mcfg_sw/generic/Pixel
```

结果却是：

```text
AF
APAC
AUNZ
China
EU
Korea
LATAM
MEA
NA
Russia
SA
SEA
Test
common
```

这下就有意思了。

**模块里有 China，真正的 `/vendor` 里却没有。**

也就是说：

> 模块装上了，但里面最关键的文件根本没有被挂载进去。

到这里，问题突然从“IMS 为什么注册失败”变成了：

**Root 模块到底有没有正常挂载？**

---

## 手动挂一下试试

为了验证自己的猜测，我直接把模块里的 MBN 目录 Bind Mount 到系统：

```sh
mount --bind \
/data/adb/modules/Pixel5VolteVoWiFi/vendor/rfs/msm/mpss/readonly/vendor/mbn \
/vendor/rfs/msm/mpss/readonly/vendor/mbn
```

然后再次查看：

```sh
ls /vendor/rfs/msm/mpss/readonly/vendor/mbn/mcfg_sw/generic/Pixel
```

这次：

```text
China
```

出现了。

接着重新启动 IMS 相关服务，再打开 `*#*#4636#*#*`。

结果：

**IMS 注册：已注册**
**LTE 语音通话：可用**
**视频通话：可用**

看到这里的时候，问题其实已经实锤了。

不是运营商问题。

不是 SIM 卡问题。

不是 Qualcomm IMS 服务坏了。

甚至 VoLTE 模块本身也没有问题。

**纯粹就是模块没有正确挂载到 `/vendor`。**

---

## 那为什么以前可以，现在不行？

这个问题一开始最让我困惑。

因为我以前确实也是 APatch，而且 VoLTE 一直正常。

后来去翻 APatch 的更新记录，才发现中间发生过一个很重要的变化。

2026 年 1 月，APatch 加入了 MetaModule 机制，并明确表示：

**此后 APatch 本身不再负责模块挂载，挂载工作交给 MetaModule。**

换句话说，以前大概是：

```text
APatch
  ↓
直接处理模块挂载
  ↓
VoLTE 模块正常进入 /vendor
```

现在则变成了：

```text
APatch
  ↓
MetaModule
  ↓
由具体挂载实现决定模块怎么进入系统
```

而我这次使用的是：

```text
meta-overlayfs
```

所以真正改变的并不是 VoLTE 模块，而是 **APatch 的模块挂载机制**。

---

## 最后抓到了 OverlayFS 的报错

继续看 `meta-overlayfs` 自己的输出：

```sh
/data/adb/modules/meta-overlayfs/meta-overlayfs --help
```

它其实已经正确识别到了 VoLTE 模块：

```text
Processing module: Pixel5VolteVoWiFi
  + system/
  + vendor/
```

`/system` 也成功挂上了。

但到 `/vendor` 时：

```text
mount overlay for /vendor
```

随后出现：

```text
bind mount ./firmware_mnt -> /vendor/firmware_mnt

failed to mount overlay for child /vendor/firmware_mnt:
Function not implemented

mount vendor failed:
Function not implemented
```

Pixel 5 的 `/vendor` 下面还有一个独立挂载的：

```text
/vendor/firmware_mnt
```

`meta-overlayfs` 在处理整个 `/vendor` Overlay 时，碰到这个子挂载失败，最后把整个 Vendor Overlay 回滚了。

结果就是一种非常迷惑的状态：

`/system` 模块内容：正常
`/vendor` 模块内容：没挂上

平时可能根本察觉不到。

但偏偏这个 VoLTE 模块最重要的 MBN 就在 `/vendor` 里面。

于是 IMS 就没了。

---

## 换成 Magic Mount，问题消失

既然已经确定是 OverlayFS 的问题，我最后没有继续折腾它，而是换成了：

[Hybrid Mount](https://github.com/Hybrid-Mount/meta-hybrid_mount)

然后把挂载方式改成：**Magic Mount**，之后重启。

再次打开 IMS 状态：

```text
IMS 注册：已注册
LTE 语音通话：可用
视频通话：可用
```

彻底恢复。

Magic Mount 没有走之前那条会在 `/vendor/firmware_mnt` 上失败的 OverlayFS 路径，于是模块里的 MBN 终于能够正常出现在 `/vendor` 里。

---

## 所以这次到底发生了什么？

简单总结一下就是：

```text
以前的 APatch
    ↓
模块可以正常挂载
    ↓
China MBN 生效
    ↓
IMS 正常
```

后来：

```text
APatch 的模块挂载交给 MetaModule
    ↓
我用了 meta-overlayfs
    ↓
/vendor Overlay 因 firmware_mnt 失败
    ↓
VoLTE 模块里的 China MBN 没挂进去
    ↓
modem 加载 WildCard
    ↓
VOLTE_ENABLE=N
    ↓
IMS 不注册
```

最后：

```text
换 Hybrid Mount
    ↓
使用 Magic Mount
    ↓
MBN 正确挂载
    ↓
IMS 注册成功
```

---

## 一点感想

这次最折磨人的地方，是问题表面上看起来完全像 IMS 或运营商配置出了问题。

CarrierConfig 是 `false`。

IMS 没注册。

modem 里 `VOLTE_ENABLE=N`。

MBN 又是 `WildCard`。

每一条看起来都能单独让人研究半天。

结果一路查到底，真正的问题却只是：

> **模块里的文件压根没挂上去。**

更坑的是，APatch 管理器里模块始终显示为正常启用，`/system` 下的模块内容也确实生效了。

所以从表面上看，完全没有理由怀疑“模块其实只挂上了一半”。

以后如果再遇到升级 Root 方案之后某个模块突然失效，我大概会先去确认一件事：

> **模块里的文件，真的出现在它应该出现的位置了吗？**

有时候比研究半天配置有效得多。

总之，折腾了一下午。

最后看到：

```text
IMS 注册：已注册
```

只能说——

舒服了。
