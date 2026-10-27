/**
 * 脚本侧的断点常量，与 src/styles/tokens.css 的 `--bp-*` 名册一一对应。
 * 对应关系由 tests/breakpoints.test.mjs 核对；样式里的 @media 仍写字面像素值。
 */
export const BREAKPOINTS = {
  mini: 480,
  compact: 640,
  menu: 960,
  measure: 1024,
  toc: 1279,
} as const;
