import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createPlatform } from "./platform.js";
import { digest, encrypt } from "./security.js";
import { checkAlerts, processDelivery } from "./tasks.js";
import { queueMail } from "./auth.js";

test("email delivery cancels expired, consumed and wrong-purpose links but sends valid links", async () => {
  const db = new PGlite();
  await db.exec(await readFile(new URL("./schema.sql", import.meta.url), "utf8"));
  const user = { id: randomUUID(), email: "links@test.example" };
  const config = { origin: "https://example.com", queueKey: "a".repeat(64), resendKey: "test" };
  await db.query("INSERT INTO users(id,email,name) VALUES($1,$2,'Links')", [user.id, user.email]);
  for (const state of ["expired", "consumed", "wrong-purpose", "valid"]) {
    await db.transaction(tx => queueMail(tx, config, user, "reset"));
    if (state === "expired") await db.query("UPDATE action_tokens SET expires_at=now()-interval '1 second'");
    if (state === "consumed") await db.query("DELETE FROM action_tokens");
    if (state === "wrong-purpose") await db.query("UPDATE action_tokens SET purpose='verify'");
    const job = (await db.query("SELECT id FROM jobs WHERE status='queued'")).rows[0];
    let calls = 0;
    await processDelivery(db, config, async () => {
      calls++;
      return new Response('{}', { status: 200 });
    });
    assert.equal(calls, state === "valid" ? 1 : 0, state);
    const result = (await db.query("SELECT status,payload FROM jobs WHERE id=$1", [job.id])).rows[0];
    assert.equal(result.status, state === "valid" ? "sent" : "cancelled");
    assert.equal(result.payload, null);
  }
  await db.close();
});

test("approval preserves crossed-entry evidence and published drafts stay private", async () => {
  const db = new PGlite();
  await db.exec(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
  const id = randomUUID(),
    analysis = randomUUID();
  await db.query(
    "INSERT INTO users(id,email,name,role,email_verified_at) VALUES($1,'admin@test.example','Admin','admin',now())",
    [id],
  );
  await db.query(
    "INSERT INTO sessions(hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
    [digest("session"), id],
  );
  await db.query(
    "UPDATE assets SET price=99,as_of=now() WHERE symbol='BTCUSDT'",
  );
  const body = {
    summary: "ตัวอย่างทดสอบ",
    positive: [],
    negative: [],
    limitations: ["ทดลอง"],
    source_ids: [],
    wait: false,
  };
  await db.query(
    "INSERT INTO analyses(id,symbol,body,metrics,as_of,expires_at,entry_crossed) VALUES($1,'BTCUSDT',$2,$3,now(),now()+interval '1 day',true)",
    [analysis, body, { plan: { entry: 100, stop: 90, target: 120 } }],
  );
  const app = createPlatform({
    db,
    config: { origin: "http://localhost:3000" },
  });
  const request = (path, body, method = "POST") =>
    app.request("http://localhost:3000/api/v1" + path, {
      method,
      headers: {
        origin: "http://localhost:3000",
        cookie: "session=session",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await (await app.request("/api/v1/analyses")).json()).items.length,
    0,
  );
  assert.equal(
    (await request("/admin/analyses/" + analysis, body, "PATCH")).status,
    200,
  );
  assert.equal(
    (
      await request("/admin/analyses/" + analysis + "/review", {
        action: "publish",
      })
    ).status,
    409,
  );
  await db.query("UPDATE analyses SET entry_crossed=false WHERE id=$1", [
    analysis,
  ]);
  assert.equal(
    (
      await request("/admin/analyses/" + analysis + "/review", {
        action: "publish",
      })
    ).status,
    200,
  );
  assert.equal(
    (await (await app.request("/api/v1/analyses")).json()).items.length,
    1,
  );
  await db.close();
});

test("stale prices do not trigger; crossing creates one notification; ambiguous delivery is not replayed", async () => {
  const db = new PGlite();
  await db.exec(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
  const user = randomUUID(),
    alert = randomUUID();
  await db.query(
    "INSERT INTO users(id,email,name,email_verified_at,telegram_id) VALUES($1,'member@test.example','Member',now(),'123')",
    [user],
  );
  await db.query(
    "INSERT INTO alerts(id,user_id,symbol,direction,price,last_price) VALUES($1,$2,'BTCUSDT','above',100,99)",
    [alert, user],
  );
  await db.query(
    "UPDATE assets SET price=101,as_of=now()-interval '10 minutes' WHERE symbol='BTCUSDT'",
  );
  await checkAlerts(db);
  assert.equal(
    (await db.query("SELECT count(*)::int n FROM jobs")).rows[0].n,
    0,
  );
  await db.query("UPDATE assets SET as_of=now() WHERE symbol='BTCUSDT'");
  await checkAlerts(db);
  await checkAlerts(db);
  assert.equal(
    (await db.query("SELECT count(*)::int n FROM jobs")).rows[0].n,
    1,
  );
  await processDelivery(db, { telegramToken: "test" }, async () => {
    throw new Error("timeout");
  });
  assert.equal(
    (await db.query("SELECT status FROM jobs")).rows[0].status,
    "uncertain",
  );
  await processDelivery(db, { telegramToken: "test" }, async () => {
    assert.fail("must not replay uncertain delivery");
  });
  await db.close();
});

test("email quota blocks delivery before network call and keeps queued status", async () => {
  const db = new PGlite();
  await db.exec(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
  const user = randomUUID(),
    job = randomUUID();
  await db.query(
    "INSERT INTO users(id,email,name) VALUES($1,'member@test.example','Member')",
    [user],
  );
  for (let i = 0; i < 95; i++)
    await db.query(
      "INSERT INTO jobs(id,kind,status,claimed_at) VALUES($1,'email','sent',now())",
      [randomUUID()],
    );
  await db.query(
    "INSERT INTO jobs(id,kind,user_id,payload) VALUES($1,'email',$2,$3)",
    [
      job,
      user,
      encrypt(
        {
          email: "member@test.example",
          purpose: "changed",
          url: "https://example.com",
        },
        "a".repeat(64),
      ),
    ],
  );
  await processDelivery(
    db,
    { resendKey: "test", queueKey: "a".repeat(64) },
    async () => {
      assert.fail("quota must prevent call");
    },
  );
  assert.equal(
    (await db.query("SELECT status FROM jobs WHERE id=$1", [job])).rows[0]
      .status,
    "queued",
  );
  await db.close();
});
