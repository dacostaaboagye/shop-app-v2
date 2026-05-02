import type { DeliveryAddressSnapshot } from "@shop/contracts";
import type { DeliveryRecord } from "./delivery.types.js";

export type DeliveryCreationStatus = "created" | "noop";

export type CreatedDelivery = {
  delivery: DeliveryRecord;
  status: DeliveryCreationStatus;
};

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
