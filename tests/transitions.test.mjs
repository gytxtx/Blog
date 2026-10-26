import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareTitleTransition, dropOffscreenTitles } from '../src/lib/transitions.ts';

function page(kind) {
  const titles = kind === 'list' ? [title(), title()] : kind === 'post' ? [title()] : [];
  return {
    titles,
    querySelector(selector) {
      if (selector === 'dialog:modal') return null;
      if (kind === 'list' && selector === '[data-post-title="list"]') return titles[0];
      if (kind === 'post' && selector === '[data-post-title="post"]') return titles[0];
      return null;
    },
    querySelectorAll() { return titles; },
  };
}

function title() {
  return { style: { viewTransitionName: '' }, getBoundingClientRect: () => ({ top: 100, bottom: 140 }) };
}

function setup(t) {
  const previousDocument = globalThis.document;
  const previousHeight = globalThis.innerHeight;
  globalThis.innerHeight = 800;
  t.after(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousHeight === undefined) delete globalThis.innerHeight;
    else globalThis.innerHeight = previousHeight;
  });
}

async function navigate(from, to) {
  globalThis.document = from;
  const event = {
    newDocument: from,
    signal: new AbortController().signal,
    defaultPrevented: false,
    async loader() { await Promise.resolve(); this.newDocument = to; },
  };
  prepareTitleTransition(event);
  await event.loader();
  // 对应 after-preparation（旧图截图前）和 after-swap（恢复滚动后）的两个调用点。
  dropOffscreenTitles();
  globalThis.document = to;
  dropOffscreenTitles();
}

test('列表点击首页时，新旧所有标题均跟随整页动画', async (t) => {
  setup(t);
  const before = page('list');
  const after = page('list');
  await navigate(before, after);
  for (const el of [...before.titles, ...after.titles]) assert.equal(el.style.viewTransitionName, 'none');
});

test('首页刷新后再进文章并后退，会恢复共享标题；文章刷新则再次使用整页动画', async (t) => {
  setup(t);
  const list = page('list');
  await navigate(page('list'), list);
  const post = page('post');
  await navigate(list, post);
  for (const el of [...list.titles, ...post.titles]) assert.equal(el.style.viewTransitionName, '');
  await navigate(post, list);
  for (const el of [...post.titles, ...list.titles]) assert.equal(el.style.viewTransitionName, '');
  await navigate(list, post);
  const samePost = page('post');
  await navigate(post, samePost);
  for (const el of [...post.titles, ...samePost.titles]) assert.equal(el.style.viewTransitionName, 'none');
});

test('已取消的页面 loader 不覆盖当前标题过渡策略', async (t) => {
  setup(t);
  const list = page('list');
  const post = page('post');
  await navigate(list, post);
  const controller = new AbortController();
  const event = {
    newDocument: post,
    signal: controller.signal,
    defaultPrevented: false,
    async loader() { this.newDocument = page('post'); controller.abort(); },
  };
  prepareTitleTransition(event);
  await event.loader();
  dropOffscreenTitles();
  assert.equal(post.titles[0].style.viewTransitionName, '');
});
