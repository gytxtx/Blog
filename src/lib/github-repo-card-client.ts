interface RepoMetadata {
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
}

const CACHE_MS = 30 * 60 * 1000;
const requests = new Map<string, { expires: number; result: Promise<RepoMetadata | null> }>();
const compactNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

function validMetadata(value: unknown): value is RepoMetadata {
  if (!value || typeof value !== 'object') return false;
  const data = value as RepoMetadata;
  return (data.description === null || typeof data.description === 'string') &&
    (data.language === null || typeof data.language === 'string') &&
    Number.isSafeInteger(data.stars) && data.stars >= 0 &&
    Number.isSafeInteger(data.forks) && data.forks >= 0;
}

async function fetchMetadata(repo: string): Promise<RepoMetadata | null> {
  const key = `github-repo-card:v1:${repo.toLowerCase()}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (cached?.expires > Date.now() && validMetadata(cached.data)) return cached.data;
  } catch { /* 存储被禁用或缓存损坏时仍可获取公开信息。 */ }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const data = {
      description: payload.description,
      language: payload.language,
      stars: payload.stargazers_count,
      forks: payload.forks_count,
    };
    if (!validMetadata(data)) return null;
    try {
      sessionStorage.setItem(key, JSON.stringify({ expires: Date.now() + CACHE_MS, data }));
    } catch { /* 无持久缓存时，仍使用下方的内存缓存去重。 */ }
    return data;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

function getMetadata(repo: string) {
  const key = repo.toLowerCase();
  let cached = requests.get(key);
  if (!cached || cached.expires <= Date.now()) {
    cached = { expires: Date.now() + CACHE_MS, result: fetchMetadata(repo) };
    requests.set(key, cached);
  }
  return cached.result;
}

class GitHubRepoCard extends HTMLElement {
  #started = false;
  #observer?: IntersectionObserver;

  connectedCallback() {
    if (this.#started || this.dataset.fetch === 'false') return;
    if ('IntersectionObserver' in window) {
      this.#observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.#observer?.disconnect();
          void this.#load();
        }
      }, { rootMargin: '200px' });
      this.#observer.observe(this);
    } else {
      void this.#load();
    }
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
  }

  async #load() {
    if (this.#started) return;
    const repo = this.dataset.repo;
    // 也校验直接写在 HTML 里的实例，确保网络请求始终限定在 GitHub 仓库 API。
    if (!repo || !/^[a-z\d-]+\/[a-z\d_.-]+$/i.test(repo)) return;
    this.#started = true;
    this.setAttribute('aria-busy', 'true');
    const data = await getMetadata(repo);
    this.removeAttribute('aria-busy');
    if (!data) return;

    const description = this.querySelector('[data-description]');
    if (description && !this.hasAttribute('data-custom-description')) {
      description.textContent = data.description || '项目暂未提供简介。';
    }
    const language = this.querySelector<HTMLElement>('[data-language]');
    if (language) {
      language.hidden = !data.language;
      const value = language.querySelector('[data-value]');
      if (value) value.textContent = data.language ?? '';
    }
    for (const [kind, count, label] of [
      ['star', data.stars, '个星标'],
      ['fork', data.forks, '个分支'],
    ] as const) {
      const metric = this.querySelector<HTMLElement>(`[data-metric="${kind}"]`);
      const value = metric?.querySelector('[data-value]');
      if (!metric || !value) continue;
      metric.hidden = false;
      metric.title = count.toLocaleString('en-US');
      metric.setAttribute('aria-label', `${metric.title} ${label}`);
      value.textContent = compactNumber.format(count);
    }
  }
}

if (!customElements.get('github-repo-card')) {
  customElements.define('github-repo-card', GitHubRepoCard);
}

export {};
