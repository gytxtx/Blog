/**
 * OG 字体子集化（一次性）：生成 GB2312 全集 + ASCII + 常用标点的字符集文件，
 * 并调用 fontTools（pyftsubset）裁剪 Noto Sans CJK SC。
 * （曾尝试 harfbuzz（subset-font npm 包），对 16MB CFF 格式 CJK 字体直接失败，故用 fontTools。）
 * 产物提交进仓库，构建期不再依赖网络。
 *
 * 前置：python -m pip install fonttools
 * 用法：node scripts/subset-font.mjs <regular.otf> <bold.otf>
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import iconv from 'iconv-lite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src', 'assets', 'fonts');

function charset() {
  const chars = new Set();
  for (let c = 0x20; c <= 0x7e; c++) chars.add(String.fromCharCode(c));
  // GB2312 双字节区（B0A1–F7FE，6763 个汉字/符号）
  for (let lead = 0xb0; lead <= 0xf7; lead++) {
    for (let trail = 0xa1; trail <= 0xfe; trail++) {
      const s = iconv.decode(Buffer.from([lead, trail]), 'gb2312');
      if (s && s !== '\uFFFD') chars.add(s);
    }
  }
  chars.add('，。、；：？！“”‘’《》【】（)—…·～');
  return [...chars].join('');
}

const [reg, bold] = process.argv.slice(2);
if (!reg || !bold) {
  console.error('用法：node scripts/subset-font.mjs <regular.otf> <bold.otf>');
  process.exit(1);
}

const text = charset();
const charsetFile = path.join(root, 'scripts', 'charset.txt');
fs.writeFileSync(charsetFile, text);
console.log(`字符集：${text.length} 个字符 → ${charsetFile}`);

fs.mkdirSync(outDir, { recursive: true });
for (const [src, out] of [
  [reg, 'NotoSansSC-Regular-subset.otf'],
  [bold, 'NotoSansSC-Bold-subset.otf'],
]) {
  const dest = path.join(outDir, out);
  execSync(
    `python -m fontTools.subset "${path.resolve(src)}" --text-file="${charsetFile}" ` +
      `--output-file="${dest}" --desubroutinize --drop-tables+=DSIG`,
    { stdio: 'inherit' },
  );
  console.log(`${out}: ${(fs.statSync(dest).size / 1024 / 1024).toFixed(2)} MB`);
}
