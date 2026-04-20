import type { StockSupplyRequestResponse } from "@shop/contracts";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SupplyRequestAction } from "./manager-supply-requests.support";
import { statusMeta } from "./manager-supply-requests.support";

export function CompactIncomingRequestList({
  items,
  manageableLocationId,
  onAction,
}: {
  items: StockSupplyRequestResponse[];
  manageableLocationId: string | null;
  onAction: (
    action: SupplyRequestAction,
    item: StockSupplyRequestResponse,
  ) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {items.map((item, index) => (
        <CompactIncomingRequestRow
          index={index}
          item={item}
          itemCount={items.length}
          key={item.supplyRequestId}
          manageableLocationId={manageableLocationId}
          onAction={onAction}
        />
      ))}
    </div>
  );
}

function CompactIncomingRequestRow({
  index,
  item,
  itemCount,
  manageableLocationId,
  onAction,
}: {
  index: number;
  item: StockSupplyRequestResponse;
  itemCount: number;
  manageableLocationId: string | null;
  onAction: (
    action: SupplyRequestAction,
    item: StockSupplyRequestResponse,
  ) => void;
}) {
  const { accent, icon: StatusIcon, label } = statusMeta(item.status);
  const canManage = item.sourceLocationId === manageableLocationId;
  const canApprove = canManage && item.status === "pending";
  const canDispatch = canManage && item.status === "approved";

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 px-4 py-3",
        index !== itemCount - 1 && "border-b border-border",
      )}
    >
      <div
        aria-hidden
        className={cn("absolute left-0 top-0 h-full w-0.5", accent.bar)}
      />
      <div className="min-w-0 flex-1 pl-1">
        <p className="truncate text-sm font-medium leading-tight">
          {item.skuSnapshot.productName}
        </p>
        <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <span>{item.sourceLocationName ?? "Source"}</span>
          <span className="opacity-40">to</span>
          <span>{item.locationName ?? "Destination"}</span>
        </div>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
          {item.reference}
        </p>
      </div>
      <div className="hidden items-center gap-6 text-right sm:flex">
        <div>
          <p className="text-[10px] text-muted-foreground">Qty</p>
          <p className="text-xs font-semibold tabular-nums">
            {item.approvedQuantity ?? item.requestedQuantity}
          </p>
        </div>
        <div className="min-w-[80px]">
          <p className="text-center text-[10px] text-muted-foreground">
            Status
          </p>
          <div
            className={cn(
              "mt-0.5 flex items-center justify-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
              accent.badge,
            )}
          >
            <StatusIcon className="size-2.5" />
            {label}
          </div>
        </div>
      </div>
      <RowActions
        canApprove={canApprove}
        canDispatch={canDispatch}
        item={item}
        onAction={onAction}
      />
    </div>
  );
}

function RowActions({
  canApprove,
  canDispatch,
  item,
  onAction,
}: {
  canApprove: boolean;
  canDispatch: boolean;
  item: StockSupplyRequestResponse;
  onAction: (
    action: SupplyRequestAction,
    item: StockSupplyRequestResponse,
  ) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {canApprove ? (
        <div className="flex gap-1">
          <Button
            className="h-8 w-8 p-0"
            onClick={() => onAction("approve", item)}
            size="sm"
            title="Approve"
            variant="outline"
          >
            <CheckCircle2 className="size-3.5 text-success" />
          </Button>
          <Button
            className="h-8 w-8 p-0"
            onClick={() => onAction("reject", item)}
            size="sm"
            title="Reject"
            variant="outline"
          >
            <XCircle className="size-3.5 text-destructive" />
          </Button>
        </div>
      ) : null}
      {canDispatch ? (
        <Button
          className="h-8 shrink-0 gap-1.5 px-3 text-xs"
          onClick={() => onAction("dispatch", item)}
          size="sm"
        >
          <ArrowRight className="size-3.5" />
          <span className="hidden sm:inline">Dispatch</span>
        </Button>
      ) : null}
    </div>
  );
}
