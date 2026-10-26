# 給「連電腦的 Claude 對話」：把新東西放上 daily.happygoody.net

背景：daily.happygoody.net 是從這台電腦部署的。這台電腦上的 `huikao-daily/index.html`、`questions.json`、`huikao-worker/` 有很多沒推到 GitHub 的改動（英文、AI 雙胞胎題、筆記、會考原題圖片、八百多題社會…）。GitHub 的 master 是另一條線。

所以：**不要 `git pull`、不要 merge、不要 checkout 整個 master。** 只拿下面列的檔案，其他檔案一個都不要動。所有指令都在 tetris 資料夾（repo 根目錄）執行，第 8 步除外。

## 步驟

1. 取得 GitHub 上的新檔案清單：
   ```
   git fetch origin master
   ```
2. 只拿這幾個路徑（只會新增或覆蓋它們）：
   ```
   git checkout origin/master -- huikao-daily/learn huikao-daily/tools/add-questions.mjs huikao-daily/tools/m17-new-questions.json huikao-daily/tools/science-questions.json huikao-daily/tools/live-patches
   ```
3. 先備份。下面幾步會直接改 `huikao-daily/index.html`、`huikao-daily/questions.json` 和 `huikao-worker/src/index.js`；它們沒有 commit 過，是這台電腦上唯一的線上版本：
   ```
   node huikao-daily/tools/live-patches/backup-live.mjs
   ```
   它把三個檔複製到 tetris 旁邊的 `huikao-backup-日期時間` 資料夾（不會被部署，也不在 git 裡），印出 `backup ok`。
4. 在每日練頁面加「自然」科（生物、理化）：
   ```
   node huikao-daily/tools/live-patches/patch-science.mjs huikao-daily/index.html
   ```
   它一次改 28 個地方：科目清單、每日選題、再加練、科目按鈕、進度頁、錯題本篩選、設定頁、表格裡的數字不從中間斷行，以及每天的新題先發給自然（`NEW_ORDER`；複習題多的日子只剩一兩個新題名額，排最後的科目會一題都拿不到，而自然剛加入、還沒有任何紀錄）。成功會印出 `added 自然: 28 of 28 edits applied`；已經加過會印 `already has 自然; nothing to do`。
   如果這台電腦的 `index.html` 在 2026-10-20 之後又改過、某一段對不上，它會停下來、印出 `edit N of 28` 和那段原文，什麼都不寫入。這時**不要手動改 index.html**（重跑時它還是找原文，會停在同一段）。請改 `huikao-daily/tools/live-patches/patch-science.mjs` 裡 `EDITS` 的第 N 項：第一個字串改成這台電腦 index.html 裡實際的那段文字，第二個字串照同樣的意思改（可對照同資料夾的 `science-subject.patch`），然後重跑，直到印出 `added 自然` 或 `already has 自然`。
5. 加題目（已經存在的 id 會跳過，重跑沒關係）：
   ```
   node huikao-daily/tools/add-questions.mjs huikao-daily/tools/m17-new-questions.json
   node huikao-daily/tools/add-questions.mjs huikao-daily/tools/science-questions.json
   ```
   記下最後印出的 `bank now has N`。
6. 修同步：線上的 Worker 只收 `M17-01` 這種兩位數單元的卡片，`K103-01` 這種會考原題（社會 719 題）每做一題都被拒絕（`bad_key`，頁面跳「儲存失敗」），下次打開那題的紀錄就不見了。
   ```
   node huikao-daily/tools/live-patches/fix-card-key.mjs
   ```
   它只把 `huikao-worker/src/index.js` 裡卡片 id 的規則從 `\d{2}` 放寬成 `\d{2,3}`，其他不動。如果它說找不到那條規則（這台電腦的寫法不同），就自己找到檢查卡片 id 的那條規則，只改成也接受三位數：`K103-01`、`M17-01`、`B09-01`、`P05-01` 都要接受，`K1030-01` 不接受。
