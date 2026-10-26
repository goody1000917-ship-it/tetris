# Derives the 生殖 mistake-lesson template from the 相似形 lesson template: drops the geometry renderer and demos,
# adds 考卷錯題 cards, ｜ tables, embedded figures and the chromosome demo.
import sys, re
src = open(sys.argv[1]).read()
def rep(old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, (n, old[:80])
    src = src.replace(old, new)

rep('<title>相似形・比例線段</title>', '<title>生殖錯題講解</title>\n<meta name="claude:viewport-fit-sides" content="cover">')
rep('padding-inline:16px;padding-block:0', 'padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:0')
rep('.wrap{max-width:680px;', 'body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:10;background:var(--bg)}\n.wrap{max-width:680px;')
rep(src[src.index('/* Layout: one 680px'):src.index(':root{')], '''/* Layout: one 680px reading column drawn like a squared workbook (方格紙): sticky header with the chapter name
   and overall progress, a strip of section chips, then the section itself. Each 考卷錯題 card shows the student's
   own pick in red pen and the right answer in green pen, the same marks as 會考每日練. In the chromosome demo,
   blue is a chromosome from the father and yellow one from the mother. */
''')
# drop diagram CSS, keep the rest
src = re.sub(r'\.fig\{.*?\n(?=\.ex\{)', '', src, flags=re.S)
rep('.demo svg{touch-action:none}\n', '''.demo svg{display:block;width:100%;height:auto}
.demo .cap{font-size:15px;line-height:1.75;padding:10px 12px;border-radius:10px;background:var(--bg);word-break:break-word}
.demo .nav{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.demo .ctl{flex-direction:column;align-items:flex-start;gap:4px}
.demo .lbl{font-size:12px;letter-spacing:.08em;color:var(--muted)}
.demo .seg button{padding:7px 11px}
.demo .rt .r{grid-template-columns:auto 1fr}
.demo .rt .r .eq{white-space:normal;text-align:right}
.cm-cell{fill:var(--paper);stroke:var(--muted);stroke-width:1.4}
.cm-egg{fill:var(--hl-soft);stroke:var(--hl);stroke-width:1.4}
.cm-sp{fill:var(--accent-soft);stroke:var(--accent);stroke-width:1.4}
.cm-tail{fill:none;stroke:var(--accent);stroke-width:1.6;stroke-linecap:round}
.cm-d{fill:#3E74D6}.cm-m{fill:#E0A21B}
.cm-cen{fill:var(--paper);stroke:var(--ink);stroke-width:.8}
.cm-t{fill:var(--ink);font-size:12px;font-family:var(--font-body);font-weight:700}
.cm-s{fill:var(--muted);font-size:11px;font-family:var(--font-body)}
.cm-arrow{stroke:var(--muted);stroke-width:1.4;fill:none}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--muted)}
.legend i{display:inline-block;width:8px;height:18px;border-radius:4px;vertical-align:middle;margin-right:5px}
/* tables inside question text */
.tbw{overflow-x:auto;margin:4px 0;max-width:100%}
table.tb{border-collapse:collapse;font-size:15px;line-height:1.5;min-width:100%}
table.tb th,table.tb td{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top;word-break:normal;overflow-wrap:break-word}
table.tb th{background:var(--bg);font-weight:700}
/* 考卷錯題 */
.mis{display:grid;gap:10px;border-left:4px solid var(--bad)}
.mis.okd{border-left-color:var(--ok)}
.mis .opt{cursor:default}
.mis .mk{flex:0 0 auto;margin-left:auto;font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;white-space:nowrap}
.mis .opt.ok .mk{background:var(--ok);color:var(--paper)}
.mis .opt.bad .mk{background:var(--bad);color:var(--paper)}
.mis .sum{font-size:15px}
.mis .kt{font-size:12px;font-weight:700;letter-spacing:.1em;color:var(--accent)}
.ow{display:grid;gap:6px;margin:0;padding:0;list-style:none}
.ow li{display:flex;gap:8px;line-height:1.75;word-break:break-word}
.ow li b{flex:0 0 auto}
.ow li.ok b{color:var(--ok)}.ow li.bad b{color:var(--bad)}
.photo{margin:0;display:grid;gap:4px;justify-items:center}
.photo img{display:block;max-width:min(100%,300px);height:auto;border-radius:10px;border:1px solid var(--line)}
.photo figcaption{font-size:13px;color:var(--muted);text-align:center}
.rem{border:1.5px solid var(--hl);border-radius:12px;background:var(--hl-soft);padding:10px 14px}
.rem .kt{color:var(--hl)}
.key .tbw{margin:6px 0;background:var(--paper);border-radius:8px}
.rem p{margin:2px 0 0;font-size:17px;line-height:1.75;font-weight:500;word-break:break-word}
''')
# header
rep('<div><h1><a href="#">相似形・比例線段</a></h1><div class="sub">國三上・會考必考單元</div></div>',
    '<div><h1><a href="#">生殖：把錯題弄懂</a></h1><div class="sub">自然・生物第 6 單元・第 7 回複習考</div></div>')
rep('<span id="doneT">10</span>', '<span id="doneT">5</span>')
rep("var KEY = 'similar-lesson-v1';", "var KEY = 'repro-lesson-v1';")
rep("ST.checks = ST.checks || {};", "ST.checks = ST.checks || {}; ST.mis = ST.mis || {};")
rep("var SECS = DATA.sections || [], EXAM = DATA.exam || [];", "var SECS = DATA.sections || [], EXAM = DATA.exam || [], FIGS = DATA.figs || {};")
# rich text with ｜ tables
rep('''// [[a/b]] -> stacked fraction, **x** -> bold, newline -> <br>
function rich(s) {
  var h = esc(s);
  h = h.replace(/\\[\\[([^\\[\\]\\/]+?)\\/([^\\[\\]]+?)\\]\\]/g, function (m, a, b) { return '<span class="fr"><span>' + a.trim() + '</span><span>' + b.trim() + '</span></span>'; });
  h = h.replace(/\\*\\*([^*]+)\\*\\*/g, '<b>$1</b>');
  return h.replace(/\\n/g, '<br>');
}''', '''// [[a/b]] -> stacked fraction, **x** -> bold, newline -> <br>; a run of lines containing ｜ is a table (first line = header)
function inline(s) {
  var h = esc(s);
  h = h.replace(/\\[\\[([^\\[\\]\\/]+?)\\/([^\\[\\]]+?)\\]\\]/g, function (m, a, b) { return '<span class="fr"><span>' + a.trim() + '</span><span>' + b.trim() + '</span></span>'; });
  return h.replace(/\\*\\*([^*]+)\\*\\*/g, '<b>$1</b>');
}
function rich(s) {
  var lines = String(s == null ? '' : s).split('\\n'), out = [], i = 0;
  while (i < lines.length) {
    if (lines[i].indexOf('｜') >= 0 && i + 1 < lines.length && lines[i + 1].indexOf('｜') >= 0) {
      var rows = [];
      while (i < lines.length && lines[i].indexOf('｜') >= 0) rows.push(lines[i++].split('｜'));
      out.push({ t: '<div class="tbw"><table class="tb">' + rows.map(function (r, k) { return '<tr>' + r.map(function (c) { return (k ? '<td>' : '<th>') + inline(c.trim()) + (k ? '</td>' : '</th>'); }).join('') + '</tr>'; }).join('') + '</table></div>', blk: true });
    } else out.push({ t: inline(lines[i++]) });
  }
  return out.map(function (o, k) { return o.t + (k < out.length - 1 && !o.blk && !out[k + 1].blk ? '<br>' : ''); }).join('');
}''')
# drop the diagram renderer
a, b = src.index('/*@dg-start*/'), src.index('/*@dg-end*/') + len('/*@dg-end*/')
src = src[:a] + src[b:]
rep("function fig(d, cap) { if (!d || !d.points || !d.points.length) return ''; return '<figure class=\"fig\"><div class=\"dgw\">' + dgRender(d) + '</div>' + (cap ? '<figcaption>' + rich(cap) + '</figcaption>' : '') + '</figure>'; }",
    "function photo(name, cap) { return FIGS[name] ? '<figure class=\"photo\"><img src=\"' + FIGS[name] + '\" alt=\"' + esc(cap || '考卷上的圖') + '\"><figcaption>' + esc(cap || '考卷上的圖') + '</figcaption></figure>' : ''; }")
src = src.replace(" + (q.diagram ? fig(q.diagram) : '')", '').replace(" + (b.diagram ? fig(b.diagram) : '')", '')
# progress counts 你試試 and 考卷錯題
rep('''function secState(sec) {
  var cs = checksOf(sec), done = cs.filter(function (b) { return ST.checks[b.id] && ST.checks[b.id].done; }).length;
  return { done: done, total: cs.length, complete: cs.length > 0 && done === cs.length, started: done > 0 };
}''', '''function misOf(sec) { return (sec.blocks || []).filter(function (b) { return b.type === 'mistake'; }); }
function misState(id) { return ST.mis[id] || (ST.mis[id] = { ok: false, redo: false, picks: [] }); }
function secState(sec) {
  var cs = checksOf(sec), ms = misOf(sec);
  var done = cs.filter(function (b) { return ST.checks[b.id] && ST.checks[b.id].done; }).length;
  var mdone = ms.filter(function (b) { return ST.mis[b.id] && ST.mis[b.id].ok; }).length;
  var all = cs.length + ms.length, n = done + mdone;
  return { done: done, total: cs.length, mdone: mdone, mtotal: ms.length, complete: all > 0 && n === all, started: n > 0 };
}''')
rep("function secLabel(i) { return i === 0 ? '暖身' : '第 ' + i + ' 節'; }\nfunction shortLabel(i) { return i === 0 ? '暖身' : String(i); }",
    "function secLabel(i) { return '第 ' + (i + 1) + ' 節'; }\nfunction shortLabel(i) { return String(i + 1); }")
rep("function shortTitle(i) { if (i === 0) return '暖身'; var t = SECS[i].title;", "function shortTitle(i) { var t = SECS[i].title;")
src = src.replace('會考實戰', '再考一次')
# home
a = src.index("  var html = '<section class=\"card sheet hero\"><h2>看懂圖，就會算比例</h2>'")
b = src.index("  html += '<ol class=\"toc\">';")
src = src[:a] + '''  var nm = SECS.reduce(function (t, s) { return t + misOf(s).length; }, 0);
  var html = '<section class="card sheet hero"><h2>你錯的 ' + nm + ' 題，其實只是 ' + SECS.length + ' 個觀念</h2>' +
    '<p>54 分不代表你很爛，只代表這幾個觀念還沒有人好好講給你聽。把下面 ' + SECS.length + ' 節看完，這些題目你都會。</p>' +
    '<p class="small muted">每一節先講觀念，再一題一題看你考卷上錯的題目：紅色是你當時選的，綠色是正確答案，下面寫著怎麼想。看懂就按「我懂了」；也可以按「遮住答案，再做一次」自己重做。最後有「你試試」新題目。</p>' +
    '<div class="row">' + (next ? '<a class="btn primary" href="#' + next.id + '">' + (started ? '繼續：' : '從這裡開始：') + esc(next.title) + '</a>' : '<a class="btn primary" href="#exam">每節都完成了，去再考一次</a>') +
    '<a class="btn" href="#exam">直接再考一次</a></div></section>';
''' + src[b:]
rep("<small>你試試 ' + st.done + ' / ' + st.total + '</small>", "<small>考卷錯題 ' + st.mdone + ' / ' + st.mtotal + '・你試試 ' + st.done + ' / ' + st.total + '</small>")
rep("'<p class=\"small muted\">學完以後，會考每日練會照遺忘曲線，隔天、三天、一週後再出這個單元的題目。<a href=\"' + DAILY + '\" target=\"_blank\" rel=\"noopener\">打開會考每日練</a></p>'",
    "'<p class=\"small muted\">看完講解，到會考每日練做生殖的題目：<a href=\"' + DAILY + '?unit=B09\" target=\"_blank\" rel=\"noopener\">按這裡直接開始練生殖</a>。在每日練做過的題目，之後會照遺忘曲線，隔天、三天、一週後再出給你複習；只看講解不會排進去。</p>'")
rep("'<div class=\"small muted\">你試試：做對 <b id=\"secDone\">' + st.done + '</b> / ' + st.total + '</div></div>'",
    "'<div class=\"small muted\">考卷錯題看懂 <b id=\"secMis\">' + st.mdone + '</b> / ' + st.mtotal + '・你試試做對 <b id=\"secDone\">' + st.done + '</b> / ' + st.total + '</div></div>'")
rep("  if (idx >= 0) { var el = document.getElementById('secDone'); if (el) el.textContent = secState(SECS[idx]).done; }",
    "  if (idx >= 0) { var st = secState(SECS[idx]), el = document.getElementById('secDone'), em = document.getElementById('secMis'); if (el) el.textContent = st.done; if (em) em.textContent = st.mdone; }")
rep("'<p>' + (ok === E.order.length ? '全對！這個單元你已經會了，接下來交給每日練幫你記住。'", "'<p>' + (ok === E.order.length ? '全對！這個單元你真的會了，接下來交給每日練幫你記住。'")
rep("換數字再挑戰一次", "換一批題目再考一次")
rep("'\" target=\"_blank\" rel=\"noopener\">去會考每日練</a>", "'?unit=B09\" target=\"_blank\" rel=\"noopener\">去每日練做生殖的題目</a>")
rep(" 題綜合題，每題只能選一次，", " 題新題目，考的都是你這次錯的觀念。每題只能選一次，")
rep("會考沒有提示", "考試沒有提示") #，這裡也先不給。想不出來可以先猜一個，看完解法再回去複習。'")
# blocks
rep("    case 'key': return '<div class=\"key\"><div class=\"kt\">' + esc(b.title || '重點') + '</div><ul>' + b.lines.map(function (l) { return '<li>' + rich(l) + '</li>'; }).join('') + '</ul>' + '</div>';",
    "    case 'key': return '<div class=\"key\"><div class=\"kt\">' + esc(b.title || '重點') + '</div>' + keyLines(b.lines) + '</div>';")
rep("function exampleInner(b) {", """// bullet lines; a run of two or more lines containing ｜ is drawn as one table
function keyLines(lines) {
  var html = '', i = 0, ul = [];
  var flush = function () { if (ul.length) html += '<ul>' + ul.join('') + '</ul>'; ul = []; };
  while (i < lines.length) {
    if (lines[i].indexOf('｜') >= 0 && i + 1 < lines.length && lines[i + 1].indexOf('｜') >= 0) {
      var run = []; while (i < lines.length && lines[i].indexOf('｜') >= 0) run.push(lines[i++]);
      flush(); html += rich(run.join('\\n'));
    } else ul.push('<li>' + rich(lines[i++]) + '</li>');
  }
  flush();
  return html;
}
function exampleInner(b) {""")
rep("    case 'fig': return fig(b.diagram, b.caption);\n", "    case 'mistake': return '<div class=\"card mis' + (misState(b.id).ok ? ' okd' : '') + '\" id=\"mis-' + esc(b.id) + '\">' + misInner(b) + '</div>';\n")
rep("function refresh(id, kind) {\n  var el = document.getElementById((kind === 'ex' ? 'ex-' : 'chk-') + id); if (!el) return;\n  var b = findBlock(id); if (!b) return;\n  el.innerHTML = kind === 'ex' ? exampleInner(b) : checkInner(b);\n}",
'''function refresh(id, kind) {
  var el = document.getElementById((kind === 'ex' ? 'ex-' : kind === 'mis' ? 'mis-' : 'chk-') + id); if (!el) return;
  var b = findBlock(id); if (!b) return;
  el.innerHTML = kind === 'ex' ? exampleInner(b) : kind === 'mis' ? misInner(b) : checkInner(b);
  if (kind === 'mis') el.classList.toggle('okd', !!misState(id).ok);
}
var L4 = ['(A)', '(B)', '(C)', '(D)'];
// a test question the student got wrong: shown in the paper's own (A)-(D) order with their pick and the right answer
function misInner(b) {
  var s = misState(b.id), yours = b.yours || [];
  var html = '<div class="row between"><span class="tag bad">考卷第 ' + b.qno + ' 題</span><span class="small muted">' + (s.ok ? '✓ 懂了' : '') + '</span></div>';
  html += '<p class="stem">' + rich(b.stem) + '</p>' + (b.fig ? photo(b.fig, '考卷上的圖') : '');
  if (s.redo) {
    var solved = s.picks.indexOf(b.answer) >= 0, last = s.picks[s.picks.length - 1];
    html += '<div class="opts" role="group" aria-label="選項">';
    b.options.forEach(function (o, i) {
      var picked = s.picks.indexOf(i) >= 0;
      html += '<button class="opt' + (picked ? (i === b.answer ? ' ok' : ' bad') : '') + '" data-act="mis-pick" data-id="' + esc(b.id) + '" data-i="' + i + '"' + (solved || picked ? ' disabled' : '') + '><span class="k">' + L4[i] + '</span><span class="v">' + rich(o) + '</span></button>';
    });
    html += '</div>';
    if (last != null) html += '<div class="fb ' + (last === b.answer ? 'ok"><b>答對了！</b>' : 'bad"><b>再想想。</b>') + rich(b.optionWhy[last]) + '</div>';
    html += '<div class="row">' + (solved ? '<button class="btn mini primary" data-act="mis-ok" data-id="' + esc(b.id) + '">' + (s.ok ? '✓ 我懂了' : '我懂了') + '</button>' : '') + '<button class="btn mini" data-act="mis-show" data-id="' + esc(b.id) + '">看講解</button></div>';
    return html;
  }
  html += '<div class="opts">';
  b.options.forEach(function (o, i) {
    var ok = i === b.answer, mine = yours.indexOf(i) >= 0;
    html += '<div class="opt' + (ok ? ' ok' : mine ? ' bad' : '') + '"><span class="k">' + L4[i] + '</span><span class="v">' + rich(o) + '</span>' + (ok ? '<span class="mk">正確答案</span>' : mine ? '<span class="mk">你選的</span>' : '') + '</div>';
  });
  html += '</div>';
  html += '<div class="sum muted">你選了 ' + yours.map(function (i) { return L4[i]; }).join('、') + '，正確答案是 ' + L4[b.answer] + '。</div>';
  html += '<div class="kt">怎麼想</div><ol class="steps">' + b.think.map(function (t) { return '<li>' + rich(t) + '</li>'; }).join('') + '</ol>';
  html += '<details class="why"><summary>四個選項各對在哪、錯在哪</summary><div class="body"><ul class="ow">' + b.optionWhy.map(function (w, i) { return '<li class="' + (i === b.answer ? 'ok' : yours.indexOf(i) >= 0 ? 'bad' : '') + '"><b>' + L4[i] + '</b><span>' + rich(w) + '</span></li>'; }).join('') + '</ul></div></details>';
  if (b.remember) html += '<div class="rem"><div class="kt">記住這句</div><p>' + rich(b.remember) + '</p></div>';
  html += '<div class="row"><button class="btn mini primary" data-act="mis-ok" data-id="' + esc(b.id) + '">' + (s.ok ? '✓ 我懂了' : '我懂了') + '</button><button class="btn mini" data-act="mis-redo" data-id="' + esc(b.id) + '">遮住答案，再做一次</button></div>';
  return html;
}''')
# demos
a = src.index('// ---------- demos ----------')
b = src.index('// ---------- routing & events ----------')
src = src[:a] + open(sys.argv[3]).read() + '\n' + src[b:]
rep("  else if (act === 'exam-start') startExam();", '''  else if (act === 'mis-ok') { var m = misState(id); m.ok = !m.ok; save(); refresh(id, 'mis'); updateSecHeader(); }
  else if (act === 'mis-redo') { var m2 = misState(id); m2.redo = true; m2.picks = []; save(); refresh(id, 'mis'); }
  else if (act === 'mis-show') { misState(id).redo = false; save(); refresh(id, 'mis'); }
  else if (act === 'mis-pick') { var m3 = misState(id), bb = findBlock(id), pi = +t.getAttribute('data-i'); if (bb && m3.picks.indexOf(bb.answer) < 0 && m3.picks.indexOf(pi) < 0) { m3.picks.push(pi); save(); refresh(id, 'mis'); } }
  else if (act === 'exam-start') startExam();''')
rep("window.dgRenderPublic = function (d) { return dgRender(d); };\n", '')
# rich() can return a table, which may not sit inside <p>: text containers become <div>
for old, new in [("'<p class=\"lp\">' + rich(b.text) + '</p>'", "'<div class=\"lp\">' + rich(b.text) + '</div>'"),
                 ("'<p class=\"stem\">' + rich(b.stem) + '</p>'", "'<div class=\"stem\">' + rich(b.stem) + '</div>'"),
                 ("<p class=\"stem\">' + rich(q.stem) + '</p>'", "<div class=\"stem\">' + rich(q.stem) + '</div>'"),
                 ("'<p>' + rich(l) + '</p>'", "'<div class=\"pl\">' + rich(l) + '</div>'")]:
    assert old in src, old
    src = src.replace(old, new)
src = src.replace('details.why p{margin:0;line-height:1.8}', 'details.why p,details.why .pl{margin:0;line-height:1.8;word-break:break-word}')
assert '<p class="stem">' not in src and "'<p>' + rich(" not in src and '<p class="lp">' not in src, 'p wrappers left'
assert 'fig(' not in src.replace('photo(', ''), 'leftover fig('
assert 'dgRender' not in src and 'demoSlide' not in src, 'leftovers'
open(sys.argv[2], 'w').write(src)
print('ok', len(src))
