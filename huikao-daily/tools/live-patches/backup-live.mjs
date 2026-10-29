// Copies what the deploy steps change, which exists only on this PC (huikao-daily/index.html, questions.json and
// the Worker code in huikao-worker/src), into a folder next to the repo: outside it, so it is neither deployed nor
// picked up by git. Refuses to run in a copy that is not the live one, and never replaces an earlier backup: each
// run that will change the page gets its own folder.
// usage (from the repo root): node huikao-daily/tools/live-patches/backup-live.mjs
import fs from 'fs';
import path from 'path';
const files = ['huikao-daily/index.html', 'huikao-daily/questions.json', 'huikao-worker/src'];
for (const f of files) if (!fs.existsSync(f)) { console.error(`missing ${f}: run this from the tetris folder`); process.exit(1); }
const page = fs.readFileSync(files[0], 'utf8');
const bank = JSON.parse(fs.readFileSync(files[1], 'utf8'));
const kao = (Array.isArray(bank) ? bank : bank.questions).filter(q => /^K\d{3}-/.test(q.id)).length;
if (!kao || !/op:\s*['"]twin['"]/.test(page)) {
  console.error(`This folder is not the copy daily.happygoody.net is deployed from (its questions.json has ${kao} 會考原題 and its index.html ${/op:\s*['"]twin['"]/.test(page) ? 'has' : 'lacks'} the AI 雙胞胎題 op 'twin'). Nothing was copied or changed.`);
  console.error('Find the tetris folder whose huikao-daily/index.html has op: \'twin\' (`git worktree list` shows the main one first) and start again from step 1 there.');
  process.exit(1);
}
const earlier = fs.readdirSync('..').filter(d => d.startsWith('huikao-backup-')).sort();
if (page.includes("science: '自然'") && page.includes("chinese: '國文'")) {
  // Every patch is already in, so this run changes nothing and a copy now would not be an original. Point at the
  // backups made before earlier runs instead: the newest undoes the last run, the oldest undoes everything.
  console.log(earlier.length ? `backup ok (made before earlier runs): newest ${path.resolve('..', earlier[earlier.length - 1])}, oldest ${path.resolve('..', earlier[0])}` : 'note: index.html already has 自然 and 國文 and there is no earlier huikao-backup-* folder; nothing copied');
  process.exit(0);
}
const d = new Date(), p = n => String(n).padStart(2, '0');
const dir = path.resolve('..', `huikao-backup-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`);
if (fs.existsSync(dir)) { console.error(`${dir} already exists; not overwriting it`); process.exit(1); }
fs.mkdirSync(dir);
for (const f of files) fs.cpSync(f, path.join(dir, f.split('/').join('__')), { recursive: true });
console.log(`backup ok: ${dir} (${fs.readdirSync(dir).join(', ')})`);
