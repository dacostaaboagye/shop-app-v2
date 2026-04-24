import type {
  AdminMediaConfirmRequest,
  AdminMediaRecord,
  AdminMediaUpdateRequest,
  CatalogMediaEntityType,
} from "@shop/contracts";
import {
  ALLOWED_MEDIA_MIMES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "@shop/contracts";
import type { R2StorageService } from "../../infrastructure/r2-storage.js";
import { AppError } from "../_core/errors/app-error.js";

export type CatalogMediaRepository = {
  confirmMedia(input: {
    actorId: string;
    altText?: string | null;
    entitySlug: string;
    entityType: CatalogMediaEntityType;
    fileSizeBytes?: number;
    heightPx?: number;
    isPrimary: boolean;
    key: string;
    mediaType: "document" | "image" | "video";
    mimeType: string;
    position: number;
    publicUrl: string;
    widthPx?: number;
  }): Promise<AdminMediaRecord>;
  deleteMedia(id: string): Promise<{ storageKey: string | null } | null>;
  listMedia(
    entityType: CatalogMediaEntityType,
    entitySlug: string,
  ): Promise<AdminMediaRecord[]>;
  setPrimary(
    id: string,
    entityType: CatalogMediaEntityType,
    entitySlug: string,
    now: Date,
  ): Promise<AdminMediaRecord | null>;
  updateMedia(
    id: string,
    patch: AdminMediaUpdateRequest,
    now: Date,
  ): Promise<AdminMediaRecord | null>;
};

export class CatalogMediaService {
  constructor(
    private readonly repository: CatalogMediaRepository,
    private readonly storage: R2StorageService | null,
  ) {}

  async presign(input: {
    actorId: string;
    entitySlug: string;
    entityType: CatalogMediaEntityType;
    fileSizeBytes: number;
    filename: string;
    mimeType: string;
  }) {
    if (!this.storage) throw storageUnavailable();
    if (!(ALLOWED_MEDIA_MIMES as readonly string[]).includes(input.mimeType)) {
      throw new AppError({
        code: "validation_error",
        detail: `MIME type "${input.mimeType}" is not allowed.`,
        statusCode: 422,
        title: "Unsupported media type",
      });
    }
    const mediaType = getMediaType(input.mimeType);
    const maxBytes = getMaxBytes(mediaType);
    if (input.fileSizeBytes > maxBytes) {
      throw new AppError({
        code: "validation_error",
        detail: `File exceeds the ${getLimitLabel(mediaType)} limit.`,
        statusCode: 422,
        title: "File too large",
      });
    }
    const ext = input.filename.split(".").pop()?.toLowerCase() ?? "bin";
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const key = `catalog/${input.entityType}/${input.entitySlug}/${ts}-${rand}.${ext}`;
    return this.storage.presignUpload({
      fileSizeBytes: input.fileSizeBytes,
      key,
      mimeType: input.mimeType,
    });
  }

  async confirm(actorId: string, payload: AdminMediaConfirmRequest) {
    if (!this.storage) throw storageUnavailable();
    const exists = await this.storage.objectExists(payload.key);
    if (!exists) {
      throw new AppError({
        code: "not_found",
        detail:
          "Uploaded file not found in storage. Complete the upload first.",
        statusCode: 404,
        title: "File not in storage",
      });
    }
    const mediaType = getMediaType(payload.mimeType);
    return this.repository.confirmMedia({
      actorId,
      altText: payload.altText ?? null,
      entitySlug: payload.entitySlug,
      entityType: payload.entityType,
      isPrimary: payload.isPrimary,
      key: payload.key,
      mediaType,
      mimeType: payload.mimeType,
      position: payload.position,
      publicUrl: this.storage.publicUrlForKey(payload.key),
      ...(payload.fileSizeBytes !== undefined && {
        fileSizeBytes: payload.fileSizeBytes,
      }),
      ...(payload.heightPx !== undefined && { heightPx: payload.heightPx }),
      ...(payload.widthPx !== undefined && { widthPx: payload.widthPx }),
    });
  }

  listMedia(entityType: CatalogMediaEntityType, entitySlug: string) {
    return this.repository.listMedia(entityType, entitySlug);
  }

  updateMedia(id: string, patch: AdminMediaUpdateRequest, now: Date) {
    return this.repository.updateMedia(id, patch, now);
  }

  async deleteMedia(id: string) {
    if (!this.storage) throw storageUnavailable();
    const result = await this.repository.deleteMedia(id);
    if (!result) return null;
    if (result.storageKey) {
      await this.storage.deleteObject(result.storageKey).catch(() => undefined);
    }
    return id;
  }

  setPrimary(
    id: string,
    entityType: CatalogMediaEntityType,
    entitySlug: string,
    now: Date,
  ) {
    return this.repository.setPrimary(id, entityType, entitySlug, now);
  }
}

function getMediaType(mimeType: string): "document" | "image" | "video" {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  return "document";
}

function getMaxBytes(mediaType: "document" | "image" | "video") {
  if (mediaType === "video") return MAX_VIDEO_BYTES;
  if (mediaType === "document") return MAX_DOCUMENT_BYTES;
  return MAX_IMAGE_BYTES;
}

function getLimitLabel(mediaType: "document" | "image" | "video") {
  if (mediaType === "video") return "100 MB video";
  if (mediaType === "document") return "25 MB document";
  return "10 MB image";
}

function storageUnavailable() {
  return new AppError({
    code: "internal_error",
    detail: "Media storage is not configured. Set R2_* environment variables.",
    statusCode: 503,
    title: "Storage unavailable",
  });
}
