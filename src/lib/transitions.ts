import type { TransitionDirectionalAnimations } from 'astro';
import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';

/**
 * 站内跳转的整页过渡写在 global.css（::view-transition-*(root)），按 ClientRouter 打在 <html> 上的
 * data-astro-transition 区分前进/后退，主题切换的 startViewTransition 不会套上跳转动画。
 *
 * 列表标题 → 文章页大标题的共享元素过渡名；slug 是 ASCII，直接可用作 CSS 标识符。
 * 同一页里过渡名必须唯一，否则整次过渡会被浏览器放弃：所以只用在 PostCard 和文章 h1，
 * 不用在 PostList（标签页里同一篇文章会出现在多个标签下）。
 */
export const titleTransitionName = (slug: string) => `post-title-${slug}`;

/**
 * 标题变形：浏览器默认只在两张原尺寸截图之间淡变，小字淡出、大字淡入，看起来是两层字叠着换。
 * 改成按字号比例缩放截图（global.css 的 vt-title-grow-*，比例在 --vt-title-scale），
 * 两张图任何时刻视觉字号一致，像同一行字在连续变大或变小。
 * 截图被放大会糊，所以交叉淡变（vt-title-fade-*）要让被缩小、清晰的那张撑满全程：
 * 变大时（列表 → 文章）一开始就交给新图；排版一致的变小时（文章 → 列表）旧图撑到最后 80ms 才交给新图，
 * 早交接会剩一张放大的新图慢慢缩回原尺寸，整个收尾都是糊的，最后一刻才突然对上焦。
 * 旧图缩到终点后和原生小字几乎一样（前提是 --vt-title-dy 把两者文字中心对齐），晚交接看不出换图。
 * 位图无法重新换行，两端行数或按字号缩放后的行宽不一致时，两个方向都在前 100ms 内交接。
 * 交接时刻和时长在 --vt-title-fade-*，由 setTitleScale 按排版和方向设置。
 * Astro 把多段动画拼成逗号分隔的长属性，各段属性要写全，否则短的那列会循环错位
 */
