// @ts-check
import { parseGitHubRepo, renderGitHubRepoCard } from './github-repo-card.mjs';

/** @typedef {import('./remark-mdast.mjs').MdFile} MdFile */
/** @typedef {import('./remark-mdast.mjs').MdNode} MdNode */

/** 独占一段的标记链接，或 :::github-cards 容器中的仓库链接，转换为静态卡片。 */
export default function remarkGitHubRepoCard() {
  /** @param {MdNode} tree @param {MdFile} file */
  return (tree, file) => {
    /** @param {MdNode} node */
    const soleLink = (node) => {
      if (node.type !== 'paragraph') return undefined;
      const children = (node.children ?? []).filter((child) => child.type !== 'text' || child.value?.trim());
      return children.length === 1 && children[0].type === 'link' ? children[0] : undefined;
    };
    /** @param {MdNode} link @returns {string} */
    const renderLink = (link) => {
      try {
        const repo = parseGitHubRepo(link.url);
        /** @param {MdNode} node @returns {string} */
        const text = (node) => node.value ?? (node.children ?? []).map(text).join('');
        const label = text(link).trim();
        const description = label && label !== repo.fullName && label !== link.url ? label : undefined;
        return renderGitHubRepoCard({ repo: repo.fullName, description });
      } catch (error) {
        return file.fail(error instanceof Error ? error.message : String(error), link.position);
      }
    };
    /** @param {MdNode} node @param {string} value */
    const html = (node, value) => {
      node.type = 'html';
      node.value = value;
      delete node.children;
    };
    /** @param {MdNode} node */
    function visit(node) {
      if (node.type === 'containerDirective' && node.name === 'github-cards') {
        const columns = node.attributes?.columns ?? '2';
        if (!/^[1-9]\d*$/.test(columns) || !Number.isSafeInteger(Number(columns)) ||
            Object.keys(node.attributes ?? {}).some((key) => key !== 'columns')) {
          file.fail('github-cards 仅支持 columns 属性，值必须为正整数。', node.position);
        }
        /** @type {MdNode[]} */
        const paragraphs = [];
        for (const child of node.children ?? []) {
          if (child.type === 'paragraph') paragraphs.push(child);
          else if (child.type === 'list' && !child.ordered) {
            for (const item of child.children ?? []) {
              const blocks = item.children ?? [];
              if (item.checked != null || blocks.length !== 1) {
                file.fail('仓库卡片列表项只能包含一个 GitHub 仓库链接。', item.position);
              }
              paragraphs.push(blocks[0]);
            }
          } else file.fail(':::github-cards 中只能放置仓库链接或无序链接列表。', child.position);
        }
        if (!paragraphs.length) file.fail(':::github-cards 至少需要一个 GitHub 仓库链接。', node.position);
        const cards = paragraphs.map((paragraph) => {
          const link = soleLink(paragraph) ?? file.fail('每张仓库卡片必须是一个独立的 GitHub 仓库链接。', paragraph.position);
          return renderLink(link);
        });
        html(node, `<div class="github-repo-cards" data-columns="${columns}" style="--card-columns:${columns}">${cards.join('')}</div>`);
        return;
      }
      const link = soleLink(node);
      if (link?.title === 'github-card') {
        html(node, renderLink(link));
        return;
      }
      for (const child of node.children ?? []) visit(child);
    }
    visit(tree);
  };
}
