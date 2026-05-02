import type {
  DeliveryAddressSnapshot,
  DeliverySourceType,
  DeliveryStatus,
} from "@shop/contracts";

export type DeliveryItemRecord = {
  deliveryItemId: string;
  itemReference: string;
  skuId: string;
  quantity: number;
};

export type DeliveryDestinationRecord =
  | { kind: "location"; locationId: string }
  | { kind: "external"; snapshot: DeliveryAddressSnapshot };

export type DeliveryRecord = {
  deliveryId: string;
  sourceType: DeliverySourceType;
  sourceReference: string;
  status: DeliveryStatus;
  originLocationId: string;
  destination: DeliveryDestinationRecord;
  items: DeliveryItemRecord[];
  createdAt: Date;
  createdBy: string;
};
