import { getCollection, render, type CollectionEntry } from 'astro:content';
import { formatContentDate } from './content-date-display.mjs';
import { articleUrl } from './post-url.mjs';
export { categorySlug } from './post-groups';

export type Post = CollectionEntry<'blog'>;

export const PAGE_SIZE = 10;

/** 文章地址按年、月分层，slug 统一小写；日期取 front matter 的 pubDate（UTC）。 */
export function postUrl(post: Post): string {
  return articleUrl(post.data.pubDate, post.data.slug);
}
/** 迁移前的日级地址：用于旧链接跳转、既有评论标识和分享图地址。 */
export function legacyPostUrl(post: Post): string {
  const d = post.data.pubDate;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `/blog/${y}/${m}/${day}/${post.data.slug}/`;
}

export function postOgPath(post: Post): string {
  return legacyPostUrl(post).replace('/blog/', '').replace(/\/$/, '');
}

const byDateDesc = (a: Post, b: Post) =>
  b.data.pubDate.valueOf() - a.data.pubDate.valueOf();

export async function getPosts(): Promise<Post[]> {
  // 开发服务器包含草稿，生产构建仍统一排除草稿及其索引、旧地址和分享图。
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  const urls = new Map<string, string>();
  for (const post of posts) {
    const url = postUrl(post);
    const previous = urls.get(url);
    if (previous) throw new Error(`文章 URL 冲突：${url}（${previous} 与 ${post.id}）`);
    urls.set(url, post.id);
  }
  return posts.sort(byDateDesc);
}

/** 博客索引顺序：置顶在前，其余按日期倒序（对应 Material 的 pin 行为） */
export async function getPostsForIndex(): Promise<Post[]> {
  const posts = await getPosts();
  return [...posts.filter((p) => p.data.pin), ...posts.filter((p) => !p.data.pin)];
}

/** "2026年8月16日"，withYear=false 时为 "8月16日"。读者可见日期统一按 UTC+8；URL 仍按 UTC。 */
export function formatDate(d: Date, withYear = true): string {
  return formatContentDate(d, withYear);
}

/** 优先使用 description；缺省时从正文生成限长的纯文本摘要。 */
export function excerpt(post: Post, max = 100): string {
  const description = post.data.description?.trim();
  if (description) return description;
  const body = post.body ?? '';
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
