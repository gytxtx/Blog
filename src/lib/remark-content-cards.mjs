// @ts-check
import { createRequire } from 'node:module';

/** @typedef {import('./remark-mdast.mjs').MdFile} MdFile */
/** @typedef {import('./remark-mdast.mjs').MdNode} MdNode */
/** @typedef {{ file: MdFile, definitions: Map<string, MdNode>, href: string | undefined }} CardContext */

// 内容层级：下方主标题 > 顶部描述与装饰图标；唯一操作是整卡跳转。
// 样式沿用 --text / --muted / --border / --accent 与现有卡片的间距、圆角。
const icons = createRequire(import.meta.url)('@iconify-json/lucide/icons.json').icons;
/** @type {Record<string, string>} */
const escaped = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** @param {unknown} value */
const escape = (value) => String(value).replace(/[&<>"']/g, (ch) => escaped[ch]);
/** @param {MdNode} node @param {MdFile} file */
const source = (node, file) => String(file.value).slice(node.position.start.offset, node.position.end.offset);

/** 只允许卡片内的基础行内排版，避免整卡链接里出现嵌套交互元素。 */
/** @param {MdNode[]} nodes @param {CardContext} context @returns {string} */
function inline(nodes, context) {
  /** @type {Record<string, string>} */
  const tags = { emphasis: 'em', strong: 'strong', delete: 'del' };
  return nodes.map((node) => {
    if (node.type === 'text' || node.type === 'inlineCode') {
      const text = escape(node.value ?? '');
      return node.type === 'inlineCode' ? `<code>${text}</code>` : text;
    }
    if (node.type === 'break') return ' ';
    if (node.type === 'textDirective') return escape(source(node, context.file));
    const tag = tags[node.type];
    if (tag) return `<${tag}>${inline(node.children ?? [], context)}</${tag}>`;
    if (node.type === 'link' || node.type === 'linkReference') {
      const link = node.type === 'link' ? node : context.definitions.get(node.identifier?.toUpperCase() ?? '');
      if (!link) return context.file.fail('卡片的引用链接未定义。', node);
      if (context.href !== undefined) context.file.fail('每张卡片只能包含一个链接，链接会作用于整张卡片。', node);
      context.href = link.url;
      return inline(node.children ?? [], context);
    }
    return context.file.fail('卡片文字仅支持文本、加粗、斜体、删除线、行内代码和一个链接。', node);
  }).join('');
}

/** @param {MdNode} item @param {Map<string, MdNode>} definitions @param {MdFile} file @param {URL} site */
function renderCard(item, definitions, file, site) {
  const blocks = item.children ?? [];
  if (item.checked != null || blocks.some((node) => node.type !== 'paragraph')) {
    file.fail('卡片列表项只能包含顶部描述和下方主标题，不支持任务列表或嵌套块。', item);
  }
  /** @type {CardContext} */
  const context = { file, definitions, href: undefined };
  const nodes = [...(blocks[0]?.children ?? [])];
  let icon = '';
  if (nodes[0]?.type === 'textDirective' && nodes[0].name === 'icon') {
    const directive = nodes[0];
    nodes.shift();
    // 冒号会被 remark-directive 继续解析，直接读取标签源码以保留 lucide: 前缀。
    const name = source(directive, file).match(/^:icon\[([^\]]+)\]$/)?.[1] ?? '';
    const key = /^lucide:([a-z0-9-]+)$/.exec(name)?.[1] ?? '';
    if (!key || !Object.hasOwn(icons, key)) file.fail(`未知 Lucide 图标：${name}`, directive);
    icon = `<svg class="content-card__icon" viewBox="0 0 24 24" aria-hidden="true">${icons[key].body}</svg>`;
  }
  const separator = nodes.findIndex((node) => node.type === 'break');
  const descriptionNodes = separator < 0 ? nodes : nodes.slice(0, separator);
  const titleNodes = [
    ...(separator < 0 ? [] : nodes.slice(separator + 1)),
    ...blocks.slice(1).flatMap((node) => [/** @type {MdNode} */ ({ type: 'break' }), ...(node.children ?? [])]),
  ];
  const description = inline(descriptionNodes, context).trim();
  const title = inline(titleNodes, context).trim();
  if (!description || !title) file.fail('每张卡片需要两行内容：第一行为顶部描述，第二行为主标题。', item);

  let attributes = '';
  if (context.href !== undefined) {
    /** @param {string} href @returns {URL | null} */
    const parse = (href) => { try { return new URL(href, site); } catch { return null; } };
    const url = parse(context.href) ?? file.fail('卡片链接不是有效 URL。', item);
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
      file.fail('卡片链接仅支持 HTTP、HTTPS、mailto、tel 或站内相对地址。', item);
    }
    const external = url.origin !== site.origin;
    attributes = ` href="${escape(context.href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}`;
  }
  const tag = context.href === undefined ? 'div' : 'a';
  return `<${tag} class="content-card custom-card"${attributes}><span class="content-card__header">${icon}<span class="content-card__description">${description}</span></span><span class="content-card__title">${title}</span></${tag}>`;
}

/** :::cards 中每个无序列表项是一张静态卡片；在阅读统计之后、仓库卡片之前转换。 */
/** @param {{ site: string }} options */
export default function remarkContentCards({ site }) {
  const siteUrl = new URL(site);
  /** @param {MdNode} tree @param {MdFile} file */
  return (tree, file) => {
    /** @type {Map<string, MdNode>} */
    const definitions = new Map();
    /** @param {MdNode} node */
    function collect(node) {
      if (node.type === 'definition') definitions.set(node.identifier?.toUpperCase() ?? '', node);
      for (const child of node.children ?? []) collect(child);
    }
    collect(tree);
    /** @param {MdNode} node */
    function visit(node) {
      if (node.type === 'containerDirective' && node.name === 'cards') {
        const columns = node.attributes?.columns ?? '2';
        if (!['1', '2', '3'].includes(columns) || Object.keys(node.attributes ?? {}).some((key) => key !== 'columns')) {
          file.fail('cards 仅支持 columns 属性，值为 1、2 或 3。', node);
        }
        if (!node.children?.length || node.children.some((child) => child.type !== 'list' || child.ordered)) {
          file.fail(':::cards 容器中需要无序列表，每个列表项是一张卡片。', node);
        }
        const cards = (node.children ?? []).flatMap((list) => list.children?.map((item) => renderCard(item, definitions, file, siteUrl)) ?? []);
        node.type = 'html';
        node.value = `<div class="content-cards" data-columns="${columns}">${cards.join('')}</div>`;
        delete node.children;
        return;
      }
      // 这些指令只在 cards 内有特殊意义；正文中的同类文字保持字面显示。
      if (node.type === 'textDirective') {
        node.type = 'text';
        node.value = source(node, file);
        delete node.children;
      }
      for (const child of node.children ?? []) visit(child);
    }
    visit(tree);
  };
}
