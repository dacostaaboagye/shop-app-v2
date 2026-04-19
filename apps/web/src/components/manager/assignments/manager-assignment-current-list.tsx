"use client";

import type { LocationAssignmentSummary } from "@shop/contracts";
import { UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ManagerAssignmentCurrentList({
  items,
  locationName,
}: {
  items: readonly LocationAssignmentSummary[];
  locationName: string | undefined;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No variants are currently assigned at {locationName ?? "this location"}.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {locationName ? (
        <p className="text-sm text-muted-foreground">
          {items.length} assignment{items.length !== 1 ? "s" : ""} at{" "}
          <span className="font-medium text-foreground">{locationName}</span>
        </p>
      ) : null}
      <div className="divide-y divide-border rounded-md border border-border bg-card">
        {items.map((item) => (
          <div
            key={`${item.skuId}-${item.workerId}`}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <UserCheck className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-medium leading-none">{item.productName}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {item.variantName}
                </p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {item.sku}
                </p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium">{item.workerName}</p>
              <p className="text-xs text-muted-foreground">{item.workerEmail}</p>
              <div className="mt-1 flex items-center justify-end gap-2">
                <Badge className="text-xs" variant="outline">
                  qty {item.quantity}
                </Badge>
                <Badge className="text-xs" variant="secondary">
                  {item.eventType}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
