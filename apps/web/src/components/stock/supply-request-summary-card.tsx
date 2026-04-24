import type { StockSupplyRequestResponse } from "@shop/contracts";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ClipboardList } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GtnDocumentActions } from "./gtn-document-actions";

type StatusAccent = {
  badge: string;
  bar: string;
  border: string;
  icon: string;
};

type StatusPresentation = {
  accent: StatusAccent;
  icon: LucideIcon;
  label: string;
};

type Props = {
  actions?: ReactNode;
  item: StockSupplyRequestResponse;
  requesterLabel: string;
  requesterValue: string;
  status: StatusPresentation;
};

export function SupplyRequestSummaryCard({
  actions,
  item,
  requesterLabel,
  requesterValue,
  status,
}: Props) {
  const { accent, icon: StatusIcon, label } = status;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/50 bg-white shadow-sm",
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
          <InfoLine label={requesterLabel} value={requesterValue} />
          <RouteLine
            label="Source"
            value={item.sourceLocationName ?? "Managed location"}
          />
          <RouteLine
            label="Destination"
            value={item.locationName ?? "Destination location"}
          />
        </div>

        <dl className="grid grid-cols-2 divide-x divide-border/50 rounded-xl border border-border bg-white shadow-xs">
          <QuantityValue
            label="Requested"
            value={String(item.requestedQuantity)}
          />
          <QuantityValue
            label="Approved"
            value={item.approvedQuantity?.toString() ?? "-"}
          />
        </dl>

        {item.gtnReference ? (
          <GtnDocumentActions reference={item.gtnReference} />
        ) : null}

        <RequestNotes item={item} />

        {actions ? (
          <div className="border-t border-border pt-3">{actions}</div>
        ) : null}
      </div>
    </article>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
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
    <div className="flex flex-col gap-2 rounded-xl bg-muted/20 px-3 py-2.5 text-xs italic leading-relaxed text-muted-foreground ring-1 ring-border/10">
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
