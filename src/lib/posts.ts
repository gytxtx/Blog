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

/** "2026年8月16日"，withYear=false 时为 "8月16日"。按 UTC 取日，与 postUrl 的日期一致 */
export function formatDate(d: Date, withYear = true): string {
  return d.toLocaleDateString('zh-CN', {
    year: withYear ? 'numeric' : undefined,
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** 纯文本摘要：优先 `<!-- more -->` 之前的内容（Material 摘要语义） */
export function excerpt(post: Post, max = 100): string {
  const body = (post.body ?? '').split('<!-- more -->')[0];
  // 行内代码先换成占位符，剥完记号再放回，代码里的 * # 等字符原样保留
  const codes: string[] = [];
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`\n]+)`/g, (_, code: string) => `\u0000${codes.push(code) - 1}\u0000`)
    // 标题行不进摘要（如「## 起因」）
    .replace(/^#{1,6}\s.*$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 只剥 Markdown 记号；正文里的 2025-12-25、snake_case 之类保留
    .replace(/^\s*([-+*]|\d+\.)\s+/gm, ' ')
    .replace(/-{3,}|_{2,}|\*{1,3}/g, ' ')
    .replace(/[#>`~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\u0000(\d+)\u0000/g, (_, i: string) => codes[Number(i)]);
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** 阅读时间（分钟）：front matter 的 readtime 优先，否则取 remark-reading-stats 的估算 */
export async function readingTime(post: Post): Promise<number> {
  if (post.data.readtime) return post.data.readtime;
  const { remarkPluginFrontmatter } = await render(post);
  return remarkPluginFrontmatter.minutes ?? 1;
}

/** 字数：汉字 + 英文单词，不含代码块（remark-reading-stats） */
export async function wordCount(post: Post): Promise<number> {
  const { remarkPluginFrontmatter } = await render(post);
  return remarkPluginFrontmatter.words ?? 0;
}

/** "3,456 字" */
export function formatWords(n: number): string {
  return `${n.toLocaleString('zh-CN')} 字`;
}
