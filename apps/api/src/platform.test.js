import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { createPlatform } from "./platform.js";
import { indicators, validateAnalysis } from "./signals.js";
import { randomUUID } from "node:crypto";
import { decrypt, digest } from "./security.js";

test("Google-only recovery sends guidance and cannot create a password through reset", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(await readFile(new URL("./schema.sql", import.meta.url), "utf8"));
  const id = randomUUID();
  const config = { origin: "http://localhost:3000", queueKey: "a".repeat(64) };
  await db.query("INSERT INTO users(id,email,name,google_sub,email_verified_at) VALUES($1,'google@example.com','Google member','test-sub',now())", [id]);
  const app = createPlatform({ db, config });
  let cookie = '';
  const post = (path, body) => app.request('/api/v1/auth/' + path, {
    method: 'POST',
    headers: { origin: config.origin, 'content-type': 'application/json', cookie },
    body: JSON.stringify(body),
  });
  const known = await post('forgot-password', { email: 'google@example.com' });
  const unknown = await post('forgot-password', { email: 'unknown@example.com' });
  assert.equal(known.status, 202);
  assert.equal(unknown.status, 202);
  assert.deepEqual(await known.json(), await unknown.json());
  const mail = (await db.query("SELECT payload FROM jobs WHERE kind='email'")).rows;
  assert.equal(mail.length, 1);
  assert.equal(decrypt(mail[0].payload, config.queueKey).purpose, 'google-only');
  assert.equal((await db.query('SELECT count(*)::int n FROM action_tokens')).rows[0].n, 0);
  // Even an existing reset token must not bypass the Google-only guard.
  await db.query("INSERT INTO action_tokens(hash,user_id,purpose,expires_at) VALUES($1,$2,'reset',now()+interval '30 minutes')", [digest('test-token'), id]);
  assert.equal((await post('reset-password', { token: 'test-token', password: 'another long secure password' })).status, 400);
  assert.equal((await db.query('SELECT password_hash FROM users WHERE id=$1', [id])).rows[0].password_hash, null);
  await db.query("INSERT INTO sessions(hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')", [digest('google-session'), id]);
  cookie = 'session=google-session';
  assert.equal((await post('set-password/request', {})).status, 403);
  await db.query("UPDATE sessions SET google_verified_at=now()-interval '6 minutes'");
  assert.equal((await post('set-password/request', {})).status, 403);
  await db.query("UPDATE sessions SET google_verified_at=now()");
  assert.equal((await post('set-password/request', {})).status, 202);
  const queued = (await db.query("SELECT payload FROM jobs WHERE dedupe LIKE 'mail:set-password:%'")).rows[0];
  const action = decrypt(queued.payload, config.queueKey);
  assert.equal(action.purpose, 'set-password');
  assert.equal((await db.query('SELECT password_hash FROM users WHERE id=$1', [id])).rows[0].password_hash, null);
  assert.equal((await post('set-password/confirm', { token: new URL(action.url).searchParams.get('token'), password: 'a new password after verification' })).status, 200);
  assert.match((await db.query('SELECT password_hash FROM users WHERE id=$1', [id])).rows[0].password_hash, /argon2id/);
  assert.equal((await db.query('SELECT count(*)::int n FROM sessions WHERE user_id=$1', [id])).rows[0].n, 0);
});

test("closed candle calculations reject incomplete data and AI cannot invent sources", () => {
  assert.throws(() => indicators([]));
  const candles = Array.from({ length: 200 }, (_, i) => ({
    open: 100,
    high: 102,
    low: 98,
    close: 100,
    volume: 10,
    open_time: i * 3600000,
    close_time: (i + 1) * 3600000 - 1,
  }));
  const result = indicators(candles);
  assert.equal(result.ema9, 100);
  assert.ok(Math.abs(result.atr14 - 4) < 1e-10);
  assert.equal(result.rsi14, 50);
  assert.equal(result.volume_ratio, 1);
  assert.equal(result.plan, null);
  assert.throws(() =>
    validateAnalysis(
      {
        summary: "x",
        positive: [],
        negative: [],
        limitations: [],
        source_ids: ["invented"],
      },
      [],
    ),
  );
});

test("signal uses previous twenty volumes and fixed ATR risk; malformed OHLC is rejected", () => {
  const candles = Array.from({ length: 200 }, (_, i) => {
    const close = 100 + i * 0.2 + (i % 2 ? 0.8 : 0);
    return { open: close, high: close + 2, low: close - 2, close, volume: i === 199 ? 15 : 10 };
  });
  const result = indicators(candles);
  assert.ok(result.ema9 > result.ema21);
  assert.ok(result.rsi14 >= 50 && result.rsi14 <= 70);
  assert.equal(result.volume_ratio, 1.5);
  assert.ok(Math.abs(result.atr14 - 4) < 1e-10);
  assert.ok(result.plan);
  for (const [key, expected] of Object.entries({ entry: 142.6, stop: 136.6, target: 154.6 })) {
    assert.ok(Math.abs(result.plan[key] - expected) < 1e-10, key);
  }
  const copy = structuredClone(candles);
  copy.at(-1).volume = 14.99;
  assert.equal(indicators(copy).plan, null);
  for (const bad of [{ open: 0 }, { low: -1 }, { high: 1 }, { close: 1000 }]) {
    const invalid = structuredClone(candles);
    Object.assign(invalid[50], bad);
    assert.throws(() => indicators(invalid), /invalid candle/);
  }
});

