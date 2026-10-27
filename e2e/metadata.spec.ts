import { test, expect } from '@playwright/test';

test('公开文章的 SEO、分享与结构化数据描述非空且一致，列表仍尊重 more 标记', async ({ request, page }) => {
  const indexResponse = await request.get('/sitemap-index.xml');
  expect(indexResponse.ok()).toBe(true);
  const index = await indexResponse.text();
  const sitemapUrl = index.match(/<loc>([^<]+)<\/loc>/)![1];
  const sitemapResponse = await request.get(new URL(sitemapUrl).pathname);
  expect(sitemapResponse.ok()).toBe(true);
  const sitemap = await sitemapResponse.text();
  const articles = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1]).pathname)
    .filter((pathname) => pathname.startsWith('/article/'));
  expect(articles.length).toBeGreaterThan(0);

  for (const pathname of articles) {
    const response = await request.get(pathname);
    expect(response.ok(), pathname).toBe(true);
    const metadata = await page.evaluate((html) => {
      const document = new DOMParser().parseFromString(html, 'text/html');
      return {
        description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
        ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
        jsonDescription: JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!).description,
      };
    }, await response.text());
    expect(metadata.description?.trim(), pathname).toBeTruthy();
    expect(metadata.ogDescription, pathname).toBe(metadata.description);
    expect(metadata.jsonDescription, pathname).toBe(metadata.description);
  }

  const homeResponse = await request.get('/');
  expect(homeResponse.ok()).toBe(true);
  const catEntry = await page.evaluate((html) => {
    const document = new DOMParser().parseFromString(html, 'text/html');
    const entry = document.querySelector('.entry h2 a[href="/article/2026/09/cat/"]')?.closest('.entry');
    return { exists: !!entry, hasSummary: !!entry?.querySelector('p') };
  }, await homeResponse.text());
  expect(catEntry).toEqual({ exists: true, hasSummary: false });
});

test('构建字体与原版权、OFL 全文一起发布', async ({ request }) => {
  const font = await request.get('/fonts/NotoSerifSC-Bold.woff2');
  expect(font.ok()).toBe(true);
  expect((await font.body()).subarray(0, 4).toString()).toBe('wOF2');
  for (const [filename, copyright] of [
    ['OFL-NotoSansSC.txt', '© 2014-2021 Adobe (http://www.adobe.com/).'],
    ['OFL-NotoSerifSC.txt', '© 2017-2024 Adobe (http://www.adobe.com/).'],
  ]) {
    const response = await request.get(`/fonts/${filename}`);
    expect(response.ok(), filename).toBe(true);
    const license = await response.text();
    expect(license, filename).toContain(copyright);
    expect(license, filename).toContain('SIL OPEN FONT LICENSE Version 1.1');
    expect(license, filename).toContain('PERMISSION & CONDITIONS');
    expect(license, filename).toContain('contains the above copyright notice and this license.');
    expect(license, filename).toContain('OTHER DEALINGS IN THE FONT SOFTWARE.');
  }
});
