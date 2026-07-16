// hero.ts — §5.2 Hero（PV 全幅）
//
// 佔位狀態（使用者指示，覆蓋 spec 佔位規則）：遊戲實錄尚不可用，
// 背景不放影片，改用靜態 poster（bg_battle_temple 轉檔）；<video> 結構照 spec 寫好、
// source 留 data-src 空掛＋data-placeholder 標記，日後補影片檔即生效（lazyVideo 接手）。
//
// 互動：pointermove ±8px 視差（lerp）、往下捲 scale 1→0.92（scrub）。
// PV／Demo 皆為外部連結（SharePoint），2026-07-17 起不再用站內 lightbox。

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../core/utils';
import { initSuminagashi } from '../core/suminagashi';

gsap.registerPlugin(ScrollTrigger);

const hero = document.getElementById('hero');
const fg = hero?.querySelector<HTMLElement>('.hero-fg') ?? null;
const bg = hero?.querySelector<HTMLElement>('.hero-bg') ?? null;

// ---- 視差（±8px，pointermove lerp；reduced-motion 關） ----

function initParallax() {
  if (!hero || !fg || prefersReducedMotion()) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const MAX = 8;
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };

  window.addEventListener('pointermove', (e) => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2 * MAX;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2 * MAX;
  });

  gsap.ticker.add(() => {
    cur.x += (target.x - cur.x) * 0.08;
    cur.y += (target.y - cur.y) * 0.08;
    fg.style.transform = `translate3d(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px, 0)`;
  });
}

// ---- 往下捲：背景容器 scale 1 → 0.92（scrub；reduced-motion 關） ----
// M2.5：suminagashi canvas 直插 #hero（不在 .hero-bg 內），scrub 目標要一併帶上（§6.5）。

function initScrollScale(extraTargets: Element[]) {
  if (!hero || prefersReducedMotion()) return;
  const targets: Element[] = bg ? [bg, ...extraTargets] : extraTargets;
  if (targets.length === 0) return;
  gsap.fromTo(
    targets,
    { scale: 1 },
    {
      scale: 0.92,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    }
  );
}

// ---- M2.5 suminagashi 墨流體背景（spec §6.5） ----
// null＝降級（WebGL 不可用／reduced-motion）→ 不加 class、poster 靜態背景自然露出。
// 成功時加 hero--fluid：藏 hero-shade、前景文字轉墨黑（paper 底上的對比，hero.css）。

const fluid = hero ? initSuminagashi(hero) : null;
if (fluid && hero) hero.classList.add('hero--fluid');

initParallax();
initScrollScale(fluid ? [fluid.canvas] : []);
