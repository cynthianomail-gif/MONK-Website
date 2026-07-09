// gallery.ts — §5.7 Gallery + Press Kit
//
// CSS columns 瀑布流（gallery.json 驅動，19 筆：截圖/立繪/美術圖）；縮圖 <button> 承載
// （原生鍵盤可達），loading="lazy"＋width/height 防 CLS；進場 brushReveal 交錯。
// 點圖 → 自製 lightbox（<dialog> 原生 focus trap／Esc）：滿版、←/→ 鍵與觸控滑動切換、
// 預載相鄰 1 張；開啟 lenis.stop()、關閉還原捲動與焦點（同 characters.ts modal 慣例）。
//
// spec 註「lightbox 與 5.2 共用同一組件」：#pv-lightbox 目前是 PV 佔位骨架（PV 未成片），
// 本檔 lightbox 為圖庫版實作；PV 成片接入時再抽共用（屆時只動 hero.ts 掛接點）。
//
// 資料：gallery.json 靜態 import（跨單決策 07-07：JSON 一律靜態 import）。
// 加一張圖只改 JSON＋丟檔進 public/media/img/gallery/，不改本檔。

import { brushReveal } from '../core/reveal';
import { lenis } from '../core/scroll';
import galleryData from '../data/gallery.json';
import strings from '../data/strings.json';

interface GalleryItem {
  thumb: string;
  full: string;
  alt: string;
  w: number;
  h: number;
}

const items = galleryData as GalleryItem[];

const section = document.getElementById('gallery');
const columnsEl = section?.querySelector<HTMLElement>('.gallery-columns') ?? null;

// ---- Lightbox（<dialog>） ----

let lightbox: HTMLDialogElement | null = null;
let lbImg: HTMLImageElement | null = null;
let lbCaption: HTMLElement | null = null;
let lbCounter: HTMLElement | null = null;
let lbCloseBtn: HTMLButtonElement | null = null;
let currentIndex = 0;
let lastTrigger: HTMLElement | null = null;

function buildLightbox(): void {
  if (lightbox) return;

  lightbox = document.createElement('dialog');
  lightbox.id = 'gallery-lightbox';
  lightbox.setAttribute('aria-label', (strings as Record<string, unknown>).galleryLightboxLabel as string ?? '圖庫檢視');

  lbImg = document.createElement('img');
  lbImg.className = 'gallery-lb-img';
  lbImg.alt = '';

  lbCloseBtn = document.createElement('button');
  lbCloseBtn.type = 'button';
  lbCloseBtn.className = 'gallery-lb-close';
  lbCloseBtn.setAttribute('aria-label', '關閉');
  lbCloseBtn.textContent = '✕';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'gallery-lb-nav gallery-lb-nav--prev';
  prevBtn.setAttribute('aria-label', '上一張');
  prevBtn.textContent = '‹';

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'gallery-lb-nav gallery-lb-nav--next';
  nextBtn.setAttribute('aria-label', '下一張');
  nextBtn.textContent = '›';

  const bar = document.createElement('div');
  bar.className = 'gallery-lb-bar';
  lbCaption = document.createElement('p');
  lbCaption.className = 'gallery-lb-caption';
  lbCounter = document.createElement('span');
  lbCounter.className = 'gallery-lb-counter';
  bar.appendChild(lbCaption);
  bar.appendChild(lbCounter);

  lightbox.appendChild(lbImg);
  lightbox.appendChild(lbCloseBtn);
  lightbox.appendChild(prevBtn);
  lightbox.appendChild(nextBtn);
  lightbox.appendChild(bar);
  document.body.appendChild(lightbox);

  lbCloseBtn.addEventListener('click', () => closeLightbox());
  prevBtn.addEventListener('click', () => show(currentIndex - 1));
  nextBtn.addEventListener('click', () => show(currentIndex + 1));

  // 點空白處（dialog 本身，非圖/鈕）可關
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // Esc：<dialog> 原生 cancel，統一走 closeLightbox() 還原捲動/焦點
  lightbox.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeLightbox();
  });

  // ←/→ 切換（dialog 開啟時捕捉）
  lightbox.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(currentIndex - 1);
    else if (e.key === 'ArrowRight') show(currentIndex + 1);
  });

  // 觸控／指標滑動切換（水平位移 >40px 視為換頁）
  let swipeStartX: number | null = null;
  lightbox.addEventListener('pointerdown', (e) => {
    swipeStartX = e.clientX;
  });
  lightbox.addEventListener('pointerup', (e) => {
    if (swipeStartX === null) return;
    const dx = e.clientX - swipeStartX;
    swipeStartX = null;
    if (Math.abs(dx) > 40) show(currentIndex + (dx < 0 ? 1 : -1));
  });
}

/** 預載相鄰 1 張（spec §5.7 互動要點）。 */
function preloadAdjacent(index: number): void {
  [index - 1, index + 1].forEach((i) => {
    const item = items[(i + items.length) % items.length];
    new Image().src = item.full;
  });
}

function show(index: number): void {
  if (!lbImg || !lbCaption || !lbCounter) return;
  currentIndex = (index + items.length) % items.length;
  const item = items[currentIndex];
  lbImg.src = item.full;
  lbImg.alt = item.alt;
  lbImg.width = item.w;
  lbImg.height = item.h;
  lbCaption.textContent = item.alt;
  lbCounter.textContent = `${currentIndex + 1} / ${items.length}`;
  preloadAdjacent(currentIndex);
}

function openLightbox(index: number, trigger: HTMLElement): void {
  buildLightbox();
  if (!lightbox) return;
  lastTrigger = trigger;
  show(index);
  lightbox.showModal();
  lenis?.stop();
  document.body.style.overflow = 'hidden';
  lbCloseBtn?.focus();
}

function closeLightbox(): void {
  if (!lightbox || !lightbox.open) return;
  lightbox.close();
  lenis?.start();
  document.body.style.overflow = '';
  (lastTrigger ?? document.body).focus();
}

// ---- 瀑布流 ----

function renderColumns(): void {
  if (!columnsEl) return;
  columnsEl.removeAttribute('aria-hidden');
  columnsEl.innerHTML = '';

  items.forEach((item, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gallery-item';
    btn.setAttribute('aria-label', `放大檢視：${item.alt}`);

    const img = document.createElement('img');
    img.src = item.thumb;
    img.alt = item.alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = item.w;
    img.height = item.h;
    btn.appendChild(img);

    btn.addEventListener('click', () => openLightbox(i, btn));

    columnsEl.appendChild(btn);
    brushReveal(btn, { start: 'top 92%', duration: 0.7 });
  });
}

function updateIntro(): void {
  const introEl = section?.querySelector<HTMLElement>('p[data-intro]');
  const intro = (strings as Record<string, unknown>).galleryIntro as string | undefined;
  if (introEl && intro) introEl.textContent = intro;

  const pressKitLabel = (strings as Record<string, unknown>).pressKitLabel as string | undefined;
  const pressKitSpan = section?.querySelector<HTMLElement>('.presskit-bar span');
  if (pressKitSpan && pressKitLabel) pressKitSpan.textContent = pressKitLabel;
}

function init(): void {
  if (!section) return;
  updateIntro();
  renderColumns();
}

init();
