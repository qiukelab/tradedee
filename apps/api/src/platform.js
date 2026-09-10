import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  mountAuth,
  sessionUser,
  requireUser,
  publicUser,
  queueMail,
} from "./auth.js";
import { ApiError, fail, throttle, idToken, digest } from "./security.js";
import { validateAnalysis } from "./signals.js";
import { mountMcp } from './mcp.js';
const symbol = z.enum(["BTCUSDT", "ETHUSDT", "SOLUSDT"]);
const uuid = z.uuid();
const newsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(5000),
  url: z.url().refine((u) => new URL(u).protocol === "https:"),
  symbols: z.array(symbol).min(1).max(3),
  published_at: z.iso.datetime(),
});
export async function audit(tx, actor, action, details = {}) {
  await tx.query(
    "INSERT INTO audit(id,actor,action,details) VALUES($1,$2,$3,$4)",
    [randomUUID(), actor, action, details],
  );
}
export function createPlatform({ db, config }) {
  const app = new Hono();
  app.use(
    "/api/*",
    bodyLimit({
      maxSize: 64000,
      onError: (c) => c.json({ message: "ข้อมูลใหญ่เกินไป" }, 413),
    }),
  );
  app.onError((e, c) => {
    if (e instanceof SyntaxError) return c.json({ message: "รูปแบบ JSON ไม่ถูกต้อง" }, 400);
    if (e instanceof z.ZodError)
      return c.json(
        {
          message: "ข้อมูลไม่ถูกต้อง",
          details: e.issues.map((i) => i.message),
        },
        422,
      );
    if (e instanceof ApiError) return c.json({ message: e.message }, e.status);
    if (e.code === "23505")
      return c.json({ message: "รายการนี้มีอยู่แล้ว" }, 409);
    console.error(e.name, e.message);
    return c.json({ message: "ระบบทำรายการไม่ได้ กรุณาลองใหม่" }, 503);
  });
  app.use("/api/*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "no-referrer");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(c.req.method) &&
      c.req.path !== "/api/v1/telegram/webhook"
    ) {
      if (c.req.header("origin") !== config.origin)
        fail(403, "แหล่งคำขอไม่ถูกต้อง");
      if (!c.req.header("content-type")?.startsWith("application/json"))
        fail(415, "ต้องส่ง JSON");
    }
    if (Number(c.req.header("content-length") ?? 0) > 64000)
      fail(413, "ข้อมูลใหญ่เกินไป");
    if (c.req.path.startsWith("/api/v1/auth/") && c.req.method !== "GET")
      await throttle(
        db,
        "ip:" +
          (config.trustProxy
            ? (c.req.header("x-real-ip") ?? "unknown")
            : "local"),
        60,
        900,
      );
    await next();
  });
  app.get("/health", async (c) => {
    await db.query("SELECT 1");
    return c.json({ status: "ok" });
  });
  mountAuth(app, db, config);
  app.get("/api/v1/me", async (c) => {
    const u = await sessionUser(c, db);
    if (!u) fail(401, "กรุณาเข้าสู่ระบบ");
    return c.json(publicUser(u));
  });
  app.patch("/api/v1/me", async (c) => {
    const u = await requireUser(c, db);
    const v = z
      .object({
        name: z.string().trim().min(1).max(80),
        quiet_start: z.number().int().min(0).max(23).nullable(),
        quiet_end: z.number().int().min(0).max(23).nullable(),
        analysis_notifications: z.boolean(),
      })
      .parse(await c.req.json());
    if ((v.quiet_start === null) !== (v.quiet_end === null))
      fail(422, "กรุณาระบุช่วงเวลาให้ครบ");
    await db.query(
      "UPDATE users SET name=$1,quiet_start=$2,quiet_end=$3,analysis_notifications=$4 WHERE id=$5",
      [v.name, v.quiet_start, v.quiet_end, v.analysis_notifications, u.id],
    );
    return c.json({ ok: true });
  });
  app.delete("/api/v1/me", async (c) => {
    const u = await requireUser(c, db);
    if ((await c.req.json()).confirm !== u.email)
      fail(400, "กรุณายืนยันอีเมลเพื่อลบบัญชี");
    await db.transaction(async (tx) => {
      await audit(tx, u.id, "account.delete");
      await tx.query("DELETE FROM users WHERE id=$1", [u.id]);
    });
    return c.json({ ok: true });
  });
  app.get("/api/v1/assets", async (c) => {
    const { rows } = await db.query(
      "SELECT * FROM assets WHERE enabled ORDER BY symbol",
    );
    return c.json({
      items: rows.map((r) => ({
        ...r,
        source: "Binance",
        quote: "USDT",
        stale: !r.as_of || Date.now() - new Date(r.as_of) > 120000,
      })),
    });
  });
  app.get("/api/v1/assets/:symbol/candles", async (c) => {
    const s = symbol.parse(c.req.param("symbol")),
      interval = z
        .enum(["15m", "1h", "4h"])
        .parse(c.req.query("interval") ?? "1h");
    const { rows } = await db.query(
      "SELECT * FROM candles WHERE symbol=$1 AND interval=$2 AND close_time<$3 ORDER BY open_time DESC LIMIT 200",
      [s, interval, Date.now()],
    );
    return c.json({ items: rows.reverse() });
  });
  app.get("/api/v1/news", async (c) => {
    const s = c.req.query("symbol");
    if (s) symbol.parse(s);
    const { rows } = await db.query(
      "SELECT * FROM news WHERE ($1::text IS NULL OR $1=ANY(symbols)) ORDER BY published_at DESC LIMIT 100",
      [s ?? null],
    );
    return c.json({ items: rows });
  });
  app.get("/api/v1/analyses", async (c) => {
    const s = c.req.query("symbol");
    if (s) symbol.parse(s);
    const { rows } = await db.query(
      "SELECT a.*,u.name AS reviewer_name FROM analyses a LEFT JOIN users u ON u.id=a.reviewer WHERE a.status IN ('published','expired','withdrawn','invalidated') AND ($1::text IS NULL OR a.symbol=$1) ORDER BY a.created_at DESC LIMIT 100",
      [s ?? null],
    );
    const sourceIds = [
      ...new Set(rows.flatMap((a) => a.body.source_ids ?? [])),
    ];
    const { rows: sources } = await db.query(
      "SELECT * FROM news WHERE id=ANY($1::uuid[])",
      [sourceIds],
    );
    return c.json({
      items: rows.map((a) => ({
        ...a,
        status:
          a.status === "published" && new Date(a.expires_at) < new Date()
            ? "expired"
            : a.status,
        sources: sources.filter((n) => a.body.source_ids.includes(n.id)),
      })),
    });
  });
  app.get("/api/v1/watchlist", async (c) => {
    const u = await requireUser(c, db);
    const { rows } = await db.query(
      "SELECT symbol FROM watchlists WHERE user_id=$1",
      [u.id],
    );
    return c.json({ symbols: rows.map((r) => r.symbol) });
  });
  app.put("/api/v1/watchlist", async (c) => {
    const u = await requireUser(c, db);
    const v = z
      .object({ symbols: z.array(symbol).max(3) })
      .parse(await c.req.json());
    await db.transaction(async (tx) => {
      await tx.query("DELETE FROM watchlists WHERE user_id=$1", [u.id]);
      for (const s of new Set(v.symbols))
        await tx.query("INSERT INTO watchlists VALUES($1,$2)", [u.id, s]);
    });
    return c.json({ ok: true });
  });
  app.get("/api/v1/alerts", async (c) => {
    const u = await requireUser(c, db);
    return c.json({
      items: (
        await db.query(
          "SELECT * FROM alerts WHERE user_id=$1 ORDER BY created_at DESC",
          [u.id],
        )
      ).rows,
    });
  });
  app.post("/api/v1/alerts", async (c) => {
    const u = await requireUser(c, db);
    const v = z
      .object({
        symbol,
        direction: z.enum(["above", "below"]),
        price: z.number().positive().finite(),
      })
      .parse(await c.req.json());
    const alert = await db.transaction(async (tx) => {
      await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [u.id]);
      const {
        rows: [n],
      } = await tx.query(
        "SELECT count(*)::int n FROM alerts WHERE user_id=$1",
        [u.id],
      );
      if (n.n >= u.alert_limit)
        fail(400, "ถึงโควตาแจ้งเตือนแล้ว ลบรายการเดิมก่อนเพิ่ม");
      const {
        rows: [a],
      } = await tx.query("SELECT * FROM assets WHERE symbol=$1 AND enabled", [
        v.symbol,
      ]);
      if (!a) fail(400, "เหรียญปิดใช้งาน");
      return (
        await tx.query(
          "INSERT INTO alerts(id,user_id,symbol,direction,price,last_price) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
          [randomUUID(), u.id, v.symbol, v.direction, v.price, a.price],
        )
      ).rows[0];
    });
    return c.json(alert, 201);
  });
  app.patch("/api/v1/alerts/:id", async (c) => {
    const u = await requireUser(c, db);
    const active = z.boolean().parse((await c.req.json()).active);
    const r = await db.query(
      "UPDATE alerts SET active=$1,last_price=(SELECT price FROM assets WHERE symbol=alerts.symbol) WHERE id=$2 AND user_id=$3 RETURNING id",
      [active, uuid.parse(c.req.param("id")), u.id],
    );
    if (!r.rows.length) fail(404, "ไม่พบรายการ");
    return c.json({ ok: true });
  });
  app.delete("/api/v1/alerts/:id", async (c) => {
    const u = await requireUser(c, db);
    await db.query("DELETE FROM alerts WHERE id=$1 AND user_id=$2", [
      uuid.parse(c.req.param("id")),
      u.id,
    ]);
    return c.json({ ok: true });
  });
  app.get("/api/v1/notifications", async (c) => {
    const u = await requireUser(c, db);
    return c.json({
      items: (
        await db.query(
          "SELECT id,kind,status,created_at,last_error FROM jobs WHERE user_id=$1 AND kind IN ('email','telegram') ORDER BY created_at DESC LIMIT 100",
          [u.id],
        )
      ).rows,
    });
  });
  app.post("/api/v1/telegram/link", async (c) => {
    const u = await requireUser(c, db);
    if (!config.telegramBotName) fail(503, "ยังไม่ได้ตั้งค่า Telegram");
    const token = idToken();
    await db.transaction(async (tx) => {
      await tx.query(
        "DELETE FROM action_tokens WHERE user_id=$1 AND purpose='telegram'",
        [u.id],
      );
      await tx.query(
        "INSERT INTO action_tokens(hash,user_id,purpose,expires_at) VALUES($1,$2,'telegram',now()+interval '10 minutes')",
        [digest(token), u.id],
      );
    });
    return c.json({
      url: `https://t.me/${config.telegramBotName}?start=${token}`,
    });
  });
  app.delete("/api/v1/telegram/link", async (c) => {
    const u = await requireUser(c, db);
    await db.transaction(async (tx) => {
      await tx.query("UPDATE users SET telegram_id=NULL WHERE id=$1", [u.id]);
      await tx.query(
        "DELETE FROM action_tokens WHERE user_id=$1 AND purpose='telegram'",
        [u.id],
      );
      await tx.query(
        "UPDATE jobs SET status='cancelled' WHERE user_id=$1 AND kind='telegram' AND status='queued'",
        [u.id],
      );
    });
    return c.json({ ok: true });
  });
  app.post("/api/v1/telegram/webhook", async (c) => {
    if (
      !config.telegramWebhookSecret ||
      digest(c.req.header("x-telegram-bot-api-secret-token") ?? "") !==
        digest(config.telegramWebhookSecret)
    )
      fail(403, "invalid webhook");
    const update = await c.req.json(),
      m = update.message;
    if (m?.chat?.type !== "private" || typeof m.text !== "string")
      return c.json({ ok: true });
    const token = m.text.match(/^\/start ([\w-]{43})$/)?.[1];
    if (token)
      await db.transaction(async (tx) => {
        const {
          rows: [t],
        } = await tx.query(
          "DELETE FROM action_tokens WHERE hash=$1 AND purpose='telegram' AND expires_at>now() RETURNING user_id",
          [digest(token)],
        );
        if (t) {
          await tx.query(
            "UPDATE users SET telegram_id=$1 WHERE id=$2 AND NOT suspended AND email_verified_at IS NOT NULL",
            [String(m.chat.id), t.user_id],
          );
        }
      });
    return c.json({ ok: true });
  });
  app.use("/api/v1/admin/*", async (c, next) => {
    c.set("admin", await requireUser(c, db, true));
    await next();
  });
  app.get("/api/v1/admin/users", async (c) =>
    c.json({
      items: (
        await db.query("SELECT * FROM users ORDER BY created_at DESC")
      ).rows.map((u) => ({ ...publicUser(u), suspended: u.suspended })),
    }),
  );
  app.get('/api/v1/admin/mcp', async c => {
    const actor = c.get('admin').id;
    const { rows: connections } = await db.query("SELECT client_id,scope,count(*)::int AS active_tokens,max(t.expires_at) AS expires_at FROM mcp_oauth_tokens t JOIN sessions s ON s.hash=t.session_hash WHERE t.actor=$1 AND t.expires_at>now() AND s.expires_at>now() GROUP BY client_id,scope", [actor]);
    return c.json({ endpoint: config.origin + '/mcp', oauth_configured: !!config.mcpClientId && !!config.mcpRedirectUri, development_token_enabled: !!config.mcpTokenHash, connections });
  });
  app.post('/api/v1/admin/mcp/revoke', async c => {
    const actor = c.get('admin').id;
    await db.transaction(async tx => {
      await tx.query('DELETE FROM mcp_oauth_tokens WHERE actor=$1', [actor]);
      await tx.query('DELETE FROM mcp_oauth_requests WHERE actor=$1', [actor]);
      await audit(tx, actor, 'mcp.revoke-all');
    });
    return c.json({ message: 'ตัดสิทธิ์ OAuth MCP ของคุณแล้ว ต้องอนุญาตใหม่เพื่อเชื่อมต่ออีกครั้ง' });
  });
  app.patch("/api/v1/admin/users/:id", async (c) => {
    const id = uuid.parse(c.req.param("id")),
      v = z
        .object({
          suspended: z.boolean(),
          alert_limit: z.number().int().min(0).max(50),
        })
        .parse(await c.req.json());
    if (id === c.get("admin").id && v.suspended)
      fail(400, "ไม่สามารถระงับบัญชีตนเอง");
    await db.transaction(async (tx) => {
      await tx.query(
        "UPDATE users SET suspended=$1,alert_limit=$2 WHERE id=$3",
        [v.suspended, v.alert_limit, id],
      );
      if (v.suspended) {
        await tx.query("DELETE FROM sessions WHERE user_id=$1", [id]);
        await tx.query(
          "UPDATE jobs SET status='cancelled',payload=NULL WHERE user_id=$1 AND status='queued'",
          [id],
        );
      }
      await audit(tx, c.get("admin").id, "user.update", { id, ...v });
    });
    return c.json({ ok: true });
  });
  app.post("/api/v1/admin/users/:id/verify", async (c) => {
    const {
      rows: [u],
    } = await db.query("SELECT * FROM users WHERE id=$1", [
      uuid.parse(c.req.param("id")),
    ]);
    if (!u || u.email_verified_at || u.suspended)
      fail(400, "บัญชีไม่เข้าเงื่อนไข");
    await throttle(db, "verify:" + u.email, 5, 3600, 60);
    await db.transaction(async (tx) => {
      await queueMail(tx, config, u, "verify");
      await audit(tx, c.get("admin").id, "user.resend", { id: u.id });
    });
    return c.json({ delivery: "queued" }, 202);
  });
  app.post("/api/v1/admin/news", async (c) => {
    const v = newsSchema.parse(await c.req.json());
    const id = randomUUID();
    await db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO news(id,title,summary,url,symbols,published_at) VALUES($1,$2,$3,$4,$5,$6)",
        [id, v.title, v.summary, v.url, v.symbols, v.published_at],
      );
      await audit(tx, c.get("admin").id, "news.create", { id });
    });
    return c.json({ id }, 201);
  });
  app.get("/api/v1/admin/analyses", async (c) =>
    c.json({
      items: (
        await db.query(
          "SELECT * FROM analyses ORDER BY created_at DESC LIMIT 100",
        )
      ).rows,
    }),
  );
  app.post("/api/v1/admin/analyses/generate", async (c) => {
    await throttle(db, "generate", 3, 3600);
    await db.query(
      "INSERT INTO jobs(id,kind,payload,dedupe) VALUES($1,'analyse','{}',$2) ON CONFLICT(dedupe) DO NOTHING",
      [randomUUID(), "manual:" + Math.floor(Date.now() / 60000)],
    );
    return c.json({ status: "queued" }, 202);
  });
  app.patch("/api/v1/admin/analyses/:id", async (c) => {
    const id = uuid.parse(c.req.param("id")),
      body = validateAnalysis(
        await c.req.json(),
        (await db.query("SELECT id FROM news")).rows,
      );
    await db.transaction(async (tx) => {
      const {
        rows: [a],
      } = await tx.query("SELECT * FROM analyses WHERE id=$1 FOR UPDATE", [id]);
      if (!a) fail(404, "ไม่พบบทวิเคราะห์");
      await tx.query(
        "INSERT INTO analysis_versions(id,analysis_id,version,body,actor) VALUES($1,$2,$3,$4,$5)",
        [randomUUID(), id, a.version, a.body, c.get("admin").id],
      );
      await tx.query(
        "UPDATE analyses SET body=$1,version=version+1,status='draft',reviewer=NULL,published_at=NULL WHERE id=$2",
        [body, id],
      );
      await audit(tx, c.get("admin").id, "analysis.edit", { id });
    });
    return c.json({ ok: true });
  });
  app.post("/api/v1/admin/analyses/:id/review", async (c) => {
    const id = uuid.parse(c.req.param("id")),
      action = z
        .enum(["publish", "reject", "withdraw"])
        .parse((await c.req.json()).action);
    await db.transaction(async (tx) => {
      const {
        rows: [a],
      } = await tx.query("SELECT * FROM analyses WHERE id=$1 FOR UPDATE", [id]);
      if (!a) fail(404, "ไม่พบบทวิเคราะห์");
      if (action === "publish") {
        if (a.status !== "draft") fail(409, "ต้องเป็นร่างก่อนเผยแพร่");
        const {
          rows: [asset],
        } = await tx.query("SELECT * FROM assets WHERE symbol=$1", [a.symbol]);
        if (
          !asset.enabled ||
          !asset.as_of ||
          Date.now() - new Date(asset.as_of) > 120000 ||
          new Date(a.expires_at) < new Date()
        )
          fail(409, "ข้อมูลเก่าหรือแผนหมดอายุ สร้างร่างใหม่");
        if (a.metrics.plan) {
          const {
            rows: [cross],
          } = await tx.query(
            "SELECT max(high) AS high FROM candles WHERE symbol=$1 AND interval=$2 AND close_time>$3",
            [a.symbol, "15m", new Date(a.as_of).getTime()],
          );
          if (
            asset.price >= a.metrics.plan.entry ||
            Number(cross.high) >= a.metrics.plan.entry ||
            a.entry_crossed
          )
            fail(409, "ราคาผ่านจุดเข้าแล้ว สร้างร่างใหม่");
        }
      }
      await tx.query(
        "UPDATE analyses SET status=$1,reviewer=$2,published_at=CASE WHEN $1='published' THEN now() ELSE published_at END WHERE id=$3",
        [
          { publish: "published", reject: "rejected", withdraw: "withdrawn" }[
            action
          ],
          c.get("admin").id,
          id,
        ],
      );
      if (action === "publish") {
        const { rows } = await tx.query(
          "SELECT u.id FROM users u JOIN watchlists w ON w.user_id=u.id WHERE w.symbol=$1 AND NOT u.suspended AND u.email_verified_at IS NOT NULL AND u.telegram_id IS NOT NULL AND u.analysis_notifications",
          [a.symbol],
        );
        for (const u of rows)
          await tx.query(
            "INSERT INTO jobs(id,kind,user_id,payload,dedupe) VALUES($1,'telegram',$2,$3,$4) ON CONFLICT DO NOTHING",
            [
              randomUUID(),
              u.id,
              {
                text: `บทวิเคราะห์ใหม่ ${a.symbol}\n${a.body.summary}\n${config.origin}/app/analyses`,
                analysis_id: id,
              },
              `analysis:${id}:${a.version}:${u.id}`,
            ],
          );
      }
      await audit(tx, c.get("admin").id, "analysis." + action, {
        id,
        version: a.version,
      });
    });
    return c.json({ ok: true });
  });
  app.get("/api/v1/admin/settings", async (c) =>
    c.json((await db.query("SELECT * FROM settings WHERE id=1")).rows[0]),
  );
  app.patch("/api/v1/admin/settings", async (c) => {
    const v = z
      .object({
        model: z.enum(["google/gemini-2.5-flash-lite"]),
        prompt: z.string().min(1).max(3000),
        hours: z.number().int().min(4).max(24),
        daily_budget: z.number().min(0).max(8),
        monthly_budget: z.number().min(0).max(240),
        usd_thb: z.number().min(30).max(100),
        ai_enabled: z.boolean(),
      })
      .parse(await c.req.json());
    await db.transaction(async (tx) => {
      const old = (
        await tx.query("SELECT * FROM settings WHERE id=1 FOR UPDATE")
      ).rows[0];
      await audit(tx, c.get("admin").id, "settings.update", {
        previous: old.value,
        next: v,
        version: old.version + 1,
      });
      await tx.query(
        "UPDATE settings SET value=$1,version=version+1 WHERE id=1",
        [v],
      );
    });
    return c.json({ ok: true });
  });
  app.get("/api/v1/admin/assets", async (c) =>
    c.json({
      items: (await db.query("SELECT * FROM assets ORDER BY symbol")).rows,
    }),
  );
  app.patch("/api/v1/admin/assets/:symbol", async (c) => {
    const s = symbol.parse(c.req.param("symbol")),
      enabled = z.boolean().parse((await c.req.json()).enabled);
    await db.transaction(async (tx) => {
      await tx.query("UPDATE assets SET enabled=$1 WHERE symbol=$2", [
        enabled,
        s,
      ]);
      await audit(tx, c.get("admin").id, "asset.update", {
        symbol: s,
        enabled,
      });
    });
    return c.json({ ok: true });
  });
  app.get("/api/v1/admin/feeds", async (c) =>
    c.json({ items: (await db.query("SELECT * FROM feeds")).rows }),
  );
  app.post("/api/v1/admin/feeds", async (c) => {
    const v = z
      .object({
        name: z.string().min(1).max(100),
        url: z.url().refine((u) => new URL(u).protocol === "https:"),
        licensed: z.literal(true),
        enabled: z.boolean(),
      })
      .parse(await c.req.json());
    await db.query(
      "INSERT INTO feeds(id,name,url,licensed,enabled) VALUES($1,$2,$3,$4,$5)",
      [randomUUID(), v.name, v.url, v.licensed, v.enabled],
    );
    await audit(db, c.get("admin").id, "feed.create", { url: v.url });
    return c.json({ ok: true }, 201);
  });
  app.patch("/api/v1/admin/feeds/:id", async (c) => {
    const enabled = z.boolean().parse((await c.req.json()).enabled),
      id = uuid.parse(c.req.param("id"));
    await db.query("UPDATE feeds SET enabled=$1 WHERE id=$2 AND licensed", [
      enabled,
      id,
    ]);
    await audit(db, c.get("admin").id, "feed.update", { id, enabled });
    return c.json({ ok: true });
  });
  app.get("/api/v1/admin/jobs", async (c) =>
    c.json({
      items: (
        await db.query(
          "SELECT id,kind,status,attempts,created_at,last_error FROM jobs WHERE kind!='oauth' ORDER BY created_at DESC LIMIT 100",
        )
      ).rows,
      worker: (await db.query("SELECT * FROM worker_state")).rows,
      usage: (
        await db.query(
          "SELECT coalesce(sum(coalesce(cost_thb,reserved_thb)),0) AS monthly,coalesce(sum(coalesce(cost_thb,reserved_thb)) FILTER (WHERE created_at >= date_trunc('day',now())),0) AS daily FROM ai_usage WHERE created_at>=date_trunc('month',now())",
        )
      ).rows[0],
      services: {
        google: !!config.googleClientId,
        resend: !!process.env.RESEND_API_KEY,
        telegram: !!process.env.TELEGRAM_BOT_TOKEN,
        ai: !!process.env.OPENROUTER_API_KEY,
      },
    }),
  );
  app.get("/api/v1/admin/audit", async (c) =>
    c.json({
      items: (
        await db.query("SELECT * FROM audit ORDER BY created_at DESC LIMIT 100")
      ).rows,
    }),
  );
  app.post("/api/v1/admin/telegram/test", async (c) => {
    const u = c.get("admin");
    if (!u.telegram_id) fail(400, "กรุณาเชื่อม Telegram ในหน้าบัญชีก่อน");
    await db.query(
      "INSERT INTO jobs(id,kind,user_id,payload) VALUES($1,'telegram',$2,$3)",
      [randomUUID(), u.id, { text: "TradeDee เชื่อมต่อ Telegram แล้ว" }],
    );
    return c.json({ status: "queued" }, 202);
  });
  mountMcp(app, db, config);
  return app;
}
