import { stockSupplyRequests, users, locations } from "@shop/database";
import { and, desc, eq, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export type SupplyRequestRow = {
  id: string;
  reference: string;

  requesterId: string;
  requesterName: string | null;
  requesterEmail: string | null;

  locationId: string;
  locationName: string | null;

  sourceLocationId: string;
  sourceLocationName: string | null;

  skuId: string;
  skuSnapshot: { sku: string; productName: string; variantName: string };

  requestedQuantity: number;
  approvedQuantity: number | null;

  status: string;
  notes: string | null;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;

  dispatchedBy: string | null;
  dispatchedAt: Date | null;
  receivedAt: Date | null;

  gtnReference: string | null;

  createdAt: Date;
};

export type GtnRow = {
  id: string;
  reference: string;
  supplyRequestId: string;
  supplyRequestReference: string;
  sourceLocationId: string;
  sourceLocationName: string | null;
  destinationLocationId: string;
  destinationLocationName: string | null;
  skuId: string;
  skuSnapshot: { sku: string; productName: string; variantName: string };
  quantity: number;
  status: string;
  dispatchedBy: string;
  dispatchedByName: string | null;
  dispatchedAt: Date;
  receivedBy: string | null;
  receivedByName: string | null;
  receivedAt: Date | null;
  notes: string | null;
  createdAt: Date;
};

type SkuSnapshot = { sku: string; productName: string; variantName: string };

export class PostgresSupplyRequestRepository {
  constructor(private readonly db: ApiDatabase) {}

  async create(input: {
    reference: string;
    requesterId: string;
    locationId: string;
    sourceLocationId: string;
    skuId: string;
    skuSnapshot: SkuSnapshot;
    requestedQuantity: number;
    notes: string | null;
  }): Promise<SupplyRequestRow> {
    const [row] = await this.db
      .insert(stockSupplyRequests)
      .values({
        reference: input.reference,
        requesterId: input.requesterId,
        locationId: input.locationId,
        sourceLocationId: input.sourceLocationId,
        skuId: input.skuId,
        skuSnapshot: input.skuSnapshot,
        requestedQuantity: input.requestedQuantity,
        notes: input.notes,
        status: "pending",
      })
      .returning();

    if (!row) throw new Error("Failed to create supply request.");
    return toRow(row, null, null, null, null, null);
  }

  async findById(id: string): Promise<SupplyRequestRow | null> {
    const row = await this.db.query.stockSupplyRequests.findFirst({
      where: (t, { eq }) => eq(t.id, id),
      with: {
        requester: { columns: { firstName: true, lastName: true, email: true } },
        location: { columns: { name: true } },
        sourceLocation: { columns: { name: true } },
      },
    });
    if (!row) return null;

    const requesterName = row.requester
      ? `${row.requester.firstName} ${row.requester.lastName}`.trim()
      : null;

    // Look up GTN if dispatched
    let gtnReference: string | null = null;
    if (row.status === "dispatched" || row.status === "received") {
      const gtn = await this.db.query.goodsTransferNotes.findFirst({
        where: (t, { eq }) => eq(t.supplyRequestId, id),
        columns: { reference: true },
      });
      gtnReference = gtn?.reference ?? null;
    }

    return toRow(
      row,
      requesterName,
      row.requester?.email ?? null,
      row.location?.name ?? null,
      row.sourceLocation?.name ?? null,
      gtnReference,
    );
  }

  async listByRequester(input: {
    requesterId: string;
    page: number;
    pageSize: number;
    status?: string;
  }): Promise<{ items: SupplyRequestRow[]; total: number }> {
    const conditions = [eq(stockSupplyRequests.requesterId, input.requesterId)];
    if (input.status) {
      conditions.push(eq(stockSupplyRequests.status, input.status));
    }

    const countRows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(stockSupplyRequests)
      .where(and(...conditions));

    const rows = await this.db
      .select({
        id: stockSupplyRequests.id,
        reference: stockSupplyRequests.reference,
        requesterId: stockSupplyRequests.requesterId,
        locationId: stockSupplyRequests.locationId,
        sourceLocationId: stockSupplyRequests.sourceLocationId,
        skuId: stockSupplyRequests.skuId,
        skuSnapshot: stockSupplyRequests.skuSnapshot,
        requestedQuantity: stockSupplyRequests.requestedQuantity,
        approvedQuantity: stockSupplyRequests.approvedQuantity,
        status: stockSupplyRequests.status,
        notes: stockSupplyRequests.notes,
        resolutionNotes: stockSupplyRequests.resolutionNotes,
        resolvedBy: stockSupplyRequests.resolvedBy,
        resolvedAt: stockSupplyRequests.resolvedAt,
        dispatchedBy: stockSupplyRequests.dispatchedBy,
        dispatchedAt: stockSupplyRequests.dispatchedAt,
        receivedAt: stockSupplyRequests.receivedAt,
        createdAt: stockSupplyRequests.createdAt,
        locationName: locations.name,
      })
      .from(stockSupplyRequests)
      .leftJoin(locations, eq(stockSupplyRequests.locationId, locations.id))
      .where(and(...conditions))
      .orderBy(desc(stockSupplyRequests.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize);

    return {
      items: rows.map((r) =>
        toRow(r, null, null, r.locationName ?? null, null, null),
      ),
      total: countRows[0]?.count ?? 0,
    };
  }

  async listBySourceLocation(input: {
    sourceLocationId: string;
    page: number;
    pageSize: number;
    status?: string;
  }): Promise<{ items: SupplyRequestRow[]; total: number }> {
    const conditions = [
      eq(stockSupplyRequests.sourceLocationId, input.sourceLocationId),
    ];
    if (input.status) {
      conditions.push(eq(stockSupplyRequests.status, input.status));
    }

    const countRows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(stockSupplyRequests)
      .where(and(...conditions));

    const rows = await this.db
      .select({
        id: stockSupplyRequests.id,
        reference: stockSupplyRequests.reference,
        requesterId: stockSupplyRequests.requesterId,
        locationId: stockSupplyRequests.locationId,
        sourceLocationId: stockSupplyRequests.sourceLocationId,
        skuId: stockSupplyRequests.skuId,
        skuSnapshot: stockSupplyRequests.skuSnapshot,
        requestedQuantity: stockSupplyRequests.requestedQuantity,
        approvedQuantity: stockSupplyRequests.approvedQuantity,
        status: stockSupplyRequests.status,
        notes: stockSupplyRequests.notes,
        resolutionNotes: stockSupplyRequests.resolutionNotes,
        resolvedBy: stockSupplyRequests.resolvedBy,
        resolvedAt: stockSupplyRequests.resolvedAt,
        dispatchedBy: stockSupplyRequests.dispatchedBy,
        dispatchedAt: stockSupplyRequests.dispatchedAt,
        receivedAt: stockSupplyRequests.receivedAt,
        createdAt: stockSupplyRequests.createdAt,
        requesterFirstName: users.firstName,
        requesterLastName: users.lastName,
        requesterEmail: users.email,
      })
      .from(stockSupplyRequests)
      .leftJoin(users, eq(stockSupplyRequests.requesterId, users.id))
      .where(and(...conditions))
      .orderBy(desc(stockSupplyRequests.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize);

    return {
      items: rows.map((r) => {
        const requesterName =
          r.requesterFirstName && r.requesterLastName
            ? `${r.requesterFirstName} ${r.requesterLastName}`.trim()
            : null;
        return toRow(r, requesterName, r.requesterEmail ?? null, null, null, null);
      }),
      total: countRows[0]?.count ?? 0,
    };
  }

  async approve(input: {
    id: string;
    approvedQuantity: number;
    resolutionNotes: string | null;
    resolvedBy: string;
    now: Date;
  }): Promise<SupplyRequestRow | null> {
    const [row] = await this.db
      .update(stockSupplyRequests)
      .set({
        status: "approved",
        approvedQuantity: input.approvedQuantity,
        resolutionNotes: input.resolutionNotes,
        resolvedBy: input.resolvedBy,
        resolvedAt: input.now,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(stockSupplyRequests.id, input.id),
          eq(stockSupplyRequests.status, "pending"),
        ),
      )
      .returning();

    return row ? toRow(row, null, null, null, null, null) : null;
  }

  async reject(input: {
    id: string;
    resolutionNotes: string | null;
    resolvedBy: string;
    now: Date;
  }): Promise<SupplyRequestRow | null> {
    const [row] = await this.db
      .update(stockSupplyRequests)
      .set({
        status: "rejected",
        resolutionNotes: input.resolutionNotes,
        resolvedBy: input.resolvedBy,
        resolvedAt: input.now,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(stockSupplyRequests.id, input.id),
          eq(stockSupplyRequests.status, "pending"),
        ),
      )
      .returning();

    return row ? toRow(row, null, null, null, null, null) : null;
  }

  async cancel(input: {
    id: string;
    requesterId: string;
    now: Date;
  }): Promise<SupplyRequestRow | null> {
    const [row] = await this.db
      .update(stockSupplyRequests)
      .set({ status: "cancelled", updatedAt: input.now })
      .where(
        and(
          eq(stockSupplyRequests.id, input.id),
          eq(stockSupplyRequests.requesterId, input.requesterId),
          sql`${stockSupplyRequests.status} IN ('pending', 'approved')`,
        ),
      )
      .returning();

    return row ? toRow(row, null, null, null, null, null) : null;
  }

  async findGtnBySupplyRequest(supplyRequestId: string): Promise<GtnRow | null> {
    const gtn = await this.db.query.goodsTransferNotes.findFirst({
      where: (t, { eq }) => eq(t.supplyRequestId, supplyRequestId),
      with: {
        supplyRequest: { columns: { reference: true } },
        sourceLocation: { columns: { name: true } },
        destinationLocation: { columns: { name: true } },
        dispatchedByUser: { columns: { firstName: true, lastName: true } },
        receivedByUser: { columns: { firstName: true, lastName: true } },
      },
    });
    if (!gtn) return null;
    return toGtnRow(gtn);
  }

  async findGtnById(id: string): Promise<GtnRow | null> {
    const gtn = await this.db.query.goodsTransferNotes.findFirst({
      where: (t, { eq }) => eq(t.id, id),
      with: {
        supplyRequest: { columns: { reference: true } },
        sourceLocation: { columns: { name: true } },
        destinationLocation: { columns: { name: true } },
        dispatchedByUser: { columns: { firstName: true, lastName: true } },
        receivedByUser: { columns: { firstName: true, lastName: true } },
      },
    });
    if (!gtn) return null;
    return toGtnRow(gtn);
  }
}

function toRow(
  row: {
    id: string;
    reference: string;
    requesterId: string;
    locationId: string;
    sourceLocationId: string;
    skuId: string;
    skuSnapshot: unknown;
    requestedQuantity: number;
    approvedQuantity?: number | null;
    status: string;
    notes: string | null;
    resolutionNotes: string | null;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    dispatchedBy?: string | null;
    dispatchedAt?: Date | null;
    receivedAt?: Date | null;
    createdAt: Date;
  },
  requesterName: string | null,
  requesterEmail: string | null,
  locationName: string | null,
  sourceLocationName: string | null,
  gtnReference: string | null,
): SupplyRequestRow {
  return {
    id: row.id,
    reference: row.reference,
    requesterId: row.requesterId,
    requesterName,
    requesterEmail,
    locationId: row.locationId,
    locationName,
    sourceLocationId: row.sourceLocationId,
    sourceLocationName,
    skuId: row.skuId,
    skuSnapshot: row.skuSnapshot as SkuSnapshot,
    requestedQuantity: row.requestedQuantity,
    approvedQuantity: row.approvedQuantity ?? null,
    status: row.status,
    notes: row.notes,
    resolutionNotes: row.resolutionNotes,
    resolvedBy: row.resolvedBy,
    resolvedAt: row.resolvedAt,
    dispatchedBy: row.dispatchedBy ?? null,
    dispatchedAt: row.dispatchedAt ?? null,
    receivedAt: row.receivedAt ?? null,
    gtnReference,
    createdAt: row.createdAt,
  };
}

function toGtnRow(gtn: {
  id: string;
  reference: string;
  supplyRequestId: string;
  skuId: string;
  skuSnapshot: unknown;
  quantity: number;
  status: string;
  dispatchedBy: string;
  dispatchedAt: Date;
  receivedBy: string | null;
  receivedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  sourceLocationId: string;
  destinationLocationId: string;
  supplyRequest: { reference: string } | null;
  sourceLocation: { name: string } | null;
  destinationLocation: { name: string } | null;
  dispatchedByUser: { firstName: string; lastName: string } | null;
  receivedByUser: { firstName: string; lastName: string } | null;
}): GtnRow {
  return {
    id: gtn.id,
    reference: gtn.reference,
    supplyRequestId: gtn.supplyRequestId,
    supplyRequestReference: gtn.supplyRequest?.reference ?? "",
    sourceLocationId: gtn.sourceLocationId,
    sourceLocationName: gtn.sourceLocation?.name ?? null,
    destinationLocationId: gtn.destinationLocationId,
    destinationLocationName: gtn.destinationLocation?.name ?? null,
    skuId: gtn.skuId,
    skuSnapshot: gtn.skuSnapshot as SkuSnapshot,
    quantity: gtn.quantity,
    status: gtn.status,
    dispatchedBy: gtn.dispatchedBy,
    dispatchedByName: gtn.dispatchedByUser
      ? `${gtn.dispatchedByUser.firstName} ${gtn.dispatchedByUser.lastName}`.trim()
      : null,
    dispatchedAt: gtn.dispatchedAt,
    receivedBy: gtn.receivedBy,
    receivedByName: gtn.receivedByUser
      ? `${gtn.receivedByUser.firstName} ${gtn.receivedByUser.lastName}`.trim()
      : null,
    receivedAt: gtn.receivedAt,
    notes: gtn.notes,
    createdAt: gtn.createdAt,
  };
}
