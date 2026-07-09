// parlor.ts — §5.6 Parlor 地下遊藝場 + 電子木魚彩蛋
//
// 街機廊：橫向 scroll-snap（原生 CSS scroll-snap-type: x mandatory，不用輪播庫）；
// 5 台街機櫃（飛鏢/輪盤/保齡球/21點/打擊籠，資料驅動 arcade.json，改版 +3 款只改 JSON）
// ＋第 6 台特殊櫃「功德無量」（固定寫死，非資料驅動——它開啟的是本檔的彩蛋小遊戲，
// 不是單純截圖展示櫃，性質不同故不進 arcade.json）。
// 左右箭頭按鈕 scrollBy 對齊 snap；hover 螢幕 brightness 提升＋招牌閃爍。
//
// 電子木魚（spec §6.4 逐條實作）：點「功德無量」開全屏 overlay（index.html 既有
// #woodfish-overlay 容器），開時 lenis.stop()。狀態 { merit, combo, lastTapAt, unlocked }
// 持久化 localStorage('monk-merit')。merit 達 108 解鎖「結緣桌布」下載鈕
// （wallpaper_phone.png 為 Codex 第二批素材尚未交回，連結先掛 data-todo）。

import gsap from 'gsap';
import { brushReveal } from '../core/reveal';
import { audio } from '../core/audio';
import { lenis } from '../core/scroll';
import { prefersReducedMotion, lazyVideo } from '../core/utils';
import arcadeData from '../data/arcade.json';
import strings from '../data/strings.json';

interface ArcadeCabinet {
  id: string;
  title: string;
  tagline: string;
  poster: string;
  loop: string;
}

const arcade = arcadeData as ArcadeCabinet[];

interface ParlorStrings {
  parlorIntro?: string;
  parlorArcadeAlt?: string;
  woodfishCabinetTitle?: string;
  woodfishCabinetTagline?: string;
  woodfishInstructions?: string;
  woodfishMeritLabel?: string;
  woodfishComboLabel?: string;
  woodfishUnlockTitle?: string;
  woodfishUnlockBody?: string;
  woodfishDownloadLabel?: string;
}

const S = strings as ParlorStrings;

const section = document.getElementById('parlor');
const rowEl = section?.querySelector<HTMLElement>('.arcade-row') ?? null;

// ==========================================================================
// 街機廊
// ==========================================================================

