// reveal.ts — 通用筆刷揭示（spec §6.2）
//
// CSS mask 由 --p 驅動＋ScrollTrigger once。reduced-motion 時直接顯示不動畫。
//
// spec 原文 ease 寫 `'var-see-tokens'` 是佔位寫法（非合法 gsap ease，屬 spec 錯誤，
// 記在回報「意外發現」欄，不回頭改 spec）。這裡不引入 CustomEase 外掛（spec §1 依賴清單
// 未列 CustomEase，不准加新依賴），改用 gsap 內建 ease 'power4.out' 近似
// --ease-brush（cubic-bezier(.25,1,.35,1)）的「先快衝後急停」筆刷急停感。

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './utils';

gsap.registerPlugin(ScrollTrigger);

export interface BrushRevealOptions {
  /** 觸發時機，預設 'top 80%'（與 §5.7/§5.3 文案卡一致）。 */
  start?: string;
  /** tween 秒數，預設 0.9。 */
  duration?: number;
}

/**
 * 對元素套用筆刷 mask 揭示動畫。元素需先套 `.brush-reveal` class（見 base.css）。
 * reduced-motion：直接設 --p 為 100%，不建 ScrollTrigger、不動畫。
 */
export function brushReveal(el: HTMLElement, opts: BrushRevealOptions = {}): void {
  el.classList.add('brush-reveal');

  if (prefersReducedMotion()) {
    el.style.setProperty('--p', '112%');
    return;
  }

  const { start = 'top 80%', duration = 0.9 } = opts;

  gsap.fromTo(
    el,
    { '--p': '0%' } as gsap.TweenVars,
    {
      '--p': '112%',
      duration,
      ease: 'power4.out',
      scrollTrigger: { trigger: el, start, once: true },
    } as gsap.TweenVars
  );
}
