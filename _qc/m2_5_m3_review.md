# M2.5 + M3 Fresh Review（2026-07-07）

審查者：fresh reviewer（未參與施工），對照 commit `d517e52`（M2.5）與 `46d5929`（M3）＋
spec `2026-07-06-website-interactive-spec.md` §5.2/§5.3/§6.5/§9。方法：逐檔 read-back＋
`npm run build` 實跑＋`preview_eval`/`preview_console_logs`/`preview_resize` 實測（非憑截圖臆測）。
最後才對照 `_qc/m2_5_report.md`、`_qc/m3_report.md`（自評報告）找落差。

---

## 總判定

- **M2.5（suminagashi Hero 背景）：通過**。0 blocking findings，1 項低嚴重度觀察（見下）。
- **M3（Story 絵巻）：有條件通過**。核心機制（pin/scrub/視差比例/斷點退化/資料驅動）全部實測通過；
  發現 2 項真實落差——(1) 前景立繪 `width`/`height` 屬性與實際圖檔不符造成潛在 CLS；
  (2) 行動版/reduced-motion 退化路徑遺漏鐘 SFX。兩項皆不影響核心 pin+scrub 機制、皆為小範圍修正，
  不需退回重做。

---

## M2.5 Checklist 逐條

| 條件 | 結果 | 證據 |
|---|---|---|
| WebGL2 優先退 WebGL1 half-float，皆不可回 null | ✅ | `src/core/suminagashi.ts:294-329`（`createGL`）：WebGL2 缺 `EXT_color_buffer_float`/`_half_float` → `return null`；WebGL1 缺 `OES_texture_half_float` → `return null`。FBO 建立失敗（`initSimFBOs`/`initDyeFBO`）亦 `return null`（:532-535） |
| ping-pong FBO、pass 順序正確 | ✅ | `step()`（:649-721）順序＝advect velocity→curl→vorticity→divergence→pressure clear+Jacobi(22 次)→gradient subtract→advect dye，與 spec 一致；`DoubleFBO.swap()`（:465-480）ping-pong 正確 |
| sim 半解析度 ≤512、行動 ≤256 | ✅ 實測 | 桌面 `console.info` 讀到 `WebGL2 sim 512x323`；375px 讀到 `sim 118x256`（`SIM_MAX_MOBILE=256`，:28） |
| IntersectionObserver 離屏暫停 | ✅ 實測 | `?fluid=debug` 下 `window.__fluidStats.frames` 卡在 162 持續 scrollY=6000（hero 離視口）2s 不動，滾回頂部後恢復遞增至 1202——確認暫停/恢復皆正確 |
| fps<30 降解析度 | ✅（程式碼審視） | `frame()`（:778-828）EMA fps 連續 2s < `FPS_FLOOR`(30) 才 `halved=true` 觸發一次 `initSimFBOs()`；本機桌面/行動實測 fps 均 >100，未觸發此分支屬正常（門檻情境需刻意降效能才能重現，M2.5 報告已用獨立計數器驗過邏輯） |
| `initSuminagashi(container)` 回 handle 或 null | ✅ | 介面簽名 `:336`；成功回傳 `{canvas, destroy()}`（比 spec 介面多帶 `canvas` 供 hero.ts 接 scrub，屬合理擴充非違規） |
| canvas `pointer-events:none`、事件監聽 container | ✅ 實測 | `preview_inspect` 讀 `.suminagashi-canvas` computed `pointer-events: none`；程式碼 `container.addEventListener(...)`（:618-622），非 canvas |
| 沒有動 index.html | ✅ | `git show d517e52 --stat` 只有 3 檔：`suminagashi.ts`/`hero.ts`/`hero.css` |
| `?fluid=off` 或 WebGL null → poster 靜態背景無 error | ✅ 實測 | 導覽至 `?fluid=off`：`canvasExists:false`、`heroHasFluidClass:false`、poster `display!=none`、shade `display:block`；`preview_console_logs(level:'error')` 回「No console logs」 |
| hero 回歸：lightbox 開/Esc 關、CTA、scroll scale scrub | ✅ 實測 | click `.hero-pv-btn` → `box.hidden:false`、焦點在關閉鈕、`body.style.overflow:'hidden'`；`Escape` → `hidden:true`、焦點還給 PV 鈕、overflow 清空。滾動 50% 高度：`.hero-bg` 與 `.suminagashi-canvas` 同步 `scale(0.96)`（matrix 0.96,0,0,0.96） |
| 實跑視覺：絲狀大理石紋、緩慢優雅、三色墨黑/朱紅/藍灰、紙白底 | ✅ 截圖確認 | 開場三滴（`:867-874`）分別呈現墨黑/朱紅/藍灰三色暈染，紙白底（`--paper` #f2ead8）；拖曳互動後可見暈染持續擴散、無螢光感，符合「水面墨」觀感。前景 logo 在 `hero--fluid` 態下 computed color `rgb(20,18,15)`（墨黑），對比清楚 |
| `?fluid=debug` 之外無全域洩漏 | ✅ 實測 | 無 query 時 `typeof window.__fluidStats === 'undefined'`；`?fluid=debug` 下才存在，`destroy()` 亦有 `delete window.__fluidStats`（:905） |

