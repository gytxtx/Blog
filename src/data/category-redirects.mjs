/** 合并分类的旧地址直接指向最终分类，同时兼容旧站 /blog 前缀。 */
/** @type {Record<string, string>} */
export const categoryRedirects = {
  '/category/github': '/category/技术/',
  '/category/易语言': '/category/技术/',
  '/category/日常': '/category/生活/',
  '/blog/category/github': '/category/技术/',
  '/blog/category/易语言': '/category/技术/',
  '/blog/category/日常': '/category/生活/',
};
