import type { StockSupplyRequestResponse } from "@shop/contracts";
import { SupplyRequestSummaryCard } from "@/components/stock/supply-request-summary-card";
import { Button } from "@/components/ui/button";
import type { SupplyRequestAction } from "./manager-supply-requests.support";
import { statusMeta } from "./manager-supply-requests.support";

export function SupplyRequestCard({
  canManage,
  item,
  onAction,
}: {
  canManage: boolean;
  item: StockSupplyRequestResponse;
  onAction: (action: SupplyRequestAction) => void;
}) {
  const showActions =
    canManage && (item.status === "pending" || item.status === "approved");

  return (
    <SupplyRequestSummaryCard
      actions={
        showActions ? (
          <ManagerActions item={item} onAction={onAction} />
        ) : undefined
      }
      item={item}
      requesterLabel="Requester"
      requesterValue={formatRequester(item)}
      status={statusMeta(item.status)}
    />
  );
}

function ManagerActions({
  item,
  onAction,
}: {
  item: StockSupplyRequestResponse;
  onAction: (action: SupplyRequestAction) => void;
}) {
  if (item.status === "pending") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          className="min-w-[120px] flex-1 gap-2 border-success text-success"
          onClick={() => onAction("approve")}
          size="lg"
          variant="outline"
        >
          Approve
        </Button>
        <Button
          className="min-w-[120px] flex-1 gap-2"
          onClick={() => onAction("reject")}
          size="lg"
          variant="destructive"
        >
          Reject
        </Button>
      </div>
    );
  }

  if (item.status === "approved") {
    return (
      <Button
        className="w-full gap-2"
        onClick={() => onAction("dispatch")}
        size="lg"
      >
        Dispatch goods
      </Button>
    );
  }

  return null;
}

function formatRequester(item: StockSupplyRequestResponse) {
  const name = item.requesterName ?? "Requester";
  return item.requesterEmail ? `${name} - ${item.requesterEmail}` : name;
}
