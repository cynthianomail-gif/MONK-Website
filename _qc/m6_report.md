# M6 Gallery + Footer + 收尾 施工報告（2026-07-09）

> **07-09 改版追記（使用者回饋）**：圖庫拿掉下載類 UI（press kit 條移除、zip 自 repo 刪除，
> staging 檔留在 session scratchpad 可隨時重打包）；瀑布流改**兩排反向自動滑動展示帶**
> （CSS marquee 雙份內容無縫循環、hover/鍵盤聚焦暫停、點圖照開 lightbox、複製份 aria-hidden
> 不進 tab 順序、reduced-motion 退靜態可橫捲）。實測：滑動推進（transform -931→-1740 跨呼叫
> 遞增）、focus-within 暫停（lightbox 關閉焦點還原時自動觸發，行為正確）、19+19 格、console
> 零錯、截圖過目。原第二節的瀑布流／press kit 記述視為歷史。
>
> **07-09 第二輪追記（使用者回饋：標題另取＋放十二神立繪＋整體設計感）**：
> ①圖庫定名「繪馬堂」（EMA GALLERY，四候選使用者拍板）②十二神區改版＝六神 16:9 splash
> 大卡（六尊有圖：ares/apollo/athena/hermes/poseidon/zeus，源檔 art_direction/.../gods/concepts
> 1672×941 → 1600w AVIF ~280KB/張；名牌＝名＋司掌 chip；點卡開單圖 lightbox＝gallery.ts 匯出
> openImageLightbox，is-single 藏導航）＋六格封印列照舊；**章節配置為佔位**（zeus=第12章主席
> 收尾、其餘 2–5 順排，characters.json `_todo_gods` 已註記待劇情定稿調整）③全站區標題設計
> 處理＝h2[data-en] 英文 overline（金）＋朱紅短刻線（base.css 通用，四區接上）④文案全面縮短
> （四象/遊藝場/繪馬堂 intro）＋展示帶左右邊緣淡出 mask＋縮圖墨框 hover 金框。
> 實測：6 神卡＋6 封印格渲染、單圖模式 → 鍵不切換、圖庫 19 張正常模式不受污染、焦點還原、
> console/network 零錯；角色堂與繪馬堂截圖已給使用者過目。

執行者：主對話親做（⚠親驗違例日：07-09 第二波 agent 額度死亡後，依 50-letter 踩坑守則本日不派 agent；
施工＋驗收皆主對話完成，額度充裕時可補嚴格 fresh review）。

## 一、M5 抽驗（開工前，接續上一 session 斷點）

preview_eval 實測：gameplay 4 卡（點擊展開＋3 行 points ✓）、parlor 6 櫃、木魚 overlay
開啟→tap×3→merit=3 落 localStorage→Esc 關閉＋焦點還原 ✓、console/network 零錯 ✓。M5 正式結案。

## 二、§5.7 Gallery + Press Kit

- **素材管線**：19 筆（15 遊戲截圖＋3 立繪＋key art 暫代）。候選 contact sheet 一次過目挑選
  （排除 debug 覆蓋／重複景／過暗圖）；ffmpeg libaom-av1 轉檔 → `public/media/img/gallery/`
  縮圖 AVIF 全部 ≤120KB（實測最大 65.9KB）＋全圖 AVIF（lightbox 用，最大 300KB）。
- **`src/sections/gallery.ts`**（全新）：瀑布流 `<button>` 承載縮圖（原生鍵盤可達、
  loading=lazy＋width/height 防 CLS、brushReveal 交錯進場）；自製 lightbox（`<dialog>` 原生
  focus trap）：←/→ 鍵與指標滑動（>40px）切換、循環索引、預載相鄰 1 張、Esc 統一走
  closeLightbox() 還原 lenis/捲動/焦點（同 characters modal 慣例）。
- **`src/data/gallery.json`**：19 筆 {thumb, full, alt, w, h}；加圖只改 JSON＋丟檔。
- **Press kit**：`public/presskit/monk_presskit.zip` **20.1MB（<40MB ✓）**＝fact_sheet.txt
  （開發者/引擎/類型/平台/釋出/聯絡；團隊名與信箱留 {待確認} 佔位，**未擅自放使用者 email**）
  ＋README＋截圖×10 原檔＋keyart_temp.png（poster 暫代；logo 透底等 Codex 第二批，README 註明）。
  index.html 下載連結去 data-todo 改 `download`。

## 三、§5.8 Footer

- **`src/sections/footer.ts`**（全新）：tagline／署名列全吃 strings.json（footerTagline/
  footerCredit——工具名列點已寫入：Claude Code・Codex／Higgsfield・Magnific／Meshy／Kling，
  `_todo_footer` 標記待使用者定稿）；木魚彩蛋＝`.footer-woodfish-btn` 點擊 → `audio.sfx('sfx_bell')`
  （缺檔 fail-soft）＋叩擊 squash 動畫＋「功德圓滿」toast（role=status，2.4s 散去）。
