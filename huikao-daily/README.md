# 會考每日練

給國三生用的每日練習網頁：數學 21 單元與社會（歷史、地理、公民）題庫，照遺忘曲線排每天的題目。
同一個 `index.html` 可以放在三種地方，紀錄各有存法：

| 放在哪裡 | 紀錄存在哪 |
|---|---|
| claude.ai Artifact | Artifact 的 db（用 claude.ai 帳號同步） |
| 自己的網站（GitHub Pages、happygoody.net） | `huikao-worker`（Cloudflare Worker + D1），用「同步碼」跨裝置 |
| 本機或 http | 瀏覽器的 localStorage |

## 放到自己的網址

1. **部署同步 API**（只要做一次）
   ```
   cd huikao-worker
   npx wrangler@latest d1 create huikao-daily        # 把印出來的 database_id 填進 wrangler.jsonc
   npx wrangler@latest d1 migrations apply huikao-daily --remote
   npx wrangler@latest deploy                        # 綁到 huikao-api.happygoody.net（wrangler.jsonc 的 routes）
   ```
   要用別的網域就改 `wrangler.jsonc` 的 `routes`，並把 `huikao-daily/index.html` 裡的 `API_BASE` 改成同一個網址。
   允許的來源在 `huikao-worker/src/index.js` 的 `ORIGIN_OK`（目前：goody1000917-ship-it.github.io、*.happygoody.net、localhost）。
2. **放靜態檔**：整個 `huikao-daily/` 資料夾（`index.html`、`questions.json`、`manifest.webmanifest`、`sw.js`、`icon.svg`）放到網站上即可。
   這個 repo 用 GitHub Pages 發布 `master`，所以合併到 `master` 後網址就是
   `https://goody1000917-ship-it.github.io/tetris/huikao-daily/`。
3. 在手機瀏覽器打開後可以「加到主畫面」，之後像 app 一樣開，沒網路也能做題（作答會在重新連線後下次打開時以雲端為準）。

同步碼：網頁第一次在自己的網址打開時會產生一組 32 字的同步碼，存在瀏覽器裡並顯示在「設定」。在另一台裝置貼上同一組，就看到同一份進度。Worker 只存同步碼的 sha-256。

## 檔案

- `index.html`：網頁本體。
- `questions.json`：題庫。每題都先由一個代理出題、再由另一個代理在看不到答案的情況下獨立作答，答案一致且不是一步就能答的題才保留。
- `manifest.webmanifest`、`sw.js`、`icon.svg`：自己架站時的 PWA 與離線快取（在 claude.ai 裡不會載入）。
- `tools/qbank-workflow.js`：出題與盲解驗證的 Workflow 腳本。
- `tools/build-bank.py`：把各 Workflow 的結果合併成 `questions.json`，並把正確答案的 ABCD 位置打散平均。
- `tools/test-logic.js`：遺忘曲線排程與每日選題邏輯的單元測試（`node tools/test-logic.js`）。
- `../huikao-worker/`：同步 API。測試：`cd test && npm install && node huikao-worker.test.mjs`，端到端：`node huikao-e2e.mjs`。

## 排程規則

一天有題數預算（預設 20）：到期的複習題先出，剩下的名額才出新題（預設數學、社會各最多 4 題）。
答對後在 1、3、7、14、30 天後各再出一次，五次都對就自動標為學會；答錯回到起點，隔天再出；答對後按「其實是猜的」也回到起點。
答錯可以標「觀念不會 / 粗心或算錯 / 看錯題目」，進度頁按單元統計；錯題本收集所有答錯過、還沒學會的題目。
