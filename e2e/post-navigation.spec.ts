import { test, expect } from '@playwright/test';

const FIRST = '/article/2025/03/first-article/';
const LATEST = '/article/2026/09/cat/';
const MIDDLE = '/article/2026/08/pixel-5-volte-troubleshooting/';

for (const width of [1280, 768, 640, 375]) {
  test(`上下篇导航 ${width}px：边界提示独占一行，链接保持可用`, async ({ page, baseURL }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/*', (route) => route.request().url().startsWith(baseURL!)
      ? route.continue()
      : route.abort());
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    for (const path of [FIRST, LATEST, MIDDLE]) {
      await page.goto(path);
      await expect(page.locator('main h1')).not.toBeEmpty();
      await expect(page.locator('astro-error-overlay, vite-error-overlay')).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      const nav = page.getByRole('navigation', { name: '上一篇下一篇' });
      await nav.scrollIntoViewIfNeeded();
      await expect(nav.locator(':scope > *')).toHaveCount(2);
      await expect(nav.locator('a')).toHaveCount(path === MIDDLE ? 2 : 1);

      const cards = await nav.locator(':scope > *').evaluateAll((elements) => elements.map((element) => {
        const direction = element.querySelector('.dir')!.getBoundingClientRect();
        const content = element.querySelector('.none, b')!.getBoundingClientRect();
        const bounds = element.getBoundingClientRect();
        return {
          directionBottom: direction.bottom, contentTop: content.top,
          left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom,
          contentLeft: content.left, contentRight: content.right,
        };
      }));
      for (const card of cards) {
        expect(card.contentTop).toBeGreaterThanOrEqual(card.directionBottom);
        expect(card.contentLeft).toBeGreaterThanOrEqual(card.left);
        expect(card.contentRight).toBeLessThanOrEqual(card.right);
      }
      if (width <= 640) expect(cards[1].top).toBeCloseTo(cards[0].bottom, 1);
      else expect(cards[0].top).toBe(cards[1].top);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

      if (path !== MIDDLE) {
        await expect(nav.locator('.none')).toHaveText(path === FIRST ? '已是最早一篇' : '已是最新一篇');
        if ([1280, 375].includes(width)) {
          for (const theme of ['light', 'dark'] as const) {
            await page.evaluate((mode) => window.__setTheme!(mode), theme);
            await expect(page.locator('html')).toHaveAttribute('data-theme', `github-${theme}`);
            await nav.screenshot({ path: info.outputPath(`${path === FIRST ? 'first' : 'latest'}-${theme}-${width}.png`) });
          }
        }
      }

      const link = nav.locator('a').first();
      const href = await link.getAttribute('href');
      await link.click();
      await expect(page).toHaveURL(href!);
      await expect(page.locator('main h1')).not.toBeEmpty();
    }
    expect(errors).toEqual([]);
  });
}
