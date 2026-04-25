"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import type { SupplyRequestAction } from "@/components/manager/stock/manager-supply-requests.support";
import { Button } from "@/components/ui/button";

export type AdminTransferOverrideAction = "cancel" | "confirm_receipt";

export function AdminTransferActions({
  canManage,
  item,
  onAction,
  onOverride,
}: {
  canManage: boolean;
  item: StockSupplyRequestResponse;
  onAction: (action: SupplyRequestAction) => void;
  onOverride: (action: AdminTransferOverrideAction) => void;
}) {
  const canOverrideCancel =
    item.status === "pending" || item.status === "approved";
  const canOverrideReceipt = item.status === "dispatched";

  if (!canManage && !canOverrideCancel && !canOverrideReceipt) {
    return undefined;
  }

  return (
    <div className="flex flex-col gap-2">
      {canManage ? <ManageActions item={item} onAction={onAction} /> : null}
      {canOverrideReceipt ? (
        <Button
          onClick={() => onOverride("confirm_receipt")}
          size="lg"
          variant="outline"
        >
          Override receipt
        </Button>
      ) : null}
      {canOverrideCancel ? (
        <Button
          onClick={() => onOverride("cancel")}
          size="lg"
          variant="outline"
        >
          Override cancel
        </Button>
      ) : null}
    </div>
  );
}

function ManageActions({
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

  return null;
}
