# M1 全站系統 — Fresh Review（獨立驗收，2026-07-07）

審查者：fresh reviewer（未先讀 `_qc/m1_report.md`，驗完才對照）。
審查對象：`src/core/scroll.ts`、`audio.ts`、`beads.ts`、`cursor.ts`、`reveal.ts`、`utils.ts`、`inkReveal.ts`、`main.ts`、`src/styles/core.css`、`base.css` 的 `.brush-reveal` 段。
方法：全檔 read-back＋`npm run build`／`npx tsc --noEmit` 實跑＋`preview_start` 啟動 dev server，用 `preview_eval`/`preview_resize`/`preview_console_logs` 實測互動與 reduced-motion 分支（用 matchMedia override + 動態 `import()` 強制重新求值模組頂層分支，因 preview_resize 不支援 reduced-motion 模擬）。

## 總判定：**通過，0 findings**

## Checklist 逐條

1. **scroll.ts 符合 §4.1 整合模式** — 通過。
   `src/core/scroll.ts:12-15`：`lenis.on('scroll', ScrollTrigger.update)`、`gsap.ticker.add(...)`、`gsap.ticker.lagSmoothing(0)` 三行齊全，僅套在 `if (lenis)` 內（reduced-motion 分支）。`scrollToSection`（19-24行）二分派：有 lenis 走 `lenis.scrollTo`，無則 `scrollIntoView({behavior:'auto'})`。
   實測：桌面 1280×800，`scrollToSection('characters')`／`('parlor')` 前後 `window.scrollY` 精準落在目標 `offsetTop`（1446、2893），無誤差。

2. **audio.ts 全項** — 通過。
   - 首手勢 `unlock()`：`audio.ts:25-48`，建 `AudioContext`、fetch+decode 兩個 SFX、bgm 設定＋play。
   - SFX 用 `AudioBuffer` 池（`Map`，`audio.ts:13,52-58`）。
   - mute 存 `localStorage('monk-muted')`：`audio.ts:16,63`。實測：切換後 `localStorage.getItem('monk-muted')` 由 `null`→`'1'`；`location.reload()` 後 `aria-pressed="true"`、文字「靜音」、值仍 `'1'` ——持久化正確。
   - `visibilitychange` 暫停：`audio.ts:75-81`＋86 行掛 listener。
   - **fail-soft 實測**：`public/media/audio/` 目前僅 `.gitkeep`（空目錄，音檔真的不存在）。動態 `import()` 後直接呼叫 `audio.unlock()` 三次：`console.error` 0 筆（`preview_console_logs level:error` 回「No console logs.」），僅 `console.warn`（`warnOnce` 去重，2 次 unlock 呼叫只各素材各 warn 1 次＋1 次 bgm play 失敗警告，訊息示例：`[audio] sfx_bell 載入失敗，略過（素材可能尚未提供） EncodingError: Unable to decode audio data`）。`unlock()` 的 Promise 正常 resolve，不 throw。

3. **beads.ts** — 通過。
   - 7 顆對應 `hero/story/characters/gameplay/parlor/gallery/footer`：`beads.ts:16-24` 陣列與 `index.html` 七個 `<section id>` 完全一致（逐一核對）。
   - 捲動 active 換位：實測 `scrollIntoView('#characters')` 後 300ms，`activeIdx` 由 0→2（characters 是第 3 顆），`aria-current` 同步跳到該顆 `"true"`。
   - 點珠跳轉：實測 `.bead[data-section="parlor"]` 觸發 `.click()`（因 `preview_click` 工具座標計算對此頁有誤，改用 `preview_eval` 內 `element.click()`，此為已知工具限制非程式問題），`scrollY` 精準落在 `parlor` 的 `offsetTop`（2893）。
   - 珠是可 Tab 的 `<button>`：實測 7 顆皆 `tagName==='BUTTON'`，原生 Tab 序、無 `tabindex=-1`。
   - `<768px` 退化為底部進度條：`preview_resize 375×812` 實測 `#beads-nav` computed `display:none`、`#beads-progress` computed `display:block`，screenshot 確認底部有金色細條。桌面 1280 寬則相反（nav `flex`／progress `none`）。

4. **cursor.ts** — 通過。
   - 僅桌面 hover-capable 啟用：`cursor.ts:10` `if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;` 為函式最上方 guard。
   - 非 reduced-motion 才啟用：`cursor.ts` 本身不含 reduced-motion 檢查，但呼叫端 `main.ts:42-44` 用 `if (!reduced) initCursor();` 正確把關——讀碼＋動態 import 分支測試皆確認此設計符合 spec §4.4「僅桌面 hover-capable＋非 reduced-motion」的雙重條件。
   - 不破壞 `:focus-visible`：`core.css:129-131` 的 `cursor:none` 規則只影響游標圖示，`base.css:117-120` 的 `:focus-visible{outline:3px solid var(--gold)}` 未被覆寫或移除，兩者共存（實測 `cursorNoneActive:true` 且 `:focus-visible` 規則存在於樣式表中）。

