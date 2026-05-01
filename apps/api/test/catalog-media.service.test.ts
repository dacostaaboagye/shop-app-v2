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

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);
const SVG_BYTES = new Uint8Array([
  0x3c, 0x3f, 0x78, 0x6d, 0x6c, 0x20, 0x76, 0x65, 0x72, 0x73, 0x69, 0x6f,
]);

type StorageStubOptions = {
  exists?: boolean;
  bytes?: Uint8Array;
  contentLength?: number;
};

function createStorageStub(overrides: StorageStubOptions = {}) {
  return {
    async deleteObject() {},
    async objectExists() {
      return overrides.exists ?? true;
    },
    async readObjectHead() {
      if (overrides.exists === false) return null;
      return {
        bytes: overrides.bytes ?? PNG_BYTES,
        contentLength: overrides.contentLength ?? 1024,
      };
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

function createService(stubOptions: StorageStubOptions = {}) {
  return new CatalogMediaService(
    REPOSITORY,
    createStorageStub(stubOptions) as unknown as ConstructorParameters<
      typeof CatalogMediaService
    >[1],
  );
}

describe("CatalogMediaService.confirm MIME allowlist", () => {
  it("rejects image/svg+xml even after a presign was approved", async () => {
    const service = createService();

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
    const service = createService();

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

describe("CatalogMediaService.confirm magic-byte verification", () => {
  it("rejects SVG bytes uploaded under a claimed image/jpeg", async () => {
    // Hostile path: client presigns image/jpeg, uploads SVG bytes (which
    // would render as inline SVG with script execution if served same-
    // origin), then claims image/jpeg at confirm. Allowlist alone is not
    // enough — the bytes themselves must match.
    const service = createService({ bytes: SVG_BYTES });

    await assert.rejects(
      () =>
        service.confirm("actor-1", {
          entitySlug: "shoes",
          entityType: "product",
          isPrimary: false,
          key: "catalog/product/shoes/evil.jpg",
          mimeType: "image/jpeg",
          position: 0,
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 422);
        assert.match(error.message, /does not match the declared MIME/i);
        return true;
      },
    );
  });

  it("rejects when the actual size exceeds the declared fileSizeBytes", async () => {
    const service = createService({
      bytes: PNG_BYTES,
      contentLength: 5_000_000,
    });

    await assert.rejects(
      () =>
        service.confirm("actor-1", {
          entitySlug: "shoes",
          entityType: "product",
          fileSizeBytes: 1_024,
          isPrimary: false,
          key: "catalog/product/shoes/inflated.png",
          mimeType: "image/png",
          position: 0,
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 422);
        assert.match(error.message, /larger than the declared/i);
        return true;
      },
    );
  });

  it("rejects when the object is not yet uploaded", async () => {
    const service = createService({ exists: false });

    await assert.rejects(
      () =>
        service.confirm("actor-1", {
          entitySlug: "shoes",
          entityType: "product",
          isPrimary: false,
          key: "catalog/product/shoes/missing.png",
          mimeType: "image/png",
          position: 0,
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 404);
        return true;
      },
    );
  });
});
