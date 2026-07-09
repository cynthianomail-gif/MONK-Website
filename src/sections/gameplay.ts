// gameplay.ts — §5.5 Gameplay 玩法四象
//
// 紙白反差區，2×2 斜切大卡（戰鬥/探索/小遊戲/技能習得，資料驅動 gameplay.json）。
// hover（桌面 hover-capable）該卡「亮起」其餘降飽和；點卡展開為橫幅（flex-grow 動畫）
// 顯示 points 三行。行動版：進視口的卡亮起（IntersectionObserver）。
//
// 影片缺（使用者指示：遊戲實錄全跳過）：poster 常駐佔位（data-placeholder），
// <video> 結構與 lazyVideo() 呼叫照 spec 寫好、source 留 data-src 空掛，
// 日後補 webm 即生效。同時最多播 1 支的邏輯照寫（現在無片自然不觸發，因為
// lazyVideo() 內部靠 source[data-src] 有值才 load()；這裡我們額外用
// currentlyPlaying 追蹤，確保未來補片後語意正確）。
//
// 資料：gameplay.json 靜態 import（跨單決策 07-07：JSON 一律靜態 import）。

import gsap from 'gsap';
import { brushReveal } from '../core/reveal';
import { prefersReducedMotion, lazyVideo } from '../core/utils';
import gameplayData from '../data/gameplay.json';
import strings from '../data/strings.json';

interface GameplayCard {
  id: string;
  title: string;
  tagline: string;
  points: string[];
  loop: string;
  poster: string;
}

const data = gameplayData as GameplayCard[];

const section = document.getElementById('gameplay');
const gridEl = section?.querySelector<HTMLElement>('.quad-grid') ?? null;

const HOVER_CAPABLE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** 同時最多播 1 支 loop 影片（省電，spec §5.5 實作要點）。 */
let currentlyPlaying: HTMLVideoElement | null = null;

function playOnly(video: HTMLVideoElement | null): void {
  if (currentlyPlaying && currentlyPlaying !== video) {
    currentlyPlaying.pause();
    currentlyPlaying.classList.remove('is-playing');
  }
  currentlyPlaying = video;
  if (video && video.querySelector('source')?.getAttribute('src')) {
    video.play().catch(() => {});
    video.classList.add('is-playing');
  }
}

let expandedId: string | null = null;

function setActive(cards: HTMLElement[], activeCard: HTMLElement | null): void {
  cards.forEach((card) => {
    const isActive = card === activeCard;
    card.classList.toggle('is-active', isActive);
    card.classList.toggle('is-dimmed', activeCard !== null && !isActive);
  });
}

function toggleExpand(card: HTMLElement, cards: HTMLElement[]): void {
  const id = card.dataset.gameplayId ?? null;
  const alreadyExpanded = expandedId === id;
  expandedId = alreadyExpanded ? null : id;

  cards.forEach((c) => {
    const isExpanded = !alreadyExpanded && c === card;
    c.classList.toggle('is-expanded', isExpanded);
    const points = c.querySelector<HTMLElement>('.quad-card-points');
    if (points) points.hidden = !isExpanded;
    c.setAttribute('aria-expanded', String(isExpanded));
  });
}

function renderGrid(): void {
  if (!gridEl) return;
  gridEl.removeAttribute('aria-hidden');
  gridEl.innerHTML = '';

  const cards: HTMLElement[] = [];

  data.forEach((item) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'quad-card cut-panel';
    card.dataset.gameplayId = item.id;
    card.setAttribute('aria-expanded', 'false');
    // 無 aria-label：accessible name 取卡片可見文字（標題＋副標），
    // 避免 axe label-content-name-mismatch；展開語意由 aria-expanded 傳達。

    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'quad-card-media';

    const poster = document.createElement('img');
    poster.className = 'quad-card-poster';
    poster.src = item.poster;
    poster.alt = '';
    poster.loading = 'lazy';
    poster.setAttribute('data-placeholder', '');
    mediaWrap.appendChild(poster);

    // <video> 結構空掛，data-src 留空（無片可用，lazyVideo() 內見無 data-src 值即 no-op）
    const video = document.createElement('video');
    video.className = 'quad-card-video';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    video.setAttribute('poster', item.poster);
    video.setAttribute('data-placeholder', '');
    const sourceWebm = document.createElement('source');
    sourceWebm.dataset.src = item.loop || '';
    sourceWebm.type = 'video/webm';
    video.appendChild(sourceWebm);
    mediaWrap.appendChild(video);

    const label = document.createElement('div');
    label.className = 'quad-card-label';
    const titleEl = document.createElement('h3');
    titleEl.className = 'quad-card-title';
    titleEl.textContent = item.title;
    const taglineEl = document.createElement('p');
    taglineEl.className = 'quad-card-tagline';
    taglineEl.textContent = item.tagline;
    label.appendChild(titleEl);
    label.appendChild(taglineEl);

    const pointsEl = document.createElement('ul');
    pointsEl.className = 'quad-card-points';
    pointsEl.hidden = true;
    item.points.forEach((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      pointsEl.appendChild(li);
    });

    card.appendChild(mediaWrap);
    card.appendChild(label);
    card.appendChild(pointsEl);

    card.addEventListener('click', () => toggleExpand(card, cards));

    if (HOVER_CAPABLE) {
      card.addEventListener('pointerenter', () => {
        setActive(cards, card);
        if (item.loop) lazyVideo(video);
        playOnly(video);
      });
      card.addEventListener('pointerleave', () => {
        setActive(cards, null);
        video.pause();
        if (currentlyPlaying === video) currentlyPlaying = null;
      });
    }

    gridEl.appendChild(card);
    cards.push(card);
    brushReveal(card, { start: 'top 85%' });
  });

  if (!HOVER_CAPABLE) {
    initMobileInViewActivation(cards);
  }
}

/** 行動版：進視口的卡亮起（IntersectionObserver，spec §5.5）。 */
function initMobileInViewActivation(cards: HTMLElement[]): void {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const card = entry.target as HTMLElement;
        const video = card.querySelector<HTMLVideoElement>('.quad-card-video');
        if (entry.isIntersecting) {
          setActive(cards, card);
          if (video) {
            const src = video.querySelector('source')?.dataset.src;
            if (src) lazyVideo(video);
            playOnly(video);
          }
        } else {
          card.classList.remove('is-active');
          if (video) video.pause();
        }
      });
    },
    { threshold: 0.6 }
  );
  cards.forEach((c) => io.observe(c));
}

function updateIntro(): void {
  const introEl = section?.querySelector<HTMLElement>('p[data-intro]');
  const gameplayIntro = (strings as { gameplayIntro?: string }).gameplayIntro;
  if (introEl && gameplayIntro) {
    introEl.textContent = gameplayIntro;
  }
}

function init(): void {
  if (!section) return;
  updateIntro();
  renderGrid();
  if (!prefersReducedMotion()) {
    gsap.set(section, {}); // no-op：保留掛鉤位置，未來若加整區進場動畫可在此擴充
  }
}

init();
