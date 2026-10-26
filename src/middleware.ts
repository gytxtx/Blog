import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(({ url, redirect }, next) => {
  const match = url.pathname.match(/^\/article\/(\d{4}\/\d{2})\/([^/]+)\/?$/);
  if (match) {
    const slug = decodeURIComponent(match[2]);
    const normalized = slug.toLowerCase();
    if (slug !== normalized) {
      return redirect(`/article/${match[1]}/${encodeURIComponent(normalized)}/${url.search}`, 301);
    }
  }
  // 静态构建只输出小写正文页，部署时由 _redirects 兼容原大小写，避免 Windows 路径冲突。
  return next();
});
