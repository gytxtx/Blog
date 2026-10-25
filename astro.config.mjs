// @ts-check
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import sitemap from '@astrojs/sitemap';
import remarkBreaks from 'remark-breaks';
import remarkReadingTime from 'remark-reading-time';

export default defineConfig({
  site: 'https://blog-gytxtx.pages.dev',
  integrations: [
    expressiveCode({
      themes: ['github-light', 'github-dark'],
      // 明暗切换通过 <html data-theme="github-light|github-dark"> 控制
      themeCssSelector: (theme) =>
        `[data-theme="${theme.name.toLowerCase().replace(/\s+/g, '-')}"]`,
    }),
    sitemap(),
  ],
  markdown: {
    // remark-breaks 对应 Material 的 nl2br 扩展（单个换行渲染为 <br>）
    remarkPlugins: [remarkBreaks, remarkReadingTime],
  },
});
