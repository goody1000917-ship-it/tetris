// The sync Worker accepted card ids with a 2-digit unit only (M17-01), so every 會考原題 card (K103-01, 719 社會
// questions) was refused with 'bad_key' and dropped from the cloud record on the next load. This widens that one
// rule to 2 or 3 digits and changes nothing else. Running it twice is fine.
// usage (from the repo root): node huikao-daily/tools/live-patches/fix-card-key.mjs [huikao-worker/src/index.js]
import fs from 'fs';
const file = process.argv[2] || 'huikao-worker/src/index.js';
let s = fs.readFileSync(file, 'utf8');
const OLD = 'card: /^[A-Z]\\d{2}-\\d{2}$/';
const NEW = 'card: /^[A-Z]\\d{2,3}-\\d{2}$/';
if (s.includes(NEW)) { console.log(`card key already accepts K103-01; nothing to do (${file})`); process.exit(0); }
const n = s.split(OLD).length - 1;
if (n !== 1) {
  console.error(`expected the card key rule ${OLD} once in ${file}, found ${n}. Lines that look like id rules:`);
  s.split('\n').forEach((l, i) => { if (/\\d\{/.test(l)) console.error(`${i + 1}: ${l.trim()}`); });
  console.error('Change only the rule for card keys so it accepts K103-01, M17-01, B09-01 and P05-01 but not K1030-01.');
  process.exit(1);
}
s = s.replace(OLD, NEW);
const re = /^[A-Z]\d{2,3}-\d{2}$/;
if (!['K103-01', 'M17-01', 'B09-01', 'P05-01'].every(id => re.test(id)) || re.test('K1030-01')) { console.error('rule check failed; nothing written'); process.exit(1); }
fs.writeFileSync(file, s);
console.log(`card key now accepts K103-01 as well as M17-01, B09-01 and P05-01 (${file})`);
