import pg from "pg";
import { readFile } from "node:fs/promises";
export function connectDb() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });
  return {
    query: (...args) => pool.query(...args),
    async transaction(fn) {
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        const result = await fn(c);
        await c.query("COMMIT");
        return result;
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      } finally {
        c.release();
      }
    },
    close: () => pool.end(),
  };
}
export async function migrate(db) {
  await db.query(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
}
