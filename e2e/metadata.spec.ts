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

test('站点地图每篇文章都带可解析的 lastmod，地址漂移不再静默丢失更新时间', async ({ request }) => {
  const index = await (await request.get('/sitemap-index.xml')).text();
  const sitemapPath = new URL(index.match(/<loc>([^<]+)<\/loc>/)![1]).pathname;
  const sitemap = await (await request.get(sitemapPath)).text();
  const articles = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map((match) => match[1])
    .filter((body) => /<loc>[^<]*\/article\//.test(body));
  expect(articles.length).toBeGreaterThan(0);
  for (const body of articles) {
    const lastmod = body.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1] ?? '';
    expect(Number.isNaN(Date.parse(lastmod)), lastmod).toBe(false);
  }
});

const decode = (entity: string) => entity
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

test('RSS 给出全文与补过域名的站内地址，阅读器不需要自己拼接', async ({ request }) => {
  const response = await request.get('/rss.xml');
  expect(response.ok()).toBe(true);
  // 本地预览服务把 RSS 报成 text/xml，线上与 dev 用 application/xml，只约束到 xml 族。
  expect(response.headers()['content-type']).toMatch(/(?:application|text)\/xml/);
  const feed = await response.text();
  expect(feed).toContain('<language>zh-CN</language>');
  const items = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
  expect(items.length).toBeGreaterThan(0);
  const first = items.find((body) => body.includes('/article/2025/03/first-article/'));
  expect(first, '首篇文章应出现在订阅源里').toBeTruthy();
  expect(first).toContain('<title>本站的第一篇文章</title>');
  const encoded = decode(first!.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/)![1]);
  expect(encoded).toContain('为什么选用 Material for MkDocs');
  for (const body of items) {
    for (const [, url] of decode(body).matchAll(/\b(?:src|href|poster)="([^"]*)"/g)) {
      expect(url).not.toMatch(/^\/(?!\/)/);
    }
  }
});

test('文章页声明的 OG 分享图地址真实存在且能解码为 PNG', async ({ request }) => {
  const html = await (await request.get('/article/2025/03/first-article/')).text();
  const ogImage = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  expect(ogImage, '文章页应输出 og:image').toBeTruthy();
  const response = await request.get(new URL(ogImage!).pathname);
  expect(response.ok(), ogImage).toBe(true);
  expect(response.headers()['content-type']).toContain('image/png');
  const bytes = await response.body();
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.length).toBeGreaterThan(1024);
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
