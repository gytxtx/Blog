// @ts-check
/**
 * 文章地址公式的唯一来源：内容集合、Git 日期表和站点地图共用它，
 * 因为漏改一处仍能构建成功，只是 lastmod 与页面上的「更新于」会静默丢失。
 * @param {Date} pubDate 已解析的发布时间，按 UTC 读取
 * @param {string} slug front matter 声明的文章标识
 */
export function articleUrl(pubDate, slug) {
  const month = String(pubDate.getUTCMonth() + 1).padStart(2, '0');
  return `/article/${pubDate.getUTCFullYear()}/${month}/${String(slug).toLowerCase()}/`;
}
