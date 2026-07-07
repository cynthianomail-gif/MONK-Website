// story.ts — §5.3 Story 水墨絵巻（橫向捲軸，技術重點區）
//
// 桌面/平板（≥768px 且非 reduced-motion）：pin 住 100dvh 舞台，直捲映射橫移，
// 三層視差 0.4x/0.7x/1x（照 spec §5.3 的 ScrollTrigger.create 模式）。
// end = innerWidth*3，橫移距離用 innerWidth*3*speed 換算，resize 後仍一致（gsap.matchMedia 在
// resize 跨斷點時會 revert 重建；同斷點內 innerWidth 變化由 ScrollTrigger 內建 resize 監聽處理，
// onUpdate 每次都重新讀 self.progress，不快取捲動距離，故不會漂）。
//
// 行動版（<768px）／reduced-motion：不 pin，退化為直向排列（CSS 類 story-mobile-fallback
// 控制版面；JS 面只需把文案卡改用 brushReveal 依序揭示、不建 ScrollTrigger pin）。
//
// 文案卡進入視口中央觸發 brushReveal＋鐘 SFX，每卡節流一次（played set）。

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { brushReveal } from '../core/reveal';
import { audio } from '../core/audio';
import { prefersReducedMotion } from '../core/utils';
import strings from '../data/strings.json';

// 意外發現：core/utils.ts 的 loadJSON() 用 fetch('/data/*.json')，但 data/*.json 實際放在
// src/data/ 而非 public/ ——fetch 在 dev 可行（Vite 直接服務專案根目錄），但 build 後 src/
// 不會進 dist/，fetch 路徑會 404。此檔改用靜態 import（Vite 對 JSON 原生支援，dev/build 皆正確
// 且變更 JSON 免改 TS 的驗收條件仍成立——改 JSON 內容、重新整理即生效，因為 Vite HMR 對 JSON
// import 一樣會觸發模組重載）。不回頭改 utils.ts／spec，僅在此註記；其餘 section（M4+）若沿用
// loadJSON() 對 public/ 下的 JSON 沒有這個問題，僅 data/strings.json 這種放在 src/ 的才受影響。

gsap.registerPlugin(ScrollTrigger);

const MOBILE_QUERY = '(max-width: 767px)';

const section = document.getElementById('story');
const stage = section?.querySelector<HTMLElement>('.story-stage') ?? null;
const cards = section ? gsap.utils.toArray<HTMLElement>('.story-card', section) : [];

/** 每卡只播一次鐘 SFX 的節流集合。 */
const played = new Set<HTMLElement>();

// 桌面模式的卡片揭示：觸發時機由 initDesktopScroll 的 onUpdate 手動判斷（橫向 pin 舞台，
// 卡片沒有獨立的縱向捲動位置可交給 ScrollTrigger 判斷），故不重用 brushReveal() 內建的
// ScrollTrigger（那是設計給縱向捲動頁面用的 start:'top X%'），改直接對 --p tween，
// 沿用相同 mask class／ease，行為與 brushReveal 一致。
function triggerCard(card: HTMLElement) {
  card.classList.add('brush-reveal');
  gsap.fromTo(
    card,
    { '--p': '0%' } as gsap.TweenVars,
    { '--p': '112%', duration: 0.9, ease: 'power4.out' } as gsap.TweenVars
  );
  playCardChime(card);
}

/** 每卡一次的鐘聲，桌面/行動兩路徑共用（spec §5.3 的 SFX 不分裝置）。 */
function playCardChime(card: HTMLElement) {
  if (played.has(card)) return;
  played.add(card);
  audio.sfx('sfx_bell');
}

/** 文案卡文字內容：由 strings.json 的 storyCards 填入（沿用既有 <p> 節點，不動 HTML 結構）。 */
function fillCardText(): void {
  cards.forEach((card, i) => {
    const p = card.querySelector('p');
    const text = strings.storyCards?.[i];
    if (p && text) p.textContent = text;
  });
}

/** 桌面/平板：pin + 橫移 scrub（spec §5.3 代碼模式，照抄）。 */
function initDesktopScroll(): void {
  if (!section || !stage) return;
  const panels = gsap.utils.toArray<HTMLElement>('.scroll-layer', section);

  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => `+=${innerWidth * 3}`,
    pin: stage,
    scrub: 0.5,
    invalidateOnRefresh: true,
    onUpdate(self) {
      panels.forEach((p) => {
        const speed = Number(p.dataset.speed);
        gsap.set(p, { x: -self.progress * innerWidth * 3 * speed });
      });
      // 文案卡：卡片左緣進入舞台可視範圍（考量各層已橫移）時觸發 reveal。
      // 卡片本身在 .story-layer-fg（speed=1），卡片 left 值（vw）扣掉當前橫移即為卡片相對舞台的位置。
      cards.forEach((card) => {
        if (played.has(card) && card.classList.contains('brush-reveal')) return;
        const rect = card.getBoundingClientRect();
        if (rect.left < innerWidth * 0.85 && rect.right > 0) {
          triggerCard(card);
        }
      });
    },
  });

  return void st;
}

/** 行動版／reduced-motion：不 pin，直向排列，文案卡依序 brushReveal（reduced-motion 直接顯示）。 */
function initMobileFallback(): void {
  const reduced = prefersReducedMotion();
  cards.forEach((card) => {
    brushReveal(card, { start: 'top 85%', duration: 0.9 });
    // 鐘聲與桌面路徑對齊（review finding 1）。reduced-motion 不補：卡片開站即全顯，
    // 沒有「進場」時點可掛，一次連響四聲反而擾人。
    if (reduced) return;
    ScrollTrigger.create({
      trigger: card,
      start: 'top 85%',
      once: true,
      onEnter: () => playCardChime(card),
    });
  });
}

function init(): void {
  if (!section || !stage) return;

  fillCardText();

  const reduced = prefersReducedMotion();

  if (reduced) {
    document.body.classList.add('story-mobile-fallback');
    initMobileFallback();
    return;
  }

  // gsap.matchMedia：斷點切換時自動 revert（含 ScrollTrigger.kill + pin-spacer 清除），不留殘檔。
  const mm = gsap.matchMedia();

  mm.add(MOBILE_QUERY, () => {
    document.body.classList.add('story-mobile-fallback');
    initMobileFallback();
    return () => {
      document.body.classList.remove('story-mobile-fallback');
    };
  });

  mm.add(`(min-width: 768px)`, () => {
    initDesktopScroll();
    return () => {
      // matchMedia context revert 会自动 kill 该 context 内建立的 ScrollTrigger（含 pin-spacer）。
    };
  });
}

init();
