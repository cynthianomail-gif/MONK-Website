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
| M0 腳手架 | 🔄 施工中 | D:\monk\website\ | 派工 sonnet，完成後主對話驗 build+截圖 |
| M1 全站系統 | ⬜ 未開工 | src/core/ | 等 M0 過 |
| M2 Loader+Hero | ⬜ 未開工 | | 等 M1 過；素材未到用佔位 |
| M3 Story 絵巻 | ⬜ 未開工 | | 絵巻長圖需使用者過目 |
| M4 Characters | ⬜ 未開工 | | 立繪現成，轉 webp 即可 |
| M5 Gameplay+Parlor | ⬜ 未開工 | | 需遊戲實錄 loop |
| M6 Gallery+Footer+收尾 | ⬜ 未開工 | | §9 硬指標全查 |
| M7 部署 | ⬜ 未開工 | | Vercel |

## 素材狀態（詳見 handoff 單）

| 素材 | 管道 | 狀態 |
|---|---|---|
| 木魚圖/紙紋/墨暈邊 | Codex（第一批） | ⬜ 出單 |
| logo 水墨題字 | Codex（第二批，2-3 候選） | ⬜ 出單 |
| key art 橫+直 | Codex（第二批，2-3 候選選基底） | ⬜ 出單 |
| 絵巻三層長圖 | Codex（第三批，M3 前；出圖需過目） | ⬜ 出單 |
| SFX 木魚/鐘 | Magnific 音效 | ⬜ 未生 |
| BGM 60s | PV 音樂剪短（等 PV） | ⬜ |
| 影片 loop/截圖 | 遊戲實錄 | ⬜ |
| 立繪 | 現成，轉 webp | ⬜ |
