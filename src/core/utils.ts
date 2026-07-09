// utils.ts — 全站共用工具（spec §4.5）

/** 讀 prefers-reduced-motion media query。全站動畫模組進場前都要查。 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * IntersectionObserver 進視口才把 data-src 塞進 <source> 並 load()，離開視口 pause()。
 * el 需為 <video>，其 <source> 子元素以 data-src 存實際來源。
 */
export function lazyVideo(el: HTMLVideoElement): void {
  const sources = Array.from(el.querySelectorAll<HTMLSourceElement>('source[data-src]'));
  if (sources.length === 0) return;

  let loaded = false;

  const load = () => {
    if (loaded) return;
    loaded = true;
    sources.forEach((s) => {
      const src = s.dataset.src;
      if (src) {
        s.src = src;
        s.removeAttribute('data-src');
      }
    });
    el.load();
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          load();
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      }
    },
    { threshold: 0.25 }
  );
  io.observe(el);
}
