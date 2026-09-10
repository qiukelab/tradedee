import {
  randomBytes,
  createHash,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { z } from "zod";
export const idToken = () => randomBytes(32).toString("base64url");
export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email());
export const passwordSchema = z
  .string()
  .refine(
    (v) => Array.from(v).length >= 15 && Array.from(v).length <= 128,
    "รหัสผ่านต้องมี 15–128 ตัวอักษร",
  );
export function encrypt(value, key) {
  if (!/^[a-f\d]{64}$/i.test(key ?? ""))
    throw new Error("QUEUE_ENCRYPTION_KEY must be 64 hex characters");
  const iv = randomBytes(12),
    c = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  return {
    iv: iv.toString("hex"),
    data: Buffer.concat([c.update(JSON.stringify(value)), c.final()]).toString(
      "base64",
    ),
    tag: c.getAuthTag().toString("hex"),
  };
}
export function decrypt(value, key) {
  const c = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    Buffer.from(value.iv, "hex"),
  );
  c.setAuthTag(Buffer.from(value.tag, "hex"));
  return JSON.parse(
    Buffer.concat([
      c.update(Buffer.from(value.data, "base64")),
      c.final(),
    ]).toString(),
  );
}
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const fail = (status, message) => {
  throw new ApiError(status, message);
};
export async function throttle(db, key, max = 5, seconds = 3600, gap = 0) {
  const result = await db.query(
    `INSERT INTO rate_limits(key,count,expires_at) VALUES($1,1,now()+$3*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.count+1 END,expires_at=CASE WHEN rate_limits.expires_at<now() THEN now()+$3*interval '1 second' ELSE rate_limits.expires_at END,last_at=now() WHERE (rate_limits.expires_at<now() OR rate_limits.count<$2) AND rate_limits.last_at<=now()-$4*interval '1 second' RETURNING key`,
    [digest(key), max, seconds, gap],
  );
  if (!result.rows.length) fail(429, "ทำรายการบ่อยเกินไป กรุณารอแล้วลองใหม่");
}
