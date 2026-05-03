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
  assignedUserId: string | null;
  assignedAt: Date | null;
  assignedBy: string | null;
  dispatchedAt: Date | null;
  dispatchedBy: string | null;
  completedAt: Date | null;
  completedBy: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdAt: Date;
  createdBy: string;
};
