// footer.ts — §5.8 Footer
//
// 墨黑收尾區：tagline／署名列（工具名列點）全部吃 strings.json（footerTagline/footerCredit，
// 改文案不動本檔）。彩蛋：頁底木魚 icon 再敲一下 → 鐘聲一響（audio.sfx('sfx_bell')，
// 缺檔 fail-soft 由 AudioManager 內部處理）＋「功德圓滿」toast（aria-live，2.4s 自動散去）。

import { audio } from '../core/audio';
import strings from '../data/strings.json';

const section = document.getElementById('footer');

const S = strings as Record<string, unknown>;

// ---- toast ----

let toastEl: HTMLElement | null = null;
let toastTimer: number | undefined;

function showToast(text: string): void {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'footer-toast';
    toastEl.setAttribute('role', 'status'); // 隱含 aria-live=polite
    section?.appendChild(toastEl);
  }
  toastEl.textContent = text;
  toastEl.classList.add('is-shown');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl?.classList.remove('is-shown'), 2400);
}

// ---- 接線 ----

function applyStrings(): void {
  const tagline = section?.querySelector<HTMLElement>('p[data-tagline]');
  if (tagline && typeof S.footerTagline === 'string') tagline.textContent = S.footerTagline;

  const creditEl = section?.querySelector<HTMLElement>('.footer-credit');
  if (creditEl && Array.isArray(S.footerCredit)) {
    creditEl.innerHTML = '';
    (S.footerCredit as string[]).forEach((line) => {
      const span = document.createElement('span');
      span.textContent = line;
      creditEl.appendChild(span);
    });
  }
}

function initWoodfishEgg(): void {
  const btn = section?.querySelector<HTMLButtonElement>('.footer-woodfish-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    audio.sfx('sfx_bell');
    btn.classList.remove('is-knocked');
    void btn.offsetWidth; // 重觸發 CSS 動畫
    btn.classList.add('is-knocked');
    showToast(typeof S.footerToast === 'string' ? S.footerToast : '功德圓滿');
  });
}

function init(): void {
  if (!section) return;
  applyStrings();
  initWoodfishEgg();
}

init();
