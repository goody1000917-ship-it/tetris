# 風格指南：手感新粗獷風（Playful Neo-brutalism）

> 學習來源：codex-resets.com 的版面風格分析（2026-09）。
> 這份文件記錄的是「設計手法」，所有 CSS 皆為重新實作，可直接套用到本專案或其他頁面。
> 現成示範：`docs/style-demo.html`。

## 一句話描述

奶油紙色底 + 深墨色粗邊框 + 不模糊的硬式偏移陰影 + 糖果色卡片微微歪斜，
像手工貼紙貼在筆記本上的感覺。可愛但工整，資訊密度依然可以很高。

---

## 1. 設計代幣（Design Tokens）

整個風格的靈魂是一組 CSS 變數。亮色模式用 hex，暗色模式用 oklch 重新定義**同一組變數**（色相不變、亮度降低），元件完全不用改。

```css
:root {
  color-scheme: light;
  /* 底色三層：紙 → 卡片 → 文字 */
  --paper: #fff4dd;        /* 頁面底：奶油紙色，不是純白 */
  --card:  #fffdf7;        /* 卡片底：比紙更亮一點的暖白 */
  --ink:   #26201a;        /* 主文字 + 所有邊框：暖黑，不是 #000 */
  --ink-2: #5c5347;        /* 次要文字 */
  --ink-3: #877b6b;        /* 說明文字、mono 小字 */

  /* 主色 + 糖果色，每色都配一個 --on-* 前景色 */
  --accent: #ff5c2b;  --accent-hover: #ee4518;  --on-accent: var(--card);
  --sun:    #ffd84d;  --sun-hover:    #ffe070;  --on-sun:    var(--ink);
  --rose:   #ffb9cc;  --on-rose: var(--ink);
  --sky:    #a5dcff;  --on-sky:  var(--ink);
  --peach:  #ffb07a;  --on-peach: var(--ink);
  --mint:   #b9e6a6;  --on-mint: var(--ink);

  /* 三大簽名手法的代幣 */
  --border: 2px solid var(--ink);          /* 粗實線邊框 */
  --shadow-ink: var(--ink);
  --shadow:    4px 4px 0 var(--shadow-ink); /* 硬陰影：偏移、零模糊 */
  --shadow-sm: 3px 3px 0 var(--shadow-ink);
  --radius: 14px;

  /* 點陣紙紋（hero 卡片用） */
  --dot-ink: #26201a1a;

  /* 字體三層 */
  --font-display: "Baloo 2", "Arial Rounded MT Bold", system-ui, sans-serif;
  --font-body: system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --paper: oklch(18% .012 70);   /* 同色相的暖黑 */
  --card:  oklch(24% .014 70);
  --ink:   oklch(93% .025 80);
  --ink-2: oklch(76% .025 75);
  --ink-3: oklch(66% .024 72);
  --accent: oklch(67% .2 38);    --accent-hover: oklch(62% .2 38);
  --sun:    oklch(75% .135 82);  --sun-hover: oklch(79% .14 82);
  --rose:   oklch(70% .12 355);
  --sky:    oklch(71% .095 232);
  --peach:  oklch(78% .12 48);
  --mint:   oklch(72% .11 145);
  --on-accent: oklch(20% .03 38);
  --on-sun:  oklch(22% .04 82);
  --on-rose: oklch(20% .03 350);
  --on-sky:  oklch(20% .03 235);
  --on-mint: oklch(20% .04 145);
  --dot-ink: #f6e8cf14;
  --shadow-ink: oklch(8% .005 70);  /* 陰影改用近黑，不再是 ink */
}
```

**重點觀察**
- 暗色模式的彩色底不是變暗的同一色，而是**降飽和、降亮度的 oklch 版本**，前景色 `--on-*` 一起換成深色 → 對比永遠夠。
- 陰影色獨立成 `--shadow-ink`：亮色 = 墨色，暗色 = 近黑，這樣暗色下陰影不會變成亮框。

---

## 2. 五個簽名手法（照抄就有那個味道）

### 手法 1：墨線框 + 硬偏移陰影（最核心）
每個卡片、按鈕、圖表容器都是這三行：
```css
border: var(--border);            /* 2px 實線墨色 */
border-radius: var(--radius);     /* 14px */
box-shadow: var(--shadow);        /* 4px 4px 0 —— 零模糊！ */
```
陰影大小分級：小元件 `2–3px`、一般卡片 `4px`、hero 主卡 `6px 6px 0`。

