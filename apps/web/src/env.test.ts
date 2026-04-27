import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getWebEnv } from "./env";

const originalServerApiBaseUrl = process.env.API_BASE_URL;
const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

afterEach(() => {
  if (originalServerApiBaseUrl === undefined) {
    delete process.env.API_BASE_URL;
  } else {
    process.env.API_BASE_URL = originalServerApiBaseUrl;
  }

  if (originalApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
  }
});

describe("getWebEnv", () => {
  it("returns the configured API base URL when present", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    assert.equal(getWebEnv().apiBaseUrl, "http://localhost:4000");
  });

  it("prefers the server api base url when present", () => {
    process.env.API_BASE_URL = "https://shop-app-testing.fly.dev";
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://public.example.com";

    assert.equal(getWebEnv().apiBaseUrl, "https://shop-app-testing.fly.dev");
  });

  it("omits empty values", () => {
    process.env.API_BASE_URL = "   ";
    process.env.NEXT_PUBLIC_API_BASE_URL = "   ";

    assert.equal(getWebEnv().apiBaseUrl, undefined);
  });
});
