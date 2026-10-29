// Checks the deployed site after `wrangler deploy`, against the files on this PC. Read-only: the one API call is a
// card write without data, which the Worker refuses before it touches the database.
// usage (from the repo root): node huikao-daily/tools/live-patches/check-live.mjs [base URL]
import fs from 'fs';
const B = (process.argv[2] || 'https://daily.happygoody.net').replace(/\/+$/, '') + '/';
const fresh = p => B + p + (p.includes('?') ? '&' : '?') + 'check=' + Date.now();
const ids = b => new Set((Array.isArray(b) ? b : b.questions).map(q => q.id));
let bad = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) bad++; };

const page = await (await fetch(fresh(''), { cache: 'no-store' })).text();
ok(page.includes("science: '自然'") && page.includes('NEW_ORDER'), 'the page has 自然 (patch-science.mjs was applied before the deploy)');
ok(page.includes("chinese: '國文'") && page.includes('CHI_AREAS'), 'the page has 國文 (patch-chinese.mjs was applied before the deploy)');
ok(page.includes('href="learn/similar.html"') && page.includes('href="learn/repro.html"'), 'the 進度 tab links both lessons');
const scriptErr = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(([, c]) => { try { new Function(c); return ''; } catch (e) { return e.message; } }).filter(Boolean);
ok(!scriptErr.length, 'the page script has no syntax error' + (scriptErr.length ? ': ' + scriptErr[0] : ''));
const live = ids(await (await fetch(fresh('questions.json'), { cache: 'no-store' })).json());
const here = ids(JSON.parse(fs.readFileSync('huikao-daily/questions.json', 'utf8')));
const sci = [...ids(JSON.parse(fs.readFileSync('huikao-daily/tools/science-questions.json', 'utf8')))];
const m17 = [...ids(JSON.parse(fs.readFileSync('huikao-daily/tools/m17-new-questions.json', 'utf8')))];
const chiBank = JSON.parse(fs.readFileSync('huikao-daily/tools/chinese-questions.json', 'utf8'));
const byArea = a => chiBank.filter(q => q.area === a).length;
ok(/op:\s*['"]twin['"]/.test(page) && [...live].filter(id => /^K\d{3}-/.test(id)).length >= 719, 'the live site is still the PC version (AI 雙胞胎題 and the 719 會考原題 are there)');
ok(live.size === here.size, `the live bank has ${live.size} questions, this PC has ${here.size}`);
ok(sci.every(id => live.has(id)), `all ${sci.length} 自然 questions are live (生物 ${sci.filter(i => i[0] === 'B').length}, 理化 ${sci.filter(i => i[0] === 'P').length})`);
ok(m17.every(id => live.has(id)), `all ${m17.length} new 相似形 questions are live`);
ok(chiBank.every(q => live.has(q.id)), `all ${chiBank.length} 國文 questions are live (字音 ${byArea('字音')}, 字形 ${byArea('字形')}, 字義 ${byArea('字義')}; 會考原題 ${chiBank.filter(q => q.source).length})`);
for (const p of ['learn/similar.html', 'learn/repro.html']) ok((await fetch(fresh(p))).status === 200, `${p} opens`);
const r = await (await fetch(B + 'api/', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ op: 'card', code: '0'.repeat(32), key: 'K103-01' }) })).json();
ok(r.status === 'bad_data', `the Worker accepts 會考原題 card ids like K103-01 (answer to a card without data: ${r.status}; bad_key means fix-card-key.mjs was not deployed)`);
console.log(bad ? `${bad} check(s) failed` : 'all checks passed');
process.exit(bad ? 1 : 0);
