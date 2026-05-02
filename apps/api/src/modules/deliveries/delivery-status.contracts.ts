import type { DeliveryStatus } from "@shop/contracts";
import type { DeliveryRecord } from "./delivery.types.js";

export type DeliveryTransitionResult = {
  delivery: DeliveryRecord;
  status: "transitioned" | "noop";
  fromStatus: DeliveryStatus;
  toStatus: DeliveryStatus;
};

export type AssignDeliveryInput = {
  deliveryId: string;
  assignedUserId: string;
  actorUserId: string;
  now?: Date;
};

export type DispatchDeliveryInput = {
  deliveryId: string;
  actorUserId: string;
  now?: Date;
};

export type CompleteDeliveryInput = {
  deliveryId: string;
  actorUserId: string;
  now?: Date;
};

export type CancelDeliveryInput = {
  deliveryId: string;
  reason: string;
  actorUserId: string;
  now?: Date;
};

export type ReassignDeliveryInput = {
  deliveryId: string;
  assignedUserId: string;
  actorUserId: string;
  now?: Date;
};

export interface DeliveryStatusService {
  assign(input: AssignDeliveryInput): Promise<DeliveryTransitionResult>;
  reassign(input: ReassignDeliveryInput): Promise<DeliveryTransitionResult>;
  dispatch(input: DispatchDeliveryInput): Promise<DeliveryTransitionResult>;
  complete(input: CompleteDeliveryInput): Promise<DeliveryTransitionResult>;
  cancel(input: CancelDeliveryInput): Promise<DeliveryTransitionResult>;
}
