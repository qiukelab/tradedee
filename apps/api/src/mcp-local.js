export async function resolveLocalAdmin(db, configuredId) {
  if (configuredId) return configuredId;
  const { rows } = await db.query("SELECT id FROM users WHERE role='admin' AND email_verified_at IS NOT NULL AND NOT suspended ORDER BY created_at LIMIT 2");
  if (rows.length === 1) return rows[0].id;
  throw new Error('Set MCP_LOCAL_ADMIN_ID, or create exactly one verified local admin with npm run mcp:local:bootstrap -- <email>');
}