**M2.5 findings：0 blocking。**

觀察（非 finding，供參考）：console 有 `console.info('[suminagashi] ...')` 訊息（非 error/warn），
每次 init 都印一行；長期看頁面若重複 mount/unmount 會累積 info log，但不影響「console error 乾淨」
驗收條件（該條只看 error 級），不構成問題。

---

## M3 Checklist 逐條

| 條件 | 結果 | 證據 |
|---|---|---|
| pin+scrub 與 spec §5.3 模式一致 | ✅ | `story.ts:70-92`（`initDesktopScroll`）與 spec 範例程式碼結構一致（`ScrollTrigger.create` + `pin` + `scrub:0.5` + `onUpdate` 逐層 `gsap.set(x)`） |
| 三層 data-speed 0.4/0.7/1.0 實測比例（兩個 scroll 位置） | ✅ 實測 | 1440px 寬，progress=0.5：far=-864、mid=-1512、fg=-2160 → -864/-2160=**0.4**、-1512/-2160=**0.7**（精確）。progress=1.0：far=-1728、mid=-3024、fg=-4320=-(1440×3) → 比例同樣精確、無漂移 |
| progress=1 最快層走完不漂 | ✅ 實測 | fg=-4320 恰為 `-(innerWidth×3×1.0)`，`spacerHeight`(5220)=舞台高(900)+總橫移(4320)，數值自洽 |
| 文案卡 4 張、brushReveal＋SFX 節流（read-back 節流 flag） | ✅（桌面）／⚠（行動版缺 SFX，見 Finding 1） | `index.html` 內 4 個 `.story-card[data-card=0..3]`；`story.ts:36-54` `played` Set 節流一次；桌面 `triggerCard()` 呼叫 `audio.sfx('sfx_bell')`（:52，程式碼中唯一呼叫點，`grep` 確認） |
| strings.json 有 storyCards＋`_todo` 鍵 | ✅ | `src/data/strings.json:3-9`：`storyCards`（4 條）+ `_todo` |
| 375px：無 pin-spacer、直向排列、scrollWidth=375 | ✅ 實測 | `hasPinSpacer:false`、`body.story-mobile-fallback`、`document.documentElement.scrollWidth===375`（同一次 eval 內讀值，排除多分頁污染） |
| reduced-motion 分支 read-back 行號 | ✅（程式碼審視，非即時系統模擬） | `story.ts:109-115`：`prefersReducedMotion()` 為真 → 直接 `initMobileFallback()` + `story-mobile-fallback` class，與行動斷點共用同一退化函式（已實測驗證行動路徑，reduced-motion 走完全相同程式碼路徑，僅觸發條件不同，未用 OS 級模擬工具重複驗證） |
| gsap.matchMedia 跨斷點不留殘 spacer | ✅ 實測 | 桌面(1440)→行動(375) resize：`hasPinSpacer` true→false，`story-mobile-fallback` 加上；行動→桌面 resize 回去：`hasPinSpacer` false→true，class 移除，雙向皆乾淨 |
| tsconfig 只加了 resolveJsonModule | ✅ | `git show 46d5929 -- tsconfig.json`：唯一一行 `+ "resolveJsonModule": true,` |
| story.ts 用靜態 JSON import 非 loadJSON | ✅ | `story.ts:19` `import strings from '../data/strings.json'`，非 `loadJSON()` |
| 佔位圖：story_mid.webp ≤600KB、有 data-placeholder 標記 | ✅ | 檔案 571,448 bytes＝558KB＜600KB；`index.html` `.story-layer-mid` 有 `data-placeholder` 屬性 |

**M3 findings：2 項（皆非阻斷性）。**

---

## Finding 清單（按嚴重度）

### Finding 1（低-中）：行動版／reduced-motion 退化路徑遺漏鐘 SFX

