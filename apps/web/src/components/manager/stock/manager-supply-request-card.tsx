import type { StockSupplyRequestResponse } from "@shop/contracts";
import { ArrowRight, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  const { accent, icon: StatusIcon, label } = statusMeta(item.status);
  const showActions =
    canManage && (item.status === "pending" || item.status === "approved");

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card shadow-sm",
        accent.border,
      )}
    >
      <div className={cn("absolute left-0 top-0 h-full w-1", accent.bar)} />
      <div className="flex flex-col gap-4 py-4 pl-5 pr-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                accent.icon,
              )}
            >
              <ClipboardList className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">
                {item.skuSnapshot.productName}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {item.skuSnapshot.variantName}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {item.reference}
                </span>
                {item.gtnReference ? (
                  <Badge
                    className="h-4 px-1.5 font-mono text-[10px] uppercase"
                    variant="outline"
                  >
                    GTN: {item.gtnReference}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
              accent.badge,
            )}
          >
            <StatusIcon className="size-3" />
            {label}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <LocationLine label="Requester" value={formatRequester(item)} />
          <RouteLine
            label="Source"
            value={item.sourceLocationName ?? "Managed location"}
          />
          <RouteLine
            label="Destination"
            value={item.locationName ?? "Destination location"}
          />
        </div>

        <dl className="grid grid-cols-2 divide-x divide-border rounded-lg border border-border bg-muted/30">
          <QuantityValue
            label="Requested"
            value={String(item.requestedQuantity)}
          />
          <QuantityValue
            label="Approved"
            value={item.approvedQuantity?.toString() ?? "-"}
          />
        </dl>

        <RequestNotes item={item} />

        {showActions ? (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {item.status === "pending" ? (
              <>
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
              </>
            ) : null}
            {item.status === "approved" ? (
              <Button
                className="w-full gap-2"
                onClick={() => onAction("dispatch")}
                size="lg"
              >
                Dispatch goods
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function LocationLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}

function RouteLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">{label}</p>
      <div className="flex items-center gap-1.5">
        <ArrowRight className="size-3 shrink-0" />
        <span>{value}</span>
      </div>
    </div>
  );
}

function QuantityValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2.5 text-center">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function RequestNotes({ item }: { item: StockSupplyRequestResponse }) {
  if (!item.notes && !item.resolutionNotes) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs italic leading-relaxed text-muted-foreground">
      {item.notes ? (
        <p>
          <span className="font-semibold not-italic opacity-80">Worker:</span> "
          {item.notes}"
        </p>
      ) : null}
      {item.resolutionNotes ? (
        <p>
          <span className="font-semibold not-italic opacity-80">
            Resolution:
          </span>{" "}
          "{item.resolutionNotes}"
        </p>
      ) : null}
    </div>
  );
}

function formatRequester(item: StockSupplyRequestResponse) {
  const name = item.requesterName ?? "Requester";
  return item.requesterEmail ? `${name} - ${item.requesterEmail}` : name;
}
