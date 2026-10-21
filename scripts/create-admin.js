// Usage: npm run create-admin -- you@stingcode.com "a-long-password"
// (Running it again with the same email resets that admin's password.)
import 'dotenv/config';
import { upsertAdmin } from '../src/auth.js';
const [email, password] = process.argv.slice(2);
try { upsertAdmin(email, password); console.log(`Admin ready: ${email}`); }
catch (e) { console.error(e.message); console.error('Usage: npm run create-admin -- you@stingcode.com "a-long-password"'); process.exit(1); }
