// Admin accounts (scrypt-hashed passwords) and cookie sessions stored in SQLite.
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from './db.js';

const COOKIE = 'sc_session';
const SESSION_DAYS = 14;

export function hashPassword(pw) {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
export function verifyPassword(pw, stored) {
  const [, saltHex, hashHex] = String(stored).split('$');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(pw, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}

export function upsertAdmin(email, password) {
  if (!email || !password || password.length < 10) throw new Error('Admin needs an email and a password of at least 10 characters.');
  const hash = hashPassword(password);
  const e = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(e);
  if (existing) db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, existing.id);
  else db.prepare('INSERT INTO admins (email, password_hash, createdAt) VALUES (?, ?, ?)').run(e, hash, new Date().toISOString());
}
export const adminCount = () => db.prepare('SELECT COUNT(*) n FROM admins').get().n;

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(p => p.trim().split('=')).filter(p => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
}

export function login(email, password) {
  const row = db.prepare('SELECT * FROM admins WHERE email = ?').get(String(email || '').trim().toLowerCase());
  // Always run a hash so response timing doesn't reveal whether the email exists.
  const ok = row ? verifyPassword(String(password || ''), row.password_hash) : (verifyPassword('x', hashPassword('y')), false);
  if (!ok) return null;
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, admin_id, expires) VALUES (?, ?, ?)').run(token, row.id, Date.now() + SESSION_DAYS * 864e5);
  return { token, email: row.email };
}

export function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`);
}
export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

export function sessionFrom(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return null;
  const s = db.prepare('SELECT s.token, s.expires, a.email FROM sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token = ?').get(token);
  if (!s) return null;
  if (s.expires < Date.now()) { db.prepare('DELETE FROM sessions WHERE token = ?').run(token); return null; }
  return s;
}
export function logout(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function requireAdmin(req, res, next) {
  const s = sessionFrom(req);
  if (!s) return res.status(401).json({ error: 'Please sign in.' });
  req.admin = s;
  next();
}

// Tiny in-memory rate limiter: max `n` hits per `ms` window per key.
export function rateLimit(n, ms) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip + ':' + req.path;
    const t = Date.now();
    const arr = (hits.get(key) || []).filter(x => t - x < ms);
    if (arr.length >= n) return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    arr.push(t); hits.set(key, arr);
    if (hits.size > 10000) hits.clear();
    next();
  };
}
