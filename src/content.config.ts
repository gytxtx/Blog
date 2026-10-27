import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/blog',
    // id 取相对路径去掉 .md 与末尾的 index，目录式文章与平铺文件统一
    generateId: ({ entry }) =>
      entry.replace(/\.md$/, '').replace(/(^|\/)index$/, '$1'),
  }),
  // 前四个字段与官方 blog 模板一致；description 保持可选（缺省时取正文摘要），
  // 其余是从 Material 迁移来的扩展字段
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      pubDate: z.coerce.date(),
      // 保留旧站迁移字段；历史基线固定在 data/content-date-baselines.json，后续更新由 Git 判断。
      updatedDate: z.coerce.date().optional(),
      heroImage: z.optional(image()),
      slug: z.string(),
      authors: z.array(z.string()).default(['gytxtx']),
      categories: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
      readtime: z.number().optional(),
      draft: z.boolean().default(false),
      pin: z.boolean().default(false),
      comments: z.boolean().default(true),
    }),
});

export const collections = { blog };
