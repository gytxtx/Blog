import { test, expect, type Page, type TestInfo } from '@playwright/test';

const runtimeErrors = new WeakMap<Page, string[]>();
async function capture(page: Page, info: TestInfo, name: string) {
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-theme-switching') && !document.documentElement.hasAttribute('data-astro-transition'));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {})));
  });
  await page.screenshot({ path: info.outputPath(name) });
}

const FIRST = '/article/2025/03/first-article/';
const LONG = '/article/2026/08/pixel-5-volte-troubleshooting/';
const IMAGES = '/article/2026/05/monthly-summary/';

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  // 确定性回归不依赖分析服务、头像站或 GitHub 的实时可用性。
  await page.route('https://www.googletagmanager.com/**', (route) => route.fulfill({ body: '' }));
  await page.route('https://giscus.app/**', (route) => route.abort());
  await page.route('https://api.github.com/**', (route) => route.fulfill({ json: {
    description: '测试项目', language: 'TypeScript', stargazers_count: 12, forks_count: 0,
  } }));
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([]);
  await expect(page.locator('astro-error-overlay, vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('main')).not.toBeEmpty();
  await expect(page).toHaveTitle(/KFACBT 的博客/);
});

test('生产搜索按需加载，关闭返回焦点，结果可进入文章并后退', async ({ page }) => {
  const scripts: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => { if (request.url().endsWith('/pagefind-ui.js')) scripts.push(request.url()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#theme-btn')).toHaveAttribute('aria-label', /主题：/);
  expect(scripts).toHaveLength(0);
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '搜索本站' });
  await expect(dialog.getByPlaceholder('搜索文章')).toBeFocused();
  await dialog.getByPlaceholder('搜索文章').fill('Pixel');
  await expect(dialog.getByRole('link', { name: /VoLTE/ })).toHaveCount(2);
  await dialog.getByRole('button', { name: '关闭搜索' }).click();
  await expect(page.locator('#search-btn')).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('link', { name: 'Pixel 5 的 VoLTE 又坏了：一次 IMS 故障排查记录' }).click();
  await expect(page).toHaveURL(LONG);
  await expect(page.locator('h1')).toContainText('IMS 故障排查记录');
  await expect(page.locator('dialog')).not.toBeVisible();
  await page.goBack();
  await expect(page.locator('.intro h1')).toBeVisible();
  await page.locator('#search-btn').click();
  await expect(page.getByPlaceholder('搜索文章')).toBeFocused();
  expect(scripts).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('搜索脚本失败显示重试，恢复后可搜索', async ({ page }) => {
  let requests = 0;
  await page.route('**/pagefind/pagefind-ui.js', async (route) => {
    if (++requests === 1) await route.abort();
    else await route.continue();
  });
  await page.goto('/');
  await page.locator('#search-btn').click();
  await expect(page.locator('#search-status')).toHaveText('搜索暂时未能加载，请重试。');
  await page.getByRole('button', { name: '重新加载搜索' }).click();
  await expect(page.getByPlaceholder('搜索文章')).toBeFocused();
  expect(requests).toBe(2);
});

test('卡片共享表面、字级与手机单列规则，切换页面后仍一致', async ({ page }, info) => {
  await page.goto('/about/');
  const metrics = (selector: string) => page.locator(selector).first().evaluate((element) => {
    const style = getComputedStyle(element);
    return { padding: style.padding, radius: style.borderRadius, border: style.borderWidth, font: style.fontSize };
  });
  const content = await metrics('.content-card');
  expect(await metrics('.github-repo-card__link')).toEqual(content);
  await page.locator('.github-repo-cards').first().scrollIntoViewIfNeeded();
  await expect(page.locator('[data-metric="star"]').first()).toContainText('12');
  await capture(page, info, 'desktop-repo-cards.png');
  await page.locator('#theme-btn').click();
  await page.locator('#theme-btn').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'github-dark');
  await page.locator('.github-repo-cards').first().scrollIntoViewIfNeeded();
  await capture(page, info, 'desktop-repo-cards-dark.png');
  await page.setViewportSize({ width: 375, height: 812 });
  for (const selector of ['.content-cards', '.github-repo-cards']) {
    expect(await page.locator(selector).first().evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1);
  }
  await page.locator('.content-cards').first().scrollIntoViewIfNeeded();
  await capture(page, info, 'mobile-content-cards-dark.png');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '友链' }).click();
  expect(await metrics('.friend-card')).toEqual(content);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.locator('.friend-grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1);
  await capture(page, info, 'mobile-friends.png');
});

test('减少动效下箭头不位移，图片灯箱开关和离开文章均正常', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const link = page.locator('.entry .go').first();
  await link.hover();
  expect(await link.locator('.arr').evaluate((element) => getComputedStyle(element).transform)).toBe('none');
  await page.goto(IMAGES);
  const image = page.locator('.glightbox').first();
  await image.click();
  await expect(page.locator('.glightbox-container')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.glightbox-container')).toHaveCount(0);
  await page.locator('.brand').click();
  await expect(page.locator('.intro h1')).toBeVisible();
  await expect(page.locator('.glightbox-container')).toHaveCount(0);
});

test('禁用存储时主题仍可切换，并在站内导航后保留', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage disabled', 'SecurityError'); } });
  });
  await page.goto('/');
  await page.locator('#theme-btn').click();
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
  await page.locator('#theme-btn').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'github-dark');
  await page.locator('.entry h2 a').first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'github-dark');
});

test('仓库首次请求失败后，后续页面访问可恢复统计', async ({ page }) => {
  let calls = 0;
  await page.route('https://api.github.com/repos/bluearchive-cafe/frontend-new', (route) => {
    if (++calls === 1) return route.fulfill({ status: 503, body: '' });
    return route.fulfill({ json: { description: '恢复后的项目', language: 'TypeScript', stargazers_count: 42, forks_count: 0 } });
  });
  await page.goto('/about/');
  const card = page.locator('github-repo-card[data-repo="bluearchive-cafe/frontend-new"]');
  await card.scrollIntoViewIfNeeded();
  await expect.poll(() => calls).toBe(1);
  await expect(card).not.toHaveAttribute('aria-busy', 'true');
  await page.locator('.brand').click();
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '关于' }).click();
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator('[data-metric="star"]')).toContainText('42');
  expect(calls).toBe(2);
});

test('灯箱打开时后退会清理遮罩和键盘监听，正文导航继续可用', async ({ page }) => {
  await page.goto('/');
  await page.locator('.entry h2 a[href="' + IMAGES + '"]').click();
  await page.locator('.glightbox').first().click();
  await expect(page.locator('.glightbox-container')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.intro h1')).toBeVisible();
  await expect(page.locator('.glightbox-container')).toHaveCount(0);
  await page.locator('#search-btn').click();
  await expect(page.getByPlaceholder('搜索文章')).toBeFocused();
});
