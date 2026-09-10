import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { connectDb, migrate } from "./db.js";
import {
  refreshMarket,
  checkAlerts,
  generateAnalyses,
  processDelivery,
} from "./tasks.js";
import { ingestFeeds } from "./feeds.js";
const db = connectDb();
await migrate(db);
// Single worker enforced with a dedicated connection-level advisory lock.
import pg from "pg";
const lock = new pg.Client({ connectionString: process.env.DATABASE_URL });
await lock.connect();
if (
  !(await lock.query("SELECT pg_try_advisory_lock(728190) AS locked")).rows[0]
    .locked
)
  throw new Error("Worker already running");
lock.on("error", () => process.exit(1));
await db.query(
  "UPDATE jobs SET status='uncertain',last_error='Worker restarted during delivery' WHERE status='sending'",
);
await db.query(
  "UPDATE jobs SET status='failed',last_error='Worker restarted during AI generation' WHERE status='running'",
);
let stopped = false;
process.on("SIGTERM", () => {
  stopped = true;
});
process.on("SIGINT", () => {
  stopped = true;
});
async function run(name, seconds, fn) {
  const {
    rows: [state],
  } = await db.query("SELECT * FROM worker_state WHERE name=$1", [name]);
  if (state?.last_run && Date.now() - new Date(state.last_run) < seconds * 1000)
    return;
  await db.query(
    "INSERT INTO worker_state(name,last_run) VALUES($1,now()) ON CONFLICT(name) DO UPDATE SET last_run=now()",
    [name],
  );
  try {
    await fn();
    await db.query(
      "UPDATE worker_state SET last_success=now(),error=NULL WHERE name=$1",
      [name],
    );
  } catch (e) {
    await db.query("UPDATE worker_state SET error=$1 WHERE name=$2", [
      e.message,
      name,
    ]);
  }
}
while (!stopped) {
  await run("market", 30, () => refreshMarket(db));
  await run("alerts", 30, () => checkAlerts(db));
  await run("feeds", 900, () => ingestFeeds(db));
  await run("scheduler", 60, async () => {
    const {
      rows: [s],
    } = await db.query("SELECT value FROM settings WHERE id=1");
    if (s.value.ai_enabled)
      await db.query(
        "INSERT INTO jobs(id,kind,payload,dedupe) VALUES($1,'analyse','{}',$2) ON CONFLICT DO NOTHING",
        [
          randomUUID(),
          "scheduled:" + Math.floor(Date.now() / (s.value.hours * 3600000)),
        ],
      );
  });
  await run("analysis", 30, async () => {
    const {
      rows: [j],
    } = await db.query(
      "UPDATE jobs SET status='running' WHERE id=(SELECT id FROM jobs WHERE kind='analyse' AND status='queued' ORDER BY created_at LIMIT 1) RETURNING *",
    );
    if (j) {
      try {
        await generateAnalyses(db, config);
        await db.query("UPDATE jobs SET status='done' WHERE id=$1", [j.id]);
      } catch (e) {
        await db.query(
          "UPDATE jobs SET status='failed',last_error=$1 WHERE id=$2",
          [e.message, j.id],
        );
        throw e;
      }
    }
  });
  await run("cleanup", 3600, async () => {
    await db.query("DELETE FROM sessions WHERE expires_at<now()");
    await db.query("DELETE FROM mcp_oauth_requests WHERE expires_at<now()");
    await db.query("DELETE FROM mcp_oauth_tokens WHERE expires_at<now()");
    await db.query("DELETE FROM mcp_snapshots WHERE created_at<now()-interval '30 days'");
    await db.query("DELETE FROM action_tokens WHERE expires_at<now()");
    await db.query("DELETE FROM rate_limits WHERE expires_at<now()");
    await db.query("DELETE FROM jobs WHERE kind='oauth' AND run_at<now()");
    await db.query(
      "UPDATE jobs SET payload=NULL,status=CASE WHEN status='queued' THEN 'expired' ELSE status END WHERE created_at<now()-interval '2 days' AND kind='email'",
    );
    await db.query(
      "DELETE FROM jobs WHERE created_at<now()-interval '30 days'",
    );
  });
  for (let i = 0; i < 10 && !stopped; i++) {
    await processDelivery(db, config);
    await new Promise((r) => setTimeout(r, 1100));
  }
}
await lock.end();
await db.close();
