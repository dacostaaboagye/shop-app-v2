import type { OwnershipEventRecord } from "./ownership-query.service.js";

export const OWNERSHIP_EVENT_RECORD_COLUMNS = `
  id,
  created_at AS "createdAt",
  effective_from AS "effectiveFrom",
  event_type AS "eventType",
  handover_chain_id AS "handoverChainId",
  location_id AS "locationId",
  sku_id AS "skuId",
  quantity,
  worker_id AS "workerId"
`;

export function requireOwnershipEvent(
  event: OwnershipEventRecord | undefined,
  message: string,
): OwnershipEventRecord {
  if (!event) {
    throw new Error(message);
  }

  return event;
}
