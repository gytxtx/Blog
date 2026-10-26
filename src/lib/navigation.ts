import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';
import { dropOffscreenTitles, markPageTurn, prepareTitleTransition, recordTitleSizes, setTitleScale } from './transitions';
document.addEventListener('astro:before-preparation', markPageTurn);
document.addEventListener('astro:before-preparation', prepareTitleTransition);
document.addEventListener('astro:after-preparation', dropOffscreenTitles);
document.addEventListener('astro:after-preparation', recordTitleSizes);
document.addEventListener('astro:after-swap', dropOffscreenTitles);
document.addEventListener('astro:after-swap', setTitleScale);
// 普通 Markdown 的仓库卡片按需加载；自定义元素自动接管后续站内跳转的新实例。
document.addEventListener('astro:page-load', () => {
  if (document.querySelector('github-repo-card')) {
    void import('./github-repo-card-client');
  }
});

// ===== 站内跳转进度条 =====
// 200ms 内完成的跳转不显示，避免每次点链接都闪一下。
// 增长用缓出曲线配递减增量，先快后慢；到达 100% 后整体淡出。
const PROGRESS_DELAY = 200;
const PROGRESS_STEPS = [12, 26, 42, 58, 71, 81, 88, 92];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const progressBar = () => document.querySelector<HTMLElement>('.nav-progress');
const progressDuration = (ms: number) => (reducedMotion.matches ? 0 : ms);
// getComputedStyle 将 CSS 时长（包括变量与 calc）统一序列化成秒。
const transitionTime = (el: HTMLElement) => parseFloat(getComputedStyle(el).transitionDuration) * 1000;
let progressTimers: number[] = [];
let progressVisible = false;
let progressSignal: AbortSignal | null = null;

const stopProgress = () => {
  progressTimers.forEach((t) => clearTimeout(t));
  progressTimers = [];
};
const resetProgress = (bar: HTMLElement) => {
  bar.classList.remove('is-done');
  bar.style.transition = 'none';
  bar.style.transform = 'scaleX(0)';
  bar.style.opacity = '0';
};
const setProgress = (bar: HTMLElement, value: number, duration: string) => {
  bar.style.transition = `transform ${reducedMotion.matches ? '0ms' : duration} var(--ease-progress), opacity ${reducedMotion.matches ? '0ms' : 'var(--motion-fast)'} linear`;
  bar.style.transform = `scaleX(${value / 100})`;
};

function startProgress(event: Event) {
  stopProgress();
  progressVisible = false;
  const bar = progressBar();
  if (bar) resetProgress(bar);
  const { signal } = event as TransitionBeforePreparationEvent;
  progressSignal = signal;
  // 页内锚点可取消正在加载的跳转，却不会触发 page-load；只复位属于这次导航的进度。
  const cancel = () => {
    if (progressSignal !== signal) return;
    progressSignal = null;
    stopProgress();
    progressVisible = false;
    const current = progressBar();
    if (current) resetProgress(current);
  };
  if (signal.aborted) return cancel();
  signal.addEventListener('abort', cancel, { once: true });
  progressTimers.push(
    window.setTimeout(() => {
      const el = progressBar();
      if (!el) return;
      progressVisible = true;
      el.style.opacity = '1';
      setProgress(el, PROGRESS_STEPS[0], 'var(--motion-page)');
      PROGRESS_STEPS.slice(1).forEach((value, i) => {
        progressTimers.push(
          window.setTimeout(
            () => {
              const current = progressBar();
              if (current) setProgress(current, value, `${260 + i * 90}ms`);
            },
            (i + 1) * 320,
          ),
        );
      });
    }, PROGRESS_DELAY),
  );
}

function finishProgress() {
  stopProgress();
  progressSignal = null;
  const bar = progressBar();
  if (!bar) return;
  if (!progressVisible) return resetProgress(bar);
  progressVisible = false;
  setProgress(bar, 100, 'var(--motion-fast)');
  progressTimers.push(
    window.setTimeout(() => {
      const el = progressBar();
      if (!el) return;
      el.classList.add('is-done');
      // 等 CSS 实际扫光完整播放，再淡出；时长调整和减少动效都跟随样式。
      const sweepTime = parseFloat(getComputedStyle(el, '::after').animationDuration) * 1000;
      progressTimers.push(
        window.setTimeout(() => {
          el.style.transition = `opacity ${reducedMotion.matches ? '0ms' : 'var(--motion-enter)'} linear`;
          el.style.opacity = '0';
          progressTimers.push(window.setTimeout(() => resetProgress(el), progressDuration(transitionTime(el))));
        }, progressDuration(sweepTime)),
      );
    }, progressDuration(transitionTime(bar))),
  );
}

document.addEventListener('astro:before-preparation', startProgress);
document.addEventListener('astro:page-load', finishProgress);
