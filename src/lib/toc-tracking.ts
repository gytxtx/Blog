/** 两种目录呈现共用当前章节；页面实例负责释放监听与待执行的帧。 */
export function mountToc(root: Document): (() => void) | void {
  const links = [...root.querySelectorAll<HTMLAnchorElement>('.toc a, .toc-panel a')];
  const targets = [...new Map(links.map((a) => [a.hash, root.getElementById(decodeURIComponent(a.hash.slice(1)))])).entries()];
  if (!targets.length) return;
  let frame = 0;
  const update = () => {
    frame = 0;
    const index = Math.max(0, targets.findLastIndex(([, node]) => node && node.getBoundingClientRect().top < 120));
    const active = targets[index][0];
    for (const link of links) {
      link.classList.toggle('active', link.hash === active);
      if (link.hash === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
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
