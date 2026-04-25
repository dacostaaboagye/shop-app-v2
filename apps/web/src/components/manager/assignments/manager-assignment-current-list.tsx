"use client";

import type { LocationAssignmentSummary } from "@shop/contracts";
import { UserCheck } from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { Badge } from "@/components/ui/badge";
import { formatCount, formatSupportText } from "@/lib/display/format";
import { cn } from "@/lib/utils";
import { formatAssignmentEventLabel } from "./manager-assignments-support";

export function ManagerAssignmentCurrentList({
  items,
  locationName,
}: {
  items: readonly LocationAssignmentSummary[];
  locationName: string | undefined;
}) {
  if (items.length === 0) {
    return (
      <AppEmptyState
        description={`No variants are currently assigned at ${locationName ?? "this location"}.`}
        icon={UserCheck}
        title="No assignments yet"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="type-data-label">
        Current Assignments ({formatCount(items.length)})
      </h3>
      <AppTableWrapper>
        {items.map((item, index) => (
          <div
            key={`${item.skuId}-${item.workerId}`}
            className={cn(
              "group flex flex-wrap items-center justify-between gap-4 p-4 transition-all hover:bg-muted/30",
              index !== items.length - 1 && "border-b border-border/50",
            )}
          >
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary ring-1 ring-primary/10 transition-colors group-hover:bg-primary/10">
                <UserCheck className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="type-data-value text-balance">
                  {item.productName}
                </p>
                <p className="type-support mt-0.5 text-pretty">
                  {formatSupportText(item.variantName)}
                </p>
                <p className="type-identifier mt-1 break-all">{item.sku}</p>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex min-w-0 flex-col sm:items-end">
                <p className="type-data-value text-balance sm:text-right">
                  {item.workerName}
                </p>
                <p className="type-support break-all text-xs sm:text-right">
                  {formatSupportText(item.workerEmail)}
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge
                  className="rounded-md text-[10px] font-semibold"
                  variant="secondary"
                >
                  Qty {formatCount(item.quantity)}
                </Badge>
                <Badge
                  className="rounded-md text-[10px] font-semibold"
                  variant="outline"
                >
                  {formatAssignmentEventLabel(item.eventType)}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </AppTableWrapper>
    </div>
  );
}
