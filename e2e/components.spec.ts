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

test('返回顶部在桌面和手机滚动后显示，适配明暗主题并支持键盘', async ({ page }, info) => {
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto(LONG);
    const button = page.getByRole('button', { name: '返回顶部' });
    await expect(button).toBeHidden();
    await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
    await expect(button).toBeVisible();
    await capture(page, info, `back-to-top-${width}.png`);
    const box = await button.boundingBox();
    expect(box!.width).toBe(44);
    expect(box!.height).toBe(44);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(812);
    await page.evaluate(() => window.__setTheme!('dark'));
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'github-dark');
    await expect.poll(() => button.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(18, 20, 18)');
    await capture(page, info, `back-to-top-dark-${width}.png`);
    await button.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(button).toBeHidden();
    await expect(page.locator('.brand')).toBeFocused();
    await page.evaluate(() => window.__setTheme!('light'));
  }
});

test('返回顶部支持进出场、悬停和按压动画，减少动效时关闭', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(LONG);
  const button = page.locator('#back-to-top');
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
  await expect(button).not.toHaveAttribute('hidden');
  const properties = await button.evaluate((element) => getComputedStyle(element).transitionProperty);
  expect(properties).toContain('opacity');
  expect(properties).toContain('transform');
  expect(properties).toContain('display');
  await button.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  await button.hover();
  await expect.poll(() => button.locator('svg').evaluate((element) => getComputedStyle(element).transform)).toBe('matrix(1, 0, 0, 1, 0, -2)');
  await page.mouse.down();
  try {
    await expect.poll(() => button.evaluate((element) => getComputedStyle(element).transform)).toBe('matrix(0.95, 0, 0, 0.95, 0, 0)');
    // 在按下状态下移开，避免释放鼠标时触发返回顶部。
    await page.mouse.move(0, 0);
  } finally {
    await page.mouse.up();
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(button).toHaveAttribute('hidden');
  await expect(button).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
  await expect(button).toBeVisible();
  await button.hover();
  expect(await button.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');
  expect(await button.locator('svg').evaluate((element) => getComputedStyle(element).transform)).toBe('none');
});

test('返回顶部在站内跳转和后退后仍可用，减少动效时立即返回', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/links/');
  await expect(page.getByRole('button', { name: '返回顶部' })).toBeHidden();
  await page.locator('.brand').click();
  await expect(page.locator('.intro h1')).toBeVisible();
  await page.locator(`.entry h2 a[href="${IMAGES}"]`).click();
  await expect(page).toHaveURL(IMAGES);
  const button = page.getByRole('button', { name: '返回顶部' });
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
  await expect(button).toBeVisible();
  expect(await button.evaluate((element: HTMLButtonElement) => {
    element.click();
    return window.scrollY;
  })).toBe(0);
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
  await expect(button).toBeVisible();
  await page.locator('.brand').click();
  await expect(page.locator('.intro h1')).toBeVisible();
  await expect(button).toBeHidden();
  await page.goBack();
  await expect(page).toHaveURL(IMAGES);
  await expect(button).toBeVisible();
  await button.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('桌面和手机滚动后顶栏持续可用，目录锚点不会被遮挡', async ({ page }, info) => {
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(LONG);
    if (width === 375) await page.locator('#toc-btn').click();
    const link = page.locator(width === 375 ? '.toc-panel a' : '.toc a').nth(3);
    const href = await link.getAttribute('href');
    const heading = page.locator(`[id="${decodeURIComponent(href!.slice(1))}"]`);
    await link.click();
    const header = page.locator('.site-header');
    const surface = await header.evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, blur: style.backdropFilter };
    });
    expect(surface.background).toContain('0.82');
    expect(surface.blur).toBe('blur(10px)');
    await expect.poll(() => heading.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(81);
    expect(await header.evaluate((element) => element.getBoundingClientRect().top)).toBe(0);
    if (width === 1280) {
      const headerBottom = await header.evaluate((element) => element.getBoundingClientRect().bottom);
      expect(await page.locator('.toc').evaluate((element) => element.getBoundingClientRect().top)).toBeGreaterThan(headerBottom);
    } else {
      await page.getByRole('button', { name: '打开导航' }).click();
      await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible();
      await page.getByRole('button', { name: '关闭导航' }).click();
    }
    await page.locator('#search-btn').click();
    await expect(page.getByRole('dialog', { name: '搜索本站' })).toBeVisible();
    await expect(page.getByPlaceholder('搜索文章')).toBeFocused();
    await page.getByRole('button', { name: '关闭搜索' }).click();
    await capture(page, info, `sticky-header-${width}.png`);
    if (width === 1280) {
      await page.locator('#theme-btn').click();
      await page.locator('#theme-btn').click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'github-dark');
      await capture(page, info, 'sticky-header-dark-1280.png');
    }
  }
});

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

