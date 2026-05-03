import type {
  ChangeLogCursor,
  ChangeLogEntry,
  ChangeLogPage,
  ReadByEntityInput,
  ReadByParentInput,
} from "./catalog-change-log-read.types.js";

export const DEFAULT_CHANGE_LOG_PAGE_SIZE = 20;
export const MAX_CHANGE_LOG_PAGE_SIZE = 50;

/**
 * Repository contract used by the read service. Implementations must be
 * index-aligned: `findByEntity` uses `catalog_change_log_entity_idx`;
 * `findByEntityOrParent` uses the entity index UNION'd with the partial
 * `catalog_change_log_parent_idx`. Both order by (occurredAt DESC, id DESC)
 * so a (occurredAt, id) cursor uniquely positions the next page.
 */
export interface CatalogChangeLogReadRepository {
  findByEntity(input: {
    entityType: ReadByEntityInput["entityType"];
    entityId: string;
    cursor: ChangeLogCursor | null;
    limit: number;
  }): Promise<ChangeLogEntry[]>;

  findByEntityOrParent(input: {
    entityType: ReadByEntityInput["entityType"];
    entityId: string;
    cursor: ChangeLogCursor | null;
    limit: number;
  }): Promise<ChangeLogEntry[]>;
}

export class CatalogChangeLogReadService {
  constructor(private readonly repo: CatalogChangeLogReadRepository) {}

  async readByEntity(input: ReadByEntityInput): Promise<ChangeLogPage> {
    const limit = clampLimit(input.limit);
    const cursor = decodeCursor(input.cursor ?? null);
    const rows = await this.repo.findByEntity({
      entityType: input.entityType,
      entityId: input.entityId,
      cursor,
      limit: limit + 1,
    });
    return buildPage(rows, limit);
  }

  async readByParentMerged(input: ReadByParentInput): Promise<ChangeLogPage> {
    const limit = clampLimit(input.limit);
    const cursor = decodeCursor(input.cursor ?? null);
    const rows = await this.repo.findByEntityOrParent({
      entityType: input.parentEntityType,
      entityId: input.parentEntityId,
      cursor,
      limit: limit + 1,
    });
    return buildPage(rows, limit);
  }
}

export function clampLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit) || limit <= 0) {
    return DEFAULT_CHANGE_LOG_PAGE_SIZE;
  }
  const truncated = Math.floor(limit);
  if (truncated > MAX_CHANGE_LOG_PAGE_SIZE) return MAX_CHANGE_LOG_PAGE_SIZE;
  return truncated;
}

export function encodeCursor(cursor: ChangeLogCursor): string {
  const payload = JSON.stringify({
    t: cursor.occurredAt.toISOString(),
    i: cursor.id,
  });
  return Buffer.from(payload, "utf8").toString("base64url");
}

export function decodeCursor(raw: string | null): ChangeLogCursor | null {
  if (raw === null || raw === "") return null;
  let decoded: string;
  try {
    decoded = Buffer.from(raw, "base64url").toString("utf8");
  } catch {
    throw new InvalidChangeLogCursorError();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new InvalidChangeLogCursorError();
  }
  if (!isCursorPayload(parsed)) {
    throw new InvalidChangeLogCursorError();
  }
  const occurredAt = new Date(parsed.t);
  if (Number.isNaN(occurredAt.getTime())) {
    throw new InvalidChangeLogCursorError();
  }
  return { occurredAt, id: parsed.i };
}

export class InvalidChangeLogCursorError extends Error {
  constructor() {
    super("invalid change-log cursor");
    this.name = "InvalidChangeLogCursorError";
  }
}

function buildPage(rows: ChangeLogEntry[], limit: number): ChangeLogPage {
  if (rows.length <= limit) {
    return { entries: rows, nextCursor: null };
  }
  const entries = rows.slice(0, limit);
  const last = entries[entries.length - 1];
  if (!last) {
    return { entries, nextCursor: null };
  }
  const nextCursor = encodeCursor({
    occurredAt: new Date(last.occurredAt),
    id: last.id,
  });
  return { entries, nextCursor };
}

function isCursorPayload(value: unknown): value is { t: string; i: string } {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as { t?: unknown; i?: unknown };
  return typeof candidate.t === "string" && typeof candidate.i === "string";
}
