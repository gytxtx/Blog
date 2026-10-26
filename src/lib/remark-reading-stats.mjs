/**
 * 字数与阅读时间：写进 remarkPluginFrontmatter 的 words / minutes。
 *
 * 字数 = 汉字个数 + 英文/数字单词数，代码块和 HTML（含 <!-- more -->）不计，行内代码计入。
 * 阅读时间按汉字 400 字/分、英文 200 词/分估算，至少 1 分钟。
 */
const HAN = /[㐀-鿿豈-﫿]/g;
const LATIN_WORD = /[A-Za-z0-9]+(?:['’.\-][A-Za-z0-9]+)*/g;

function collectText(node, out, source, inCards = false) {
  if (node.type === 'code' || node.type === 'html' || node.type === 'yaml') return;
  if (inCards && node.type === 'textDirective' && node.name === 'icon') return;
  if (node.type === 'textDirective') {
    out.push(source.slice(node.position.start.offset, node.position.end.offset));
    return;
  }
  if (node.type === 'text' || node.type === 'inlineCode') out.push(node.value);
  const cards = inCards || (node.type === 'containerDirective' && node.name === 'cards');
  for (const child of node.children ?? []) collectText(child, out, source, cards);
}

export default function remarkReadingStats() {
  return (tree, file) => {
    const parts = [];
    collectText(tree, parts, String(file.value));
    const text = parts.join(' ');
    const han = text.match(HAN)?.length ?? 0;
    const latin = text.replace(HAN, ' ').match(LATIN_WORD)?.length ?? 0;
    const frontmatter = (file.data.astro ??= {}).frontmatter ??= {};
    frontmatter.words = han + latin;
    frontmatter.minutes = Math.max(1, Math.ceil(han / 400 + latin / 200));
  };
}
