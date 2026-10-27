import rss from '@astrojs/rss';
import { render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getPosts, postUrl, excerpt } from '../lib/posts';
import { SITE } from '../consts';

let container;

async function getContainer() {
  container ??= await AstroContainer.create();
  return container;
}

/** 阅读器不会拼接站点域名，正文里的站内地址要写成绝对地址 */
function absolutize(html: string, site: string) {
  const absolute = (url: string) => (url.startsWith('/') && !url.startsWith('//') ? new URL(url, site).href : url);
  return html
    .replace(/\b(src|href|poster)="([^"]*)"/g, (_match, attr: string, url: string) => `${attr}="${absolute(url)}"`)
    .replace(/\bsrcset="([^"]*)"/g, (_match, value: string) => {
      const candidates = value.split(',').map((part) => {
        const [url, ...descriptor] = part.trim().split(/\s+/);
        return [absolute(url), ...descriptor].join(' ');
      });
      return `srcset="${candidates.join(', ')}"`;
    });
}

export async function GET() {
  const posts = await getPosts();
  const astroContainer = await getContainer();
  const items = await Promise.all(
    posts.map(async (post) => {
      const { Content } = await render(post);
      const html = await astroContainer.renderToString(Content);
      return {
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: post.data.description ?? excerpt(post, 200),
        link: postUrl(post),
        content: absolutize(html, SITE.url),
        categories: [...post.data.categories, ...post.data.tags],
      };
    }),
  );

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: new URL(SITE.url),
    items,
    customData: '<language>zh-CN</language>',
  });
}
