import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { R2StorageService } from "../src/infrastructure/r2-storage.js";

describe("R2StorageService", () => {
  it("presigns browser uploads without optional checksum query parameters", async () => {
    const storage = new R2StorageService({
      accountId: "test-account",
      accessKeyId: "test-access-key",
      bucket: "shop-test",
      publicUrl: "https://pub-test.r2.dev",
      secretAccessKey: "test-secret-key",
    });

    const result = await storage.presignUpload({
      fileSizeBytes: 1024,
      key: "catalog/product/bag/test.png",
      mimeType: "image/png",
    });
    const uploadUrl = new URL(result.uploadUrl);

    assert.equal(
      uploadUrl.hostname.endsWith(".test-account.r2.cloudflarestorage.com"),
      true,
    );
    assert.equal(uploadUrl.searchParams.has("x-amz-checksum-crc32"), false);
    assert.equal(
      uploadUrl.searchParams.has("x-amz-sdk-checksum-algorithm"),
      false,
    );
  });
});
