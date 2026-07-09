# 官網施工 tracking（spec＝MONK/docs/superpowers/specs/2026-07-06-website-interactive-spec.md）

開工：2026-07-06。里程碑定義見 spec §10。順序鐵律：M0→M1 過驗收才開 M2+。

**2026-07-06 夜間自主施工授權（使用者睡前指示）**：
- 遊戲實錄類素材全部跳過，一律用佔位（遊戲還沒測完）
- 自主推進做到哪算哪；subagent 准用 fable model
- M7 部署不做（要綁使用者 Vercel 帳號＋對外上線，留給使用者）
- SFX/BGM 先不生成（花點數的都不動），AudioManager 寫成缺檔 fail-soft

| 項目 | 狀態 | 產出路徑 | 下一步 |
|---|---|---|---|
| Codex 素材工單 | ✅ 已出單 | MONK/docs/superpowers/handoff/2026-07-06-website-art-handoff.md | 等使用者交 Codex；交回後入 _art_src/ 轉檔 |
| M0 腳手架 | ✅ 完成（主對話親驗：build 零錯、deps 恰 6 個、tokens 逐字符合、七區 snapshot 過） | D:\monk\website\（報告 _qc/m0_report.md） | — |
| M1 全站系統 | ✅ 完成（commit 3f5a541；fresh review 通過 0 findings，_qc/m1_review.md） | src/core/*＋main.ts＋core.css | — |
| M2 Loader+Hero | ✅ 結案（commit 374c19f）。⚠**親驗違例**：fresh review agent 07-07 凌晨被額度砍死零產出，改主對話親驗重點項（inkReveal GLSL 逐字比對✓、10s timeout/3s skip/aria-disabled✓、build✓）；額度充裕時可補嚴格 review | core/inkReveal.ts、sections/loader.ts、hero.ts（_qc/m2_report.md） | — |
| M2.5 墨流體 Hero（07-07 追加） | ✅ 結案（commit d517e52；fresh review 通過 0 findings，_qc/m2_5_m3_review.md） | core/suminagashi.ts、hero.ts、hero.css | PV 成片後使用者選：PV 進 hero 或墨流保留 |
| M3 Story 絵巻 | ✅ 結案（commit 46d5929；review 有條件通過，2 小 findings 已由主對話修正＝commit 4a79638 行動版補鐘聲＋53ba9a9 內 width 614→720） | sections/story.ts、story.css、strings.json、story_mid.webp | 正式長圖等 Codex 第三批＋使用者過目 |
| （跨單決策 07-07）data JSON 讀取 | ✅ 拍板 | — | M1 的 loadJSON() fetch src/data/ 在 build 後會 404（M3 發現）；**M4 起統一改靜態 import**（tsconfig 已加 resolveJsonModule）；utils.loadJSON 留給 M6 清理 |
| M4 Characters | ✅ 結案（commit 53ba9a9）。⚠**親驗違例**：施工 agent 07-07 上午被額度砍死（死前四檔已改完＋立繪已轉檔），主對話接手 read-back＋實測（渲染 2 卡 12 格✓、modal 鍵盤全流程含焦點還原✓、375px 三欄無溢出✓、console 零錯✓、_todo 文字外漏已修）；額度充裕時可補嚴格 review | sections/characters.ts、characters.css、characters.json | — |
| M5 Gameplay+Parlor | ✅ 結案（施工 agent 完成＋07-09 主對話抽驗過：展開/木魚 merit 持久化/Esc 焦點還原/console 零錯，報告 _qc/m5_report.md） | sections/gameplay.ts、parlor.ts、styles/sections/{gameplay,parlor}.css、data/{gameplay,arcade,strings}.json、index.html gameplay/parlor 區＋#woodfish-overlay、9 張 ph_*.webp 佔位圖 | 影片 loop 缺（使用者指示跳過）；日後補 webm 只需填 JSON loop 欄位 |
| M6 Gallery+Footer+收尾 | ✅ 結案（07-09 主對話親做＋親驗。⚠**親驗違例日**：第二波 agent 額度死亡後本日不派 agent，額度充裕時可補嚴格 fresh review。報告 _qc/m6_report.md）。§9：JS 70KB gz✓／阻塞 CSS 6.3KB gz✓／**a11y 100・BP 100**／CLS 0.001✓／zip 20.1MB✓；**Perf 79 未達 85**——根因＝hero h1 文字佔位 logo 的字體 swap LCP，Codex logo 圖到位換 `<img>` 後自然消失，屆時重跑；reduced-motion 全頁 DevTools 模擬未能在 preview 工具做，留實機補驗 | sections/gallery.ts、footer.ts、styles/sections/{gallery,footer}.css、data/{gallery,strings,characters}.json、public/media/img/gallery/×38、poster_828.*、public/presskit/monk_presskit.zip（20.1MB）、vite-env.d.ts；附帶：字體改非同步載入（main.ts/base.css）、axe 三類修正（characters/gameplay/parlor/characters.css）、favicon、utils.loadJSON 清理 | 等 Codex logo→hero 換圖→重跑 Lighthouse。07-09 追加改版（使用者回饋）：①圖庫去下載 UI＋瀑布流→兩排反向自動滑動展示帶 ②圖庫定名「繪馬堂」（使用者四選一拍板）③十二神區改版＝六神 16:9 splash 大卡（ares/apollo/athena/hermes/poseidon/zeus，源=art_direction/gods/concepts 轉 1600w avif；**章節配置佔位：zeus=12 其餘 2-5 順排，劇情定稿要調 characters.json**）＋六格封印列；點神卡開單圖 lightbox（gallery.ts 匯出 openImageLightbox）④全站區標題設計處理（data-en 英文 overline＋朱紅刻線）＋文案全面縮短。07-10 三輪：🐛char modal 關不掉根因=`.char-modal` 無條件 display:grid 蓋掉 dialog:not([open]) 隱藏（驗收教訓：dialog 要驗 computed display 不能只驗 open 屬性）；十二神全 12 尊 splash 上站（上輪漏搜 6 尊）；主角排加櫻（正式版=portraits/cherry/bust，_nobg 是舊厚塗版勿用），見 m6_report 追記 |
| M7 部署 | ⬜ 未開工 | | Vercel |

## 素材狀態（詳見 handoff 單）

| 素材 | 管道 | 狀態 |
|---|---|---|
| 木魚圖/紙紋/墨暈邊 | Codex（第一批） | ✅ QC 全過已接上（woodfish.webp 58KB／paper_tile.webp 978B／ink_edge.webp 27KB 入庫備用） |
| logo 水墨題字 | Codex（第二批，2-3 候選） | ⬜ 出單 |
| key art 橫+直 | Codex（第二批，2-3 候選選基底） | ⬜ 出單 |
| 絵巻三層長圖 | Codex（第三批，M3 前；出圖需過目） | ⬜ 出單 |
| SFX 木魚/鐘 | Magnific 音效 | ⬜ 未生 |
| BGM 60s | PV 音樂剪短（等 PV） | ⬜ |
| 影片 loop/截圖 | 遊戲實錄 | ⬜ |
| 立繪 | 現成，轉 webp | ⬜ |
