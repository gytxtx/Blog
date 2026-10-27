import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildToc } from '../src/lib/toc.ts';

const heading = (depth, slug) => ({ depth, slug, text: slug });
test('目录将子章节归入最近的主章节，不添加或丢失链接', () => {
  const items = buildToc([heading(1, 'title'), heading(2, 'a'), heading(3, 'a1'), heading(4, 'skip'), heading(3, 'a2'), heading(2, 'b')]);
  assert.deepEqual(items.map(({ heading, children }) => [heading.slug, children.map((h) => h.slug)]), [['a', ['a1', 'a2']], ['b', []]]);
});
test('只有三级标题或开头没有父章节时，目录仍可导航', () => {
  const items = buildToc([heading(3, 'orphan'), heading(2, 'a'), heading(3, 'a1')]);
  assert.deepEqual(items.map(({ heading, children }) => [heading.slug, children.length]), [['orphan', 0], ['a', 1]]);
  assert.equal(buildToc([heading(3, 'x'), heading(3, 'y')]).length, 2);
});
