import { createRequire } from 'node:module';

/** 接受 owner/repo 或 GitHub 仓库首页 URL；不接受其他站点、子页面或查询参数。 */
export function parseGitHubRepo(value) {
  let repo = String(value).trim();
  if (/^https:\/\//i.test(repo)) {
    const url = new URL(repo);
    if (url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash) {
      throw new Error(`不是 GitHub 仓库首页：${value}`);
    }
    repo = url.pathname.replace(/^\/|\/$/g, '');
  }
  if (!/^[a-z\d](?:[a-z\d-]*[a-z\d])?\/[a-z\d_.-]+$/i.test(repo) || /\/(?:\.|\.\.)$/.test(repo)) {
    throw new Error(`仓库格式应为 owner/repo：${value}`);
  }
  const [owner, name] = repo.split('/');
  return { owner, name, fullName: repo, url: `https://github.com/${repo}` };
}

const escape = (value) => String(value).replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[ch]);

// 复用现有 Lucide 包生成静态 SVG，不把图标库发送给浏览器。
const icons = createRequire(import.meta.url)('@iconify-json/lucide/icons.json').icons;
const names = { repo: 'book-marked', star: 'star', fork: 'git-fork', arrow: 'arrow-up-right' };
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[names[name]].body}</svg>`;

/**
 * @param {{ repo: string, description?: string, language?: string, stars?: number, forks?: number, fetchMetadata?: boolean }} props
 */
export function renderGitHubRepoCard({ repo, description, language, stars, forks, fetchMetadata = true }) {
  const data = parseGitHubRepo(repo);
  const count = (kind, value, label) => {
    const valid = Number.isSafeInteger(value) && value >= 0;
    return `<span class="github-repo-card__metric" data-metric="${kind}"${valid ? '' : ' hidden'} aria-label="${valid ? value : ''} ${label}">${icon(kind)}<span data-value>${valid ? value.toLocaleString('en-US') : ''}</span></span>`;
  };
  return `<github-repo-card class="github-repo-card" data-repo="${escape(data.fullName)}" data-fetch="${fetchMetadata}"${description !== undefined ? ' data-custom-description' : ''}>
  <a class="github-repo-card__link custom-card" href="${escape(data.url)}" target="_blank" rel="noopener noreferrer" aria-label="在 GitHub 上查看 ${escape(data.fullName)}">
    <span class="github-repo-card__header">${icon('repo')}<span class="github-repo-card__name"><span>${escape(data.owner)} / </span><strong>${escape(data.name)}</strong></span><span class="github-repo-card__arrow">${icon('arrow')}</span></span>
    <span class="github-repo-card__description" data-description>${escape(description ?? '在 GitHub 上查看项目源码与最新动态。')}</span>
    <span class="github-repo-card__meta" data-pagefind-ignore>
      <span class="github-repo-card__metric" data-language${language ? '' : ' hidden'}><span class="github-repo-card__dot"></span><span data-value>${escape(language ?? '')}</span></span>
      ${count('star', stars, '个星标')}${count('fork', forks, '个分支')}
      <span class="github-repo-card__source">GitHub</span>
    </span>
  </a>
</github-repo-card>`;
}
