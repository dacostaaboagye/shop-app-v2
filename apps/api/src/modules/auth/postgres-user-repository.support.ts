import type { Pool } from "pg";
import type { AuthUserRecord } from "./authentication.service.js";
import { type UserRow, userSelectSql } from "./postgres-auth-user-row.js";

export async function findUserRecord(
  pool: Pick<Pool, "query">,
  predicateSql: string,
  values: unknown[],
): Promise<AuthUserRecord | null> {
  const result = await pool.query<UserRow>(
    `${userSelectSql} WHERE ${predicateSql} LIMIT 1`,
    values,
  );

  return result.rows[0] ?? null;
}
