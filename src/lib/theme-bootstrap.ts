import { THEMES, THEME_MODES, type ThemeMode } from './theme.ts';

interface BootstrapConfig {
  modes: readonly ThemeMode[];
  themes: typeof THEMES;
}

/** 自包含的首帧脚本；只通过参数传入配置，不能引用模块作用域变量。 */
function bootstrap({ modes, themes }: BootstrapConfig) {
  if (window.__applyTheme) { window.__applyTheme(); return; }
  let mode: ThemeMode = 'auto';
  try {
    const saved = localStorage.getItem('theme') as ThemeMode;
    if (modes.includes(saved)) mode = saved;
  } catch {}
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = (doc: Document = document) => {
    const theme = themes[mode === 'dark' || (mode === 'auto' && system.matches) ? 'dark' : 'light'];
    doc.documentElement.dataset.theme = theme.name;
    doc.documentElement.dataset.mode = mode;
    doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.colors.bg);
  };
  window.__applyTheme = apply;
  window.__setTheme = (next) => {
    if (!modes.includes(next)) return;
    mode = next;
    try { localStorage.setItem('theme', mode); } catch {}
    apply();
    document.dispatchEvent(new CustomEvent('themechange'));
  };
  apply();
  document.addEventListener('astro:before-swap', (event) => {
    apply((event as Event & { newDocument: Document }).newDocument);
  });
  system.addEventListener('change', () => {
    if (mode !== 'auto') return;
    apply();
    document.dispatchEvent(new CustomEvent('themechange'));
  });
}

/** 输出经典内联脚本，避免模块脚本推迟到首帧之后才执行。 */
export function themeBootstrapScript(): string {
  return `(${bootstrap.toString()})(${JSON.stringify({ modes: THEME_MODES, themes: THEMES })});`;
}
