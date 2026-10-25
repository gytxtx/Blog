import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/blog',
    // id 取相对路径去掉 .md 与末尾的 index，目录式文章与平铺文件统一
    generateId: ({ entry }) =>
      entry.replace(/\.md$/, '').replace(/(^|\/)index$/, '$1'),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    slug: z.string(),
    description: z.string().optional(),
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
