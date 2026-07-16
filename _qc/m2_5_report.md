# M2.5 QC 報告 — suminagashi 墨流體 Hero 背景（2026-07-07）

執行：Fable 5 subagent。commit `d517e52`（僅含准動三檔）。

## 參數最終值（spec §6.5 起手值實測後全數保留）

| 參數 | 值 | 備註 |
|---|---|---|
| velocity dissipation | 0.2 /s | 墨紋漂移悠長 |
| dye dissipation | 0.05 /s | 殘留 ~20s |
| vorticity | 25 | 旋渦絲紋明顯但不狂躁 |
| Jacobi 迭代 | 22 | spec 20–25 區間 |
| splat force | 2400 | 位移→速度倍率 |
| splat 半徑 | move 0.0009 / drop 0.0045 | exp(-d²/r) 的 r |
| dye density（顯示端） | 1.5 | 濃處近黑 |
| sim 上限 | 512 桌面 / 256 行動（<768px） | fps 降級再砍半一次 |
| dye 解析度 | 全解析度，dpr 上限 1.5 | |
| 三色 | #14120f / #c73e3a / #396565 | 藍灰＝#43d9d9 同色相 s−40% l−25%；各通道 ±12% 抖動 |
| 合成 | paper × exp(−吸光度×density) | 吸收模型＝「墨在水面」 |

## 改動檔案

- `src/core/suminagashi.ts`（新檔，880 行）：stable-fluids 全實作＋降級＋debug stats
- `src/sections/hero.ts`：import＋接線（:15、:43–59 scrub 帶 canvas、:113–121 init）
- `src/styles/sections/hero.css`：:59–83 `hero--fluid` 態（藏 shade、前景文字轉墨黑＋紙色光暈）

## 驗收逐條

| 條件 | 結果 | 證據 |
|---|---|---|
| `npm run build` 零錯誤 | ✅ | tsc＋vite 過，`✓ built in 1.12s` |
| JS gz ≤150KB | ✅ | `dist/assets/index-C0QmJkw3.js 164.13 kB │ gzip: 61.48 kB` |
| hero 出現 canvas | ✅ | preview_eval：`.suminagashi-canvas` 存在、`hero--fluid` class 已加、WebGL2 sim 512×381 |
| pointermove 序列後 dye 有變化 | ✅ | dispatchEvent 1 down＋40 moves → `__fluidStats` splats 9→50、inkPixels（readPixels 非紙色計數）61→150 |
| 自動漩渦（idle 15s） | ✅ | 受控 16s 無互動：splats 261→263（idle 8s 後每 4–6s 一顆，符合設計） |
| fps ≥45（桌面） | ✅ | 獨立 rAF 計數器 3s 均值 **120.3**（869×635 原生視窗；preview_resize 指定 1280×800 有工具怪癖落不到位，見意外發現） |
| WebGL 不可用 → poster 靜態背景、console 無 error | ✅ | `?fluid=off` 走同一 null 降級分支：無 canvas、無 hero--fluid、poster visible、shade 正常；console error 級 0 筆（真 WebGL null 分支僅程式碼審視：createGL 失敗鏈全 return null 於 canvas 插入前） |
| lightbox 回歸 | ✅ | click 開（hidden:false、body overflow hidden、焦點→關閉鈕）→ Esc 關（焦點回 PV 鈕） |
| CTA 可點 | ✅ | `.hero-pv-btn` click 成功開 lightbox |
| scroll scale scrub 仍動 | ✅ | 捲至半屏：bg scale 0.96、canvas scale 0.96（同步）；回頂 1.0 |
| 375px 不炸版、fps ≥30、sim 256 生效 | ✅ | mobile 375×812：sim **118×256**、dye 563×1218（dpr 2 → cap 1.5）、touch 拖曳 splats 4→25、rAF 3s 均值 **120.3**、無橫向捲軸、hero rect 375×812 |
| console error 乾淨 | ✅ | error 級 0 筆（audio sfx/bgm 素材缺檔 warn 為既有，與本次無關） |
| git commit 僅三檔 | ✅ | `d517e52`，3 files changed |
| 視覺品質 | ✅ | 桌面截圖：紙白底、朱紅/藍灰/墨黑暈染大理石紋＋旋渦，柔和緩慢非螢光；墨黑 logo＋金 CTA 對比清楚 |

## 意外發現

1. **preview 工具怪癖**：`preview_resize` 指定 width/height 1280×800 實際落到 375×812（mobile 模擬殘留），preset `desktop` 只回原生 869×635；且 screenshot 面與 eval 面偶爾指向不同分頁（多次導航後有 fluid=off 分頁殘留），造成兩張截圖拍到 poster/loader。所有驗收數據以 eval 內部自洽讀值為準，桌面視覺截圖已成功取得。
2. **QC 期間 splat 計數一度暴增（57→654/29s）**：加掛事件計數器查證為真實滑鼠劃過預覽視窗（之後 5s 內 0 事件），非程式 bug。
3. M3 agent 並行改動 index.html/story/tsconfig/strings.json 屬實（git status 可見），未與本次三檔相撞。
4. TS 控制流小坑：外層 `let velocity` 由 `initSimFBOs()` 內賦值，尾端直接讀會被 narrow 成 null——改由 stats 記錄 sim 尺寸繞開。
5. 降級開關附贈 `?fluid=off`（走與 WebGL 失敗完全相同的 null 分支），日後 QC／使用者關特效可用；正式路徑無 UI、無全域變數（`__fluidStats` 僅 `?fluid=debug` 下存在）。
6. 未做（範圍外備忘）：WebGL context lost 事件恢復；WebGL2 存在但 EXT_color_buffer_float 缺失時不再嘗試 WebGL1（同 canvas 無法換 context 型別，該組合極罕見，直接降級 poster）。
