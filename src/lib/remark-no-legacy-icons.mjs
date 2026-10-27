// @ts-check
/**
 * 旧主题图标不应成为正文；代码和行内代码仍允许展示语法。
 * @typedef {import('./remark-mdast.mjs').MdNode} MdNode
 */
export default function remarkNoLegacyIcons() {
  /** @param {MdNode} tree @param {import('./remark-mdast.mjs').MdFile} file */
  return (tree, file) => {
    /** @param {MdNode} node */
    function visit(node) {
      if (node.type === 'code' || node.type === 'inlineCode' || node.type === 'html') return;
      if ((node.type === 'textDirective' && /^(material|simple)-/.test(node.name ?? '')) ||
          (node.type === 'text' && /:(?:material|simple)-[a-z\d-]+:/i.test(node.value ?? ''))) {
        file.fail('发现旧主题图标标记，请删除装饰文字或改用现有 Lucide 图标。', node);
      }
      for (const child of node.children ?? []) visit(child);
    }
    visit(tree);
  };
}
