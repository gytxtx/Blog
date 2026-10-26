import { parseGitHubRepo, renderGitHubRepoCard } from './github-repo-card.mjs';

/** 独占一段、title 为 github-card 的 Markdown 链接才转换；行内链接、代码和其他链接不变。 */
export default function remarkGitHubRepoCard() {
  return (tree, file) => {
    function visit(node) {
      if (node.type === 'paragraph') {
        const children = node.children.filter((child) => child.type !== 'text' || child.value.trim());
        const link = children.length === 1 && children[0];
        if (link?.type === 'link' && link.title === 'github-card') {
          try {
            const repo = parseGitHubRepo(link.url);
            const label = link.children.map((child) => child.value ?? '').join('').trim();
            const description = label && label !== repo.fullName && label !== link.url ? label : undefined;
            node.type = 'html';
            node.value = renderGitHubRepoCard({ repo: repo.fullName, description });
            delete node.children;
          } catch (error) {
            file.fail(error.message, node.position);
          }
          return;
        }
      }
      for (const child of node.children ?? []) visit(child);
    }
    visit(tree);
  };
}
