# StingCode — website + back office

The public StingCode website (Colorado-inspired design, AI guide, contact form) and a password-protected back office for **inquiries, leads, clients and projects**. One small Node.js app with a SQLite database file. No other services are needed.

## What's inside

```
server.js            Express server: website, REST API, sign-in
src/db.js            SQLite tables (leads, clients, projects, inquiries, admins, sessions)
src/auth.js          Admin passwords (scrypt-hashed), cookie sessions, rate limits
src/chat.js          "Ask our AI guide" → Claude API (key stays on the server)
public/index.html    The whole website + back office UI
public/js/api.js     Connects the page to the API
scripts/seed.js      Adds example records marked "Sample"
scripts/create-admin.js  Create an admin or reset a password
```

## Run it on your computer (5 minutes)

1. Install **Node.js 22.13 or newer** from nodejs.org.
2. In this folder:
   ```bash
   npm install
   cp .env.example .env        # then open .env and set ADMIN_EMAIL / ADMIN_PASSWORD
   npm run seed                # optional: example data so the dashboard isn't empty
   npm start
   ```
3. Open http://localhost:3000 for the website and **http://localhost:3000/admin** to sign in.

In `.env`, set `NODE_ENV=development` for local use (production mode sends the sign-in cookie over HTTPS only).

## Using the back office

- **Dashboard**: open pipeline, won value, active projects, monthly care-plan revenue, new inquiries.
- **Inquiries**: everything sent through the website form. Click **Convert to lead** to put it in the pipeline.
- **Leads**: a board you drag cards across (New → Contacted → Discovery → Proposal → Won/Lost).
- **Clients / Projects**: click any row to edit. Project progress is a slider.
- **Remove sample data** on the dashboard deletes only the records marked *Sample*.

Add a second admin (for your developer) or reset a password:
```bash
npm run create-admin -- dev@stingcode.com "a-long-password-here"
```

## Turn on the AI guide

Get an API key at console.anthropic.com, put it in `.env` as `ANTHROPIC_API_KEY=...`, and restart. Without a key, the chat politely points visitors to your email. Visitors are limited to 20 questions per 5 minutes, and answers stay short, so the cost is cents per day at normal traffic.

## Get an email for every new inquiry

1. Sign up free at resend.com **with the email address you want alerts sent to**.
2. In Resend: API Keys → Create API Key (Sending access) → copy it.
3. Add to your settings (Render → Environment): `RESEND_API_KEY` = the key, `ALERT_EMAIL_TO` = that same email.
4. Save and deploy. Each inquiry now arrives in your inbox; hit Reply to answer the customer directly.

Want alerts at a different address, or several (`a@x.com,b@x.com`)? In Resend, add and verify the domain stingcode.com (it gives you a few DNS records to add at GoDaddy), then set `ALERT_EMAIL_FROM` = `StingCode Website <alerts@stingcode.com>`.

If an email ever fails, the inquiry is still saved in the back office, and the error appears in the logs.

## Put it on stingcode.com

Any host that runs Node works. You need a **persistent disk** for the database file.

**Render** (simplest)
1. Push this folder to a private GitHub repo.
2. On render.com: New → Web Service → pick the repo. Build: `npm install`. Start: `npm start`.
3. Add a **Disk** mounted at `/var/data`, and set `DATABASE_PATH=/var/data/stingcode.db`.
4. Add the other `.env` values under Environment (`NODE_ENV=production`, `TRUST_PROXY=1`, admin email/password, API key).
5. Settings → Custom Domains → add `stingcode.com` and `www.stingcode.com`, then add the DNS records Render shows you at your domain registrar. HTTPS is automatic.

**Railway / Fly.io**: same idea. Use the included `Dockerfile`, attach a volume, and point `DATABASE_PATH` at it.

**Your own server (VPS)**: run with `pm2 start npm -- start` behind Nginx or Caddy for HTTPS, with `TRUST_PROXY=1`.

## Back up your data

Everything lives in one file (`data/stingcode.db` by default). Copy it somewhere safe on a schedule. On Render, use a daily cron job or download it from the disk.

## API (for later integrations)

All admin routes need a signed-in session cookie.

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/api/inquiries` | public | Website contact form (rate limited) |
| POST | `/api/chat` | public | AI guide (needs API key) |
| POST | `/api/login` · `/api/logout` | — | Sign in / out |
| GET | `/api/{leads,clients,projects,inquiries}` | admin | List |
| POST | `/api/{collection}` | admin | Create |
| GET / PATCH / PUT / DELETE | `/api/{collection}/{id}` | admin | Read / update / replace / delete |

## Security notes

- Passwords are hashed with scrypt; sessions are random 256-bit tokens in HttpOnly, SameSite cookies (Secure in production).
- Sign-in is limited to 8 attempts per 15 minutes per IP; the form is limited to 5 messages per 10 minutes, with a hidden spam trap.
- Write requests from other websites are rejected.
- Before launch, use a long unique admin password, and keep `.env` out of git (already in `.gitignore`).

## Ideas for next steps

- Email yourself when a new inquiry arrives (e.g. Resend or Postmark: about 10 lines in `server.js`).
- A "Book a call" link to Calendly or Cal.com in the hero buttons.
- Swap the example dashboard in the hero for screenshots of real client work once you have them.
