// characters.ts — §5.4 Characters 角色堂
//
// 上排主角大卡（無戒/了塵）：hover 3D tilt（§6.3 照抄，±6°，僅 hover-capable）＋立繪溢出卡框
// （scale 1.06 translateY(-10px)）＋金邊發光；點卡開全屏 <dialog> modal（原生 focus trap，
// 左半立繪／右半名牌＋台詞＋三行介紹）；modal 開啟 lenis.stop()、關閉 lenis.start()、
// Esc/背景點擊可關、關閉後焦點還原到觸發卡片。
//
// 下排十二神封印格：12 格，revealed→立繪＋hover 出名字；未揭曉→CSS 剪影＋「???」＋章節編號，
// hover 微晃＋audio.sfx('sfx_woodfish', 0.6)（低音，缺檔 fail-soft 由 AudioManager 內部處理）。
//
// 資料來源：characters.json 靜態 import（跨單決策 07-07：JSON 一律靜態 import，不用
// utils.loadJSON——fetch('/data/*.json') 在 build 後找不到 src/data，會 404）。
// 加一筆新角色只改 JSON，重新整理即生效，不改本檔。
//
// 進場：brushReveal 交錯（reduced-motion 由 brushReveal 內部直接顯示、tilt 在此另行關閉）。

import gsap from 'gsap';
import { brushReveal } from '../core/reveal';
import { audio } from '../core/audio';
import { lenis } from '../core/scroll';
import { prefersReducedMotion } from '../core/utils';
import { openImageLightbox } from './gallery';
import charactersData from '../data/characters.json';

interface MainCharacter {
  id: string;
  name: string;
  title: string;
  quote: string;
  desc: string[];
  portrait: string;
  portraitW?: number;
  portraitH?: number;
  revealed: boolean;
}

interface GodSlot {
  id: string;
  name: string;
  domain?: string;
  chapter: number;
  revealed: boolean;
  portrait: string;
  portraitW?: number;
  portraitH?: number;
}

interface CharactersData {
  main: MainCharacter[];
  gods: GodSlot[];
}

const data = charactersData as CharactersData;

const section = document.getElementById('characters');
const mainCardsEl = section?.querySelector<HTMLElement>('.main-cards') ?? null;
const godGridEl = section?.querySelector<HTMLElement>('.god-grid') ?? null;

const HOVER_CAPABLE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// ---- 3D tilt（spec §6.3，照抄；僅 hover-capable 裝置綁定） ----

function tilt(card: HTMLElement, max = 6): void {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(card, {
      rotateY: x * max,
      rotateX: -y * max,
      duration: 0.4,
      ease: 'power2.out',
      transformPerspective: 700,
    });
  });
  card.addEventListener('pointerleave', () => {
    gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.6 });
  });
}

// ---- Modal（<dialog>，原生 focus trap／Esc） ----

let modal: HTMLDialogElement | null = null;
let modalPortrait: HTMLImageElement | null = null;
let modalName: HTMLElement | null = null;
let modalTitle: HTMLElement | null = null;
let modalQuote: HTMLElement | null = null;
let modalDesc: HTMLElement | null = null;
let modalCloseBtn: HTMLButtonElement | null = null;
let lastTrigger: HTMLElement | null = null;

function buildModal(): void {
  if (modal) return;

  modal = document.createElement('dialog');
  modal.className = 'char-modal';
  modal.setAttribute('aria-labelledby', 'char-modal-name');

  const portraitWrap = document.createElement('div');
  portraitWrap.className = 'char-modal-portrait';
  modalPortrait = document.createElement('img');
  modalPortrait.alt = '';
  modalPortrait.loading = 'lazy';
  portraitWrap.appendChild(modalPortrait);

  const info = document.createElement('div');
  info.className = 'char-modal-info cut-panel';

  modalCloseBtn = document.createElement('button');
  modalCloseBtn.type = 'button';
  modalCloseBtn.className = 'char-modal-close';
  modalCloseBtn.setAttribute('aria-label', '關閉');
  modalCloseBtn.textContent = '✕';

  const nameplate = document.createElement('div');
  nameplate.className = 'char-modal-nameplate';
  modalName = document.createElement('h3');
  modalName.id = 'char-modal-name';
  modalTitle = document.createElement('p');
  modalTitle.className = 'char-modal-title';
  nameplate.appendChild(modalName);
  nameplate.appendChild(modalTitle);

  modalQuote = document.createElement('p');
  modalQuote.className = 'char-modal-quote';

  modalDesc = document.createElement('div');
  modalDesc.className = 'char-modal-desc';

  info.appendChild(modalCloseBtn);
  info.appendChild(nameplate);
  info.appendChild(modalQuote);
  info.appendChild(modalDesc);

  modal.appendChild(portraitWrap);
  modal.appendChild(info);
  document.body.appendChild(modal);

  modalCloseBtn.addEventListener('click', () => closeModal());

  // 背景點擊可關（點到 ::backdrop 或 dialog 本身，非內容區）
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // <dialog> 原生 cancel 事件（Esc）：先擋預設，統一走 closeModal() 以還原捲動/焦點。
  modal.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeModal();
  });
}

function openModal(char: MainCharacter, trigger: HTMLElement): void {
  buildModal();
  if (!modal || !modalPortrait || !modalName || !modalTitle || !modalQuote || !modalDesc) return;

  lastTrigger = trigger;

  modalPortrait.src = char.portrait;
  modalPortrait.alt = `${char.name}立繪`;
  modalName.textContent = char.name;
  modalTitle.textContent = char.title;
  modalQuote.textContent = `「${char.quote}」`;
  modalDesc.innerHTML = '';
  char.desc.forEach((line) => {
    const p = document.createElement('p');
    p.textContent = line;
    modalDesc!.appendChild(p);
  });

  modal.showModal();
  lenis?.stop();
  document.body.style.overflow = 'hidden';
  modalCloseBtn?.focus();
}

