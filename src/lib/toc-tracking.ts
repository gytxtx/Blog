const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

/**
 * 活动项只在自己的目录容器里滚动：scrollIntoView 会连带滚动正文，
 * 与读者的滚动方向冲突。已经完整可见时不动，避免滚动跟随抖动。
 */
export function scrollTocItemIntoView(container: HTMLElement, item: HTMLElement) {
  const box = container.getBoundingClientRect();
  const current = item.getBoundingClientRect();
  if (current.top >= box.top && current.bottom <= box.bottom) return;
  container.scrollBy({
    top: current.top - box.top - (container.clientHeight - item.offsetHeight) / 2,
    behavior: reducedMotion.matches ? 'auto' : 'smooth',
  });
}

/** 两种目录呈现共用当前章节；页面实例负责释放监听与待执行的帧。 */
export function mountToc(root: Document): (() => void) | void {
  const links = [...root.querySelectorAll<HTMLAnchorElement>('.toc a, .toc-panel a')];
  const targets = [...new Map(links.map((a) => [a.hash, root.getElementById(decodeURIComponent(a.hash.slice(1)))])).entries()];
  if (!targets.length) return;
  let frame = 0;
  let shown: string | null = null;
  const update = () => {
    frame = 0;
    // 高亮线跟着锚点落点走：改 --header-height 或留白时，目录不再滞后半截顶栏。
    // 锚点跳转后标题正好停在这条线上，留 1px 容差避免亚像素取整把它判给上一章。
    const anchorLine = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) + 1;
    const index = Math.max(0, targets.findLastIndex(([, node]) => node && node.getBoundingClientRect().top < anchorLine));
    const active = targets[index][0];
    if (active === shown) return;
    shown = active;
    for (const link of links) {
      const isActive = link.hash === active;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
      // 同一章节在两种呈现里各有一个链接：侧栏和面板都要跟上。
      // 面板收起时 rect 全为 0，scrollTocItemIntoView 会自行跳过。
      const container = isActive ? link.closest<HTMLElement>('.toc, .toc-panel') : null;
      if (container) scrollTocItemIntoView(container, link);
    }
  };
  const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', scroll, { passive: true });
  update();
  return () => {
    window.removeEventListener('scroll', scroll);
    cancelAnimationFrame(frame);
  };
}
