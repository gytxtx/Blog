import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkDirective from 'remark-directive';
import remarkBreaks from 'remark-breaks';
import remarkContentCards from '../src/lib/remark-content-cards.mjs';
import remarkReadingStats from '../src/lib/remark-reading-stats.mjs';
import remarkGitHubRepoCard from '../src/lib/remark-github-repo-card.mjs';

const renderer = await createMarkdownProcessor({
  syntaxHighlight: false,
  smartypants: false,
  remarkPlugins: [remarkDirective, remarkBreaks, remarkReadingStats,
    [remarkContentCards, { site: 'https://blog.gytxtx.top' }], remarkGitHubRepoCard],
});
const group = (items, attributes = '') => `:::cards${attributes}\n${items}\n:::`;

test('约定语法输出静态图标、上方描述与下方主标题，整卡链接且不嵌套锚点', async () => {
  const { code } = await renderer.render(group('- :icon[lucide:book-open] [从这里开始了解博客](/about/)\n  阅读指南'));
  assert.match(code, /^<div class="content-cards" data-columns="2"><a class="content-card custom-card" href="\/about\/">/);
  assert.match(code, /<svg class="content-card__icon"[^>]+aria-hidden="true">/);
  assert.match(code, /<span class="content-card__description">从这里开始了解博客<\/span>/);
  assert.match(code, /<span class="content-card__title">阅读指南<\/span>/);
  assert.equal((code.match(/<a /g) ?? []).length, 1);
  assert.ok(!code.includes('target='));
  assert.ok(!code.includes(':::'));
});

test('1/2/3列、展示卡片、多个卡片组与基础 Markdown 排版', async () => {
  const markdown = [1, 2, 3].map((columns) => group(
    '- *上方*描述\n  **主标题**与 `code`\n\n- 普通描述\n  另一个主标题', `{columns=${columns}}`,
  )).join('\n\n');
  const { code } = await renderer.render(markdown);
  for (const columns of [1, 2, 3]) assert.ok(code.includes(`data-columns="${columns}"`));
  assert.equal((code.match(/class="content-card custom-card"/g) ?? []).length, 6);
  assert.match(code, /<em>上方<\/em>描述/);
  assert.match(code, /<strong>主标题<\/strong>与 <code>code<\/code>/);
  assert.ok(!code.includes('<a '));
});

test('同源绝对地址、相对地址及锚点当前页打开；外部和协议相对链接新标签页打开', async () => {
  for (const href of ['/about/', '../guide/', '#section', 'https://blog.gytxtx.top/about/']) {
    const { code } = await renderer.render(group(`- [描述](${href})\n  标题`));
    assert.ok(!code.includes('target='), href);
  }
  for (const href of ['https://docs.astro.build', '//example.com/path', 'mailto:hello@example.com', 'tel:+123456']) {
    const { code } = await renderer.render(group(`- [描述](${href})\n  标题`));
    assert.match(code, /target="_blank" rel="noopener noreferrer"/);
  }
});

test('标题中的链接与引用链接也作用于整卡，换行内容完整保留', async () => {
  const { code } = await renderer.render(`${group('- 顶部描述\n  [主标题][guide]\n  继续换行的文字')}\n\n[guide]: /about/`);
  assert.match(code, /class="content-card custom-card" href="\/about\/"/);
  assert.match(code, /content-card__title">主标题 继续换行的文字/);
});

test('转义卡片文字和 URL 属性，并拒绝危险协议', async (t) => {
  const { code } = await renderer.render(group('- [小于 & 大于](https://example.com/?a=1&b=2)\n  &lt;img onerror=&quot;bad&quot;&gt;'));
  assert.match(code, /href="https:\/\/example.com\/\?a=1&#x26;b=2"/);
  assert.ok(!code.includes('<img'));
  assert.ok(code.includes('小于 &#x26; 大于'));
  t.mock.method(console, 'error', () => {});
  for (const href of ['javascript:alert%281%29', 'data:text/html,bad', 'vbscript:bad']) {
    await assert.rejects(renderer.render(group(`- [描述](${href})\n  标题`)), /卡片链接仅支持/);
  }
});

test('正文、代码示例和已有 GitHub 卡片保持可用', async () => {
  const markdown = '普通 :icon[lucide:book-open] 与 node:fs。\n\n```md\n:::cards\n- 描述\n  标题\n:::\n```\n\n[项目](https://github.com/gytxtx/OpenJBD "github-card")';
  const { code } = await renderer.render(markdown);
  assert.ok(code.includes(':icon[lucide:book-open]'));
  assert.ok(code.includes('node:fs'));
  assert.ok(!code.includes('class="content-cards"'));
  assert.ok(code.includes('<github-repo-card'));
});

test('字数统计包含两处文字但不包含图标名称或容器属性', async () => {
  const result = await renderer.render(group('- :icon[lucide:book-open] 中文描述\n  主标题', '{columns=3}'));
  assert.equal(result.metadata.frontmatter.words, 7);
  const ordinary = await renderer.render('node:fs');
  assert.equal(ordinary.metadata.frontmatter.words, 2);
});

test('错误内容给出可定位的作者错误', async (t) => {
  t.mock.method(console, 'error', () => {});
  for (const [markdown, message] of [
    [group('- 描述\n  标题', '{columns=4}'), /columns/],
    [group('- 描述\n  标题', '{style=wide}'), /columns/],
    [group('没有列表'), /无序列表/],
    [group('- 只有一行'), /第一行为顶部描述/],
    [group('- :icon[lucide:not-a-real-icon] 描述\n  标题'), /未知 Lucide 图标/],
    [group('- [描述](/a/)\n  [标题](/b/)'), /只能包含一个链接/],
    [group('- 描述\n  标题\n  - 嵌套列表'), /嵌套块/],
    [group('- ![图片](/cover.png)\n  标题'), /仅支持文本/],
  ]) {
    await assert.rejects(renderer.render(markdown), (error) => {
      assert.match(error.message, message);
      assert.ok(error.line >= 1);
      return true;
    });
  }
});
