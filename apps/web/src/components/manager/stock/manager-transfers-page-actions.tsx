"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import { Button } from "@/components/ui/button";
import type { SupplyRequestAction } from "./manager-supply-requests.support";

export function ManagerTransferActions({
  canManage,
  item,
  onAction,
}: {
  canManage: boolean;
  item: StockSupplyRequestResponse;
  onAction: (action: SupplyRequestAction) => void;
}) {
  if (!canManage) {
    return undefined;
  }

  if (item.status === "pending") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          className="flex-1"
          onClick={() => onAction("approve")}
          size="lg"
        >
          Approve
        </Button>
        <Button
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
      <Button onClick={() => onAction("dispatch")} size="lg">
        Dispatch goods
      </Button>
    );
  }

  return undefined;
}

export function formatTransferRequester(item: StockSupplyRequestResponse) {
  const name = item.requesterName ?? "Requester";
  return item.requesterEmail ? `${name} - ${item.requesterEmail}` : name;
}
