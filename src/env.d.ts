// /pagefind/pagefind-ui.js 是构建后由 pagefind 生成的全局脚本，没有类型包
interface Window {
  PagefindUI?: new (options: Record<string, unknown>) => unknown;
}
