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
import {
  bytesMatchClaimedMime,
  describeFileKind,
  detectFileKind,
  MAGIC_BYTES_HEAD_SIZE,
} from "../_core/file-magic.js";

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
    private readonly logger: Pick<Console, "error"> = console,
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
    // Re-validate the MIME at confirm time. Presign already enforces the
    // allowlist, but a malicious client can presign with image/jpeg, upload
    // SVG bytes, then claim a different mimeType on confirm. Without this
    // check the allowlist is effectively bypassed for stored XSS.
    if (
      !(ALLOWED_MEDIA_MIMES as readonly string[]).includes(payload.mimeType)
    ) {
      throw new AppError({
        code: "validation_error",
        detail: `MIME type "${payload.mimeType}" is not allowed.`,
        statusCode: 422,
        title: "Unsupported media type",
      });
    }
    // Single GetObject with Range bytes=0-15 verifies existence, returns
    // the full Content-Length, and gives us 16 bytes to sniff the format
    // against the claimed MIME. Replaces the old objectExists() HEAD; same
    // request count.
    const head = await this.storage.readObjectHead(
      payload.key,
      MAGIC_BYTES_HEAD_SIZE,
    );
    if (!head) {
      throw new AppError({
        code: "not_found",
        detail:
          "Uploaded file not found in storage. Complete the upload first.",
        statusCode: 404,
        title: "File not in storage",
      });
    }

    // Magic-byte check: if the claimed MIME is one we know how to sniff
    // (raster images + PDF), the actual file bytes must match. Defeats
    // "presign as JPEG, upload SVG, confirm as JPEG" attacks.
    if (!bytesMatchClaimedMime(payload.mimeType, head.bytes)) {
      throw new AppError({
        code: "validation_error",
        detail: `Uploaded file does not match the declared MIME "${payload.mimeType}" (looks like ${describeFileKind(detectFileKind(head.bytes))}).`,
        statusCode: 422,
        title: "File contents do not match declared type",
      });
    }

    // Size sanity: client cannot claim 1KB on presign and ship 100MB.
    // Presign signatures already enforce ContentLength, but verify here as
    // belt-and-braces against any future signing-policy regression.
    if (
      payload.fileSizeBytes !== undefined &&
      head.contentLength > 0 &&
      head.contentLength > payload.fileSizeBytes
    ) {
      throw new AppError({
        code: "validation_error",
        detail: `Uploaded file is ${head.contentLength} bytes, larger than the declared ${payload.fileSizeBytes} bytes.`,
        statusCode: 422,
        title: "File size mismatch",
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
      // The DB row is already gone, so we don't fail the whole call when R2
      // delete fails — the user's intent (remove the asset reference) is
      // satisfied. But silent swallow leaves orphaned objects in storage
      // with no breadcrumb; log structured so operators can sweep periodically.
      try {
        await this.storage.deleteObject(result.storageKey);
      } catch (error) {
        this.logger.error("[catalog-media] R2 delete failed; orphan retained", {
          assetId: id,
          error: error instanceof Error ? error.message : String(error),
          storageKey: result.storageKey,
        });
      }
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
