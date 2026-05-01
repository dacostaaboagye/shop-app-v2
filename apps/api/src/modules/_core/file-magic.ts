/**
 * Detects a file's true format from its magic bytes.
 *
 * Used at upload confirm time to verify the bytes uploaded to R2 match the
 * MIME type the client claimed. Without this, presign + confirm trust the
 * client to be honest about the file shape — a malicious actor can presign
 * with image/jpeg, upload SVG bytes, and confirm with whatever they like.
 *
 * Coverage is intentionally limited to the formats this app uploads:
 * raster images (JPEG/PNG/GIF/WebP/AVIF) and PDF. Video formats are not
 * sniffed here — they don't carry stored-XSS risk in the same way and the
 * MP4/WebM containers are non-trivial to identify reliably from a 16-byte
 * head. The catalog allowlist keeps the door narrow either way.
 */

export type DetectedFileKind = "jpeg" | "png" | "gif" | "webp" | "avif" | "pdf";

const MIME_TO_KIND: Record<string, DetectedFileKind> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

const KIND_LABELS: Record<DetectedFileKind, string> = {
  jpeg: "JPEG",
  png: "PNG",
  gif: "GIF",
  webp: "WebP",
  avif: "AVIF",
  pdf: "PDF",
};

export const MAGIC_BYTES_HEAD_SIZE = 16;

export function detectFileKind(bytes: Uint8Array): DetectedFileKind | null {
  if (matchesPrefix(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (matchesPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }
  if (matchesPrefix(bytes, [0x47, 0x49, 0x46, 0x38])) return "gif";
  if (
    bytes.length >= 12 &&
    matchesPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  // AVIF: 4-byte box size, then "ftypavif" at offset 4. We don't validate the
  // size field — only the brand identifier.
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    bytes[8] === 0x61 &&
    bytes[9] === 0x76 &&
    bytes[10] === 0x69 &&
    bytes[11] === 0x66
  ) {
    return "avif";
  }
  if (matchesPrefix(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  return null;
}

/**
 * Returns true if the claimed MIME matches what the bytes actually look like.
 * Returns false for any sniffable format whose magic bytes do not match the
 * claim. Returns true for non-sniffable formats (e.g. video/*) — the caller
 * may still trust the MIME if the format is outside the sniff coverage.
 */
export function bytesMatchClaimedMime(
  claimedMime: string,
  bytes: Uint8Array,
): boolean {
  const expectedKind = MIME_TO_KIND[claimedMime];
  if (!expectedKind) return true;
  return detectFileKind(bytes) === expectedKind;
}

export function describeFileKind(kind: DetectedFileKind | null): string {
  return kind ? KIND_LABELS[kind] : "unknown";
}

function matchesPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
  if (bytes.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix[i]) return false;
  }
  return true;
}
