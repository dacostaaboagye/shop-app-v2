"use client";

import type { ManualInvoiceRequestListResponse } from "@shop/contracts";
import { FileText } from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatCount,
  formatDateTime,
  formatPublicReference,
} from "@/lib/display/format";
import { formatMoney } from "@/lib/money/format-money";
import {
  getManualInvoiceMoneyProfile,
  getManualInvoiceStatusLabel,
  getManualInvoiceStatusVariant,
} from "./manual-invoice-request-support";

type ManualInvoiceRequestItem =
  ManualInvoiceRequestListResponse["items"][number];

export function ManualInvoiceRequestList({
  actionLabel = "Review",
  emptyDescription,
  items,
  onSelect,
  total,
}: {
  actionLabel?: string;
  emptyDescription: string;
  items: ManualInvoiceRequestItem[];
  onSelect?: (request: ManualInvoiceRequestItem) => void;
  total: number;
}) {
  if (items.length === 0) {
    return (
      <AppEmptyState
        description={emptyDescription}
        icon={FileText}
        title="No manual invoice requests"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="type-data-label">
        Manual invoice requests ({formatCount(total)})
      </h3>
      <AppTableWrapper>
        {items.map((request, index) => {
          const moneyProfile = getManualInvoiceMoneyProfile(request);

          return (
            <article
              className={[
                "flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between",
                index !== items.length - 1 ? "border-b border-border/50" : "",
              ].join(" ")}
              key={request.reference}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="type-data-value text-sm">
                    {formatPublicReference(request.reference)}
                  </p>
                  <Badge
                    className="rounded-md"
                    variant={getManualInvoiceStatusVariant(request.status)}
                  >
                    {getManualInvoiceStatusLabel(request.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {request.customerName}
                </p>
                <p className="type-support">
                  {request.locationName ?? "Location"} - requested by{" "}
                  {request.requestedByName ?? "Unknown"} on{" "}
                  {formatDateTime(request.createdAt)}
                </p>
                <p className="type-support mt-2 line-clamp-2">
                  {request.reason}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                <div className="min-w-32 sm:text-right">
                  <p className="type-data-value text-sm tabular-nums">
                    {formatMoney(request.totalAmount, moneyProfile)}
                  </p>
                  {request.approvedInvoiceReference ? (
                    <p className="type-data-label text-[10px]">
                      {formatPublicReference(request.approvedInvoiceReference)}
                    </p>
                  ) : null}
                </div>
                {onSelect ? (
                  <Button
                    onClick={() => onSelect(request)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {actionLabel}
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </AppTableWrapper>
    </div>
  );
}