- index.html footer 區：木魚 icon 改 `<button>` 包裹（鍵盤可達）、圖換 woodfish.webp 帶 w/h。

## 四、§9 全查結果（Lighthouse 13.4，build 後對 vite preview :4173 實跑）

| 指標 | spec 目標 | 實測 | 判定 |
|---|---|---|---|
| JS gz | ≤150KB | 70.3KB | ✅ |
| CSS（阻塞包） | ≤40KB | **6.3KB gz**（改造前 167KB） | ✅ |
| Accessibility | ≥95 | **100**（行動＋桌面皆滿分） | ✅ |
| Best Practices | ≥95 | **100** | ✅ |
| CLS | <0.1 | 0.001 | ✅ |
| Performance | ≥85 | **79**（桌面）／79（行動；起點 55） | ⚠未達，見下 |
| Press kit zip | <40MB | 20.1MB | ✅ |

### 效能改造（0.55 → 0.79）

1. **字體 CSS 移出阻塞包**（最大單項）：@fontsource 三 weight 共 318 個 @font-face 宣告
   （gz 154.5KB）原 @import 在 base.css → 整包 render-blocking，行動 FCP 12.1s。改 main.ts
   動態 import 拆成 3 個非同步 CSS chunk（serif-900 優先，hero h1 是 LCP）＋預載 h1 三個
   字形子集 woff2。**FCP 12.1s→1.2s**（行動）／0.3s（桌面）。站點自寫 CSS 實測僅 6.1KB gz。
2. hero poster 補 828w srcset（avif 35KB/webp 80KB），行動不再拉 1920w。
3. 附帶新增 `src/vite-env.d.ts`（M0 腳手架漏建的 Vite 標準檔，動態 CSS import 的型別依據）。

### Performance 79 未達 85 的根因（已查明，非本期可解）

LCP 元素＝hero h1「和尚逆天」**文字佔位 logo**（`data-todo`，等 Codex 第二批 logo 圖）。
LCP 3.2s（桌面）被「字體 CSS chunk＋子集下載→swap 重繪」鏈綁定，且 loader 進站儀式本身
`document.fonts.ready` 門控。**正式 logo 圖到位換成 `<img>`（可 preload）後此扣分自然消失**；
屆時重跑 Lighthouse 預期 ≥85。不為佔位元素引入 fonttools 子集管線（新依賴不值得）。

### axe 修正（100 分的由來，修前 96）

- `god-slot-chapter` 對比 1.16:1（墨色字在深格底）→ 改紙色 rgba(242,234,216,.72)（characters.css）。
- label-content-name-mismatch ×6：char-card／quad-card 的 aria-label 未含可見文字 → 移除
  aria-label 改由內容命名（characters.ts/gameplay.ts；展開語意由 aria-expanded 傳達）。
- unsized-images ×3：char 立繪（characters.json 新增 portraitW/H 欄位）＋parlor 木魚圖（512×512）。
- console 唯一 error＝favicon 404 → index.html 掛 woodfish.svg favicon。

### 收尾清理

- `utils.loadJSON()` 刪除（跨單決策 07-07 指定 M6 清理；grep 確認零使用者）。
- index.html 殘留 TODO 註解（gallery/footer 文案）全數接上 strings.json。

## 五、驗收逐條（preview 實測證據）

- 19 張全 lazy＋全帶 w/h：✅（eval：allLazy=true、allHaveWH=true）
- lightbox 鍵盤完整操作：✅ 開（Enter 於縮圖 button）→ ←/→ 切換（counter 3/19→4/19→2/19
  循環）→ Esc 關→ 焦點還原至觸發縮圖（activeElement 核對）；開啟時 body overflow=hidden
- 滑動切換：✅ pointerdown/up dx=-120 → 1/19→2/19
- 預載相鄰：✅（show() 內 new Image() 預取 ±1，程式路徑）
- zip 連結有效：✅ HEAD 200、20.1MB
- footer 彩蛋：✅ 點擊→toast「功德圓滿」顯示（role=status）；SFX 走 fail-soft（音檔未生成）
- 375px：✅ 無頁面橫向溢出（scrollWidth=375）、直圖 lightbox 不超框、nav 鈕可見
- console error／failed requests：✅ 均零（dev 與 build preview 皆查）
- build：✅ tsc＋vite 零錯

## 六、未能驗證／殘留

- **prefers-reduced-motion 全頁 DevTools 模擬實測**（§9.3 要求）：preview 工具無法注入
  media query 模擬，僅完成程式路徑審查（gallery/footer 新組件的 reduced 分支＋CSS
  @media 皆有寫）。留給使用者實機或額度充裕時補驗。
- Performance 85：見上，等 logo 圖。
- SNS 連結（X/YouTube）仍 data-todo（平台未定，spec 原設計）。
- wallpaper_phone.png／SFX／BGM／影片 loop：維持既有佔位機制，素材到位即生效。
- story_mid.webp 558KB 為 M3 佔位長圖，image-delivery 主要扣分項之一，Codex 第三批
  正式圖到位時一併壓縮。
