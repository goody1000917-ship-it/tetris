# 給「連電腦的 Claude 對話」：把新東西放上 daily.happygoody.net

背景：daily.happygoody.net 是從這台電腦部署的。這台電腦上的 `huikao-daily/index.html`、`questions.json`、`huikao-worker/` 有很多沒推到 GitHub 的改動（英文、AI 雙胞胎題、筆記、會考原題圖片、八百多題社會…）。GitHub 的 master 是另一條線。

所以：**不要 `git pull`、不要 merge、不要 checkout 整個 master。** 只拿下面列的檔案，其他檔案一個都不要動。

## 步驟

1. 取得 GitHub 上的新檔案清單：
   ```
   git fetch origin master
   ```
2. 只拿這幾個路徑（只會新增或覆蓋它們）：
   ```
   git checkout origin/master -- huikao-daily/learn huikao-daily/tools/add-questions.mjs huikao-daily/tools/m17-new-questions.json huikao-daily/tools/science-questions.json huikao-daily/tools/live-patches
   ```
3. 在每日練頁面加「自然」科（生物、理化）：
   ```
   node huikao-daily/tools/live-patches/patch-science.mjs huikao-daily/index.html
   ```
   它一次改 25 個地方（科目清單、每日選題、再加練、科目按鈕、進度頁、錯題本篩選、設定頁）。如果這台電腦的 `index.html` 在 2026-10-20 之後又改過、某一段對不上，它會停下來並印出是哪一段，什麼都不寫入；這時對照 `huikao-daily/tools/live-patches/science-subject.patch`（同樣的修改，diff 格式）手動改那一段，再重跑。已經加過會自動跳過。
4. 加題目（已經存在的 id 會跳過，重跑沒關係）：
   ```
   node huikao-daily/tools/add-questions.mjs huikao-daily/tools/m17-new-questions.json
   node huikao-daily/tools/add-questions.mjs huikao-daily/tools/science-questions.json
   ```
5. 部署：
   ```
   cd huikao-worker
   npx wrangler@latest deploy
   ```
6. 確認：
   - https://daily.happygoody.net/learn/similar.html 打得開（相似形・比例線段教學）。
   - 首頁科目列有「自然」，設定頁有「自然新題上限」。

## 選擇性（先問使用者）

把這台電腦的版本推到 GitHub 的新分支，之後雲端的對話才能在同一份程式上工作，不會再分岔：
```
git checkout -b pc-live
git add huikao-daily huikao-worker
git commit -m "Live version from the PC"
git push -u origin pc-live
```
commit 前先看 `git status`：不要把 `.dev.vars`、`.env`、任何金鑰或 AI 通行碼加進去（Worker 的秘密應該用 `wrangler secret` 存，不在檔案裡）。