const MORPH = { duration: '320ms', easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', delay: '0ms', fillMode: 'both' };
const FADE = {
  duration: 'var(--vt-title-fade-duration, 100ms)',
  easing: 'ease',
  delay: 'var(--vt-title-fade-delay, 0ms)',
  fillMode: 'both',
};
const titleMorphPair = {
  old: [
    { name: 'vt-title-grow-old', ...MORPH },
    { name: 'vt-title-fade-out', ...FADE },
  ],
  new: [
    { name: 'vt-title-grow-new', ...MORPH },
    { name: 'vt-title-fade-in', ...FADE },
  ],
};
export const titleMorph: TransitionDirectionalAnimations = { forwards: titleMorphPair, backwards: titleMorphPair };

const LIST_TITLES = '.entry h2[data-astro-transition-scope]';
const POST_TITLE = '.post-header h1[data-astro-transition-scope]';
const TITLES = `${LIST_TITLES}, ${POST_TITLE}`;
let titleMorphEnabled = true;

/** 仅列表与文章互跳时配对标题；列表刷新、列表互跳和其他页面跳转都跟随整页动画。 */
export function prepareTitleTransition(event: Event) {
  const preparation = event as TransitionBeforePreparationEvent;
  const loader = preparation.loader;
  // after-preparation 不携带新文档；loader 完成时新文档已可读，旧图尚未截图。
  preparation.loader = async () => {
    await loader.call(preparation);
    if (preparation.signal.aborted || preparation.defaultPrevented) return;
    const { newDocument } = preparation;
    titleMorphEnabled = Boolean(
      (document.querySelector(LIST_TITLES) && newDocument.querySelector(POST_TITLE)) ||
      (document.querySelector(POST_TITLE) && newDocument.querySelector(LIST_TITLES)),
    );
  };
}

/**
 * 只有两端都在视口里时标题才变形：在屏幕外的那一端摘掉过渡名，让它跟着整页淡出/淡入，
 * 免得标题从屏幕外飞进来（文章底部点后退）或飞出去（文章页点「首页」，那篇不在首屏）。
 * 旧页在截图前、新页在换完 DOM 并恢复滚动后各调用一次。
 */
export function dropOffscreenTitles() {
  // 模态框后的标题即使在视口内也不可见，不能提升到过渡顶层。
  const modalOpen = !!document.querySelector('dialog:modal');
  for (const el of document.querySelectorAll<HTMLElement>(TITLES)) {
    const { top, bottom } = el.getBoundingClientRect();
    el.style.viewTransitionName = !titleMorphEnabled || modalOpen || bottom <= 0 || top >= innerHeight ? 'none' : '';
  }
}

type TitleBox = { size: number; mid: number; lineWidths: number[] };
const oldTitles = new Map<string, TitleBox>();

/** 视口内带过渡名的标题：字号、第一行文字中心的竖直偏移，以及各行实际文字宽度 */
const titleBoxes = () =>
  [...document.querySelectorAll<HTMLElement>(TITLES)].flatMap((el) => {
    const cs = getComputedStyle(el);
    if (cs.viewTransitionName === 'none') return [];
    const lines: { top: number; bottom: number; left: number; right: number }[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    // 按文本节点测量，避免 h2 内的链接盒子混入矩形，或把多行文本当成一整行。
    while (walker.nextNode()) {
      range.selectNodeContents(walker.currentNode);
      for (const rect of range.getClientRects()) {
        if (!rect.width || !rect.height) continue;
        const line = lines.find((line) => Math.abs(line.top - rect.top) < 1);
        if (line) {
          line.bottom = Math.max(line.bottom, rect.bottom);
          line.left = Math.min(line.left, rect.left);
          line.right = Math.max(line.right, rect.right);
        } else {
          lines.push({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
        }
      }
    }
    lines.sort((a, b) => a.top - b.top);
    const line = lines[0];
    const mid = line ? (line.top + line.bottom) / 2 - el.getBoundingClientRect().top : 0;
    const lineWidths = lines.map((line) => line.right - line.left);
    return [[cs.viewTransitionName, { size: parseFloat(cs.fontSize), mid, lineWidths }] as const];
  });

/** 旧页截图前记下标题字号和文字位置（在 dropOffscreenTitles 之后调用） */
export function recordTitleSizes() {
  oldTitles.clear();
  for (const [name, box] of titleBoxes()) oldTitles.set(name, box);
}

/**
 * 新页换完 DOM 后，按配上对的那个标题算出新旧字号比和淡变交接时刻，供 vt-title-* 使用。
 * 大标题和列表标题行高比例不同，从左上角等比缩放后文字中心会差一两像素，交接时字发虚；
 * --vt-title-dy 是把旧图文字中心对到新图上要补的竖直位移
 */
export function setTitleScale() {
  const pair = titleBoxes().find(([name]) => oldTitles.has(name));
  const old = pair && oldTitles.get(pair[0])!;
  const scale = pair && old ? pair[1].size / old.size : 1;
  const dy = pair && old ? pair[1].mid - old.mid * scale : 0;
  const sameLines = pair && old && old.lineWidths.length > 0 &&
    old.lineWidths.length === pair[1].lineWidths.length &&
    old.lineWidths.every((width, i) => Math.abs(width * scale - pair[1].lineWidths[i]) <= 1);
  const root = document.documentElement.style;
  root.setProperty('--vt-title-scale', String(scale));
  root.setProperty('--vt-title-dy', `${dy}px`);
  // 只有排版一致的缩小过渡才延后交接；换行变化时尽早淡出错位的旧图。
  const lateHandoff = sameLines && scale < 1;
  root.setProperty('--vt-title-fade-delay', lateHandoff ? '240ms' : '0ms');
  root.setProperty('--vt-title-fade-duration', lateHandoff ? '80ms' : '100ms');
  oldTitles.clear();
}

const pageOf = (url: URL) => {
  const m = url.pathname.match(/^(.*\/)page\/(\d+)\/?$/);
  return m ? { base: m[1], n: Number(m[2]) } : { base: url.pathname, n: 1 };
};

/**
 * 同一列表内翻页（较新/较旧，浏览器前进后退也算）是同级切换，不是进出层级：
 * 把方向改成 page-next / page-prev，global.css 据此改成横向推移，而不是上浮/下落。
 */
export function markPageTurn(e: Event) {
  const ev = e as TransitionBeforePreparationEvent;
  const from = pageOf(ev.from);
  const to = pageOf(ev.to);
  if (from.base !== to.base || from.n === to.n) return;
  ev.direction = to.n > from.n ? 'page-next' : 'page-prev';
}
