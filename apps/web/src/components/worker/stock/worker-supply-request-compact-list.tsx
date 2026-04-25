import type { StockSupplyRequestResponse } from "@shop/contracts";
import { PackageCheck } from "lucide-react";
import { SupplyRequestCompactList } from "@/components/stock/supply-request-compact-row";
import { Button } from "@/components/ui/button";
import { workerStatusMeta } from "./worker-supply-requests.support";

export function CompactWorkerSupplyRequestList({
  items,
  onConfirmReceipt,
}: {
  items: StockSupplyRequestResponse[];
  onConfirmReceipt: (item: StockSupplyRequestResponse) => void;
}) {
  return (
    <SupplyRequestCompactList
      items={items}
      renderActions={(item) => (
        <RowActions item={item} onConfirmReceipt={onConfirmReceipt} />
      )}
      statusPresentation={(item) => workerStatusMeta(item.status)}
    />
  );
}

function RowActions({
  item,
  onConfirmReceipt,
}: {
  item: StockSupplyRequestResponse;
  onConfirmReceipt: (item: StockSupplyRequestResponse) => void;
}) {
  const canConfirm = item.status === "dispatched";

  if (!canConfirm) {
    return null;
  }

  return (
    <Button
      className="h-8 shrink-0 gap-1.5 px-3 text-xs"
      onClick={() => onConfirmReceipt(item)}
      size="sm"
    >
      <PackageCheck className="size-3.5" />
      <span className="hidden sm:inline">Confirm</span>
    </Button>
  );
}
