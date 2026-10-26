import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkDirective from 'remark-directive';
import remarkNoLegacyIcons from '../src/lib/remark-no-legacy-icons.mjs';

const renderer = await createMarkdownProcessor({ syntaxHighlight: false, remarkPlugins: [remarkDirective, remarkNoLegacyIcons] });
test('旧主题图标不能再次进入正文或标题，但代码示例仍可展示', async (t) => {
  t.mock.method(console, 'error', () => {});
  for (const source of ['## 感谢 :simple-materialformkdocs: Material', '- :material-book: 技术']) {
    await assert.rejects(renderer.render(source), /旧主题图标标记/);
  }
  await assert.doesNotReject(renderer.render('` :material-book: `\n\n```md\n:material-book:\n```'));
});
