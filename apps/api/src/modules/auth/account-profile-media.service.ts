import type {
  AdminMediaConfirmRequest,
  AdminMediaListResponse,
  AdminMediaRecord,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { CurrentUserService } from "./current-user.service.js";

type ProfileMediaCatalogService = {
  confirm(
    actorId: string,
    payload: AdminMediaConfirmRequest,
  ): Promise<AdminMediaRecord>;
  deleteMedia(id: string): Promise<string | null>;
  listMedia(
    entityType: "user",
    entitySlug: string,
  ): Promise<AdminMediaRecord[]>;
  presign(input: {
    actorId: string;
    entitySlug: string;
    entityType: "user";
    fileSizeBytes: number;
    filename: string;
    mimeType: string;
  }): Promise<{
    expiresAt: Date;
    key: string;
    publicUrl: string;
    uploadUrl: string;
  }>;
  setPrimary(
    id: string,
    entityType: "user",
    entitySlug: string,
    now: Date,
  ): Promise<AdminMediaRecord | null>;
};

export class AccountProfileMediaService {
  constructor(
    private readonly currentUserService: Pick<
      CurrentUserService,
      "getCurrentUser"
    >,
    private readonly catalogMediaService: ProfileMediaCatalogService,
  ) {}

  async list(userId: string): Promise<AdminMediaListResponse> {
    const user = await this.currentUserService.getCurrentUser(userId);

    return {
      items: await this.catalogMediaService.listMedia("user", user.slug),
    };
  }

  async presign(
    userId: string,
    input: { fileSizeBytes: number; filename: string; mimeType: string },
  ): Promise<{
    expiresAt: Date;
    key: string;
    publicUrl: string;
    uploadUrl: string;
  }> {
    if (!input.mimeType.startsWith("image/")) {
      throw new AppError({
        code: "validation_error",
        detail: "Profile image uploads must be image files.",
        statusCode: 422,
        title: "Unsupported profile media",
      });
    }

    const user = await this.currentUserService.getCurrentUser(userId);

    return this.catalogMediaService.presign({
      actorId: userId,
      entitySlug: user.slug,
      entityType: "user",
      fileSizeBytes: input.fileSizeBytes,
      filename: input.filename,
      mimeType: input.mimeType,
    });
  }

  async confirm(
    userId: string,
    input: {
      altText?: string | null;
      fileSizeBytes?: number;
      heightPx?: number;
      isPrimary?: boolean;
      key: string;
      mimeType: string;
      position?: number;
      widthPx?: number;
    },
  ): Promise<AdminMediaRecord> {
    if (!input.mimeType.startsWith("image/")) {
      throw new AppError({
        code: "validation_error",
        detail: "Profile image uploads must be image files.",
        statusCode: 422,
        title: "Unsupported profile media",
      });
    }

    const user = await this.currentUserService.getCurrentUser(userId);
    const existing = await this.catalogMediaService.listMedia(
      "user",
      user.slug,
    );

    return this.catalogMediaService.confirm(userId, {
      altText: input.altText ?? null,
      entitySlug: user.slug,
      entityType: "user",
      ...(input.fileSizeBytes !== undefined
        ? { fileSizeBytes: input.fileSizeBytes }
        : {}),
      ...(input.heightPx !== undefined ? { heightPx: input.heightPx } : {}),
      isPrimary: input.isPrimary ?? existing.length === 0,
      key: input.key,
      mimeType: input.mimeType,
      position: input.position ?? existing.length,
      ...(input.widthPx !== undefined ? { widthPx: input.widthPx } : {}),
    });
  }

  async delete(userId: string, assignmentId: string): Promise<void> {
    const ownedMedia = await this.getOwnedMedia(userId, assignmentId);
    const deleted = await this.catalogMediaService.deleteMedia(
      ownedMedia.assignmentId,
    );

    if (!deleted) {
      throw notFound(assignmentId);
    }
  }

  async setPrimary(
    userId: string,
    assignmentId: string,
  ): Promise<AdminMediaRecord> {
    const ownedMedia = await this.getOwnedMedia(userId, assignmentId);
    const updated = await this.catalogMediaService.setPrimary(
      ownedMedia.assignmentId,
      "user",
      ownedMedia.entitySlug,
      new Date(),
    );

    if (!updated) {
      throw notFound(assignmentId);
    }

    return updated;
  }

  private async getOwnedMedia(userId: string, assignmentId: string) {
    const user = await this.currentUserService.getCurrentUser(userId);
    const items = await this.catalogMediaService.listMedia("user", user.slug);
    const ownedMedia = items.find((item) => item.assignmentId === assignmentId);

    if (!ownedMedia) {
      throw notFound(assignmentId);
    }

    return ownedMedia;
  }
}

function notFound(assignmentId: string) {
  return new AppError({
    code: "not_found",
    detail: `Profile image "${assignmentId}" does not exist.`,
    statusCode: 404,
    title: "Profile image not found",
  });
}
