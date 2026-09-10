import { mkdir, appendFile } from "node:fs/promises";
const base = process.env.TEST_ORIGIN ?? "http://localhost:3000";
const duration = Number(process.env.SOAK_HOURS ?? 48) * 3600000;
if (!Number.isFinite(duration) || duration <= 0)
  throw new Error("Invalid SOAK_HOURS");
await mkdir("artifacts", { recursive: true });
const file = `artifacts/soak-${Date.now()}.jsonl`,
  start = Date.now();
let failures = 0,
  checks = 0;
while (Date.now() - start < duration) {
  const now = Date.now();
  try {
    const results = await Promise.all(
      Array.from({ length: 20 }, async () => {
        const r = await fetch(base + "/api/v1/assets", {
          signal: AbortSignal.timeout(10000),
        });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const p = await r.json();
        if (!p.items.length || p.items.some((a) => a.stale || a.price === null))
          throw new Error("Market data not ready/fresh");
        return true;
      }),
    );
    checks += results.length;
    await appendFile(
      file,
      JSON.stringify({
        at: new Date(),
        ok: true,
        requests: 20,
        ms: Date.now() - now,
      }) + "\n",
    );
  } catch (e) {
    failures++;
    await appendFile(
      file,
      JSON.stringify({ at: new Date(), ok: false, error: e.message }) + "\n",
    );
  }
  await new Promise((r) =>
    setTimeout(
      r,
      Math.min(60000, Math.max(0, duration - (Date.now() - start))),
    ),
  );
}
console.log(
  JSON.stringify({ file, hours: duration / 3600000, checks, failures }),
);
process.exitCode = failures ? 1 : 0;
