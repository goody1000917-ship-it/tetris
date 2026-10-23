# 生殖錯題講解：原始檔與流程

`../../learn/repro.html` 是從這裡產生的，不要直接改它。內容是第 7 回複習考（生物第 6 單元「生殖」）錯的 16 題：分成 4 個觀念，每題附「怎麼想」、四個選項各錯在哪、一句話記住，再加上新的練習題和「再考一次」。

| 檔案 | 用途 |
|---|---|
| `bio-workflow.js` | Workflow：每節一位作者 → 盲解（連考卷原題一起解，核對抄下來的答案）＋生物審稿＋學生視角審稿 → 修改 → 再盲解，練習題答案不一致就刪掉；args 例：`{mode:'lesson', ids:['g1']}`、`{mode:'exam', batches:[['r01', …, 'r10']]}`。考卷題目、選項、正確答案、學生選的答案寫在 `MISTAKES`，作者只寫講解 |
| `runs/` | 這次跑出來的結果（g1～g4 四節、x1 再考一次） |
| `patches.json` | 人工看過後的修正：`{"old","new","why"}` 文字替換（只能剛好對到一處），或 `{"insert", "expect", "block"}` 插入一個 block |
| `repro.src.html` | 網頁本體，內容位置是 `__LESSON_DATA__`。由 `make-src.py` 從 `../lesson/similar.src.html` 改出來：拿掉幾何圖，加上考卷錯題卡、`｜` 表格、考卷附圖和染色體小工具（`demos.js`） |
| `assemble-repro.py` | `python3 assemble-repro.py <輸出資料夾> runs/g1.json runs/g2.json runs/g3.json runs/g4.json --exam runs/x1.json --figs figs --patch patches.json` → `repro.html`（claude.ai Artifact 用）、`repro.site.html`（加了 doctype，複製成 `learn/repro.html`）、`repro-data.json` |
| `figs/` | 考卷上的兩張圖（雌蕊、鳥蛋），從照片裁下來，以 data URI 放進網頁 |
| `test-repro.mjs` | 手機寬度、淺色與深色：每一節、每個小工具步驟（3 種生物 × 3 種過程）、錯題卡的「我懂了」與「遮住答案，再做一次」、練習題、再考一次：`node test-repro.mjs <repro.site.html 的完整路徑> <截圖資料夾>` |

重新產生網頁：

```
python3 make-src.py ../lesson/similar.src.html repro.src.html demos.js
python3 assemble-repro.py . runs/g1.json runs/g2.json runs/g3.json runs/g4.json --exam runs/x1.json --figs figs --patch patches.json
cp repro.site.html ../../learn/repro.html
```

第 32 題的圖裡，「丁」的線指到蛋的外圈，看不出是卵白還是卵殼；兩者都是在輸卵管形成，所以講解寫成「卵白和卵殼那一帶」，不影響答案（乙，卵黃）。
