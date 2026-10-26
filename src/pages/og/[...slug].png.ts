import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { getPosts, postOgPath, formatDate } from '../../lib/posts';
import { SITE } from '../../consts';

// 字体为 GB2312 全集子集（scripts/subset-font.mjs 预生成并入库），构建期零网络依赖。
// 预渲染在项目根目录下执行，用 cwd 定位源文件（import.meta.url 会被打包重定向到 dist）。
const fontDir = path.join(process.cwd(), 'src', 'assets', 'fonts');
const fontRegular = await readFile(path.join(fontDir, 'NotoSansSC-Regular-subset.otf'));
const fontBold = await readFile(path.join(fontDir, 'NotoSansSC-Bold-subset.otf'));

const fonts = [
  { name: 'Noto Sans SC', data: fontRegular, weight: 400 as const, style: 'normal' as const },
  { name: 'Noto Sans SC', data: fontBold, weight: 700 as const, style: 'normal' as const },
];

export async function getStaticPaths() {
  const posts = await getPosts();
  return [
    { params: { slug: 'default' }, props: { title: SITE.title, subtitle: SITE.description, date: '' } },
    ...posts.map((post) => ({
      params: { slug: postOgPath(post) },
      props: { title: post.data.title, subtitle: SITE.title, date: formatDate(post.data.pubDate) },
    })),
  ];
}

export const GET: APIRoute = async ({ props }) => {
  const { title, subtitle, date } = props as { title: string; subtitle: string; date: string };
  // satori 只在显式宽度下折行；标题按长度分档缩放
  const titleSize = title.length > 30 ? 44 : title.length > 18 ? 54 : 64;

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '1200px',
          height: '630px',
          // satori 默认按 content-box 处理，padding 会把根盒撑到画布外，必须显式 border-box
          boxSizing: 'border-box',
          paddingTop: 72,
          paddingBottom: 72,
          paddingLeft: 80,
          paddingRight: 80,
          background: 'linear-gradient(135deg, #0e1611 0%, #1c3524 100%)',
          color: '#ffffff',
          fontFamily: 'Noto Sans SC',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                width: '1040px',
                flex: 1,
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 30, color: '#8fd6a0', letterSpacing: 4, marginBottom: 28 },
                    children: subtitle,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexWrap: 'wrap',
                      width: '1040px',
                      fontSize: titleSize,
                      fontWeight: 700,
                      lineHeight: 1.3,
                    },
                    children: title,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 26,
                color: '#a8c5b2',
              },
              children: [
                { type: 'div', props: { children: date } },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      color: '#8fd6a0',
                    },
                    children: 'blog-gytxtx.pages.dev',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    { width: 1200, height: 630, fonts },
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
