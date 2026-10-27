import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => route.request().url().startsWith('http://127.0.0.1:4322')
    ? route.continue()
    : route.abort());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const apply = () => {
      const root = document.documentElement.style;
      root.setProperty('--motion-page', '1s');
      root.setProperty('--motion-handoff', '200ms');
      root.setProperty('--motion-handoff-late', '120ms');
      root.setProperty('--motion-sweep', '0.9s');
    };
    document.addEventListener('DOMContentLoaded', apply);
    document.addEventListener('astro:after-swap', apply);
  });
});

const titleAnimations = (page: Page) => page.evaluate(() => document.getAnimations()
  .filter((animation): animation is CSSAnimation => animation instanceof CSSAnimation && animation.animationName.startsWith('vt-title-'))
  .map((animation) => ({ name: animation.animationName, ...animation.effect!.getTiming() })));

test('调整标题动效令牌后，放大与缩小的淡变交接跟随总时长', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  // 单字标题在列表和文章内均不换行，可以覆盖缩小时的延后交接。
  await page.getByRole('link', { name: '猫', exact: true }).click();
  await expect.poll(() => titleAnimations(page)).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'vt-title-grow-new', duration: 1000 }),
    expect.objectContaining({ name: 'vt-title-fade-out', duration: 200, delay: 0 }),
  ]));
  await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))));
  await page.goBack();
  await expect(page).toHaveURL('/');
  await expect.poll(() => titleAnimations(page)).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'vt-title-grow-old', duration: 1000 }),
    expect.objectContaining({ name: 'vt-title-fade-out', duration: 120, delay: 880 }),
  ]));
});

test('进度条的起笔延迟与逐段时长都来自令牌，不在脚本里另写毫秒', async ({ page }) => {
  await page.addInitScript(() => {
    const apply = () => {
      const root = document.documentElement.style;
      root.setProperty('--motion-progress-delay', '400ms');
      root.setProperty('--motion-progress-step', '700ms');
      root.setProperty('--motion-progress-ramp', '111ms');
      root.setProperty('--motion-page', '250ms');
    };
    document.addEventListener('DOMContentLoaded', apply);
    document.addEventListener('astro:after-swap', apply);
  });
  await page.goto('/');
  await page.locator('.nav-progress').evaluate((element) => {
    const seen: string[] = [];
    Object.assign(window, { progressTransitions: seen });
    new MutationObserver(() => seen.push(element.style.transition)).observe(element, { attributes: true, attributeFilter: ['style'] });
  });
  await page.route('**/tags/', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '标签', exact: true }).click();
  const seen = () => page.evaluate(() => (window as unknown as { progressTransitions: string[] }).progressTransitions.join('\n'));
  // 700 → 811 → 922：首段时长加上每段增量，节奏间隔用 --motion-page。
  await expect.poll(seen).toContain('transform 700ms');
  await expect.poll(seen).toContain('transform 811ms');
  await expect.poll(seen).toContain('transform 922ms');
  await expect(page).toHaveURL('/tags/');
});

test('慢导航完成后，进度条等待自定义扫光时长结束才淡出', async ({ page }) => {
  await page.goto('/');
  await page.locator('.nav-progress').evaluate((element) => {
    const timing: { start?: number; elapsed?: number } = {};
    Object.assign(window, { sweepTiming: timing });
    const observer = new MutationObserver(() => {
      if (!element.classList.contains('is-done')) return;
      timing.start ??= performance.now();
      if ((element as HTMLElement).style.opacity === '0') {
        timing.elapsed = performance.now() - timing.start;
        observer.disconnect();
      }
    });
    observer.observe(element, { attributes: true, attributeFilter: ['class', 'style'] });
  });
  await page.route('**/tags/', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.continue();
  });
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '标签', exact: true }).click();
  await expect(page).toHaveURL('/tags/');
  const elapsed = () => page.evaluate(() => (window as unknown as { sweepTiming: { elapsed?: number } }).sweepTiming.elapsed);
  await expect.poll(elapsed).toBeGreaterThanOrEqual(850);
  await expect.poll(() => page.locator('.nav-progress').evaluate((element) => getComputedStyle(element).opacity)).toBe('0');
});
