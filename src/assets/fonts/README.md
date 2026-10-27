# 字体来源与许可

本目录中的 `NotoSansSC-Regular-subset.otf` 与 `NotoSerifSC-Bold-subset.otf`
由 [Noto CJK](https://github.com/notofonts/noto-cjk) 的简体中文字体裁剪而来，
以 SIL Open Font License 1.1 分发。项目根目录的 MIT 许可证不适用于这些字体。

- Noto Sans CJK SC：© 2014-2021 Adobe (http://www.adobe.com/).
  [版权及 OFL 全文](../../../public/fonts/OFL-NotoSansSC.txt)
- Noto Serif SC：© 2017-2024 Adobe (http://www.adobe.com/).
  [版权及 OFL 全文](../../../public/fonts/OFL-NotoSerifSC.txt)

版权信息来自各字体的 name 表。`scripts/subset-font.mjs` 生成本目录的 OTF 子集，
`src/integrations/serif-subset.mjs` 进一步生成网站使用的 `NotoSerifSC-Bold.woff2`。
两份许可材料位于 `public/fonts/`，会随构建产物发布；重新生成或更换字体时保留相应的版权及许可材料。
