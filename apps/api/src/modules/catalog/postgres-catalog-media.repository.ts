import type {
  AdminMediaRecord,
  AdminMediaUpdateRequest,
  CatalogMediaEntityType,
} from "@shop/contracts";
import { catalogMediaAssignments, mediaAssets } from "@shop/database";
import { and, eq, type InferSelectModel, ne } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { CatalogMediaRepository } from "./catalog-media.service.js";

type MediaAssetRaw = InferSelectModel<typeof mediaAssets>;
type MediaAssignmentRaw = InferSelectModel<typeof catalogMediaAssignments>;

type MediaResult = MediaAssignmentRaw & {
  asset: MediaAssetRaw;
};

function toRecord(row: MediaResult): AdminMediaRecord {
  if (!row.asset) {
    throw new Error(`Media assignment ${row.id} is missing its asset.`);
  }

  return {
    assignmentId: row.id,
    entityType: row.entityType as CatalogMediaEntityType,
    entitySlug: row.entitySlug,
    position: row.position,
    isPrimary: row.isPrimary,
    altText: row.altText ?? undefined,
    assignedAt: row.createdAt.toISOString(),
    assetId: row.assetId,
    storageKey: row.asset.storageKey,
    publicUrl: row.asset.publicUrl,
    mimeType: row.asset.mimeType,
    mediaType: row.asset.mediaType as "document" | "image" | "video",
    fileSizeBytes: row.asset.fileSizeBytes ?? undefined,
    heightPx: row.asset.heightPx ?? undefined,
    widthPx: row.asset.widthPx ?? undefined,
  };
}

export class PostgresCatalogMediaRepository implements CatalogMediaRepository {
  constructor(private readonly db: ApiDatabase) {}

  async confirmMedia(
    input: Parameters<CatalogMediaRepository["confirmMedia"]>[0],
  ): Promise<AdminMediaRecord> {
    const result = await this.db.transaction(async (tx) => {
      if (input.isPrimary) {
        await tx
          .update(catalogMediaAssignments)
          .set({ isPrimary: false, updatedAt: new Date() })
          .where(
            and(
              eq(catalogMediaAssignments.entityType, input.entityType),
              eq(catalogMediaAssignments.entitySlug, input.entitySlug),
              eq(catalogMediaAssignments.isPrimary, true),
            ),
          );
      }

      const [asset] = await tx
        .insert(mediaAssets)
        .values({
          storageKey: input.key,
          publicUrl: input.publicUrl,
          mimeType: input.mimeType,
          mediaType: input.mediaType,
          fileSizeBytes: input.fileSizeBytes,
          widthPx: input.widthPx,
          heightPx: input.heightPx,
          uploadedBy: input.actorId,
        })
        .returning();

      if (!asset) {
        throw new Error("Failed to insert asset.");
      }

      const [assignment] = await tx
        .insert(catalogMediaAssignments)
        .values({
          assetId: asset.id,
          entityType: input.entityType,
          entitySlug: input.entitySlug,
          altText: input.altText,
          position: input.position,
          isPrimary: input.isPrimary,
          assignedBy: input.actorId,
        })
        .returning();

      if (!asset || !assignment) {
        throw new Error("Failed to confirm media.");
      }

      return { ...assignment, asset };
    });

    return toRecord(result);
  }

  async listMedia(entityType: CatalogMediaEntityType, entitySlug: string) {
    const rows = await this.db.query.catalogMediaAssignments.findMany({
      where: (ma, { and, eq }) =>
        and(eq(ma.entityType, entityType), eq(ma.entitySlug, entitySlug)),
      with: {
        asset: true,
      },
      orderBy: (ma, { asc }) => [asc(ma.position), asc(ma.createdAt)],
    });

    return rows.map(toRecord);
  }

  async updateMedia(id: string, patch: AdminMediaUpdateRequest, now: Date) {
    const [updated] = await this.db
      .update(catalogMediaAssignments)
      .set({
        ...(patch.altText !== undefined && { altText: patch.altText }),
        ...(patch.position !== undefined && { position: patch.position }),
        updatedAt: now,
      })
      .where(eq(catalogMediaAssignments.id, id))
      .returning();

    if (!updated) return null;

    const full = await this.db.query.catalogMediaAssignments.findFirst({
      where: eq(catalogMediaAssignments.id, updated.id),
      with: { asset: true },
    });

    return full ? toRecord(full) : null;
  }

  async deleteMedia(id: string) {
    return await this.db.transaction(async (tx) => {
      const [assignment] = await tx
        .delete(catalogMediaAssignments)
        .where(eq(catalogMediaAssignments.id, id))
        .returning({ assetId: catalogMediaAssignments.assetId });

      if (!assignment) return null;

      const otherAssignments = await tx
        .select({ id: catalogMediaAssignments.id })
        .from(catalogMediaAssignments)
        .where(eq(catalogMediaAssignments.assetId, assignment.assetId))
        .limit(1);

      if (otherAssignments.length > 0) {
        return { storageKey: null };
      }

      const [asset] = await tx
        .delete(mediaAssets)
        .where(eq(mediaAssets.id, assignment.assetId))
        .returning({ storageKey: mediaAssets.storageKey });

      return { storageKey: asset?.storageKey ?? null };
    });
  }

  async setPrimary(
    id: string,
    entityType: CatalogMediaEntityType,
    entitySlug: string,
    now: Date,
  ) {
    const result = await this.db.transaction(async (tx) => {
      await tx
        .update(catalogMediaAssignments)
        .set({ isPrimary: false, updatedAt: now })
        .where(
          and(
            eq(catalogMediaAssignments.entityType, entityType),
            eq(catalogMediaAssignments.entitySlug, entitySlug),
            eq(catalogMediaAssignments.isPrimary, true),
            ne(catalogMediaAssignments.id, id),
          ),
        );

      const [updated] = await tx
        .update(catalogMediaAssignments)
        .set({ isPrimary: true, updatedAt: now })
        .where(eq(catalogMediaAssignments.id, id))
        .returning();

      if (!updated) return null;

      return await tx.query.catalogMediaAssignments.findFirst({
        where: eq(catalogMediaAssignments.id, updated.id),
        with: { asset: true },
      });
    });

    return result ? toRecord(result) : null;
  }
}
