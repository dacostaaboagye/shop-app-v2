import {
  deliveries,
  deliveryItems,
  goodsTransferNotes,
  stockBalances,
  stockMovements,
} from "@shop/database";

const NOW = new Date("2026-05-01T00:00:00.000Z");
const CREATED_BY = "11111111-1111-4111-8111-111111111111";
const SKU_ID = "22222222-2222-4222-8222-222222222222";
const ORIGIN_ID = "33333333-3333-4333-8333-333333333333";

type DeliveryRow = typeof deliveries.$inferSelect;
type DeliveryItemRow = typeof deliveryItems.$inferSelect;
type GtnRow = typeof goodsTransferNotes.$inferSelect;
type StockBalanceRow = typeof stockBalances.$inferSelect;
type StockMovementRow = typeof stockMovements.$inferSelect;

export class FakeDeliveryDatabase {
  failGtnInsert = false;
  failItemReference = false;
  failSourceUnique = false;
  sourceUniqueWinner: FakeDeliveryDatabase["state"] | null = null;
  state = {
    deliveries: [] as DeliveryRow[],
    gtns: [] as GtnRow[],
    items: [] as DeliveryItemRow[],
    movements: [] as StockMovementRow[],
    reservations: [] as unknown[],
    stockBalances: [] as StockBalanceRow[],
  };
  transactionCount = 0;

  async transaction<T>(callback: (tx: FakeDeliveryDatabase) => Promise<T>) {
    this.transactionCount += 1;
    const snapshot = cloneState(this.state);
    try {
      return await callback(this);
    } catch (error) {
      this.state = this.sourceUniqueWinner ?? snapshot;
      this.sourceUniqueWinner = null;
      throw error;
    }
  }

  failNextDeliverySourceUniqueWithWinner() {
    this.failSourceUnique = true;
    this.sourceUniqueWinner = {
      deliveries: [createDeliveryRow(defaultDeliveryInput())],
      gtns: [],
      items: [createDeliveryItemRow(defaultItemInput("DLI-WINNER"))],
      movements: [],
      reservations: [],
      stockBalances: [],
    };
  }

  failNextItemReferenceUnique() {
    this.failItemReference = true;
  }

  failNextGoodsTransferNoteInsert() {
    this.failGtnInsert = true;
  }

  seedStockBalance(input: {
    locationId: string;
    onHandQuantity: number;
    reservedQuantity?: number;
    skuId: string;
  }) {
    this.state.stockBalances.push(createStockBalanceRow(input));
  }

  seedExisting(sourceType: DeliveryRow["sourceType"], sourceReference: string) {
    this.state.deliveries.push(
      createDeliveryRow({
        ...defaultDeliveryInput(),
        sourceReference,
        sourceType,
      }),
    );
    this.state.items.push(
      createDeliveryItemRow(defaultItemInput("DLI-EXISTING")),
    );
  }

  select() {
    return {
      from: (table: unknown) => ({
        where: () => this.queryRowsFor(table),
      }),
    };
  }

  insert(table: unknown) {
    return {
      values: (input: Record<string, unknown>) => {
        if (table === goodsTransferNotes) {
          const rows = this.insertRow(table, input);
          return { returning: async () => rows };
        }
        return { returning: async () => this.insertRow(table, input) };
      },
    };
  }

  update(table: unknown) {
    return {
      set: (input: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            if (table === stockBalances) {
              const row = this.state.stockBalances[0];
              if (!row) return [];
              Object.assign(row, input);
              return [row];
            }
            throw new Error("Unexpected table update");
          },
        }),
      }),
    };
  }

  private rowsFor(table: unknown): unknown[] {
    if (table === deliveries) return this.state.deliveries;
    if (table === deliveryItems) return this.state.items;
    if (table === stockBalances) return this.state.stockBalances;
    if (table === stockMovements) return this.state.movements;
    if (table === goodsTransferNotes) return this.state.gtns;
    return [];
  }

  private get queryRowsFor() {
    return (table: unknown) => {
      const rows = this.rowsFor(table);
      if (table === deliveries || table === deliveryItems) {
        return Promise.resolve(rows);
      }
      return {
        for: async () => rows,
        limit: async () => rows,
      };
    };
  }

  private insertRow(table: unknown, input: Record<string, unknown>): unknown[] {
    if (table === deliveries) {
      if (this.failSourceUnique) {
        this.failSourceUnique = false;
        throw pgUnique("deliveries_source_unique");
      }
      const row = createDeliveryRow(input);
      this.state.deliveries.push(row);
      return [row];
    }
    if (table === deliveryItems) {
      if (this.failItemReference) {
        this.failItemReference = false;
        throw pgUnique("delivery_items_reference_unique");
      }
      const row = createDeliveryItemRow(input);
      this.state.items.push(row);
      return [row];
    }
    if (table === goodsTransferNotes) {
      if (this.failGtnInsert) {
        this.failGtnInsert = false;
        throw new Error("gtn failure");
      }
      const row = createGtnRow(input);
      this.state.gtns.push(row);
      return [row];
    }
    if (table === stockBalances) {
      const row = createStockBalanceRow(input);
      this.state.stockBalances.push(row);
      return [row];
    }
    if (table === stockMovements) {
      const row = createStockMovementRow(input);
      this.state.movements.push(row);
      return [row];
    }
    throw new Error("Unexpected table insert");
  }
}

