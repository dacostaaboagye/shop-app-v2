import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { AccountProfileMediaService } from "../src/modules/auth/account-profile-media.service.js";

const SAMPLE_USER = {
  id: "usr_1",
  slug: "user-one",
};

function createService(
  overrides: { presignSpy?: () => void; confirmSpy?: () => void } = {},
) {
  const currentUserService = {
    async getCurrentUser() {
      return { ...SAMPLE_USER } as unknown as never;
    },
  } as unknown as ConstructorParameters<typeof AccountProfileMediaService>[0];

  const catalogMediaService = {
    async listMedia() {
      return [];
    },
    async presign() {
      overrides.presignSpy?.();
      return {
        expiresAt: new Date("2026-04-17T13:00:00.000Z"),
        key: "users/user-one/uploads/abc",
        publicUrl: "https://r2.example.com/users/user-one/uploads/abc",
        uploadUrl: "https://r2.example.com/upload/sig",
      };
    },
    async confirm() {
      overrides.confirmSpy?.();
      return {
        assignmentId: "assign-1",
        entitySlug: "user-one",
        entityType: "user" as const,
        isPrimary: true,
        key: "users/user-one/uploads/abc",
        mimeType: "image/png",
        position: 0,
        publicUrl: "https://r2.example.com/users/user-one/uploads/abc",
      } as unknown as never;
    },
    async deleteMedia() {
      return null;
    },
    async setPrimary() {
      return null;
    },
  } as unknown as ConstructorParameters<typeof AccountProfileMediaService>[1];

  return new AccountProfileMediaService(
    currentUserService,
    catalogMediaService,
  );
}

describe("AccountProfileMediaService MIME allowlist", () => {
  for (const mimeType of [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ]) {
    it(`allows ${mimeType} on presign`, async () => {
      let called = false;
      const service = createService({
        presignSpy: () => {
          called = true;
        },
      });

      await service.presign("usr_1", {
        fileSizeBytes: 1024,
        filename: "avatar.bin",
        mimeType,
      });

      assert.equal(called, true);
    });
  }

  for (const mimeType of [
    "image/svg+xml",
    "image/svg",
    "text/html",
    "application/javascript",
    "image/jpeg; charset=evil",
  ]) {
    it(`rejects ${mimeType} on presign`, async () => {
      const service = createService();

      await assert.rejects(
        () =>
          service.presign("usr_1", {
            fileSizeBytes: 1024,
            filename: "evil.svg",
            mimeType,
          }),
        (error: unknown) => {
          assert.ok(error instanceof AppError);
          assert.equal(error.statusCode, 422);
          return true;
        },
      );
    });
  }

  it("rejects SVG on confirm even after a presign was approved", async () => {
    const service = createService();

    await assert.rejects(
      () =>
        service.confirm("usr_1", {
          key: "users/user-one/uploads/abc",
          mimeType: "image/svg+xml",
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 422);
        return true;
      },
    );
  });
});
