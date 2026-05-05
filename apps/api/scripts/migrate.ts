import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL must be set to run migrations.");
  process.exit(1);
}

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const migrationsFolder = resolve(
  __dirname,
  "../../../packages/database/drizzle",
);

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

const start = Date.now();

try {
  await migrate(db, { migrationsFolder });
  console.log(
    `Migrations applied from ${migrationsFolder} in ${Date.now() - start}ms.`,
  );
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
