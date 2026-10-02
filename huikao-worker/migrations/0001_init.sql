-- 會考每日練 progress on Cloudflare D1. One row per document, keyed by the sha-256 of the student's sync code
-- (the code itself is never stored). kind is 'card' (per question), 'day' (per date) or 'settings' (key 'settings').
CREATE TABLE IF NOT EXISTS docs (
  user_hash  TEXT NOT NULL,
  kind       TEXT NOT NULL,
  key        TEXT NOT NULL,
  data       TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_hash, kind, key)
);
