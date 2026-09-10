import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from './config.js';
import { connectDb } from './db.js';
import { createAdminMcp } from './mcp.js';
import { resolveLocalAdmin } from './mcp-local.js';

const db = connectDb();
const actor = await resolveLocalAdmin(db, config.mcpLocalAdminId);
const server = createAdminMcp(db, actor);
const close = async () => { await server.close(); await db.close(); };
process.once('SIGINT', close);
process.once('SIGTERM', close);
await server.connect(new StdioServerTransport());
