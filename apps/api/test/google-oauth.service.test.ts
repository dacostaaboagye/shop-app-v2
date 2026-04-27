import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildConfiguredCallbackUrl } from "../src/modules/auth/google-oauth.service.js";

describe("buildConfiguredCallbackUrl", () => {
  it("preserves the configured callback host while copying the incoming query", () => {
    const url = buildConfiguredCallbackUrl(
      "http://localhost:3000/api/auth/oauth/google/callback",
      "/api/auth/oauth/google/callback?state=abc&code=xyz",
    );

    assert.equal(
      url.toString(),
      "http://localhost:3000/api/auth/oauth/google/callback?state=abc&code=xyz",
    );
  });

  it("does not trust an internal proxy host when rebuilding the callback URL", () => {
    const url = buildConfiguredCallbackUrl(
      "https://in-hot.vercel.app/api/auth/oauth/google/callback",
      "http://localhost:4000/api/auth/oauth/google/callback?state=abc&code=xyz",
    );

    assert.equal(
      url.toString(),
      "https://in-hot.vercel.app/api/auth/oauth/google/callback?state=abc&code=xyz",
    );
  });
});
