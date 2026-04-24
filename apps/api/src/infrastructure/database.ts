import * as schema from "@shop/database";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export type ApiDatabase = NodePgDatabase<typeof schema>;

export type DatabaseRuntime = {
  db: ApiDatabase;
  pool: Pool;
};

export function createDatabaseRuntime(databaseUrl: string): DatabaseRuntime {
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  return {
    db: drizzle(pool, { schema }),
    pool,
  };
}