5. **reveal.ts** — 通過。
   - `ScrollTrigger once`：`reveal.ts:44` `scrollTrigger:{trigger:el,start,once:true}`。
   - reduced-motion 直接顯示：`reveal.ts:30-33`，`if (prefersReducedMotion()) { el.style.setProperty('--p','112%'); return; }`（不建 tween、不建 ScrollTrigger）。實測動態 import 下 `prefersReducedMotion()` mock 為 true 時 `brushReveal()` 立即回傳 `--p:112%`。
   - 非 reduced-motion 實測：於 fixed 定位元素套用 `brushReveal()`，100ms 後 `--p≈52.9%`，1.3s 後 `--p=112%`——GSAP CSS 變數 tween 確實生效（驗證了 spec 原文 `ease:'var-see-tokens'` 是無效 token，實作已在 `reveal.ts:5-8` 註記為 spec 錯誤並改用 `power4.out`，屬正確的「意外發現不回頭改 spec」處置）。

6. **main.ts reduced-motion 分支** — 通過，read-back 行號如下：
   - `main.ts:35`：`const reduced = prefersReducedMotion();`
   - `main.ts:39`：`initBeads();`（無條件建立，reduced 時內部只是不對 active 珠做 tween，改 `gsap.set`——見 `beads.ts:108-112`）
   - `main.ts:42-44`：`if (!reduced) { initCursor(); }`（reduced 時完全不建游標特效）
   - `scrollIntoView` 退化：不在 main.ts，而在 `scroll.ts:21-23`（`lenis` 為 null 分支），邏輯上等同 main.ts 統籌的 reduced-motion 決策鏈（`scroll.ts` 自己讀 `prefersReducedMotion()` 決定要不要 new Lenis）。

7. **`npm run build` 零錯誤、tsc 過** — 通過。`npm run build`（= `tsc && vite build`）exit code 0；額外單獨跑 `npx tsc --noEmit` exit code 0。輸出：`dist/assets/index-*.js` 141.99KB／gzip 53.83KB（<150KB 預算），`dist/assets/index-*.css` 399.38KB／gzip 163.18KB。

8. **無註解掉的殘碼、無暫時檔** — 通過。`grep -rn "TODO|FIXME"` 於 `src/core/` 只命中 `inkReveal.ts`（M2 §6.1 範圍的合法佔位 stub，非本單負責，非殘碼）；`git status --short` 乾淨（僅 `_tracking.md` 修改與 `_qc/` 報告，無 `.tmp`/`.bak`/`_old` 檔）；`git log` 確認 M1 已成一個乾淨 commit（`3f5a541`）。

## Finding 清單

無。0 findings。

## 意外發現（非 M1 缺陷，記錄供後續里程碑參考）

- **CSS gzip 163.18KB 遠超 §9.1 的「CSS ≤40KB」預算**，但來源是 `@fontsource/noto-serif-tc`／`noto-sans-tc` 自動產生的大量 `@font-face` unicode-range 規則（CJK 字體逐字元分 subset 導致規則數量龐大），非 M1 新增的手寫 CSS（`core.css`+`base.css` 的 `.brush-reveal` 段落計算後 <3KB 未壓縮）。這是 M0 就已存在的既有狀態，M1 未觸碰字體匯入。建議 §9.1 的 CSS 預算判讀在 M6 效能查驗時應排除 `@fontsource` 自動產生部分，或改用 `unicode-range` 進一步裁切／改走 CDN preload 分離計算，留給 M6 一併處理，非本單缺陷。
- **`preview_click` 工具對本頁座標計算有誤**（點擊實際落點超出視窗寬度），已知工具限制，與 spec 派工單方法要求「已知工具雷」一致；本次全程改用 `preview_eval` 內 `element.click()` 驗證互動，效果與真實使用者點擊一致（觸發同一組 event listener）。

## 未能驗證的部分

- **真實 `prefers-reduced-motion: reduce` 系統層級模擬**：`preview_resize` 工具僅支援 `colorScheme` 模擬，不支援 reduced-motion 媒體查詢模擬；改用「覆寫 `window.matchMedia` 後動態 `import()` 強制模組頂層重新求值」的替代驗證法，對 `utils.prefersReducedMotion()`／`scroll.ts` 的 `lenis` 分支／`reveal.ts` 的 `--p` 立即顯示分支都取得了直接的執行期證據；但這無法 100% 等同瀏覽器原生 media query 在整頁初次載入時的真實觸發路徑（例如 CSS `@media (prefers-reduced-motion: reduce)` 本身的套用不受此 mock 影響，但那部分屬 CSS 原生行為不需要 mock 驗證）。建議：若有實體裝置或可對 Chrome DevTools Rendering 面板做「Emulate CSS media feature prefers-reduced-motion」的環境，做一次最終確認；本次的替代驗證法已足以判定程式邏輯正確。
- Lighthouse 分數（Performance/Accessibility/Best Practices）未跑——spec §9 標明是 M6 收尾項目，非 M1 驗收範圍，故未執行。