test("email verification, session ownership, reset revocation and admin boundaries", async () => {
  const db = new PGlite();
  await db.exec(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
  const app = createPlatform({
    db,
    config: {
      origin: "http://localhost:3000",
      queueKey: "a".repeat(64),
      adminEmail: "admin@example.com",
    },
  });
  let cookie = "";
  async function call(path, body, method = body ? "POST" : "GET") {
    const response = await app.request("http://localhost:3000/api/v1" + path, {
      method,
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
        cookie,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.headers.get("set-cookie"))
      cookie = response.headers.get("set-cookie").split(";")[0];
    return { status: response.status, data: await response.json() };
  }
  const password = "correct horse battery staple";
  assert.equal(
    (
      await call("/auth/register", {
        name: "Alice",
        email: " Alice@Example.com ",
        password,
        acceptTerms: true,
      })
    ).status,
    202,
  );
  const {
    rows: [user],
  } = await db.query("select * from users");
  assert.equal(user.email, "alice@example.com");
  assert.match(user.password_hash, /argon2id/);
  assert.equal(
    (await call("/auth/login", { email: user.email, password })).status,
    200,
  );
  assert.equal((await call("/watchlist")).status, 403);
  assert.equal((await call("/admin/users")).status, 403);
  // Deliver tokens through the actual encrypted queue format, not a test-only auth bypass.
  const { decrypt } = await import("./security.js");
  const {
    rows: [mail],
  } = await db.query(
    "select * from jobs where kind='email' order by created_at desc limit 1",
  );
  const payload = decrypt(mail.payload, "a".repeat(64));
  const token = new URL(payload.url).searchParams.get("token");
  // Email scanners must not consume a token through GET.
  await app.request("/api/v1/auth/verify-email?token=" + token);
  assert.equal((await db.query("SELECT count(*)::int n FROM action_tokens")).rows[0].n, 1);
  await db.query("UPDATE action_tokens SET expires_at=now()-interval '1 second'");
  assert.equal((await call("/auth/verify-email", { token })).status, 400);
  assert.equal((await db.query("SELECT email_verified_at FROM users")).rows[0].email_verified_at, null);
  await db.query("UPDATE action_tokens SET expires_at=now()+interval '1 hour'");
  const confirmations = await Promise.all([
    call("/auth/verify-email", { token }),
    call("/auth/verify-email", { token }),
  ]);
  assert.deepEqual(confirmations.map(r => r.status).sort(), [200, 400]);
  assert.equal((await call("/auth/verify-email", { token })).status, 400);
  assert.equal(
    (await call("/watchlist", { symbols: ["BTCUSDT"] }, "PUT")).status,
    200,
  );
  assert.equal(
    (
      await call("/alerts", {
        symbol: "BTCUSDT",
        direction: "above",
        price: 123,
      })
    ).status,
    201,
  );
  assert.equal((await call("/admin/users")).status, 403);
  assert.equal(
    (await call("/auth/forgot-password", { email: user.email })).status,
    202,
  );
  const {
    rows: [reset],
  } = await db.query(
    "select * from jobs where kind='email' and payload is not null order by created_at desc limit 1",
  );
  const resetToken = new URL(
    decrypt(reset.payload, "a".repeat(64)).url,
  ).searchParams.get("token");
  assert.equal(
    (await call("/auth/verify-email", { token: resetToken })).status,
    400,
  );
  await db.query("UPDATE action_tokens SET expires_at=now()-interval '1 second'");
  assert.equal((await call("/auth/reset-password", { token: resetToken, password })).status, 400);
  assert.equal((await call("/me")).status, 200);
  await db.query("UPDATE action_tokens SET expires_at=now()+interval '30 minutes'");
  assert.equal(
    (
      await call("/auth/reset-password", {
        token: resetToken,
        password: "another good long password",
      })
    ).status,
    200,
  );
  assert.equal((await call("/me")).status, 401);
  assert.equal(
    (await call("/auth/login", { email: user.email, password })).status,
    401,
  );
  assert.equal(
    (
      await call("/auth/login", {
        email: user.email,
        password: "another good long password",
      })
    ).status,
    200,
  );
  assert.equal(
    (await call("/auth/reset-password", { token: resetToken, password }))
      .status,
    400,
  );
  const bad = await app.request("http://localhost:3000/api/v1/auth/logout", {
    method: "POST",
    headers: { origin: "https://evil.example", cookie },
  });
  assert.equal(bad.status, 403);
  await db.close();
});