function closeModal(): void {
  if (!modal || !modal.open) return;
  modal.close();
  lenis?.start();
  document.body.style.overflow = '';
  (lastTrigger ?? document.body).focus();
}

// ---- 主角大卡 ----

function renderMainCards(): void {
  if (!mainCardsEl) return;
  mainCardsEl.removeAttribute('aria-hidden');
  mainCardsEl.innerHTML = '';

  data.main.forEach((char) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'char-card cut-panel';
    card.dataset.charId = char.id;
    // 無 aria-label：accessible name 直接取卡片可見文字（名＋稱號），
    // 避免 axe label-content-name-mismatch（可見文字必須包含於 accessible name）。

    const portraitWrap = document.createElement('div');
    portraitWrap.className = 'char-card-portrait';
    const img = document.createElement('img');
    img.src = char.portrait;
    img.alt = `${char.name}立繪`;
    img.loading = 'lazy';
    if (char.portraitW && char.portraitH) {
      img.width = char.portraitW;
      img.height = char.portraitH;
    }
    portraitWrap.appendChild(img);

    const label = document.createElement('div');
    label.className = 'char-card-label';
    const nameEl = document.createElement('span');
    nameEl.className = 'char-card-name';
    nameEl.textContent = char.name;
    const titleEl = document.createElement('span');
    titleEl.className = 'char-card-title';
    titleEl.textContent = char.title;
    label.appendChild(nameEl);
    label.appendChild(titleEl);

    card.appendChild(portraitWrap);
    card.appendChild(label);

    card.addEventListener('click', () => openModal(char, card));

    if (HOVER_CAPABLE && !prefersReducedMotion()) {
      tilt(card);
    }

    mainCardsEl.appendChild(card);
    brushReveal(card, { start: 'top 85%' });
  });
}

// ---- 十二神（07-09 改版：已揭曉＝16:9 splash 大卡，點卡開單圖 lightbox；未揭曉＝封印小格） ----

function buildGodCard(god: GodSlot): HTMLElement {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'god-card';
  card.dataset.godId = god.id;

  const img = document.createElement('img');
  img.src = god.portrait;
  img.alt = `${god.name}——${god.domain ?? ''}`;
  img.loading = 'lazy';
  img.decoding = 'async';
  if (god.portraitW && god.portraitH) {
    img.width = god.portraitW;
    img.height = god.portraitH;
  }
  card.appendChild(img);

  const scrim = document.createElement('div');
  scrim.className = 'god-card-scrim';
  scrim.setAttribute('aria-hidden', 'true');
  card.appendChild(scrim);

  const plate = document.createElement('div');
  plate.className = 'god-card-plate';
  const nameEl = document.createElement('span');
  nameEl.className = 'god-card-name';
  nameEl.textContent = god.name;
  plate.appendChild(nameEl);
  if (god.domain) {
    const domainEl = document.createElement('span');
    domainEl.className = 'god-card-domain';
    domainEl.textContent = god.domain;
    plate.appendChild(domainEl);
  }
  card.appendChild(plate);

  card.addEventListener('click', () =>
    openImageLightbox(
      {
        full: god.portrait,
        alt: `${god.name}——${god.domain ?? ''}`,
        w: god.portraitW ?? 1600,
        h: god.portraitH ?? 900,
      },
      card
    )
  );

  return card;
}

function buildSealedSlot(god: GodSlot): HTMLElement {
  const slot = document.createElement('div');
  slot.className = 'god-slot cut-panel';
  slot.dataset.godId = god.id;

  const silhouette = document.createElement('div');
  silhouette.className = 'god-slot-silhouette';
  silhouette.setAttribute('aria-hidden', 'true');
  slot.appendChild(silhouette);

  const mark = document.createElement('span');
  mark.className = 'god-slot-mark';
  mark.textContent = '???';
  slot.appendChild(mark);

  const chapterTag = document.createElement('span');
  chapterTag.className = 'god-slot-chapter';
  chapterTag.textContent = `第 ${god.chapter} 章`;
  slot.appendChild(chapterTag);

  slot.setAttribute('aria-label', `第${god.chapter}章：尚未揭曉`);

  slot.addEventListener('pointerenter', () => {
    if (!prefersReducedMotion()) {
      gsap.to(slot, {
        keyframes: [{ x: -3 }, { x: 3 }, { x: -2 }, { x: 0 }],
        duration: 0.35,
        ease: 'power1.inOut',
      });
    }
    audio.sfx('sfx_woodfish', 0.6);
  });

  return slot;
}

function renderGodGrid(): void {
  if (!godGridEl) return;
  godGridEl.removeAttribute('aria-hidden');
  godGridEl.innerHTML = '';

  const splashGrid = document.createElement('div');
  splashGrid.className = 'god-splash-grid';
  const sealedRow = document.createElement('div');
  sealedRow.className = 'god-sealed-row';

  data.gods.forEach((god) => {
    if (god.revealed) {
      const card = buildGodCard(god);
      splashGrid.appendChild(card);
      brushReveal(card, { start: 'top 90%', duration: 0.7 });
    } else {
      const slot = buildSealedSlot(god);
      sealedRow.appendChild(slot);
      brushReveal(slot, { start: 'top 92%', duration: 0.5 });
    }
  });

  godGridEl.appendChild(splashGrid);
  godGridEl.appendChild(sealedRow);
}

function init(): void {
  if (!section) return;
  renderMainCards();
  renderGodGrid();
}

init();
