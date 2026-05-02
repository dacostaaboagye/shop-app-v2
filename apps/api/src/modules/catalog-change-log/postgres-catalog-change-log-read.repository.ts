import { catalogChangeLog, users } from "@shop/database";
import { and, desc, eq, lt, or } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { CatalogChangeEntityType } from "./catalog-change-log.types.js";
import type { CatalogChangeLogReadRepository } from "./catalog-change-log-read.service.js";
import type {
  ChangeLogCursor,
  ChangeLogEntry,
} from "./catalog-change-log-read.types.js";

type RowSelection = {
  id: string;
  entityType: CatalogChangeEntityType;
  entityRef: string;
  parentEntityType: CatalogChangeEntityType | null;
  parentEntityId: string | null;
  operation: ChangeLogEntry["operation"];
  changedFields: string[];
  before: ChangeLogEntry["before"];
  after: ChangeLogEntry["after"];
  occurredAt: Date;
  actorSlug: string | null;
  actorFirstName: string | null;
  actorLastName: string | null;
};

export class PostgresCatalogChangeLogReadRepository
  implements CatalogChangeLogReadRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async findByEntity(input: {
    entityType: CatalogChangeEntityType;
    entityId: string;
    cursor: ChangeLogCursor | null;
    limit: number;
  }): Promise<ChangeLogEntry[]> {
    const baseFilter = and(
      eq(catalogChangeLog.entityType, input.entityType),
      eq(catalogChangeLog.entityId, input.entityId),
    );
    const rows = await this.runQuery({
      filter: baseFilter,
      cursor: input.cursor,
      limit: input.limit,
    });
    // Without a parent context we cannot resolve parentEntityRef from a
    // single-entity read, so it is always null here. Callers that need
    // parent context must use findByEntityOrParent.
    return rows.map((row) => toEntry(row, null));
  }

  async findByEntityOrParent(input: {
    entityType: CatalogChangeEntityType;
    entityId: string;
    cursor: ChangeLogCursor | null;
    limit: number;
  }): Promise<ChangeLogEntry[]> {
    // Resolve the parent's public ref once. For every child row in the
    // merged stream we stamp this ref as parentEntityRef so the response
    // never leaks UUIDs for entities the caller already addressed by slug.
    const parentRefRow = await this.db
      .select({ entityRef: catalogChangeLog.entityRef })
      .from(catalogChangeLog)
      .where(
        and(
          eq(catalogChangeLog.entityType, input.entityType),
          eq(catalogChangeLog.entityId, input.entityId),
        ),
      )
      .limit(1);

    const parentRef = parentRefRow[0]?.entityRef ?? null;

    const filter = or(
      and(
        eq(catalogChangeLog.entityType, input.entityType),
        eq(catalogChangeLog.entityId, input.entityId),
      ),
      and(
        eq(catalogChangeLog.parentEntityType, input.entityType),
        eq(catalogChangeLog.parentEntityId, input.entityId),
      ),
    );
    const rows = await this.runQuery({
      filter,
      cursor: input.cursor,
      limit: input.limit,
    });
    return rows.map((row) => {
      const isChild = row.parentEntityId !== null;
      return toEntry(row, isChild ? parentRef : null);
    });
  }

  private async runQuery(args: {
    filter: ReturnType<typeof and> | ReturnType<typeof or>;
    cursor: ChangeLogCursor | null;
    limit: number;
  }): Promise<RowSelection[]> {
    const cursorPredicate = args.cursor
      ? or(
          lt(catalogChangeLog.occurredAt, args.cursor.occurredAt),
          and(
            eq(catalogChangeLog.occurredAt, args.cursor.occurredAt),
            lt(catalogChangeLog.id, args.cursor.id),
          ),
        )
      : undefined;

    return this.db
      .select({
        id: catalogChangeLog.id,
        entityType: catalogChangeLog.entityType,
        entityRef: catalogChangeLog.entityRef,
        parentEntityType: catalogChangeLog.parentEntityType,
        parentEntityId: catalogChangeLog.parentEntityId,
        operation: catalogChangeLog.operation,
        changedFields: catalogChangeLog.changedFields,
        before: catalogChangeLog.before,
        after: catalogChangeLog.after,
        occurredAt: catalogChangeLog.occurredAt,
        actorSlug: users.slug,
        actorFirstName: users.firstName,
        actorLastName: users.lastName,
      })
      .from(catalogChangeLog)
      .leftJoin(users, eq(users.id, catalogChangeLog.actorId))
      .where(cursorPredicate ? and(args.filter, cursorPredicate) : args.filter)
      .orderBy(desc(catalogChangeLog.occurredAt), desc(catalogChangeLog.id))
      .limit(args.limit);
  }
}

function toEntry(
  row: RowSelection,
  parentEntityRef: string | null,
): ChangeLogEntry {
  return {
    id: row.id,
    entityType: row.entityType,
    entityRef: row.entityRef,
    parentEntityType: row.parentEntityType,
    parentEntityRef: row.parentEntityType ? parentEntityRef : null,
    operation: row.operation,
    changedFields: row.changedFields,
    before: row.before,
    after: row.after,
    actorSlug: row.actorSlug ?? "",
    actorName: formatActorName(row.actorFirstName, row.actorLastName),
    occurredAt: row.occurredAt.toISOString(),
  };
}

function formatActorName(
  firstName: string | null,
  lastName: string | null,
): string {
  const trimmed = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return trimmed === "" ? "Unknown user" : trimmed;
}
