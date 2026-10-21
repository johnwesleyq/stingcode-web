// Connects the StingCode page to this server's REST API.
// The page talks to a small data interface (db / user / sample); this file implements it over fetch.
(function () {
  async function api(method, url, body) {
    const r = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: r.status, code: data.error });
    return data;
  }

  const config = api('GET', '/api/config').catch(() => ({ admin: false, chat: false }));

  // Live-ish collections: poll every 5s, and refresh immediately after any write.
  const listeners = {};
  async function refresh(col) {
    const subs = listeners[col]; if (!subs || !subs.size) return;
    try {
      const rows = await api('GET', '/api/' + col);
      const snap = { docs: rows.map(r => ({ id: r.id, data: () => { const { id, ...rest } = r; return rest; } })) };
      subs.forEach(s => s.next(snap));
    } catch (e) { subs.forEach(s => s.error && s.error(e)); }
  }
  setInterval(() => Object.keys(listeners).forEach(refresh), 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) Object.keys(listeners).forEach(refresh); });

  const split = path => { const [col, id] = path.split('/'); return { col, id }; };
  const after = col => (x => { refresh(col); return x; });

  const db = {
    collection(col) {
      return {
        add: data => api('POST', '/api/' + col, data).then(after(col)),
        onSnapshot(next, error) {
          (listeners[col] ||= new Set());
          const sub = { next, error }; listeners[col].add(sub); refresh(col);
          return () => listeners[col].delete(sub);
        },
      };
    },
    doc(path) {
      const { col, id } = split(path);
      return {
        // Public visitors submit inquiries through the public endpoint; admins write directly.
        set: data => (col === 'inquiries' && !isAdminCached ? api('POST', '/api/inquiries', data) : api('PUT', `/api/${col}/${encodeURIComponent(id)}`, data)).then(after(col)),
        update: data => api('PATCH', `/api/${col}/${encodeURIComponent(id)}`, data).then(after(col)),
        delete: () => api('DELETE', `/api/${col}/${encodeURIComponent(id)}`).then(after(col)),
      };
    },
  };

  let isAdminCached = false;
  let visitorId = null;
  try { visitorId = localStorage.getItem('sc_visitor'); } catch (e) {}
  if (!visitorId) { visitorId = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36); try { localStorage.setItem('sc_visitor', visitorId); } catch (e) {} }

  const user = {
    isOwner: async () => (isAdminCached = !!(await config).admin),
    canEdit: async () => !!(await config).admin,
    id: async () => visitorId,
  };

  // The page puts its guide instructions in the first message; the server owns the real
  // system prompt, so only the visitor's own words are sent.
  async function sample(msgs, opts = {}) {
    const clean = msgs.map((m, i) => ({
      role: m.role,
      content: i === 0 && m.content.includes('Visitor question: ') ? m.content.split('Visitor question: ').pop() : m.content,
    }));
    try {
      const { text } = await api('POST', '/api/chat', { messages: clean });
      opts.onText && opts.onText({ text, delta: text });
      return { text, truncated: false };
    } catch (e) { throw { code: e.code === 'rate_limited' || e.status === 429 ? 'rate_limited' : 'unavailable', message: e.message }; }
  }

  window.stingAuth = {
    login: (email, password) => api('POST', '/api/login', { email, password }),
    logout: () => api('POST', '/api/logout', {}),
  };

  window.claude = {
    async use(name) {
      const c = await config;
      if (name === 'db') return db;
      if (name === 'user') return user;
      if (name === 'sample') return c.chat ? sample : null;
      return null;
    },
  };
})();
