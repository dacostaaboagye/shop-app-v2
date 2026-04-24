import pg from "pg";
import { seedCatalog } from "./lib/catalog-seed.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await seedCatalog(client, new Date());
    await client.query("COMMIT");
    console.log("Seeded catalog brands, categories, products, options, and variants.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Catalog seed failed:", error);
  process.exit(1);
});

