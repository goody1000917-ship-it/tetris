# 相似形・比例線段教學：原始檔與流程

`../../learn/similar.html` 是從這裡產生的，不要直接改它。

| 檔案 | 用途 |
|---|---|
| `similar.src.html` | 網頁本體（樣式、圖的繪製 `dgRender`、互動小工具、練習與會考實戰），內容位置是 `__LESSON_DATA__` |
| `lesson-data.json` | 全部內容：9 節的 blocks 與會考實戰題（已經過下面的流程驗證） |
| `assemble.py` | `python3 assemble.py --data lesson-data.json` → 產生 `similar.html`（claude.ai Artifact 用）和 `similar.site.html`（加了 doctype，複製成 `learn/similar.html`） |
| `lesson-workflow.js` | Workflow：每節一位作者 → 盲解＋數學審稿＋學生視角審稿＋程式檢查圖的座標 → 修改 → 再盲解；args 例：`{mode:'lesson', ids:['s0','s1']}`、`{mode:'exam', batches:[['e01','e02']]}`、`{mode:'bank', batches:[['b01']]}` |
| `qa-workflow.js` | 整份總審：前後一致、學生從頭走一遍、每張圖截圖目視、挑答案鍵的錯，再修改＋盲解；結果用 `apply-qa.py` 套回 |
| `render-diagrams.mjs` | 把每張圖畫成 PNG（給總審看） |
| `build-bank.mjs` | `node build-bank.mjs bank-families.json similar.src.html <輸出資料夾> 13` → 題庫新題（M17-13 起），附圖由 `dgRender` 畫成 `figure_svg` |
| `test-page.mjs` | 手機尺寸、淺色與深色，逐節點過每個例題、練習題、小工具與會考實戰：`node test-page.mjs <similar.site.html 的完整路徑>` |

圖的格式（points、segments、parallel、on、rightAngles…）寫在 `lesson-workflow.js` 的 `DIAGRAM_RULES`；`validateDiagram` 會檢查宣告的平行、垂直、在線段上、等長、比例是否真的成立。
