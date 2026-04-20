import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getApiEnv } from "../src/env.js";

const originalEnv = {
  API_HOST: process.env.API_HOST,
  API_PORT: process.env.API_PORT,
  AUTH_ACCESS_TOKEN_SECRET: process.env.AUTH_ACCESS_TOKEN_SECRET,
  AUTH_ACCESS_TOKEN_TTL_SECONDS: process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
  AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE,
  AUTH_REFRESH_TOKEN_TTL_SECONDS: process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS,
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  PLATFORM_EVENT_DELIVERY_BATCH_SIZE:
    process.env.PLATFORM_EVENT_DELIVERY_BATCH_SIZE,
  PLATFORM_EVENT_DELIVERY_ENABLED: process.env.PLATFORM_EVENT_DELIVERY_ENABLED,
  PLATFORM_EVENT_DELIVERY_POLL_INTERVAL_MS:
    process.env.PLATFORM_EVENT_DELIVERY_POLL_INTERVAL_MS,
  PLATFORM_EVENT_DELIVERY_PROCESSING_LEASE_MS:
    process.env.PLATFORM_EVENT_DELIVERY_PROCESSING_LEASE_MS,
  WEB_BASE_URL: process.env.WEB_BASE_URL,
};

afterEach(() => {
  restoreEnv();
});

describe("getApiEnv", () => {
  it("returns parsed values with secure-cookie defaults", () => {
    process.env.API_HOST = "127.0.0.1";
    process.env.API_PORT = "4100";
    process.env.AUTH_ACCESS_TOKEN_SECRET = "test-secret";
    process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS = "1200";
    process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS = "7200";
    process.env.DATABASE_URL = "postgres://localhost/shop";
    process.env.NODE_ENV = "production";
    process.env.PLATFORM_EVENT_DELIVERY_BATCH_SIZE = "40";
    process.env.PLATFORM_EVENT_DELIVERY_ENABLED = "false";
    process.env.PLATFORM_EVENT_DELIVERY_POLL_INTERVAL_MS = "5000";
    process.env.PLATFORM_EVENT_DELIVERY_PROCESSING_LEASE_MS = "120000";
    process.env.WEB_BASE_URL = "http://localhost:3000";

    const env = getApiEnv();

    assert.equal(env.apiHost, "127.0.0.1");
    assert.equal(env.apiPort, 4100);
    assert.equal(env.authAccessTokenSecret, "test-secret");
    assert.equal(env.authAccessTokenTtlSeconds, 1200);
    assert.equal(env.authCookieSecure, true);
    assert.equal(env.authRefreshTokenTtlSeconds, 7200);
    assert.equal(env.databaseUrl, "postgres://localhost/shop");
    assert.equal(env.nodeEnv, "production");
    assert.equal(env.platformEventDeliveryBatchSize, 40);
    assert.equal(env.platformEventDeliveryEnabled, false);
    assert.equal(env.platformEventDeliveryPollIntervalMs, 5000);
    assert.equal(env.platformEventDeliveryProcessingLeaseMs, 120000);
    assert.equal(env.webBaseUrl, "http://localhost:3000");
  });

  it("allows explicit cookie-security override in development", () => {
    process.env.AUTH_COOKIE_SECURE = "false";
    process.env.NODE_ENV = "development";

    const env = getApiEnv();

    assert.equal(env.authCookieSecure, false);
  });
});

function restoreEnv() {
  if (originalEnv.API_HOST === undefined) {
    delete process.env.API_HOST;
  } else {
    process.env.API_HOST = originalEnv.API_HOST;
  }

  if (originalEnv.API_PORT === undefined) {
    delete process.env.API_PORT;
  } else {
    process.env.API_PORT = originalEnv.API_PORT;
  }

  if (originalEnv.AUTH_ACCESS_TOKEN_SECRET === undefined) {
    delete process.env.AUTH_ACCESS_TOKEN_SECRET;
  } else {
    process.env.AUTH_ACCESS_TOKEN_SECRET = originalEnv.AUTH_ACCESS_TOKEN_SECRET;
  }

  if (originalEnv.AUTH_ACCESS_TOKEN_TTL_SECONDS === undefined) {
    delete process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS;
  } else {
    process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS =
      originalEnv.AUTH_ACCESS_TOKEN_TTL_SECONDS;
  }

  if (originalEnv.AUTH_COOKIE_SECURE === undefined) {
    delete process.env.AUTH_COOKIE_SECURE;
  } else {
    process.env.AUTH_COOKIE_SECURE = originalEnv.AUTH_COOKIE_SECURE;
  }

  if (originalEnv.AUTH_REFRESH_TOKEN_TTL_SECONDS === undefined) {
    delete process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS;
  } else {
    process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS =
      originalEnv.AUTH_REFRESH_TOKEN_TTL_SECONDS;
  }

  if (originalEnv.DATABASE_URL === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalEnv.DATABASE_URL;
  }

  if (originalEnv.NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
  }

  restoreEnvValue(
    "PLATFORM_EVENT_DELIVERY_BATCH_SIZE",
    originalEnv.PLATFORM_EVENT_DELIVERY_BATCH_SIZE,
  );
  restoreEnvValue(
    "PLATFORM_EVENT_DELIVERY_ENABLED",
    originalEnv.PLATFORM_EVENT_DELIVERY_ENABLED,
  );
  restoreEnvValue(
    "PLATFORM_EVENT_DELIVERY_POLL_INTERVAL_MS",
    originalEnv.PLATFORM_EVENT_DELIVERY_POLL_INTERVAL_MS,
  );
  restoreEnvValue(
    "PLATFORM_EVENT_DELIVERY_PROCESSING_LEASE_MS",
    originalEnv.PLATFORM_EVENT_DELIVERY_PROCESSING_LEASE_MS,
  );

  if (originalEnv.WEB_BASE_URL === undefined) {
    delete process.env.WEB_BASE_URL;
  } else {
    process.env.WEB_BASE_URL = originalEnv.WEB_BASE_URL;
  }
}

function restoreEnvValue(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
