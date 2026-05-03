import type {
  DeliveryAddressSnapshot,
  DeliverySourceType,
} from "@shop/contracts";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { DeliveryRecord } from "./delivery.types.js";

export type DeliveryCreationStatus = "created" | "noop";

export type CreatedDelivery = {
  delivery: DeliveryRecord;
  status: DeliveryCreationStatus;
};

export type DeliveryCreationTransaction = Parameters<
  Parameters<ApiDatabase["transaction"]>[0]
>[0];

export type DeliveryCreationStockSideEffectsInput = {
  createdBy: string;
  items: Array<{
    itemReference: string;
    quantity: number;
    skuId: string;
  }>;
  now: Date;
  originLocationId: string;
  sourceReference: string;
  sourceType: DeliverySourceType;
  transferContext?: {
    destinationLocationId: string;
    skuSnapshot: {
      sku: string;
      productName: string;
      variantName: string;
    };
    supplyRequestId: string;
  };
  tx: DeliveryCreationTransaction;
};

export type DeliveryCreationStockSideEffectsResult =
  | { status: "ok" }
  | {
      status: "insufficient_stock";
      shortfalls: Array<{
        available: number;
        requested: number;
        skuId: string;
      }>;
    };

export interface DeliveryCreationStockSideEffectsPort {
  applyWithinTransaction(
    input: DeliveryCreationStockSideEffectsInput,
  ): Promise<DeliveryCreationStockSideEffectsResult>;
}

export type CreateFromPosSaleInput = {
  invoiceReference: string;
  destination: DeliveryAddressSnapshot;
  createdBy: string;
  now?: Date;
};

export type CreateFromOnlineOrderInput = {
  orderReference: string;
  destination: DeliveryAddressSnapshot;
  createdBy: string;
  now?: Date;
};

export type CreateFromTransferInput = {
  transferReference: string;
  createdBy: string;
  now?: Date;
};

export interface DeliveryCreationService {
  createFromPosSale(input: CreateFromPosSaleInput): Promise<CreatedDelivery>;
  createFromOnlineOrder(
    input: CreateFromOnlineOrderInput,
  ): Promise<CreatedDelivery>;
  createFromTransfer(input: CreateFromTransferInput): Promise<CreatedDelivery>;
}
