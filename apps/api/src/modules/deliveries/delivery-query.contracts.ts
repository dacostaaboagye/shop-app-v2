import type { DeliveryStatus } from "@shop/contracts";
import type { DeliveryRecord } from "./delivery.types.js";

export type DeliveryListFilters = {
  status?: DeliveryStatus[];
  limit?: number;
};

export type ListByAgentInput = {
  agentUserId: string;
  filters?: DeliveryListFilters;
};

export type ListByLocationInput = {
  locationId: string;
  filters?: DeliveryListFilters;
};

export interface DeliveryQueryService {
  findById(deliveryId: string): Promise<DeliveryRecord | null>;
  listByAgent(input: ListByAgentInput): Promise<DeliveryRecord[]>;
  listByLocation(input: ListByLocationInput): Promise<DeliveryRecord[]>;
}
