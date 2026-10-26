const TRANSLATIONS = {
  placeholder: '搜索文章', clear_search: '清除', load_more: '加载更多结果', search_label: '搜索本站',
  zero_results: '没有找到 “[SEARCH_TERM]” 的结果', one_result: '为 “[SEARCH_TERM]” 找到 [COUNT] 个结果',
  many_results: '为 “[SEARCH_TERM]” 找到 [COUNT] 个结果', searching: '正在搜索 “[SEARCH_TERM]”…',
};

interface SearchResult {
  meta: { title?: string };
  excerpt?: string;
  sub_results?: { title?: string; excerpt?: string }[];
}
const strip = (value?: string) => value?.replaceAll('\u200b', '');
const processResult = (result: SearchResult) => {
  result.meta.title = strip(result.meta.title);
  result.excerpt = strip(result.excerpt);
  for (const sub of result.sub_results ?? []) {
    sub.title = strip(sub.title);
    sub.excerpt = strip(sub.excerpt);
  }
  return result;
};

let resource: Promise<void> | null = null;
let ui: { destroy?: () => void } | null = null;
let stopViewport: (() => void) | null = null;

// 软键盘可能只缩小视觉视口。弹窗跟随实际可见区域，关闭和换页时释放监听。
function trackViewport(dialog: HTMLDialogElement) {
  stopViewport?.();
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const viewport = window.visualViewport;
  const update = () => {
    dialog.style.setProperty('--search-viewport-height', `${viewport?.height ?? window.innerHeight}px`);
    dialog.style.setProperty('--search-viewport-top', `${viewport?.offsetTop ?? 0}px`);
  };
  viewport?.addEventListener('resize', update, options);
  viewport?.addEventListener('scroll', update, options);
  window.addEventListener('resize', update, options);
  update();
  stopViewport = () => {
    controller.abort();
    dialog.style.removeProperty('--search-viewport-height');
    dialog.style.removeProperty('--search-viewport-top');
  };
}

function loadPagefind(): Promise<void> {
  if (window.PagefindUI) return Promise.resolve();
  if (resource) return resource;
  resource = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/pagefind/pagefind-ui.js';
    script.async = true;
    const finish = (error?: Error) => {
      clearTimeout(timer);
      script.onload = script.onerror = null;
      if (error) { script.remove(); reject(error); }
      else resolve();
    };
    const timer = window.setTimeout(() => finish(new Error('搜索加载超时')), 10000);
    script.onload = () => finish(window.PagefindUI ? undefined : new Error('搜索加载失败'));
    script.onerror = () => finish(new Error('搜索加载失败'));
    document.head.append(script);
  }).catch((error) => { resource = null; throw error; });
  return resource;
}

export function initSearch() {
  const trigger = document.getElementById('search-btn');
  const dialog = document.getElementById('search-dialog') as HTMLDialogElement | null;
  const status = document.getElementById('search-status');
  const retry = document.getElementById('search-retry');
  const container = document.getElementById('pagefind-search');
  if (!trigger || !dialog || !status || !retry || !container) return;
  let preparing = false;
  const prepare = async () => {
    if (container.dataset.pfInit || preparing) {
      if (container.dataset.pfInit) container.querySelector<HTMLInputElement>('input')?.focus();
      return;
    }
    if (dialog.dataset.searchEnabled !== 'true') {
      status.textContent = '开发预览不提供搜索索引，请构建后预览搜索。';
      return;
    }
    preparing = true;
    retry.hidden = true;
    status.hidden = false;
    status.textContent = '正在准备搜索…';
    container.setAttribute('aria-busy', 'true');
    try {
      await loadPagefind();
      if (!dialog.isConnected) return;
      container.replaceChildren();
      ui = new window.PagefindUI!({ element: container, showImages: false, translations: TRANSLATIONS, processResult });
      container.dataset.pfInit = '1';
      status.hidden = true;
      if (dialog.open) container.querySelector<HTMLInputElement>('input')?.focus();
    } catch {
      if (!dialog.isConnected) return;
      status.textContent = '搜索暂时未能加载，请重试。';
      retry.hidden = false;
    } finally {
      preparing = false;
      container.removeAttribute('aria-busy');
    }
  };
  trigger.onclick = () => {
    if (!dialog.open) {
      trackViewport(dialog);
      dialog.showModal();
    }
    void prepare();
  };
  document.getElementById('search-close')!.onclick = () => dialog.close();
  retry.onclick = () => { void prepare(); };
  dialog.onclick = (event) => { if (event.target === dialog) dialog.close(); };
  dialog.onclose = () => {
    if (!trigger.isConnected) return;
    stopViewport?.();
    stopViewport = null;
    trigger.focus();
  };
}

document.addEventListener('astro:before-swap', () => {
  stopViewport?.();
  stopViewport = null;
  ui?.destroy?.();
  ui = null;
});
document.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
  const dialog = document.getElementById('search-dialog') as HTMLDialogElement | null;
  if (!dialog) return;
  event.preventDefault();
  if (dialog.open) dialog.close();
  else document.getElementById('search-btn')?.click();
});
