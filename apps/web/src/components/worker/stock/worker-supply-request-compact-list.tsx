import type { StockSupplyRequestResponse } from "@shop/contracts";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { workerStatusMeta } from "./worker-supply-requests.support";

export function CompactWorkerSupplyRequestList({
  items,
  onConfirmReceipt,
}: {
  items: StockSupplyRequestResponse[];
  onConfirmReceipt: (item: StockSupplyRequestResponse) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {items.map((item, index) => (
        <CompactWorkerSupplyRequestRow
          index={index}
          item={item}
          itemCount={items.length}
          key={item.supplyRequestId}
          onConfirmReceipt={onConfirmReceipt}
        />
      ))}
    </div>
  );
}

function CompactWorkerSupplyRequestRow({
  index,
  item,
  itemCount,
  onConfirmReceipt,
}: {
  index: number;
  item: StockSupplyRequestResponse;
  itemCount: number;
  onConfirmReceipt: (item: StockSupplyRequestResponse) => void;
}) {
  const { accent, icon: StatusIcon, label } = workerStatusMeta(item.status);
  const canConfirm = item.status === "dispatched";

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 px-4 py-3",
        index !== itemCount - 1 && "border-b border-border",
      )}
    >
      <div aria-hidden className={cn("absolute left-0 top-0 h-full w-0.5", accent.bar)} />
      <div className="min-w-0 flex-1 pl-1">
        <p className="truncate text-sm font-medium leading-tight">
          {item.skuSnapshot.productName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.skuSnapshot.variantName}
        </p>
        <RouteLine item={item} />
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
          {item.reference}
        </p>
      </div>
      <div className="hidden items-center gap-4 text-right sm:flex">
        <div>
          <p className="text-[10px] text-muted-foreground">Qty</p>
          <p className="text-xs font-semibold tabular-nums">
            {item.approvedQuantity ?? item.requestedQuantity}
          </p>
        </div>
        <div className="min-w-[80px]">
          <p className="text-center text-[10px] text-muted-foreground">Status</p>
          <div className={cn("mt-0.5 flex items-center justify-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium", accent.badge)}>
            <StatusIcon className="size-2.5" />
            {label}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("rounded-full p-1 sm:hidden", accent.icon)}>
          <StatusIcon className="size-3.5" />
        </span>
        {canConfirm ? (
          <Button className="h-8 shrink-0 gap-1.5 px-3 text-xs" onClick={() => onConfirmReceipt(item)} size="sm">
            <PackageCheck className="size-3.5" />
            <span className="hidden sm:inline">Confirm</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RouteLine({ item }: { item: StockSupplyRequestResponse }) {
  if (!item.sourceLocationName && !item.locationName) return null;

  return (
    <div className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
      {item.sourceLocationName ? <span>{item.sourceLocationName}</span> : null}
      {item.sourceLocationName && item.locationName ? (
        <span className="opacity-50">to</span>
      ) : null}
      {item.locationName ? <span>{item.locationName}</span> : null}
    </div>
  );
}
