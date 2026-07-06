// cursor.ts — 墨點游標（spec §4.4，僅桌面 hover-capable、非 reduced-motion）
//
// 原生游標隱藏只套桌面 hover-capable media query；一顆 12px 墨點 + 24px 空心圈 lerp
// 跟隨；可點擊元素 hover 時圈變金色並放大；pointerdown 墨點迸開小墨滴（3–4 顆）。
// 必須保留 :focus-visible 金色 outline（cursor:none 只作用視覺游標，不影響 focus ring）。

const HOVER_CAPABLE_QUERY = '(hover: hover) and (pointer: fine)';

export function initCursor(): void {
  if (!window.matchMedia(HOVER_CAPABLE_QUERY).matches) return;

  document.documentElement.classList.add('cursor-none');

  const dot = document.createElement('div');
  dot.className = 'ink-cursor-dot';
  dot.setAttribute('aria-hidden', 'true');

  const ring = document.createElement('div');
  ring.className = 'ink-cursor-ring';
  ring.setAttribute('aria-hidden', 'true');

  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 2;
  let x = tx;
  let y = ty;
  let rx = tx;
  let ry = ty;

  window.addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
  });

  const interactiveSelector = 'a, button, [role="button"], input, textarea, select, [data-cursor-hover]';

  document.addEventListener('pointerover', (e) => {
    const target = e.target as Element | null;
    if (target?.closest(interactiveSelector)) {
      ring.classList.add('ink-cursor-ring--active');
    }
  });
  document.addEventListener('pointerout', (e) => {
    const target = e.target as Element | null;
    if (target?.closest(interactiveSelector)) {
      ring.classList.remove('ink-cursor-ring--active');
    }
  });

  document.addEventListener('pointerdown', (e) => {
    spawnInkSplat(e.clientX, e.clientY);
  });

  function raf() {
    // 墨點：緊貼游標；圈：lerp 跟隨營造墨暈拖曳感。
    x = tx;
    y = ty;
    rx += (tx - rx) * 0.15;
    ry += (ty - ry) * 0.15;

    dot.style.transform = `translate(${x}px, ${y}px)`;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;

    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

function spawnInkSplat(cx: number, cy: number) {
  const count = 3 + Math.floor(Math.random() * 2); // 3–4 顆
  for (let i = 0; i < count; i++) {
    const drop = document.createElement('div');
    drop.className = 'ink-cursor-splat';
    drop.setAttribute('aria-hidden', 'true');
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const dist = 10 + Math.random() * 14;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    drop.style.left = `${cx}px`;
    drop.style.top = `${cy}px`;
    drop.style.setProperty('--dx', `${dx}px`);
    drop.style.setProperty('--dy', `${dy}px`);
    document.body.appendChild(drop);
    drop.addEventListener('animationend', () => drop.remove());
    setTimeout(() => drop.remove(), 700); // 保險：無 animationend 也清除
  }
}
