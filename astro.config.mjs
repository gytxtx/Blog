// @ts-check
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import { unified } from '@astrojs/markdown-remark';
import remarkBreaks from 'remark-breaks';
import remarkReadingTime from './src/lib/remark-reading-stats.mjs';
import remarkDirective from 'remark-directive';
import remarkNoLegacyIcons from './src/lib/remark-no-legacy-icons.mjs';

export default defineConfig({
  site: 'https://blog-gytxtx.pages.dev',
  // 站点结构调整（2026-10-25）：首页即文章列表。旧博客索引 /blog/ 与其分页
  // 是 URL 基线成员（外链在用），静态重定向到新位置，URL 冻结承诺不破。
  redirects: {
    '/blog': '/',
    '/blog/page/2': '/page/2',
  },
  integrations: [
    expressiveCode({
      themes: ['github-light', 'github-dark'],
      // 明暗切换通过 <html data-theme="github-light|github-dark"> 控制
      themeCssSelector: (theme) =>
        `[data-theme="${theme.name.toLowerCase().replace(/\s+/g, '-')}"]`,
    }),
    sitemap(),
    // 图标：Lucide 图标集（@iconify-json/lucide），用法 <Icon name="lucide:sun" />；
    // 本地 SVG 放 src/icons/ 后用 <Icon name="文件名" />
    icon(),
  ],
  markdown: {
    // Astro 7 默认处理器是 Sätteri，remark 插件要挂在 unified() 处理器上。
    // remark-breaks 对应 Material 的 nl2br 扩展（单个换行渲染为 <br>）
    // remark-reading-time 的类型声明基于旧版 unified 的 Node，运行时没问题，这里只是绕过类型
    processor: unified({ remarkPlugins: [remarkDirective, remarkNoLegacyIcons, remarkBreaks, /** @type {any} */ (remarkReadingTime)] }),
  },
});
