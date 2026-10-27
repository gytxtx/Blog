// @ts-check
/**
 * Pagefind 建索引（替代 `pagefind --site dist`）。
 *
 * Pagefind 建索引时用 jieba（charabia）给中文分词，搜索时却用浏览器的 Intl.Segmenter，
 * 两边切法不一致：比如「域名」在索引里是一个词，查询时被切成「域」「名」，结果搜「域名」
 * 只能命中碰巧同时有「域…」「名…」开头词的文章。
 *
 * 这里先按 Intl.Segmenter 的词边界在中文里插零宽空格（U+200B）再交给 Pagefind，
 * 让索引的切分和查询一致。只改喂给索引的内容，dist 里的 HTML 原样不动；
 * 零宽空格在搜索摘要里不可见。
 */
import * as pagefind from 'pagefind';
import { glob, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
const CJK_RUN = /[\u3400-\u9fff]+/g;
const HAS_CJK = /[\u3400-\u9fff]/;

/** @param {string} text */
const segment = (text) =>
  text.replace(CJK_RUN, (run) => [...segmenter.segment(run)].map((s) => s.segment).join('\u200b'));

const { index, errors } = await pagefind.createIndex({});
if (!index) throw new Error(errors.join('\n'));

for await (const rel of glob('**/*.html', { cwd: site })) {
  const html = await readFile(path.join(site, rel), 'utf8');
  // 旧地址的跳转页不进搜索结果，避免同一篇文章出现两套地址。
  if (/<meta\b[^>]*http-equiv=["']refresh["']/i.test(html)) continue;
  // 只处理标签之间的文本，属性和标签名不碰
  const content = html.replace(/>([^<]+)</g, (m, text) => (HAS_CJK.test(text) ? `>${segment(text)}<` : m));
  const res = await index.addHTMLFile({ sourcePath: rel, content });
  if (res.errors.length) throw new Error(`${rel}: ${res.errors.join('\n')}`);
}

const { errors: writeErrors } = await index.writeFiles({ outputPath: path.join(site, 'pagefind') });
if (writeErrors.length) throw new Error(writeErrors.join('\n'));
await pagefind.close();
console.log(`pagefind: index written to ${path.relative(process.cwd(), path.join(site, 'pagefind'))}`);
