import type { AdminMediaConfirmRequest } from "@shop/contracts";
import {
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";

export type CatalogMediaKind = "document" | "image" | "video";

export function getMediaType(mimeType: string): CatalogMediaKind {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  return "document";
}

export function assertStorageKeyMatchesEntity(
  payload: AdminMediaConfirmRequest,
): void {
  const expectedPrefix = `catalog/${payload.entityType}/${payload.entitySlug}/`;

  if (payload.key.startsWith(expectedPrefix)) {
    return;
  }

  throw new AppError({
    code: "validation_error",
    detail:
      "Uploaded file key does not match the catalog entity that is being updated.",
    statusCode: 422,
    title: "Invalid media key",
  });
}

export function getMaxBytes(mediaType: CatalogMediaKind): number {
  if (mediaType === "video") return MAX_VIDEO_BYTES;
  if (mediaType === "document") return MAX_DOCUMENT_BYTES;
  return MAX_IMAGE_BYTES;
}

export function getLimitLabel(mediaType: CatalogMediaKind): string {
  if (mediaType === "video") return "100 MB video";
  if (mediaType === "document") return "25 MB document";
  return "10 MB image";
}

export function storageUnavailable(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Media storage is not configured. Set R2_* environment variables.",
    statusCode: 503,
    title: "Storage unavailable",
  });
}
