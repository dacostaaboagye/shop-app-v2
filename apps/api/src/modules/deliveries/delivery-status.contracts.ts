import type { DeliveryStatus } from "@shop/contracts";
import type { DeliveryRecord } from "./delivery.types.js";

export type DeliveryTransitionResult = {
  delivery: DeliveryRecord;
  status: "transitioned" | "noop";
  fromStatus: DeliveryStatus;
  toStatus: DeliveryStatus;
};

type ActorIdentity = {
  actorUserId: string;
  actorUserSlug: string;
};

export type AssignDeliveryInput = ActorIdentity & {
  deliveryId: string;
  assignedUserId: string;
  now?: Date;
};

export type DispatchDeliveryInput = ActorIdentity & {
  deliveryId: string;
  now?: Date;
};

export type CompleteDeliveryInput = ActorIdentity & {
  deliveryId: string;
  now?: Date;
};

export type CancelDeliveryInput = ActorIdentity & {
  deliveryId: string;
  reason: string;
  now?: Date;
};

export type ReassignDeliveryInput = ActorIdentity & {
  deliveryId: string;
  assignedUserId: string;
  now?: Date;
};

export interface DeliveryStatusService {
  assign(input: AssignDeliveryInput): Promise<DeliveryTransitionResult>;
  reassign(input: ReassignDeliveryInput): Promise<DeliveryTransitionResult>;
  dispatch(input: DispatchDeliveryInput): Promise<DeliveryTransitionResult>;
  complete(input: CompleteDeliveryInput): Promise<DeliveryTransitionResult>;
  cancel(input: CancelDeliveryInput): Promise<DeliveryTransitionResult>;
}
