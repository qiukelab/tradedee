import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from './config.js';
import { connectDb } from './db.js';
import { createAdminMcp } from './mcp.js';

if (!config.mcpLocalAdminId) throw new Error('Set MCP_LOCAL_ADMIN_ID to a verified TradeDee admin UUID');
const db = connectDb();
const server = createAdminMcp(db, config.mcpLocalAdminId);
const close = async () => { await server.close(); await db.close(); };
process.once('SIGINT', close);
process.once('SIGTERM', close);
await server.connect(new StdioServerTransport());
