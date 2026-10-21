// SQLite storage using Node's built-in driver (Node 22.13+). No native modules to compile.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const DB_PATH = process.env.DATABASE_PATH || './data/stingcode.db';
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

// Field definitions for each collection: [column, type]. type: text | num | bool
export const SCHEMA = {
  leads: [
    ['name', 'text'], ['company', 'text'], ['email', 'text'], ['phone', 'text'], ['service', 'text'],
    ['value', 'num'], ['stage', 'text'], ['source', 'text'], ['notes', 'text'], ['sample', 'bool'],
  ],
  clients: [
    ['company', 'text'], ['name', 'text'], ['email', 'text'], ['phone', 'text'], ['industry', 'text'],
    ['carePlan', 'num'], ['status', 'text'], ['notes', 'text'], ['sample', 'bool'],
  ],
  projects: [
    ['name', 'text'], ['clientId', 'text'], ['clientName', 'text'], ['package', 'text'], ['status', 'text'],
    ['value', 'num'], ['progress', 'num'], ['due', 'text'], ['notes', 'text'], ['sample', 'bool'],
  ],
  inquiries: [
    ['name', 'text'], ['company', 'text'], ['email', 'text'], ['phone', 'text'], ['service', 'text'],
    ['budget', 'text'], ['timeline', 'text'], ['message', 'text'], ['handled', 'bool'], ['sample', 'bool'],
  ],
};

const sqlType = t => (t === 'text' ? 'TEXT' : t === 'num' ? 'REAL' : 'INTEGER');

for (const [table, fields] of Object.entries(SCHEMA)) {
  db.exec(`CREATE TABLE IF NOT EXISTS ${table} (
    id TEXT PRIMARY KEY,
    ${fields.map(([c, t]) => `"${c}" ${sqlType(t)}`).join(',\n    ')},
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`);
}
db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
`);

const now = () => new Date().toISOString();

// Coerce untrusted input into the column types, dropping unknown fields.
export function clean(table, input, { partial = false } = {}) {
  const out = {};
  for (const [c, t] of SCHEMA[table]) {
    if (!(c in input)) { if (!partial) out[c] = t === 'text' ? '' : 0; continue; }
    const v = input[c];
    if (t === 'text') out[c] = v == null ? '' : String(v).slice(0, 5000);
    else if (t === 'num') { const n = Number(v); out[c] = Number.isFinite(n) ? n : 0; }
    else out[c] = v === true || v === 1 || v === 'true' || v === '1' || v === 'on' ? 1 : 0;
  }
  return out;
}

function toJson(table, row) {
  if (!row) return null;
  const o = { ...row };
  for (const [c, t] of SCHEMA[table]) if (t === 'bool') o[c] = !!o[c];
  return o;
}

export function list(table) {
  return db.prepare(`SELECT * FROM ${table} ORDER BY createdAt DESC`).all().map(r => toJson(table, r));
}
export function get(table, id) {
  return toJson(table, db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id));
}
export function create(table, input, id = randomUUID()) {
  const data = clean(table, input);
  const ts = input.createdAt && !Number.isNaN(Date.parse(input.createdAt)) ? input.createdAt : now();
  const cols = Object.keys(data);
  db.prepare(`INSERT INTO ${table} (id, ${cols.map(c => `"${c}"`).join(', ')}, createdAt, updatedAt)
              VALUES (?, ${cols.map(() => '?').join(', ')}, ?, ?)`)
    .run(id, ...cols.map(c => data[c]), ts, now());
  return get(table, id);
}
export function update(table, id, input) {
  const data = clean(table, input, { partial: true });
  const cols = Object.keys(data);
  if (!get(table, id)) return null;
  if (cols.length) {
    db.prepare(`UPDATE ${table} SET ${cols.map(c => `"${c}" = ?`).join(', ')}, updatedAt = ? WHERE id = ?`)
      .run(...cols.map(c => data[c]), now(), id);
  }
  return get(table, id);
}
export function remove(table, id) {
  return db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id).changes > 0;
}
