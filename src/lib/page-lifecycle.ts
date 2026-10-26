export type PageCleanup = () => void;
export type PageMount = (root: Document) => PageCleanup | void;

/** 模块注册一次；每次换页清理旧实例，再挂载新页面。自定义元素沿用原生生命周期。 */
export function onPageLoad(mount: PageMount): void {
  let cleanup: PageCleanup | void;
  const dispose = () => {
    const previous = cleanup;
    cleanup = undefined;
    previous?.();
  };
  document.addEventListener('astro:before-swap', dispose);
  document.addEventListener('astro:page-load', () => {
    dispose();
    cleanup = mount(document);
  });
}
