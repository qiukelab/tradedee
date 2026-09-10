# Implementation status

## Delivered in source

- Existing Poly mascot and illustrated narrative landing, keyboard story tabs, responsive forms and member/admin pages.
- PostgreSQL schema and Hono API, Email/Google account flows, explicit Google linking, verification/reset, quotas, sessions and role gates.
- Live Binance Spot prices and closed candles; deterministic experimental signal calculation; OpenRouter budget reservations, sourced drafts and admin review.
- Manual/licensed-feed news, watchlists, one-shot alerts, Telegram linking, encrypted email queue, send status and audit log.
- Worker with advisory lock, restart handling, Docker/Caddy production files, encrypted backups/restore verifier and 48-hour public-price soak runner.

## Verified locally

- Auth regression now checks that GET does not consume verification tokens, expired verification/reset tokens are rejected without changing verification/session state, and two concurrent verification requests yield exactly one success. This concurrency check uses PGlite; multi-connection production PostgreSQL contention still requires a separate check.
- Email delivery regression: expired, consumed or wrong-purpose action links are cancelled and their encrypted payload cleared before sending; valid links still send. Checked at queue claim time, not a guarantee against a token being consumed during an external provider request.
- Node SQL/auth/worker regression checks use PGlite (real embedded PostgreSQL engine); existing legacy tests remain separately passing.
- Browser Email signup → actual verification POST → login → watchlist → alert → account and admin role boundaries against an isolated PostgreSQL 17 container.
- Twenty concurrent real API reads.
- Edge desktop/mobile, story tab keyboard navigation, registration/account accessibility checks.
- Live public Binance ingestion, TypeScript check, production web build.
- Encrypted dump restored into a separate test PostgreSQL database and queried successfully.

## Not yet established

- Real Google OAuth client/consent screen, Resend sending domain, OpenRouter paid calls and Telegram bot delivery. No credentials were supplied for these services; tests do not claim they were exercised live.
- Public VPS, DNS/TLS and offsite backup transfer/timer operation. No external resources were purchased or deployed.
- A completed 48-hour run and end-to-end production soak. A short test is not equivalent to 48 hours.
- The local public-price soak started at 2026-09-10 06:52 UTC; its log is `artifacts/soak-1789023136309.jsonl`. This depends on the local API/worker and computer staying running. It is not a production soak or a completed pass.
- Vitest was upgraded to 5.0.0 to resolve GHSA-82fw-gwwq-j7x9. All 17 frontend tests pass on the new version and the full npm registry audit reports zero advisories. Node 22.12+ is required for this tool version. npm reported locked old binary cleanup files on Windows; these temporary remnants were not force-deleted while the development server is running.
- Investment signal profitability or win-rate calibration. The strategy is explicitly experimental.
- Business-specific final legal text/contact details for a public launch.

## Local verification resources

The implementation created an isolated `polylove-crypto-check` PostgreSQL container on loopback port 55432. It does not use or replace the existing `polylove-postgres-1` data. Disposable browser users are removed after their test; a restore-test database and encrypted test backup are retained. API/worker preview sessions use development-only credentials, not production secrets.

The live server mounts `platform.js`; old `app.js`, Gamma/Python and beginner learning modules are preserved as legacy source. The mascot illustration module is reused by the Crypto UI. No git commit was possible because this directory has no Git metadata.
