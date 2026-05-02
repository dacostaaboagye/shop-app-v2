import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import type {
  CatalogHistoryEntityKind,
  CatalogHistoryEntityLookup,
} from "../src/modules/catalog/catalog-history-entity-lookup.js";
import {
  type CatalogChangeLogReadRepository,
  CatalogChangeLogReadService,
} from "../src/modules/catalog-change-log/catalog-change-log-read.service.js";
import type {
  ChangeLogCursor,
  ChangeLogEntry,
} from "../src/modules/catalog-change-log/catalog-change-log-read.types.js";
import { createServer } from "../src/server/create-server.js";

export const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
export const ACTOR_SLUG = "test-admin";
export const PRODUCT_ID = "22222222-2222-4222-8222-222222222221";
export const VARIANT_1_ID = "22222222-2222-4222-8222-222222222231";
export const PRODUCT_SLUG = "widget";
export const VARIANT_1_SLUG = "widget-v1";
export const NOW = new Date("2026-05-02T12:00:00.000Z");

const SLUG_TO_ID: Record<CatalogHistoryEntityKind, Record<string, string>> = {
  catalog_product: { [PRODUCT_SLUG]: PRODUCT_ID },
  product_variant: { [VARIANT_1_SLUG]: VARIANT_1_ID },
  catalog_brand: {},
  catalog_category: {},
};

class StubLookup implements CatalogHistoryEntityLookup {
  async findIdBySlug(input: {
    kind: CatalogHistoryEntityKind;
    slug: string;
  }): Promise<string | null> {
    return SLUG_TO_ID[input.kind]?.[input.slug] ?? null;
  }
}

const ROW_ENTITY_IDS = new Map<string, string>();
const ROW_PARENT_ENTITY_IDS = new Map<string, string | null>();

function rowEntityId(row: ChangeLogEntry): string {
  return ROW_ENTITY_IDS.get(row.id) ?? "";
}

function rowParentEntityId(row: ChangeLogEntry): string | null {
  return ROW_PARENT_ENTITY_IDS.get(row.id) ?? null;
}

class FakeRepo implements CatalogChangeLogReadRepository {
  constructor(public rows: ChangeLogEntry[]) {}

  private filterAndPage(
    matches: (row: ChangeLogEntry) => boolean,
    cursor: ChangeLogCursor | null,
    limit: number,
  ): ChangeLogEntry[] {
    let candidates = this.rows.filter(matches);
    candidates = sortByOccurredAtIdDesc(candidates);
    if (cursor) {
      candidates = candidates.filter((row) =>
        isStrictlyAfterCursor(row, cursor),
      );
    }
    return candidates.slice(0, limit);
  }

  async findByEntity(input: {
    entityType: ChangeLogEntry["entityType"];
    entityId: string;
    cursor: ChangeLogCursor | null;
    limit: number;
  }): Promise<ChangeLogEntry[]> {
    return this.filterAndPage(
      (row) =>
        row.entityType === input.entityType &&
        rowEntityId(row) === input.entityId,
      input.cursor,
      input.limit,
    );
  }

  async findByEntityOrParent(input: {
    entityType: ChangeLogEntry["entityType"];
    entityId: string;
    cursor: ChangeLogCursor | null;
    limit: number;
  }): Promise<ChangeLogEntry[]> {
    return this.filterAndPage(
      (row) =>
        (row.entityType === input.entityType &&
          rowEntityId(row) === input.entityId) ||
        (row.parentEntityType === input.entityType &&
          rowParentEntityId(row) === input.entityId),
      input.cursor,
      input.limit,
    );
  }
}

export function makeRow(input: {
  id: string;
  entityType: ChangeLogEntry["entityType"];
  entityId: string;
  entityRef: string;
  parentEntityType?: ChangeLogEntry["parentEntityType"];
  parentEntityId?: string | null;
  parentEntityRef?: string | null;
  operation: ChangeLogEntry["operation"];
  occurredAt: Date;
}): ChangeLogEntry {
  ROW_ENTITY_IDS.set(input.id, input.entityId);
  ROW_PARENT_ENTITY_IDS.set(input.id, input.parentEntityId ?? null);
  return {
    id: input.id,
    entityType: input.entityType,
    entityRef: input.entityRef,
    parentEntityType: input.parentEntityType ?? null,
    parentEntityRef: input.parentEntityRef ?? null,
    operation: input.operation,
    changedFields: [],
    before: null,
    after: { name: "After" },
    actorSlug: ACTOR_SLUG,
    actorName: "Test Admin",
    occurredAt: input.occurredAt.toISOString(),
  };
}

function sortByOccurredAtIdDesc(rows: ChangeLogEntry[]): ChangeLogEntry[] {
  return [...rows].sort((a, b) => {
    const tA = new Date(a.occurredAt).getTime();
    const tB = new Date(b.occurredAt).getTime();
    if (tA !== tB) return tB - tA;
    if (a.id === b.id) return 0;
    return a.id < b.id ? 1 : -1;
  });
}

function isStrictlyAfterCursor(
  row: ChangeLogEntry,
  cursor: ChangeLogCursor,
): boolean {
  const rowTime = new Date(row.occurredAt).getTime();
  const cursorTime = cursor.occurredAt.getTime();
  if (rowTime !== cursorTime) return rowTime < cursorTime;
  return row.id < cursor.id;
}

export function authHeaders() {
  const { token } = issueAccessToken({
    expiresInSeconds: 900,
    now: NOW,
    secret: "development-access-secret",
    userId: ACTOR_ID,
    userSlug: ACTOR_SLUG,
  });
  return { authorization: `Bearer ${token}` };
}

export function buildServer(input: {
  rows: ChangeLogEntry[];
  hasPermission: boolean;
}) {
  const repo = new FakeRepo(input.rows);
  const service = new CatalogChangeLogReadService(repo);
  const lookup = new StubLookup();
  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return { userId: ACTOR_ID, userSlug: ACTOR_SLUG };
        },
      },
      permissionService: {
        async assertHasPermission() {
          if (!input.hasPermission) {
            throw new AppError({
              code: "forbidden",
              detail: "missing catalog.history.view",
              statusCode: 403,
              title: "Forbidden",
            });
          }
        },
      },
    },
    catalogHistory: {
      changeLogReadService: service,
      entityLookup: lookup,
    },
  });
}
