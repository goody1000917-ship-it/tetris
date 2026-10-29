# 接手筆記（給下一個 Claude 對話）

這份筆記讓任何一個新的 Claude 對話（連電腦的或雲端的）能直接接手「會考每日練」。

## 現況（2026-10-07）

- 正式網址：**https://daily.happygoody.net**，由 `huikao-worker`（Cloudflare Worker + Static Assets + D1）提供，使用者的手機用這個。
- 同一份網頁也在 claude.ai Artifact（https://claude.ai/artifact/LAEuZgYabLyYAGBoizKPvQ ，紀錄存 Artifact db）和 GitHub Pages（master 分支，https://goody1000917-ship-it.github.io/tetris/huikao-daily/ ）。
- `huikao.happygoody.net` 上是另一個 app「錯題獵人」，不是這個專案，不要動。
- 題庫 `questions.json`：471 題原題（數學 206、社會 265）加 935 題替身（`variant_of` 指向原題；同觀念、不同數字或材料），每題都經過第二個代理盲解驗證。
- 使用者是國三生，手機操作，不熟指令。用詞要簡單。

## 注意：正式網站和這個 repo 已經分岔（2026-10-09 發現）

- daily.happygoody.net 上跑的版本是在使用者電腦上改的，**沒有推到 GitHub**。它比這裡多了：英文科（E01…，120 題）、AI 雙胞胎題（Worker 的 `op: 'twin'`，要輸入 AI 通行碼）、AI 問答、英文寫作批改（`op: 'grade'`），數學解析全部改寫成「第 n 步」並加了解析圖 `explain_svg`。
- 這個 repo 的 master 沒有上面那些，但有替身題（`variant_of`，935 題）、分享連結與「名字＋密碼」登入。正式網站沒有這些。
- 所以**不要在電腦上 `git pull origin master` 再部署**：會和電腦上沒推的改動衝突，或把英文、AI 功能蓋掉。
- 要把新東西放上正式網站，只拿新檔案，例如：`git fetch origin master` 然後 `git checkout origin/master -- huikao-daily/learn`，再部署。
- **不要在電腦上那個 tetris 資料夾用 `claude --teleport`（或 claude.ai/code 的 Open in > Terminal）接雲端的對話。** teleport 要求乾淨的 git 狀態（會請你 stash 沒 commit 的改動）再切到雲端的分支：只在這台電腦上的線上版 `index.html`、`questions.json`、`huikao-worker/` 會被收進 stash、換成 GitHub 的舊版，接著部署就會弄壞網站。要在電腦上做事，就在那個資料夾開新的本機對話（Claude 桌面版：Code → 輸入框下面的環境選 Local → 資料夾選 Open folder… → tetris），貼 `pc-steps.md` 開頭那句話。
- 之後要合併兩邊：先請連電腦的對話把它的版本 commit 並推到 GitHub 的新分支（不要把 `.dev.vars` 或任何金鑰、通行碼加進去），再由任一個對話把兩邊合併成一個版本。

## 怎麼更新網頁

1. 改 `huikao-daily/index.html`（或 `questions.json`），跑 `node huikao-daily/tools/test-logic.js`。
2. 推到 master。
3. **在連電腦的 Claude 對話**（電腦的 wrangler 已登入 Cloudflare）執行：
   `cd huikao-worker && npx wrangler@latest deploy`
   雲端對話沒有 Cloudflare 權限，做不了這步。
4. 想省掉第 3 步：在 Cloudflare 網頁把 Worker `huikao-daily` 連到這個 GitHub repo（Workers & Pages → huikao-daily → Settings → Builds），根目錄 `huikao-worker`，之後推 master 就自動部署。

Worker 本身的測試：`cd test && npm install && node huikao-worker.test.mjs`；網頁加 Worker 的端到端：`node huikao-e2e.mjs`。

## 相似形・比例線段教學（2026-10-09）

