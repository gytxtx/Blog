import type { MarkdownHeading } from 'astro';

export interface TocItem {
  heading: MarkdownHeading;
  children: MarkdownHeading[];
}

/** h3 归入最近的 h2；没有父章节的 h3 作为顶层条目，避免丢失链接。 */
export function buildToc(headings: MarkdownHeading[]): TocItem[] {
  const items: TocItem[] = [];
  let parent: TocItem | undefined;
  for (const heading of headings) {
    if (heading.depth === 2) {
      parent = { heading, children: [] };
      items.push(parent);
    } else if (heading.depth === 3) {
      if (parent) parent.children.push(heading);
      else items.push({ heading, children: [] });
    }
  }
  return items;
}
