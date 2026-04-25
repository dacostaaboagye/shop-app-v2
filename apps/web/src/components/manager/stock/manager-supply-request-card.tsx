import type { StockSupplyRequestResponse } from "@shop/contracts";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import {
  SupplyRequestDecisionButton,
  SupplyRequestPrimaryButton,
  SupplyRequestSplitActions,
} from "@/components/stock/supply-request-actions";
import { SupplyRequestSummaryCard } from "@/components/stock/supply-request-summary-card";
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
      <SupplyRequestSplitActions>
        <SupplyRequestDecisionButton
          className="border-success text-success"
          onClick={() => onAction("approve")}
          variant="outline"
        >
          <CheckCircle2 className="size-4" />
          Approve
        </SupplyRequestDecisionButton>
        <SupplyRequestDecisionButton
          onClick={() => onAction("reject")}
          variant="destructive"
        >
          <XCircle className="size-4" />
          Reject
        </SupplyRequestDecisionButton>
      </SupplyRequestSplitActions>
    );
  }

  if (item.status === "approved") {
    return (
      <SupplyRequestPrimaryButton onClick={() => onAction("dispatch")}>
        <ArrowRight className="size-4" />
        Dispatch goods
      </SupplyRequestPrimaryButton>
    );
  }

  return null;
}

function formatRequester(item: StockSupplyRequestResponse) {
  const name = item.requesterName ?? "Requester";
  return item.requesterEmail ? `${name} - ${item.requesterEmail}` : name;
}
