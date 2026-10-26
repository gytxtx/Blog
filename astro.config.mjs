// @ts-check
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import { unified } from '@astrojs/markdown-remark';
import remarkBreaks from 'remark-breaks';
import remarkDirective from 'remark-directive';
import remarkNoLegacyIcons from './src/lib/remark-no-legacy-icons.mjs';
import remarkReadingStats from './src/lib/remark-reading-stats.mjs';
import serifSubset from './src/integrations/serif-subset.mjs';
import { SITE } from './src/consts.ts';
import { THEMES } from './src/lib/theme.ts';

const site = SITE.url;

export default defineConfig({
  site,
  // 页面地址统一使用末尾斜杠，动态旧地址直接跳到规范地址。
  trailingSlash: 'always',
  redirects: { '/blog': '/', '/blog/page/2': '/page/2' },
  integrations: [
    expressiveCode({
      themes: Object.values(THEMES).map((theme) => theme.name),
      // 明暗切换通过 <html data-theme="github-light|github-dark"> 控制
      themeCssSelector: (theme) =>
        `[data-theme="${theme.name.toLowerCase().replace(/\s+/g, '-')}"]`,
    }),
    sitemap({
    }),
    // 图标：Lucide 图标集（@iconify-json/lucide），用法 <Icon name="lucide:sun" />；
    // 本地 SVG 放 src/icons/ 后用 <Icon name="文件名" />
    icon(),
    // 标题衬线字体按页面实际用字裁子集并自托管（/fonts/NotoSerifSC-Bold.woff2）
    serifSubset(),
  ],
  markdown: {
    // Astro 7 默认处理器是 Sätteri，remark 插件要挂在 unified() 处理器上。
    // remark-breaks 对应 Material 的 nl2br 扩展（单个换行渲染为 <br>）
    // remark-reading-stats 往 remarkPluginFrontmatter 写字数 words 与阅读时间 minutes
    processor: unified({ remarkPlugins: [
      remarkDirective,
      remarkNoLegacyIcons,
      remarkBreaks,
      remarkReadingStats,
    ] }),
  },
});
