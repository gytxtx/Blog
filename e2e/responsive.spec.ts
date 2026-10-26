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

test('横屏搜索充分利用可见高度，输入和关闭入口始终可用', async ({ page }, info) => {
  for (const [width, height] of [[568, 320], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.locator('#search-btn').click();
    await page.getByPlaceholder('搜索文章').fill('Pixel');
    await expect(page.locator('#search-dialog').getByRole('link', { name: 'Google Pixel 5 开启 VoLTE 实录', exact: true })).toBeVisible();
    await screenshot(page, info, `search-landscape-${width}.png`);
    const bounds = await page.locator('#search-dialog').boundingBox();
    expect(bounds!.y).toBeLessThanOrEqual(24);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
    expect(bounds!.height).toBeGreaterThan(height * 0.8);
    const font = await page.getByPlaceholder('搜索文章').evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    expect(font).toBeGreaterThanOrEqual(16);
    await page.getByRole('button', { name: '关闭搜索' }).click();
    await expect(page.locator('#search-btn')).toBeFocused();
  }
});

test('模拟软键盘缩小和移动视觉视口，搜索仍可关闭、进入结果及重新打开', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const viewport = Object.assign(new EventTarget(), { height: 844, offsetTop: 0 });
    Object.defineProperty(window, 'visualViewport', { value: viewport });
  });
  await page.goto('/');
  await page.locator('#search-btn').click();
  await page.getByPlaceholder('搜索文章').fill('Pixel');
  const result = page.locator('#search-dialog').getByRole('link', { name: 'Google Pixel 5 开启 VoLTE 实录', exact: true });
  await expect(result).toBeVisible();
  await page.evaluate(() => {
    Object.assign(window.visualViewport!, { height: 360, offsetTop: 40 });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await screenshot(page, info, 'search-keyboard-simulation.png');
  const dialog = page.locator('#search-dialog');
  const bounds = await dialog.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(40);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(400);
  const input = await page.getByPlaceholder('搜索文章').boundingBox();
  expect(input!.y + input!.height).toBeLessThanOrEqual(400);
  await page.getByRole('button', { name: '关闭搜索' }).click();
  await expect(page.locator('#search-btn')).toBeFocused();
  await page.evaluate(() => {
    Object.assign(window.visualViewport!, { height: 844, offsetTop: 0 });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await page.locator('#search-btn').click();
  await expect.poll(async () => (await dialog.boundingBox())!.height).toBeGreaterThan(360);
  await result.click();
  await expect(page).toHaveURL('/article/2025/10/google-pixel-5-volte/');
  await page.locator('#search-btn').click();
  await expect(page.getByPlaceholder('搜索文章')).toBeFocused();
  await page.getByRole('button', { name: '关闭搜索' }).click();
});

test('模拟横屏安全区，菜单可滚动到底部，搜索和按钮避开屏幕边缘', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(ARTICLE);
  await page.addStyleTag({ content: ':root { --safe-top: 20px; --safe-bottom: 20px; --safe-left: 44px; --safe-right: 44px; }' });
  const toggle = await page.locator('#nav-btn').boundingBox();
  const actions = await page.locator('.header-actions').boundingBox();
  expect(toggle!.x).toBeGreaterThanOrEqual(44);
  expect(actions!.x + actions!.width).toBeLessThanOrEqual(844 - 44);
  await page.getByRole('button', { name: '打开导航' }).click();
  const nav = page.getByRole('navigation', { name: '主导航' });
  const last = nav.getByRole('link', { name: '开往' });
  await last.scrollIntoViewIfNeeded();
  const link = await last.boundingBox();
  expect(link!.y + link!.height).toBeLessThanOrEqual(390 - 20);
  await page.locator('#search-btn').click();
  await expect(nav).not.toBeVisible();
  await expect(page.getByPlaceholder('搜索文章')).toBeFocused();
  const modal = await page.locator('#search-dialog').boundingBox();
  expect(modal!.x).toBeGreaterThanOrEqual(44);
  expect(modal!.y).toBeGreaterThanOrEqual(20);
  expect(modal!.x + modal!.width).toBeLessThanOrEqual(844 - 44);
  expect(modal!.y + modal!.height).toBeLessThanOrEqual(390 - 20);
  await page.getByRole('button', { name: '关闭搜索' }).click();
});

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
