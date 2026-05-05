import assert from "node:assert/strict";
import test from "node:test";
import {
  createPoolConfig,
  shouldUseDirectTls,
} from "../src/infrastructure/database.js";

type RefableStream = {
  ref?: unknown;
  unref?: unknown;
};

test("database runtime keeps the default pg negotiation for non-direct URLs", () => {
  const url = "postgres://user:password@example.test:5432/shop";

  const config = createPoolConfig(url);

  assert.equal(config.connectionString, url);
  assert.equal(config.connectionTimeoutMillis, 15_000);
  assert.equal(config.ssl, undefined);
  assert.equal(config.stream, undefined);
  assert.equal(shouldUseDirectTls(url), false);
});

test("database runtime uses direct TLS for Neon SSL URLs", () => {
  const url =
    "postgres://user:password@ep-test-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

  const config = createPoolConfig(url);

  assert.equal(shouldUseDirectTls(url), true);
  assert.equal(config.connectionTimeoutMillis, 15_000);
  assert.equal(config.ssl, false);
  assert.equal(typeof config.stream, "function");
  const stream = config.stream?.() as RefableStream | undefined;
  assert.equal(typeof stream?.ref, "function");
  assert.equal(typeof stream?.unref, "function");
  assert.equal(String(config.connectionString).includes("sslmode="), false);
  assert.equal(
    String(config.connectionString).includes("channel_binding="),
    false,
  );
});

test("database runtime allows explicit direct TLS negotiation for other providers", () => {
  const url =
    "postgres://user:password@example.test:5432/shop?sslnegotiation=direct&sslmode=verify-full";

  const config = createPoolConfig(url);

  assert.equal(shouldUseDirectTls(url), true);
  assert.equal(config.ssl, false);
  assert.equal(typeof config.stream, "function");
  assert.equal(
    String(config.connectionString).includes("sslnegotiation="),
    false,
  );
});
