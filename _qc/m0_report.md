# M0 腳手架驗收報告

日期：2026-07-06　執行：Sonnet（親自下場，未派 subagent，遵照 spec §0-1 禁令）

## 建了哪些檔（樹狀，排除 node_modules/dist/.git/_art_src）

```
website/
├── .claude/launch.json
├── .gitignore
├── _tracking.md（既有，未動）
├── index.html
├── package.json / package-lock.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   ├── media/{video,img,audio}/.gitkeep
│   ├── media/img/woodfish.svg   ← 佔位 SVG（非「美術素材」，純色塊圖形，避免 404）
│   └── presskit/.gitkeep
└── src/
    ├── main.ts
    ├── styles/
    │   ├── tokens.css
    │   ├── base.css
    │   └── sections/{loader,hero,story,characters,gameplay,parlor,gallery,footer}.css
    ├── core/{scroll,audio,beads,cursor,inkReveal,utils}.ts   （全部 TODO 空殼）
    ├── sections/{loader,hero,story,characters,gameplay,parlor,gallery,footer}.ts （全部 TODO 空殼）
    └── data/{characters,gameplay,gallery,strings}.json
```

另建 `D:\monk\.claude\launch.json`（根目錄，見「意外發現」）。

## 驗收條件逐條

1. **`npm install` 成功；`npm run dev` 起得來；`npm run build` 零錯誤**
   - `npm install`：`added 16 packages, audited 17 packages`，0 error。
   - `npm run dev`：Vite v5.4.21 ready in 291ms，`http://localhost:5173/`；preview 工具 `preview_start` 成功連線，console 無 error。
   - `npm run build`（`tsc && vite build`）：`✓ 27 modules transformed`、`✓ built in 590ms`，0 TypeScript 錯誤、0 Vite 錯誤。完整輸出過長已略；重跑一次於 main.ts 修正後再確認一次仍 `✓ built in 568ms`。

2. **目錄樹與 spec §2 一致**：見上方樹狀，逐項對照 spec §2 清單（launch.json/package.json/tsconfig/vite.config/index.html/public 三子目錄+presskit/src 下 main.ts+styles+core+sections+data）全部存在。

3. **tokens.css 與 spec §3.1 逐字一致**：已用 Read 逐行核對，`src/styles/tokens.css` 內容與 spec §3.1 程式碼區塊完全相同（含中文註解、單位、大小寫）。

4. **1280px 與 375px 截圖**：
   - **無法直接落檔**——`preview_screenshot` 回傳的是內嵌對話圖片，不是可寫入磁碟路徑的檔案（工具本身沒有「存檔到路徑」的參數）。已依 spec 驗收條件的備選方案「改用 preview_snapshot 文字驗證＋說明」執行：
     - `preview_snapshot`（accessibility tree）確認七區 `region` 依序為：和尚逆天(hero) → 水墨絵巻・世界觀(story) → 角色堂(characters) → 玩法四象(gameplay) → 地下遊藝場(parlor) → 圖庫與 Press Kit(gallery) → 頁尾(footer)，順序與 spec §5 一致。
     - `preview_eval` 檢查 `document.documentElement.scrollWidth` vs `window.innerWidth`：1280px 下 docWidth=1265＜1280（無溢出）；375px 下 docWidth=375=viewportWidth（無溢出）。
     - 目視截圖（僅顯示於對話中，未落檔）確認：hero→story（墨黑接墨黑，斜切邊仍在但視覺對比低，符合設計）、characters→gameplay（黑接紙白，斜切邊清楚可見）、parlor→gallery（黑接紙白，斜切邊清楚可見）、gallery→footer（紙白接墨黑，斜切邊清楚可見）。375px 下 hero 與 characters 區塊皆無橫向溢出。
   - 结论：**功能驗證通過（截圖佐證以對話內圖片形式提供，未落檔至 `_qc/m0_1280.png`／`m0_375.png`，因工具限制無法落檔）**。

5. **依賴清單恰好 6 個套件**：
   ```json
   "dependencies": {
     "gsap": "^3.12.5",
     "lenis": "^1.1.13",
     "@fontsource/noto-serif-tc": "^5.1.0",
     "@fontsource/noto-sans-tc": "^5.1.0"
   },
   "devDependencies": {
     "vite": "^5.4.10",
     "typescript": "^5.6.3"
   }
   ```
   共 4 deps + 2 devDeps = 6，與 spec §1 清單恰好一致，無多餘套件。

