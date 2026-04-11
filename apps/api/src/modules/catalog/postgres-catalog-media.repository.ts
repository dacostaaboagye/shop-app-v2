import type {
  AdminMediaRecord,
  AdminMediaUpdateRequest,
  CatalogMediaEntityType,
} from "@shop/contracts";
import type { Pool } from "pg";
import type { CatalogMediaRepository } from "./catalog-media.service.js";

type MediaRow = {
  alt_text: string | null;
  assigned_at: Date;
  asset_id: string;
  entity_slug: string;
  entity_type: string;
  file_size_bytes: number | null;
  height_px: number | null;
  id: string;
  is_primary: boolean;
  media_type: string;
  mime_type: string;
  position: number;
  public_url: string;
  storage_key: string;
  width_px: number | null;
};

const SEL = `
  a.id,
  a.entity_type,
  a.entity_slug,
  a.position,
  a.is_primary,
  a.alt_text,
  a.created_at AS assigned_at,
  ast.id AS asset_id,
  ast.storage_key,
  ast.public_url,
  ast.mime_type,
  ast.media_type,
  ast.file_size_bytes,
  ast.width_px,
  ast.height_px
`.trim();

const FROM = `catalog_media_assignments a
  JOIN media_assets ast ON ast.id = a.asset_id`;

function toRecord(row: MediaRow): AdminMediaRecord {
  return {
    altText: row.alt_text ?? undefined,
    assignedAt: row.assigned_at.toISOString(),
    assetId: row.asset_id,
    entitySlug: row.entity_slug,
    entityType: row.entity_type as CatalogMediaEntityType,
    fileSizeBytes: row.file_size_bytes ?? undefined,
    heightPx: row.height_px ?? undefined,
    assignmentId: row.id,
    isPrimary: row.is_primary,
    mediaType: row.media_type as "image" | "video",
    mimeType: row.mime_type,
    position: row.position,
    publicUrl: row.public_url,
    storageKey: row.storage_key,
    widthPx: row.width_px ?? undefined,
  };
}

export class PostgresCatalogMediaRepository implements CatalogMediaRepository {
  constructor(private readonly pool: Pick<Pool, "query">) {}

  async confirmMedia(
    input: Parameters<CatalogMediaRepository["confirmMedia"]>[0],
  ) {
    if (input.isPrimary) {
      await this.pool.query(
        `UPDATE catalog_media_assignments SET is_primary = false
         WHERE entity_type = $1 AND entity_slug = $2 AND is_primary = true`,
        [input.entityType, input.entitySlug],
      );
    }
    const r = await this.pool.query<MediaRow>(
      `WITH asset AS (
         INSERT INTO media_assets (
           storage_key, public_url, mime_type, media_type,
           file_size_bytes, width_px, height_px, uploaded_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id, storage_key, public_url, mime_type, media_type,
           file_size_bytes, width_px, height_px
       ),
       assignment AS (
         INSERT INTO catalog_media_assignments (
           asset_id, entity_type, entity_slug,
           alt_text, position, is_primary, assigned_by
         )
         SELECT id,$9,$10,$11,$12,$13,$8 FROM asset
         RETURNING id, entity_type, entity_slug, position,
           is_primary, alt_text, created_at AS assigned_at, asset_id
       )
       SELECT
         s.id, s.entity_type, s.entity_slug, s.position, s.is_primary,
         s.alt_text, s.assigned_at, s.asset_id,
         a.storage_key, a.public_url, a.mime_type, a.media_type,
         a.file_size_bytes, a.width_px, a.height_px
       FROM assignment s, asset a`,
      [
        input.key,
        input.publicUrl,
        input.mimeType,
        input.mediaType,
        input.fileSizeBytes ?? null,
        input.widthPx ?? null,
        input.heightPx ?? null,
        input.actorId,
        input.entityType,
        input.entitySlug,
        input.altText ?? null,
        input.position,
        input.isPrimary,
      ],
    );
    const row = r.rows[0];
    if (!row) throw new Error("Failed to save media record.");
    return toRecord(row);
  }

  async listMedia(entityType: CatalogMediaEntityType, entitySlug: string) {
    const r = await this.pool.query<MediaRow>(
      `SELECT ${SEL} FROM ${FROM}
       WHERE a.entity_type = $1 AND a.entity_slug = $2
       ORDER BY a.position ASC, a.created_at ASC`,
      [entityType, entitySlug],
    );
    return r.rows.map(toRecord);
  }

  async updateMedia(id: string, patch: AdminMediaUpdateRequest, now: Date) {
    const sets: string[] = ["updated_at = $2"];
    const values: unknown[] = [id, now];
    if ("altText" in patch) {
      values.push(patch.altText ?? null);
      sets.push(`alt_text = $${values.length}`);
    }
    if (patch.position !== undefined) {
      values.push(patch.position);
      sets.push(`position = $${values.length}`);
    }
    const r = await this.pool.query<MediaRow>(
      `WITH upd AS (
         UPDATE catalog_media_assignments
         SET ${sets.join(", ")}
         WHERE id = $1
         RETURNING id
       )
       SELECT ${SEL} FROM ${FROM}
       WHERE a.id = (SELECT id FROM upd)`,
      values,
    );
    return r.rows[0] ? toRecord(r.rows[0]) : null;
  }

  async deleteMedia(id: string) {
    const del = await this.pool.query<{ asset_id: string }>(
      `DELETE FROM catalog_media_assignments WHERE id = $1 RETURNING asset_id`,
      [id],
    );
    if (!del.rows[0]) return null;
    const { asset_id } = del.rows[0];
    const refs = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM catalog_media_assignments WHERE asset_id = $1`,
      [asset_id],
    );
    if (parseInt(refs.rows[0]?.count ?? "0", 10) > 0) {
      return { storageKey: null };
    }
    const gone = await this.pool.query<{ storage_key: string }>(
      `DELETE FROM media_assets WHERE id = $1 RETURNING storage_key`,
      [asset_id],
    );
    return { storageKey: gone.rows[0]?.storage_key ?? null };
  }

  async setPrimary(
    id: string,
    entityType: CatalogMediaEntityType,
    entitySlug: string,
    now: Date,
  ) {
    await this.pool.query(
      `UPDATE catalog_media_assignments
       SET is_primary = false, updated_at = $1
       WHERE entity_type = $2 AND entity_slug = $3
         AND is_primary = true AND id != $4`,
      [now, entityType, entitySlug, id],
    );
    const r = await this.pool.query<MediaRow>(
      `WITH upd AS (
         UPDATE catalog_media_assignments
         SET is_primary = true, updated_at = $1
         WHERE id = $2
         RETURNING id
       )
       SELECT ${SEL} FROM ${FROM}
       WHERE a.id = (SELECT id FROM upd)`,
      [now, id],
    );
    return r.rows[0] ? toRecord(r.rows[0]) : null;
  }
}
