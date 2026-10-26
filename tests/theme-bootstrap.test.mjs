import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { themeBootstrapScript } from '../src/lib/theme-bootstrap.ts';
import { THEMES } from '../src/lib/theme.ts';

function documentStub() {
  const doc = new EventTarget();
  doc.documentElement = { dataset: {} };
  doc.querySelector = () => ({ setAttribute: (_, value) => { doc.color = value; } });
  return doc;
}

function setup({ saved = null, dark = false, blocked = false } = {}) {
  const document = documentStub();
  const system = Object.assign(new EventTarget(), { matches: dark });
  const window = { matchMedia: () => system };
  const context = { document, window, CustomEvent, localStorage: {
    getItem() { if (blocked) throw Error('blocked'); return saved; },
    setItem(_, value) { if (blocked) throw Error('blocked'); saved = value; },
  } };
  const run = () => runInNewContext(themeBootstrapScript(), context);
  run();
  return { document, system, window, run };
}

test('经典内联脚本在执行时立即应用有效偏好，缺失或非法偏好回退系统主题', () => {
  for (const [options, mode, theme] of [
    [{ saved: 'dark' }, 'dark', 'dark'],
    [{ saved: 'light', dark: true }, 'light', 'light'],
    [{ saved: 'invalid', dark: true }, 'auto', 'dark'],
    [{ blocked: true }, 'auto', 'light'],
  ]) {
    const { document } = setup(options);
    assert.deepEqual(document.documentElement.dataset, { mode, theme: THEMES[theme].name });
    assert.equal(document.color, THEMES[theme].colors.bg);
  }
});

test('禁用存储时仍保留内存状态，换页提前应用主题，重复引导不重复注册系统监听', () => {
  const { document, window, system, run } = setup({ blocked: true });
  let changes = 0;
  document.addEventListener('themechange', () => changes++);
  window.__setTheme('dark');
  const next = documentStub();
  document.dispatchEvent(Object.assign(new Event('astro:before-swap'), { newDocument: next }));
  assert.equal(next.documentElement.dataset.mode, 'dark');
  assert.equal(next.color, THEMES.dark.colors.bg);
  run();
  assert.equal(document.documentElement.dataset.mode, 'dark');
  window.__setTheme('invalid');
  assert.equal(changes, 1);
  window.__setTheme('auto');
  system.matches = true;
  system.dispatchEvent(new Event('change'));
  assert.equal(changes, 3);
  assert.equal(document.documentElement.dataset.theme, THEMES.dark.name);
  window.__setTheme('light');
  system.dispatchEvent(new Event('change'));
  assert.equal(changes, 4);
  assert.equal(document.documentElement.dataset.theme, THEMES.light.name);
});
