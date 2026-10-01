# 會考每日練

給國三生用的每日練習網頁：數學 21 單元與社會（歷史、地理、公民）題庫，照遺忘曲線排每天的題目。

- `index.html`：網頁本體（發布成 Claude Artifact，作答紀錄存在 Artifact 的 db）。
- `questions.json`：題庫。每題都先由一個代理出題、再由另一個代理在看不到答案的情況下獨立作答，答案一致且不是一步就能答的題才保留。
- `tools/qbank-workflow.js`：出題與盲解驗證的 Workflow 腳本。
- `tools/build-bank.py`：把各 Workflow 的結果合併成 `questions.json`。
- `tools/test-logic.js`：遺忘曲線排程與每日選題邏輯的單元測試（`node tools/test-logic.js`）。

排程規則：答對後在 1、3、7、14、30 天後各再出一次，五次都對就自動標為學會；答錯回到起點，隔天再出；也可以手動打勾「我確定會了」。
