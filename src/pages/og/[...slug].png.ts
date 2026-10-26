import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { getPosts, postOgPath, formatDate, readingTime } from '../../lib/posts';
import { SITE } from '../../consts';
import { THEMES } from '../../lib/theme';

// 字体为 GB2312 全集子集（scripts/subset-font.mjs 预生成并入库），构建期零网络依赖。
// 预渲染在项目根目录下执行，用 cwd 定位源文件（import.meta.url 会被打包重定向到 dist）。
const fontDir = path.join(process.cwd(), 'src', 'assets', 'fonts');
const fonts = [
  {
    name: 'Noto Sans SC',
    data: await readFile(path.join(fontDir, 'NotoSansSC-Regular-subset.otf')),
    weight: 400 as const,
    style: 'normal' as const,
  },
  {
    name: 'Noto Serif SC',
    data: await readFile(path.join(fontDir, 'NotoSerifSC-Bold-subset.otf')),
    weight: 700 as const,
    style: 'normal' as const,
  },
];
const logo = `data:image/jpeg;base64,${(await readFile(path.join(process.cwd(), 'public', 'img', 'logo.jpg'))).toString('base64')}`;

// 与页面 CSS 和浏览器地址栏共用浅色配色。
const C = THEMES.light.colors;

interface Props {
  title: string;
  /** 右上角：文章分类；默认卡片为空 */
  kicker: string;
  /** 标题下的一行副标题，仅默认卡片使用 */
  lede: string;
  /** 底部左侧元信息，逐项用间距隔开 */
  meta: string[];
}

export async function getStaticPaths() {
  const posts = await getPosts();
  const years = posts.map((p) => p.data.pubDate.getUTCFullYear());
  return [
    {
      params: { slug: 'default' },
      props: {
        title: SITE.title,
        kicker: '',
        lede: SITE.description,
        meta: [`${posts.length} 篇文章`, `${Math.min(...years)} — ${Math.max(...years)}`],
      },
    },
    ...(await Promise.all(
      posts.map(async (post) => ({
        params: { slug: postOgPath(post) },
        props: {
          title: post.data.title,
          kicker: post.data.categories.join('、'),
          lede: '',
          meta: [formatDate(post.data.pubDate), `${await readingTime(post)} 分钟`],
        },
      })),
    )),
  ];
}

const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({
  type,
  props: { style, children },
});

export const GET: APIRoute = async ({ props }) => {
  const { title, kicker, lede, meta } = props as Props;
  // satori 只在显式宽度下折行；标题按长度分档缩放，最长的标题（约 30 字）三行内放下
  const titleSize = lede ? 96 : title.length > 26 ? 52 : title.length > 16 ? 62 : 76;

  const svg = await satori(
    el(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        width: '1200px',
        height: '630px',
        // satori 默认按 content-box 处理，padding 会把根盒撑到画布外，必须显式 border-box
        boxSizing: 'border-box',
        padding: '64px 80px 56px',
        background: C.bg,
        color: C.text,
        fontFamily: 'Noto Sans SC',
      },
      [
        // 刊头：logo + 站名，右侧分类；下方 2px 粗线
        el(
          'div',
          {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 24,
            borderBottom: `2px solid ${C.text}`,
          },
          [
            el('div', { display: 'flex', alignItems: 'center', gap: 16 }, [
              { type: 'img', props: { src: logo, width: 44, height: 44, style: { borderRadius: 22 } } },
              el('div', { fontFamily: 'Noto Serif SC', fontWeight: 700, fontSize: 30 }, SITE.title),
            ]),
            el('div', { fontSize: 26, color: C.accent, letterSpacing: 2 }, kicker),
          ],
        ),
        // 标题
        el(
          'div',
          { display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, width: '1040px' },
          [
            el(
              'div',
              {
                display: 'flex',
                flexWrap: 'wrap',
                width: '1040px',
                fontFamily: 'Noto Serif SC',
                fontWeight: 700,
                fontSize: titleSize,
                lineHeight: 1.35,
              },
              title,
            ),
            ...(lede ? [el('div', { fontSize: 34, color: C.muted, marginTop: 20 }, lede)] : []),
          ],
        ),
        // 页脚：细线 + 元信息 + 域名
        el(
          'div',
          {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 24,
            borderTop: `1px solid ${C.border}`,
            fontSize: 24,
            color: C.muted,
            letterSpacing: 1,
          },
          [
            el('div', { display: 'flex', gap: 32 }, meta.map((m) => el('div', {}, m))),
            el('div', { color: C.accent }, new URL(SITE.url).host),
          ],
        ),
      ],
    ) as Parameters<typeof satori>[0],
    { width: 1200, height: 630, fonts },
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
