import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

export const PAGE_SIZE = 10;

/** 与线上 Material 站点一致的 URL 规则：日期取 front matter 的 date.created */
export function postUrl(post: Post): string {
  const d = post.data.date;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `/blog/${y}/${m}/${day}/${post.data.slug}/`;
}

export function postOgPath(post: Post): string {
  return postUrl(post).replace('/blog/', '').replace(/\/$/, '');
}

const byDateDesc = (a: Post, b: Post) =>
  b.data.date.valueOf() - a.data.date.valueOf();

export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort(byDateDesc);
}

/** 博客索引顺序：置顶在前，其余按日期倒序（对应 Material 的 pin 行为） */
export async function getPostsForIndex(): Promise<Post[]> {
  const posts = await getPosts();
  return [...posts.filter((p) => p.data.pin), ...posts.filter((p) => !p.data.pin)];
}

/** Material 的 slugify(case: lower) 对中文无影响，ASCII 转小写 */
export function categorySlug(c: string): string {
  return c.toLowerCase();
}

export function formatDate(d: Date): string {
  return `${d.getUTCFullYear()} 年 ${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`;
}

/** 纯文本摘要：优先 `<!-- more -->` 之前的内容（Material 摘要语义） */
export function excerpt(post: Post, max = 100): string {
  const body = (post.body ?? '').split('<!-- more -->')[0];
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*`~_|\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** git-dates.json 的键：id → 源文件相对路径 */
export function gitDateKey(post: Post): string {
  return post.id.includes('/') ? `${post.id}/index.md` : `${post.id}.md`;
}
