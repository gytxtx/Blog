import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categorySlug, groupPostsByYear, groupPostsByCategory, groupPostsByTag } from '../src/lib/post-groups.ts';

const post = (id, date, categories = [], tags = []) => ({ id, data: { pubDate: new Date(date), categories, tags } });

test('归档按 UTC 年份倒序，组内保留输入顺序且不修改输入', () => {
  const a = post('a', '2026-01-01T00:30:00+08:00');
  const b = post('b', '2026-08-01Z');
  const c = post('c', '2025-07-01Z');
  const posts = Object.freeze([a, b, c]);
  assert.deepEqual(groupPostsByYear(posts).map(({ year, posts }) => [year, posts.map(p => p.id)]), [[2026, ['b']], [2025, ['a', 'c']]]);
  assert.deepEqual(posts, [a, b, c]);
  assert.deepEqual(groupPostsByYear([]), []);
});

test('分类沿用首次显示名与小写地址，同一篇可属于多个分类', () => {
  const a = post('a', '2026-01-01Z', ['GitHub', '技术']);
  const b = post('b', '2025-01-01Z', ['github']);
  assert.deepEqual(groupPostsByCategory([a, b]), [
    { slug: 'github', display: 'GitHub', posts: [a, b] },
    { slug: '技术', display: '技术', posts: [a] },
  ]);
  assert.equal(categorySlug('技术 GitHub'), '技术 github');
  assert.deepEqual(groupPostsByCategory([]), []);
});

test('标签按数量和名称排序，保留大小写与文章顺序', () => {
  const a = post('a', '2026-01-01Z', [], ['b', 'a', 'A']);
  const b = post('b', '2025-01-01Z', [], ['b']);
  const groups = groupPostsByTag([a, b]);
  assert.equal(groups[0][0], 'b');
  assert.deepEqual(groups[0][1], [a, b]);
  assert.deepEqual(groups.slice(1).map(([tag]) => tag), ['A', 'a'].sort((a, b) => a.localeCompare(b)));
  assert.deepEqual(groupPostsByTag([]), []);
});
