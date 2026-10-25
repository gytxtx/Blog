import { getCollection, render, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

export const PAGE_SIZE = 10;

/** 与线上 Material 站点一致的 URL 规则：日期取 front matter 的 date.created */
export function postUrl(post: Post): string {
  const d = post.data.pubDate;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `/blog/${y}/${m}/${day}/${post.data.slug}/`;
}

export function postOgPath(post: Post): string {
  return postUrl(post).replace('/blog/', '').replace(/\/$/, '');
}

const byDateDesc = (a: Post, b: Post) =>
  b.data.pubDate.valueOf() - a.data.pubDate.valueOf();

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
    // 只剥 Markdown 记号；正文里的 2025-12-25、snake_case 之类保留
    .replace(/^\s*([-+*]|\d+\.)\s+/gm, ' ')
    .replace(/-{3,}|_{2,}|\*{1,3}/g, ' ')
    .replace(/[#>`~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** 阅读时间（分钟）：front matter 的 readtime 优先，否则取 remark-reading-time 的估算 */
export async function readingTime(post: Post): Promise<number> {
  if (post.data.readtime) return post.data.readtime;
  const { remarkPluginFrontmatter } = await render(post);
  return Math.ceil(remarkPluginFrontmatter.minutes ?? 1);
}
