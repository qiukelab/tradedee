# Production runbook

Deploy from `/opt/polylove` on a Linux VPS with Docker Compose and Node 22. No server has been provisioned by this implementation.

1. Prepare `.env` using `.env.example`. Use a hex database password to avoid URL escaping errors, a real DOMAIN, ADMIN_EMAIL, independent random queue and backup keys, and the external provider credentials.
2. Point DOMAIN DNS at the VPS. Open 80/443 only; PostgreSQL and API have no public host ports.
3. Run `docker compose --env-file .env -f deploy/compose.yml config --quiet`, then `docker compose --env-file .env -f deploy/compose.yml up -d --build`.
4. Caddy terminates HTTPS and replaces X-Real-IP. Never expose API directly with TRUST_PROXY enabled.
5. Register the ADMIN_EMAIL account and verify its email (or verified Google identity). Enable AI only after provider connection and pricing checks.
6. Complete Google consent configuration, Resend domain verification and Telegram webhook registration.

## Backups

Use a dedicated offsite directory `/var/backups/polylove-crypto` and SSH key authentication. Set `BACKUP_SSH_TARGET=user@host:/var/backups/polylove-crypto`. Keep BACKUP_KEY separately from the server. Run `node scripts/backup.mjs`; it copies an AES-GCM-encrypted pg_dump and prunes only generated backups older than seven days in the dedicated local/remote directories. A failure is a nonzero exit, not a successful backup.

Install `polylove-backup.service` and `.timer` into systemd and enable the timer for daily backups. The host running the service needs Node, Docker and OpenSSH. Inspect failed timer runs; do not treat a local copy as an offsite backup.

For a restore check, set `RESTORE_TEST_DB=polylove_restore_test_<unique_suffix>` and run `node scripts/backup.mjs verify backups/<file>.backup`. It creates a new database, restores with exit-on-error and queries users/candles. It never overwrites the live DB. The verification DB is retained for inspection and must be removed explicitly afterward if desired.

## Release gates

Run the 48-hour soak with TEST_ORIGIN set to the production origin. Confirm market freshness and inspect worker/job logs, then separately exercise real Google, email, AI review and Telegram workflows. The public read soak alone is not full delivery verification.

First release is a 100-member beta; tests cover 20 concurrent reads, not an arbitrary traffic SLA. Monthly allocation: VPS <=450 THB, AI <=250, domain/offsite storage <=150, reserve 150. Validate actual vendor totals before purchase; there are no automatic paid upgrades.

Restart API/worker after deployment. Existing PostgreSQL data lives in the named volume; do not use `down -v`. Before a schema change, take an offsite backup. Current migration is idempotent and additive.
