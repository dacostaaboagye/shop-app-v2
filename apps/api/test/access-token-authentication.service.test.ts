import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import {
  AccessTokenAuthenticationService,
  type AccessTokenUserRepository,
} from "../src/modules/auth/access-token-authentication.service.js";

describe("AccessTokenAuthenticationService", () => {
  it("authenticates an active user from a valid token", async () => {
    const now = new Date("2026-04-08T12:00:00.000Z");
    const service = createService(
      {
        id: "usr_123",
        slug: "store-manager",
        status: "active",
      },
      now,
    );

    const actor = await service.authenticate(
      issueAccessToken({
        expiresInSeconds: 900,
        now,
        secret: "development-access-secret",
        userId: "usr_123",
        userSlug: "store-manager",
      }).token,
    );

    assert.deepEqual(actor, {
      userId: "usr_123",
      userSlug: "store-manager",
    });
  });

  it("rejects a deactivated user even with a valid signed token", async () => {
    const now = new Date("2026-04-08T12:00:00.000Z");
    const service = createService(
      {
        id: "usr_123",
        slug: "store-manager",
        status: "deactivated",
      },
      now,
    );

    await assert.rejects(
      () =>
        service.authenticate(
          issueAccessToken({
            expiresInSeconds: 900,
            now,
            secret: "development-access-secret",
            userId: "usr_123",
            userSlug: "store-manager",
          }).token,
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.title, "Invalid access token");
        return true;
      },
    );
  });

  it("rejects a locked user even with a valid signed token", async () => {
    const now = new Date("2026-04-08T12:00:00.000Z");
    const service = createService(
      {
        id: "usr_123",
        lockedUntil: new Date("2026-04-08T12:05:00.000Z"),
        slug: "store-manager",
        status: "active",
      },
      now,
    );

    await assert.rejects(
      () =>
        service.authenticate(
          issueAccessToken({
            expiresInSeconds: 900,
            now,
            secret: "development-access-secret",
            userId: "usr_123",
            userSlug: "store-manager",
          }).token,
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.title, "Invalid access token");
        return true;
      },
    );
  });

  it("rejects a force-reset user even with a valid signed token", async () => {
    const now = new Date("2026-04-08T12:00:00.000Z");
    const service = createService(
      {
        id: "usr_123",
        requiresPasswordChange: true,
        slug: "store-manager",
        status: "active",
      },
      now,
    );

    await assert.rejects(
      () =>
        service.authenticate(
          issueAccessToken({
            expiresInSeconds: 900,
            now,
            secret: "development-access-secret",
            userId: "usr_123",
            userSlug: "store-manager",
          }).token,
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.title, "Invalid access token");
        return true;
      },
    );
  });

  it("rejects an expired access token", async () => {
    const issuedAt = new Date("2026-04-08T12:00:00.000Z");
    const service = createService(
      {
        id: "usr_123",
        slug: "store-manager",
        status: "active",
      },
      new Date("2026-04-08T12:20:00.000Z"),
    );

    await assert.rejects(
      () =>
        service.authenticate(
          issueAccessToken({
            expiresInSeconds: 60,
            now: issuedAt,
            secret: "development-access-secret",
            userId: "usr_123",
            userSlug: "store-manager",
          }).token,
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.title, "Invalid access token");
        return true;
      },
    );
  });
});

function createService(
  user: {
    id: string;
    lockedUntil?: Date | null;
    requiresPasswordChange?: boolean;
    slug: string;
    status: "active" | "deactivated" | "suspended";
  } | null,
  now: Date,
) {
  const repository: AccessTokenUserRepository = {
    async findUserById() {
      return user;
    },
  };

  return new AccessTokenAuthenticationService(
    repository,
    "development-access-secret",
    () => now,
  );
}
