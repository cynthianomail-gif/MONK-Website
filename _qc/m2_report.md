# M2 報告 — Loader 進站儀式＋Hero＋WebGL 墨暈揭示（2026-07-07，Fable 5 執行）

## 一、Codex 第一批素材 QC

| 檔名 | 判定 | 證據與說明 |
|---|---|---|
| woodfish.png | ✅ 通過 | 1024×1024、pix_fmt=rgba；alphaextract（_qc/m2/woodfish_alpha.png）呈乾淨剪影、四角全透明。畫風（木魚＋槌＋錦墊，水墨厚塗）符合用途 |
| paper_tile.png | ✅ 通過（有條件） | 512×512、rgb24（無 alpha——紙紋 tile 不需要）。無縫檢查：左右邊 PSNR 40.7dB／上下邊 37.7dB（非逐像素相接，接縫肉眼極淡，見 _qc/m2/paper_h_seam_zoom.png、paper_v_seam_zoom.png）；實際以 0.5 透明度紙色疊層使用，接縫不可見，判定可用 |
| ink_edge.png | ✅ 通過 | 1920×240、rgba；左右邊 PSNR = inf（首末 column 逐像素相同，數學上完美可平接，_qc/m2/ink_h_seam_zoom.png）。畫面內部有幾處硬邊直線漸層是畫作本身的筆觸（遠離接縫處也有），非接縫瑕疵 |

三張全過，無需退回 Codex 重生。

### 轉檔入庫（public/media/img/）

| 成品 | 規格 | 大小 | 預算 |
|---|---|---|---|
| woodfish.webp | 512×512 yuva420p（透底保留） | 58.2KB | 無硬性預算 |
| paper_tile.webp | 512×512 q60 | 978B | ≤8KB ✅ |
| ink_edge.webp | 1280×160 q55 yuva420p（1920 直壓 48.7KB 超標→縮 1280） | 27.1KB | ≤30KB ✅ |
| poster.avif / poster.webp | 1920×1072（源＝MONK/assets/2d/backgrounds/bg_battle_temple.png，雨中鳥居神社，最切題） | 164KB / 252KB | Hero LCP 用 |

原 PNG 留 _art_src/（已 gitignore）。接上狀況：woodfish→loader（幾何 SVG 已替換）；paper_tile→base.css 疊進 #gameplay/#gallery 紙白區（0.5 透明度紙色疊層）；ink_edge→僅入庫備用（M3/M6 section 交界），本階段未接，如約回報。

## 二、改動檔案

| 檔案 | 範圍 | 內容 |
|---|---|---|
| src/core/inkReveal.ts | 全檔重寫（1–166） | §6.1 GLSL 逐字照抄＋WebGL 單 quad 樣板；`inkReveal(center, opts?): Promise<void>`；gsap 1.6s power2.inOut；resize 更新 uRes；WebGL 失敗→`<main>` clip-path circle 擴張 fallback；reduced-motion→立即 resolve |
| src/sections/loader.ts | 全檔重寫（1–107） | preload（fonts.ready＋poster，10s timeout 放行）→ ready 金光；點擊＝unlock＋punch＋SFX（缺檔靜默）→ inkReveal(點擊座標)→loader.remove()；3s 後「直接進入」（走 forceFallback）；鍵盤觸發用木魚中心座標；loader 期間 lenis.stop() |
| src/sections/hero.ts | 全檔重寫（1–113） | pointermove ±8px lerp 視差（hover-capable 限定）；hero-bg scale 1→0.92 scrub；PV lightbox（開＝lenis.stop()+body overflow hidden＋focus close 鈕；Esc/背點/close 鈕可關；焦點還原） |
| index.html | 11–18（loader 改 button 包 webp）、20–43（hero-bg picture avif/webp＋video data-placeholder 空掛＋hero-fg 文字 Logo 佔位 data-todo＋PV 鈕改 button）、86–91（pv-lightbox 骨架） | |
| src/main.ts | 移除 M0 的 `display:none` 隱藏 loader 行 | |
| src/styles/sections/loader.css | 全檔重寫 | ready 金色呼吸光（drop-shadow 動畫）、skip 淡入、reduced-motion 關呼吸、480px 縮木魚 |
| src/styles/sections/hero.css | 全檔重寫 | hero-bg/poster/video 層、video[data-placeholder] 不顯示、hero-shade 漸層、置左下版式、lightbox 樣式（z-index 9000）、100vh fallback |
| src/styles/base.css | 紙紋區塊（sr-only 前插入） | main section#gameplay/#gallery 疊 paper_tile.webp（高特異度蓋過 section 檔 background 簡寫） |

## 三、驗收逐條

1. ✅ `npm run build` 零錯誤（✓ built in 1.01s；JS gz 56.1KB ≤150KB 預算）
2. ✅ 素材 QC 三張逐張有結論（見上表，佐證圖在 _qc/m2/）
3. ✅ 實跑進站流程：loader 可見（木魚＋金字＋呼吸光截圖）→ preview_eval 觸發 click → canvasCount=1（WebGL 揭示中）→ 1.6s 後 canvas 移除、loader 已不在 DOM、Hero 可見（雨中神社 poster＋金字 Logo）
4. ✅ 「直接進入」：CSS 預設 opacity:0/pointer-events:none，唯一入口＝loader.ts 的 setTimeout(3000) 加 .skippable；3.3s 實測 opacity:1/auto、點擊後走 clip-path fallback 進站（`circle(10.1% at 50% 50%)` 擴張中、無 canvas）。註：「3 秒前不可見」因 preview 往返延遲（~9s）無法活捉，以預設 CSS 態＋單一計時器代碼路徑為證
5. ✅ lightbox：開啟後 body overflow=hidden＋lenis.stop()，wheel 事件 scrollDelta=0（背景不可捲）；Esc dispatchEvent 後 hidden=true、overflow 還原
6. ✅ WebGL fallback：stub getContext('webgl'/'webgl2'/'experimental-webgl')→null 後點木魚：無 canvas、loader 移除、main clip-path `circle(0%→150%)` tween、1.5s 後 clipPath 清空、Hero 可見、零 error
7. ✅ console error 乾淨（preview_console_logs level:error → No console logs，全流程多次查）
8. ✅ 375×812：loader 木魚中心 x=188（視口中心 187.5）、scrollWidth=375 無橫向溢出；點擊進站後 hero 375×812 滿版、CTA 兩鈕不破版（截圖有輕微縮放偽影，以 DOM 量測為準）
9. ✅ 補充實測：hero-bg 捲動縮放 matrix(0.936)（scrub 中）、視差 translate3d(6.29px,-4.72px,0) ∈ ±8px、#gameplay backgroundImage 含 paper_tile.webp
10. ✅ 不留殘碼：main.ts 的 M0 佔位隱藏行已移除；無註解舊碼、無 _tmp

## 四、意外發現

- ffmpeg `tile` filter 對單張輸入會補黑格（不能做無縫檢查），改用 hstack/vstack＋PSNR 量測。
- 本環境 ffmpeg 不支援 libwebp 的 `-exact` 選項（版本差異），拿掉後 alpha 仍正確保留（yuva420p 驗證）。
- ink_edge.webp 1920 寬直壓 48.7KB 超 30KB 預算，縮至 1280×160 達標；左右相接性（首末 column 相同）在等比縮放下保持。
- _tracking.md 在工作樹已有主對話的修改（M0/M1 狀態更新），非本工不動、不入本 commit。
- _qc/ 下 m0_report.md、m1_review.md 為先前里程碑留下的未追蹤檔，維持原樣未入 commit。
