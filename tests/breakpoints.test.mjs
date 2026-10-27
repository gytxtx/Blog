import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { BREAKPOINTS } from '../src/lib/breakpoints.ts';

const root = path.resolve(import.meta.dirname, '..');
const TOKENS = path.join(root, 'src/styles/tokens.css');

/** @returns {string[]} */
function styleFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return styleFiles(full);
    return /\.(css|astro)$/.test(entry.name) ? [full] : [];
  });
}

const registry = [...readFileSync(TOKENS, 'utf8').matchAll(/--bp-([a-z-]+):\s*(\d+)px/g)]
  .map(([, name, px]) => [name, Number(px)]);

test('断点名册与脚本侧常量一一对应，改断点不再只改一半', () => {
  assert.deepEqual(Object.fromEntries(registry), BREAKPOINTS);
});

test('每个宽度媒体查询的字面值都在断点名册里', () => {
  const values = new Set(registry.map(([, px]) => px));
  /** @type {string[]} */
  const stray = [];
  for (const file of styleFiles(path.join(root, 'src'))) {
    const text = readFileSync(file, 'utf8');
    for (const [, side, px] of text.matchAll(/\((min|max)-width:\s*(\d+)px\)/g)) {
      if (!values.has(Number(px))) stray.push(`${path.relative(root, file)} (${side}-width: ${px}px)`);
    }
  }
  assert.deepEqual(stray, []);
});
