// @ts-check
/** 内容日期依赖完整 Git 历史；Cloudflare 浅克隆在构建前补全，本地完整仓库无需联网。 */
import { execFileSync } from 'node:child_process';

const isShallow = () => execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim();

try {
  if (isShallow() === 'true') {
    console.log('[git-history] 检测到浅克隆，正在获取完整历史以计算内容更新时间。');
    execFileSync('git', ['fetch', '--unshallow', '--no-tags', 'origin'], {
      stdio: 'inherit', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
  }
  // 远程本身也可能是浅克隆，fetch 成功不一定代表历史已完整。
  if (isShallow() !== 'false') throw new Error('Git 历史仍不完整');
  console.log('[git-history] 完整 Git 历史已就绪。');
} catch {
  console.error('[git-history] 无法准备完整 Git 历史，已停止构建。请确认 Git 可用且 origin 提供完整历史并可访问。');
  process.exitCode = 1;
}
