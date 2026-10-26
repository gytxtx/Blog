/**
 * 一次性内容迁移脚本：Material for MkDocs → Astro Content Collections
 *
 * 用法：node scripts/migrate-content.mjs <src-posts-dir> <dest-dir>
 *
 * 处理内容：
 *  - 拍平 Material 的嵌套日期（date.created → pubDate，date.updated → updatedDate）
 *  - title 缺失时取正文第一个 H1，并从正文中移除（由模板负责渲染标题）
 *  - 丢弃 Material 专有/无用的 links 字段
 *  - `!!! type "Title"` admonition 转为引用块
 *  - 保留 `<!-- more -->`（作为摘要分隔符使用）与所有其余 front matter
 *  - 目录式文章连同同目录图片一起复制
 */
import fs from 'node:fs';
import path from 'node:path';
import { load as yamlLoad } from 'js-yaml';

const [srcArg, destArg] = process.argv.slice(2);
if (!srcArg || !destArg) {
  console.error('用法：node scripts/migrate-content.mjs <src> <dest>');
  process.exit(1);
}
const SRC = path.resolve(srcArg);
const DEST = path.resolve(destArg);

const SKIP = new Set(['Example-Article.md']); // 示例草稿，不迁移（迁移方案决策点 #2）

function collect(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) out.push(...collect(p));
    else if (name.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function firstH1OutsideFences(body) {
  let inFence = false;
  for (const line of body.split('\n')) {
    if (/^(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && /^#\s+/.test(line)) return line.replace(/^#\s+/, '').trim();
  }
  return null;
}

/** Material admonition → 引用块。返回 { text, changed } */
function convertAdmonitions(body) {
  const lines = body.split('\n');
  const out = [];
  let i = 0;
  let changed = false;
  while (i < lines.length) {
    const m = lines[i].match(/^!!!\s+(\w+)(?:\s+"([^"]*)")?\s*$/);
    if (!m) {
      out.push(lines[i++]);
      continue;
    }
    changed = true;
    const title = m[2] ?? m[1];
    const content = [];
    i++;
    while (i < lines.length && (lines[i] === '' || /^(\s{4}|\t)/.test(lines[i]))) {
      content.push(lines[i]);
      i++;
    }
    while (content.length && content.at(-1) === '') content.pop();
    out.push(`> **${title}**`);
    for (const c of content) out.push(c === '' ? '>' : '> ' + c.replace(/^(\s{4}|\t)/, ''));
    out.push('');
  }
  return { text: out.join('\n'), changed };
}

function serialize(fm) {
  const order = [
    'title', 'pubDate', 'updatedDate', 'slug', 'description', 'authors', 'categories',
    'tags', 'readtime', 'draft', 'pin', 'comments',
  ];
  const keys = [...order.filter((k) => k in fm), ...Object.keys(fm).filter((k) => !order.includes(k))];
  return keys
    .map((k) => {
      const v = fm[k];
      if (Array.isArray(v)) return `${k}:\n${v.map((x) => `  - ${JSON.stringify(x)}`).join('\n')}`;
      return `${k}: ${JSON.stringify(v)}`;
    })
    .join('\n');
}

const mdFiles = collect(SRC).filter((p) => !SKIP.has(path.basename(p)) && !SKIP.has(path.relative(SRC, p)));
const report = [];

for (const file of mdFiles) {
  const rel = path.relative(SRC, file);
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) {
    console.error(`跳过（无 front matter）：${rel}`);
    continue;
  }
  const fm = yamlLoad(m[1]) ?? {};
  let body = raw.slice(m[0].length);

  // 拍平日期
  const toDay = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v));
  const created = fm.date?.created ?? fm.date;
  if (!created) throw new Error(`缺日期：${rel}`);
  fm.pubDate = toDay(created);
  if (fm.date?.updated) fm.updatedDate = toDay(fm.date.updated);
  delete fm.date;

  // 标题：front matter 优先，其次正文首个 H1（并从正文移除）
  if (!fm.title) {
    const h1 = firstH1OutsideFences(body);
    if (!h1) throw new Error(`无 title 且正文无 H1：${rel}`);
    fm.title = h1;
    const lines = body.split('\n');
    const idx = lines.findIndex((l) => /^#\s+/.test(l));
    lines.splice(idx, 1);
    while (lines[idx] === '') lines.splice(idx, 1);
    body = lines.join('\n');
  }

  // slug 兜底（本站所有文章均有显式 slug，此分支仅为保险）
  if (!fm.slug) {
    fm.slug = path.basename(rel).replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}_/, '');
    console.warn(`警告：${rel} 无 slug，回退为 ${fm.slug}`);
  }

  delete fm.links; // Material 专有，未在站点使用

  const ad = convertAdmonitions(body);
  body = ad.text;

  const destPath = path.join(DEST, rel);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, `---\n${serialize(fm)}\n---\n${body.replace(/^\n+/, '')}`);

  const d = new Date(fm.pubDate);
  const url = `/article/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${fm.slug.toLowerCase()}/`;
  report.push(`${rel.padEnd(50)} → ${url}`);
}

// 复制目录式文章的图片等静态资源
for (const name of fs.readdirSync(SRC, { withFileTypes: true })) {
  if (name.isDirectory()) {
    for (const f of fs.readdirSync(path.join(SRC, name.name))) {
      if (!f.endsWith('.md')) {
        fs.mkdirSync(path.join(DEST, name.name), { recursive: true });
        fs.copyFileSync(path.join(SRC, name.name, f), path.join(DEST, name.name, f));
      }
    }
  }
}

console.log(report.sort().join('\n'));
console.log(`\n迁移完成：${report.length} 篇文章（跳过 ${SKIP.size} 个示例文件）`);
