import "../apps/api/src/config.js";
import { connectDb, migrate } from "../apps/api/src/db.js";
const db = connectDb();
try {
  await migrate(db);
  console.log("Database migration complete");
} finally {
  await db.close();
}
