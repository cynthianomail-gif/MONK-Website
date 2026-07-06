// main.ts — 進場順序：fonts → loader（M2 佔位）→ core 各模組 init → 各 section 空殼 init（spec §2）

import './styles/tokens.css';
import './styles/base.css';
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

// TODO M2: loader 木魚點擊→ audio.unlock() → inkReveal 互動邏輯尚未實作。
// M0/M1 骨架階段先隱藏 overlay，避免擋住七區骨架驗收；M2 施工時移除下面這行並接上真實互動。
document.getElementById('loader')?.setAttribute('style', 'display:none');
