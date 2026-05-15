import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  stockBalances,
  stockMovements,
  stockTakeLines,
  stockTakeSessions,
} from "@shop/database";
import { PostgresStockTakeApplyRepository } from "../src/modules/stock/postgres-stock-take-apply.repository.js";

describe("PostgresStockTakeApplyRepository", () => {
  it("updates balances, records changed movements, and marks the session applied", async () => {
    const db = new FakeApplyDb();
    const repository = new PostgresStockTakeApplyRepository(db as never);

    const result = await repository.apply({
      appliedBy: "11111111-1111-4111-8111-111111111111",
      appliedBySlug: "manager",
      reference: "STKTAKE-2026-0001",
      rows: [
        {
          countedQuantity: 12,
          lineNumber: 1,
          note: "front shelf",
          rowNumber: 2,
          sku: "RICE-5KG",
        },
        {
          countedQuantity: 3,
          lineNumber: 2,
          note: null,
          rowNumber: 3,
          sku: "OIL-1L",
        },
      ],
    });

    assert.equal(result.status, "applied");
    assert.equal(result.summary.appliedRows, 2);
    assert.equal(result.summary.changedRows, 1);
    assert.equal(db.session.status, "applied");
    assert.equal(
      db.balances.find((row) => row.skuId === "sku-rice")?.onHandQuantity,
      12,
    );
    assert.equal(
      db.balances.find((row) => row.skuId === "sku-oil")?.onHandQuantity,
      3,
    );
    assert.equal(db.movements.length, 1);
    assert.equal(db.movements[0]?.sourceType, "stock_take");
    assert.equal(db.movements[0]?.sourceKey, "STKTAKE-2026-0001:1");
    assert.equal(db.lines[0]?.countedQuantity, 12);
    assert.equal(db.lines[1]?.appliedDelta, 0);
  });
});

class FakeApplyDb {
  readonly lines: FakeApplyLine[] = [
    {
      expectedOnHand: 10,
      lineNumber: 1,
      productName: "Rice",
      rowStatus: "catalog_sku",
      sku: "RICE-5KG",
      skuId: "sku-rice",
      variantName: "5kg",
    },
    {
      expectedOnHand: 3,
      lineNumber: 2,
      productName: "Oil",
      rowStatus: "catalog_sku",
      sku: "OIL-1L",
      skuId: "sku-oil",
      variantName: "1L",
    },
  ];
  readonly balances = [
    { onHandQuantity: 10, reservedQuantity: 2, skuId: "sku-rice" },
    { onHandQuantity: 3, reservedQuantity: 0, skuId: "sku-oil" },
  ];
  readonly movements: Array<{ sourceKey: string; sourceType: string }> = [];
  readonly session = {
    id: "session-id",
    locationId: "location-id",
    locationName: "Downtown Store",
    locationSlug: "downtown-store",
    reference: "STKTAKE-2026-0001",
    status: "generated",
  };

  async transaction<T>(callback: (tx: FakeApplyTx) => Promise<T>): Promise<T> {
    return callback(new FakeApplyTx(this));
  }
}

type FakeApplyLine = {
  appliedDelta?: number;
  countedQuantity?: number;
  expectedOnHand: number;
  lineNumber: number;
  productName: string;
  rowStatus: "catalog_sku";
  sku: string;
  skuId: string;
  variantName: string;
};

class FakeApplyTx {
  constructor(private readonly state: FakeApplyDb) {}

  select(_shape: unknown) {
    return new FakeSelectBuilder(this.state);
  }

  insert(table: unknown) {
    return new FakeInsertBuilder(this.state, table);
  }

  update(table: unknown) {
    return new FakeUpdateBuilder(this.state, table);
  }
}

class FakeSelectBuilder implements PromiseLike<unknown[]> {
  private table: unknown;

  constructor(private readonly state: FakeApplyDb) {}

  from(table: unknown) {
    this.table = table;
    return this;
  }

  innerJoin() {
    return this;
  }

  where() {
    return this;
  }

  orderBy() {
    return this;
  }

  for() {
    return this;
  }

  // biome-ignore lint/suspicious/noThenProperty: lets the fake be awaited like a Drizzle query builder.
  then<TResult1 = unknown[], TResult2 = never>(
    onfulfilled?:
      | ((value: unknown[]) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.rows()).then(onfulfilled, onrejected);
  }

  private rows() {
    if (this.table === stockTakeSessions) return [this.state.session];
    if (this.table === stockTakeLines) return this.state.lines;
    if (this.table === stockBalances) return this.state.balances;
    return [];
  }
}

class FakeInsertBuilder {
  constructor(
    private readonly state: FakeApplyDb,
    private readonly table: unknown,
  ) {}

  values(values: unknown) {
    if (this.table === stockMovements) {
      this.state.movements.push(
        values as { sourceKey: string; sourceType: string },
      );
    }
    return this;
  }

  async onConflictDoNothing() {
    return [];
  }
}

class FakeUpdateBuilder {
  private valuesToSet: Record<string, unknown> = {};

  constructor(
    private readonly state: FakeApplyDb,
    private readonly table: unknown,
  ) {}

  set(values: Record<string, unknown>) {
    this.valuesToSet = values;
    return this;
  }

  async where() {
    if (this.table === stockTakeLines) {
      const line = this.state.lines.find(
        (row) =>
          row.lineNumber === (this.valuesToSet.appliedDelta === 2 ? 1 : 2),
      );
      Object.assign(line ?? {}, this.valuesToSet);
    }
    if (this.table === stockBalances) {
      const balance = this.state.balances.find(
        (row) => row.skuId === "sku-rice",
      );
      Object.assign(balance ?? {}, this.valuesToSet);
    }
    if (this.table === stockTakeSessions)
      Object.assign(this.state.session, this.valuesToSet);
    return [];
  }
}
