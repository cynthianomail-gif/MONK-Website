// scroll.ts — Lenis + ScrollTrigger 整合（spec §4.1，官方整合模式，照抄）
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './utils';

gsap.registerPlugin(ScrollTrigger);

// reduced-motion：不建 Lenis 實例，維持原生捲動（spec §9.3／main.ts 接線指示）。
export const lenis: Lenis | null = prefersReducedMotion() ? null : new Lenis({ lerp: 0.1, wheelMultiplier: 1 });

if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

export function scrollToSection(id: string) {
  if (lenis) {
    lenis.scrollTo(`#${id}`, { offset: 0, duration: 1.2 });
  } else {
    document.getElementById(id)?.scrollIntoView({ behavior: 'auto' });
  }
}