function defaultDeliveryInput() {
  return {
    createdAt: NOW,
    createdBy: CREATED_BY,
    destinationKind: "external",
    destinationLocationId: null,
    destinationSnapshot: deliveryDestination(),
    originLocationId: ORIGIN_ID,
    reference: "DLV-00001",
    sourceReference: "INV-POS-0001",
    sourceType: "pos_sale",
  };
}

function defaultItemInput(itemReference: string) {
  return {
    createdAt: NOW,
    deliveryId: "44444444-4444-4444-8444-444444444444",
    itemReference,
    quantity: 1,
    skuId: SKU_ID,
  };
}

function cloneState(state: FakeDeliveryDatabase["state"]) {
  return {
    deliveries: [...state.deliveries],
    gtns: [...state.gtns],
    items: [...state.items],
    movements: [...state.movements],
    reservations: [...state.reservations],
    stockBalances: state.stockBalances.map((row) => ({ ...row })),
  };
}

function createDeliveryRow(input: Record<string, unknown>): DeliveryRow {
  return {
    assignedAt: null,
    assignedBy: null,
    assignedUserId: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    completedAt: null,
    completedBy: null,
    createdAt: input.createdAt as Date,
    createdBy: input.createdBy as string,
    destinationKind: input.destinationKind as string,
    destinationLocationId: input.destinationLocationId as string | null,
    destinationSnapshot: input.destinationSnapshot,
    dispatchedAt: null,
    dispatchedBy: null,
    id: "44444444-4444-4444-8444-444444444444",
    originLocationId: input.originLocationId as string,
    reference: (input.reference as string | undefined) ?? "DLV-00001",
    sourceReference: input.sourceReference as string,
    sourceType: input.sourceType as DeliveryRow["sourceType"],
    status: "draft",
    updatedAt: input.createdAt as Date,
  };
}

function createDeliveryItemRow(
  input: Record<string, unknown>,
): DeliveryItemRow {
  return {
    createdAt: input.createdAt as Date,
    deliveryId: input.deliveryId as string,
    id: "55555555-5555-4555-8555-555555555555",
    itemReference: input.itemReference as string,
    quantity: input.quantity as number,
    skuId: input.skuId as string,
    updatedAt: input.createdAt as Date,
  };
}

function createGtnRow(input: Record<string, unknown>): GtnRow {
  return {
    createdAt: input.createdAt as Date,
    destinationLocationId: input.destinationLocationId as string,
    dispatchedAt: input.dispatchedAt as Date,
    dispatchedBy: input.dispatchedBy as string,
    id: "99999999-9999-4999-8999-999999999999",
    notes: input.notes as string | null,
    quantity: input.quantity as number,
    receivedAt: null,
    receivedBy: null,
    reference: input.reference as string,
    skuId: input.skuId as string,
    skuSnapshot: input.skuSnapshot as GtnRow["skuSnapshot"],
    sourceLocationId: input.sourceLocationId as string,
    status: input.status as string,
    supplyRequestId: input.supplyRequestId as string,
    updatedAt: input.updatedAt as Date,
  };
}

function createStockBalanceRow(
  input: Record<string, unknown>,
): StockBalanceRow {
  return {
    createdAt: (input.createdAt as Date | undefined) ?? NOW,
    id: "88888888-8888-4888-8888-888888888888",
    locationId: input.locationId as string,
    onHandQuantity: input.onHandQuantity as number,
    reservedQuantity: (input.reservedQuantity as number | undefined) ?? 0,
    skuId: input.skuId as string,
    updatedAt: (input.updatedAt as Date | undefined) ?? NOW,
    updatedBy: (input.updatedBy as string | null | undefined) ?? null,
  };
}

function createStockMovementRow(
  input: Record<string, unknown>,
): StockMovementRow {
  return {
    createdAt: input.createdAt as Date,
    createdBy: (input.createdBy as string | null | undefined) ?? null,
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    locationId: input.locationId as string,
    movementType: input.movementType as StockMovementRow["movementType"],
    occurredAt: input.occurredAt as Date,
    quantityDelta: input.quantityDelta as number,
    skuId: input.skuId as string,
    sourceKey: input.sourceKey as string,
    sourceType: input.sourceType as string,
  };
}

function deliveryDestination() {
  return {
    addressLines: ["12 Market Street"],
    city: "Accra",
    contactEmail: null,
    contactName: "Adwoa Mensah",
    contactPhone: "+233200000000",
    countryCode: "GH",
    notes: null,
    postalCode: null,
    region: null,
  };
}

function pgUnique(constraint: string) {
  return Object.assign(
    new Error("duplicate key value violates unique constraint"),
    {
      code: "23505",
      constraint,
    },
  );
}
