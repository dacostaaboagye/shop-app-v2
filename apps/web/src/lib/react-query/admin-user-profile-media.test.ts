import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_IMAGE_BYTES } from "@shop/contracts";
import { validateProfileImageFile } from "./admin-user-profile-media";

describe("admin user profile media", () => {
  it("accepts no file because profile image is optional", () => {
    assert.equal(validateProfileImageFile(null), undefined);
  });

  it("accepts supported raster image files within the image limit", () => {
    assert.equal(
      validateProfileImageFile({ size: MAX_IMAGE_BYTES, type: "image/png" }),
      undefined,
    );
  });

  it("rejects unsupported and oversized profile images", () => {
    assert.equal(
      validateProfileImageFile({ size: 1_000, type: "image/svg+xml" }),
      "Profile image must be JPEG, PNG, WebP, GIF, or AVIF.",
    );
    assert.equal(
      validateProfileImageFile({
        size: MAX_IMAGE_BYTES + 1,
        type: "image/jpeg",
      }),
      "Profile image must be 10 MB or smaller.",
    );
  });
});
