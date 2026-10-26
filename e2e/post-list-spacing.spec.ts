import { test, expect } from '@playwright/test';

for (const width of [1680, 1280, 768, 640, 375]) {
  test.describe(`文章列表间距 ${width}px`, () => {
    // 触屏笔记本也会命中 any-pointer: coarse，不能只测试手机。
    test.use({ viewport: { width, height: 900 }, hasTouch: width !== 1280, isMobile: width <= 768 });

    test.beforeEach(async ({ page }) => {
      await page.route('**/*', (route) => {
        return route.request().url().startsWith('http://127.0.0.1:4322') ? route.continue() : route.abort();
      });
    });

    test('卡片有无摘要均保持相同内部间距，上下留白对称', async ({ page }, info) => {
      for (const path of ['/', '/page/2/']) {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        const cards = await page.locator('.entry').evaluateAll((entries) => entries.map((entry) => {
          const css = getComputedStyle(entry);
          const children = Array.from(entry.children);
          const bounds = entry.getBoundingClientRect();
          const stats = entry.querySelector('.more .stats')!.getBoundingClientRect();
          return {
            hasSummary: children.some((child) => child.tagName === 'P'),
            paddingTop: parseFloat(css.paddingTop),
            paddingBottom: parseFloat(css.paddingBottom),
            spaceBelowStats: bounds.bottom - parseFloat(css.borderBottomWidth) - stats.bottom,
            readMoreHeight: entry.querySelector('.go')!.getBoundingClientRect().height,
            gaps: children.slice(1).map((child, index) => child.getBoundingClientRect().top - children[index].getBoundingClientRect().bottom),
            margins: children.map((child) => {
              const style = getComputedStyle(child);
              return [parseFloat(style.marginTop), parseFloat(style.marginBottom)];
            }),
          };
        }));
        expect(cards.length).toBeGreaterThan(0);
        for (const card of cards) {
          expect(card.paddingTop).toBe(width <= 640 ? 24 : 32);
          expect(card.paddingBottom).toBe(card.paddingTop);
          expect(card.spaceBelowStats).toBeCloseTo(card.paddingTop, 1);
          if (width !== 1280) expect(card.readMoreHeight).toBeGreaterThanOrEqual(44);
          for (const gap of card.gaps) expect(gap).toBeCloseTo(12, 1);
          for (const margins of card.margins) expect(margins).toEqual([0, 0]);
        }
        if (path === '/') {
          expect(cards.some((card) => card.hasSummary)).toBe(true);
          expect(cards.some((card) => !card.hasSummary)).toBe(true);
          if ([1280, 375].includes(width)) await page.screenshot({ path: info.outputPath(`home-${width}.png`) });
        }
      }
    });

    test('归档、分类和标签的行留白一致，左右对齐内容区', async ({ page }, info) => {
      await page.goto('/');
      const category = await page.locator('.entry .meta a').first().getAttribute('href');
      expect(category).toBeTruthy();
      for (const path of ['/archive/2026/', category!, '/tags/']) {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        const rows = await page.locator('.post-list li').evaluateAll((elements) => elements.map((element) => {
          const css = getComputedStyle(element);
          const bounds = element.getBoundingClientRect();
          const head = document.querySelector('.page-head')!.getBoundingClientRect();
          return { paddingTop: css.paddingTop, paddingBottom: css.paddingBottom, left: bounds.left - head.left, right: bounds.right - head.right };
        }));
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          expect(row).toEqual({ paddingTop: '12px', paddingBottom: '12px', left: 0, right: 0 });
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        if ([1280, 375].includes(width)) {
          await page.screenshot({ path: info.outputPath(`${path.split('/')[1]}-${width}.png`) });
        }
      }
    });
  });
}
