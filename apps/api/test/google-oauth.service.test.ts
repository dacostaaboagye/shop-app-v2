import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import type { AuthUserRecord } from "../src/modules/auth/authentication.service.js";
import { buildConfiguredCallbackUrl } from "../src/modules/auth/google-oauth.service.js";
import { resolveGoogleOAuthUser } from "../src/modules/auth/google-oauth-user-resolver.js";

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

const baseInput = {
  providerUserId: "google-sub-1",
  email: "victim@example.com",
  name: "Victim User",
  avatarUrl: null,
  now: new Date("2026-05-01T00:00:00.000Z"),
};

const sampleUser: AuthUserRecord = {
  id: "user-1",
  slug: "victim-user",
  email: "victim@example.com",
  firstName: "Victim",
  lastName: "User",
  passwordHash: "hash",
  status: "active",
  preferredPortal: null,
  availablePortals: [],
  lastLoginAt: null,
  lockedUntil: null,
  primaryImageUrl: null,
  notificationPreferences: {
    emailEnabled: true,
    inAppEnabled: true,
    soundEnabled: true,
  },
  requiresPasswordChange: false,
  emailVerified: true,
};

function createRepositoryStub(overrides: {
  byIdentity?: AuthUserRecord | null;
  byEmail?: AuthUserRecord | null;
}) {
  return {
    findUserByOAuthIdentity: async () => overrides.byIdentity ?? null,
    findUserByEmail: async () => overrides.byEmail ?? null,
    createOAuthUser: async () => sampleUser,
    linkOAuthIdentity: async () => undefined,
    markSuccessfulLogin: async () => undefined,
  };
}

describe("resolveGoogleOAuthUser", () => {
  it("returns the existing user when the OAuth identity is already linked", async () => {
    const repo = createRepositoryStub({ byIdentity: sampleUser });
    const result = await resolveGoogleOAuthUser(repo, baseInput);
    assert.equal(result, sampleUser);
  });

  it("refuses to silently link Google to an existing email account", async () => {
    const repo = createRepositoryStub({ byEmail: sampleUser });

    await assert.rejects(
      () => resolveGoogleOAuthUser(repo, baseInput),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, "conflict");
        assert.equal(error.statusCode, 409);
        assert.equal(error.details?.oauthError, "account_exists");
        return true;
      },
    );
  });

  it("creates a new user when neither OAuth identity nor email matches", async () => {
    let createdEmail: string | null = null;
    const repo = {
      findUserByOAuthIdentity: async () => null,
      findUserByEmail: async () => null,
      createOAuthUser: async (input: { email: string }) => {
        createdEmail = input.email;
        return sampleUser;
      },
      linkOAuthIdentity: async () => undefined,
      markSuccessfulLogin: async () => undefined,
    };

    await resolveGoogleOAuthUser(repo, baseInput);

    assert.equal(createdEmail, baseInput.email.toLowerCase());
  });
});