- 使用者說「我需要學會相似形比例線段」，做了一頁互動教學：`huikao-daily/learn/similar.html`（claude.ai Artifact：https://claude.ai/artifact/6GY9x1HABqGvoEbDp33DMJ ）。9 節（暖身、A 字型、X 字型與三平行線、判斷平行與中點連線、相似形、AA/SAS/SSS、周長比與面積比、母子相似與特殊直角三角形、生活應用）加 16 題型的會考實戰，每題 2～3 個換數字的版本。進度存在瀏覽器（localStorage），不進同步紀錄。
- 內容由 Workflow 產生：每節一位作者 → 盲解＋數學審稿＋「基礎不穩學生」審稿＋程式檢查圖的座標 → 修改 → 再盲解一次，不一致的題目丟掉；最後整份再審一次（前後一致、學生從頭走一遍、每張圖截圖目視、挑答案鍵的錯）。流程、原始檔與測試在 `huikao-daily/tools/lesson/`。
- 題庫另外加了 12 題「比例線段與相似三角形」原題（M17-13～M17-24）。repo 的 `questions.json` 連替身一起加；給正式網站用的是 `tools/m17-new-questions.json`（只有原題，因為正式網站的頁面不認得替身）。
- 放上正式網站：見 `tools/pc-steps.md`（2026-10-20 起連自然科一起）。舊的做法：`git fetch origin master`，`git checkout origin/master -- huikao-daily/learn huikao-daily/tools/add-questions.mjs huikao-daily/tools/m17-new-questions.json`，`node huikao-daily/tools/add-questions.mjs huikao-daily/tools/m17-new-questions.json`，再進 `huikao-worker` 執行 `npx wrangler@latest deploy`。
- 每日練裡還沒有連到教學的按鈕（正式網站的 index.html 只在使用者電腦上）。

## 自然科（生物、理化）（2026-10-20）

- 使用者要加生物和理化。題目在 `tools/science-questions.json`：229 題（生物 92、理化 137，每單元 6～8 題；id 生物 B01～B12、理化 P01～P18，subject `science`，area `生物`／`理化`）。由 `tools/science/science-workflow.js` 產生：每 3 個單元一位作者 → 盲解＋自然科老師審＋學生視角審解析 → 修改 → 再盲解，答案不一致或太簡單的丟掉，少於 5 題的單元補出。之後整份再總審（`qa-science` 流程：每組單元一位專挑答案錯的審查員、每科一位查事實與課綱、看每張圖），修改後再盲解；帶圖的原始資料在 `tools/science/science-source.json`（`build-science.mjs`、`apply-qa-science.mjs` 從它產生題庫）。
- 正式網站的頁面要加「自然」科：`tools/live-patches/patch-science.mjs`（或 `science-subject.patch`），是照 2026-10-20 的正式網站頁面寫的（10-26 確認線上頁面和題庫與 10-20 完全相同），28 處修改，每處已存在就跳過、全部到位才寫入、寫入前檢查網頁程式能解析。repo 的 `index.html` 沒有加（它不是正式網站在用的版本）。
- 新題先發給自然（`NEW_ORDER = ['science', 'math', 'social', 'english']`）：每天先排到期複習，剩的名額才一科一題輪流發新題，排最後的科目在複習多的日子一題都拿不到。使用者 10-26 反映「每日練沒有生物」：當時是還沒部署，但就算部署了，自然排最後也常常是 0 題。要改回或改成輪流，改 patch 裡的 `NEW_ORDER`。
- **到 2026-10-26 為止，電腦那邊還沒部署**：線上沒有自然、沒有 `learn/` 兩頁、Worker 的卡片 id 修正也還沒上。使用者要在電腦的 Claude 貼：「到 tetris 專案執行 git fetch origin master，然後用 git show origin/master:huikao-daily/tools/pc-steps.md 讀出步驟，照著做。不要 git pull。」`pc-steps.md` 在模擬的電腦上（舊 checkout、CRLF、線上檔案當未 commit 的改動）照字面演練過：備份（`backup-live.mjs`，不是線上那份就拒絕）→ 加自然 → 加題 → 修卡片 id（`fix-card-key.mjs`）→ 檢查 AI 功能 → `npx wrangler@latest deploy --cwd huikao-worker`（從 tetris 根目錄，不 cd）→ `check-live.mjs`（唯讀檢查線上）→ 照抄給使用者的說明。

## 生殖錯題講解（2026-10-23）

