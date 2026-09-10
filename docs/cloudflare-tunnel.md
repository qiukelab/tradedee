# Deploy TradeDee through Cloudflare Tunnel

This production path keeps the existing Node API, PostgreSQL and worker together on one Docker-capable host. Cloudflare provides the public HTTPS hostname; `cloudflared` makes an outbound connection to the `web` container. PostgreSQL and the API have no public port. It is not a Cloudflare Pages deployment, because Pages cannot run this PostgreSQL worker/API stack.

## Before starting

1. Choose a domain already added to the same Cloudflare account, for example `app.example.com`.
2. In Cloudflare Zero Trust, create a named tunnel for TradeDee. Add one public hostname for that exact domain and configure its service as `http://web:80`. Copy the tunnel token; treat it like a password.
3. On the Docker host, copy `.env.example` to `.env`, set `DOMAIN`, `TUNNEL_TOKEN`, `POSTGRES_PASSWORD`, `ADMIN_EMAIL`, a 64-character `QUEUE_ENCRYPTION_KEY`, and a distinct `BACKUP_KEY`. Do not commit `.env`.
4. Set `APP_ORIGIN=https://<your domain>` in `.env`. Leave `MCP_ADMIN_TOKEN_SHA256` and `MCP_ADMIN_USER_ID` empty for production. Configure real OAuth values only after the hostname works.

## Run

From the repository root on the host:

```sh
docker compose --env-file .env -f deploy/compose.yml config --quiet
docker compose --env-file .env -f deploy/compose.yml up -d --build
```

The deployed `web` container deliberately serves HTTP only to `cloudflared`; Cloudflare terminates public HTTPS. Do not publish `web`, `api`, or `postgres` ports in this compose file. Caddy forwards Cloudflare's connecting IP to the API for rate limits; this only works when requests reach it through the tunnel. Test `https://<your domain>/health` and then the public MCP metadata at `/.well-known/oauth-protected-resource/mcp` before configuring ChatGPT.

## MCP after hostname works

Set `MCP_OAUTH_CLIENT_ID` and `MCP_OAUTH_REDIRECT_URI` to the values accepted by the MCP client. The redirect URI must be HTTPS and exact. Set `APP_ORIGIN` to the same public hostname. Restart `api` and `worker`, sign in as an admin, then connect at `https://<your domain>/mcp`. The admin still must approve drafts; MCP has no publish tool.

No tunnel, hostname, OAuth client, Google, Resend, Telegram, OpenRouter, backup target, or Cloudflare deployment was created by writing this guide. Do not put the tunnel token, passwords or API keys in GitHub issues, commits, or chat.
