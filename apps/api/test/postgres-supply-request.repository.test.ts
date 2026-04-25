import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PostgresSupplyRequestRepository } from "../src/modules/stock/postgres-supply-request.repository.js";

describe("PostgresSupplyRequestRepository", () => {
  it("lists requester supply requests with both locations and GTN references", async () => {
    const row = buildSupplyRequestRow({
      location: { name: "Accra Mall" },
      sourceLocation: { name: "East Legon Warehouse" },
    });
    const { db, state } = createRepositoryDb({
      findManyRows: [row],
      selectResults: [
        [{ count: 1 }],
        [{ reference: "GTN-00001", supplyRequestId: row.id }],
        [{ reference: "TRF-00001", supplyRequestId: row.id }],
      ],
    });

    const repository = new PostgresSupplyRequestRepository(db as never);
    const result = await repository.listByRequester({
      page: 1,
      pageSize: 25,
      requesterId: row.requesterId,
    });

    assert.equal(result.total, 1);
    assert.equal(result.items[0]?.locationName, "Accra Mall");
    assert.equal(result.items[0]?.sourceLocationName, "East Legon Warehouse");
    assert.equal(result.items[0]?.gtnReference, "GTN-00001");
    assert.equal(result.items[0]?.transferReference, "TRF-00001");
    assert.deepEqual(state.findManyCalls[0]?.with, {
      location: { columns: { name: true } },
      sourceLocation: { columns: { name: true } },
    });
  });

  it("lists incoming supply requests with requester details, both locations, and GTN references", async () => {
    const row = buildSupplyRequestRow({
      location: { name: "Osu Flagship" },
      requester: {
        email: "jane@example.com",
        firstName: "Jane",
        lastName: "Worker",
      },
      sourceLocation: { name: "Airport Warehouse" },
    });
    const { db, state } = createRepositoryDb({
      findManyRows: [row],
      selectResults: [
        [{ count: 1 }],
        [{ reference: "GTN-00002", supplyRequestId: row.id }],
        [{ reference: "TRF-00002", supplyRequestId: row.id }],
      ],
    });

    const repository = new PostgresSupplyRequestRepository(db as never);
    const result = await repository.listBySourceLocation({
      page: 1,
      pageSize: 25,
      sourceLocationId: row.sourceLocationId,
    });

    assert.equal(result.total, 1);
    assert.equal(result.items[0]?.requesterName, "Jane Worker");
    assert.equal(result.items[0]?.requesterEmail, "jane@example.com");
    assert.equal(result.items[0]?.locationName, "Osu Flagship");
    assert.equal(result.items[0]?.sourceLocationName, "Airport Warehouse");
    assert.equal(result.items[0]?.gtnReference, "GTN-00002");
    assert.equal(result.items[0]?.transferReference, "TRF-00002");
    assert.deepEqual(state.findManyCalls[0]?.with, {
      requester: { columns: { email: true, firstName: true, lastName: true } },
      location: { columns: { name: true } },
      sourceLocation: { columns: { name: true } },
    });
  });
});

function createRepositoryDb(input: {
  findManyRows: unknown[];
  selectResults: unknown[];
}) {
  const selectQueue = [...input.selectResults];
  const state = { findManyCalls: [] as Record<string, unknown>[] };

  const db = {
    query: {
      stockSupplyRequests: {
        async findMany(options: Record<string, unknown>) {
          state.findManyCalls.push(options);
          return input.findManyRows;
        },
      },
    },
    select() {
      return {
        from() {
          return {
            async where() {
              const next = selectQueue.shift();
              if (next === undefined) {
                throw new Error("Unexpected select query.");
              }
              return next;
            },
          };
        },
      };
    },
  };

  return { db, state };
}

function buildSupplyRequestRow(input: {
  location: { name: string } | null;
  requester?: { firstName: string; lastName: string; email: string } | null;
  sourceLocation: { name: string } | null;
}) {
  return {
    approvedQuantity: 5,
    createdAt: new Date("2026-04-19T18:00:00.000Z"),
    dispatchedAt: new Date("2026-04-19T18:30:00.000Z"),
    dispatchedBy: "33333333-3333-4333-8333-333333333333",
    id: "11111111-1111-4111-8111-111111111111",
    location: input.location,
    locationId: "22222222-2222-4222-8222-222222222222",
    notes: "Please restock the front shelf.",
    receivedAt: null,
    reference: "SUP-00001",
    requester: input.requester ?? null,
    requesterId: "44444444-4444-4444-8444-444444444444",
    requestedQuantity: 6,
    resolutionNotes: "Approved for available stock.",
    resolvedAt: new Date("2026-04-19T18:10:00.000Z"),
    resolvedBy: "55555555-5555-4555-8555-555555555555",
    skuId: "66666666-6666-4666-8666-666666666666",
    skuSnapshot: {
      productName: "Omaya 1819 Backpack",
      sku: "OMA-1819-BLK",
      variantName: "Black",
    },
    sourceLocation: input.sourceLocation,
    sourceLocationId: "77777777-7777-4777-8777-777777777777",
    status: "dispatched",
  };
}