### 手法 2：微旋轉（手貼感）
卡片和大數字加 0.4°～1.2° 的微小旋轉，**相鄰元素正負交錯**：
```css
.hero-card   { transform: rotate(-.4deg); }
.stat-tile:nth-child(1) { transform: rotate(-1deg); }
.stat-tile:nth-child(2) { transform: rotate(.7deg); }
.stat-tile:nth-child(3) { transform: rotate(-.6deg); }
```
裝飾性小元素（貼紙、emoji 徽章）可以轉大一點（4°～14°）。

### 手法 3：實體按鈕的按壓回饋
按鈕平常有陰影；hover 往左上浮、陰影變深；**按下時往右下位移、陰影歸零** → 看起來像真的被壓進紙面：
```css
.btn {
  border: var(--border);
  border-radius: 999px;               /* 藥丸形；方按鈕用 10px */
  box-shadow: var(--shadow-sm);
  font-family: var(--font-display);
  font-weight: 700;
  transition: transform .1s, box-shadow .1s;
}
.btn:hover  { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--shadow-ink); }
.btn:active { transform: translate(3px,3px);   box-shadow: 0 0 0 var(--shadow-ink); }
```

### 手法 4：點陣紙紋背景
Hero 卡片鋪一層極淡的圓點，像方眼筆記本：
```css
.hero-card {
  background: var(--card);
  background-image: radial-gradient(var(--dot-ink) 1.5px, transparent 1.5px);
  background-size: 18px 18px;
}
```

### 手法 5：彈跳登場動畫
進場動畫用「回彈」曲線 `cubic-bezier(.34,1.56,.64,1)`（overshoot），
滑順展開用 `cubic-bezier(.16,1,.3,1)`：
```css
@keyframes pop-in { from { opacity: 0; transform: scale(.85) rotate(-1.2deg); } }
.hero-figure { animation: .5s cubic-bezier(.34,1.56,.64,1) both pop-in; }
```

---

## 3. 版面骨架

- **單欄置中**：`max-width: 880px; margin: 0 auto; padding: 0 24px 72px;`（手機縮成 16px）。
- **Masthead**：flex 橫排 — 圓形頭像/emoji 徽章 + 粗圓體站名，右側放小工具（主題切換）。
- **Section 標題**：主標（display 字體）+ mono 小字副標，baseline 對齊：
  ```css
  .section-head { display: flex; align-items: baseline; gap: 14px; margin-bottom: 18px; }
  .section-sub  { font-family: var(--font-mono); font-size: 12px; color: var(--ink-3); }
  ```
- **統計列**：`display: grid; grid-template-columns: repeat(3,1fr); gap: 18px;`
  每格用不同糖果色底 + 不同微旋轉。
- **對話泡泡列表**（活動紀錄）：頭像 + 泡泡卡，泡泡尾巴用 `::before` 旋轉 45° 的小方塊：
  ```css
  .bubble::before {
    content: ""; position: absolute; top: 18px; left: -8px;
    width: 13px; height: 13px; background: var(--card);
    border-left: var(--border); border-bottom: var(--border);
    transform: rotate(45deg);
  }
  ```

## 4. 字體規則

| 用途 | 字體 | 規則 |
|---|---|---|
| 標題、大數字、按鈕 | Baloo 2（圓潤粗體，700/800） | `letter-spacing: -.01em`，行高 1.05 |
| 內文 | system-ui | `line-height: 1.55` |
| 時間戳、副標、註解 | mono | 12px、`--ink-3` 色 |

字級用 `clamp()` 流式縮放：站名 `clamp(28px,4.5vw,36px)`、hero 大數字 `clamp(40px,7.5vw,68px)`。
大數字可以直接放在 `--sun` 黃色底、圓角 10px 的 inline-block 上再微旋轉，像螢光筆貼紙。

## 5. 語氣（版面之外的一半）

- emoji 直接當圖示用（🙏、⏳、🎉），不用 icon font。
- 文案口語、有梗；mono 小字負責正經的 metadata。
- 互動小巧思：可以點的無用按鈕（許願鍵）、計數器、投票 — 讓頁面有「活著」的感覺。

## 6. 套用到本專案的建議

Tetris 的 UI（計分板、排行榜、按鈕、遊戲結束面板）都適合換成這套：
紙色底 + 墨線框卡片 + 硬陰影按鈕 + 糖果色 stat tiles，方塊本身的高彩度顏色和糖果色系天生合拍。
