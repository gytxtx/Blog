// /pagefind/pagefind-ui.js 是构建后由 pagefind 生成的全局脚本，没有类型包
interface Window {
  PagefindUI?: new (options: Record<string, unknown>) => { destroy?: () => void };
  __applyTheme?: (doc?: Document) => void;
  __setTheme?: (mode: import('./lib/theme').ThemeMode) => void;
}

// subset-font 只提供 JavaScript 实现，没有类型声明
declare module 'subset-font' {
  export default function subsetFont(
    font: Uint8Array | string,
    text: string,
    options?: { targetFormat?: 'woff' | 'woff2' | 'ttf' | 'otf' | 'variable' },
  ): Promise<Uint8Array>;
}

