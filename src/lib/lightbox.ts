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
  document.querySelectorAll('.post-main .prose > img, .post-main .prose p > img').forEach((img) => {
    if (img.closest('a')) return;
    const a = document.createElement('a');
    a.href = (img as HTMLImageElement).src;
    a.className = 'glightbox';
    a.setAttribute('data-gallery', 'post');
    img.replaceWith(a);
    a.appendChild(img);
  });
  if (!document.querySelector('.glightbox')) return;
  lightbox = GLightbox({
    selector: '.glightbox',
    ...lightboxEffects(),
  }) as Lightbox;
  lightbox.on('open', () => {
    lightboxClosed = new Promise<void>((resolve) => { resolveClose = resolve; });
  });
  lightbox.on('close', () => {
    resolveClose?.();
    resolveClose = undefined;
  });
});
