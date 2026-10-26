import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const source = stripTypeScriptTypes(readFileSync(new URL('../src/lib/github-repo-card-client.ts', import.meta.url), 'utf8'))
  .replace(/export\s*\{\s*\};?/, '');
const payload = { description: '项目', language: 'TypeScript', stargazers_count: 12, forks_count: 0 };

function client(fetch, timers = { setTimeout, clearTimeout }) {
  const context = vm.createContext({
    Intl, Map, Date, JSON, Number, AbortController, fetch,
    window: timers,
    sessionStorage: { getItem: () => null, setItem() {} },
    HTMLElement: class {},
    customElements: { get: () => true },
  });
  vm.runInContext(source, context);
  return vm.runInContext('getMetadata', context);
}

test('仓库请求失败后，新调用可以在网络恢复时重新获取', async () => {
  let calls = 0;
  const get = client(async () => ++calls === 1 ? { ok: false } : { ok: true, json: async () => payload });
  assert.equal(await get('gytxtx/example'), null);
  assert.equal((await get('gytxtx/example'))?.stars, 12);
  assert.equal(calls, 2);
});

test('同仓库的并发调用与成功结果仍去重，仓库大小写不影响缓存', async () => {
  let calls = 0;
  const get = client(async () => { calls++; return { ok: true, json: async () => payload }; });
  const values = await Promise.all([get('gytxtx/example'), get('GYTXTX/Example')]);
  assert.equal(values[0], values[1]);
  assert.equal((await get('gytxtx/example'))?.forks, 0);
  assert.equal(calls, 1);
});

test('超时会中断请求，失败结果不阻止后续恢复', async () => {
  let timeout;
  let calls = 0;
  const get = client(async (_url, { signal }) => {
    calls++;
    if (calls > 1) return { ok: true, json: async () => payload };
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
  }, { setTimeout: (callback) => { timeout = callback; return 1; }, clearTimeout() {} });
  const first = get('gytxtx/example');
  timeout();
  assert.equal(await first, null);
  assert.equal((await get('gytxtx/example'))?.stars, 12);
});
