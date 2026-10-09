// Adds questions to questions.json without touching the ones already there.
// usage (from the repo root): node huikao-daily/tools/add-questions.mjs huikao-daily/tools/m17-new-questions.json
// Only ids that are not in the bank yet are added; running it twice changes nothing.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const bankFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'questions.json');
const addFile = process.argv[2];
if (!addFile) { console.error('usage: node add-questions.mjs <file with new questions>'); process.exit(1); }
const text = fs.readFileSync(bankFile, 'utf8');
const bank = JSON.parse(text);
const list = Array.isArray(bank) ? bank : bank.questions;
const have = new Set(list.map(q => q.id));
const extra = JSON.parse(fs.readFileSync(addFile, 'utf8'));
const fresh = extra.filter(q => q && q.id && !have.has(q.id));
list.push(...fresh);
const pretty = /^\[\s*\n/.test(text) || /^\{\s*\n/.test(text);
fs.writeFileSync(bankFile, pretty ? JSON.stringify(bank, null, 2) + '\n' : JSON.stringify(bank));
console.log(`added ${fresh.length} questions (${extra.length - fresh.length} were already there); bank now has ${list.length}`);
