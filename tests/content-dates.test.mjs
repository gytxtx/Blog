import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createContentDates } from '../src/lib/content-dates.mjs';
import { formatContentDate, shouldShowUpdated } from '../src/lib/content-date-display.mjs';

const POST = 'src/content/blog/post.md';
const URL = '/article/2025/03/example/';
const BASELINE = '2025-08-23';
const IMPORT = '2026-10-25T23:11:27+08:00';
const CHANGE = '2026-10-26T23:30:00+08:00';
const LATER = '2026-10-27T01:00:00+08:00';
const iso = (value) => new Date(value).toISOString();
const post = (body = '# 正文', extra = '', date = 'pubDate: 2025-03-29') =>
  `---\ntitle: 测试\n${date}\nslug: example\n${extra}---\n${body}\n`;

function fixture(t, files = { [POST]: post() }) {
  const root = mkdtempSync(path.join(tmpdir(), 'blog-content-dates-'));
  t.after(() => {
    assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir()) + path.sep + 'blog-content-dates-'));
    rmSync(root, { recursive: true, force: true });
  });
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  const write = (file, value) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), value);
  };
  git('init', '-b', 'main');
  git('config', 'user.name', 'Content date tests');
  git('config', 'user.email', 'content-dates@example.test');
  git('config', 'core.autocrlf', 'false');
  git('config', 'core.hooksPath', path.join(root, '.no-hooks'));
  for (const [file, value] of Object.entries(files)) write(file, value);
  const commit = (timestamp) => {
    git('add', '--all');
    execFileSync('git', ['-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture'], {
      cwd: root, env: { ...process.env, GIT_AUTHOR_DATE: timestamp, GIT_COMMITTER_DATE: timestamp },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  };
  commit(IMPORT);
  const dates = createContentDates(root, { baselines: { [POST]: BASELINE } });
  return { root, git, write, commit, dates, get: (url = URL) => dates.all().get(url) };
}

test('初次导入不更新；旧 date → pubDate、换行符与日期维护不污染历史基线', (t) => {
  const f = fixture(t, { [POST]: post('# 正文', '', 'date: 2025-03-29') });
  f.write(POST, post('# 正文', `updatedDate: ${BASELINE}\n`));
  f.commit(CHANGE);
  assert.equal(f.get().modified.toISOString(), iso(BASELINE));
  f.write(POST, post('# 正文', 'updatedDate: 2030-01-01\n').replaceAll('\n', '\r\n'));
  f.commit(LATER);
  assert.equal(f.get().modified.toISOString(), iso(BASELINE));
  assert.equal(f.get().created.toISOString(), iso('2025-03-29'));
});

test('正文、读者可见元数据推进日期，发布控制与共享样式/作者资料不推进', (t) => {
  const f = fixture(t);
  f.write(POST, post('# 正文', 'tags: [Astro]\n'));
  f.commit(CHANGE);
  assert.equal(f.get().modified.toISOString(), iso(CHANGE));
  f.write(POST, post('# 修正错字', 'tags: [Astro]\n'));
  f.commit(LATER);
  assert.equal(f.get().modified.toISOString(), iso(LATER));
  f.write(POST, post('# 修正错字', 'tags: [Astro]\ndraft: true\npin: true\ncomments: false\n'));
  f.write('src/styles/global.css', 'body { color: red }');
  f.write('src/data/authors.ts', 'export const authors = { name: "另一个名字" };');
  f.write('src/assets/logo.jpg', 'new shared avatar');
  f.commit('2026-10-28T12:00:00+08:00');
  assert.equal(f.get().modified.toISOString(), iso(LATER));
});

test('源文件移动与 slug 调整沿用原历史；首次提交没有历史更新日期的文章不显示更新', (t) => {
  const f = fixture(t);
  const dates = createContentDates(f.root, { baselines: {} });
  assert.equal(dates.all().get(URL).updated, undefined);
  renameSync(path.join(f.root, POST), path.join(f.root, 'src/content/blog/renamed.md'));
  f.write('src/content/blog/renamed.md', post().replace('slug: example', 'slug: renamed'));
  f.commit(CHANGE);
  const result = dates.all().get('/article/2025/03/renamed/');
  assert.equal(result.updated, undefined);
  assert.equal(result.modified.toISOString(), iso('2025-03-29'));
});

test('仅直接引用的本地图片变更推进日期，远程图片与代码示例不产生资源依赖', (t) => {
  const image = 'src/content/blog/image.png';
  const f = fixture(t, {
    [POST]: post('![图片](./image.png)\n![远程](https://example.com/remote.png)\n```md\n![示例](./example.png)\n```'),
    [image]: 'image v1',
  });
  f.write('src/content/blog/example.png', 'code example only');
  f.write('src/content/blog/unrelated.png', 'unrelated image');
  f.commit(CHANGE);
  assert.equal(f.get().modified.toISOString(), iso(BASELINE));
  f.write(image, 'image v2');
  f.commit(LATER);
  assert.equal(f.get().modified.toISOString(), iso(LATER));
});

test('题图、引用式图片及 public 图片都追踪已提交的资源内容', (t) => {
  const f = fixture(t, {
    [POST]: post('![引用][picture]\n\n[picture]: /img/picture.png', 'heroImage: ./hero.png\n'),
    'public/img/picture.png': 'reference v1',
    'src/content/blog/hero.png': 'hero v1',
  });
  f.write('src/content/blog/hero.png', 'hero v2');
  f.commit(CHANGE);
  assert.equal(f.get().modified.toISOString(), iso(CHANGE));
  f.write('public/img/picture.png', 'reference v2');
  f.commit(LATER);
  assert.equal(f.get().modified.toISOString(), iso(LATER));
});

test('顶层页追踪旧路径；友链数据变化触发更新，CSS、TS 注释与格式不触发', (t) => {
  const linkPage = `---\nimport Prose from '../layouts/Prose.astro';\n---\n<Prose><h1>友链</h1><p class="note">欢迎</p></Prose>\n<style>.note { color: red }</style>`;
  const friends = 'export const friends = [{ name: "朋友", url: "https://example.com", avatar: "https://example.com/avatar.jpg" }];';
  const f = fixture(t, {
    'src/pages/blog/about.md': '---\ntitle: 关于\nlayout: old\n---\n# 关于\n简介',
    'src/pages/links.astro': linkPage,
    'src/data/friends.ts': friends,
  });
  assert.equal(f.get('/about/').updated, undefined);
  assert.equal(f.get('/links/').updated, undefined);
  mkdirSync(path.join(f.root, 'src/pages'), { recursive: true });
  renameSync(path.join(f.root, 'src/pages/blog/about.md'), path.join(f.root, 'src/pages/about.md'));
  f.write('src/pages/about.md', '---\ntitle: 关于\nlayout: new\n---\n# 关于\n简介');
  f.write('src/pages/links.astro', linkPage.replace('class="note"', 'class="new-note"').replace('color: red', 'color: blue'));
  f.write('src/data/friends.ts', `// 注释\n${friends.replace('{ name:', '{\n name:')}`);
  f.commit(CHANGE);
  assert.equal(f.get('/about/').updated, undefined);
  assert.equal(f.get('/links/').updated, undefined);
  f.write('src/data/friends.ts', friends.replace('朋友', '新朋友'));
  f.write('src/pages/about.md', '---\ntitle: 关于\nlayout: new\n---\n# 关于\n新增简介');
  f.commit(LATER);
  assert.equal(f.get('/links/').modified.toISOString(), iso(LATER));
  assert.equal(f.get('/about/').modified.toISOString(), iso(LATER));
});

test('友链从旧 Markdown 拆分为 Astro 与数据文件仍保留初次入库基线', (t) => {
  const f = fixture(t, { 'src/pages/blog/links.md': '---\ntitle: 友链\n---\n# 友链\n旧列表' });
  f.git('rm', 'src/pages/blog/links.md');
  f.write('src/pages/links.astro', '---\nimport Prose from "../layouts/Prose.astro";\n---\n<Prose><h1>友链</h1><p>卡片及头像</p></Prose>');
  f.write('src/data/friends.ts', 'export const friends = [{ name: "朋友", url: "https://example.com" }];');
  f.commit(CHANGE);
  assert.equal(f.get('/links/').created.toISOString(), iso(IMPORT));
  assert.equal(f.get('/links/').updated.toISOString(), iso(CHANGE));
});

test('工作区正文、图片、日期不影响结果，尚未提交的新文章没有更新记录', (t) => {
  const f = fixture(t, {
    [POST]: post('![图片](./image.png)'),
    'src/content/blog/image.png': 'committed image',
  });
  f.write('src/content/blog/image.png', 'uncommitted image');
  f.write(POST, post('尚未提交的正文', 'updatedDate: 2030-01-01\n'));
  f.write('src/content/blog/new.md', post('新文', 'updatedDate: 2030-01-01\n').replace('slug: example', 'slug: new'));
  assert.equal(f.get().modified.toISOString(), iso(BASELINE));
  const added = f.get('/article/2025/03/new/');
  assert.equal(added.updated, undefined);
  assert.equal(added.modified.toISOString(), iso('2025-03-29'));
});

test('无 Git 时警告一次并回退历史基线；顶层无可信日期则不编造日期', (t) => {
  const f = fixture(t);
  f.git('worktree', 'add', '--detach', path.join(f.root, 'worktree'), 'HEAD');
  const worktreeDates = createContentDates(path.join(f.root, 'worktree'), { baselines: { [POST]: BASELINE } });
  assert.ok(readFileSync(path.join(f.root, 'worktree/.git'), 'utf8').startsWith('gitdir:'));
  assert.equal(worktreeDates.all().get(URL).modified.toISOString(), iso(BASELINE));
  // 使用独立源码目录，不能误读父级 fixture 仓库。
  const noGitRoot = mkdtempSync(path.join(tmpdir(), 'blog-content-dates-'));
  t.after(() => {
    assert.ok(path.resolve(noGitRoot).startsWith(path.resolve(tmpdir()) + path.sep + 'blog-content-dates-'));
    rmSync(noGitRoot, { recursive: true, force: true });
  });
  mkdirSync(path.join(noGitRoot, 'src/content/blog'), { recursive: true });
  writeFileSync(path.join(noGitRoot, POST), post());
  const warnings = [];
  const dates = createContentDates(noGitRoot, { baselines: { [POST]: BASELINE }, warn: (message) => warnings.push(message) });
  assert.equal(dates.all().get(URL).modified.toISOString(), iso(BASELINE));
  assert.equal(dates.all().get('/about/').modified, undefined);
  assert.equal(warnings.length, 1);
});

test('浅克隆拒绝推断残缺历史，回退基线并提示获取完整历史', (t) => {
  const f = fixture(t);
  f.write(POST, post('最新正文'));
  f.commit(CHANGE);
  const destination = path.join(f.root, 'shallow');
  f.git('clone', '--depth', '1', pathToFileURL(f.root).href, destination);
  const warnings = [];
  const dates = createContentDates(destination, { baselines: { [POST]: BASELINE }, warn: (message) => warnings.push(message) });
  assert.equal(dates.all().get(URL).modified.toISOString(), iso(BASELINE));
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /fetch-depth: 0/);
});

