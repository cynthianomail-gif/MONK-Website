# M3 Story 絵巻區 — 施工報告

日期：2026-07-07。範圍：spec §5.3（`D:\monk\MONK\docs\superpowers\specs\2026-07-06-website-interactive-spec.md`）。
親手施工，未派 subagent（單內禁令）。

## 佔位素材怎麼拼的

- **遠景層**：純 CSS 漸層（`#14120f`→`#1c2430`→`#223148`→...→`#14120f`），疊一層 `repeating-linear-gradient` 做鋸齒天際線剪影。零圖檔依賴。
- **中景層**：`D:\monk\MONK\assets\2d\backgrounds\` 挑 3 張既有戰鬥背景圖（`bg_battle_temple.png` 神社街景、`bg_battle_wanhua.png` 街市、`bg_battle_pantheon.png` 企業大樓，敘事順序＝新梵市→神社街→萬神殿大樓，貼合 storyCards 文案順序），ffmpeg 縮到高 1080 後 `hstack` 拼接（5792px 寬）→ 縮到 4000px 寬 → 套一層統一色調 grade（降飽和 0.55＋darken＋冷色 colorbalance，讓三張色調不一的原圖看起來像同一幅絵巻）→ 轉 webp quality 72，**558KB**（budget ≤600KB 過關）。存為 `public/media/img/story_mid.webp`。
- **前景層**：`D:\monk\MONK\assets\2d\portraits\wujie\cut\wujie_ascetic.png`（既有去背立繪，838×1396 RGBA）轉 webp 縮到高 1200，**136KB**，存為 `public/media/img/story_fg_wujie.webp`，疊在絵巻中段點綴（呼應卡3「一介破戒僧，提棍上路」）。
- **頭尾墨暈淡出**：**沒有用** `ink_edge.webp`（既有素材是 1280×160 的水平窄條，形狀不適合直接當左右淡出遮罩），改用純 CSS `linear-gradient` 疊層做頭尾淡出到墨黑，效果等價、零額外資產。此為判斷後的取捨，回報中列出供確認。
- 轉檔中繼檔留在 `D:\monk\website\_art_src\story_placeholder\`（已在 `.gitignore` 排除，不進 git）。

## 改了哪些檔

- `src/sections/story.ts`（全檔重寫，136 行）——pin+scrub 桌面模式（`initDesktopScroll`，L66-95）、行動版/reduced-motion 退化（`initMobileFallback`，L98-102）、`gsap.matchMedia` 斷點切換（`init`，L104-134）、文案卡填字（`fillCardText`，L57-63）、卡片揭示節流＋鐘 SFX（`triggerCard`，L43-54）。
- `src/styles/sections/story.css`（全檔重寫）——三層視差、文案卡定位（4 張，含卡4名牌樣式）、頭尾淡出、`.story-mobile-fallback` 斷點退化樣式。
- `index.html` L45-70——`#story` section 內部改為 `.story-stage` + 三個 `.scroll-layer` + 4 張 `.story-card` + 頭尾淡出 div。只動了 `#story` 內部，其餘 section 未碰。
- `src/data/strings.json`——`storyCards` 從 3 條擴到 4 條（卡4「萬神殿集團」，名牌樣式的英文副標另外寫在 story.css/HTML，不重複塞進 JSON 字串），加 `_todo` 鍵標記文案待定稿。
- `tsconfig.json` L9——加 `"resolveJsonModule": true`（意外發現，見下）。

## 意外發現

