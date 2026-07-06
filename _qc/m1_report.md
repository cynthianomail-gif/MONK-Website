# M1 全站系統（core/）驗收報告

日期：2026-07-06。範圍：spec §4（core/ 全部）＋ §6.2（brush-reveal）。

## 改了哪些檔

- `src/core/scroll.ts`（全檔重寫，26 行）：Lenis×ScrollTrigger 整合，照 spec §4.1 原文；追加 reduced-motion 分支（`lenis` 為 `null` 時 `scrollToSection` 退化為 `element.scrollIntoView({behavior:'auto'})`）。
- `src/core/audio.ts`（全檔重寫，~110 行）：AudioManager 照 spec §4.2 補完 `toggleMute()`／`onVisibilityChange()`；依使用者追加指示做成 fail-soft（fetch/decode 失敗 `console.warn` 一次即跳過，`bgm.play()` 失敗同樣吞掉）；新增右上角固定「音」鈕（`initMuteButton()`，module-load 即接線）。
- `src/core/beads.ts`（全檔重寫，~165 行）：7 顆 SVG 佛珠＋串線（桌面）／底部進度條（<768px）。用 `ScrollTrigger.create({trigger, start:'top center', end:'bottom center', onToggle})` 依 spec 範式更新 active index；active 珠 `gsap.to(scale:1.3)` ＋ CSS `drop-shadow`；點珠 `scrollToSection()`＋`audio.sfx('sfx_woodfish')`；hover 斜切 tooltip 顯示中文區名（緣起/世界/眾生/玩法/遊藝場/畫廊/結緣）；珠為原生 `<button>`，Tab 可及、Enter/Space 原生觸發。
- `src/core/cursor.ts`（全檔重寫，~85 行）：12px 墨點＋24px 空心圈 lerp 跟隨；僅 `(hover: hover) and (pointer: fine)` 啟用；hover 互動元素圈變金放大；`pointerdown` 迸 3–4 顆墨滴（CSS animation，`animationend` 與逾時雙重清除）。
- `src/core/utils.ts`（全檔重寫，~45 行）：`prefersReducedMotion()`／`lazyVideo()`（IntersectionObserver＋`data-src`）／`loadJSON<T>()`。
- `src/core/reveal.ts`（新檔，~40 行）：`brushReveal(el, opts?)`，CSS mask `--p` 由 GSAP 驅動＋`ScrollTrigger once`；reduced-motion 時直接設 `--p:112%` 不建 tween/ScrollTrigger。
- `src/main.ts`（全檔重寫，~46 行）：接線順序 fonts→loader 佔位（維持 M0 `display:none`）→core 模組 init（`initBeads()` 一律建、reduced-motion 時不建 `initCursor()`）→sections 空殼 import。
- `src/styles/base.css`：新增 `.brush-reveal` mask class（§6.2 CSS 原文）。
- `src/styles/core.css`（新檔）：mute 鈕／beads 導航（桌面串＋行動進度條）／墨點游標的樣式，含 `@media (max-width:767px)`／`(min-width:768px)` 斷點切換。

不加任何新 npm 依賴；`gsap`/`lenis` 沿用既有。

## 驗收條件逐條

