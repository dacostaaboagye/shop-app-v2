import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  issueAccessToken,
  verifyAccessToken,
} from "../src/modules/auth/access-token.js";

const SECRET = "rfc-7519-test-secret";

function decodePayload(token: string): Record<string, unknown> {
  const [, encoded] = token.split(".");
  if (!encoded) throw new Error("malformed token");
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
}

describe("access token NumericDate compliance", () => {
  it("encodes issued_at and expires_at as seconds since epoch (RFC 7519)", () => {
    const now = new Date("2026-04-08T12:00:00.123Z");
    const issued = issueAccessToken({
      expiresInSeconds: 900,
      now,
      secret: SECRET,
      userId: "usr_1",
      userSlug: "user-one",
    });

    const payload = decodePayload(issued.token);
    const issuedAtSeconds = now.getTime() / 1000;

    assert.equal(payload.issued_at, issuedAtSeconds);
    assert.equal(payload.expires_at, issuedAtSeconds + 900);
  });

  it("verifies a fresh token and round-trips the timestamps", () => {
    const now = new Date("2026-04-08T12:00:00.123Z");
    const issued = issueAccessToken({
      expiresInSeconds: 900,
      now,
      secret: SECRET,
      userId: "usr_1",
      userSlug: "user-one",
    });

    const verified = verifyAccessToken({
      now,
      secret: SECRET,
      token: issued.token,
    });

    assert.equal(verified.userId, "usr_1");
    assert.equal(verified.userSlug, "user-one");
    assert.equal(verified.issuedAt.getTime(), now.getTime());
    assert.equal(verified.expiresAt.getTime(), now.getTime() + 900000);
  });

  it("rejects a token whose expiry is in the past", () => {
    const issuedAt = new Date("2026-04-08T12:00:00.000Z");
    const issued = issueAccessToken({
      expiresInSeconds: 60,
      now: issuedAt,
      secret: SECRET,
      userId: "usr_1",
      userSlug: "user-one",
    });

    assert.throws(() =>
      verifyAccessToken({
        now: new Date("2026-04-08T12:02:00.000Z"),
        secret: SECRET,
        token: issued.token,
      }),
    );
  });

  it("returned expiresAt matches the JWT exp converted to milliseconds", () => {
    const now = new Date("2026-04-08T12:00:00.000Z");
    const issued = issueAccessToken({
      expiresInSeconds: 600,
      now,
      secret: SECRET,
      userId: "usr_1",
      userSlug: "user-one",
    });

    const payload = decodePayload(issued.token);

    assert.equal(
      issued.expiresAt.getTime(),
      (payload.expires_at as number) * 1000,
    );
  });
});
