import { createRequire } from 'node:module';

// 内容层级：下方主标题 > 顶部描述与装饰图标；唯一操作是整卡跳转。
// 样式沿用 --text / --muted / --border / --accent 与现有卡片的间距、圆角。
const icons = createRequire(import.meta.url)('@iconify-json/lucide/icons.json').icons;
const escape = (value) => String(value).replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[ch]);
const source = (node, file) => String(file.value).slice(node.position.start.offset, node.position.end.offset);

/** 只允许卡片内的基础行内排版，避免整卡链接里出现嵌套交互元素。 */
function inline(nodes, context) {
  return nodes.map((node) => {
    if (node.type === 'text' || node.type === 'inlineCode') {
      const text = escape(node.value);
      return node.type === 'inlineCode' ? `<code>${text}</code>` : text;
    }
    if (node.type === 'break') return ' ';
    if (node.type === 'textDirective') return escape(source(node, context.file));
    const tag = { emphasis: 'em', strong: 'strong', delete: 'del' }[node.type];
    if (tag) return `<${tag}>${inline(node.children, context)}</${tag}>`;
    if (node.type === 'link' || node.type === 'linkReference') {
      const link = node.type === 'link' ? node : context.definitions.get(node.identifier.toUpperCase());
      if (!link) context.file.fail('卡片的引用链接未定义。', node);
      if (context.href !== undefined) context.file.fail('每张卡片只能包含一个链接，链接会作用于整张卡片。', node);
      context.href = link.url;
      return inline(node.children, context);
    }
    context.file.fail('卡片文字仅支持文本、加粗、斜体、删除线、行内代码和一个链接。', node);
  }).join('');
}

function renderCard(item, definitions, file, site) {
  if (item.checked != null || item.children.some((node) => node.type !== 'paragraph')) {
    file.fail('卡片列表项只能包含顶部描述和下方主标题，不支持任务列表或嵌套块。', item);
  }
  const context = { file, definitions, href: undefined };
  const nodes = [...(item.children[0]?.children ?? [])];
  let icon = '';
  if (nodes[0]?.type === 'textDirective' && nodes[0].name === 'icon') {
    const directive = nodes.shift();
    // 冒号会被 remark-directive 继续解析，直接读取标签源码以保留 lucide: 前缀。
    const name = source(directive, file).match(/^:icon\[([^\]]+)\]$/)?.[1] ?? '';
    const match = /^lucide:([a-z0-9-]+)$/.exec(name);
    if (!match || !Object.hasOwn(icons, match[1])) file.fail(`未知 Lucide 图标：${name}`, directive);
    icon = `<svg class="content-card__icon" viewBox="0 0 24 24" aria-hidden="true">${icons[match[1]].body}</svg>`;
  }
  const separator = nodes.findIndex((node) => node.type === 'break');
  const descriptionNodes = separator < 0 ? nodes : nodes.slice(0, separator);
  const titleNodes = [
    ...(separator < 0 ? [] : nodes.slice(separator + 1)),
    ...item.children.slice(1).flatMap((node) => [{ type: 'break' }, ...node.children]),
  ];
  const description = inline(descriptionNodes, context).trim();
  const title = inline(titleNodes, context).trim();
  if (!description || !title) file.fail('每张卡片需要两行内容：第一行为顶部描述，第二行为主标题。', item);

  let attributes = '';
  if (context.href !== undefined) {
    let url;
    try { url = new URL(context.href, site); } catch { file.fail('卡片链接不是有效 URL。', item); }
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
export default function remarkContentCards({ site } = {}) {
  const siteUrl = new URL(site);
  return (tree, file) => {
    const definitions = new Map();
    function collect(node) {
      if (node.type === 'definition') definitions.set(node.identifier.toUpperCase(), node);
      for (const child of node.children ?? []) collect(child);
    }
    collect(tree);
    function visit(node) {
      if (node.type === 'containerDirective' && node.name === 'cards') {
        const columns = node.attributes?.columns ?? '2';
        if (!['1', '2', '3'].includes(columns) || Object.keys(node.attributes ?? {}).some((key) => key !== 'columns')) {
          file.fail('cards 仅支持 columns 属性，值为 1、2 或 3。', node);
        }
        if (!node.children.length || node.children.some((child) => child.type !== 'list' || child.ordered)) {
          file.fail(':::cards 容器中需要无序列表，每个列表项是一张卡片。', node);
        }
        const cards = node.children.flatMap((list) => list.children.map((item) => renderCard(item, definitions, file, siteUrl)));
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
