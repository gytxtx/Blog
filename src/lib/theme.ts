/** CSS 变量、高亮主题名与浏览器地址栏共用这份配色定义。 */
export const THEMES = {
  light: {
    name: 'github-light',
    colors: {
      bg: '#fbfaf7',
      'bg-soft': '#f3f1ea',
      text: '#1d1f1c',
      muted: '#5f645c',
      border: '#e4e1d8',
      rule: '#1d1f1c',
      accent: '#2f6b3a',
      'accent-weak': '#e6efe5',
    },
  },
  dark: {
    name: 'github-dark',
    colors: {
      bg: '#121412',
      'bg-soft': '#1a1d1a',
      text: '#e6e4dc',
      muted: '#9da196',
      border: '#2a2e29',
      rule: '#e6e4dc',
      accent: '#8fc79a',
      'accent-weak': '#1e2a20',
    },
  },
} as const;

export const THEME_MODES = ['auto', 'light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
export const THEME_LABELS = { auto: '跟随系统', light: '浅色', dark: '深色' } as const;

export const themeCss = Object.entries(THEMES).map(([mode, theme]) => {
  const selector = `${mode === 'light' ? ':root, ' : ''}[data-theme='${theme.name}']`;
  return `${selector} { ${Object.entries(theme.colors).map(([key, value]) => `--${key}: ${value};`).join(' ')} }`;
}).join('\n');
