import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkBreaks from 'remark-breaks';
import { parseGitHubRepo, renderGitHubRepoCard } from '../src/lib/github-repo-card.mjs';
import remarkGitHubRepoCard from '../src/lib/remark-github-repo-card.mjs';
import remarkReadingStats from '../src/lib/remark-reading-stats.mjs';

const renderer = await createMarkdownProcessor({
  syntaxHighlight: false,
  smartypants: false,
  remarkPlugins: [remarkBreaks, remarkReadingStats, remarkGitHubRepoCard],
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
