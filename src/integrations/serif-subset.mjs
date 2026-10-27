// @ts-check
/**
 * 标题衬线字体自托管：/fonts/NotoSerifSC-Bold.woff2
 *
 * - build：扫 dist 里所有 h1–h4、<b>、站名链接的文字，加上 ASCII，从入库的 GB2312 子集
 *   （src/assets/fonts/NotoSerifSC-Bold-subset.otf）再裁一次输出 WOFF2，只含页面真正用到的字。
 * - dev：没有 dist 可扫，直接把整个 GB2312 子集转成 WOFF2 提供，首次请求时生成一次。
 *
 * 不在子集里的字会回退到 --serif 栈里的系统宋体。文件名固定，缓存策略见 public/_headers。
 */
import { glob, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const ROUTE = '/fonts/NotoSerifSC-Bold.woff2';
const SOURCE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../assets/fonts/NotoSerifSC-Bold-subset.otf',
);
const CHARSET = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts/charset.txt');
// 用衬线的元素：标题、上下篇的 <b>、顶栏站名
const SERIF_TEXT = /<(h[1-4]|b)\b[^>]*>([\s\S]*?)<\/\1>|<a class="brand"[^>]*>([\s\S]*?)<\/a>/g;

const ascii = () => Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)).join('');

/**
 * 只声明本插件用到的钩子入参，避免把 Astro / Vite 的内部类型拖进构建配置。
 * @typedef {object} ServerSetupOptions
 * @property {{ middlewares: { use: (handler: (req: { url?: string }, res: { setHeader(name: string, value: string): void; end(chunk: Uint8Array): void }, next: () => void) => Promise<void>) => void } }} server
 * @typedef {object} BuildDoneOptions
 * @property {URL} dir
 * @property {{ info(message: string): void }} logger
 */

export default function serifSubset() {
  return {
    name: 'serif-subset',
    /** @type {{ 'astro:server:setup': (options: ServerSetupOptions) => void; 'astro:build:done': (options: BuildDoneOptions) => Promise<void> }} */
    hooks: {
      'astro:server:setup': ({ server }) => {
        /** @type {Promise<Uint8Array> | undefined} */
        let font;
        server.middlewares.use(async (req, res, next) => {
          if (req.url !== ROUTE) return next();
          font ??= Promise.all([readFile(SOURCE), readFile(CHARSET, 'utf8')]).then(([src, text]) =>
            subsetFont(src, text + ascii(), { targetFormat: 'woff2' }),
          );
          res.setHeader('Content-Type', 'font/woff2');
          res.end(await font);
        });
      },
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const chars = new Set(ascii());
        for await (const rel of glob('**/*.html', { cwd: outDir })) {
          const html = await readFile(path.join(outDir, rel), 'utf8');
          for (const m of html.matchAll(SERIF_TEXT)) {
            for (const c of (m[2] ?? m[3]).replace(/<[^>]+>/g, '')) chars.add(c);
          }
        }
        const font = await subsetFont(await readFile(SOURCE), [...chars].join(''), { targetFormat: 'woff2' });
        const out = path.join(outDir, ROUTE);
        await mkdir(path.dirname(out), { recursive: true });
        await writeFile(out, font);
        logger.info(`${ROUTE}: ${chars.size} chars, ${(font.length / 1024).toFixed(0)} KB`);
      },
    },
  };
}
