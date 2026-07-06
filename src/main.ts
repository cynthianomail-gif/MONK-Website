// main.ts — 進場順序：fonts → loader → 各 section init（spec §2）
// M0：僅接線 CSS 與空殼模組匯入，確認 build 零錯誤；實作邏輯留待 M1 之後。

import './styles/tokens.css';
import './styles/base.css';
import './styles/sections/loader.css';
import './styles/sections/hero.css';
import './styles/sections/story.css';
import './styles/sections/characters.css';
import './styles/sections/gameplay.css';
import './styles/sections/parlor.css';
import './styles/sections/gallery.css';
import './styles/sections/footer.css';

// core/（§4，M1 才實作）
import './core/scroll';
import './core/audio';
import './core/beads';
import './core/cursor';
import './core/inkReveal';
import './core/utils';

// sections/（§5，M2 之後才實作）
import './sections/loader';
import './sections/hero';
import './sections/story';
import './sections/characters';
import './sections/gameplay';
import './sections/parlor';
import './sections/gallery';
import './sections/footer';

// TODO M2: loader 木魚點擊→ audio.unlock() → inkReveal 互動邏輯尚未實作。
// M0 骨架階段先隱藏 overlay，避免擋住七區骨架驗收；M2 施工時移除下面這行並接上真實互動。
document.getElementById('loader')?.setAttribute('style', 'display:none');