- 使用者傳了生物第 7 回複習考（第 6 單元「生殖」，54 分）的照片，說「我不會我好爛」。做了一頁錯題講解：`huikao-daily/learn/repro.html`（claude.ai Artifact：https://claude.ai/artifact/UuyxM3cJHuvNhrF2tWdAid ）。錯的 16 題分成 4 節（染色體的對／條與三種過程、有性還是無性、開花植物、動物的受精與發育）；每題照考卷原樣顯示，紅色是他選的、綠色是正確答案，附「怎麼想」、四個選項各錯在哪、一句話記住，可以「遮住答案，再做一次」。另有染色體小工具（果蠅／豌豆／人 × 細胞分裂／減數分裂／受精）、12 組新練習題和 10 題型的「再考一次」。進度存在瀏覽器。
- 題目、選項、正確答案、他選的答案是從照片抄的（`tools/bio-lesson/bio-workflow.js` 的 `MISTAKES`），盲解者 16 題都和老師的答案一致。第 2 題他寫了 (A)、(B) 兩個。第 32 題的「丁」看不出是卵白還是卵殼，講解寫成「卵白和卵殼那一帶」。
- 流程、原始檔、修正紀錄（`patches.json`）與測試在 `huikao-daily/tools/bio-lesson/`。上正式網站跟著 `tools/pc-steps.md` 的 `huikao-daily/learn` 一起，不用另外的步驟。

## 每日提醒

- 帳號裡有一個 Routine「會考每日練提醒」（trig_011smHeRX1jL4wWzKvMfBbwD），2026-10-20 起每天台灣時間 20:52 推播：不讀紀錄，只寫離會考天數、今天記得寫、依星期幾的小建議，連到 daily.happygoody.net。
- 不要用 Google 日曆提醒：使用者 2026-10-28 說不要，當天已把每天 19:30 的「寫會考每日練」活動整個刪掉，Routine 的提示也改成「這是唯一的提醒」。
- 推播看不到作答紀錄。若使用者願意給同步碼，可以改成用 `POST https://daily.happygoody.net/api/ {code, op:'load'}` 讀當天有沒有寫（資料格式見 `huikao-worker/src/index.js` 註解）。

## 同步：會考原題的紀錄存不進雲端（2026-10-26 發現）

- Worker 的卡片 id 規則原本是 `^[A-Z]\d{2}-\d{2}$`，社會的會考原題 id 是 `K103-01`（三位數，719 題），線上 Worker 回 `bad_key`（10-26 用不帶資料的請求確認，沒有寫入任何東西）。頁面會跳「儲存失敗」，而 `remoteStore.load()` 用雲端的資料蓋掉本機，所以下次打開那題的紀錄就不見了。
- repo 的 `huikao-worker/src/index.js` 已改成 `\d{2,3}`，測試在 `test/huikao-worker.test.mjs`。電腦上的 Worker 由 `pc-steps.md` 第 6 步的 `fix-card-key.mjs` 修，部署後 `check-live.mjs` 會確認。

## 排程規則（別改壞）

一天預算 20 題：到期複習先出，剩的名額出新題（數學、社會各最多 4）。正式網站加了自然以後，新題名額按 `NEW_ORDER` 一科一題輪流發，自然先。答對後 1、3、7、14 天各再出一次，第五次對就算學會，30 天後再確認、之後每 60 天。同一題一天只算一次。答錯回起點隔天再出。複習時不出同一題：第一次出原題，之後輪流出替身（`chooseVariant`，挑出現次數最少、且不是上次那題的），答題紀錄裡 `q` 記的是實際出的那題，卡片仍以原題 id 計。手動「我確定會了」要答對兩次後才出現。詳細見 `index.html` 的 `/*@logic-start*/` 區塊，單元測試在 `tools/test-logic.js`。

## 其他待辦

- 題庫以每天 ~8 題新題的速度大約 5 個月用完，之後要補題：用 `tools/qbank-workflow.js` 的流程（出題 → 盲解驗證）再跑一批，`tools/build-bank.py` 合併。
- 公民「學校、社區與社會團體」只有 2 題。
- 補替身：`tools/variants-workflow.js`（args `{subject:'math'|'social', batches:[['M01','M02'],...]}`）跑完後 `python3 tools/merge-variants.py <task output 檔>`。
