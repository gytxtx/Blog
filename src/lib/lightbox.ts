// glightbox 图片灯箱：正文图片自动包一层链接（等价于 Material 的 glightbox 插件）
import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';
import GLightbox from 'glightbox';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const lightboxEffects = () => ({
  openEffect: reducedMotion.matches ? 'none' : 'zoom',
  closeEffect: reducedMotion.matches ? 'none' : 'zoom',
  slideEffect: reducedMotion.matches ? 'none' : 'slide',
});
// GLightbox 的类型声明漏掉了运行时提供的 settings。
type Lightbox = ReturnType<typeof GLightbox> & { settings: ReturnType<typeof lightboxEffects> };
let lightbox: Lightbox | null = null;
let lightboxClosed = Promise.resolve();
let resolveClose: (() => void) | undefined;

async function destroyLightbox() {
  const instance = lightbox;
  lightbox = null;
  if (instance) {
    // 换页时同步关闭；若用户已开始关闭动画，则等它清完键盘监听后再换 DOM。
    instance.settings.openEffect = 'none';
    instance.settings.closeEffect = 'none';
    instance.close();
    await lightboxClosed;
    instance.destroy();
  }
  return lightboxClosed;
}

document.addEventListener('astro:before-preparation', (event) => {
  const preparation = event as TransitionBeforePreparationEvent;
  const loader = preparation.loader;
  preparation.loader = async () => {
    await loader.call(preparation);
    if (!preparation.signal.aborted && !preparation.defaultPrevented) await destroyLightbox();
  };
});

reducedMotion.addEventListener('change', () => {
  if (lightbox) Object.assign(lightbox.settings, lightboxEffects());
});

document.addEventListener('astro:page-load', () => {
  document.querySelectorAll<HTMLImageElement>('.post-main .prose > img, .post-main .prose p > img').forEach((img, index) => {
    if (img.closest('a')) return;
    const a = document.createElement('a');
    const description = img.alt.trim() || img.title.trim() || `图片 ${index + 1}`;
    a.href = img.src;
    a.className = 'glightbox';
    a.setAttribute('data-gallery', 'post');
    a.setAttribute('aria-label', `查看大图：${description}`);
    // 触发节点是链接，GLightbox 不会自动继承子图片的 alt。
    a.dataset.alt = description;
    img.replaceWith(a);
    a.appendChild(img);
  });
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.glightbox')];
  if (!links.length) return;
  const instance = GLightbox({
    selector: '.glightbox',
    ...lightboxEffects(),
  }) as Lightbox;
  lightbox = instance;
  let returnFocus: HTMLElement | null = null;
  let restoreDialog: (() => void) | undefined;
  instance.on('open', () => {
    lightboxClosed = new Promise<void>((resolve) => { resolveClose = resolve; });
    returnFocus = links[instance.getActiveSlideIndex() ?? 0] ?? null;
    const dialog = document.querySelector<HTMLElement>('.glightbox-container');
    if (!dialog) return;
    dialog.setAttribute('aria-label', '图片预览');
    dialog.setAttribute('aria-modal', 'true');
    const background = [...document.body.children].filter((element): element is HTMLElement =>
      element instanceof HTMLElement && element !== dialog && !element.inert,
    );
    background.forEach((element) => { element.inert = true; });
    const controller = new AbortController();
    // GLightbox 的内置 Tab 导航不处理 Shift+Tab；在弹窗内接管双向循环。
    dialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      event.preventDefault();
      event.stopPropagation();
      const controls = [...dialog.querySelectorAll<HTMLElement>('button, a[href], [tabindex]')]
        .filter((element) => element.tabIndex >= 0
          && !element.matches(':disabled, .disabled, .glightbox-button-hidden')
          && element.getClientRects().length > 0);
      const index = controls.indexOf(document.activeElement as HTMLElement);
      const next = index < 0 ? (event.shiftKey ? controls.length - 1 : 0)
        : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      (controls[next] ?? dialog).focus();
    }, { signal: controller.signal });
    restoreDialog = () => {
      controller.abort();
      background.forEach((element) => { element.inert = false; });
    };
    dialog.querySelector<HTMLElement>('.gclose')?.focus({ preventScroll: true });
  });
  instance.on('close', () => {
    restoreDialog?.();
    restoreDialog = undefined;
    // 导航销毁会先清空 lightbox；不要把焦点移回即将被替换的正文。
    if (lightbox === instance && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
    resolveClose?.();
    resolveClose = undefined;
  });
});
