import type { SupplyRequestRow } from "./postgres-supply-request.repository.js";

type StockSupplyEventAction =
  | "approved"
  | "cancelled"
  | "dispatched"
  | "received"
  | "rejected"
  | "requested";

export function formatStockSupplyEventSummary(input: {
  action: StockSupplyEventAction;
  gtnReference?: string | null;
  supplyRequest: SupplyRequestRow;
}): string {
  const request = input.supplyRequest;
  const product = `${request.skuSnapshot.productName} (${request.skuSnapshot.sku})`;
  const quantity = getActionQuantity(request);
  const route = `${request.sourceLocationName} to ${request.locationName}`;
  const gtn = input.gtnReference ? ` GTN ${input.gtnReference}.` : "";

  return `${request.reference}: ${product} ${input.action} for ${quantity} unit${quantity === 1 ? "" : "s"} from ${route}.${gtn}`;
}

function getActionQuantity(request: SupplyRequestRow): number {
  return request.approvedQuantity ?? request.requestedQuantity;
}
