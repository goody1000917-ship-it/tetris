// ---------- demos ----------
function mountDemos(root) {
  Array.prototype.forEach.call(root.querySelectorAll('[data-demo]'), function (el) {
    try { if (el.getAttribute('data-demo') === 'chromo') demoChromo(el, el.getAttribute('data-mode')); } catch (e) { if (window.console) console.warn(e); el.innerHTML = '<div class="small muted">這個小工具載入失敗。</div>'; }
  });
}

// 染色體怎麼變: one cell's chromosomes drawn as bars, pairs side by side (blue from the father, yellow from the mother).
// 細胞分裂 keeps every pair, 減數分裂 leaves one of each pair in 4 cells, 受精 puts the pairs back together.
function demoChromo(el, mode) {
  var ORG = { fly: { name: '果蠅', n: 4, lens: [30, 27, 24, 9] }, pea: { name: '豌豆', n: 7, lens: [30, 28, 26, 24, 22, 20, 18] }, human: { name: '人', n: 23, lens: [] } };
  for (var k = 0; k < 23; k++) ORG.human.lens.push(30 - k);
  var PROC = { cell: { name: '細胞分裂', last: 4 }, meiosis: { name: '減數分裂', last: 3 }, fert: { name: '受精', last: 1 } };
  var org = 'fly', proc = PROC[mode] ? mode : 'cell', stage = 0;
  var W = 340, H = 200;
  el.innerHTML = '<div class="row between"><span class="tag">動手看看</span><span class="small muted">染色體數目怎麼變</span></div>' +
    '<div class="ctl"><span class="lbl">生物</span><div class="seg" role="group" aria-label="生物">' + ['fly', 'pea', 'human'].map(function (o) { return '<button data-org="' + o + '">' + ORG[o].name + ' ' + ORG[o].n + ' 對</button>'; }).join('') + '</div></div>' +
    '<div class="ctl"><span class="lbl">過程</span><div class="seg" role="group" aria-label="過程">' + ['cell', 'meiosis', 'fert'].map(function (p) { return '<button data-proc="' + p + '">' + PROC[p].name + '</button>'; }).join('') + '</div></div>' +
    '<div data-r="svg"></div>' +
    '<div class="legend"><span><i style="background:#3E74D6"></i>來自爸爸</span><span><i style="background:#E0A21B"></i>來自媽媽</span><span>一藍一黃、一樣長＝一對</span></div>' +
    '<div class="cap" data-r="cap" aria-live="polite"></div>' +
    '<div class="rt" data-r="rt"></div>' +
    '<div class="nav"><button class="btn mini" data-st="-1">← 上一步</button><button class="btn mini primary" data-st="1">下一步 →</button><button class="btn mini" data-st="0">重來</button><span class="small muted" data-r="pos"></span></div>';
  var R = function (k) { return el.querySelector('[data-r="' + k + '"]'); };
  var f = function (n) { return Math.round(n * 10) / 10; };

  function full(dup) { var g = []; for (var i = 0; i < ORG[org].n; i++) g.push([{ k: i, c: 'd' }, { k: i, c: 'm' }]); return { groups: g, dup: dup }; }
  function half(side, dup) { var g = []; for (var i = 0; i < ORG[org].n; i++) { var c = (i * 5 + 1) % 3 === 0 ? 'm' : 'd'; if (side === 'B') c = c === 'd' ? 'm' : 'd'; if (side === 'D') c = 'd'; if (side === 'M') c = 'm'; g.push([{ k: i, c: c }]); } return { groups: g, dup: dup }; }

  function bars(box, cont) {
    var lens = ORG[org].lens, G = cont.groups, out = '';
    for (var bw = 9; bw >= 1.4; bw -= 0.3) {
      var cw = cont.dup ? 2 * bw + 0.6 : bw, gi = bw * 0.45, go = bw * 1.3;
      var gw = 0; G.forEach(function (g) { gw = Math.max(gw, g.length * cw + (g.length - 1) * gi); });
      var cols = Math.min(G.length, Math.max(1, Math.floor((box.w + go) / (gw + go))));
      var rows = Math.ceil(G.length / cols); cols = Math.ceil(G.length / rows);
      var rowH = box.h / rows, maxLen = Math.min(rowH - 4, bw * 8);
      if (maxLen < Math.max(9, bw * 2.4) && bw > 1.5) continue;
      var gridW = cols * gw + (cols - 1) * go, x0 = box.x + (box.w - gridW) / 2;
      var rh = Math.min(rowH, maxLen + 6), y0 = box.y + (box.h - rows * rh) / 2;
      G.forEach(function (g, i) {
        var col = i % cols, row = Math.floor(i / cols), w = g.length * cw + (g.length - 1) * gi;
        var x = x0 + col * (gw + go) + (gw - w) / 2;
        g.forEach(function (c) {
          var L = lens[c.k] / 30 * maxLen, y = y0 + row * rh + (rh - L) / 2, rx = Math.min(bw / 2, 2.5);
          out += '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(bw) + '" height="' + f(L) + '" rx="' + f(rx) + '" class="cm-' + c.c + '"/>';
          if (cont.dup) out += '<rect x="' + f(x + bw + 0.6) + '" y="' + f(y) + '" width="' + f(bw) + '" height="' + f(L) + '" rx="' + f(rx) + '" class="cm-' + c.c + '"/><circle cx="' + f(x + bw + 0.3) + '" cy="' + f(y + L / 2) + '" r="' + f(Math.max(1.3, bw * 0.42)) + '" class="cm-cen"/>';
          x += cw + gi;
        });
      });
      return out;
    }
    return out;
  }
  function cell(x, y, w, h, cont, cls, label) {
    var s = '<ellipse cx="' + f(x + w / 2) + '" cy="' + f(y + h / 2) + '" rx="' + f(w / 2 - 2) + '" ry="' + f(h / 2 - 2) + '" class="' + (cls || 'cm-cell') + '"/>';
    s += bars({ x: x + w * 0.17, y: y + h * 0.18, w: w * 0.66, h: h * 0.64 }, cont);
    if (label) s += '<text x="' + f(x + w / 2) + '" y="' + f(y + h + 13) + '" text-anchor="middle" class="cm-t">' + label + '</text>';
    return s;
  }
  function grid(conts) {
    var n = conts.length, s = '';
    if (n === 1) return cell(60, 8, 220, 184, conts[0]);
    if (n === 2) return cell(6, 18, 160, 164, conts[0]) + cell(174, 18, 160, 164, conts[1]);
    if (n === 4) { conts.forEach(function (c, i) { s += cell(8 + (i % 2) * 166, 4 + Math.floor(i / 2) * 98, 158, 94, c); }); return s; }
    for (var i = 0; i < n; i++) {
      var cx = 45 + (i % 4) * 83, cy = 52 + Math.floor(i / 4) * 96;
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="34" class="cm-cell"/><text x="' + cx + '" y="' + (cy + 2) + '" text-anchor="middle" class="cm-t">' + (2 * ORG[org].n) + ' 條</text><text x="' + cx + '" y="' + (cy + 17) + '" text-anchor="middle" class="cm-s">2n</text>';
    }
    return s;
  }
  function scene() {
    var o = ORG[org], n = o.n, N2 = 2 * n, nm = o.name;
    var pairs = n + ' 對＝' + N2 + ' 條';
    if (proc === 'cell') {
      if (stage === 0) return { svg: grid([full(false)]), cap: '這是' + nm + '的一個體細胞（身體裡一般的細胞，例如皮膚、肌肉）。染色體一對一對的：' + pairs + '，這叫 **2n**。', cells: '1 個', each: pairs + '（成對）', code: '2n ＝ ' + N2 };
      if (stage === 1) return { svg: grid([full(true)]), cap: '準備分裂：每一條染色體先**複製**一份，兩份還連在一起（中間的小圓點）。連在一起時，還是算 ' + N2 + ' 條。', cells: '1 個', each: pairs + '（每條都複製好了）', code: '2n ＝ ' + N2 };
      var cnt = Math.pow(2, stage - 1), conts = []; for (var i = 0; i < cnt; i++) conts.push(full(false));
      return { svg: grid(conts), cap: stage === 2 ? '複製的兩份**分開**，平均分到 2 個細胞。每個新細胞都是 ' + pairs + '，和原來的細胞一模一樣。' : '細胞分裂 ' + (stage - 1) + ' 次：1 → ' + [2, 4, 8].slice(0, stage - 1).join(' → ') + '，共 ' + cnt + ' 個細胞，每個還是 ' + N2 + ' 條。分裂幾次都一樣：**細胞變多，每個細胞的染色體數目不變**。', cells: cnt + ' 個（分裂 ' + (stage - 1) + ' 次）', each: pairs + '（成對）', code: '2n ＝ ' + N2 };
    }
    if (proc === 'meiosis') {
      if (stage === 0) return { svg: grid([full(false)]), cap: '這是' + nm + '會產生精子或卵的細胞，現在是 ' + pairs + '（2n）。', cells: '1 個', each: pairs + '（成對）', code: '2n ＝ ' + N2 };
      if (stage === 1) return { svg: grid([full(true)]), cap: '染色體先**複製**一份（兩份還連在一起）。這一步和細胞分裂一樣。', cells: '1 個', each: pairs + '（每條都複製好了）', code: '2n ＝ ' + N2 };
      if (stage === 2) return { svg: grid([half('A', true), half('B', true)]), cap: '第一次分裂：**每一對的兩條分開**，各到一個細胞。現在每個細胞只有每對中的一條：' + n + ' 條，不成對了。', cells: '2 個', each: n + ' 條（不成對，還連著複製的那份）', code: 'n ＝ ' + n };
      return { svg: grid([half('A', false), half('A', false), half('B', false), half('B', false)]), cap: '第二次分裂：複製的兩份再分開。最後得到 **4 個**細胞（精子或卵），每個 ' + n + ' 條、**不成對**（n），是原來 ' + N2 + ' 條的一半。', cells: '4 個', each: n + ' 條（不成對）', code: 'n ＝ ' + n };
    }
    if (stage === 0) {
      var s = '<path d="M60 100 C 46 86, 38 116, 24 100 S 8 86, 2 100" class="cm-tail"/>' + cell(56, 52, 104, 96, half('D', false), 'cm-sp', '精子') + '<text x="172" y="106" text-anchor="middle" class="cm-t" style="font-size:20px">＋</text>' + cell(186, 14, 150, 168, half('M', false), 'cm-egg');
      s += '<text x="261" y="196" text-anchor="middle" class="cm-t">卵</text>';
      return { svg: s, cap: '精子有 ' + n + ' 條（n），來自爸爸（藍）；卵有 ' + n + ' 條（n），來自媽媽（黃）。兩個都**不成對**。', cells: '精子 1 個＋卵 1 個', each: '各 ' + n + ' 條（不成對）', code: 'n ＝ ' + n };
    }
    return { svg: cell(70, 8, 200, 168, full(false), 'cm-egg', '受精卵'), cap: '**受精**：精子和卵結合成受精卵。' + n + ' 條＋' + n + ' 條＝' + N2 + ' 條，每一條藍色都和一樣長的黃色配成一對，又變回 ' + pairs + '（2n），和爸爸、媽媽的體細胞一樣多。', cells: '受精卵 1 個', each: pairs + '（成對）', code: '2n ＝ ' + N2 };
  }
  function draw() {
    Array.prototype.forEach.call(el.querySelectorAll('[data-org]'), function (b) { var on = b.getAttribute('data-org') === org; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-proc]'), function (b) { var on = b.getAttribute('data-proc') === proc; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    var sc = scene(), last = PROC[proc].last;
    R('svg').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(sc.cap.replace(/\*\*/g, '')) + '">' + sc.svg + '</svg>';
    R('cap').innerHTML = rich(sc.cap);
    R('rt').innerHTML = [['細胞數', sc.cells], ['每個細胞的染色體', sc.each], ['寫法', sc.code]].map(function (r) { return '<div class="r"><span class="x">' + r[0] + '</span><span class="eq">' + esc(r[1]) + '</span></div>'; }).join('');
    R('pos').textContent = PROC[proc].name + ' 第 ' + (stage + 1) + ' / ' + (last + 1) + ' 步';
    el.querySelector('[data-st="-1"]').disabled = stage === 0;
    el.querySelector('[data-st="1"]').disabled = stage >= last;
  }
  el.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-org],[data-proc],[data-st]'); if (!b || b.disabled) return;
    if (b.hasAttribute('data-org')) { org = b.getAttribute('data-org'); }
    else if (b.hasAttribute('data-proc')) { proc = b.getAttribute('data-proc'); stage = 0; }
    else { var d = +b.getAttribute('data-st'); stage = d === 0 ? 0 : Math.max(0, Math.min(PROC[proc].last, stage + d)); }
    draw();
  });
  draw();
}
