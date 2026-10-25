/**
 * URL 验收门：对比构建产物（dist）与线上基线（urls-baseline-raw.xml）。
 * 规则：基线中的每个 URL 必须存在；新增 URL 仅允许 rss/og/sitemap（与迁移方案一致）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const baselineFile = path.join(root, 'urls-baseline-raw.xml');

const ALLOW_NEW = [/^\/rss\.xml$/, /^\/og\//, /^\/sitemap/, /^\/robots\.txt$/, /^\/pagefind\//];

/**
 * 已解释的基线缺失（不许新增，除非有对应 commits 证据）：
 * 线上最后一次部署落后于源仓库 HEAD——文章《反思》在源仓库已转草稿并改写过
 * （线上旧版：/blog/2026/09/26/Cat/，仓库现版：2026-09-17_Fuck.md，draft: true），
 * 随之消失的还有仅由该文章产生的分类页 /blog/category/生活/。
 */
const EXPLAINED_MISSING = new Set(['/blog/2026/09/26/Cat/', '/blog/category/生活/']);

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

const missing = [...baseline].filter((u) => !current.has(u)).sort();
const fresh = [...current]
  .filter((u) => !baseline.has(u) && !ALLOW_NEW.some((re) => re.test(u)))
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
if (!unexplainedMissing.length && !fresh.length) {
  console.log('\n✅ URL diff 验收通过（未解释差异为 0）');
}
process.exit(unexplainedMissing.length || fresh.length ? 1 : 0);
