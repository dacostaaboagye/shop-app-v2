import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import {
  type CatalogMediaRepository,
  CatalogMediaService,
} from "../src/modules/catalog/catalog-media.service.js";

const REPOSITORY: CatalogMediaRepository = {
  async confirmMedia() {
    throw new Error("confirmMedia must not run when validation rejects");
  },
  async deleteMedia() {
    return null;
  },
  async listMedia() {
    return [];
  },
  async setPrimary() {
    return null;
  },
  async updateMedia() {
    return null;
  },
};

function createStorageStub(overrides: { exists?: boolean } = {}) {
  return {
    async deleteObject() {},
    async objectExists() {
      return overrides.exists ?? true;
    },
    async presignUpload() {
      return {
        expiresAt: new Date("2026-04-17T13:00:00.000Z"),
        key: "key",
        publicUrl: "https://r2.example.com/key",
        uploadUrl: "https://r2.example.com/upload",
      };
    },
    publicUrlForKey(key: string) {
      return `https://r2.example.com/${key}`;
    },
  };
}

describe("CatalogMediaService.confirm MIME allowlist", () => {
  it("rejects image/svg+xml even after a presign was approved", async () => {
    const service = new CatalogMediaService(
      REPOSITORY,
      createStorageStub() as unknown as ConstructorParameters<
        typeof CatalogMediaService
      >[1],
    );

    await assert.rejects(
      () =>
        service.confirm("actor-1", {
          entitySlug: "shoes",
          entityType: "product",
          isPrimary: false,
          key: "catalog/product/shoes/123-abc.svg",
          mimeType: "image/svg+xml",
          position: 0,
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 422);
        assert.equal(error.code, "validation_error");
        return true;
      },
    );
  });

  it("rejects an arbitrary text/html claim at confirm time", async () => {
    const service = new CatalogMediaService(
      REPOSITORY,
      createStorageStub() as unknown as ConstructorParameters<
        typeof CatalogMediaService
      >[1],
    );

    await assert.rejects(
      () =>
        service.confirm("actor-1", {
          entitySlug: "shoes",
          entityType: "product",
          isPrimary: false,
          key: "catalog/product/shoes/123-abc.html",
          mimeType: "text/html",
          position: 0,
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 422);
        return true;
      },
    );
  });
});
