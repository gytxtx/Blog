import { initSearch } from './search-control';
import { initThemeButton } from './theme-control';
import { onPageLoad } from './page-lifecycle';

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
  if (button) button.onclick = () => setNav(!navOpen());
  if (nav) nav.onclick = (event) => { if ((event.target as Element).closest('a')) setNav(false); };
  initSearch();
  initThemeButton();
  return () => {
    if (button) button.onclick = null;
    if (nav) nav.onclick = null;
  };
});
document.addEventListener('click', (event) => {
  const target = event.target as Element;
  if (navOpen() && (!target.closest('.site-header') || target.closest('#search-btn'))) setNav(false);
});
// 横竖屏跨过折叠断点后，菜单从收起状态开始，避免返回窄屏时意外遮挡正文。
window.matchMedia('(max-width: 960px)').addEventListener('change', () => setNav(false));
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !navOpen()) return;
  setNav(false);
  document.getElementById('nav-btn')?.focus();
});
