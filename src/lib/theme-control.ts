import { THEME_MODES as MODES, THEME_LABELS as LABELS, type ThemeMode } from './theme';
export type { ThemeMode } from './theme';

export function initThemeButton() {
  const button = document.getElementById('theme-btn');
  if (!button) return;
  const current = (): ThemeMode => {
    const mode = document.documentElement.dataset.mode;
    return MODES.includes(mode as ThemeMode) ? mode as ThemeMode : 'auto';
  };
  const label = () => {
    const text = `主题：${LABELS[current()]}（点击切换）`;
    button.setAttribute('aria-label', text);
    button.title = text;
  };
  label();
  let target: ThemeMode | null = null;
  let latest: ViewTransition | null = null;
  button.onclick = () => {
    button.classList.add('switched');
    target = MODES[(MODES.indexOf(target ?? current()) + 1) % MODES.length];
    const swap = () => {
      if (target) window.__setTheme?.(target);
      label();
    };
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const root = document.documentElement;
      root.dataset.themeSwitching = '';
      const transition = latest = document.startViewTransition(swap);
      transition.ready.catch(() => {});
      transition.finished.finally(() => {
        if (latest !== transition) return;
        delete root.dataset.themeSwitching;
        target = null;
      }).catch(() => {});
    } else {
      swap();
      target = null;
    }
  };
}
