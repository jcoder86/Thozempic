// Thozempic — Express + better-sqlite3 backend.
// Serves the static game from ./public and exposes /api/scores for the shared
// leaderboard. Database file lives in /data so the Docker named volume keeps
// it across container rebuilds.

import express from "express";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = process.env.DATA_DIR || "/data";
const DB_PATH = path.join(DATA_DIR, "scores.db");
const PORT = Number(process.env.PORT) || 3000;

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    score       INTEGER NOT NULL,
    level       INTEGER NOT NULL,
    seconds     INTEGER NOT NULL,
    kg_lost     INTEGER NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores(score DESC);
`);

const selectTop = db.prepare(`
  SELECT id, name, score, level, seconds, kg_lost
  FROM scores
  ORDER BY score DESC, id ASC
  LIMIT 20
`);
const insertScore = db.prepare(`
  INSERT INTO scores (name, score, level, seconds, kg_lost, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const app = express();
app.use(express.json({ limit: "4kb" }));

app.get("/api/scores", (req, res) => {
  res.json(selectTop.all());
});

app.post("/api/scores", (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 30) {
    return res.status(400).json({ error: "invalid name" });
  }
  const fields = ["score", "level", "seconds", "kg_lost"];
  for (const f of fields) {
    if (!Number.isFinite(body[f]) || body[f] < 0) {
      return res.status(400).json({ error: `invalid ${f}` });
    }
  }
  const info = insertScore.run(
    name.slice(0, 30),
    body.score | 0,
    body.level | 0,
    body.seconds | 0,
    body.kg_lost | 0,
    Date.now()
  );
  res.status(201).json({ id: info.lastInsertRowid });
});

// Static game last so /api routes win.
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Thozempic listening on :${PORT}  (db at ${DB_PATH})`);
});
