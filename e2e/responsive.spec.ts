import { test, expect, type Page, type TestInfo } from '@playwright/test';

const ARTICLE = '/article/2026/08/pixel-5-volte-troubleshooting/';
const errors = new WeakMap<Page, string[]>();
test.use({ hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', (error) => messages.push(error.message));
  await page.route('**/*', (route) => {
    if (route.request().url().startsWith('http://127.0.0.1:4322')) return route.continue();
    if (route.request().url().startsWith('https://api.github.com/')) {
      return route.fulfill({ json: { description: '测试项目', language: 'TypeScript', stargazers_count: 12, forks_count: 0 } });
    }
    return route.abort();
  });
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
  await expect(page.locator('astro-error-overlay, vite-error-overlay')).toHaveCount(0);
  await expect(page).toHaveTitle(/KFACBT 的博客/);
});

async function screenshot(page: Page, info: TestInfo, name: string) {
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-astro-transition'));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {})));
  });
  await page.screenshot({ path: info.outputPath(name) });
}

test('手机完整日期独占一行，阅读全文与标签入口有足够触屏区域', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/tags/');
  const row = page.locator('.post-list.full-date li').first();
  const date = await row.locator('time').boundingBox();
  const title = await row.locator('.title').boundingBox();
  expect(title!.y).toBeGreaterThanOrEqual(date!.y + date!.height);
  expect((await page.locator('.cloud a').first().boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await screenshot(page, info, 'tags-phone.png');
  await page.goto('/');
  expect((await page.locator('.entry .go').first().boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test('平板菜单支持整行点击，跨断点旋转后重置展开状态', async ({ page }, info) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/');
  await page.getByRole('button', { name: '打开导航' }).click();
  const nav = page.getByRole('navigation', { name: '主导航' });
  await expect(nav).toBeVisible();
  expect((await nav.getByRole('link', { name: '标签', exact: true }).boundingBox())!.width).toBeGreaterThan(500);
  await screenshot(page, info, 'tablet-navigation.png');
  await page.setViewportSize({ width: 1180, height: 820 });
  await expect(page.locator('#nav-btn')).toHaveAttribute('aria-expanded', 'false');
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect(nav).not.toBeVisible();
  await page.getByRole('button', { name: '打开导航' }).click();
  await nav.getByRole('link', { name: '标签', exact: true }).click();
  await expect(page).toHaveURL('/tags/');
  await expect(nav).not.toBeVisible();
});
