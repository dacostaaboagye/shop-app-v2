import type { StockSupplyRequestResponse } from "@shop/contracts";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplyRequestSummaryCard } from "./supply-request-summary-card";
import { buildTransferTimeline } from "./transfer-workspace.support";

type StatusPresentation = {
  accent: {
    badge: string;
    bar: string;
    border: string;
    icon: string;
  };
  icon: LucideIcon;
  label: string;
};

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
  status: StatusPresentation;
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

      <Card className="border border-border/50 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Transfer detail</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">Route</h3>
            <dl className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-4">
              <DetailRow
                label="Source"
                value={item.sourceLocationName ?? "Source location"}
              />
              <DetailRow
                label="Destination"
                value={item.locationName ?? "Destination location"}
              />
              <DetailRow label="Requester" value={requesterValue} />
              <DetailRow
                label="Reservation"
                value={formatReservation(item.sourceReservationStatus)}
              />
            </dl>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">Timeline</h3>
            <dl className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-4">
              {timeline.map((row) => (
                <DetailRow
                  key={row.label}
                  label={row.label}
                  value={row.value}
                />
              ))}
            </dl>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function formatReservation(
  status: StockSupplyRequestResponse["sourceReservationStatus"],
) {
  switch (status) {
    case "active":
      return "Reserved at source";
    case "confirmed":
      return "Consumed on dispatch";
    case "released":
      return "Released";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
    default:
      return "Not reserved";
  }
}
