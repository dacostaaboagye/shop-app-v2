import type { StockSupplyRequestResponse } from "@shop/contracts";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { SupplyRequestCompactList } from "@/components/stock/supply-request-compact-row";
import { Button } from "@/components/ui/button";
import type { SupplyRequestAction } from "./manager-supply-requests.support";
import { statusMeta } from "./manager-supply-requests.support";

export function CompactIncomingRequestList({
  items,
  manageableLocationIds,
  onAction,
}: {
  items: StockSupplyRequestResponse[];
  manageableLocationIds: string[];
  onAction: (
    action: SupplyRequestAction,
    item: StockSupplyRequestResponse,
  ) => void;
}) {
  return (
    <SupplyRequestCompactList
      items={items}
      renderActions={(item) => (
        <RowActions
          item={item}
          manageableLocationIds={manageableLocationIds}
          onAction={onAction}
        />
      )}
      statusPresentation={(item) => statusMeta(item.status)}
    />
  );
}

function RowActions({
  item,
  manageableLocationIds,
  onAction,
}: {
  item: StockSupplyRequestResponse;
  manageableLocationIds: string[];
  onAction: (
    action: SupplyRequestAction,
    item: StockSupplyRequestResponse,
  ) => void;
}) {
  const canManage = manageableLocationIds.includes(item.sourceLocationId);
  const canApprove = canManage && item.status === "pending";
  const canDispatch = canManage && item.status === "approved";

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