7. 看一下 AI 功能會不會被新科目弄壞：在 `huikao-worker/src/` 裡找處理 `op: 'twin'`（AI 雙胞胎題）和 `op: 'ask'`（問 AI）的程式。如果它有照科目分（例如 math／social／english 的對照表、各科不同的提示詞、只接受這三科的檢查），就照 english 那一項的寫法加上 science：科目名「自然」，題目的 `area` 是「生物」或「理化」，有些題目有 `figure_svg` 圖。沒有照科目分就不用改。有改的話，最後跟使用者說改了哪裡。
8. 部署：
   ```
   cd huikao-worker
   npx wrangler@latest deploy
   cd ..
   ```
   如果 deploy 停下來，訊息提到 `CLOUDFLARE_API_TOKEN`、login 或 `--temporary`，代表這台電腦的 Cloudflare 登入過期了：
   - 先跟使用者說：「等一下瀏覽器會打開 Cloudflare 的頁面，請在兩分鐘內按 Allow（允許）。」
   - 在 `huikao-worker` 裡執行 `npx wrangler@latest login`。瀏覽器沒有自己打開的話，把它印出的網址給使用者，在這台電腦上點。
   - 看到 `Successfully logged in` 就重跑 `npx wrangler@latest deploy`；看到逾時就再 login 一次。
   - 不要加 `--temporary`（那會部署到臨時帳號，不是 daily.happygoody.net）。不要請使用者建立 API token，也不要把任何 token 或密碼貼進對話。
9. 確認（回到 tetris 資料夾）：
   ```
   node huikao-daily/tools/live-patches/check-live.mjs
   ```
   要印出 `all checks passed`：頁面有自然、線上題庫的題數等於第 5 步的 N、229 題自然和 12 題相似形都在、兩頁教學打得開、Worker 收 `K103-01`。哪一項 FAIL，它會說是哪一項；剛部署完可以等一分鐘再跑一次。
10. 全部 OK 以後，把下面這段照抄給使用者（如果第 7 步有改，再加一句改了什麼）：

    > 好了！自然（生物＋理化）已經放上每日練了。
    > ① 今天睡前，把每一台開過每日練的手機、平板、電腦都重新打開一次：加到主畫面的，從多工畫面把它滑掉再點開；用瀏覽器開的，往下拉重新整理。上面那排看到「自然」就對了。（沒重新打開的舊畫面，明天會排出一組沒有自然的題目。）
    > ② 想練生物：在「今天」最上面那排按「自然」，一次 10 題，生物和理化混在一起。只想練生物：按「進度」→ 點開「自然 · 生物」→ 選一個單元（例如「生殖」）→ 按「練 5 題」。
    > ③ 如果你今天在更新前已經打開過每日練，今天的「今天綜合」是之前排好的，裡面不會有自然；明天開始，「今天綜合」會先排自然的新題（複習題很多的日子會少一點）。
    > ④ 生殖錯題講解：https://daily.happygoody.net/learn/repro.html 。看完按頁面最下面的連結，就會直接開始練生殖的題目。
    > ⑤ 順便修好一個問題：社會的會考原題之前做完會跳「儲存失敗」、紀錄沒存到。現在會存了。

## 出問題時

- 不要用 `git checkout -- …`、`git restore`、`git reset --hard` 或 `git stash` 去「還原」`huikao-daily/index.html`、`huikao-daily/questions.json` 或 `huikao-worker/`：那會變回 GitHub 上很舊的版本，蓋掉這台電腦上唯一的線上版。
- 要回到改之前：把第 3 步備份資料夾裡的三個檔複製回原位（檔名裡的 `__` 是路徑的 `/`），再部署一次。
- 卡住或不確定時，把最後的訊息原文告訴使用者，請他轉給雲端那個 Claude 對話。

## 選擇性（先問使用者）

把這台電腦的版本推到 GitHub 的新分支，之後雲端的對話才能在同一份程式上工作，不會再分岔：
```
git checkout -b pc-live
git add huikao-daily huikao-worker
git commit -m "Live version from the PC"
git push -u origin pc-live
```
commit 前先看 `git status`：不要把 `.dev.vars`、`.env`、任何金鑰或 AI 通行碼加進去（Worker 的秘密應該用 `wrangler secret` 存，不在檔案裡）。
