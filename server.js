// StingCode website + back office — Express server.
import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as store from './src/db.js';
import { login, logout, sessionFrom, requireAdmin, setSessionCookie, clearSessionCookie, rateLimit, upsertAdmin, adminCount } from './src/auth.js';
import { answer, chatEnabled } from './src/chat.js';
import { sendInquiryAlert, alertsEnabled } from './src/notify.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

// The admin in ADMIN_EMAIL / ADMIN_PASSWORD is created on start, and its password is
// updated to match on every start, so changing the setting on your host resets it.
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  try {
    upsertAdmin(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    console.log(`Admin account ready for ${process.env.ADMIN_EMAIL}`);
  } catch (e) { console.error('Admin not set up: ' + e.message); }
}
console.log(alertsEnabled() ? `Inquiry alerts go to ${process.env.ALERT_EMAIL_TO}` : 'Inquiry email alerts are off (set RESEND_API_KEY and ALERT_EMAIL_TO to turn them on).');
if (adminCount() === 0) console.warn('No admin account yet. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env or run: npm run create-admin');

app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
app.use(express.json({ limit: '50kb' }));

// Block cross-site writes: state-changing API calls must be JSON from our own origin.
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const hasBody = Number(req.headers['content-length'] || 0) > 0 || req.headers['transfer-encoding'];
  if ((hasBody || req.method !== 'DELETE') && !req.is('application/json')) return res.status(415).json({ error: 'JSON only' });
  if (req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({ error: 'Cross-site request blocked' });
  const origin = req.headers.origin;
  if (origin && new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'Cross-site request blocked' });
  next();
});

/* ---------- Public ---------- */
app.get('/api/config', (req, res) => {
  res.json({ admin: !!sessionFrom(req), chat: chatEnabled() });
});

app.post('/api/inquiries', rateLimit(5, 10 * 60e3), (req, res) => {
  const b = req.body || {};
  if (b.website) return res.status(201).json({ ok: true }); // honeypot field: bots fill it, people never see it
  if (!String(b.name || '').trim() || !/^\S+@\S+\.\S+$/.test(String(b.email || '')) || !String(b.message || '').trim()) {
    return res.status(400).json({ error: 'Name, a valid email and a message are required.' });
  }
  const { handled, sample, ...rest } = b; // visitors can't set internal flags
  const saved = store.create('inquiries', { ...rest, handled: false, sample: false, createdAt: undefined });
  res.status(201).json({ ok: true });
  // Email alert after replying, so a slow or failed email never blocks the visitor.
  const site = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
  sendInquiryAlert(saved, site).catch(e => console.error('Inquiry alert failed:', e.message));
});

app.post('/api/chat', rateLimit(20, 5 * 60e3), async (req, res) => {
  if (!chatEnabled()) return res.status(503).json({ error: 'Chat is not configured.' });
  try { res.json({ text: await answer(req.body?.messages) }); }
  catch (e) { res.status(e.status || 502).json({ error: e.status === 429 ? 'rate_limited' : 'Chat is unavailable right now.' }); }
});

/* ---------- Auth ---------- */
app.post('/api/login', rateLimit(8, 15 * 60e3), (req, res) => {
  const s = login(req.body?.email, req.body?.password);
  if (!s) return res.status(401).json({ error: 'That email and password don’t match.' });
  setSessionCookie(res, s.token);
  res.json({ ok: true, email: s.email });
});
app.post('/api/logout', (req, res) => { logout(req); clearSessionCookie(res); res.json({ ok: true }); });

/* ---------- Admin CRUD: /api/{leads|clients|projects|inquiries} ---------- */
const COLS = ['leads', 'clients', 'projects', 'inquiries'];
app.param('col', (req, res, next, col) => (COLS.includes(col) ? next() : res.status(404).json({ error: 'Not found' })));

app.get('/api/:col', requireAdmin, (req, res) => res.json(store.list(req.params.col)));
app.post('/api/:col', requireAdmin, (req, res) => res.status(201).json(store.create(req.params.col, req.body || {})));
app.get('/api/:col/:id', requireAdmin, (req, res) => {
  const row = store.get(req.params.col, req.params.id);
  row ? res.json(row) : res.status(404).json({ error: 'Not found' });
});
app.patch('/api/:col/:id', requireAdmin, (req, res) => {
  const row = store.update(req.params.col, req.params.id, req.body || {});
  row ? res.json(row) : res.status(404).json({ error: 'Not found' });
});
app.put('/api/:col/:id', requireAdmin, (req, res) => {
  const existing = store.get(req.params.col, req.params.id);
  const row = existing ? store.update(req.params.col, req.params.id, req.body || {}) : store.create(req.params.col, req.body || {}, req.params.id);
  res.json(row);
});
app.delete('/api/:col/:id', requireAdmin, (req, res) => {
  store.remove(req.params.col, req.params.id) ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

/* ---------- Website ---------- */
app.use(express.static(join(__dirname, 'public'), { extensions: ['html'], maxAge: '1h' }));
app.get('/admin', (req, res) => res.redirect('/#admin'));

app.listen(PORT, () => console.log(`StingCode running at http://localhost:${PORT}`));
