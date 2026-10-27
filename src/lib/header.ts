import { initSearch } from './search-control';
import { initThemeButton } from './theme-control';
import { onPageLoad } from './page-lifecycle';
import { scrollTocItemIntoView } from './toc-tracking';
import { BREAKPOINTS } from './breakpoints';

const navOpen = () => !!document.querySelector('.site-header[data-nav-open]');
function setNav(open: boolean) {
  const header = document.querySelector('.site-header');
  const button = document.getElementById('nav-btn');
  if (!header || !button) return;
  header.toggleAttribute('data-nav-open', open);
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
}
onPageLoad((root) => {
  const button = root.getElementById('nav-btn');
  const nav = root.getElementById('site-nav');
  const tocButton = root.getElementById('toc-btn');
  const tocPanel = root.getElementById('header-toc');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const narrow = window.matchMedia(`(max-width: ${BREAKPOINTS.toc}px)`);
  const closeToc = (restoreFocus = false) => {
    if (!tocPanel || !tocButton) return;
    tocPanel.hidden = true;
    tocButton.setAttribute('aria-expanded', 'false');
    tocButton.setAttribute('aria-label', '打开目录');
    if (restoreFocus) tocButton.focus({ preventScroll: true });
  };
  if (tocButton && tocPanel) {
    tocButton.onclick = () => {
      if (!tocPanel.hidden) { closeToc(true); return; }
      if (!narrow.matches) return;
      setNav(false);
      tocPanel.hidden = false;
      tocButton.setAttribute('aria-expanded', 'true');
      tocButton.setAttribute('aria-label', '关闭目录');
      const current = tocPanel.querySelector<HTMLAnchorElement>('a[aria-current="location"]')
        ?? tocPanel.querySelector<HTMLAnchorElement>('a');
      current?.focus({ preventScroll: true });
      if (current) scrollTocItemIntoView(tocPanel, current);
    };
    tocPanel.onclick = (event) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('a');
      if (!link) return;
      closeToc();
      const heading = root.getElementById(decodeURIComponent(link.hash.slice(1)));
      if (heading) {
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    };
    const dismissOutside = (event: Event) => {
      const target = event.target as Node;
      if (!tocPanel.hidden && !tocPanel.contains(target) && !tocButton.contains(target)) closeToc();
    };
    root.addEventListener('click', dismissOutside, options);
    root.addEventListener('focusin', dismissOutside, options);
    root.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || tocPanel.hidden) return;
      event.preventDefault();
      closeToc(true);
    }, options);
    narrow.addEventListener('change', () => {
      const restoreFocus = tocPanel.contains(root.activeElement) || root.activeElement === tocButton;
      closeToc();
      if (restoreFocus) {
        const target = narrow.matches ? tocButton
          : root.querySelector<HTMLElement>('.toc a[aria-current="location"], .toc a');
        target?.focus({ preventScroll: true });
      }
    }, options);
  }
  if (button) button.onclick = () => setNav(!navOpen());
  if (nav) nav.onclick = (event) => { if ((event.target as Element).closest('a')) setNav(false); };
  initSearch();
  initThemeButton();
  return () => {
    controller.abort();
    closeToc();
    if (tocButton) tocButton.onclick = null;
    if (tocPanel) tocPanel.onclick = null;
    if (button) button.onclick = null;
    if (nav) nav.onclick = null;
  };
});
document.addEventListener('click', (event) => {
  const target = event.target as Element;
  if (navOpen() && (!target.closest('.site-header') || target.closest('#search-btn'))) setNav(false);
});
// 横竖屏跨过折叠断点后，菜单从收起状态开始，避免返回窄屏时意外遮挡正文。
window.matchMedia(`(max-width: ${BREAKPOINTS.menu}px)`).addEventListener('change', () => setNav(false));
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !navOpen()) return;
  setNav(false);
  document.getElementById('nav-btn')?.focus();
});
