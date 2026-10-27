import { test, expect } from '@playwright/test';

test('文章与顶层页的 JSON-LD、文章 OG 和 sitemap 使用相同日期', async ({ request }) => {
  const index = await (await request.get('/sitemap-index.xml')).text();
  const sitemapUrl = index.match(/<loc>([^<]+)<\/loc>/)![1];
  const sitemap = await (await request.get(new URL(sitemapUrl).pathname)).text();
  let checked = 0;
  for (const match of sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const pathname = new URL(match[1].match(/<loc>([^<]+)<\/loc>/)![1]).pathname;
    const modified = match[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    if (!pathname.startsWith('/article/') && !['/about/', '/links/'].includes(pathname)) {
      expect(modified, pathname).toBeUndefined();
      continue;
    }
    expect(modified, pathname).toBeTruthy();
    const response = await request.get(pathname);
    expect(response.ok(), pathname).toBe(true);
    const html = await response.text();
    const json = JSON.parse(html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)![1]);
    expect(new Date(json.dateModified).toISOString(), pathname).toBe(new Date(modified!).toISOString());
    if (pathname.startsWith('/article/')) {
      const og = html.match(/property="article:modified_time"\s+content="([^"]+)"/)![1];
      expect(og, pathname).toBe(json.dateModified);
    } else {
      expect(json['@type']).toBe('WebPage');
    }
    checked++;
  }
  expect(checked).toBeGreaterThan(2);
});

for (const width of [1280, 390]) {
  test(`内容日期 ${width}px：导航后页末提示、文章提示与结构化数据一致`, async ({ page }, info) => {
    const runtimeErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) consoleErrors.push(message.text());
    });
    await page.route('https://**/*', (route) => {
      if (route.request().url().startsWith('https://api.github.com/')) {
        return route.fulfill({ json: { description: '测试项目', language: 'TypeScript', stargazers_count: 12, forks_count: 0 } });
      }
      if (route.request().resourceType() === 'image') {
        return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#ddd"/></svg>' });
      }
      return route.fulfill({ body: '' });
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/links/');
    await expect(page).toHaveTitle('友链 - KFACBT 的博客');
    await expect(page.locator('main h1')).toHaveText('友情链接');
    const footer = page.locator('.page-updated');
    await expect(footer).toContainText('更新于');
    await expect(footer).toHaveAttribute('data-pagefind-ignore', '');
    const modified = await page.locator('script[type="application/ld+json"]').evaluate((element) => JSON.parse(element.textContent!).dateModified);
    await expect(footer.locator('time')).toHaveAttribute('datetime', modified);
    await footer.scrollIntoViewIfNeeded();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {})));
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`links-updated-${width}.png`) });

    if (width <= 960) await page.getByRole('button', { name: '打开导航' }).click();
    await page.locator('#site-nav').getByRole('link', { name: '关于', exact: true }).click();
    await expect(page).toHaveURL(/\/about\/$/);
    await expect(page).toHaveTitle('关于 - KFACBT 的博客');
    await expect(page.locator('main h1')).toHaveText('关于');
    await expect(footer).toContainText('更新于');
    const aboutModified = await page.locator('script[type="application/ld+json"]').evaluate((element) => JSON.parse(element.textContent!).dateModified);
    await expect(footer.locator('time')).toHaveAttribute('datetime', aboutModified);
    const sizes = await footer.evaluate((element) => [getComputedStyle(element).fontSize, getComputedStyle(element.parentElement!).fontSize].map(parseFloat));
    expect(sizes[0]).toBeLessThan(sizes[1]);

    await page.goto('/article/2025/04/github-block-cn-ip/');
    await expect(page.locator('main h1')).not.toBeEmpty();
    const articleModified = await page.locator('meta[property="article:modified_time"]').getAttribute('content');
    await expect(page.locator('.byline time')).toHaveAttribute('datetime', articleModified!);
    await expect(page.locator('.byline time')).toHaveText(new Date(articleModified!).toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Shanghai',
    }));
    await expect(page.locator('astro-error-overlay, vite-error-overlay')).toHaveCount(0);
    expect(runtimeErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}
