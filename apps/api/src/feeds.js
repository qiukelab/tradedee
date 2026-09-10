import https from "node:https";
import { lookup } from "node:dns/promises";
import { XMLParser } from "fast-xml-parser";
import { randomUUID } from "node:crypto";
// Pin a resolved public IPv4 address to the request, preventing DNS-rebinding SSRF.
export async function readFeed(url) {
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443")
  )
    throw new Error("HTTPS feed required");
  const { address } = await lookup(u.hostname, { family: 4 });
  const [a, b] = address.split(".").map(Number);
  if (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19))
  )
    throw new Error("Private feed address blocked");
  return new Promise((resolve, reject) => {
    const req = https.get(
      u,
      {
        lookup: (_host, options, cb) =>
          options.all
            ? cb(null, [{ address, family: 4 }])
            : cb(null, address, 4),
        timeout: 10000,
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error("Feed HTTP " + res.statusCode));
          return;
        }
        const chunks = [];
        let size = 0;
        res.on("data", (b) => {
          size += b.length;
          if (size > 1000000) {
            req.destroy();
            reject(new Error("Feed too large"));
          } else chunks.push(b);
        });
        res.on("end", () => resolve(Buffer.concat(chunks).toString()));
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("Feed timeout")));
    req.on("error", reject);
  });
}
export async function ingestFeeds(db) {
  const { rows } = await db.query(
    "SELECT * FROM feeds WHERE licensed AND enabled",
  );
  for (const feed of rows) {
    try {
      const xml = await readFeed(feed.url);
      if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("DTD not allowed");
      const parsed = new XMLParser({
        ignoreAttributes: false,
        processEntities: false,
      }).parse(xml);
      const raw = parsed.rss?.channel?.item ?? parsed.feed?.entry ?? [];
      const entries = Array.isArray(raw) ? raw : [raw];
      for (const n of entries.slice(0, 30)) {
        const title = String(n.title?.["#text"] ?? n.title ?? "")
            .replace(/<[^>]*>/g, "")
            .slice(0, 200),
          summary = String(
            n.description ?? n.summary?.["#text"] ?? n.summary ?? "",
          )
            .replace(/<[^>]*>/g, "")
            .slice(0, 5000),
          url = typeof n.link === "string" ? n.link : n.link?.["@_href"],
          date = new Date(n.pubDate ?? n.published ?? n.updated);
        if (
          !title ||
          !summary ||
          !url ||
          !url.startsWith("https://") ||
          !Number.isFinite(date.getTime())
        )
          continue;
        const symbols = [
          ["BTCUSDT", /bitcoin|\bbtc\b/i],
          ["ETHUSDT", /ethereum|\beth\b/i],
          ["SOLUSDT", /solana|\bsol\b/i],
        ]
          .filter(([, re]) => re.test(title + " " + summary))
          .map(([s]) => s);
        if (!symbols.length) continue;
        await db.query(
          "INSERT INTO news(id,title,summary,url,symbols,published_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(url) DO NOTHING",
          [randomUUID(), title, summary, url, symbols, date],
        );
      }
      await db.query("UPDATE feeds SET last_error=NULL WHERE id=$1", [feed.id]);
    } catch (e) {
      await db.query("UPDATE feeds SET last_error=$1 WHERE id=$2", [
        e.message,
        feed.id,
      ]);
    }
  }
}
