# TradeDee — Crypto with Poly

Thai, mascot-led crypto market reading: BTC/ETH/SOL Spot, Email + Google accounts, admin-reviewed AI analyses and Telegram alerts. No trade execution.

## Local setup

1. Install Node 22+ and PostgreSQL 17. Run `npm install`.
2. Merge the new entries from `.env.example` into your private `.env`; do not overwrite existing credentials.
3. Set `DATABASE_URL`, `APP_ORIGIN=http://localhost:3000`, `ADMIN_EMAIL` and a random 32-byte hex `QUEUE_ENCRYPTION_KEY`. The key encrypts queued account emails and OAuth state; keep it stable and private.
4. Start the local database with `docker compose up -d postgres`. It is published only to `127.0.0.1:5432`; the current verification instance remains separate on localhost port 55432 with disposable test data only.
5. Run `npm run db:migrate`, `npm run dev` and, in another terminal, `npm run worker`.
6. Open http://localhost:3000. The Vite proxy forwards same-origin API requests to port 8787.

The real entry point is `apps/api/src/index.js` → `platform.js`. Legacy Polymarket source/tests remain for reference but are not mounted by this server; no Python runtime is needed for Crypto.

## External setup

For Cloudflare Tunnel deployment, use [the TradeDee deployment guide](docs/cloudflare-tunnel.md). The MCP/API stack still requires a Docker-capable host running PostgreSQL; Cloudflare supplies the public HTTPS edge and tunnel, not this runtime.

- Google: create an OAuth web client, configure the consent screen and callback `APP_ORIGIN/api/v1/auth/google/callback`. Set client ID/secret. Explicit linking is required for matching email accounts.
- Resend: verify a sending domain and set `RESEND_API_KEY`/`EMAIL_FROM`. Registration queues an encrypted email; it never pretends mail was delivered without provider success.
- Telegram: set token, bot name and webhook secret. Configure webhook to `APP_ORIGIN/api/v1/telegram/webhook` with the same secret. Users connect using one-time /start links.
- OpenRouter: set the key, then enable AI in admin settings. Disabled by default. Model pricing must be available before a reservation can be created.
- RSS: add only feeds whose terms permit display and AI processing. No feed is pre-enabled.

No provider accounts were purchased, no public deployment was made, and no live email/Telegram messages were sent during implementation.

## Verification

- `npm test`: legacy regressions + Crypto SQL/logic/auth invariants.
- `npm run check` and `npm run build:web`.
- `npm run test:browser`: Edge desktop/mobile, mascot story tabs, registration and axe accessibility.
- `apps/web/scripts/check-members.mjs`: real PostgreSQL browser flow; requires `TEST_DATABASE_URL` on isolated port 55432 and matching `TEST_QUEUE_KEY`. Creates and removes its own fixture member, including temporary admin role.
- `npm run test:soak`: 48-hour public-price soak with 20 concurrent reads/minute; writes JSONL in artifacts. This does not prove live Google/mail/AI/Telegram integration.
- `node scripts/backup.mjs`: encrypted offsite dump. See deployment guide for setup and restore checks.

## Operation

Market prices refresh every 30 seconds, closed candles every interval. Worker is single-instance under a PostgreSQL advisory lock. AI runs every four hours when enabled; drafts require approval. A short-lived/expired/crossed-entry plan cannot be approved. Signals are experimental, not calibrated win probabilities.

Auth uses Argon2id, hashed single-use action tokens, server-side sessions, strict Origin checking for mutations, payload limits and shared SQL rate limits. There are no public admin grants. The verified email matching ADMIN_EMAIL receives the initial admin role at signup.

See `docs/crypto-implementation.md` for remaining release gates and `deploy/README.md` for deployment.
