// Headless end-to-end checks for ../index.html. The leaderboard API is stubbed (and, in the last section, served by the
// real leaderboard-worker code in a local Miniflare); nothing touches the real backend.
// Run:  node test/e2e.cjs       (ROOT=<folder with index.html> to test another copy)
// Needs: puppeteer-core (PUPPETEER env var or the path below), system Chrome, and `npm install` in test/ (miniflare).
const puppeteer = require(process.env.PUPPETEER || 'C:/Users/OWNER/Desktop/claude/Shanhai-Echoes/node_modules/puppeteer-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || path.resolve(__dirname, '..');
const API = 'https://tetris-api.happygoody.net';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

let pass = 0, fail = 0; const fails = [];
const ok = (c, m) => { if (c) pass++; else { fail++; fails.push(m); console.log('  FAIL:', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : req.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); res.end(d); } });
});

async function newPage(browser, opts = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  page.__rpc = opts.rpc || (() => ({ status: 200, body: '{"status":"ok"}' }));
  page.__rows = opts.rows || [{ name: 'alice', score: 5000, level: 3, lines: 25, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' }];
  page.__rpcCalls = [];
  await page.setRequestInterception(true);
  page.on('request', r => {
    const u = r.url();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (u.startsWith(API)) {
      if (opts.blockApi) return r.abort();
      if (r.method() === 'OPTIONS') return r.respond({ status: 204, headers: cors });
      if (u.startsWith(API + '/submit')) {
        page.__rpcCalls.push(JSON.parse(r.postData() || '{}'));
        const a = page.__rpc(r);
        if (a === 'abort') return r.abort();
        return r.respond({ status: a.status, headers: { ...cors, 'content-type': 'application/json' }, body: a.body });
      }
      if (u.startsWith(API + '/top')) return r.respond({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ rows: page.__rows }) });
      return r.respond({ status: 404, headers: cors, body: '{}' });
    }
    r.continue();
  });
  if (opts.mobile) await page.setViewport({ width: opts.mobile[0], height: opts.mobile[1], isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  else await page.setViewport({ width: 1280, height: 800 });
  page.errors = errors;
  return page;
}
const disp = (page, id) => page.$eval('#' + id, el => getComputedStyle(el).display);

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-first-run', '--autoplay-policy=no-user-gesture-required'] });

  // ---------------- load ----------------
  console.log('load');
  let page = await newPage(browser);
  await page.goto(URL, { waitUntil: 'load' });
  ok(await disp(page, 'overlay') === 'flex', 'start menu visible');
  ok(await disp(page, 'resume-section') === 'none', 'no resume button without a save');
  ok(await page.$eval('link[rel=icon]', l => l.href.startsWith('data:image/svg')), 'favicon present');
  ok(await page.evaluate(() => !document.querySelector('script[src]') && typeof lbFetch === 'function'), 'no external library: the page talks to the API with fetch');

  // ---------------- rotation (SRS) ----------------
  console.log('rotation');
  const rot = await page.evaluate(() => {
    const out = { wallFail: [], floorIFail: [], tCenter: null, iCells: null, jlstzFloor: [] };
    startGame(); gameRunning = false; cancelAnimationFrame(animId);
    const cells = p => { const a = []; p.shape.forEach((row, r) => row.forEach((v, c) => { if (v) a.push([p.x + c, p.y + r]); })); return a.sort((a, b) => a[0] - b[0] || a[1] - b[1]); };
    const mk = (i, state) => { const d = PIECE_DEFS[i]; let s = d.s.map(r => [...r]); for (let k = 0; k < state; k++) s = rotateCW(s); return { shape: s, color: d.c, glow: d.g, kick: d.k, rotState: state, label: null, x: 3, y: 8 }; };
    for (let i = 0; i < PIECE_DEFS.length; i++) for (let st = 0; st < 4; st++) for (const side of ['L', 'R']) for (const ccw of [false, true]) {
      createBoard(); const p = mk(i, st);
      // slide flush to the wall
      while (!collide(board, p, side === 'L' ? -1 : 1, 0)) p.x += side === 'L' ? -1 : 1;
      currentPiece = p; const before = JSON.stringify(cells(p)); tryRotate(ccw);
      if (PIECE_DEFS[i].k !== 'O' && JSON.stringify(cells(currentPiece)) === before && currentPiece.rotState === st) out.wallFail.push(`${i}/${st}/${side}/${ccw ? 'ccw' : 'cw'}`);
    }
    // flat I lying on the floor must stand up at every x
    for (let x = -0; x <= 6; x++) for (const ccw of [false, true]) {
      createBoard(); const p = mk(0, 0); p.x = x; p.y = 18;   // filled row index 1 -> row 19
      currentPiece = p; tryRotate(ccw); if (currentPiece.rotState === 0) out.floorIFail.push(x + (ccw ? 'ccw' : 'cw'));
    }
    // T in mid-air keeps its centre cell (SRS)
    createBoard(); currentPiece = mk(2, 0); currentPiece.x = 3; currentPiece.y = 5; tryRotate(false); out.tCenter = cells(currentPiece);
    // I state0 cols 3-6 row 6 -> state1 col 5 rows 5-8 (guideline)
    createBoard(); currentPiece = mk(0, 0); currentPiece.x = 3; currentPiece.y = 5; tryRotate(false); out.iCells = cells(currentPiece);
    // every JLSTZ/pentomino rotates on the floor
    for (let i = 2; i < PIECE_DEFS.length; i++) for (const ccw of [false, true]) {
      createBoard(); const p = mk(i, 0); p.y = 20 - p.shape.length; while (!collide(board, p, 0, 1)) p.y++;
      currentPiece = p; tryRotate(ccw); if (currentPiece.rotState === 0) out.jlstzFloor.push(i + (ccw ? 'ccw' : 'cw'));
    }
    // spawn positions
    const I = (() => { let p; for (let k = 0; k < 500; k++) { p = randPiece(); if (p.kick === 'I') return cells(p); } })();
    const O = (() => { let p; for (let k = 0; k < 500; k++) { p = randPiece(); if (p.kick === 'O') return cells(p); } })();
    out.Ispawn = I; out.Ospawn = O;
    return out;
  });
  ok(rot.wallFail.length === 0, 'no rotation stuck against a wall: ' + rot.wallFail.join(' '));
  ok(rot.floorIFail.length === 0, 'flat I on the floor stands up at every x: ' + rot.floorIFail.join(' '));
  ok(JSON.stringify(rot.tCenter) === JSON.stringify([[4, 5], [4, 6], [4, 7], [5, 6]]), 'T rotates about its centre: ' + JSON.stringify(rot.tCenter));
  ok(JSON.stringify(rot.iCells) === JSON.stringify([[5, 5], [5, 6], [5, 7], [5, 8]]), 'I rotates like guideline SRS: ' + JSON.stringify(rot.iCells));
  ok(rot.jlstzFloor.length === 0, 'every piece rotates on the floor: ' + rot.jlstzFloor.join(' '));
  ok(JSON.stringify(rot.Ispawn) === JSON.stringify([[3, 0], [4, 0], [5, 0], [6, 0]]), 'I spawns on row 0, cols 3-6: ' + JSON.stringify(rot.Ispawn));
  ok(JSON.stringify(rot.Ospawn) === JSON.stringify([[4, 0], [4, 1], [5, 0], [5, 1]]), 'O spawns at cols 4-5: ' + JSON.stringify(rot.Ospawn));

  // ---------------- line clear flash ----------------
  const clr = await page.evaluate(() => {
    createBoard();
    for (let c = 0; c < COLS; c++) { board[10][c] = 1; board[11][c] = 1; boardColors[10][c] = '#fff'; boardColors[11][c] = '#fff'; }
    for (let r = 12; r < 20; r++) { board[r][0] = 1; boardColors[r][0] = '#f00'; }
    board[9][3] = 1; boardColors[9][3] = '#0f0';
    const n = clearLines();
    return { n, flash: flashRows, moved: board[11][3] === 1 && board[9][3] === 0, bottomKept: board[19][0] === 1 && board[12][0] === 1 };
  });
  ok(clr.n === 2 && JSON.stringify(clr.flash) === '[10,11]', 'flash on the rows actually cleared: ' + JSON.stringify(clr));
  ok(clr.moved && clr.bottomKept, 'rows above shift down 2, rows below untouched');

  // ---------------- lock-out ----------------
  const lo = await page.evaluate(() => {
    startGame(); createBoard(); board[2][3] = 1; board[2][4] = 1; boardColors[2][3] = boardColors[2][4] = '#fff';
    createBoard(); for (let c = 0; c < 3; c++) { board[1][c] = 1; boardColors[1][c] = '#fff'; }
    const d = PIECE_DEFS[2]; currentPiece = { shape: d.s.map(r => [...r]), color: d.c, glow: d.g, kick: 'JLSTZ', rotState: 0, label: null, x: 0, y: -1 };
    // T at the left edge, tip at row -1, resting on row 1; the spawn columns 3-6 stay empty
    drop();
    return { running: gameRunning, modal: getComputedStyle(document.getElementById('name-modal')).display };
  });
  ok(!lo.running && lo.modal === 'flex', 'a piece locking above the board ends the game: ' + JSON.stringify(lo));
  await page.evaluate(() => skipScore());

  // ---------------- skip -> play -> menu (used to freeze) ----------------
  console.log('menu flows');
  const flow = await page.evaluate(async () => {
    const r = {};
    startGame(); await new Promise(res => setTimeout(res, 50)); endGame();
    skipScore();
    r.menuAfterSkip = getComputedStyle(document.getElementById('overlay')).display;
    r.lastResult = document.getElementById('last-result').textContent;
    r.resumeAfterSkip = getComputedStyle(document.getElementById('resume-section')).display;
    startGame(); r.lastHiddenInGame = getComputedStyle(document.getElementById('last-result')).display;
    hardDrop();
    showStartMenu();
    r.menuShown = getComputedStyle(document.getElementById('overlay')).display;
    r.resumeShown = getComputedStyle(document.getElementById('resume-section')).display;
    r.running = gameRunning;
    const y = currentPiece.y, x = currentPiece.x;
    resumeGame();
    r.resumed = gameRunning && currentPiece.x === x && currentPiece.y === y;
    showLeaderboard(); await new Promise(res => setTimeout(res, 50)); closeLB();
    r.backInGame = gameRunning;
    return r;
  });
  ok(flow.menuAfterSkip === 'flex', 'skip shows the real start menu');
  ok(/上一局/.test(flow.lastResult), 'start menu shows the last result');
  ok(flow.resumeAfterSkip === 'none', 'no stale resume button after game over');
  ok(flow.lastHiddenInGame === 'none', 'last result hidden during play');
  ok(flow.menuShown === 'flex' && flow.resumeShown === 'block' && !flow.running, '選單 after a skip works (used to freeze)');
  ok(flow.resumed, 'resume continues the same piece');
  ok(flow.backInGame, 'leaderboard opened mid-game returns to the game');

  // ---------------- leaderboard pauses ----------------
  const lbp = await page.evaluate(async () => {
    startGame(); await new Promise(r => setTimeout(r, 100));
    const y0 = currentPiece.y; showLeaderboard();
    const running = gameRunning;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    const x0 = currentPiece.x;
    await new Promise(r => setTimeout(r, 1800));
    const r = { running, fell: currentPiece.y - y0, xSame: currentPiece.x === x0 };
    closeLB(); r.after = gameRunning; return r;
  });
  ok(!lbp.running && lbp.fell === 0 && lbp.xSame, 'leaderboard pauses the game: ' + JSON.stringify(lbp));
  ok(lbp.after, 'closing it resumes');

  // ---------------- first frame after start/resume does not drop ----------------
  const ff = await page.evaluate(async () => {
    startGame(); const y0 = currentPiece.y; await new Promise(r => setTimeout(r, 400)); const a = currentPiece.y - y0;
    showStartMenu(); await new Promise(r => setTimeout(r, 1500)); const y1 = currentPiece.y; resumeGame(); await new Promise(r => setTimeout(r, 400));
    return { afterStart: a, afterResume: currentPiece.y - y1 };
  });
  ok(ff.afterStart === 0 && ff.afterResume === 0, 'no instant drop on start / resume: ' + JSON.stringify(ff));
  const ff2 = await page.evaluate(async () => {
    startGame(); showStartMenu(); const s = getSavedState(); s.level = 11; s.lines = 100; s.dropInterval = 100; localStorage.setItem('tetris_save_v2', JSON.stringify(s));
    await new Promise(r => setTimeout(r, 300)); resumeGame(); const y0 = currentPiece.y; await new Promise(r => setTimeout(r, 40)); return currentPiece.y - y0;
  });
  ok(ff2 === 0, 'no instant drop when resuming at a fast level: fell ' + ff2);

  // ---------------- auto-pause when the page is hidden ----------------
  const hid = await page.evaluate(async () => {
    startGame(); hardDrop();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    const r = { running: gameRunning, menu: getComputedStyle(document.getElementById('overlay')).display, saved: !!getSavedState(), resume: getComputedStyle(document.getElementById('resume-section')).display };
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    return r;
  });
  ok(!hid.running && hid.menu === 'flex' && hid.saved && hid.resume === 'block', 'hiding the page pauses into the menu: ' + JSON.stringify(hid));

  // ---------------- keyboard ----------------
  const kb = await page.evaluate(() => {
    startGame();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    const esc = !gameRunning && getComputedStyle(document.getElementById('overlay')).display === 'flex';
    resumeGame();
    // soft drop never locks: put the piece on the floor and press down a lot
    while (!collide(board, currentPiece, 0, 1)) currentPiece.y++;
    const p = currentPiece; for (let i = 0; i < 20; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    return { esc, sameAfterSoftDrop: currentPiece === p };
  });
  ok(kb.esc, 'Esc pauses');
  ok(kb.sameAfterSoftDrop, '↓ on the floor does not lock the piece');

  // ---------------- old v2 save (trimmed shapes) still loads ----------------
  const old = await page.evaluate(() => {
    const b = Array.from({ length: 20 }, () => Array(10).fill(0)), bc = Array.from({ length: 20 }, () => Array(10).fill(null));
    localStorage.setItem('tetris_save_v2', JSON.stringify({ board: b, boardColors: bc, score: 1200, level: 2, lines: 12, dropInterval: 730,
      currentPiece: { shape: [[1, 1, 1, 1]], color: '#00C9FF', glow: 'rgba(0,201,255,', kick: 'I', rotState: 0, label: null, x: 3, y: 4 },
      nextPiece: { shape: [[0, 1, 0], [1, 1, 1]], color: '#C77DFF', glow: 'rgba(199,125,255,', kick: 'JLSTZ', rotState: 0, label: null, x: 4, y: 0 }, ts: Date.now() }));
    gameRunning = false; resumeGame(); let err = null;
    try { tryRotate(); tryRotate(true); hardDrop(); } catch (e) { err = e.message; }
    return { err, running: gameRunning, score };
  });
  ok(!old.err && old.running && old.score === 1200, 'old save loads and plays: ' + JSON.stringify(old));
  ok(page.errors.length === 0, 'no page errors (desktop run): ' + page.errors.join(' | '));
  await page.close();

  // ---------------- touch buttons (phone) ----------------
  console.log('touch buttons');
  page = await newPage(browser, { mobile: [390, 844] });
  await page.goto(URL, { waitUntil: 'load' });
  const cdp = await page.target().createCDPSession();
  const center = async id => page.$eval('#' + id, el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const setup = () => page.evaluate(() => { startGame(); createBoard(); const d = PIECE_DEFS[2]; currentPiece = { shape: d.s.map(r => [...r]), color: d.c, glow: d.g, kick: 'JLSTZ', rotState: 0, label: null, x: 3, y: 2 }; dropInterval = 1e9; });
  const X = () => page.evaluate(() => currentPiece.x);
  const R = await center('btn-right'), L = await center('btn-left');
  // Judge taps by how long the PAGE saw the finger down (a busy machine can deliver touchEnd late,
  // which is then a genuinely longer press). DAS 170 + ARR 50: the first repeat is at ~220 ms.
  await page.evaluate(() => {
    window.__t = {};
    document.addEventListener('pointerdown', () => { __t.down = performance.now(); }, true);
    document.addEventListener('pointerup', () => { __t.up = performance.now(); }, true);
  });
  let judged = 0;
  for (const [B, dir, nm] of [[R, 1, '→'], [L, -1, '←']]) for (const ms of [60, 100, 130, 160, 180]) {
    await setup(); const x0 = await X();
    await touch('touchStart', [{ x: B.x, y: B.y, id: 1 }]); await sleep(ms); await touch('touchEnd', []);
    await sleep(80);
    const held = await page.evaluate(() => __t.up - __t.down), moved = await X() - x0;
    if (held < 210) { judged++; ok(moved === dir, `a ${Math.round(held)} ms tap on ${nm} moves exactly 1 cell (moved ${moved})`); }
    else console.log(`  (a ${ms} ms tap reached the page as ${Math.round(held)} ms — not judged)`);
  }
  ok(judged >= 7, `enough taps were judged (${judged}/10)`);
  await setup(); let x0 = await X();
  await touch('touchStart', [{ x: R.x, y: R.y, id: 1 }]); await sleep(420); await touch('touchEnd', []); await sleep(100);
  const held = await X() - x0;
  ok(held >= 3 && held <= 4, `holding → 420 ms auto-repeats (moved ${held})`);
  await setup(); x0 = await X();
  await touch('touchStart', [{ x: L.x, y: L.y, id: 1 }]); await sleep(30); await touch('touchCancel', []);
  await sleep(600);
  ok(await X() - x0 === -1, `a cancelled touch stops (moved ${await X() - x0})`);
  ok(!(await page.$eval('#btn-left', el => el.classList.contains('pressed'))), 'button not stuck pressed after cancel');
  await setup(); x0 = await X();
  await touch('touchStart', [{ x: L.x, y: L.y, id: 1 }]);
  await touch('touchStart', [{ x: L.x, y: L.y, id: 1 }, { x: L.x + 3, y: L.y + 3, id: 2 }]);
  await sleep(30); await touch('touchEnd', []); await sleep(600);
  ok(await X() - x0 === -1, `two fingers on ← move once and stop (moved ${await X() - x0})`);
  // a hidden page stops a held button
  await setup(); x0 = await X();
  await touch('touchStart', [{ x: R.x, y: R.y, id: 1 }]);
  const hiddenAt = await page.evaluate(() => { const t = performance.now() - __t.down; Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); return t; });
  await sleep(600); await touch('touchEnd', []);
  const movedHidden = await X() - x0;
  if (hiddenAt < 210) ok(movedHidden === 1, `leaving the app stops a held button (moved ${movedHidden})`);
  else ok(movedHidden <= 2, `leaving the app stops a held button (page was busy ${Math.round(hiddenAt)} ms; moved ${movedHidden})`);

  // ---------------- fireworks on a narrow phone ----------------
  console.log('fireworks');
  const fw = await page.evaluate(async () => {
    bgParticles.length = 0; celebrate(1);
    const z1 = bgCanvas.style.zIndex;
    let n = 0;   // peak count: headless runs rAF at ~220 fps, so sparks live ~3.6x shorter than on a phone
    for (let i = 0; i < 14; i++) { await new Promise(r => setTimeout(r, 50)); n = Math.max(n, bgParticles.filter(p => p.g > 0).length); }
    const onBoard = (() => { const ga = document.getElementById('canvas-wrap').getBoundingClientRect(); return bgParticles.filter(p => p.g > 0 && p.x > ga.left && p.x < ga.right && p.y > ga.top + 40 && p.y < ga.bottom - 40).length; })();
    for (let i = 0; i < 100 && bgCanvas.style.zIndex; i++) await new Promise(r => setTimeout(r, 100));
    return { z1, n, zAfter: bgCanvas.style.zIndex };
  });
  ok(fw.z1 === '5' && fw.n > 40, 'fireworks show on a 390 px phone: ' + JSON.stringify(fw));
  ok(fw.zAfter === '', 'effects layer drops back behind the board afterwards');
  ok(page.errors.length === 0, 'no page errors (phone run): ' + page.errors.join(' | '));
  await page.close();

  page = await newPage(browser);
  await page.goto(URL, { waitUntil: 'load' });
  const fwWide = await page.evaluate(() => { celebrate(1); return bgCanvas.style.zIndex; });
  ok(fwWide === '', 'wide screen keeps fireworks in the side gutters');
  await page.close();

  // ---------------- upload: failure keeps the window, retry works ----------------
  console.log('upload');
  let mode = 'abort';
  page = await newPage(browser, { rpc: () => mode === 'abort' ? 'abort' : mode === '500' ? { status: 500, body: '{"error":"server_error"}' } : mode === 'taken' ? { status: 200, body: '{"status":"name_taken"}' } : { status: 200, body: '{"status":"ok"}' } });
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => { startGame(); score = 1000; level = 1; lines = 5; endGame(); });
  const pend = await page.evaluate(() => localStorage.getItem('tetris_pending'));
  ok(pend && JSON.parse(pend).score === 1000, 'finished game kept as pending');
  await page.evaluate(() => { document.getElementById('player-name').value = ''; });
  await page.evaluate(() => submitScore());
  ok(await page.$eval('#submit-msg', e => e.textContent) === '先輸入名字', 'empty name asks for a name (no shared 匿名 row)');
  await page.evaluate(() => { document.getElementById('player-name').value = '小明'; });
  await page.evaluate(() => submitScore()); await sleep(300);
  ok(await disp(page, 'name-modal') === 'flex' && /上傳失敗/.test(await page.$eval('#submit-msg', e => e.textContent)), 'network failure: window stays, says so');
  mode = '500'; await page.evaluate(() => submitScore()); await sleep(300);
  ok(await disp(page, 'name-modal') === 'flex' && /上傳失敗/.test(await page.$eval('#submit-msg', e => e.textContent)), 'server error: window stays, says so');
  mode = 'taken'; await page.evaluate(() => submitScore()); await sleep(300);
  ok(/綁在別的手機或瀏覽器/.test(await page.$eval('#submit-msg', e => e.textContent)), 'name taken message');
  // IME Enter must not submit
  const callsBefore = page.__rpcCalls.length;
  await page.evaluate(() => document.getElementById('player-name').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })));
  await sleep(200);
  ok(page.__rpcCalls.length === callsBefore, 'Enter while typing Zhuyin does not submit');
  mode = 'ok';
  await Promise.all([page.evaluate(() => submitScore()), page.evaluate(() => submitScore())]); await sleep(400);
  ok(page.__rpcCalls.length === callsBefore + 1, 'double tap sends once: ' + (page.__rpcCalls.length - callsBefore));
  const last = page.__rpcCalls[page.__rpcCalls.length - 1];
  ok(last.name === '小明' && last.score === 1000 && last.level === 1 && last.lines === 5 && /^[0-9a-f]{32}$/.test(last.device), 'sends name, score and a device id');
  ok(await disp(page, 'name-modal') === 'none' && await disp(page, 'lb-overlay') === 'flex', 'success opens the leaderboard');
  ok(await page.evaluate(() => localStorage.getItem('tetris_pending')) === null, 'pending cleared after upload');
  ok(await page.evaluate(() => /alice/.test(document.getElementById('lb-content').textContent)), 'leaderboard rows render');
  await page.evaluate(() => closeLB());
  ok(await disp(page, 'overlay') === 'flex' && await disp(page, 'resume-section') === 'none', 'after closing: start menu, no stale resume');
  ok(page.errors.length === 0, 'no page errors (upload run): ' + page.errors.join(' | '));
  await page.close();

  // ---------------- reload at the name prompt keeps the result ----------------
  page = await newPage(browser);
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => { startGame(); score = 2000; level = 2; lines = 10; endGame(); });
  await page.reload({ waitUntil: 'load' });
  ok(await disp(page, 'name-modal') === 'flex' && await page.$eval('#final-score', e => e.textContent) === '2,000', 'reload at the name prompt keeps the score');
  await page.evaluate(() => skipScore());
  await page.reload({ waitUntil: 'load' });
  ok(await disp(page, 'name-modal') === 'none', 'skipped result does not come back');
  await page.close();

  // ---------------- leaderboard server unreachable: game still works ----------------
  console.log('api blocked');
  page = await newPage(browser, { blockApi: true });
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  const cdn = await page.evaluate(async () => {
    startGame(); await new Promise(r => setTimeout(r, 200)); const running = gameRunning && !!currentPiece;
    showLeaderboard(); await new Promise(r => setTimeout(r, 100));
    const lbText = document.getElementById('lb-content').textContent; closeLB();
    score = 100; level = 1; lines = 1; endGame(); document.getElementById('player-name').value = 'x'; await submitScore();
    return { running, lbText, msg: document.getElementById('submit-msg').textContent, modal: getComputedStyle(document.getElementById('name-modal')).display };
  });
  ok(cdn.running, 'game plays with the server unreachable');
  ok(/連不上/.test(cdn.lbText), 'leaderboard says it cannot connect: ' + cdn.lbText);
  ok(/上傳失敗，檢查網路/.test(cdn.msg) && cdn.modal === 'flex', 'upload says it failed and keeps the window: ' + cdn.msg);
  ok(page.errors.length === 0, 'no page errors (server unreachable): ' + page.errors.join(' | '));
  await page.close();

  // ================= review round 2 =================
  console.log('round 2');
  page = await newPage(browser);
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  // a lock that sticks out the top but completes rows below clears them and keeps playing
  const lc = await page.evaluate(() => {
    startGame(); createBoard();
    for (let c = 0; c < COLS; c++) if (c !== 8) { board[2][c] = 1; boardColors[2][c] = '#fff'; }
    board[3][8] = 1; boardColors[3][8] = '#fff';
    for (let r = 4; r < ROWS; r++) for (let c = 1; c < COLS; c++) { board[r][c] = 1; boardColors[r][c] = '#fff'; }
    const d = PIECE_DEFS[0]; let s = rotateCW(d.s.map(r => [...r]));
    currentPiece = { shape: s, color: d.c, glow: d.g, kick: 'I', rotState: 1, label: null, x: 6, y: -1 };   // vertical I in col 8, rows -1..2 (spawn cols 3-6 stay free)
    const sc = score; drop();
    return { running: gameRunning, gained: score - sc, lines, row0: board[0][8], row2full: board[2].every(Boolean) };
  });
  ok(lc.running && lc.gained === 100 && lc.lines === 1 && lc.row0 === 1 && !lc.row2full, 'lock above the top that clears a row keeps playing: ' + JSON.stringify(lc));
  // I spawns one row lower when there is room, so a spawn rotation shows all 4 cells
  const isp = await page.evaluate(() => {
    startGame(); createBoard(); const d = PIECE_DEFS[0];
    nextPiece = { shape: d.s.map(r => [...r]), color: d.c, glow: d.g, kick: 'I', rotState: 0, label: null, x: 3, y: -1 };
    spawnPiece(); tryRotate();
    let vis = 0; currentPiece.shape.forEach((row, r) => row.forEach(v => { if (v && currentPiece.y + r >= 0) vis++; }));
    return vis;
  });
  ok(isp === 4, 'I rotated right after spawn shows 4 cells: ' + isp);
  // reload at the name prompt, then skip: the menu still shows 上一局
  await page.evaluate(() => { startGame(); score = 3000; level = 2; lines = 15; endGame(); });
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => skipScore());
  ok(/上一局 3,000/.test(await page.$eval('#last-result', e => getComputedStyle(e).display + e.textContent)), 'restored result shows as 上一局 after skip');
  // names: what is sent has no trailing space and matches what the server will store
  const cn = await page.evaluate(() => [cleanName('abcdefghijk¨'), cleanName('  Tom   Lee  '), cleanName('ㅤ'), cleanName('小明👩‍💻'), cleanName('Ｚｏｅ')]);
  ok(cn[0] === 'abcdefghijk' && cn[1] === 'Tom Lee' && cn[2] === '' && cn[4] === 'Zoe', 'name clean-up: ' + JSON.stringify(cn));
  // device code: the same for the whole visit, and it can be carried over
  const dv = await page.evaluate(() => {
    const a = deviceId(), b = deviceId();
    window.prompt = () => 'ABCDEF0123456789abcdef0123456789'; window.alert = () => {};
    importDeviceCode();
    return { same: a === b, now: deviceId(), stored: localStorage.getItem('tetris_device') };
  });
  ok(dv.same && dv.now === 'abcdef0123456789abcdef0123456789' && dv.stored === dv.now, 'device code stable and importable: ' + JSON.stringify(dv));
  const dvBad = await page.evaluate(() => { window.prompt = () => 'not-a-code'; let msg = ''; window.alert = m => msg = m; importDeviceCode(); return { id: deviceId(), msg }; });
  ok(dvBad.id === 'abcdef0123456789abcdef0123456789' && /不對/.test(dvBad.msg), 'a bad code is refused');
  ok(page.errors.length === 0, 'no page errors (round 2): ' + page.errors.join(' | '));
  await page.close();

  // late upload reply after 跳過 + new game must not touch the new game
  let hold = null;
  page = await newPage(browser, { rpc: () => 'hold' });
  page.removeAllListeners('request');
  page.on('request', r => {
    const u = r.url(), cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (u.startsWith(API)) {
      if (r.method() === 'OPTIONS') return r.respond({ status: 204, headers: cors });
      if (u.startsWith(API + '/submit')) { page.__rpcCalls.push(JSON.parse(r.postData() || '{}')); if (!hold) { hold = r; return; } return r.respond({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: '{"status":"ok"}' }); }
      return r.respond({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: '{"rows":[]}' });
    }
    r.continue();
  });
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.clear(); startGame(); score = 1200; level = 1; lines = 6; endGame(); document.getElementById('player-name').value = '小明'; submitScore(); });
  await sleep(300);
  await page.evaluate(() => { skipScore(); startGame(); });
  const cors = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
  await hold.respond({ status: 200, headers: cors, body: '{"status":"ok"}' }); await sleep(400);
  const late = await page.evaluate(() => ({ running: gameRunning, lb: getComputedStyle(document.getElementById('lb-overlay')).display, submitting }));
  ok(late.running && late.lb === 'none' && !late.submitting, 'a late reply does not pause the new game: ' + JSON.stringify(late));
  await page.evaluate(() => { score = 3400; level = 1; lines = 17; endGame(); document.getElementById('player-name').value = '小明'; });
  await page.evaluate(() => submitScore()); await sleep(300);
  const g2 = page.__rpcCalls.map(c => c.score);
  ok(JSON.stringify(g2) === '[1200,3400]', 'the next game uploads on the first tap: ' + JSON.stringify(g2));
  await page.close();

  // server not updated yet (function missing) -> clear message, result kept
  page = await newPage(browser, { rpc: () => ({ status: 404, body: '{"error":"not_found"}' }) });
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(async () => { localStorage.clear(); startGame(); score = 100; level = 1; lines = 1; endGame(); document.getElementById('player-name').value = 'x'; await submitScore(); });
  ok(/排行榜正在更新/.test(await page.$eval('#submit-msg', e => e.textContent)) && await page.evaluate(() => !!localStorage.getItem('tetris_pending')), 'server not deployed yet (404): "updating" message, result kept');
  await page.close();

  // too many uploads at once (server's rate limit) -> its own message, result kept
  page = await newPage(browser, { rpc: () => ({ status: 429, body: '{"status":"rate_limited"}' }) });
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(async () => { localStorage.clear(); startGame(); score = 100; level = 1; lines = 1; endGame(); document.getElementById('player-name').value = 'x'; await submitScore(); });
  ok(/現在上傳的人太多/.test(await page.$eval('#submit-msg', e => e.textContent)) && await page.evaluate(() => !!localStorage.getItem('tetris_pending')), 'rate limited: its own message, result kept');
  await page.close();

  // an older, slower board load must not overwrite a newer one
  let heldTop = null, topCalls = 0;
  page = await newPage(browser);
  page.removeAllListeners('request');
  page.on('request', r => {
    const u = r.url(), cors = { 'access-control-allow-origin': '*' };
    if (u.startsWith(API + '/top')) { if (++topCalls === 1) { heldTop = r; return; } return r.respond({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ rows: [{ name: 'Fresh', score: 900, level: 1, lines: 5, created_at: '2026-09-25T00:00:00Z', updated_at: '2026-09-25T00:00:00Z' }] }) }); }
    r.continue();
  });
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.clear(); showLeaderboard(); });          // load A hangs
  await sleep(200);
  await page.evaluate(async () => { closeLB(); showLeaderboard(); await new Promise(r => setTimeout(r, 300)); });   // load B answers
  await heldTop.respond({ status: 500, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: '{"error":"server_error"}' });
  await sleep(300);
  ok(/Fresh/.test(await page.$eval('#lb-content', e => e.textContent)), 'a late failed load does not replace the newer board');
  await page.close();

  // storage blocked: pausing keeps the game in memory
  page = await newPage(browser);
  await page.evaluateOnNewDocument(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } }); });
  await page.goto(URL, { waitUntil: 'load' });
  const sb2 = await page.evaluate(() => {
    startGame(); for (let i = 0; i < 4; i++) hardDrop();
    const cells = board.flat().filter(Boolean).length, x = currentPiece.x, y = currentPiece.y;
    showStartMenu(); const resume = getComputedStyle(document.getElementById('resume-section')).display;
    resumeGame();
    return { resume, kept: gameRunning && board.flat().filter(Boolean).length === cells && currentPiece.x === x && currentPiece.y === y, dev: deviceId() === deviceId() };
  });
  ok(sb2.resume === 'block' && sb2.kept && sb2.dev, 'storage blocked: pause/resume keeps the game, device id stable: ' + JSON.stringify(sb2));
  ok(page.errors.length === 0, 'no page errors (storage blocked): ' + page.errors.join(' | '));
  await page.close();

  // phone: a control press never becomes a click, and a board tap works while a thumb holds ←
  page = await newPage(browser, { mobile: [412, 846] });
  await page.goto(URL, { waitUntil: 'load' });
  const cdp2 = await page.target().createCDPSession();
  const t2 = (type, pts) => cdp2.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await page.evaluate(() => { localStorage.clear(); startGame(); window.__clicks = 0; document.addEventListener('click', () => window.__clicks++, true); });
  const RB = await page.$eval('#btn-rotate', el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await t2('touchStart', [{ x: RB.x, y: RB.y, id: 1 }]); await sleep(60); await t2('touchEnd', []); await sleep(200);
  ok(await page.evaluate(() => window.__clicks) === 0, 'tapping ↻ produces no click (no ghost click into the game-over window)');
  const LB2 = await page.$eval('#btn-left', el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const CV = await page.$eval('#tetris', el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.evaluate(() => { createBoard(); const d = PIECE_DEFS[2]; currentPiece = { shape: d.s.map(r => [...r]), color: d.c, glow: d.g, kick: 'JLSTZ', rotState: 0, label: null, x: 3, y: 5 }; dropInterval = 1e9; });
  await t2('touchStart', [{ x: LB2.x, y: LB2.y, id: 1 }]);
  await t2('touchStart', [{ x: LB2.x, y: LB2.y, id: 1 }, { x: CV.x, y: CV.y, id: 2 }]);
  await t2('touchMove', [{ x: LB2.x, y: LB2.y, id: 1 }, { x: CV.x + 3, y: CV.y + 2, id: 2 }]);
  await t2('touchEnd', [{ x: CV.x + 3, y: CV.y + 2, id: 2 }]);
  await sleep(100); await t2('touchEnd', []);
  ok(await page.evaluate(() => currentPiece.rotState) === 1, 'board tap rotates while the other thumb holds ←');
  ok(page.errors.length === 0, 'no page errors (phone round 2): ' + page.errors.join(' | '));
  await page.close();

  // ================= the page against the REAL worker code (local Miniflare + D1) =================
  console.log('real worker');
  const { Miniflare, convertV4MiniflareOptions } = await import('miniflare');
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, script: fs.readFileSync(path.join(__dirname, '../leaderboard-worker/src/index.js'), 'utf8'),
    d1Databases: { DB: 'e2e' }, compatibilityDate: '2026-09-18',
  }));
  const mdb = await mf.getD1Database('DB');
  for (const q of fs.readFileSync(path.join(__dirname, '../leaderboard-worker/migrations/0001_init.sql'), 'utf8')
    .replace(/--.*$/gm, '').split(';').map(x => x.trim()).filter(Boolean)) await mdb.prepare(q).run();
  await mdb.prepare("INSERT INTO leaderboard (name, score, level, lines, created_at, updated_at) VALUES ('Mandy', 30500, 7, 67, '2026-06-16T01:47:09Z', '2026-06-16T01:47:09Z')").run();
  const realPage = async ctx => {
    const p = await (ctx || browser).newPage(); const errs = [];
    p.on('pageerror', e => errs.push(String(e.message || e)));
    await p.setRequestInterception(true);
    p.on('request', async r => {
      if (!r.url().startsWith(API)) return r.continue();
      try {
        const res = await mf.dispatchFetch(r.url(), { method: r.method(), headers: r.headers(), body: ['GET', 'HEAD'].includes(r.method()) ? undefined : r.postData() });
        const headers = {}; res.headers.forEach((v, k) => { headers[k] = v; });
        await r.respond({ status: res.status, headers, body: Buffer.from(await res.arrayBuffer()) });
      } catch (e) { r.abort(); }
    });
    p.errs = errs; await p.setViewport({ width: 1280, height: 800 }); return p;
  };
  page = await realPage();
  await page.goto(URL, { waitUntil: 'load' });
  const real1 = await page.evaluate(async () => {
    localStorage.clear(); startGame(); score = 1200; level = 2; lines = 10; endGame();
    document.getElementById('player-name').value = '  小明  ';
    document.querySelector('#name-modal .ov-btn.primary').click();                  // the real 上傳分數 button
    for (let i = 0; i < 50 && !/小明/.test(document.getElementById('lb-content').textContent); i++) await new Promise(r => setTimeout(r, 100));
    return { lb: document.getElementById('lb-content').innerText, mine: !!document.querySelector('.lb-my-row'),
      name: localStorage.getItem('tetris_name'), pending: localStorage.getItem('tetris_pending'), dev: localStorage.getItem('tetris_device') };
  });
  const row = await mdb.prepare("SELECT score, level, lines FROM leaderboard WHERE name = '小明'").first();
  ok(row && row.score === 1200 && row.level === 2 && row.lines === 10, 'real worker stored the upload: ' + JSON.stringify(row));
  ok(/Mandy[\s\S]*小明/.test(real1.lb) && real1.mine && real1.name === '小明' && real1.pending === null, 'board from the real worker shows it, marked as mine: ' + JSON.stringify(real1).slice(0, 200));
  // a second phone (its own storage) can't use 小明 ...
  const ctx2 = await browser.createBrowserContext();
  const p2 = await realPage(ctx2);
  await p2.goto(URL, { waitUntil: 'load' });
  const taken = await p2.evaluate(async () => {
    localStorage.clear(); startGame(); score = 2000; level = 2; lines = 10; endGame();
    document.getElementById('player-name').value = '小明'; await submitScore();
    return { msg: document.getElementById('submit-msg').textContent, modal: getComputedStyle(document.getElementById('name-modal')).display };
  });
  ok(/綁在別的手機或瀏覽器/.test(taken.msg) && taken.modal === 'flex', 'second phone gets the "tied to another phone" message');
  // ... until it takes over the first phone's device code with 換裝置
  await mdb.prepare("UPDATE owners SET last_submit = '2000-01-01T00:00:00.000Z'").run();
  const moved = await p2.evaluate(async code => {
    window.prompt = () => code; window.alert = () => {}; importDeviceCode(); await submitScore();
    return { msg: document.getElementById('submit-msg').textContent, lb: getComputedStyle(document.getElementById('lb-overlay')).display };
  }, real1.dev);
  const row2 = await mdb.prepare("SELECT score FROM leaderboard WHERE name = '小明'").first();
  ok(moved.lb === 'flex' && row2.score === 2000, 'after 換裝置 the second phone uploads as 小明: ' + JSON.stringify(moved) + JSON.stringify(row2));
  // an impossible score typed in devtools is refused by the real server
  const fake = await p2.evaluate(async () => {
    score = 99999900; level = 1; lines = 0; showNameModal(); document.getElementById('player-name').value = 'hacker'; await submitScore();
    return document.getElementById('submit-msg').textContent;
  });
  ok(/沒辦法上傳/.test(fake) && !(await mdb.prepare("SELECT 1 AS x FROM leaderboard WHERE name = 'hacker'").first()), 'real server refuses an impossible score: ' + fake);
  ok(page.errs.length === 0 && p2.errs.length === 0, 'no page errors (real worker): ' + page.errs.concat(p2.errs).join(' | '));
  await page.close(); await p2.close(); await ctx2.close(); await mf.dispose();

  await browser.close(); server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) console.log(fails.map(f => ' - ' + f).join('\n'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