- **位置**：`D:\monk\website\src\sections\story.ts:97-102`（`initMobileFallback`）
- **情境**：spec §5.3 敘述「文案卡進入視口中央時筆刷揭示＋鐘 SFX（節流：每卡一次）」是整節的互動描述，未區分桌面/行動。桌面路徑 `triggerCard()`（:43-54）同時做視覺揭示與 `audio.sfx('sfx_bell')`；但 `initMobileFallback()` 直接呼叫共用元件 `brushReveal()`（`core/reveal.ts:27-47`），該共用元件本身不含音效邏輯。`grep "audio\." src/sections/story.ts` 確認全檔僅 1 處呼叫 `audio.sfx`，且只在桌面分支的 `triggerCard` 內。
- **實測**：375px 寬度下捲動使 4 張卡全數 `--p:112%`／`brush-reveal` 加上，但程式路徑不含任何 `audio.sfx` 呼叫（桌面版才有）。
- **影響**：行動版與 reduced-motion 使用者（後者常見於偏好無動畫但仍需其他感官提示的使用情境）不會聽到鐘聲，體驗與桌面不一致；不影響核心視覺／捲動機制、不算功能性 bug。
- **建議**：`initMobileFallback` 內對每卡也呼叫 `triggerCard` 的音效部分（或抽出 `playCardChime(card)` 供兩路徑共用），約 3-5 行改動。

### Finding 2（低）：`story_fg_wujie.webp` 的 `width`/`height` 屬性與實際圖檔不符，構成潛在 CLS

- **位置**：`D:\monk\website\index.html`（`#story` 段內 `<img src="/media/img/story_fg_wujie.webp" alt="" width="614" height="1200" ...>`）；圖檔 `D:\monk\website\public\media\img\story_fg_wujie.webp` 實際為 **720×1200**（`file`/PIL 皆確認），非標記的 614×1200。
- **情境**：`story.css:100-104` 對該 img 設 `height:100%; width:auto`，瀏覽器在圖片載入前依 HTML `width`/`height` 屬性算出 `aspect-ratio`（`preview_inspect` 讀到 computed `aspect-ratio: auto 614 / 1200`），但圖片載入後依 `width:auto` 用**實際**比例（0.6＝720/1200）重新計算寬度，導致載入完成瞬間寬度從 334.8px 跳到實際渲染寬度（335px 太接近未必肉眼可見，但概念上這條路徑確實會在慢網路/大圖情境下造成 layout shift，違反 spec §9.1「CLS<0.1（所有 img/video 寫 width/height 或 aspect-ratio）」的精神——寫了但寫錯值，等於沒寫）。
- **影響**：本例因為兩個比例數值接近（0.512 vs 0.6），實測 `attrWidth:335` vs 若照實際比例算應為 `558*0.6=334.8`，數值上幾乎沒有可觀察位移，故对 Lighthouse CLS 分數的實際危害极小；但這是「屬性值與素材不符」的既有錯誤，資產替換為正式絵巻圖時若新圖比例差異更大，會放大此問題。
- **建議**：`width` 屬性改為 `720`（或直接移除 `width`，只留 `height` + CSS `width:auto`，讓瀏覽器完全依賴 CSS 而不必猜）。

---

## 沒能驗證的部分

- **DevTools Performance 61.66Hz/50ms long-task 詳細分析**：本次用 `preview_eval` 注入 rAF 計數器粗測 fps（間接複驗兩份自評報告的桌面/375px fps 數字量級合理，>100fps），未跑真正的 Chrome DevTools Performance trace 量測 long task；spec §5.3 驗收「主執行緒無 >50ms long task」需要開發者工具在真實瀏覽器環境録製，非 headless preview_eval 能完全模擬，予以標注未驗證。
- **`prefers-reduced-motion` 的即時系統級模擬**：`preview_resize` 工具只提供 `colorScheme` 模擬參數，無 `prefers-reduced-motion` 模擬開關；本項僅以程式碼 read-back 確認邏輯路徑與已驗證的行動版路徑相同（`initMobileFallback` 共用），未做即時瀏覽器模擬驗證。
- **Lighthouse Performance/Accessibility/Best Practices 分數（§9.1 硬指標）**：未在本次審查範圍內執行（M6 收尾才會做全站 Lighthouse，非 M2.5/M3 單項驗收條件）。
- **fps<30 降級分支的即時觸發**：本機環境效能遠高於門檻（>100fps），無法在合理時間內自然觸發「連續 2s<30fps 砍半解析度」分支，僅完成程式碼邏輯審視（uniform 命名、呼叫序、`halved` 旗標一次性判斷皆正確）。

---

## 意外發現（審查過程中，供參考不影響判定）

1. Preview 工具環境有多分頁殘留（同一 serverId 下 console 出現多倍 `[vite] connected.`、`[suminagashi] init` 重複訊息），與兩份自評報告記錄的「意外發現」一致；本次審查改用「同一次 eval 內完成所有讀值＋操作」的方式繞開，未讓污染影響任何驗收數據。
2. `_qc/m2/` 目錄（`ink_h.png` 等）為更早的 M2 里程碑遺留產物，非本次 M2.5/M3 產出，不在審查範圍內，僅在 `git status` 中順帶看到。
3. 另一 agent 並行施工 M4（`index.html` 的 `#characters`／`characters.*`）在本次審查期間持續修改，已依指示完全不觸碰、不評論其內容；本報告所有 index.html 相關驗證均錨定 `#story`／`#hero` 區塊內容而非行號。