test('手机目录保留层级、旧锚点及明确的展开入口', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(FIRST);
  await page.locator('#toc-btn').click();
  await expect(page.locator('.toc-panel > ol > li')).toHaveCount(4);
  await expect(page.locator('.toc-panel ol ol > li')).toHaveCount(3);
  await expect(page.locator('.toc-panel-title')).toContainText('4 个主章节');
  await expect(page.locator('main')).not.toContainText(':simple-');
  await expect(page.locator('main')).not.toContainText(':material-');
  await expect(page.locator('[id="感谢-simple-materialformkdocs-material-for-mkdocs"]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, info, 'mobile-toc.png');
  await page.locator('.toc-panel a').filter({ hasText: '2. 低代码高定制' }).click();
  await expect(page).toHaveURL(/#2-/);
  await expect(page.locator('.toc-panel')).toBeHidden();
  await expect(page.locator('.toc-panel a[aria-current="location"]')).toContainText('低代码');
});

test('顶栏目录支持键盘、外部关闭，并与导航和搜索互斥', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(LONG);
  const button = page.locator('#toc-btn');
  const panel = page.locator('#header-toc');
  await expect(page.locator('#search-btn + #toc-btn')).toHaveCount(1);
  await expect(button).toHaveText('');
  await expect(page.locator('.toc-inline')).toHaveCount(0);
  await page.locator('#nav-btn').click();
  await button.click();
  await expect(page.locator('#site-nav')).toBeHidden();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(panel.locator('a').first()).toBeFocused();
  await capture(page, info, 'header-toc-mobile.png');
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(button).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
  await page.locator('#nav-btn').click();
  await expect(panel).toBeHidden();
  await expect(page.locator('#site-nav')).toBeVisible();
  await button.click();
  await page.keyboard.press('Control+k');
  await expect(panel).toBeHidden();
  await expect(page.locator('#search-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await button.click();
  await page.locator('#theme-btn').click();
  await expect(panel).toBeHidden();
  await button.click();
  await page.mouse.click(2, 2);
  await expect(panel).toBeHidden();
  await button.click();
  await page.evaluate(() => window.__setTheme!('dark'));
  await expect.poll(() => panel.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(18, 20, 18)');
  await capture(page, info, 'header-toc-mobile-dark.png');
  expect(await panel.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  await button.click();
  await expect(panel).toBeHidden();
});

test('目录跨断点、站内导航和后退后重置，短文章不显示入口', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1279, height: 900 });
  await page.goto(LONG);
  const button = page.locator('#toc-btn');
  const panel = page.locator('#header-toc');
  await button.click();
  await expect(panel).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(button).toBeHidden();
  await expect(panel).toBeHidden();
  await expect(page.locator('.toc')).toBeVisible();
  await expect(page.locator('.toc a').first()).toBeFocused();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toBeHidden();
  await button.click();
  await page.locator('.brand').click();
  await expect(page).toHaveURL('/');
  await expect(button).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(LONG);
  await button.click();
  await expect(panel).toBeVisible();
  await page.goto('/article/2026/09/cat/');
  await expect(button).toHaveCount(0);
  await expect(panel).toHaveCount(0);
});

test('关于页在桌面和手机显示目录，站内进入后仍可跳转并跟踪章节', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/links/');
    if (width === 375) await page.locator('#nav-btn').click();
    await page.locator('#site-nav').getByRole('link', { name: '关于', exact: true }).click();
    await expect(page).toHaveURL('/about/');
    const panel = page.locator(width === 375 ? '#header-toc' : '.toc');
    if (width === 375) {
      await expect(page.locator('#search-btn + #toc-btn')).toBeVisible();
      await page.locator('#toc-btn').click();
    }
    await expect(panel).toBeVisible();
    await expect(panel.locator(':scope > ol > li')).toHaveCount(6);
    await expect(panel.locator('ol ol > li')).toHaveCount(3);
    await capture(page, info, `about-toc-${width}.png`);
    const link = panel.getByRole('link', { name: '技术栈', exact: true });
    await link.click();
    await expect(page).toHaveURL(/#技术栈$|#%E6%8A%80%E6%9C%AF%E6%A0%88$/);
    await expect.poll(() => page.locator('#技术栈').evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(81);
    await expect(panel.locator('a[aria-current="location"]')).toHaveText('技术栈');
    if (width === 375) await expect(panel).toBeHidden();
    else {
      const article = await page.locator('article.prose').boundingBox();
      const sidebar = await panel.boundingBox();
      expect(sidebar!.x).toBeGreaterThanOrEqual(article!.x + article!.width);
    }
    await page.goto('/links/');
    await expect(page.locator('#toc-btn')).toHaveCount(0);
    await expect(page.locator('.toc')).toHaveCount(0);
  }
});

test('桌面目录宽度足够，主题跨文章跳转保持正确', async ({ page }, info) => {
  await page.goto(LONG);
  const width = await page.locator('.toc').evaluate((element) => element.getBoundingClientRect().width);
  expect(width).toBeGreaterThanOrEqual(200);
  await page.locator('#theme-btn').click();
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
  await page.locator('#theme-btn').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'github-dark');
  await capture(page, info, 'desktop-article-dark.png');
  await page.locator('.post-pn a').first().click();
  await expect(page).toHaveURL(/android-root/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'github-dark');
  await page.goBack();
  await expect(page.locator('h1')).toContainText('IMS 故障排查记录');
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

test('评论进入视口才请求，失败后保留备用入口和重试', async ({ page }) => {
  let requests = 0;
  await page.route('https://giscus.app/client.js', (route) => { requests++; return route.abort(); });
  await page.goto(LONG);
  expect(requests).toBe(0);
  const comments = page.locator('giscus-comments');
  await comments.scrollIntoViewIfNeeded();
  await expect(comments).toHaveAttribute('data-state', 'error');
  await expect(comments.getByRole('link')).toHaveAttribute('href', 'https://github.com/gytxtx/Blog_Comments/discussions');
  await comments.getByRole('button', { name: '重新加载评论' }).click();
  await expect.poll(() => requests).toBe(2);
  await expect(comments).toHaveAttribute('data-state', 'error');
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

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`图片灯箱有明确名称，键盘焦点留在弹窗并在关闭后恢复（${reducedMotion}）`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto(IMAGES);
    const trigger = page.locator('.glightbox').first();
    const description = await trigger.locator('img').getAttribute('alt');
    expect(description?.trim()).toBeTruthy();
    await expect(trigger).toHaveAccessibleName(`查看大图：${description}`);
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: '图片预览', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    const close = dialog.locator('.gclose');
    await expect(close).toBeFocused();
    await expect(dialog.locator('.current .gslide-image img')).toHaveAttribute('alt', description!);
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    // 第一个按钮向前、最后一个按钮向后循环；不能进入背景导航。
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.locator('.gnext')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(dialog.locator('.current .gslide-image img')).toHaveAttribute('alt', await page.locator('.glightbox').nth(1).locator('img').getAttribute('alt') as string);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator('main')).not.toHaveAttribute('inert');
    // 再次打开及点击关闭仍恢复最初入口，而不是上次预览到的图片。
    await page.keyboard.press('Enter');
    await close.click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

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

test('评论加载成功和主题同步只接受当前 iframe 的消息', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.route('https://giscus.app/client.js', (route) => route.fulfill({
    contentType: 'text/javascript',
    body: `const frame = document.createElement('iframe'); frame.className = 'giscus-frame'; frame.src = 'https://giscus.app/test-frame'; document.currentScript.parentElement.append(frame);`,
  }));
  await page.route('https://giscus.app/test-frame', (route) => route.fulfill({
    contentType: 'text/html',
    body: `<script>addEventListener('message', e => { if(e.data.giscus?.setConfig) document.body.dataset.theme = e.data.giscus.setConfig.theme; }); parent.postMessage({giscus:{resizeHeight:240}}, '*');</script><body>Comments</body>`,
  }));
  await page.goto(LONG);
  const comments = page.locator('giscus-comments');
  await comments.scrollIntoViewIfNeeded();
  await expect(comments).toHaveAttribute('data-state', 'ready');
  await expect(comments.locator('.comments-status')).not.toBeVisible();
  await expect(comments.locator('script')).toHaveAttribute('data-theme', 'transparent_dark');
  await expect(page.frameLocator('iframe.giscus-frame').locator('body')).toHaveAttribute('data-theme', 'transparent_dark');
  await page.locator('#theme-btn').click();
  // dark → auto 在系统浅色环境解析为 light。
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'auto');
  await expect(page.frameLocator('iframe.giscus-frame').locator('body')).toHaveAttribute('data-theme', 'light');
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
