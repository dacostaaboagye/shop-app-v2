import assert from "node:assert/strict";
import test from "node:test";
import { createPoolConfig } from "../src/infrastructure/database.js";

test("database runtime preserves the connection string", () => {
  const url = "postgres://user:password@example.test:5432/shop";

  const config = createPoolConfig(url);

  assert.equal(config.connectionString, url);
  assert.equal(config.connectionTimeoutMillis, 15_000);
});

test("database runtime preserves Neon SSL connection strings unchanged", () => {
  const url =
    "postgres://user:password@ep-test-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

  const config = createPoolConfig(url);

  assert.equal(config.connectionString, url);
  assert.equal(config.connectionTimeoutMillis, 15_000);
});
