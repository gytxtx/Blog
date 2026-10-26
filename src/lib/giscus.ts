import { THEMES } from './theme';

const ORIGIN = 'https://giscus.app';
const ATTRIBUTES: Record<string, string> = {
  'data-repo': 'gytxtx/Blog_Comments', 'data-repo-id': 'R_kgDOO28D8g',
  'data-category': 'General', 'data-category-id': 'DIC_kwDOO28D8s4CrGKY',
  'data-mapping': 'specific', 'data-strict': '0', 'data-reactions-enabled': '1',
  'data-emit-metadata': '0', 'data-input-position': 'bottom', 'data-lang': 'zh-CN',
  // 元素进入视口才插入脚本，此时立即加载 iframe，超时从真正请求时开始计算。
  'data-loading': 'eager',
};
const theme = () => document.documentElement.dataset.theme === THEMES.dark.name ? 'transparent_dark' : 'light';

class GiscusComments extends HTMLElement {
  #connection?: AbortController;
  #observer?: IntersectionObserver;
  #timer?: number;
  #started = false;
  #syncedFrame: HTMLIFrameElement | null = null;

  connectedCallback() {
    this.#connection?.abort();
    const { signal } = this.#connection = new AbortController();
    this.querySelector('[data-comments-retry]')?.addEventListener('click', () => this.#load(), { signal });
    document.addEventListener('themechange', () => this.#syncTheme(), { signal });
    window.addEventListener('message', (event) => {
      const frame = this.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
      if (event.origin !== ORIGIN || !frame || event.source !== frame.contentWindow || !event.data?.giscus) return;
      if (event.data.giscus.error) {
        this.#fail();
        return;
      }
      clearTimeout(this.#timer);
      this.dataset.state = 'ready';
      const status = this.querySelector<HTMLElement>('.comments-status');
      if (status) status.hidden = true;
      const retry = this.querySelector<HTMLElement>('[data-comments-retry]');
      if (retry) retry.hidden = true;
      if (this.#syncedFrame !== frame) {
        this.#syncedFrame = frame;
        this.#syncTheme();
      }
    }, { signal });
    if ('IntersectionObserver' in window) {
      this.#observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.#observer?.disconnect();
        if (!this.#started) this.#load();
      }, { rootMargin: '200px' });
      this.#observer.observe(this);
    } else this.#load();
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#connection?.abort();
    clearTimeout(this.#timer);
    this.#started = false;
  }

  #syncTheme() {
    this.querySelector<HTMLIFrameElement>('iframe.giscus-frame')?.contentWindow?.postMessage({ giscus: { setConfig: { theme: theme() } } }, ORIGIN);
  }

  #fail() {
    if (!this.isConnected) return;
    clearTimeout(this.#timer);
    this.dataset.state = 'error';
    const status = this.querySelector<HTMLElement>('.comments-status');
    if (status) { status.hidden = false; status.textContent = '评论暂时未能加载，可以重试或前往 GitHub 讨论区。'; }
    const retry = this.querySelector<HTMLElement>('[data-comments-retry]');
    if (retry) retry.hidden = false;
  }

  #load() {
    clearTimeout(this.#timer);
    this.#started = true;
    this.#syncedFrame = null;
    this.dataset.state = 'loading';
    const container = this.querySelector('.giscus');
    if (!container) return;
    const status = this.querySelector<HTMLElement>('.comments-status');
    if (status) { status.hidden = false; status.textContent = '正在加载评论…'; }
    const retry = this.querySelector<HTMLElement>('[data-comments-retry]');
    if (retry) retry.hidden = true;
    container.replaceChildren();
    const script = document.createElement('script');
    script.src = `${ORIGIN}/client.js`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    for (const [name, value] of Object.entries(ATTRIBUTES)) script.setAttribute(name, value);
    script.setAttribute('data-term', this.dataset.term ?? '');
    script.setAttribute('data-theme', theme());
    script.addEventListener('error', () => { if (script.isConnected) this.#fail(); }, { once: true, signal: this.#connection?.signal });
    this.#timer = window.setTimeout(() => this.#fail(), 15000);
    container.append(script);
  }
}

if (!customElements.get('giscus-comments')) customElements.define('giscus-comments', GiscusComments);