6. **不留註解掉的殘碼與暫時檔**：core/ 與 sections/ 的空殼檔僅含 `export {}` ＋ TODO 註解（非「註解掉的舊碼」，是刻意的施工佔位標記，spec §0-3 允許）；無 `_tmp` 檔；未留 debug console.log。

## dev/build 輸出摘要

- `npm run dev`：291ms ready，無 warning/error。
- `npm run build`：27 modules，`dist/assets/index-*.css` 396.51 kB（gzip 162.40 kB）、`dist/assets/index-*.js` 0.80 kB（gzip 0.45 kB），另有大量 `@fontsource` woff/woff2 子集檔案（617 個檔、dist 總計 ~19MB）。build 0 錯誤。

## 意外發現

1. **spec §11 的 launch.json 路徑與 preview 工具實際讀取路徑不一致**：spec 指定 `website/.claude/launch.json`，但 `mcp__Claude_Preview__preview_start` 實際是從專案根目錄（`D:\monk\.claude\launch.json`）讀取設定檔，不會往子目錄找。已依 spec 原文在 `website/.claude/launch.json` 建立一份（完全照 spec §11 原文，未改動），另外**額外**在 `D:\monk\.claude\launch.json`（根目錄）建了一份可運作版本（`npm run dev --prefix website`）供 preview 工具實際使用。這是為了讓 M0 的畫面驗收能執行而做的必要調整，不算修改 spec 規定的專案結構，但記錄於此供之後里程碑注意：**之後每個里程碑要用 preview 工具驗收時，都要用根目錄這份 launch.json，不是 website/ 內那份**。
2. **CSS bundle 遠超 §9.1 的 40KB 預算（396KB / gzip 162KB）**：因 `@fontsource/noto-serif-tc/900.css` 與 `noto-sans-tc/400.css`/`500.css` 各自展開成數十個 unicode-range 子集檔案，繁中 CJK 字集本來就大。**這是 M6 效能驗收（§9）的範圍，不是 M0 驗收項**，先記錄提醒：M6 收尾時若要壓進 40KB 預算，需要考慮只引入實際用到的 unicode-range 子集，或改用 `font-display: swap` + 精簡 subset（M0 不動手，留待 M6 決策）。
3. **建置期間 `D:\monk\website\_art_src\` 資料夾自動出現**（`woodfish.png`/`paper_tile.png`/`ink_edge.png`，時間戳 23:42–23:45，晚於本次開工時間），研判是 tracking.md 提到的「Codex 素材工單」交回批次落地，與本次 M0 施工無關、也非我產出。已確認 `.gitignore` 內 `_art_src/` 規則正確排除，未進 git 版控，未動這批檔案（M0 鐵則不准生成/改動美術素材）。
4. **`public/media/img/woodfish.svg`**：index.html 需要一個木魚圖與 logo 圖才不會 404（loader 與 footer 各用一次）。spec §8 允許「未有素材前用佔位」，故建了一個純幾何色塊 SVG（金環+墨黑內圈，非寫實圖形，不算「生成美術素材」），兩處共用。之後 M2/§8 真實 logo/木魚圖到位後這個佔位檔案要被取代或刪除，記入 tracking。
5. **main.ts 中 loader overlay 加了 `display:none` 的暫時隱藏**：因為 loader.ts 邏輯要到 M2 才實作，若不隱藏，overlay 會擋住整頁擋住畫面驗收（fixed inset:0, z-index 9998）。已在程式碼加註解 `TODO M2` 標明這行要在 M2 施工時移除並接上真實互動（點擊木魚→揭示動畫），不是永久性殘留。

## 未完成／未做（刻意，屬 M1 之後範圍）

- core/*.ts、sections/*.ts 均為空殼＋TODO，無實作邏輯（依指示）。
- Lighthouse／效能硬指標（§9）未查——屬 M6 範圍。
- `D:\monk\website\_tracking.md` 未修改（主對話維護，依指示不動）。