function buildArrowNav(): void {
  if (!rowEl || !section) return;

  const nav = document.createElement('div');
  nav.className = 'arcade-nav';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'arcade-arrow arcade-arrow--prev';
  prevBtn.setAttribute('aria-label', '往左捲動街機廊');
  prevBtn.textContent = '‹';

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'arcade-arrow arcade-arrow--next';
  nextBtn.setAttribute('aria-label', '往右捲動街機廊');
  nextBtn.textContent = '›';

  const scrollByCabinet = (dir: 1 | -1) => {
    const cabinet = rowEl.querySelector<HTMLElement>('.arcade-cabinet');
    const step = cabinet ? cabinet.getBoundingClientRect().width + 24 : 300;
    rowEl.scrollBy({ left: dir * step, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  prevBtn.addEventListener('click', () => scrollByCabinet(-1));
  nextBtn.addEventListener('click', () => scrollByCabinet(1));

  nav.appendChild(prevBtn);
  nav.appendChild(nextBtn);
  section.querySelector('.arcade-wrap')?.appendChild(nav);
}

function buildCabinet(item: ArcadeCabinet): HTMLElement {
  const cab = document.createElement('div');
  cab.className = 'arcade-cabinet cut-panel';
  cab.dataset.arcadeId = item.id;
  cab.setAttribute('role', 'group');
  cab.setAttribute('aria-label', `${item.title}街機櫃`);

  const marquee = document.createElement('div');
  marquee.className = 'arcade-marquee';
  marquee.textContent = item.title;
  marquee.setAttribute('aria-hidden', 'true');

  const screen = document.createElement('div');
  screen.className = 'arcade-screen';

  const poster = document.createElement('img');
  poster.className = 'arcade-screen-poster';
  poster.src = item.poster;
  poster.alt = (S.parlorArcadeAlt || '小遊戲截圖：{title}').replace('{title}', item.title);
  poster.loading = 'lazy';
  poster.setAttribute('data-placeholder', '');
  screen.appendChild(poster);

  const video = document.createElement('video');
  video.className = 'arcade-screen-video';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.setAttribute('data-placeholder', '');
  const source = document.createElement('source');
  source.dataset.src = item.loop || '';
  source.type = 'video/webm';
  video.appendChild(source);
  screen.appendChild(video);

  const caption = document.createElement('p');
  caption.className = 'arcade-caption';
  caption.textContent = item.tagline;

  cab.appendChild(marquee);
  cab.appendChild(screen);
  cab.appendChild(caption);

  cab.addEventListener('pointerenter', () => {
    cab.classList.add('is-hovered');
    if (item.loop) lazyVideo(video);
    video.play().catch(() => {});
  });
  cab.addEventListener('pointerleave', () => {
    cab.classList.remove('is-hovered');
    video.pause();
  });

  return cab;
}

function buildWoodfishCabinet(): HTMLElement {
  const cab = document.createElement('button');
  cab.type = 'button';
  cab.className = 'arcade-cabinet arcade-cabinet--woodfish cut-panel';
  cab.dataset.arcadeId = 'woodfish';
  cab.setAttribute('aria-label', `${S.woodfishCabinetTitle || '功德無量'}——${S.woodfishCabinetTagline || '點擊或按空白鍵，叩響木魚'}`);

  const marquee = document.createElement('div');
  marquee.className = 'arcade-marquee arcade-marquee--special';
  marquee.textContent = S.woodfishCabinetTitle || '功德無量';
  marquee.setAttribute('aria-hidden', 'true');

  const screen = document.createElement('div');
  screen.className = 'arcade-screen arcade-screen--woodfish';
  const img = document.createElement('img');
  img.src = '/media/img/woodfish.webp';
  img.alt = '';
  img.loading = 'lazy';
  img.width = 512;
  img.height = 512;
  screen.appendChild(img);

  const caption = document.createElement('p');
  caption.className = 'arcade-caption';
  caption.textContent = S.woodfishCabinetTagline || '點擊或按空白鍵，叩響木魚';

  cab.appendChild(marquee);
  cab.appendChild(screen);
  cab.appendChild(caption);

  cab.addEventListener('click', () => openWoodfishOverlay(cab));
  cab.addEventListener('pointerenter', () => cab.classList.add('is-hovered'));
  cab.addEventListener('pointerleave', () => cab.classList.remove('is-hovered'));

  return cab;
}

function renderArcadeRow(): void {
  if (!rowEl) return;
  rowEl.removeAttribute('aria-hidden');
  rowEl.innerHTML = '';

  arcade.forEach((item) => {
    const cab = buildCabinet(item);
    rowEl.appendChild(cab);
    brushReveal(cab, { start: 'top 90%', duration: 0.6 });
  });

  const woodfishCab = buildWoodfishCabinet();
  rowEl.appendChild(woodfishCab);
  brushReveal(woodfishCab, { start: 'top 90%', duration: 0.6 });

  buildArrowNav();
}

// ==========================================================================
// 電子木魚彩蛋（spec §6.4）
// ==========================================================================

const MERIT_TARGET = 108;
const COMBO_MIN_MS = 180;
const COMBO_MAX_MS = 900;
const FLOAT_POOL_LIMIT = 20;

interface WoodfishState {
  merit: number;
  combo: number;
  lastTapAt: number;
  unlocked: boolean;
}

function loadState(): WoodfishState {
  try {
    const raw = localStorage.getItem('monk-merit');
    if (!raw) return { merit: 0, combo: 0, lastTapAt: 0, unlocked: false };
    const parsed = JSON.parse(raw);
    return {
      merit: Number(parsed.merit) || 0,
      combo: 0, // combo 不持久化，每次開遊戲從 0 開始
      lastTapAt: 0,
      unlocked: Boolean(parsed.unlocked),
    };
  } catch {
    return { merit: 0, combo: 0, lastTapAt: 0, unlocked: false };
  }
}

function saveState(state: WoodfishState): void {
  try {
    localStorage.setItem('monk-merit', JSON.stringify({ merit: state.merit, unlocked: state.unlocked }));
  } catch {
    // localStorage 不可用（隱私模式等）：靜默略過，不阻斷遊戲流程
  }
}

let state: WoodfishState = loadState();

let overlayEl: HTMLElement | null = null;
let woodfishImgEl: HTMLElement | null = null;
let floatLayerEl: HTMLElement | null = null;
let meritValueEl: HTMLElement | null = null;
let comboValueEl: HTMLElement | null = null;
let unlockPanelEl: HTMLElement | null = null;
let lastFocusTrigger: HTMLElement | null = null;
let woodfishSectionInner: HTMLElement | null = null;

const floatPool: HTMLElement[] = [];

function buildOverlayContent(): void {
  overlayEl = document.getElementById('woodfish-overlay');
  if (!overlayEl) return;

  const stage = overlayEl.querySelector<HTMLElement>('.woodfish-stage');
  if (!stage || stage.childElementCount > 0) {
    // 已建過內容（例如重複呼叫 init），只重新取參照
    woodfishImgEl = overlayEl.querySelector('.woodfish-img');
    floatLayerEl = overlayEl.querySelector('.woodfish-float-layer');
    meritValueEl = overlayEl.querySelector('.woodfish-merit-value');
    comboValueEl = overlayEl.querySelector('.woodfish-combo-value');
    unlockPanelEl = overlayEl.querySelector('.woodfish-unlock-panel');
    woodfishSectionInner = stage ?? null;
    return;
  }

  const hud = document.createElement('div');
  hud.className = 'woodfish-hud';

  const meritBox = document.createElement('div');
  meritBox.className = 'woodfish-hud-box';
  const meritLabel = document.createElement('span');
  meritLabel.className = 'woodfish-hud-label';
  meritLabel.textContent = S.woodfishMeritLabel || '功德';
  meritValueEl = document.createElement('span');
  meritValueEl.className = 'woodfish-merit-value woodfish-hud-value';
  meritValueEl.textContent = '0';
  meritBox.appendChild(meritLabel);
  meritBox.appendChild(meritValueEl);

  const comboBox = document.createElement('div');
  comboBox.className = 'woodfish-hud-box';
  const comboLabel = document.createElement('span');
  comboLabel.className = 'woodfish-hud-label';
  comboLabel.textContent = S.woodfishComboLabel || '連擊';
  comboValueEl = document.createElement('span');
  comboValueEl.className = 'woodfish-combo-value woodfish-hud-value';
  comboValueEl.textContent = '0';
  comboBox.appendChild(comboLabel);
  comboBox.appendChild(comboValueEl);

  hud.appendChild(meritBox);
  hud.appendChild(comboBox);

  const tapArea = document.createElement('button');
  tapArea.type = 'button';
  tapArea.className = 'woodfish-tap-area';
  tapArea.setAttribute('aria-label', S.woodfishInstructions || '點擊木魚或按空白鍵敲擊');

  woodfishImgEl = document.createElement('img');
  woodfishImgEl.className = 'woodfish-img';
  (woodfishImgEl as HTMLImageElement).src = '/media/img/woodfish.webp';
  (woodfishImgEl as HTMLImageElement).alt = '';
  tapArea.appendChild(woodfishImgEl);

  floatLayerEl = document.createElement('div');
  floatLayerEl.className = 'woodfish-float-layer';
  floatLayerEl.setAttribute('aria-hidden', 'true');
  tapArea.appendChild(floatLayerEl);

  const instructions = document.createElement('p');
  instructions.className = 'woodfish-instructions';
  instructions.textContent = S.woodfishInstructions || '點擊木魚或按空白鍵敲擊，保持節奏可連擊。功德達 108 解鎖隱藏桌布。';

  unlockPanelEl = document.createElement('div');
  unlockPanelEl.className = 'woodfish-unlock-panel cut-panel';
  unlockPanelEl.hidden = true;
  const unlockTitle = document.createElement('h3');
  unlockTitle.textContent = S.woodfishUnlockTitle || '功德圓滿';
  const unlockBody = document.createElement('p');
  unlockBody.textContent = S.woodfishUnlockBody || '108 記木魚，功德圓滿——結緣桌布已解鎖';
  const downloadBtn = document.createElement('a');
  downloadBtn.className = 'cut-btn woodfish-download-btn';
  downloadBtn.href = '/media/img/wallpaper_phone.png';
  downloadBtn.setAttribute('download', '');
  downloadBtn.setAttribute('data-todo', '');
  downloadBtn.textContent = S.woodfishDownloadLabel || '下載結緣桌布';
  unlockPanelEl.appendChild(unlockTitle);
  unlockPanelEl.appendChild(unlockBody);
  unlockPanelEl.appendChild(downloadBtn);

  const flashEl = document.createElement('div');
  flashEl.className = 'woodfish-flash';
  flashEl.setAttribute('aria-hidden', 'true');

  stage.appendChild(hud);
  stage.appendChild(tapArea);
  stage.appendChild(instructions);
  stage.appendChild(unlockPanelEl);
  stage.appendChild(flashEl);
  woodfishSectionInner = stage;

  tapArea.addEventListener('pointerdown', () => tap());

  overlayEl.querySelector<HTMLButtonElement>('.woodfish-close')?.addEventListener('click', () => closeWoodfishOverlay());
}

function updateHud(): void {
  if (meritValueEl) meritValueEl.textContent = String(state.merit);
  if (comboValueEl) comboValueEl.textContent = String(state.combo);
}

/** 飄字物件池：同屏上限 20 顆，超過就回收最舊的節點重用。 */
function spawnFloatText(text: string, isCombo: boolean): void {
  if (!floatLayerEl) return;

  let el: HTMLElement;
  if (floatPool.length < FLOAT_POOL_LIMIT) {
    el = document.createElement('span');
    el.className = 'woodfish-float';
    floatLayerEl.appendChild(el);
    floatPool.push(el);
  } else {
    // 回收池中最舊（第一個）節點：先移除再重新 append 到最後，模擬「最舊者被回收」。
    el = floatPool.shift()!;
    floatPool.push(el);
    gsap.killTweensOf(el);
  }

  el.textContent = text;
  el.classList.toggle('is-combo', isCombo);

  const dx = Math.round((Math.random() - 0.5) * 60); // ±30px 隨機起點
  gsap.set(el, { x: dx, y: 0, opacity: 1 });

  if (prefersReducedMotion()) {
    gsap.set(el, { y: -40 });
    gsap.to(el, { opacity: 0, duration: 0.6, delay: 0.4 });
  } else {
    gsap.to(el, {
      y: -70,
      opacity: 0,
      duration: 1.1,
      ease: 'power1.out',
    });
  }
}

function squashStretch(): void {
  if (!woodfishImgEl || prefersReducedMotion()) return;
  gsap.fromTo(
    woodfishImgEl,
    { scaleY: 0.92 },
    { scaleY: 1, duration: 0.12, ease: 'power2.out' }
  );
}

function triggerUnlockCelebration(): void {
  audio.sfx('sfx_bell');
  const flash = overlayEl?.querySelector<HTMLElement>('.woodfish-flash');
  if (flash) {
    gsap.fromTo(
      flash,
      { opacity: prefersReducedMotion() ? 0.6 : 0.9 },
      { opacity: 0, duration: prefersReducedMotion() ? 0.3 : 1.1, ease: 'power2.out' }
    );
  }
  if (unlockPanelEl) {
    unlockPanelEl.hidden = false;
    if (!prefersReducedMotion()) {
      gsap.fromTo(unlockPanelEl, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
    }
  }
}

function tap(): void {
  const now = performance.now();
  const delta = now - state.lastTapAt;

  if (delta >= COMBO_MIN_MS && delta <= COMBO_MAX_MS) {
    state.combo += 1;
  } else {
    state.combo = 1;
  }
  state.lastTapAt = now;
  state.merit += 1;

  const rate = 1 + Math.min(state.combo, 20) * 0.01;
  audio.sfx('sfx_woodfish', rate);

  squashStretch();

  const isCombo = state.combo >= 5;
  spawnFloatText(isCombo ? `+1 連擊×${state.combo}` : '功德+1', isCombo);

  updateHud();

  const justUnlocked = !state.unlocked && state.merit >= MERIT_TARGET;
  if (justUnlocked) {
    state.unlocked = true;
  }

  saveState(state);

  if (justUnlocked) {
    triggerUnlockCelebration();
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (!overlayEl || overlayEl.hidden) return;
  if (e.code === 'Space') {
    e.preventDefault(); // 防止空白鍵捲動背景頁面
    tap();
  } else if (e.key === 'Escape') {
    closeWoodfishOverlay();
  }
}

function openWoodfishOverlay(trigger: HTMLElement): void {
  buildOverlayContent();
  if (!overlayEl) return;

  lastFocusTrigger = trigger;
  overlayEl.hidden = false;
  lenis?.stop();
  document.body.style.overflow = 'hidden';

  // 重新讀取一次持久化狀態（避免跨分頁或先前 session 的 merit 值不同步）
  const persisted = loadState();
  state.merit = persisted.merit;
  state.unlocked = persisted.unlocked;
  state.combo = 0;
  state.lastTapAt = 0;
  updateHud();

  if (unlockPanelEl) {
    unlockPanelEl.hidden = !state.unlocked;
  }

  overlayEl.querySelector<HTMLButtonElement>('.woodfish-tap-area')?.focus();
  document.addEventListener('keydown', onKeydown);
}

function closeWoodfishOverlay(): void {
  if (!overlayEl || overlayEl.hidden) return;
  overlayEl.hidden = true;
  lenis?.start();
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKeydown);
  (lastFocusTrigger ?? document.body).focus();
}

// ==========================================================================
// init
// ==========================================================================

function updateIntro(): void {
  const introEl = section?.querySelector<HTMLElement>('p[data-intro]');
  if (introEl && S.parlorIntro) {
    introEl.textContent = S.parlorIntro;
  }
}

function init(): void {
  if (!section) return;
  updateIntro();
  renderArcadeRow();
}

init();
