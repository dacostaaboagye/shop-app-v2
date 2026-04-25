import type { StockSupplyRequestResponse } from "@shop/contracts";
import type { ReactNode } from "react";
import {
  formatReservationStatusLabel,
  type SupplyRequestStatusPresentation,
} from "@/components/stock/stock-status";
import {
  TransferDetailRow,
  TransferDetailSection,
} from "@/components/stock/transfer-detail-surfaces";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplyRequestSummaryCard } from "./supply-request-summary-card";
import { buildTransferTimeline } from "./transfer-workspace.support";

export function TransferDetailPanel({
  actions,
  item,
  requesterLabel,
  requesterValue,
  status,
}: {
  actions?: ReactNode;
  item: StockSupplyRequestResponse;
  requesterLabel: string;
  requesterValue: string;
  status: SupplyRequestStatusPresentation;
}) {
  const timeline = buildTransferTimeline(item);

  return (
    <div className="flex flex-col gap-4">
      <SupplyRequestSummaryCard
        actions={actions}
        item={item}
        requesterLabel={requesterLabel}
        requesterValue={requesterValue}
        status={status}
      />

      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="type-section-title text-xl text-foreground">
            Transfer detail
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <TransferDetailSection title="Route and ownership">
            <TransferDetailRow
              label="Source"
              value={item.sourceLocationName ?? "Source location"}
            />
            <TransferDetailRow
              label="Destination"
              value={item.locationName ?? "Destination location"}
            />
            <TransferDetailRow label={requesterLabel} value={requesterValue} />
            <TransferDetailRow
              label="Reservation"
              value={formatReservationStatusLabel(item.sourceReservationStatus)}
            />
          </TransferDetailSection>

          <TransferDetailSection title="Transfer timeline">
            {timeline.map((row) => (
              <TransferDetailRow
                key={row.label}
                label={row.label}
                value={row.value}
              />
            ))}
          </TransferDetailSection>
        </CardContent>
      </Card>
    </div>
  );
}
