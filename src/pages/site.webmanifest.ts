import type { APIRoute } from 'astro';
import { SITE } from '../consts';
import { THEMES } from '../lib/theme';

export const GET: APIRoute = () => new Response(JSON.stringify({
  name: SITE.title,
  short_name: SITE.shortName,
  description: SITE.description,
  lang: 'zh-CN',
  start_url: '/',
  display: 'minimal-ui',
  background_color: THEMES.light.colors.bg,
  theme_color: THEMES.light.colors.bg,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
}), { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } });
