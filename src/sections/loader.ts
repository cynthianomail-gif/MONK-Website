// loader.ts — §5.1 Loader 進站儀式
//
// 流程：資產 preload（poster＋字體，10s timeout 強制放行）→ 木魚金色呼吸光可點
// → 點擊＝audio.unlock()＋punch 動畫＋叩 SFX（缺檔靜默）→ inkReveal(點擊座標) → loader 移除。
// 3 秒後右下「直接進入」細字（走 CSS fallback 路徑）。
// reduced-motion：inkReveal 內部不動畫直接 resolve，點擊仍保留（audio unlock 需手勢）。

import gsap from 'gsap';
import { audio } from '../core/audio';
import { inkReveal } from '../core/inkReveal';
import { lenis } from '../core/scroll';
import { prefersReducedMotion } from '../core/utils';

const loader = document.getElementById('loader');
const fishBtn = loader?.querySelector<HTMLButtonElement>('.loader-woodfish-btn') ?? null;
const fishImg = loader?.querySelector<HTMLImageElement>('.loader-woodfish') ?? null;
const skipBtn = loader?.querySelector<HTMLButtonElement>('.loader-skip') ?? null;

let ready = false;
let entered = false;

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // fail-soft：缺圖不擋進站
    img.src = src;
  });
}

function setReady() {
  if (ready || !loader) return;
  ready = true;
  loader.classList.add('ready');
  fishBtn?.setAttribute('aria-disabled', 'false');
}

/** 進站：punch → 墨暈揭示 → loader 自 DOM 移除。 */
async function enter(center: { x: number; y: number }, forceFallback: boolean) {
  if (!ready || entered || !loader) return;
  entered = true;

  // 使用者手勢：解鎖音訊（fail-soft，見 core/audio.ts）；SFX 載好即敲一聲（缺檔靜默）。
  audio.unlock().then(() => audio.sfx('sfx_woodfish'));

  // 木魚 punch（reduced-motion 由 gsap 全域不受影響，但這裡直接略過以符合 §5.1）
  if (!prefersReducedMotion() && fishImg) {
    gsap.fromTo(fishImg, { scale: 0.88 }, { scale: 1, duration: 0.25, ease: 'back.out(3)' });
  }

  // inkReveal 同步掛上遮罩 overlay（WebGL canvas 或 main clip-path），loader 即可先移除。
  const reveal = inkReveal(center, { forceFallback });
  loader.remove();
  lenis?.start();
  await reveal;
}

function initLoader() {
  if (!loader || !fishBtn || !skipBtn) return;

  // loader 期間停住平滑捲動（進站儀式不該能捲頁）；reduced-motion 時 lenis 為 null。
  lenis?.stop();

  // 資產 preload：字體＋Hero poster（10s timeout 強制放行，Slow 3G 不卡死）
  const preload = Promise.all([
    document.fonts.ready.then(() => undefined),
    preloadImage('media/img/poster.avif'),
  ]);
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 10_000));
  Promise.race([preload.then(() => undefined), timeout]).then(setReady);

  // 3 秒後顯示「直接進入」（CSS fallback 路徑）
  setTimeout(() => loader.classList.add('skippable'), 3_000);

  fishBtn.addEventListener('click', (e) => {
    if (!ready) return;
    // 鍵盤觸發（Enter/Space）時 clientX/Y 為 0，改用木魚中心
    let x = e.clientX;
    let y = e.clientY;
    if (e.detail === 0 || (x === 0 && y === 0)) {
      const r = fishBtn.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    }
    void enter({ x: x / window.innerWidth, y: y / window.innerHeight }, false);
  });

  skipBtn.addEventListener('click', () => {
    // 「直接進入」走 CSS fallback（spec §5.1），從畫面中心擴張
    setReady(); // 跳過鈕出現即可用，不等 preload
    void enter({ x: 0.5, y: 0.5 }, true);
  });
}

initLoader();
