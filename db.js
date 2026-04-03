import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'data', 'users.db');

let db;

export function initDb() {
  mkdirSync(join(__dirname, 'data'), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}

export function lookupOrCreate(username, displayName, email) {
  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (existing) {
    db.prepare('UPDATE users SET last_seen_at = CURRENT_TIMESTAMP, display_name = ?, email = ? WHERE username = ?')
      .run(displayName, email, username);
    return { ...existing, display_name: displayName, email };
  }

  const result = db.prepare('INSERT INTO users (username, display_name, email) VALUES (?, ?, ?)')
    .run(username, displayName, email);

  const now = new Date().toISOString();
  console.log(`[${now}] User created: ${username} | name: ${displayName} | email: ${email}`);

  return {
    id: result.lastInsertRowid,
    username,
    display_name: displayName,
    email,
    created_at: now,
    last_seen_at: now
  };
}

export function closeDb() {
  if (db) db.close();
}
