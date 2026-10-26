import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkBreaks from 'remark-breaks';
import remarkDirective from 'remark-directive';
import { parseGitHubRepo, renderGitHubRepoCard } from '../src/lib/github-repo-card.mjs';
import remarkGitHubRepoCard from '../src/lib/remark-github-repo-card.mjs';
import remarkReadingStats from '../src/lib/remark-reading-stats.mjs';

const renderer = await createMarkdownProcessor({
  syntaxHighlight: false,
  smartypants: false,
  remarkPlugins: [remarkDirective, remarkBreaks, remarkReadingStats,
    remarkGitHubRepoCard],
});

test('仓库解析限制目标站点，拒绝子页面、注入和路径穿越', () => {
  assert.deepEqual(parseGitHubRepo('https://github.com/gytxtx/OpenJBD/'), parseGitHubRepo('gytxtx/OpenJBD'));
  for (const value of [
    'https://github.com.evil.example/owner/repo', 'https://user@github.com/owner/repo',
    'https://github.com/owner/repo/issues', 'https://github.com/owner/repo?tab=readme',
    'javascript:alert(1)', 'owner/..', 'owner/repo" onclick="alert(1)',
  ]) assert.throws(() => parseGitHubRepo(value), undefined, value);
});

test('服务端输出保留可访问链接，对自定义简介转义，零统计仍有效', () => {
  const html = renderGitHubRepoCard({
    repo: 'gytxtx/OpenJBD', description: '<img src=x onerror="alert(1)"> & text',
    stars: 0, forks: 0, fetchMetadata: false,
  });
  assert.ok(html.includes('href="https://github.com/gytxtx/OpenJBD"'));
  assert.ok(html.includes('data-fetch="false"'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('&amp; text'));
  assert.ok(html.includes('data-metric="star" aria-label="0 个星标"'));
  assert.ok(html.includes('data-metric="fork" aria-label="0 个分支"'));
});

test('实际 Markdown 管线将独占一段的标记链接转为卡片', async () => {
  const result = await renderer.render('[gytxtx/OpenJBD](https://github.com/gytxtx/OpenJBD "github-card")');
  assert.ok(result.code.includes('<github-repo-card'));
  assert.ok(result.code.includes('data-repo="gytxtx/OpenJBD"'));
  assert.ok(!result.code.includes('data-custom-description'));
  assert.ok(!result.code.includes('<p><github-repo-card'));
  assert.ok(result.code.includes('data-metric="star" hidden'));
});

test('Markdown 链接文字可作为自定义简介', async () => {
  const result = await renderer.render('[Android 电池仪表板](https://github.com/gytxtx/OpenJBD "github-card")');
  assert.ok(result.code.includes('data-custom-description'));
  assert.ok(result.code.includes('Android 电池仪表板'));
});

test('普通链接、行内标记链接、代码示例不转换', async () => {
  for (const markdown of [
    '[gytxtx/OpenJBD](https://github.com/gytxtx/OpenJBD)',
    '请查看 [项目](https://github.com/gytxtx/OpenJBD "github-card") 的源码。',
    '```markdown\n[项目](https://github.com/gytxtx/OpenJBD "github-card")\n```',
  ]) {
    const result = await renderer.render(markdown);
    assert.ok(!result.code.includes('<github-repo-card'), markdown);
  }
});

test('错误标记链接给出明确的作者错误', async (t) => {
  t.mock.method(console, 'error', () => {});
  await assert.rejects(
    renderer.render('[repo](https://example.com/owner/repo "github-card")'), /GitHub 仓库首页/,
  );
});

test('仓库卡片组支持正整数列数、默认两列以及自定义简介', async () => {
  for (const columns of [undefined, 1, 2, 3, 4, 6]) {
    const attributes = columns === undefined ? '' : `{columns=${columns}}`;
    const result = await renderer.render(`:::github-cards${attributes}\n- [gytxtx/OpenJBD](https://github.com/gytxtx/OpenJBD)\n- [**桌面**交互工具](https://github.com/gytxtx/kagami-desktop)\n:::`);
    assert.ok(result.code.includes(`class="github-repo-cards" data-columns="${columns ?? 2}"`));
    assert.ok(result.code.includes(`--github-card-columns:${columns ?? 2}`));
    assert.equal((result.code.match(/<github-repo-card /g) ?? []).length, 2);
    assert.equal((result.code.match(/data-custom-description/g) ?? []).length, 1);
    assert.ok(result.code.includes('桌面交互工具'));
    assert.ok(!result.code.includes('<ul>'));
    assert.ok(!result.code.includes(':::'));
    assert.ok(result.code.includes('target="_blank" rel="noopener noreferrer"'));
  }
});

test('代码中的仓库卡片组不转换，原有行内链接仍不转换', async () => {
  const result = await renderer.render('```markdown\n:::github-cards{columns=2}\n- [gytxtx/OpenJBD](https://github.com/gytxtx/OpenJBD)\n:::\n```\n\n查看 [项目](https://github.com/gytxtx/OpenJBD "github-card")。');
  assert.ok(!result.code.includes('<github-repo-card'));
  assert.ok(!result.code.includes('class="github-repo-cards"'));
});

test('空组、错误列数、非仓库链接与多余内容给出作者错误', async (t) => {
  t.mock.method(console, 'error', () => {});
  const item = '- [gytxtx/OpenJBD](https://github.com/gytxtx/OpenJBD)';
  for (const value of ['0', '-1', '2.5', 'NaN', '', '2;display:none', '9007199254740992']) {
    await assert.rejects(renderer.render(`:::github-cards{columns="${value}"}\n${item}\n:::`), /columns.*正整数/);
  }
  for (const [body, error] of [
    ['', /至少需要/],
    ['普通文字', /独立的 GitHub 仓库链接/],
    ['- [站外](https://example.com/owner/repo)', /不是 GitHub 仓库首页/],
    ['- [子页面](https://github.com/gytxtx/OpenJBD/issues)', /仓库格式/],
    ['- [A](https://github.com/gytxtx/OpenJBD) 和 [B](https://github.com/gytxtx/kagami-desktop)', /独立的 GitHub 仓库链接/],
    [`${item}\n  - 嵌套`, /只能包含一个/],
    ['- [x] [gytxtx/OpenJBD](https://github.com/gytxtx/OpenJBD)', /只能包含一个/],
    ['1. [gytxtx/OpenJBD](https://github.com/gytxtx/OpenJBD)', /无序链接列表/],
  ]) {
    await assert.rejects(renderer.render(`:::github-cards\n${body}\n:::`), (failure) => {
      assert.match(failure.message, error);
      assert.ok(failure.line >= 1);
      return true;
    });
  }
  await assert.rejects(renderer.render(`:::github-cards{class=wide}\n${item}\n:::`), /仅支持 columns/);
});
