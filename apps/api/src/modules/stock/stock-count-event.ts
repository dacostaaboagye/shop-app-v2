import { randomUUID } from "node:crypto";
import type { PlatformEventRecord } from "../events/platform-event.types.js";

export function createStockCountEvent(input: {
  actor: { userSlug: string };
  countedAt: Date;
  locationId: string;
  locationName: string;
  locationSlug: string;
  nextOnHandQuantity: number;
  note: string | null;
  previousOnHandQuantity: number;
  productName: string;
  reasonCode: string;
  sku: string;
  skuId: string;
  variantName: string;
}): PlatformEventRecord {
  const delta = input.nextOnHandQuantity - input.previousOnHandQuantity;
  const signedDelta = delta > 0 ? `+${delta}` : String(delta);

  return {
    actor: { userSlug: input.actor.userSlug },
    audience: [
      {
        kind: "permission",
        locationId: input.locationId,
        permission: "inventory.read",
      },
      { kind: "permission", permission: "admin.dashboard.view" },
    ],
    id: randomUUID(),
    occurredAt: input.countedAt.toISOString(),
    payload: {
      delta,
      locationId: input.locationId,
      locationName: input.locationName,
      nextOnHandQuantity: input.nextOnHandQuantity,
      note: input.note,
      previousOnHandQuantity: input.previousOnHandQuantity,
      reasonCode: input.reasonCode,
      sku: input.sku,
      skuId: input.skuId,
    },
    resource: {
      kind: "stock_balance",
      reference: `${input.locationSlug}:${input.sku}`,
    },
    summary: `Stock count updated for ${input.productName} ${input.variantName} (${input.sku}) at ${input.locationName}: ${input.previousOnHandQuantity} to ${input.nextOnHandQuantity} (${signedDelta}) for ${formatReasonCode(input.reasonCode)}.`,
    type: "stock.count.updated",
  };
}

function formatReasonCode(reasonCode: string): string {
  return reasonCode.replaceAll("_", " ");
}
