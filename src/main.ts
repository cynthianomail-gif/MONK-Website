// main.ts — 進場順序：fonts → loader（M2 佔位）→ core 各模組 init → 各 section 空殼 init（spec §2）

import './styles/tokens.css';
import './styles/base.css';

// 字體非同步載入（M6 §9）：動態 import 讓 Vite 把 @font-face 宣告拆成獨立 CSS chunk，
// 不擋首繪；swap 行為與原 base.css @import 時一致。失敗（離線等）就留系統字，不擋站。
// serif-900 先載（hero h1「和尚逆天」是 LCP 元素，swap 越早 LCP 越好），sans 隨後。
import('@fontsource/noto-serif-tc/900.css')
  .then(() =>
    Promise.all([
      import('@fontsource/noto-sans-tc/400.css'),
      import('@fontsource/noto-sans-tc/500.css'),
    ])
  )
  .catch(() => {});

// hero h1 用到的三個 serif-900 字形子集（和/天=122、尚=121、逆=114）預載，
// 與 CSS chunk 並行下載，縮短 swap 時點。⚠子集編號綁 @fontsource 版本，升版要重查
// （查法：node_modules/@fontsource/noto-serif-tc/900.css 的 unicode-range 對 U+548C/5C1A/9006/5929）。
import serifSub122 from '@fontsource/noto-serif-tc/files/noto-serif-tc-122-900-normal.woff2?url';
import serifSub121 from '@fontsource/noto-serif-tc/files/noto-serif-tc-121-900-normal.woff2?url';
import serifSub114 from '@fontsource/noto-serif-tc/files/noto-serif-tc-114-900-normal.woff2?url';

for (const href of [serifSub122, serifSub121, serifSub114]) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff2';
  link.crossOrigin = 'anonymous';
  link.href = href;
  document.head.appendChild(link);
}
import './styles/core.css';
import './styles/sections/loader.css';
import './styles/sections/hero.css';
import './styles/sections/story.css';
import './styles/sections/characters.css';
import './styles/sections/gameplay.css';
import './styles/sections/parlor.css';
import './styles/sections/gallery.css';
import './styles/sections/footer.css';

// core/（§4，M1）
// scroll.ts 的整合段（Lenis×ScrollTrigger 建立）是 spec 指定的 import-即執行模組，
// 其餘 core 模組一律走具名 init() 匯出，不做隱性全域副作用。
import './core/scroll';
import { initBeads } from './core/beads';
import { initCursor } from './core/cursor';
import { prefersReducedMotion } from './core/utils';
import './core/audio'; // 掛 mute 鈕（内部 initMuteButton 為模組載入即執行的 UI 接線，非動畫副作用）
import './core/inkReveal';

// sections/（§5，M2 之後才實作，目前為空殼）
import './sections/loader';
import './sections/hero';
import './sections/story';
import './sections/characters';
import './sections/gameplay';
import './sections/parlor';
import './sections/gallery';
import './sections/footer';

const reduced = prefersReducedMotion();

// beads 保留（導航功能是內容可達性的一部分），但 reduced-motion 時只做視覺呈現不做動畫
// （setActive 內部已依 animate 參數改用 gsap.set 而非 tween，見 core/beads.ts）。
initBeads();

// cursor：reduced-motion 時不建游標特效（spec §4.4／main.ts 接線指示）。
if (!reduced) {
  initCursor();
}
