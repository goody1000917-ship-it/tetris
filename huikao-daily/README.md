# 會考每日練

給國三生用的每日練習網頁：數學 21 單元與社會（歷史、地理、公民）題庫，照遺忘曲線排每天的題目。
同一個 `index.html` 可以放在三種地方，紀錄各有存法：

| 放在哪裡 | 紀錄存在哪 |
|---|---|
| claude.ai Artifact | Artifact 的 db（用 claude.ai 帳號同步） |
| 自己的網址（daily.happygoody.net，或 GitHub Pages） | `huikao-worker`（Cloudflare Worker + D1），用「同步碼」跨裝置 |
| 本機或 http | 瀏覽器的 localStorage |

## 放到自己的網址（Cloudflare）

一個 Worker 同時提供網頁（Workers Static Assets，來源是這個資料夾）和同步 API（D1），網址是 **https://daily.happygoody.net**。
需要 Cloudflare 帳號權限：Workers Scripts 編輯、D1 編輯、happygoody.net 這個 zone 的 Workers Routes 與 DNS 編輯（自訂網域用）。

```
cd huikao-worker
npx wrangler@latest d1 create huikao-daily        # 把印出來的 database_id 填進 wrangler.jsonc
npx wrangler@latest d1 migrations apply huikao-daily --remote
npx wrangler@latest deploy                        # 綁到 daily.happygoody.net（wrangler.jsonc 的 routes）
```

之後只要改了題庫或網頁，再跑一次 `npx wrangler@latest deploy` 就更新。
要用別的子網域就改 `wrangler.jsonc` 的 `routes`；網頁在 *.happygoody.net 上會自動用同一個網域的 `/api`。
同一份網頁也放在 GitHub Pages（master 分支）：https://goody1000917-ship-it.github.io/tetris/huikao-daily/ ，它會連到 daily.happygoody.net/api 同步。

手機瀏覽器打開後可以「加到主畫面」，之後像 app 一樣開，沒網路也能做題。

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
