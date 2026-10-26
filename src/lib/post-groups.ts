import type { Post } from './posts';

/** 与文章地址一样，分类只折叠 ASCII 大小写，中文保留原样。 */
export function categorySlug(category: string): string {
  return category.toLowerCase();
}

/** 年份倒序；每组保持输入文章顺序，调用方决定日期顺序或置顶顺序。 */
export function groupPostsByYear(posts: readonly Post[]) {
  const groups = new Map<number, Post[]>();
  for (const post of posts) {
    const year = post.data.pubDate.getUTCFullYear();
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year)!.push(post);
  }
  return [...groups].sort(([a], [b]) => b - a).map(([year, posts]) => ({ year, posts }));
}

/** 大小写相同的分类共用地址，显示名称沿用第一次出现的拼写。 */
export function groupPostsByCategory(posts: readonly Post[]) {
  const groups = new Map<string, { slug: string; display: string; posts: Post[] }>();
  for (const post of posts) {
    for (const display of post.data.categories) {
      const slug = categorySlug(display);
      if (!groups.has(slug)) groups.set(slug, { slug, display, posts: [] });
      groups.get(slug)!.posts.push(post);
    }
  }
  return [...groups.values()];
}

/** 标签保持大小写，以文章数量倒序，同数量按名称排序。 */
export function groupPostsByTag(posts: readonly Post[]): [string, Post[]][] {
  const groups = new Map<string, Post[]>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      if (!groups.has(tag)) groups.set(tag, []);
      groups.get(tag)!.push(post);
    }
  }
  return [...groups].sort(([a, aPosts], [b, bPosts]) => bPosts.length - aPosts.length || a.localeCompare(b));
}
