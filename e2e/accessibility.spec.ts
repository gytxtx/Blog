import { test, expect, type Page } from '@playwright/test';

const ARTICLE = '/article/2026/08/pixel-5-volte-troubleshooting/';
const errors = new WeakMap<Page, string[]>();

async function silenceExternalRequests(page: Page) {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', (error) => messages.push(error.message));
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:4322') || url.startsWith('https://giscus.app/')) return route.continue();
    return route.abort();
  });
}

test('键盘用户第一跳是跳转正文，站内换页后焦点落在正文容器', async ({ page }) => {
  await silenceExternalRequests(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await expect(page.locator('#main')).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  // 客户端换页：新文档没有焦点记忆，必须由 after-swap 交给正文。
  await page.locator('.entry h2 a').first().click();
  await expect(page).not.toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('main');
});

test('桌面侧栏目录的高亮项始终留在自己的可见区内', async ({ page }) => {
  await silenceExternalRequests(page);
  await page.setViewportSize({ width: 1440, height: 560 });
  await page.goto(ARTICLE);
  const toc = page.locator('.toc');
  await expect(toc).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await expect.poll(() => page.evaluate(() => {
    const box = document.querySelector('.toc')!.getBoundingClientRect();
    const active = document.querySelector<HTMLElement>('.toc a.active')!;
    const item = active.getBoundingClientRect();
    return { inside: item.top >= box.top - 1 && item.bottom <= box.bottom + 1, active: active.textContent };
  })).toMatchObject({ inside: true });
});

test('两种配色都把 color-scheme 交给浏览器，滚动条与表单控件跟着换', async ({ page }) => {
  await silenceExternalRequests(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(ARTICLE);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light');
  // 主题按钮按 auto → light → dark 循环，两次点击才落到深色。
  await page.locator('#theme-btn').click();
  await page.locator('#theme-btn').click();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark');
});

test.describe('脚本不可用', () => {
  test.use({ javaScriptEnabled: false });

  test('手机视口的导航直接展开，搜索／目录／主题等脚本控件不再伪装可用', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(ARTICLE);
    const nav = page.locator('#site-nav');
    await expect(nav).toBeVisible();
    await expect(nav.locator('a')).not.toHaveCount(0);
    for (const id of ['#nav-btn', '#search-btn', '#toc-btn', '#theme-btn']) {
      await expect(page.locator(id)).toBeHidden();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 375)).toBe(true);
  });
});

test.afterEach(async ({ page }) => {
  expect(errors.get(page) ?? []).toEqual([]);
});
