import type { DeliveryStatus } from "@shop/contracts";
import type { DeliveryRecord } from "./delivery.types.js";

export const DELIVERY_QUERY_DEFAULT_LIMIT = 50;
export const DELIVERY_QUERY_MAX_LIMIT = 200;
export const DELIVERY_ACTIVE_AGENT_STATUSES: DeliveryStatus[] = [
  "assigned",
  "in_transit",
];

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
  findByReference(reference: string): Promise<DeliveryRecord | null>;
  hasSkuHistory(skuId: string): Promise<boolean>;
  listByAgent(input: ListByAgentInput): Promise<DeliveryRecord[]>;
  listByLocation(input: ListByLocationInput): Promise<DeliveryRecord[]>;
}

export type DeliverySkuHistoryService = Pick<
  DeliveryQueryService,
  "hasSkuHistory"
>;
