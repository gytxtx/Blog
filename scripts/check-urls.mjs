// @ts-check
/**
 * URL 验收门：对比构建产物（dist）与线上基线（urls-baseline-raw.xml）。
 * 规则：基线中的每个 URL 必须存在（旧地址保留跳转）；
 * 新地址为 /article/YYYY/MM/slug/ 和去掉 /blog 前缀的导航页。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categoryRedirects } from '../src/data/category-redirects.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const baselineFile = path.join(root, 'urls-baseline-raw.xml');

const ALLOW_NEW = [
  /^\/rss\.xml$/,
  /^\/og\//,
  /^\/sitemap/,
  /^\/robots\.txt$/,
  /^\/pagefind\//,
  // 首页分页（2026-10-25 结构调整：首页即文章列表，分页自 /blog/page/N/ 迁至 /page/N/）
  /^\/page\/\d+\/$/,
  // 分类总览：复用现有 /category/ 下的分类详情地址。
  /^\/category\/$/,
];

/**
 * 已解释的基线缺失须有对应 commits 证据。
 * 《猫》与「生活」分类已补齐，均须参与完整的 URL 与重定向验收。
 */
const EXPLAINED_MISSING = new Set([
  // e71a18a 明确删除旧公告；不恢复内容，也不再把该文章作为迁移验收目标。
  '/blog/2025/12/26/Site-Announcement/',
]);

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) out.push(...walk(p));
    else if (name.name === 'index.html') out.push(p);
  }
  return out;
}

// 当前产物
const current = new Set(
  walk(dist).map((f) => {
    const rel = path.relative(dist, f).replaceAll('\\', '/');
    if (rel === 'index.html') return '/';
    return '/' + rel.replace(/(^|\/)index\.html$/, '/');
  }),
);

// 基线
const raw = fs.readFileSync(baselineFile, 'utf8');
const baseline = new Set(
  [...raw.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    const u = new URL(m[1]);
    return decodeURIComponent(u.pathname);
  }),
);

// 逐条验证旧地址到最终地址的直接跳转，不能只放宽新增 URL 的正则。
const articleMoves = [...baseline]
  .filter((u) => /^\/blog\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/$/.test(u) && !EXPLAINED_MISSING.has(u))
  .map((from) => [from, from.replace(/^\/blog\/(\d{4}\/\d{2})\/\d{2}\//, '/article/$1/').toLowerCase()]);
const monthlyMoves = articleMoves.map(([from, to]) => [
  from.replace(/^(\/blog\/\d{4}\/\d{2})\/\d{2}\//, '$1/'), to,
]);
const pageMoves = [...baseline]
  .filter((u) => u.startsWith('/blog/') && !/^\/blog\/\d{4}\//.test(u) && !EXPLAINED_MISSING.has(u))
  .map((from) => [from, categoryRedirects[from.replace(/\/$/, '')] ?? from.replace(/^\/blog\//, '/')]);
// 新站分类入口同样保留跳转，旧站入口须直接抵达最终分类，避免重定向链。
const categoryMoves = Object.entries(categoryRedirects)
  .filter(([from]) => from.startsWith('/category/'))
  .map(([from, to]) => [`${from}/`, to]);
const moves = [...articleMoves, ...monthlyMoves, ...pageMoves, ...categoryMoves];
const migratedUrls = new Set(moves.flat());
const redirectRules = new Set(
  fs.readFileSync(path.join(dist, '_redirects'), 'utf8').split(/\r?\n/).map(decodeURIComponent),
);
// 仅大小写不同的地址只检查托管平台规则，不要求生成 HTML（Windows 会覆盖同名正文页）。
const caseMoves = articleMoves.map(([from, to]) => [
  from.replace(/^\/blog\/(\d{4}\/\d{2})\/\d{2}\//, '/article/$1/'), to,
]).filter(([from, to]) => from !== to);
const brokenCaseMoves = caseMoves.filter(([from, to]) =>
  !current.has(to) || !redirectRules.has(`${from} ${to} 301`) ||
  !redirectRules.has(`${from.replace(/\/$/, '')} ${to} 301`),
);
const brokenMoves = moves.filter(([from, to]) => {
  if (!current.has(from) || !current.has(to)) return true;
  const html = fs.readFileSync(path.join(dist, from, 'index.html'), 'utf8');
  const refresh = html.match(/http-equiv="refresh" content="0;url=([^"]+)"/);
  return !refresh || decodeURIComponent(refresh[1]) !== to ||
    !redirectRules.has(`${from} ${to} 301`) ||
    !redirectRules.has(`${from.replace(/\/$/, '')} ${to} 301`);
});

const missing = [...baseline].filter((u) => !current.has(u)).sort();
const fresh = [...current]
  .filter((u) => !baseline.has(u) && !migratedUrls.has(u) && !ALLOW_NEW.some((re) => re.test(u)))
  .sort();

console.log(`基线 ${baseline.size} 个 · 产物 ${current.size} 个`);
const unexplainedMissing = missing.filter((u) => !EXPLAINED_MISSING.has(u));
const explained = missing.filter((u) => EXPLAINED_MISSING.has(u));
if (explained.length) {
  console.log('\nℹ️ 已解释的基线缺失（见脚本内 EXPLAINED_MISSING 注释）：');
  for (const u of explained) console.log('  ~ ' + u);
}
if (unexplainedMissing.length) {
  console.log('\n❌ 基线中缺失（必须为 0，或逐条解释）：');
  for (const u of unexplainedMissing) console.log('  - ' + u);
}
if (fresh.length) {
  console.log('\n⚠️ 计划外新增（必须为 0，或逐条解释）：');
  for (const u of fresh) console.log('  + ' + u);
}
if (brokenMoves.length || brokenCaseMoves.length) {
  console.log('\n❌ 地址迁移不完整（目标页、静态跳转或 Cloudflare 301 规则缺失）：');
  for (const [from, to] of [...brokenMoves, ...brokenCaseMoves]) console.log(`  - ${from} → ${to}`);
}
if (!unexplainedMissing.length && !fresh.length && !brokenMoves.length && !brokenCaseMoves.length) {
  console.log(`\n✅ ${articleMoves.length} 篇文章和 ${pageMoves.length} 个导航页的 ${moves.length + caseMoves.length} 条旧地址跳转验证通过`);
  console.log('\n✅ URL diff 验收通过（未解释差异为 0）');
}
process.exit(unexplainedMissing.length || fresh.length || brokenMoves.length || brokenCaseMoves.length ? 1 : 0);
