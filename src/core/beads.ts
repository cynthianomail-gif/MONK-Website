// beads.ts — 佛珠進度導航（spec §4.3，本站招牌組件）
//
// 桌面：右緣垂直佛珠串（SVG，7 顆對應 7 個 section）＋串線；當前 section 珠子放大 1.3x
// 並發金光；點珠 scrollToSection()＋木魚 SFX；hover 斜切 tooltip 顯示區名。
// 行動版（<768px）：退化為底部金色細進度條。
// 鍵盤可達：每珠是 button，Tab 可及、Enter 觸發（<button> 原生即可）。

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollToSection } from './scroll';
import { audio } from './audio';
import { prefersReducedMotion } from './utils';

gsap.registerPlugin(ScrollTrigger);

const SECTIONS: { id: string; label: string }[] = [
  { id: 'hero', label: '緣起' },
  { id: 'story', label: '世界' },
  { id: 'characters', label: '眾生' },
  { id: 'gameplay', label: '玩法' },
  { id: 'gallery', label: '畫廊' },
  { id: 'footer', label: '結緣' },
];

const MOBILE_QUERY = '(max-width: 767px)';

function buildBeadsDOM(): { nav: HTMLElement; buttons: HTMLButtonElement[]; progressBar: HTMLElement } {
  const nav = document.createElement('nav');
  nav.id = 'beads-nav';
  nav.setAttribute('aria-label', '章節導航');

  const svgNS = 'http://www.w3.org/2000/svg';
  const line = document.createElementNS(svgNS, 'svg');
  line.setAttribute('class', 'beads-line');
  line.setAttribute('aria-hidden', 'true');
  line.setAttribute('viewBox', '0 0 10 100');
  line.setAttribute('preserveAspectRatio', 'none');
  const lineEl = document.createElementNS(svgNS, 'line');
  lineEl.setAttribute('x1', '5');
  lineEl.setAttribute('y1', '0');
  lineEl.setAttribute('x2', '5');
  lineEl.setAttribute('y2', '100');
  lineEl.setAttribute('stroke', 'var(--gold-dim)');
  lineEl.setAttribute('stroke-width', '1');
  line.appendChild(lineEl);
  nav.appendChild(line);

  const list = document.createElement('ul');
  list.className = 'beads-list';

  const buttons: HTMLButtonElement[] = [];

  SECTIONS.forEach((s) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bead';
    btn.dataset.section = s.id;
    btn.setAttribute('aria-label', `跳至「${s.label}」`);

    const dot = document.createElementNS(svgNS, 'svg');
    dot.setAttribute('viewBox', '0 0 20 20');
    dot.setAttribute('class', 'bead-dot');
    dot.setAttribute('aria-hidden', 'true');
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', '10');
    circle.setAttribute('cy', '10');
    circle.setAttribute('r', '7');
    dot.appendChild(circle);
    btn.appendChild(dot);

    const tooltip = document.createElement('span');
    tooltip.className = 'bead-tooltip cut-panel';
    tooltip.textContent = s.label;
    btn.appendChild(tooltip);

    btn.addEventListener('click', () => {
      scrollToSection(s.id);
      audio.sfx('sfx_woodfish');
    });

    li.appendChild(btn);
    list.appendChild(li);
    buttons.push(btn);
  });

  nav.appendChild(list);

  const progressBar = document.createElement('div');
  progressBar.id = 'beads-progress';
  progressBar.setAttribute('role', 'progressbar');
  progressBar.setAttribute('aria-label', '章節進度');
  progressBar.setAttribute('aria-valuemin', '0');
  progressBar.setAttribute('aria-valuemax', '100');
  const fill = document.createElement('div');
  fill.id = 'beads-progress-fill';
  progressBar.appendChild(fill);

  return { nav, buttons, progressBar };
}

function setActive(buttons: HTMLButtonElement[], index: number, animate: boolean) {
  buttons.forEach((btn, i) => {
    const active = i === index;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-current', active ? 'true' : 'false');
    if (animate) {
      gsap.to(btn, { scale: active ? 1.3 : 1, duration: 0.4, ease: 'power2.out' });
    } else {
      gsap.set(btn, { scale: active ? 1.3 : 1 });
    }
  });
}

export function initBeads(): void {
  const { nav, buttons, progressBar } = buildBeadsDOM();
  document.body.appendChild(nav);
  document.body.appendChild(progressBar);

  const reduced = prefersReducedMotion();
  const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

  const applyMode = () => {
    const mobile = isMobile();
    nav.style.display = mobile ? 'none' : '';
    progressBar.style.display = mobile ? '' : 'none';
  };
  applyMode();
  window.addEventListener('resize', applyMode);

  let activeIndex = 0;
  setActive(buttons, 0, false);

  SECTIONS.forEach((s, i) => {
    const trigger = document.getElementById(s.id);
    if (!trigger) return;
    ScrollTrigger.create({
      trigger,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => {
        if (self.isActive) {
          activeIndex = i;
          setActive(buttons, i, !reduced);
        }
      },
    });
  });

  // 行動版底部進度條：以整頁捲動百分比驅動。
  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const fill = document.getElementById('beads-progress-fill');
      if (fill) fill.style.width = `${(self.progress * 100).toFixed(2)}%`;
      progressBar.setAttribute('aria-valuenow', String(Math.round(self.progress * 100)));
    },
  });
}
