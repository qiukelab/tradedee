import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
try {
  loadEnvFile(resolve(import.meta.dirname, "../../../.env"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
export const config = {
  origin: process.env.APP_ORIGIN ?? "http://localhost:3000",
  queueKey: process.env.QUEUE_ENCRYPTION_KEY,
  adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase(),
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  telegramBotName: process.env.TELEGRAM_BOT_NAME,
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  resendKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
  openrouterKey: process.env.OPENROUTER_API_KEY,
  trustProxy: process.env.TRUST_PROXY === "true",
  mcpTokenHash: process.env.MCP_ADMIN_TOKEN_SHA256,
  mcpAdminId: process.env.MCP_ADMIN_USER_ID,
  mcpClientId: process.env.MCP_OAUTH_CLIENT_ID,
  mcpRedirectUri: process.env.MCP_OAUTH_REDIRECT_URI,
  mcpLocalAdminId: process.env.MCP_LOCAL_ADMIN_ID,
};
