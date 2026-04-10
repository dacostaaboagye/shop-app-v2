import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function main() {
  await pool.query(`
    ALTER TABLE locations
      ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,8),
      ADD COLUMN IF NOT EXISTS longitude NUMERIC(11,8),
      ADD COLUMN IF NOT EXISTS geo_address TEXT
  `);
  console.log(
    "Migration applied: latitude, longitude, geo_address columns added to locations.",
  );
  await pool.end();
}

main().catch((error: unknown) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
