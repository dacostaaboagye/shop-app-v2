import { Pool, type PoolConfig } from "@neondatabase/serverless";
import * as schema from "@shop/database";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";

const DEFAULT_CONNECTION_TIMEOUT_MS = 15_000;

export type ApiDatabase = NeonDatabase<typeof schema>;

export type DatabaseRuntime = {
  db: ApiDatabase;
  pool: Pool;
};

export function createDatabaseRuntime(databaseUrl: string): DatabaseRuntime {
  const pool = new Pool(createPoolConfig(databaseUrl));

  return {
    db: drizzle(pool, { schema }),
    pool,
  };
}

export function createPoolConfig(databaseUrl: string): PoolConfig {
  return {
    connectionString: databaseUrl,
    connectionTimeoutMillis: DEFAULT_CONNECTION_TIMEOUT_MS,
  };
}
