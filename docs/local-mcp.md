# Run TradeDee MCP locally

Use this mode for a trusted local MCP client that can start a Node process, such as MCP Inspector, VS Code or Claude Desktop. It opens no HTTP port and does not need Cloudflare, a domain, OAuth or an MCP bearer token. The local operating-system account that can launch this command is the trust boundary.

1. Create your private `.env` first: `Copy-Item .env.example .env`. Set a real `POSTGRES_PASSWORD`, then replace the matching `change-me` segment in `DATABASE_URL`. Start the local database with `docker compose up -d postgres`. It is available only at `127.0.0.1:5432`. Run the TradeDee API worker so market candles are current.
2. If exactly one verified, active local admin exists, TradeDee selects it automatically. For a new local test database, run:

```powershell
npm --workspace @polylove/api run mcp:local:bootstrap -- admin@local.test
```

This command refuses a non-local `DATABASE_URL`, creates or repairs only that local admin record, and does not create a password. For multiple admins, set `MCP_LOCAL_ADMIN_ID` in private `.env`; it must be a verified, unsuspended administrator.
3. Add this to your local MCP client configuration, replacing the absolute path:

```json
{
  "mcpServers": {
    "tradedee": {
      "command": "node",
      "args": ["D:/Project/polylove/apps/api/src/mcp-stdio.js"],
      "cwd": "D:/Project/polylove"
    }
  }
}
```

Or run `npm --workspace @polylove/api run mcp:local`; a stdio server appears idle until a client connects. Never write logs to stdout because stdout is the MCP protocol channel.

Local MCP exposes the same three tools: market snapshot, sourced news and draft submission. It cannot publish, access member data or change plan numbers. All normal freshness, audit and active-admin checks still apply.

ChatGPT cannot connect directly to a local MCP server. For ChatGPT, use OpenAI Secure MCP Tunnel or TradeDee's named Cloudflare Tunnel after a stable HTTPS hostname is available. Do not expose the stdio process, database port, `.env`, or a local filesystem to untrusted clients.
