import { serve } from "@hono/node-server";
import { config } from "./config.js";
import { connectDb, migrate } from "./db.js";
import { createPlatform } from "./platform.js";
const db = connectDb();
await migrate(db);
const server = serve({
  fetch: createPlatform({ db, config }).fetch,
  port: Number(process.env.PORT ?? 8787),
  hostname: process.env.BIND_HOST ?? "127.0.0.1",
});
process.on("SIGTERM", () => server.close(() => db.close()));
