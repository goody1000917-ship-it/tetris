# 接手筆記（給下一個 Claude 對話）

這份筆記讓任何一個新的 Claude 對話（連電腦的或雲端的）能直接接手「會考每日練」。

## 現況（2026-10-07）

- 正式網址：**https://daily.happygoody.net**，由 `huikao-worker`（Cloudflare Worker + Static Assets + D1）提供，使用者的手機用這個。
- 同一份網頁也在 claude.ai Artifact（https://claude.ai/artifact/LAEuZgYabLyYAGBoizKPvQ ，紀錄存 Artifact db）和 GitHub Pages（master 分支，https://goody1000917-ship-it.github.io/tetris/huikao-daily/ ）。
- `huikao.happygoody.net` 上是另一個 app「錯題獵人」，不是這個專案，不要動。
- 題庫 `questions.json`：471 題原題（數學 206、社會 265）加 935 題替身（`variant_of` 指向原題；同觀念、不同數字或材料），每題都經過第二個代理盲解驗證。
- 使用者是國三生，手機操作，不熟指令。用詞要簡單。

## 怎麼更新網頁

1. 改 `huikao-daily/index.html`（或 `questions.json`），跑 `node huikao-daily/tools/test-logic.js`。
2. 推到 master。
3. **在連電腦的 Claude 對話**（電腦的 wrangler 已登入 Cloudflare）執行：
   `cd huikao-worker && npx wrangler@latest deploy`
   雲端對話沒有 Cloudflare 權限，做不了這步。
4. 想省掉第 3 步：在 Cloudflare 網頁把 Worker `huikao-daily` 連到這個 GitHub repo（Workers & Pages → huikao-daily → Settings → Builds），根目錄 `huikao-worker`，之後推 master 就自動部署。

Worker 本身的測試：`cd test && npm install && node huikao-worker.test.mjs`；網頁加 Worker 的端到端：`node huikao-e2e.mjs`。

## 每日提醒

- 帳號裡有一個 Routine「會考每日練提醒」（trig_011smHeRX1jL4wWzKvMfBbwD），每天台灣時間 19:52 推播。
- 它目前讀的是 **claude.ai Artifact 的 db**，但使用者改用 daily.happygoody.net，那邊的紀錄要用他的「同步碼」透過 `POST https://daily.happygoody.net/api/ {code, op:'load'}` 才讀得到。
- 待辦：拿到使用者設定頁的同步碼後，用 update_trigger 把提醒的 prompt 改成讀 API（資料格式見 `huikao-worker/src/index.js` 註解）。

## 排程規則（別改壞）

一天預算 20 題：到期複習先出，剩的名額出新題（數學、社會各最多 4）。答對後 1、3、7、14 天各再出一次，第五次對就算學會，30 天後再確認、之後每 60 天。同一題一天只算一次。答錯回起點隔天再出。複習時不出同一題：第一次出原題，之後輪流出替身（`chooseVariant`，挑出現次數最少、且不是上次那題的），答題紀錄裡 `q` 記的是實際出的那題，卡片仍以原題 id 計。手動「我確定會了」要答對兩次後才出現。詳細見 `index.html` 的 `/*@logic-start*/` 區塊，單元測試在 `tools/test-logic.js`。

## 其他待辦

- 題庫以每天 ~8 題新題的速度大約 5 個月用完，之後要補題：用 `tools/qbank-workflow.js` 的流程（出題 → 盲解驗證）再跑一批，`tools/build-bank.py` 合併。
- 公民「學校、社區與社會團體」只有 2 題。
- 補替身：`tools/variants-workflow.js`（args `{subject:'math'|'social', batches:[['M01','M02'],...]}`）跑完後 `python3 tools/merge-variants.py <task output 檔>`。
