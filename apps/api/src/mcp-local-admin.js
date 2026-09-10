import { randomUUID } from 'node:crypto';
import './config.js';
import { connectDb, migrate } from './db.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || email.includes('\\') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Usage: npm run mcp:local:bootstrap -- admin@example.test');
if (!process.env.DATABASE_URL) throw new Error('Create .env from .env.example, then set DATABASE_URL to your local PostgreSQL database');
let host;
try { host = new URL(process.env.DATABASE_URL).hostname; } catch { throw new Error('DATABASE_URL must be a valid PostgreSQL URL, for example postgresql://tradedee:password@127.0.0.1:5432/tradedee'); }
if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) throw new Error('This local-only bootstrap refuses non-local DATABASE_URL');
const db = connectDb();
try {
  await migrate(db);
  const { rows: [user] } = await db.query("INSERT INTO users(id,email,name,role,email_verified_at) VALUES($1,$2,'Local TradeDee admin','admin',now()) ON CONFLICT(email) DO UPDATE SET role='admin',suspended=false,email_verified_at=COALESCE(users.email_verified_at,now()) RETURNING id,email", [randomUUID(), email]);
  console.log(`Local MCP admin ready: ${user.email}`);
  console.log('Run: npm --workspace @polylove/api run mcp:local');
} finally { await db.close(); }
