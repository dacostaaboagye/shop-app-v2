import { stockSupplyRequests } from "@shop/database";
import { and, eq, or, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import {
  loadGtnReferenceMap,
  toGtnRow,
  toSupplyRequestRow,
} from "./postgres-supply-request-mappers.js";

export type {
  GtnRow,
  SupplyRequestRow,
} from "./postgres-supply-request-mappers.js";

export class PostgresSupplyRequestRepository {
  constructor(private readonly db: ApiDatabase) {}

  async findById(id: string) {
    const row = await this.db.query.stockSupplyRequests.findFirst({
      where: (table, { eq }) => eq(table.id, id),
      with: {
        location: { columns: { name: true } },
        requester: {
          columns: { email: true, firstName: true, lastName: true },
        },
        sourceLocation: { columns: { name: true } },
      },
    });
    if (!row) return null;

    const requesterName = row.requester
      ? `${row.requester.firstName} ${row.requester.lastName}`.trim()
      : null;
    const gtnReference = await this.findGtnReferenceForRequest(
      row.id,
      row.status,
    );

    return toSupplyRequestRow(
      row,
      requesterName,
      row.requester?.email ?? null,
      row.location?.name ?? null,
      row.sourceLocation?.name ?? null,
      gtnReference,
    );
  }

  async listByRequester(input: {
    page: number;
    pageSize: number;
    requesterId: string;
    status?: string;
  }) {
    const conditions = [eq(stockSupplyRequests.requesterId, input.requesterId)];
    if (input.status) {
      conditions.push(eq(stockSupplyRequests.status, input.status));
    }

    const total = await this.countRequests(conditions);
    const rows = await this.db.query.stockSupplyRequests.findMany({
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      where: and(...conditions),
      with: {
        location: { columns: { name: true } },
        sourceLocation: { columns: { name: true } },
      },
    });
    const gtnReferenceBySupplyRequestId = await loadGtnReferenceMap(
      this.db,
      rows.map((row) => row.id),
    );

    return {
      items: rows.map((row) =>
        toSupplyRequestRow(
          row,
          null,
          null,
          row.location?.name ?? null,
          row.sourceLocation?.name ?? null,
          gtnReferenceBySupplyRequestId.get(row.id) ?? null,
        ),
      ),
      total,
    };
  }

  async listByLocation(input: {
    locationId: string;
    page: number;
    pageSize: number;
    status?: string;
  }) {
    const locationCondition = or(
      eq(stockSupplyRequests.locationId, input.locationId),
      eq(stockSupplyRequests.sourceLocationId, input.locationId),
    );
    if (!locationCondition) {
      throw new Error("Unable to build supply request location condition.");
    }
    const conditions = [locationCondition];
    if (input.status) {
      conditions.push(eq(stockSupplyRequests.status, input.status));
    }

    const total = await this.countRequests(conditions);
    const rows = await this.db.query.stockSupplyRequests.findMany({
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      where: and(...conditions),
      with: {
        location: { columns: { name: true } },
        requester: {
          columns: { email: true, firstName: true, lastName: true },
        },
        sourceLocation: { columns: { name: true } },
      },
    });
    const gtnReferenceBySupplyRequestId = await loadGtnReferenceMap(
      this.db,
      rows.map((row) => row.id),
    );

    return {
      items: rows.map((row) =>
        toSupplyRequestRow(
          row,
          formatRequesterName(row.requester),
          row.requester?.email ?? null,
          row.location?.name ?? null,
          row.sourceLocation?.name ?? null,
          gtnReferenceBySupplyRequestId.get(row.id) ?? null,
        ),
      ),
      total,
    };
  }

  async listBySourceLocation(input: {
    page: number;
    pageSize: number;
    sourceLocationId: string;
    status?: string;
  }) {
    const conditions = [
      eq(stockSupplyRequests.sourceLocationId, input.sourceLocationId),
    ];
    if (input.status) {
      conditions.push(eq(stockSupplyRequests.status, input.status));
    }

    const total = await this.countRequests(conditions);
    const rows = await this.db.query.stockSupplyRequests.findMany({
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      where: and(...conditions),
      with: {
        location: { columns: { name: true } },
        requester: {
          columns: { email: true, firstName: true, lastName: true },
        },
        sourceLocation: { columns: { name: true } },
      },
    });
    const gtnReferenceBySupplyRequestId = await loadGtnReferenceMap(
      this.db,
      rows.map((row) => row.id),
    );

    return {
      items: rows.map((row) => {
        return toSupplyRequestRow(
          row,
          formatRequesterName(row.requester),
          row.requester?.email ?? null,
          row.location?.name ?? null,
          row.sourceLocation?.name ?? null,
          gtnReferenceBySupplyRequestId.get(row.id) ?? null,
        );
      }),
      total,
    };
  }

  async findGtnBySupplyRequest(supplyRequestId: string) {
    const gtn = await this.db.query.goodsTransferNotes.findFirst({
      where: (table, { eq }) => eq(table.supplyRequestId, supplyRequestId),
      with: gtnRelations,
    });
    return gtn ? toGtnRow(gtn) : null;
  }

  async findGtnById(id: string) {
    const gtn = await this.db.query.goodsTransferNotes.findFirst({
      where: (table, { eq }) => eq(table.id, id),
      with: gtnRelations,
    });
    return gtn ? toGtnRow(gtn) : null;
  }

  private async countRequests(conditions: ReturnType<typeof eq>[]) {
    const countRows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(stockSupplyRequests)
      .where(and(...conditions));

    return countRows[0]?.count ?? 0;
  }

  private async findGtnReferenceForRequest(id: string, status: string) {
    if (status !== "dispatched" && status !== "received") {
      return null;
    }

    const gtn = await this.db.query.goodsTransferNotes.findFirst({
      columns: { reference: true },
      where: (table, { eq }) => eq(table.supplyRequestId, id),
    });
    return gtn?.reference ?? null;
  }
}

const gtnRelations = {
  destinationLocation: { columns: { name: true } },
  dispatchedByUser: { columns: { firstName: true, lastName: true } },
  receivedByUser: { columns: { firstName: true, lastName: true } },
  sourceLocation: { columns: { name: true } },
  supplyRequest: { columns: { reference: true } },
} as const;

function formatRequesterName(
  requester: { firstName: string; lastName: string } | null,
) {
  return requester
    ? `${requester.firstName} ${requester.lastName}`.trim() || null
    : null;
}
