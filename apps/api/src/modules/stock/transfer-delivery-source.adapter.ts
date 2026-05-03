import type {
  DeliveryEligibleTransfer,
  TransferDeliverySourcePort,
} from "@shop/contracts";
import type { ApiDatabase } from "../../infrastructure/database.js";

type StockTransferRow = {
  approvedQuantity: number | null;
  destinationLocationId: string;
  reference: string;
  requestedQuantity: number;
  skuId: string;
  skuSnapshot: {
    sku: string;
    productName: string;
    variantName: string;
  };
  sourceLocationId: string;
  supplyRequestId: string;
  status:
    | "approved"
    | "cancelled"
    | "in_transit"
    | "received"
    | "rejected"
    | "requested";
};

export class TransferDeliverySourceAdapter
  implements TransferDeliverySourcePort
{
  constructor(private readonly lookup: StockTransferLookup) {}

  async findByTransferReference(
    reference: string,
  ): Promise<DeliveryEligibleTransfer | null> {
    const transfer = await this.lookup.findByReference(reference);
    if (!transfer) {
      return null;
    }

    return {
      transferReference: transfer.reference,
      sourceLocationId: transfer.sourceLocationId,
      destinationLocationId: transfer.destinationLocationId,
      supplyRequestId: transfer.supplyRequestId,
      skuSnapshot: transfer.skuSnapshot,
      state: mapTransferState(transfer.status),
      items: [
        {
          skuId: transfer.skuId,
          quantity: transfer.approvedQuantity ?? transfer.requestedQuantity,
        },
      ],
    };
  }
}

export class PostgresStockTransferDeliverySourceLookup {
  constructor(private readonly db: ApiDatabase) {}

  async findByReference(reference: string): Promise<StockTransferRow | null> {
    const transfer = await this.db.query.stockTransfers.findFirst({
      columns: {
        approvedQuantity: true,
        destinationLocationId: true,
        reference: true,
        requestedQuantity: true,
        skuId: true,
        skuSnapshot: true,
        sourceLocationId: true,
        status: true,
        supplyRequestId: true,
      },
      where: (table, { eq }) => eq(table.reference, reference),
    });

    return transfer ?? null;
  }
}

type StockTransferLookup = {
  findByReference(reference: string): Promise<StockTransferRow | null>;
};

function mapTransferState(
  status: StockTransferRow["status"],
): DeliveryEligibleTransfer["state"] {
  switch (status) {
    case "approved":
      return "approved";
    case "cancelled":
      return "cancelled";
    case "in_transit":
      return "dispatched";
    case "received":
      return "received";
    case "rejected":
    case "requested":
      return "draft";
  }
}
