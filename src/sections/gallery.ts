// gallery.ts — §5.7 Gallery（07-09 使用者改版：拿掉 Press Kit 下載，改左右自動滑動展示帶）
//
// 兩排水平 marquee（gallery.json 驅動，19 筆拆前後兩排）：CSS 無限循環捲動、
// 排間反向、hover／鍵盤聚焦即暫停（可細看、可點）；每排內容雙份拼接做無縫循環，
// 複製份為純裝飾（div＋aria-hidden，不進 tab 順序）。點圖 → lightbox（滿版、
// ←/→ 鍵與指標滑動切換、Esc 關、預載相鄰 1 張、關閉還原 lenis/捲動/焦點）。
// prefers-reduced-motion：不自動捲，退成靜態 overflow-x 可捲列（CSS @media 處理）。
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
const marqueeEl = section?.querySelector<HTMLElement>('.gallery-marquee') ?? null;

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

/** 單圖模式（外部區塊借用 lightbox，如角色堂神格 splash）：隱藏前後導航與計數。 */
let singleMode = false;

/**
 * 開啟單張圖片檢視（供其他 section import）。
 * 與圖庫共用同一個 <dialog>，但不掛前後切換。
 */
export function openImageLightbox(
  image: { full: string; alt: string; w: number; h: number },
  trigger: HTMLElement
): void {
  buildLightbox();
  if (!lightbox || !lbImg || !lbCaption || !lbCounter) return;
  singleMode = true;
  lightbox.classList.add('is-single');
  lastTrigger = trigger;
  lbImg.src = image.full;
  lbImg.alt = image.alt;
  lbImg.width = image.w;
  lbImg.height = image.h;
  lbCaption.textContent = image.alt;
  lbCounter.textContent = '';
  lightbox.showModal();
  lenis?.stop();
  document.body.style.overflow = 'hidden';
  lbCloseBtn?.focus();
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
  if (singleMode) return; // 單圖模式不切換
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
  singleMode = false;
  lightbox.classList.remove('is-single');
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

// ---- 展示帶（兩排反向 marquee） ----

/** 建一個展示格：primary＝可點 <button>；複製份＝裝飾 <div>（aria-hidden）。 */
function buildCell(item: GalleryItem, index: number, decorative: boolean): HTMLElement {
  const cell = decorative ? document.createElement('div') : document.createElement('button');
  cell.className = 'gallery-item';
  if (decorative) {
    cell.setAttribute('aria-hidden', 'true');
  } else {
    (cell as HTMLButtonElement).type = 'button';
    cell.setAttribute('aria-label', `放大檢視：${item.alt}`);
    cell.addEventListener('click', () => openLightbox(index, cell));
  }

  const img = document.createElement('img');
  img.src = item.thumb;
  img.alt = decorative ? '' : item.alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.width = item.w;
  img.height = item.h;
  cell.appendChild(img);
  return cell;
}

function buildRow(rowItems: { item: GalleryItem; index: number }[], reverse: boolean): HTMLElement {
  const row = document.createElement('div');
  row.className = `gallery-row${reverse ? ' gallery-row--reverse' : ''}`;

  const track = document.createElement('div');
  track.className = 'gallery-track';
  // 循環週期依內容量走，兩排速度略差避免同步呆版
  track.style.setProperty('--marquee-dur', `${rowItems.length * (reverse ? 6.5 : 5.5)}s`);

  // 雙份內容做無縫循環：第一份可互動，第二份純裝飾
  for (const decorative of [false, true]) {
    const set = document.createElement('div');
    set.className = 'gallery-set';
    if (decorative) set.setAttribute('aria-hidden', 'true');
    rowItems.forEach(({ item, index }) => set.appendChild(buildCell(item, index, decorative)));
    track.appendChild(set);
  }

  row.appendChild(track);
  return row;
}

function renderMarquee(): void {
  if (!marqueeEl) return;
  marqueeEl.removeAttribute('aria-hidden');
  marqueeEl.innerHTML = '';

  const indexed = items.map((item, index) => ({ item, index }));
  const half = Math.ceil(indexed.length / 2);
  marqueeEl.appendChild(buildRow(indexed.slice(0, half), false));
  marqueeEl.appendChild(buildRow(indexed.slice(half), true));

  brushReveal(marqueeEl, { start: 'top 88%' });
}

function updateIntro(): void {
  const introEl = section?.querySelector<HTMLElement>('p[data-intro]');
  const intro = (strings as Record<string, unknown>).galleryIntro as string | undefined;
  if (introEl && intro) introEl.textContent = intro;
}

function init(): void {
  if (!section) return;
  updateIntro();
  renderMarquee();
}

init();
