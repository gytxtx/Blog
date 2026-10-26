import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onPageLoad } from '../src/lib/page-lifecycle.ts';

test('首次挂载、重复加载和换页只清理当前实例一次，并挂载当前文档', (t) => {
  const previous = globalThis.document;
  const events = new EventTarget();
  globalThis.document = events;
  t.after(() => { globalThis.document = previous; });
  const log = [];
  let instance = 0;
  onPageLoad(root => {
    const id = ++instance;
    log.push(['mount', id, root]);
    return () => log.push(['cleanup', id]);
  });
  events.dispatchEvent(new Event('astro:page-load'));
  events.dispatchEvent(new Event('astro:page-load'));
  events.dispatchEvent(new Event('astro:before-swap'));
  events.dispatchEvent(new Event('astro:before-swap'));
  const nextDocument = {};
  globalThis.document = nextDocument;
  events.dispatchEvent(new Event('astro:page-load'));
  assert.deepEqual(log, [
    ['mount', 1, events], ['cleanup', 1], ['mount', 2, events], ['cleanup', 2], ['mount', 3, nextDocument],
  ]);
});

test('目标页面没有功能节点时，空挂载不会重复清理上一页', (t) => {
  const previous = globalThis.document;
  const events = new EventTarget();
  globalThis.document = events;
  t.after(() => { globalThis.document = previous; });
  let mounts = 0;
  let cleanups = 0;
  onPageLoad(() => ++mounts === 1 ? () => cleanups++ : undefined);
  events.dispatchEvent(new Event('astro:page-load'));
  events.dispatchEvent(new Event('astro:page-load'));
  events.dispatchEvent(new Event('astro:before-swap'));
  assert.equal(mounts, 2);
  assert.equal(cleanups, 1);
});
