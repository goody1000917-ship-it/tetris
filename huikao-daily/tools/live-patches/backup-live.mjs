// Copies the files the deploy steps change, which exist only on this PC, into a folder next to the repo
// (outside it, so it is neither deployed nor picked up by git).
// usage (from the repo root): node huikao-daily/tools/live-patches/backup-live.mjs
import fs from 'fs';
import path from 'path';
const files = ['huikao-daily/index.html', 'huikao-daily/questions.json', 'huikao-worker/src/index.js'];
for (const f of files) if (!fs.existsSync(f)) { console.error(`missing ${f}: run this from the tetris folder`); process.exit(1); }
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
const dir = path.resolve('..', 'huikao-backup-' + stamp);
fs.mkdirSync(dir, { recursive: true });
for (const f of files) fs.copyFileSync(f, path.join(dir, f.split('/').join('__')));
console.log(`backup ok: ${dir} (${fs.readdirSync(dir).join(', ')})`);
