/** 旧主题图标不应成为正文；代码和行内代码仍允许展示语法。 */
export default function remarkNoLegacyIcons() {
  return (tree, file) => {
    function visit(node) {
      if (node.type === 'code' || node.type === 'inlineCode' || node.type === 'html') return;
      if ((node.type === 'textDirective' && /^(material|simple)-/.test(node.name)) ||
          (node.type === 'text' && /:(?:material|simple)-[a-z\d-]+:/i.test(node.value))) {
        file.fail('发现旧主题图标标记，请删除装饰文字或改用现有 Lucide 图标。', node);
      }
      for (const child of node.children ?? []) visit(child);
    }
    visit(tree);
  };
}
