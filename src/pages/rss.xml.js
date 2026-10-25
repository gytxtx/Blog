import rss from '@astrojs/rss';
import { getPosts, postUrl, excerpt } from '../lib/posts';
import { SITE } from '../consts';

export async function GET(context) {
  const posts = await getPosts();
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: excerpt(p, 200),
      link: postUrl(p),
      categories: [...p.data.categories, ...p.data.tags],
    })),
    customData: '<language>zh-CN</language>',
  });
}
