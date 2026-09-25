-- Tetris leaderboard on Cloudflare D1 (replaces the Supabase tables).
-- leaderboard: public rows.  owners: which device (sha-256 of its secret code) owns each name; never sent to players.
CREATE TABLE IF NOT EXISTS leaderboard (
  name       TEXT PRIMARY KEY,
  score      INTEGER NOT NULL,
  level      INTEGER NOT NULL,
  lines      INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
-- matches /top's ORDER BY exactly, so reading the top 50 reads 50 rows (no temp sort, no extra rows on ties)
CREATE INDEX IF NOT EXISTS leaderboard_rank_idx ON leaderboard (score DESC, updated_at ASC);

CREATE TABLE IF NOT EXISTS owners (
  name        TEXT PRIMARY KEY REFERENCES leaderboard (name) ON DELETE CASCADE,
  device_hash TEXT NOT NULL,
  claimed_at  TEXT NOT NULL,
  last_submit TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS owners_device_idx ON owners (device_hash, claimed_at);
