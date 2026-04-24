"use client";

import type { LocationAssignmentSummary } from "@shop/contracts";
import { UserCheck } from "lucide-react";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ManagerAssignmentCurrentList({
  items,
  locationName,
}: {
  items: readonly LocationAssignmentSummary[];
  locationName: string | undefined;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-dashed border-border/60 bg-muted/5 p-12 text-center shadow-sm">
        <h3 className="text-lg font-bold text-foreground">No assignments</h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground/80">
          No variants are currently assigned at{" "}
          {locationName ?? "this location"}.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
        Current assignments ({items.length})
      </h3>
      <AppTableWrapper>
        {items.map((item, index) => (
          <div
            key={`${item.skuId}-${item.workerId}`}
            className={cn(
              "flex flex-wrap items-center justify-between gap-4 p-4 transition-all hover:bg-muted/30 group",
              index !== items.length - 1 && "border-b border-border/50",
            )}
          >
            <div className="flex items-start gap-4 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary ring-1 ring-primary/10 transition-colors group-hover:bg-primary/10">
                <UserCheck className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {item.productName}
                </p>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground/80">
                  {item.variantName}
                </p>
                <p className="mt-1 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40">
                  {item.sku}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 shrink-0">
              <div className="flex flex-col items-end min-w-[120px]">
                <p className="text-sm font-bold text-foreground truncate max-w-[150px]">
                  {item.workerName}
                </p>
                <p className="text-[10px] font-medium text-muted-foreground/60">
                  {item.workerEmail}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className="rounded-md font-bold uppercase tracking-wider text-[10px]"
                  variant="secondary"
                >
                  QTY {item.quantity}
                </Badge>
                <Badge
                  className="rounded-md font-bold uppercase tracking-wider text-[10px]"
                  variant="outline"
                >
                  {item.eventType.replaceAll("_", " ")}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </AppTableWrapper>
    </div>
  );
}
