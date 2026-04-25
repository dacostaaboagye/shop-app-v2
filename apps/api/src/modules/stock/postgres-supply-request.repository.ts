import { stockSupplyRequests } from "@shop/database";
import { and, eq, or } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import {
  countSupplyRequests,
  formatRequesterName,
  inArrayCondition,
  loadSupplyRequestDecorations,
} from "./postgres-supply-request.repository-support.js";
import {
  findGtnById,
  findGtnByReference,
  findGtnBySupplyRequest,
  findGtnReferenceForRequest,
  findTransferReferenceForRequest,
} from "./postgres-supply-request-gtn.repository.js";

export type {
  GtnRow,
  SupplyRequestRow,
} from "./postgres-supply-request-mappers.js";

import { toSupplyRequestRow } from "./postgres-supply-request-mappers.js";

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
    const { sourceReservationStatusByRequestId } =
      await loadSupplyRequestDecorations(this.db, [row.id]);
    const [gtnReference, transferReference] = await Promise.all([
      findGtnReferenceForRequest(this.db, row.id, row.status),
      findTransferReferenceForRequest(this.db, row.id),
    ]);

    return toSupplyRequestRow(
      row,
      requesterName,
      row.requester?.email ?? null,
      row.location?.name ?? null,
      row.sourceLocation?.name ?? null,
      transferReference,
      sourceReservationStatusByRequestId.get(row.id) ?? null,
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

    const total = await countSupplyRequests(this.db, conditions);
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
    const supplyRequestIds = rows.map((row) => row.id);
    const {
      gtnReferenceBySupplyRequestId,
      transferReferenceBySupplyRequestId,
      sourceReservationStatusByRequestId,
    } = await loadSupplyRequestDecorations(this.db, supplyRequestIds);

    return {
      items: rows.map((row) =>
        toSupplyRequestRow(
          row,
          null,
          null,
          row.location?.name ?? null,
          row.sourceLocation?.name ?? null,
          transferReferenceBySupplyRequestId.get(row.id) ?? null,
          sourceReservationStatusByRequestId.get(row.id) ?? null,
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

    const total = await countSupplyRequests(this.db, conditions);
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
    const supplyRequestIds = rows.map((row) => row.id);
    const {
      gtnReferenceBySupplyRequestId,
      transferReferenceBySupplyRequestId,
      sourceReservationStatusByRequestId,
    } = await loadSupplyRequestDecorations(this.db, supplyRequestIds);

    return {
      items: rows.map((row) =>
        toSupplyRequestRow(
          row,
          formatRequesterName(row.requester),
          row.requester?.email ?? null,
          row.location?.name ?? null,
          row.sourceLocation?.name ?? null,
          transferReferenceBySupplyRequestId.get(row.id) ?? null,
          sourceReservationStatusByRequestId.get(row.id) ?? null,
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
    return this.listBySourceLocations({
      page: input.page,
      pageSize: input.pageSize,
      sourceLocationIds: [input.sourceLocationId],
      ...(input.status ? { status: input.status } : {}),
    });
  }

  async listBySourceLocations(input: {
    page: number;
    pageSize: number;
    sourceLocationIds: string[];
    status?: string;
  }) {
    if (input.sourceLocationIds.length === 0) {
      return { items: [], total: 0 };
    }

    const conditions = [
      inArrayCondition(
        stockSupplyRequests.sourceLocationId,
        input.sourceLocationIds,
      ),
    ];
    if (input.status) {
      conditions.push(eq(stockSupplyRequests.status, input.status));
    }

    const total = await countSupplyRequests(this.db, conditions);
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
    const supplyRequestIds = rows.map((row) => row.id);
    const {
      gtnReferenceBySupplyRequestId,
      transferReferenceBySupplyRequestId,
      sourceReservationStatusByRequestId,
    } = await loadSupplyRequestDecorations(this.db, supplyRequestIds);

    return {
      items: rows.map((row) => {
        return toSupplyRequestRow(
          row,
          formatRequesterName(row.requester),
          row.requester?.email ?? null,
          row.location?.name ?? null,
          row.sourceLocation?.name ?? null,
          transferReferenceBySupplyRequestId.get(row.id) ?? null,
          sourceReservationStatusByRequestId.get(row.id) ?? null,
          gtnReferenceBySupplyRequestId.get(row.id) ?? null,
        );
      }),
      total,
    };
  }

  async findGtnBySupplyRequest(supplyRequestId: string) {
    return findGtnBySupplyRequest(this.db, supplyRequestId);
  }

  async findGtnById(id: string) {
    return findGtnById(this.db, id);
  }

  async findGtnByReference(reference: string) {
    return findGtnByReference(this.db, reference);
  }
}
