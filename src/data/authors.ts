import type { ImageMetadata } from 'astro';
import logo from '../assets/logo.jpg';

export const authors: Record<
  string,
  { name: string; avatar?: ImageMetadata; description?: string }
> = {
  gytxtx: {
    name: 'KFACBT',
    description: 'Anyway, keep learning.',
    // 与 GitHub 头像同图，用本地副本：避免外链（国内可能加载不出来）并由 astro:assets 缩放
    avatar: logo,
  },
  'mkdocs-material': {
    name: 'Material for MkDocs',
    description: 'The Material Team.',
  },
};