test('合并提交按第一父链比较，以内容合入时间作为更新日期', (t) => {
  const f = fixture(t);
  f.git('checkout', '-b', 'content');
  f.write(POST, post('分支上的正文'));
  f.commit(CHANGE);
  f.git('checkout', 'main');
  execFileSync('git', ['-c', 'commit.gpgsign=false', 'merge', '--no-ff', '-m', 'merge content', 'content'], {
    cwd: f.root, env: { ...process.env, GIT_AUTHOR_DATE: LATER, GIT_COMMITTER_DATE: LATER }, stdio: ['pipe', 'pipe', 'pipe'],
  });
  assert.equal(f.get().modified.toISOString(), iso(LATER));
});

test('显示按 UTC+8 跨日，文章同日修改隐藏提示，SEO 日期仍可保留完整时间', () => {
  const published = new Date('2026-10-26T00:00:00Z');
  const sameDay = new Date('2026-10-26T15:59:59Z');
  const nextDay = new Date('2026-10-26T16:00:00Z');
  assert.equal(shouldShowUpdated(published, sameDay), false);
  assert.equal(shouldShowUpdated(published, nextDay), true);
  assert.equal(shouldShowUpdated(published, undefined), false);
  assert.equal(shouldShowUpdated(published, new Date('2026-10-25')), false);
  assert.equal(formatContentDate(nextDay), '2026年10月27日');
  assert.equal(formatContentDate(nextDay, false), '10月27日');
  assert.equal(sameDay.toISOString(), '2026-10-26T15:59:59.000Z');
});
