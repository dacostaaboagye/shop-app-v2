import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getWebEnv } from "./env";

const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

afterEach(() => {
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

  it("omits empty values", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "   ";

    assert.equal(getWebEnv().apiBaseUrl, undefined);
  });
});
