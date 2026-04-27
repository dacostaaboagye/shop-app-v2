import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { resolveApiUrl } from "./resolve-api-url";

const originalWindow = globalThis.window;
const originalApiBaseUrl = process.env.API_BASE_URL;
const originalPublicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

afterEach(() => {
  if (originalWindow === undefined) {
    delete (globalThis as { window?: Window }).window;
  } else {
    (globalThis as { window?: Window }).window = originalWindow;
  }

  if (originalApiBaseUrl === undefined) {
    delete process.env.API_BASE_URL;
  } else {
    process.env.API_BASE_URL = originalApiBaseUrl;
  }

  if (originalPublicApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalPublicApiBaseUrl;
  }
});

describe("resolveApiUrl", () => {
  it("keeps relative api paths in the browser so the same-origin proxy handles them", () => {
    (globalThis as { window?: Window }).window = {} as Window;
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://shop-app-testing.fly.dev";

    assert.equal(resolveApiUrl("/api/auth/refresh"), "/api/auth/refresh");
  });

  it("uses the configured server api base url outside the browser", () => {
    delete (globalThis as { window?: Window }).window;
    process.env.API_BASE_URL = "https://shop-app-testing.fly.dev";

    assert.equal(
      resolveApiUrl("/api/auth/refresh"),
      "https://shop-app-testing.fly.dev/api/auth/refresh",
    );
  });

  it("prefers API_BASE_URL over the public api base url on the server", () => {
    delete (globalThis as { window?: Window }).window;
    process.env.API_BASE_URL = "https://canonical-api.example.com";
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://public-api.example.com";

    assert.equal(
      resolveApiUrl("/api/auth/refresh"),
      "https://canonical-api.example.com/api/auth/refresh",
    );
  });
});
