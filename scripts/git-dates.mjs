/**
 * 构建前生成 src/data/git-dates.json：内容文件 → 最后一次提交时间（ISO）。
 * 对应 Material 的 git-revision-date-localized 插件；无 Git 环境时降级为空对象。
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'src', 'content', 'blog');
const outFile = path.join(root, 'src', 'data', 'git-dates.json');

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) out.push(...walk(p));
    else if (name.name.endsWith('.md')) out.push(path.relative(root, p).replaceAll('\\', '/'));
  }
  return out;
}

const dates = {};
if (fs.existsSync(path.join(root, '.git'))) {
  for (const rel of walk(contentDir)) {
    try {
      const iso = execSync(`git log -1 --format=%cI -- "${rel}"`, { cwd: root })
        .toString()
        .trim();
      if (iso) dates[rel] = iso;
    } catch {
      // 新文件尚未提交等场景：静默跳过
    }
  }
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(dates, null, 2));
console.log(`git-dates: ${Object.keys(dates).length} 个文件`);
