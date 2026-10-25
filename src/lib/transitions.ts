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
 * 变大时（列表 → 文章）一开始就交给新图；变小时（文章 → 列表）旧图撑到最后 80ms 才交给新图，
 * 早交接会剩一张放大的新图慢慢缩回原尺寸，整个收尾都是糊的，最后一刻才突然对上焦。
 * 旧图缩到终点后和原生小字几乎一样（前提是 --vt-title-dy 把两者文字中心对齐），晚交接看不出换图。
 * 交接时刻和时长在 --vt-title-fade-*，由 setTitleScale 按方向设置。
 * Astro 把多段动画拼成逗号分隔的长属性，各段属性要写全，否则短的那列会循环错位
 */
const MORPH = { duration: '320ms', easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', delay: '0ms', fillMode: 'both' };
const FADE = {
  duration: 'var(--vt-title-fade-duration, 112ms)',
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

const TITLES = '.entry h2[data-astro-transition-scope], .post-header h1[data-astro-transition-scope]';

/**
 * 只有两端都在视口里时标题才变形：在屏幕外的那一端摘掉过渡名，让它跟着整页淡出/淡入，
 * 免得标题从屏幕外飞进来（文章底部点后退）或飞出去（文章页点「首页」，那篇不在首屏）。
 * 旧页在截图前、新页在换完 DOM 并恢复滚动后各调用一次。
 */
export function dropOffscreenTitles() {
  for (const el of document.querySelectorAll<HTMLElement>(TITLES)) {
    const { top, bottom } = el.getBoundingClientRect();
    el.style.viewTransitionName = bottom <= 0 || top >= innerHeight ? 'none' : '';
  }
}

type TitleBox = { size: number; mid: number };
const oldTitles = new Map<string, TitleBox>();

/** 视口内带过渡名的标题：字号，和第一行文字竖直中心离盒子顶端多远 */
const titleBoxes = () =>
  [...document.querySelectorAll<HTMLElement>(TITLES)].flatMap((el) => {
    const cs = getComputedStyle(el);
    if (cs.viewTransitionName === 'none') return [];
    const range = document.createRange();
    range.selectNodeContents(el);
    const line = range.getClientRects()[0];
    const mid = line ? (line.top + line.bottom) / 2 - el.getBoundingClientRect().top : 0;
    return [[cs.viewTransitionName, { size: parseFloat(cs.fontSize), mid }] as const];
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
  const root = document.documentElement.style;
  root.setProperty('--vt-title-scale', String(scale));
  root.setProperty('--vt-title-dy', `${dy}px`);
  // 320ms 的变形：变大在 0–112ms 交接；变小在 240–320ms 交接，新图此时只比原尺寸大 1% 左右
  root.setProperty('--vt-title-fade-delay', scale < 1 ? '240ms' : '0ms');
  root.setProperty('--vt-title-fade-duration', scale < 1 ? '80ms' : '112ms');
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
