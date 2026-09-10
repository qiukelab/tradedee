import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
import {
  digest,
  idToken,
  encrypt,
  emailSchema,
  passwordSchema,
  throttle,
  fail,
} from "./security.js";

const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
export function loginDestination(c, config) {
  const value = getCookie(c, 'mcp_return');
  deleteCookie(c, 'mcp_return', { path: '/' });
  if (!value?.startsWith('/oauth/authorize?') || value.length > 3500) return '/app';
  const url = new URL(value, config.origin);
  return url.origin === new URL(config.origin).origin && url.pathname === '/oauth/authorize' ? value : '/app';
}
const generic = {
  message: "หากอีเมลนี้ดำเนินการได้ ระบบจะจัดคิวอีเมลให้ กรุณาตรวจกล่องจดหมาย",
  delivery: "queued_if_eligible",
};
export const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  verified: !!u.email_verified_at,
  role: u.role,
  has_password: !!u.password_hash,
  has_google: !!u.google_sub,
  telegram_connected: !!u.telegram_id,
  quiet_start: u.quiet_start,
  quiet_end: u.quiet_end,
  timezone: u.timezone,
  analysis_notifications: u.analysis_notifications,
  alert_limit: u.alert_limit,
});
export async function queueMail(tx, config, user, purpose) {
  await tx.query(
    "UPDATE jobs SET status='cancelled',payload=NULL WHERE user_id=$1 AND kind='email' AND status='queued' AND dedupe LIKE $2",
    [user.id, `mail:${purpose}:%`],
  );
  await tx.query("DELETE FROM action_tokens WHERE user_id=$1 AND purpose=$2", [
    user.id,
    purpose,
  ]);
  const token = idToken(),
    minutes = purpose === "verify" ? 1440 : 30;
  await tx.query(
    "INSERT INTO action_tokens(hash,user_id,purpose,expires_at) VALUES($1,$2,$3,now()+$4*interval '1 minute')",
    [digest(token), user.id, purpose, minutes],
  );
  const path =
    purpose === "verify"
      ? "/verify-email"
      : purpose === "set-password"
        ? "/app/account"
        : "/reset-password";
  const payload = encrypt(
    {
      email: user.email,
      purpose,
      url: `${config.origin}${path}?token=${token}`,
    },
    config.queueKey,
  );
  await tx.query(
    "INSERT INTO jobs(id,kind,user_id,payload,dedupe) VALUES($1,'email',$2,$3,$4)",
    [randomUUID(), user.id, payload, `mail:${purpose}:${digest(token)}`],
  );
}
export async function passwordNotice(tx, config, user) {
  await tx.query(
    "INSERT INTO jobs(id,kind,user_id,payload) VALUES($1,'email',$2,$3)",
    [
      randomUUID(),
      user.id,
      encrypt(
        {
          email: user.email,
          purpose: "changed",
          url: config.origin + "/login",
        },
        config.queueKey,
      ),
    ],
  );
}
export async function sessionUser(c, db) {
  const token = getCookie(c, "session");
  if (!token) return null;
  const {
    rows: [user],
  } = await db.query(
    "SELECT u.*,s.google_verified_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=$1 AND s.expires_at>now() AND NOT u.suspended",
    [digest(token)],
  );
  return user ?? null;
}
export async function requireUser(c, db, admin = false) {
  const user = await sessionUser(c, db);
  if (!user) fail(401, "กรุณาเข้าสู่ระบบ");
  if (!user.email_verified_at) fail(403, "กรุณายืนยันอีเมลก่อนใช้งาน");
  if (admin && user.role !== "admin") fail(403, "เฉพาะผู้ดูแลระบบ");
  return user;
}
async function startSession(c, db, config, user, google = false) {
  const old = getCookie(c, "session");
  if (old) await db.query("DELETE FROM sessions WHERE hash=$1", [digest(old)]);
  const token = idToken();
  await db.query(
    "INSERT INTO sessions(hash,user_id,expires_at,google_verified_at) VALUES($1,$2,now()+interval '7 days',CASE WHEN $3 THEN now() ELSE NULL END)",
    [digest(token), user.id, google],
  );
  setCookie(c, "session", token, {
    httpOnly: true,
    secure: config.origin.startsWith("https:"),
    sameSite: "Lax",
    path: "/",
    maxAge: 604800,
  });
}
async function consume(tx, token, purpose) {
  if (typeof token !== "string" || token.length > 128)
    fail(400, "ลิงก์ไม่ถูกต้องหรือหมดอายุ");
  const {
    rows: [record],
  } = await tx.query(
    "DELETE FROM action_tokens WHERE hash=$1 AND purpose=$2 AND expires_at>now() RETURNING user_id",
    [digest(token), purpose],
  );
  if (!record) fail(400, "ลิงก์ไม่ถูกต้องหรือหมดอายุ");
  const {
    rows: [user],
  } = await tx.query(
    "SELECT * FROM users WHERE id=$1 AND NOT suspended FOR UPDATE",
    [record.user_id],
  );
  if (!user) fail(400, "ลิงก์ไม่ถูกต้องหรือหมดอายุ");
  return user;
}
export function mountAuth(app, db, config) {
  const body = (c) => c.req.json();
  app.get("/api/v1/auth/delivery", async (c) => {
    const u = await sessionUser(c, db);
    if (!u) fail(401, "กรุณาเข้าสู่ระบบเพื่อดูสถานะการส่ง");
    const {
      rows: [job],
    } = await db.query(
      "SELECT status,last_error,created_at FROM jobs WHERE user_id=$1 AND kind='email' ORDER BY created_at DESC LIMIT 1",
      [u.id],
    );
    return c.json(job ?? { status: "none" });
  });
  app.get("/api/v1/auth/providers", (c) =>
    c.json({
      google: !!(config.googleClientId && config.googleClientSecret),
      email: true,
    }),
  );
  app.post("/api/v1/auth/register", async (c) => {
    const v = z
      .object({
        name: z.string().trim().min(1).max(80),
        email: emailSchema,
        password: passwordSchema,
        acceptTerms: z.literal(true),
      })
      .parse(await body(c));
    await throttle(db, "register:" + v.email, 5, 3600, 60);
    const hash = await argon2.hash(v.password, { type: argon2.argon2id });
    await db.transaction(async (tx) => {
      // Serialize only signups, enforcing the beta capacity even under concurrent requests.
      await tx.query("SELECT id FROM settings WHERE id=1 FOR UPDATE");
      const {
        rows: [existing],
      } = await tx.query("SELECT id FROM users WHERE email=$1", [v.email]);
      if (existing) return;
      const {
        rows: [count],
      } = await tx.query("SELECT count(*)::int AS n FROM users");
      if (count.n >= 100) fail(503, "รอบทดลองมีสมาชิกครบแล้ว");
      const {
        rows: [user],
      } = await tx.query(
        "INSERT INTO users(id,email,name,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [
          randomUUID(),
          v.email,
          v.name,
          hash,
          v.email === config.adminEmail ? "admin" : "member",
        ],
      );
      await queueMail(tx, config, user, "verify");
    });
    return c.json(generic, 202);
  });
  app.post("/api/v1/auth/login", async (c) => {
    const v = z
      .object({ email: emailSchema, password: z.string().max(512) })
      .parse(await body(c));
    await throttle(db, "login:" + v.email, 10, 900);
    const {
      rows: [user],
    } = await db.query("SELECT * FROM users WHERE email=$1", [v.email]);
    const hash = user?.password_hash ?? (await dummyHash);
    if (!(await argon2.verify(hash, v.password)) || !user || user.suspended)
      fail(401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    await startSession(c, db, config, user);
    return c.json({ ...publicUser(user), next: user.email_verified_at ? loginDestination(c, config) : '/verify-email' });
  });
  app.post("/api/v1/auth/logout", async (c) => {
    const token = getCookie(c, "session");
    if (token)
      await db.query("DELETE FROM sessions WHERE hash=$1", [digest(token)]);
    deleteCookie(c, "session", { path: "/" });
    return c.json({ ok: true });
  });
  app.post("/api/v1/auth/verify-email", async (c) => {
    const { token } = await body(c);
    await db.transaction(async (tx) => {
      const u = await consume(tx, token, "verify");
      await tx.query("UPDATE users SET email_verified_at=now() WHERE id=$1", [
        u.id,
      ]);
    });
    return c.json({ message: "ยืนยันอีเมลแล้ว เข้าสู่ระบบเพื่อเริ่มใช้งาน" });
  });
  for (const [path, purpose] of [
    ["resend-verification", "verify"],
    ["forgot-password", "reset"],
  ])
    app.post("/api/v1/auth/" + path, async (c) => {
      const email = emailSchema.parse((await body(c)).email);
      await throttle(db, purpose + ":" + email, 5, 3600, 60);
      await db.transaction(async (tx) => {
        const {
          rows: [u],
        } = await tx.query(
          "SELECT * FROM users WHERE email=$1 AND NOT suspended FOR UPDATE",
          [email],
        );
        if (!u || (purpose === "verify" && u.email_verified_at)) return;
        if (purpose === "reset" && !u.password_hash) {
          await tx.query(
            "INSERT INTO jobs(id,kind,user_id,payload) VALUES($1,'email',$2,$3)",
            [
              randomUUID(),
              u.id,
              encrypt(
                {
                  email: u.email,
                  purpose: "google-only",
                  url: config.origin + "/login",
                },
                config.queueKey,
              ),
            ],
          );
          return;
        }
        await queueMail(tx, config, u, purpose);
      });
      return c.json(generic, 202);
    });
  for (const [path, purpose] of [
    ["reset-password", "reset"],
    ["set-password/confirm", "set-password"],
  ])
    app.post("/api/v1/auth/" + path, async (c) => {
      const v = z
        .object({ token: z.string().max(128), password: passwordSchema })
        .parse(await body(c));
      const hash = await argon2.hash(v.password, { type: argon2.argon2id });
      const current =
        purpose === "set-password" ? await requireUser(c, db) : null;
      await db.transaction(async (tx) => {
        const u = await consume(tx, v.token, purpose);
        if (current && u.id !== current.id)
          fail(403, "ลิงก์นี้ไม่ใช่ของบัญชีปัจจุบัน");
        if (purpose === "reset" && !u.password_hash)
          fail(400, "กรุณาเข้าสู่ระบบด้วย Google");
        if (purpose === "set-password" && u.password_hash)
          fail(400, "บัญชีมีรหัสผ่านแล้ว");
        await tx.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
          hash,
          u.id,
        ]);
        await tx.query("DELETE FROM sessions WHERE user_id=$1", [u.id]);
        await tx.query(
          "DELETE FROM action_tokens WHERE user_id=$1 AND purpose IN ('reset','set-password')",
          [u.id],
        );
        await passwordNotice(tx, config, u);
      });
      return c.json({ message: "ตั้งรหัสผ่านแล้ว กรุณาเข้าสู่ระบบใหม่" });
    });
  app.post("/api/v1/auth/change-password", async (c) => {
    const u = await requireUser(c, db);
    const v = z
      .object({
        currentPassword: z.string().max(512),
        password: passwordSchema,
      })
      .parse(await body(c));
    await throttle(db, "change:" + u.id, 5, 900);
    if (
      !u.password_hash ||
      !(await argon2.verify(u.password_hash, v.currentPassword))
    )
      fail(400, "รหัสผ่านปัจจุบันไม่ถูกต้อง");
    const hash = await argon2.hash(v.password, { type: argon2.argon2id });
    await db.transaction(async (tx) => {
      const r = await tx.query(
        "UPDATE users SET password_hash=$1 WHERE id=$2 AND password_hash=$3 RETURNING id",
        [hash, u.id, u.password_hash],
      );
      if (!r.rows.length)
        fail(409, "ข้อมูลบัญชีเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่");
      await tx.query("DELETE FROM sessions WHERE user_id=$1", [u.id]);
      await tx.query(
        "DELETE FROM action_tokens WHERE user_id=$1 AND purpose IN ('reset','set-password')",
        [u.id],
      );
      await passwordNotice(tx, config, u);
    });
    return c.json({ message: "เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบใหม่" });
  });
  app.post("/api/v1/auth/set-password/request", async (c) => {
    const u = await requireUser(c, db);
    if (u.password_hash) fail(400, "บัญชีมีรหัสผ่านแล้ว");
    if (
      !u.google_verified_at ||
      Date.now() - new Date(u.google_verified_at).getTime() > 300000
    )
      fail(403, "กรุณายืนยันตัวตนด้วย Google อีกครั้ง");
    await throttle(db, "set:" + u.id, 5, 3600, 60);
    await db.transaction((tx) => queueMail(tx, config, u, "set-password"));
    return c.json(generic, 202);
  });
  app.get("/api/v1/auth/google", async (c) => {
    if (!config.googleClientId || !config.googleClientSecret)
      fail(503, "ยังไม่ได้ตั้งค่า Google Login");
    const mode = c.req.query("mode") ?? "login";
    if (!["login", "link", "reauth"].includes(mode)) fail(400, "invalid mode");
    const u = mode === "login" ? null : await requireUser(c, db);
    const state = idToken(),
      nonce = idToken(),
      verifier = idToken();
    await db.query(
      "INSERT INTO jobs(id,kind,user_id,payload,status,dedupe,run_at) VALUES($1,'oauth',$2,$3,'pending',$4,now()+interval '10 minutes')",
      [
        randomUUID(),
        u?.id ?? null,
        encrypt({ mode, nonce, verifier }, config.queueKey),
        digest(state),
      ],
    );
    setCookie(c, "oauth_state", state, {
      httpOnly: true,
      secure: config.origin.startsWith("https:"),
      sameSite: "Lax",
      path: "/",
      maxAge: 600,
    });
    const params = new URLSearchParams({
      client_id: config.googleClientId,
      redirect_uri: config.origin + "/api/v1/auth/google/callback",
      response_type: "code",
      scope: "openid email profile",
      state,
      nonce,
      code_challenge: Buffer.from(digest(verifier), "hex").toString(
        "base64url",
      ),
      code_challenge_method: "S256",
      prompt: "select_account",
      ...(mode === "reauth" ? { max_age: "0" } : {}),
    });
    return c.redirect("https://accounts.google.com/o/oauth2/v2/auth?" + params);
  });
  app.get("/api/v1/auth/google/callback", async (c) => {
    const state = c.req.query("state"),
      code = c.req.query("code");
    if (!state || state !== getCookie(c, "oauth_state") || !code)
      fail(400, "การเข้าสู่ระบบ Google ไม่สำเร็จ");
    const {
      rows: [job],
    } = await db.query(
      "DELETE FROM jobs WHERE kind='oauth' AND dedupe=$1 AND run_at>now() RETURNING *",
      [digest(state)],
    );
    deleteCookie(c, "oauth_state", { path: "/" });
    if (!job) fail(400, "Google login หมดอายุ");
    const { decrypt } = await import("./security.js");
    const flow = decrypt(job.payload, config.queueKey);
    if (flow.mode !== "login") {
      const current = await requireUser(c, db);
      if (current.id !== job.user_id)
        fail(403, "บัญชีเปลี่ยนระหว่างเข้าสู่ระบบ");
    }
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        code,
        code_verifier: flow.verifier,
        grant_type: "authorization_code",
        redirect_uri: config.origin + "/api/v1/auth/google/callback",
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) fail(400, "Google login ไม่สำเร็จ");
    const tokens = await r.json();
    const { payload: p } = await jwtVerify(tokens.id_token, googleKeys, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: config.googleClientId,
    });
    if (p.nonce !== flow.nonce || p.email_verified !== true || !p.sub)
      fail(400, "Google identity ไม่ถูกต้อง");
    const email = emailSchema.parse(p.email);
    if (
      flow.mode === "reauth" &&
      (!Number.isFinite(p.auth_time) ||
        Date.now() / 1000 - Number(p.auth_time) > 300 ||
        Number(p.auth_time) > Date.now() / 1000 + 60)
    )
      fail(403, "กรุณายืนยันตัวตน Google ใหม่");
    const user = await db.transaction(async (tx) => {
      await tx.query("SELECT id FROM settings WHERE id=1 FOR UPDATE");
      const {
        rows: [linked],
      } = await tx.query("SELECT * FROM users WHERE google_sub=$1", [p.sub]);
      if (flow.mode !== "login") {
        const {
          rows: [u],
        } = await tx.query(
          "SELECT * FROM users WHERE id=$1 AND NOT suspended FOR UPDATE",
          [job.user_id],
        );
        if (!u) fail(403, "บัญชีใช้งานไม่ได้");
        if (flow.mode === "reauth" && u.google_sub !== p.sub)
          fail(403, "กรุณาเลือกบัญชี Google เดิม");
        if (
          flow.mode === "link" &&
          (u.email !== email ||
            (linked && linked.id !== u.id) ||
            (u.google_sub && u.google_sub !== p.sub))
        )
          fail(409, "ไม่สามารถเชื่อมบัญชีนี้ได้");
        await tx.query("UPDATE users SET google_sub=$1 WHERE id=$2", [
          p.sub,
          u.id,
        ]);
        return u;
      }
      if (linked) {
        if (linked.suspended) fail(403, "บัญชีใช้งานไม่ได้");
        return linked;
      }
      const {
        rows: [existing],
      } = await tx.query("SELECT id FROM users WHERE email=$1", [email]);
      if (existing)
        fail(409, "กรุณาเข้าสู่บัญชีเดิม แล้วเชื่อม Google ในหน้าบัญชี");
      const {
        rows: [count],
      } = await tx.query("SELECT count(*)::int n FROM users");
      if (count.n >= 100) fail(503, "รอบทดลองมีสมาชิกครบแล้ว");
      const {
        rows: [u],
      } = await tx.query(
        "INSERT INTO users(id,email,name,google_sub,email_verified_at,role) VALUES($1,$2,$3,$4,now(),$5) RETURNING *",
        [
          randomUUID(),
          email,
          String(p.name ?? email).slice(0, 80),
          p.sub,
          email === config.adminEmail ? "admin" : "member",
        ],
      );
      return u;
    });
    await startSession(c, db, config, user, true);
    return c.redirect(flow.mode === "login" ? loginDestination(c, config) : "/app/account");
  });
  app.delete("/api/v1/auth/google", async (c) => {
    const u = await requireUser(c, db);
    const password = passwordSchema.parse((await body(c)).password);
    if (!u.password_hash || !(await argon2.verify(u.password_hash, password)))
      fail(400, "ต้องมีและยืนยันรหัสผ่านก่อนถอด Google");
    await db.query("UPDATE users SET google_sub=NULL WHERE id=$1", [u.id]);
    return c.json({ ok: true });
  });
}
const dummyHash = argon2.hash("dummy-password-not-for-login", {
  type: argon2.argon2id,
});