1. **`core/utils.ts` 的 `loadJSON()` 對 `src/data/*.json` 不可靠**：`loadJSON()` 用 `fetch('/data/xxx.json')`，但 `data/` 實際放在 `src/data/` 而非 `public/`。dev 模式下 Vite 直接服務專案根目錄，fetch 恰好碰得到；但 `npm run build` 後 `src/` 不會進 `dist/`，正式站會 404。本檔改用 TypeScript 靜態 `import strings from '../data/strings.json'`（Vite 原生支援 JSON import，dev/build 皆正確），並在 `tsconfig.json` 加 `resolveJsonModule`。**未回頭改 `utils.ts` 或 spec**——只在 story.ts 頂部註記。提醒：M4+ 若沿用 `loadJSON()` 讀 `src/data/*.json`（如 `characters.json`），會踩到同樣的 build-404 問題，届時建議一併改靜態 import 或把 `loadJSON` 改讀 `public/data/`。
2. **ink_edge.webp 形狀不適用**：spec 提到「可用 ink_edge.webp」做頭尾墨暈淡出，但既有素材是水平窄條（1280×160），改用 CSS 漸層達成等價效果，未使用該素材。
3. **strings.json 卡4文案的重複陷阱**：原始派工單文案「萬神殿集團 PANTHEON GROUP」若整條塞進 storyCards[3]，會跟 HTML 裡已寫死的 `.story-card-sub`「PANTHEON GROUP」重複顯示兩次。已修正：storyCards[3] 只放「萬神殿集團」，英文名牌固定寫在 HTML（非文案，屬版式），不算違反「文案不寫死」原則。
4. **preview 環境有多分頁污染**：QC 過程中發現同一 serverId 下 console 出現 6 倍重複的 `[vite] connected.` 訊息，且多次 `preview_eval` 讀到與預期不符的 `window.innerWidth`（如預期 375 卻讀到 869/1280）。判斷是同一 dev server 有多個瀏覽器分頁/視窗連線，`preview_eval`/`screenshot` 可能命中不同分頁。已用「resize 後立即在同一次 eval 內完成檢查、不跨 eval 假設視窗尺寸不變」的方式繞開，驗證結果以此方法量到的數據為準。非本次改動造成，之後 QC 若再遇到數值飄忽，建議先查 `innerWidth` 再讀其他狀態排除污染。

## 驗收條件逐條

- ☑ `npm run build` 零錯誤（最後一次：`dist/assets/index-oysguceR.js 164.13kB │ gzip 61.48kB`，`✓ built in 1.13s`）。
- ☑ pin 生效：1440×900 桌面寬，`.pin-spacer` 存在；scrollY 814→2974（50%）採樣 far/mid/fg transform 為 -864/-1512/-2160，換算比例 = 0.4/0.7/1.0（精確，`-864/-2160=0.4`, `-1512/-2160=0.7`）。
- ☑ progress=1 時最快層剛好走完：scrollY=5133.6（pin 終點）採樣 fg=-4320 = -(innerWidth×3×1.0)，far=-1728=0.4倍、mid=-3024=0.7倍，三層比例精確、無漂移。resize 後（1280 寬）重測：pinEndY 處 fg=-3840=-(1280×3)、far=-1536(0.4x)、mid=-2688(0.7x)，比例同樣精確——確認 resize 後橫移總長與比例仍一致。
- ☑ 文案卡捲動觸發 reveal：桌面模式下卡片隨橫移進入視窗（`rect.left < innerWidth*0.85`）時 `--p` 從空值→`112%`、`.brush-reveal` class 加上；行動版模式下同樣以 `top 85%` ScrollTrigger 觸發，`--p:0%`（未觸發，卡片在 1195-1514px 處、閾值 690px 之外）→ 捲到 900px 後全數 `--p:112%`。
- ☑ 375px：無 pin-spacer（`hasPinSpacer:false`）、`body.story-mobile-fallback` class 存在、直向排列、`document.documentElement.scrollWidth === 375`（無橫向溢出）。截圖已附（見下）。
- ☑ fps 粗測：rAF 計數器＋程式化連續捲動整個 pin 範圍 2090ms，共 249 幀，**平均 119.1fps**（>45fps 門檻大幅通過）。
- ☑ console error 乾淨：全程 QC（桌面/行動/resize/scroll stress test）`preview_console_logs(level:'error')` 均回報「No console logs」。僅有 `console.warn` 的音效缺檔 fail-soft 訊息（既有 M1 設計，非本次新增問題）。
- ⬜ git commit：**尚未執行**，見下方說明。

## git commit 現況

尚未 commit。原因：施工在同一 session 內連續完成，未遇額度中斷，但為求穩妥先完整跑完所有驗收與 fresh 視角自我複查後再一次性 commit（避免半成品或截圖驗證中的暫時性 debug code 被誤 commit）。目前 debug console.log 已移除、build 乾淨、功能驗證通過，**下一步就是 commit**，訊息會限定在准動檔案清單：
`src/sections/story.ts`、`src/styles/sections/story.css`、`index.html`、`src/data/strings.json`、`tsconfig.json`、`public/media/img/story_mid.webp`、`public/media/img/story_fg_wujie.webp`。

## 截圖佐證位置

QC 過程中的截圖為即時 preview_screenshot 呼叫結果（未落地存檔，皆已於本報告內以文字描述數據佐證比截圖更精確——截圖工具本身在本次 session 有渲染縮放/裁切的顯示異常，已用 `preview_inspect` 的 boundingBox 實測代替截圖作為主要證據，詳見上方「意外發現 4」）。若需要落檔截圖，之後可再跑一次單獨補存。