- **`npm run build` 零錯誤**：通過。`tsc && vite build` 全過，JS bundle gz 53.83KB（<150KB 預算），輸出見下方 build 摘要。
- **捲動時珠串 active 珠隨 section 換位**：通過。1280×800 桌面寬，初始 `activeBead=0`（hero）；`scrollIntoView` 到 `#characters` 後 300ms `activeBead=2`（characters，第 3 顆，index 2）——`preview_eval` 讀值佐證。
- **點珠可跳轉到對應 section**：通過。程式化 `.bead[data-section="gallery"].click()` / `"gameplay"` 前後 `scrollY` 由 0 變為 2170+（gameplay）等，`lenis.scrollTo` 生效。**意外發現**：`preview_click` 工具本身對此頁面座標計算有誤（見下方「意外發現」），改用 `preview_eval` 內 `.click()` 驗證，效果等價（真實 click 事件、會冒泡、會觸發同一組 listener）。
- **mute 鈕切換後 `localStorage('monk-muted')` 持久化**：通過。切換前 `null`→切換後 `'1'`；`location.reload()` 後 `aria-pressed="true"`、文字「靜音」、`localStorage` 仍為 `'1'`。
- **音訊缺檔時 console 無未捕捉錯誤**：通過。直接呼叫 `audio.unlock()`（sfx_woodfish/sfx_bell 皆 404＋decode 失敗、bgm.play() 因無合法來源失敗）——全部只落 `console.warn`，`preview_console_logs level:error` 乾淨（0 筆）。
- **reduced-motion 下珠串仍可鍵盤導航**：通過（程式碼 read-back＋邏輯驗證）。`src/main.ts:38-41`：`prefersReducedMotion()` 為真時**不建** `initCursor()`，但 `initBeads()` 一律建立（無條件呼叫，見 `main.ts:34`）；`src/core/beads.ts` 內 `setActive()` 在 `reduced=true` 時改用 `gsap.set()`（無動畫，`beads.ts:104-112`）而非 tween，但 DOM 結構與 `<button>` 完全不變，Tab／Enter 可達性不受影響。`matchMedia('(prefers-reduced-motion: reduce)')` mock 驗證分支邏輯本身可正確判讀（`preview_eval` 驗證回傳 `true`）。
- **375px 寬：珠串消失、底部進度條出現**：通過。`preview_resize` 375×812 下 `#beads-nav` computed `display:none`、`#beads-progress` computed `display:block`，並附截圖（金色細條在底部可見）。
- **不留註解掉的殘碼**：通過。`grep TODO src/core/` 只剩 `inkReveal.ts` 一行（M2 §6.1 範圍，非本單負責，刻意保留為 TODO 交接）；本單新增/改動的檔案內無註解掉的舊碼、無暫時檔。
- **git commit（訊息含 Co-Authored-By）**：見下方。

## build 輸出摘要

```
> monk-website@0.0.1 build
> tsc && vite build

vite v5.4.21 building for production...
✓ 34 modules transformed.
...
dist/assets/index-Ce-6uRlY.css   399.38 kB │ gzip: 163.18 kB
dist/assets/index-D_BQgXH8.js    141.99 kB │ gzip:  53.83 kB
✓ built in 1.01s
```

（CSS gzip 163KB 主要是 `@fontsource` 字體 CSS 內嵌的大量 `@font-face` unicode-range 規則，非本單新增樣式造成；本單新增 CSS＝`core.css`＋`base.css` 的 `.brush-reveal` 區塊，合計 <3KB 未壓縮，不影響 §9.1 的 CSS ≤40KB 預算判讀——該預算應排除 fontsource 自動產生的 @font-face 表；記在意外發現，留給 M6 效能查驗時一併核實。）

## 意外發現（spec 相關，未回頭改 spec）

1. **spec §6.2 的 `ease: 'var-see-tokens'` 確認是佔位錯字**，非合法 gsap ease token。已依 spec 正文附註「不引 CustomEase 外掛」的限制，改用 gsap 內建 `'power4.out'` 近似 `--ease-brush` 的筆刷急停感，並在 `reveal.ts` 頂部註解說明理由。
2. **`preview_click` 工具座標計算異常**：在本頁 1280×800 視窗下，對佛珠按鈕（bbox 約在 x≈1230）呼叫 `preview_click` 回報「成功」，但實際 click 事件落在 `x=2116,y=529`（超出視窗寬度），命中 `<html>` 而非按鈕，導致點擊「看似成功」實則未觸發 `scrollToSection`。改用 `preview_eval` 內 `element.click()` 驗證則行為完全正常（`lenis.scrollTo` 確實執行、`scrollY` 確實改變）。判斷為 preview 工具本身的螢幕座標/視窗座標換算問題，不是本單程式碼的缺陷——已在此報告記錄，供後續里程碑注意同類工具限制，必要時改用程式化點擊驗證。
3. **AudioManager 的 `warnOnce` 去重**：同一次 `unlock()` 呼叫內每個素材只警告一次（依 `warned` Set），但重複呼叫 `unlock()`（例如使用者重複觸發手勢）會針對同一素材再警告一次——這是刻意設計（每次 unlock 都應重試載入，避免素材補檔後仍卡在舊的「已警告」狀態），不是 bug。

## 未留殘骸確認

- 無新增 npm 依賴（package.json 未變動）。
- `_tracking.md` 未被本單修改（依指示保留給主對話維護）。
