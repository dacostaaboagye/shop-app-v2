import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bytesMatchClaimedMime,
  describeFileKind,
  detectFileKind,
} from "../src/modules/_core/file-magic.js";

const HEADS = {
  jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]),
  png: new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
  ]),
  gif87a: new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x00, 0x00]),
  gif89a: new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]),
  webp: new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]),
  avif: new Uint8Array([
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
  ]),
  pdf: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]),
  // Hostile: SVG with a <?xml prelude — common upload-bypass attempt.
  svg: new Uint8Array([
    0x3c, 0x3f, 0x78, 0x6d, 0x6c, 0x20, 0x76, 0x65, 0x72, 0x73, 0x69, 0x6f,
  ]),
  // Hostile: HTML page.
  html: new Uint8Array([
    0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45, 0x20, 0x68, 0x74,
  ]),
} as const;

describe("detectFileKind", () => {
  it("recognises every supported raster image format", () => {
    assert.equal(detectFileKind(HEADS.jpeg), "jpeg");
    assert.equal(detectFileKind(HEADS.png), "png");
    assert.equal(detectFileKind(HEADS.gif87a), "gif");
    assert.equal(detectFileKind(HEADS.gif89a), "gif");
    assert.equal(detectFileKind(HEADS.webp), "webp");
    assert.equal(detectFileKind(HEADS.avif), "avif");
  });

  it("recognises PDF", () => {
    assert.equal(detectFileKind(HEADS.pdf), "pdf");
  });

  it("returns null for unknown / hostile formats", () => {
    assert.equal(detectFileKind(HEADS.svg), null);
    assert.equal(detectFileKind(HEADS.html), null);
    assert.equal(
      detectFileKind(new Uint8Array([0xde, 0xad, 0xbe, 0xef])),
      null,
    );
    assert.equal(detectFileKind(new Uint8Array([])), null);
  });
});

describe("bytesMatchClaimedMime", () => {
  it("accepts every MIME-vs-bytes match", () => {
    assert.equal(bytesMatchClaimedMime("image/jpeg", HEADS.jpeg), true);
    assert.equal(bytesMatchClaimedMime("image/png", HEADS.png), true);
    assert.equal(bytesMatchClaimedMime("image/gif", HEADS.gif89a), true);
    assert.equal(bytesMatchClaimedMime("image/webp", HEADS.webp), true);
    assert.equal(bytesMatchClaimedMime("image/avif", HEADS.avif), true);
    assert.equal(bytesMatchClaimedMime("application/pdf", HEADS.pdf), true);
  });

  it("rejects SVG bytes claimed as a raster image", () => {
    assert.equal(bytesMatchClaimedMime("image/jpeg", HEADS.svg), false);
    assert.equal(bytesMatchClaimedMime("image/png", HEADS.svg), false);
    assert.equal(bytesMatchClaimedMime("image/webp", HEADS.svg), false);
  });

  it("rejects HTML bytes claimed as PDF", () => {
    assert.equal(bytesMatchClaimedMime("application/pdf", HEADS.html), false);
  });

  it("rejects PNG bytes claimed as JPEG", () => {
    assert.equal(bytesMatchClaimedMime("image/jpeg", HEADS.png), false);
  });

  it("waves through MIMEs we don't sniff (e.g. video)", () => {
    // The catalog allowlist still keeps the door narrow; this just notes
    // that we don't reject for non-coverage.
    assert.equal(bytesMatchClaimedMime("video/mp4", HEADS.html), true);
    assert.equal(bytesMatchClaimedMime("video/webm", HEADS.svg), true);
  });
});

describe("describeFileKind", () => {
  it("returns a human label for each known kind", () => {
    assert.equal(describeFileKind("jpeg"), "JPEG");
    assert.equal(describeFileKind(null), "unknown");
  });
});
