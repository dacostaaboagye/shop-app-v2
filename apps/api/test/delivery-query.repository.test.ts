import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampDeliveryListLimit,
  PostgresDeliveryQueryRepository,
  resolveActiveAgentStatuses,
} from "../src/modules/deliveries/postgres-delivery-query.repository.js";

const DELIVERY_ID = "66666666-6666-4666-8666-666666666666";
const DELIVERY_REFERENCE = "DLV-00001";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const AGENT_USER_ID = "77777777-7777-4777-8777-777777777777";
const SKU_ID = "44444444-4444-4444-8444-444444444444";
const DRIZZLE_NAME = Symbol.for("drizzle:Name");

describe("PostgresDeliveryQueryRepository", () => {
  it("returns null when findById has no matching delivery", async () => {
    const db = new FakeDeliveryQueryDb({ deliveryRows: [] });
    const repository = new PostgresDeliveryQueryRepository(db as never);

    const result = await repository.findById(DELIVERY_ID);

    assert.equal(result, null);
    assert.deepEqual(
      db.calls.map((call) => call.table),
      ["deliveries", "deliveries"],
    );
  });

  it("returns a delivery record with attached items", async () => {
    const db = new FakeDeliveryQueryDb({
      deliveryRows: [deliveryRow()],
      itemRows: [deliveryItemRow()],
    });
    const repository = new PostgresDeliveryQueryRepository(db as never);

    const result = await repository.findById(DELIVERY_ID);

    assert.equal(result?.deliveryId, DELIVERY_ID);
    assert.equal(result?.items[0]?.skuId, SKU_ID);
    assert.deepEqual(
      db.calls.map((call) => call.table),
      ["deliveries", "deliveries", "delivery_items", "delivery_items"],
    );
  });

  it("applies default and max list limits", async () => {
    const db = new FakeDeliveryQueryDb({ deliveryRows: [deliveryRow()] });
    const repository = new PostgresDeliveryQueryRepository(db as never);

    await repository.listByLocation({ locationId: LOCATION_ID });
    await repository.listByLocation({
      filters: { limit: 500 },
      locationId: LOCATION_ID,
    });

    assert.deepEqual(
      db.calls
        .filter((call) => call.table === "deliveries" && call.limit)
        .map((call) => call.limit),
      [50, 200],
    );
  });

  it("keeps agent lists to active assigned workload", async () => {
    assert.deepEqual(resolveActiveAgentStatuses(undefined), [
      "assigned",
      "in_transit",
    ]);
    assert.deepEqual(resolveActiveAgentStatuses({ status: ["completed"] }), []);
    assert.deepEqual(
      resolveActiveAgentStatuses({ status: ["assigned", "completed"] }),
      ["assigned"],
    );

    const db = new FakeDeliveryQueryDb();
    const repository = new PostgresDeliveryQueryRepository(db as never);

    const result = await repository.listByAgent({
      agentUserId: AGENT_USER_ID,
      filters: { status: ["completed"] },
    });

    assert.deepEqual(result, []);
    assert.deepEqual(db.calls, []);
  });

  it("reports SKU delivery history through the delivery-owned port", async () => {
    const db = new FakeDeliveryQueryDb({ skuHistoryCount: 1 });
    const repository = new PostgresDeliveryQueryRepository(db as never);

    const result = await repository.hasSkuHistory(SKU_ID);

    assert.equal(result, true);
    assert.equal(db.calls[0]?.table, "delivery_items");
  });
});

describe("delivery query limit normalization", () => {
  it("normalizes missing, invalid, and oversized limits", () => {
    assert.equal(clampDeliveryListLimit(undefined), 50);
    assert.equal(clampDeliveryListLimit({ limit: 0 }), 50);
    assert.equal(clampDeliveryListLimit({ limit: -1 }), 50);
    assert.equal(clampDeliveryListLimit({ limit: 25 }), 25);
    assert.equal(clampDeliveryListLimit({ limit: 500 }), 200);
  });
});

type QueryCall = {
  limit?: number;
  orderBy?: boolean;
  table: string;
  where?: boolean;
};

class FakeDeliveryQueryDb {
  readonly calls: QueryCall[] = [];
  private readonly deliveryRows: unknown[];
  private readonly itemRows: unknown[];
  private readonly skuHistoryCount: number;

  constructor(
    input: {
      deliveryRows?: unknown[];
      itemRows?: unknown[];
      skuHistoryCount?: number;
    } = {},
  ) {
    this.deliveryRows = input.deliveryRows ?? [];
    this.itemRows = input.itemRows ?? [];
    this.skuHistoryCount = input.skuHistoryCount ?? 0;
  }

  select(shape?: Record<string, unknown>) {
    return {
      from: (table: unknown) => {
        const call: QueryCall = { table: tableName(table) };
        this.calls.push(call);
        const rows =
          call.table === "deliveries"
            ? this.deliveryRows
            : rowsForDeliveryItems(shape, this.itemRows, this.skuHistoryCount);
        return queryBuilder(call, rows);
      },
    };
  }
}

function queryBuilder(call: QueryCall, rows: unknown[]) {
  return {
    limit(value: number) {
      call.limit = value;
      return this;
    },
    orderBy() {
      call.orderBy = true;
      return this;
    },
    // biome-ignore lint/suspicious/noThenProperty: lets the drizzle-shaped fake be awaited like a query builder.
    then(
      resolve: (rows: unknown[]) => unknown,
      reject: (error: Error) => void,
    ) {
      return Promise.resolve(rows).then(resolve, reject);
    },
    where() {
      call.where = true;
      return this;
    },
  };
}

function rowsForDeliveryItems(
  shape: Record<string, unknown> | undefined,
  itemRows: unknown[],
  skuHistoryCount: number,
) {
  return shape && "count" in shape ? [{ count: skuHistoryCount }] : itemRows;
}

function tableName(table: unknown): string {
  const namedTable = table as { [DRIZZLE_NAME]?: string };
  return namedTable[DRIZZLE_NAME] ?? "unknown";
}

function deliveryRow(overrides: Record<string, unknown> = {}) {
  return {
    assignedAt: new Date("2026-05-01T10:00:00.000Z"),
    assignedBy: "11111111-1111-4111-8111-111111111111",
    assignedUserId: AGENT_USER_ID,
    cancellationReason: null,
    cancelledAt: null,
    cancelledBy: null,
    completedAt: null,
    completedBy: null,
    createdAt: new Date("2026-05-01T09:00:00.000Z"),
    createdBy: "11111111-1111-4111-8111-111111111111",
    destinationKind: "location",
    destinationLocationId: "33333333-3333-4333-8333-333333333333",
    destinationSnapshot: null,
    dispatchedAt: null,
    dispatchedBy: null,
    id: DELIVERY_ID,
    originLocationId: LOCATION_ID,
    reference: DELIVERY_REFERENCE,
    sourceReference: "TRF-2026-000001",
    sourceType: "transfer",
    status: "assigned",
    updatedAt: new Date("2026-05-01T09:00:00.000Z"),
    ...overrides,
  };
}

function deliveryItemRow() {
  return {
    createdAt: new Date("2026-05-01T09:00:00.000Z"),
    deliveryId: DELIVERY_ID,
    id: "99999999-9999-4999-8999-999999999999",
    itemReference: "DEL-20260501-1",
    quantity: 1,
    skuId: SKU_ID,
    updatedAt: new Date("2026-05-01T09:00:00.000Z"),
  };
}
